import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { clampPinCount, generatePinCopy } from "@/features/traffic/lib/pin-rules";
import { resolvePinBackgroundImages } from "@/features/traffic/lib/pin-images";
import {
  mergeUsedImageRecords,
  parseUsedPinImageIdentities,
  recordsFromUrls,
  strongNormalizeImageUrl,
  type UsedImageRecord,
} from "@/features/traffic/lib/image-identity";
import {
  getThreadGenerationQuota,
  recordThreadGeneration,
  THREAD_GENERATION_DAILY_LIMIT,
} from "@/features/publish-kit/lib/thread-generation-quota";
import { isFeatureEnabled } from "@/config/features.config";
import type { ArmedLink } from "@/features/blog-builder/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function withPinImageUrls<T extends { id: string; image_url?: string | null }>(pins: T[]) {
  return pins.map((pin) => ({
    ...pin,
    image_url: pin.image_url?.startsWith("http")
      ? `/api/pins/${pin.id}/image?v=11`
      : pin.image_url || `/api/pins/${pin.id}/image?v=11`,
  }));
}

function scrapeTargetsFromSite(site: {
  product_url?: string | null;
  armed_links?: ArmedLink[] | null;
  sales_page_json?: { heroImage?: string } | null;
}) {
  const links = Array.isArray(site.armed_links) ? site.armed_links : [];
  const primary = site.product_url || links[0]?.url || "";
  const extras = links.map((l) => l.url).filter((url) => url && url !== primary);
  return { scrapeUrl: primary || null, scrapeUrls: extras };
}

function schemaMissingMessage(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  const code = error.code || "";
  const message = error.message || "";
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "42703" ||
    /schema cache|does not exist|Could not find the table/i.test(message)
  ) {
    return "Database setup incomplete. Run the NullPing assets migration (site_pins / product_name), then try again.";
  }
  return null;
}

export async function GET(request: Request) {
  const guard = featureApiGuard("traffic-pins");
  if (guard) return guard;
  const { supabase, user } = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(request.url).searchParams.get("siteId")?.trim() || "";
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });

  const { data: pins, error } = await supabase
    .from("site_pins")
    .select("*")
    .eq("user_id", user.id)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .order("idx", { ascending: true });

  if (error) {
    const schemaMsg = schemaMissingMessage(error);
    return NextResponse.json(
      { error: schemaMsg || error.message },
      { status: schemaMsg ? 503 : 500 }
    );
  }
  const quota = await getThreadGenerationQuota(supabase, user.id);
  return NextResponse.json({ pins: withPinImageUrls(pins ?? []), quota });
}

export async function POST(request: Request) {
  try {
    return await generatePins(request);
  } catch (error) {
    console.error("[pins/generate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pin generation failed" },
      { status: 500 }
    );
  }
}

async function generatePins(request: Request) {
  const guard = featureApiGuard("traffic-pins");
  if (guard) return guard;
  const { supabase, user } = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });

  const extraBatch = Boolean(body.extraBatch) && isFeatureEnabled("premium-social");
  const regenerate = Boolean(body.regenerate);
  const pinCount = clampPinCount(body.count);

  let siteQuery = await supabase
    .from("sites")
    .select("id, title, product_name, product_url, hobby, sales_page_json, armed_links")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Older DBs may lack NullPing columns — fall back so we don't fake "Asset not found".
  if (siteQuery.error && schemaMissingMessage(siteQuery.error)) {
    siteQuery = await supabase
      .from("sites")
      .select("id, title, hobby, sales_page_json, armed_links, product_url")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .maybeSingle();
  }

  if (siteQuery.error) {
    const schemaMsg = schemaMissingMessage(siteQuery.error);
    return NextResponse.json(
      { error: schemaMsg || siteQuery.error.message },
      { status: schemaMsg ? 503 : 500 }
    );
  }

  const site = siteQuery.data as {
    id: string;
    title: string;
    product_name?: string | null;
    product_url?: string | null;
    hobby?: string | null;
    sales_page_json?: {
      headline?: string;
      subheadline?: string;
      heroImage?: string;
      pinImages?: Record<string, string>;
      usedPinImageIdentities?: UsedImageRecord[];
    } | null;
    armed_links?: ArmedLink[] | null;
  } | null;
  if (!site) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  if (!extraBatch) {
    const { count, error: countError } = await supabase
      .from("site_pins")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("user_id", user.id);
    if (countError) {
      const schemaMsg = schemaMissingMessage(countError);
      return NextResponse.json(
        { error: schemaMsg || countError.message },
        { status: schemaMsg ? 503 : 500 }
      );
    }
    if ((count ?? 0) > 0 && !regenerate && !extraBatch) {
      const { data: existing } = await supabase
        .from("site_pins")
        .select("*")
        .eq("site_id", siteId)
        .eq("user_id", user.id)
        .order("idx", { ascending: true });
      return NextResponse.json({ pins: withPinImageUrls(existing ?? []), alreadyGenerated: true });
    }
  }

  let quota;
  try {
    quota = await getThreadGenerationQuota(supabase, user.id);
  } catch (quotaReadError) {
    console.warn("[pins/generate] quota read failed:", quotaReadError);
    quota = {
      limit: THREAD_GENERATION_DAILY_LIMIT,
      usedToday: 0,
      remaining: THREAD_GENERATION_DAILY_LIMIT,
    };
  }
  if (quota.remaining <= 0) {
    return NextResponse.json(
      { error: `Daily pin generation limit reached (${quota.limit}). Try again tomorrow.` },
      { status: 429 }
    );
  }

  const productName = site.product_name || site.title;
  const copyJson = site.sales_page_json;
  const context = [copyJson?.headline, copyJson?.subheadline, site.hobby].filter(Boolean).join("\n");
  const copies = await generatePinCopy(productName, context, pinCount);
  const batchId = crypto.randomUUID();
  const { scrapeUrl, scrapeUrls } = scrapeTargetsFromSite(site);

  const heroImage = copyJson?.heroImage || null;
  const priorPinImages = Object.values(copyJson?.pinImages ?? {});
  const priorIdentities = parseUsedPinImageIdentities(copyJson);

  // Existing pin backgrounds on this asset — never reuse across batches / regenerate.
  let existingPinRows: Array<{
    source_image_url?: string | null;
    source_image_normalized_url?: string | null;
    source_image_hash?: string | null;
  }> | null = null;
  {
    const withIdentity = await supabase
      .from("site_pins")
      .select("source_image_url, source_image_normalized_url, source_image_hash")
      .eq("site_id", siteId)
      .eq("user_id", user.id);
    if (withIdentity.error && schemaMissingMessage(withIdentity.error)) {
      const legacy = await supabase
        .from("site_pins")
        .select("source_image_url")
        .eq("site_id", siteId)
        .eq("user_id", user.id);
      existingPinRows = legacy.data;
    } else {
      existingPinRows = withIdentity.data;
    }
  }

  const existingSourceImages = (existingPinRows ?? [])
    .map((row) => (row as { source_image_url?: string | null }).source_image_url)
    .filter((url): url is string => Boolean(url?.trim()));

  const existingIdentityRows: UsedImageRecord[] = (existingPinRows ?? []).flatMap((row) => {
    const r = row as {
      source_image_url?: string | null;
      source_image_normalized_url?: string | null;
      source_image_hash?: string | null;
    };
    if (!r.source_image_url?.trim() && !r.source_image_normalized_url?.trim()) return [];
    return [
      {
        normalizedUrl:
          r.source_image_normalized_url?.trim() ||
          strongNormalizeImageUrl(r.source_image_url || ""),
        contentHash: r.source_image_hash?.trim() || undefined,
        sourceUrl: r.source_image_url?.trim() || undefined,
      },
    ];
  });

  const usedIdentities = mergeUsedImageRecords(priorIdentities, [
    ...existingIdentityRows,
    ...recordsFromUrls([...priorPinImages, ...existingSourceImages]),
  ]);

  const { backgrounds, usedIdentities: updatedRegistry } = await resolvePinBackgroundImages({
    pins: copies,
    productName,
    siteTitle: site.title,
    hobby: site.hobby,
    scrapeUrl,
    scrapeUrls,
    preferredImages: extraBatch || regenerate ? [] : [heroImage],
    excludeImages: [
      ...(extraBatch || regenerate ? [heroImage] : []),
      ...priorPinImages,
      ...existingSourceImages,
    ],
    usedIdentities,
    userId: user.id,
    supabase,
  });

  // Enforce uniqueness at insert — never coalesce; never fill with generic fallbacks.
  const usedAtInsert = new Set<string>();
  const usedHashes = new Set<string>();
  const rows = copies.map((pin, idx) => {
    const bg = backgrounds[idx];
    let source = bg?.url || null;
    const norm = bg?.normalizedUrl || (source ? strongNormalizeImageUrl(source) : "");
    const hash = bg?.contentHash || "";

    if (source) {
      if ((norm && usedAtInsert.has(norm)) || (hash && usedHashes.has(hash))) {
        source = null;
      } else {
        if (norm) usedAtInsert.add(norm);
        if (hash) usedHashes.add(hash);
      }
    }

    return {
      user_id: user.id,
      site_id: siteId,
      batch_id: batchId,
      idx,
      headline: pin.headline,
      title: pin.title,
      description: pin.description,
      keywords: pin.keywords,
      source_image_url: source,
      source_image_normalized_url: source ? norm || strongNormalizeImageUrl(source) : null,
      source_image_hash: source && hash ? hash : null,
      image_source: source ? bg?.imageSource ?? null : null,
      image_relevance_score: source ? bg?.relevanceScore ?? null : null,
      image_match_reason: source ? bg?.matchReason ?? null : null,
    };
  });

  let { data: inserted, error } = await supabase.from("site_pins").insert(rows).select("*");

  // Older DBs without new identity columns — strip them and retry.
  if (error && schemaMissingMessage(error)) {
    const legacyRows = rows.map((row) => {
      const {
        source_image_normalized_url: _n,
        source_image_hash: _h,
        image_source: _is,
        image_relevance_score: _irs,
        image_match_reason: _imr,
        ...rest
      } = row;
      void _n;
      void _h;
      void _is;
      void _irs;
      void _imr;
      return rest;
    });
    const second = await supabase.from("site_pins").insert(legacyRows).select("*");
    inserted = second.data;
    error = second.error;

    if (error && schemaMissingMessage(error)) {
      const bareRows = legacyRows.map((row) => {
        const { source_image_url: _s, ...rest } = row;
        void _s;
        return rest;
      });
      const third = await supabase.from("site_pins").insert(bareRows).select("*");
      inserted = third.data;
      error = third.error;
    }
  }

  if (error) {
    const schemaMsg = schemaMissingMessage(error);
    return NextResponse.json(
      { error: schemaMsg || error.message },
      { status: schemaMsg ? 503 : 500 }
    );
  }

  if (regenerate) {
    await supabase
      .from("site_pins")
      .delete()
      .eq("site_id", siteId)
      .eq("user_id", user.id)
      .neq("batch_id", batchId);
  }

  const sourceByIdx = new Map(
    rows.map((row) => [row.idx, row.source_image_url as string | null])
  );
  const metaByIdx = new Map(rows.map((row) => [row.idx, row]));

  const withImages = withPinImageUrls(
    (inserted ?? []).map((row) => {
      const idx = typeof (row as { idx?: number }).idx === "number" ? (row as { idx: number }).idx : 0;
      const existing = (row as { source_image_url?: string | null }).source_image_url;
      const source = existing || sourceByIdx.get(idx) || null;
      const meta = metaByIdx.get(idx);
      return {
        ...row,
        source_image_url: source,
        source_image_normalized_url:
          (row as { source_image_normalized_url?: string | null }).source_image_normalized_url ??
          meta?.source_image_normalized_url ??
          null,
        source_image_hash:
          (row as { source_image_hash?: string | null }).source_image_hash ??
          meta?.source_image_hash ??
          null,
        image_source:
          (row as { image_source?: string | null }).image_source ?? meta?.image_source ?? null,
        image_relevance_score:
          (row as { image_relevance_score?: number | null }).image_relevance_score ??
          meta?.image_relevance_score ??
          null,
        image_match_reason:
          (row as { image_match_reason?: string | null }).image_match_reason ??
          meta?.image_match_reason ??
          null,
      };
    })
  );

  await Promise.all(
    withImages.map((row) => {
      const update: Record<string, unknown> = {
        image_url: `/api/pins/${row.id}/image`,
      };
      if ((row as { source_image_url?: string | null }).source_image_url) {
        update.source_image_url = (row as { source_image_url?: string | null }).source_image_url;
      }
      if ((row as { source_image_normalized_url?: string | null }).source_image_normalized_url) {
        update.source_image_normalized_url = (
          row as { source_image_normalized_url?: string | null }
        ).source_image_normalized_url;
      }
      if ((row as { source_image_hash?: string | null }).source_image_hash) {
        update.source_image_hash = (row as { source_image_hash?: string | null }).source_image_hash;
      }
      if ((row as { image_source?: string | null }).image_source) {
        update.image_source = (row as { image_source?: string | null }).image_source;
      }
      if ((row as { image_relevance_score?: number | null }).image_relevance_score != null) {
        update.image_relevance_score = (
          row as { image_relevance_score?: number | null }
        ).image_relevance_score;
      }
      if ((row as { image_match_reason?: string | null }).image_match_reason) {
        update.image_match_reason = (row as { image_match_reason?: string | null }).image_match_reason;
      }
      return supabase.from("site_pins").update(update).eq("id", row.id);
    })
  );

  // Persist pinImages + durable used-image registry on the site.
  const pinImages: Record<string, string> = regenerate
    ? {}
    : { ...(copyJson?.pinImages ?? {}) };
  for (const row of withImages) {
    const src = (row as { source_image_url?: string | null }).source_image_url;
    if (src) pinImages[row.id] = src;
  }

  const registryWithPins: UsedImageRecord[] = updatedRegistry.map((rec) => ({ ...rec }));
  for (const row of withImages) {
    const src = (row as { source_image_url?: string | null }).source_image_url;
    if (!src) continue;
    registryWithPins.push({
      normalizedUrl:
        (row as { source_image_normalized_url?: string | null }).source_image_normalized_url ||
        strongNormalizeImageUrl(src),
      contentHash: (row as { source_image_hash?: string | null }).source_image_hash || undefined,
      sourceUrl: src,
      pinId: row.id,
      batchId,
    });
  }

  await supabase
    .from("sites")
    .update({
      sales_page_json: {
        ...(copyJson && typeof copyJson === "object" ? copyJson : {}),
        pinImages,
        usedPinImageIdentities: mergeUsedImageRecords(registryWithPins, []),
      },
    })
    .eq("id", siteId)
    .eq("user_id", user.id);

  try {
    await recordThreadGeneration(supabase, user.id, siteId);
  } catch (quotaError) {
    console.warn("[pins/generate] quota log insert failed:", quotaError);
  }

  const quotaAfter = await getThreadGenerationQuota(supabase, user.id).catch(() => quota);
  return NextResponse.json({ pins: withImages, batchId, quota: quotaAfter });
}
