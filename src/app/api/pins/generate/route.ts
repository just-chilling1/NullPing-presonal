import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { clampPinCount, generatePinCopy } from "@/features/traffic/lib/pin-rules";
import {
  resolvePinBackgroundImages,
  uniquePinFallbackUrl,
} from "@/features/traffic/lib/pin-images";
import { normalizeImageUrl } from "@/features/blog-builder/lib/images";
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
      ? `/api/pins/${pin.id}/image?v=10`
      : pin.image_url || `/api/pins/${pin.id}/image?v=10`,
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
    sales_page_json?: { headline?: string; subheadline?: string; heroImage?: string } | null;
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
  const priorPinImages = Object.values(
    (copyJson as { pinImages?: Record<string, string> } | null)?.pinImages ?? {}
  );

  // Existing pin backgrounds on this asset — never reuse across batches.
  const { data: existingPinRows } = await supabase
    .from("site_pins")
    .select("source_image_url")
    .eq("site_id", siteId)
    .eq("user_id", user.id);
  const existingSourceImages = (existingPinRows ?? [])
    .map((row) => (row as { source_image_url?: string | null }).source_image_url)
    .filter((url): url is string => Boolean(url?.trim()));

  const backgrounds = await resolvePinBackgroundImages({
    pins: copies,
    productName,
    hobby: site.hobby,
    scrapeUrl,
    scrapeUrls,
    // Hero only on the first-ever batch (not extra / regenerate refill slots).
    preferredImages: extraBatch || regenerate ? [] : [heroImage],
    excludeImages: [
      // Always keep the money-page hero unique unless it's assigned as preferred above.
      ...(extraBatch || regenerate ? [heroImage] : []),
      ...priorPinImages,
      ...existingSourceImages,
    ],
    userId: user.id,
    supabase,
  });

  // Enforce uniqueness at insert time — never coalesce multiple pins onto the same image.
  const usedAtInsert = new Set<string>();
  const rows = copies.map((pin, idx) => {
    let source = backgrounds[idx] || null;
    if (source) {
      const key = normalizeImageUrl(source);
      if (usedAtInsert.has(key)) {
        source = null;
      } else {
        usedAtInsert.add(key);
      }
    }
    // Pin 0 may use the money-page hero once if nothing else resolved.
    if (!source && idx === 0 && heroImage) {
      const heroKey = normalizeImageUrl(heroImage);
      if (!usedAtInsert.has(heroKey)) {
        source = heroImage;
        usedAtInsert.add(heroKey);
      }
    }
    // Never leave a pin without a unique background — fill with a diversified fallback.
    if (!source) {
      const fallback = uniquePinFallbackUrl({
        productName,
        pinIdx: idx,
        usedKeys: usedAtInsert,
        hobby: site.hobby,
        headlineLen: pin.headline?.length ?? 0,
      });
      if (fallback) {
        source = fallback;
        usedAtInsert.add(normalizeImageUrl(fallback));
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
    };
  });

  let { data: inserted, error } = await supabase.from("site_pins").insert(rows).select("*");

  // Older DBs without source_image_url — insert without it, then patch hero onto sales page usage.
  if (error && schemaMissingMessage(error)) {
    const legacyRows = rows.map(({ source_image_url: _s, ...rest }) => rest);
    const second = await supabase.from("site_pins").insert(legacyRows).select("*");
    inserted = second.data;
    error = second.error;
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

  // Map backgrounds by pin idx — never zip by array order (Supabase may reorder rows).
  const backgroundByIdx = new Map(copies.map((_, idx) => [idx, backgrounds[idx] ?? null]));
  const sourceByIdx = new Map(
    rows.map((row) => [row.idx, row.source_image_url as string | null])
  );

  const withImages = withPinImageUrls(
    (inserted ?? []).map((row) => {
      const idx = typeof (row as { idx?: number }).idx === "number" ? (row as { idx: number }).idx : 0;
      const existing = (row as { source_image_url?: string | null }).source_image_url;
      const source = existing || sourceByIdx.get(idx) || backgroundByIdx.get(idx) || null;
      return {
        ...row,
        source_image_url: source,
      };
    })
  );

  await Promise.all(
    withImages.map((row) =>
      supabase
        .from("site_pins")
        .update({
          image_url: `/api/pins/${row.id}/image`,
          ...((row as { source_image_url?: string | null }).source_image_url
            ? { source_image_url: (row as { source_image_url?: string | null }).source_image_url }
            : {}),
        })
        .eq("id", row.id)
    )
  );

  // Persist backgrounds on the money page JSON so pin images work even before
  // source_image_url is migrated onto site_pins.
  const pinImages: Record<string, string> = regenerate
    ? {}
    : {
        ...((copyJson as { pinImages?: Record<string, string> } | null)?.pinImages ?? {}),
      };
  for (const row of withImages) {
    const src = (row as { source_image_url?: string | null }).source_image_url;
    if (src) pinImages[row.id] = src;
  }
  if (Object.keys(pinImages).length > 0) {
    await supabase
      .from("sites")
      .update({
        sales_page_json: {
          ...(copyJson && typeof copyJson === "object" ? copyJson : {}),
          pinImages,
        },
      })
      .eq("id", siteId)
      .eq("user_id", user.id);
  }

  try {
    await recordThreadGeneration(supabase, user.id, siteId);
  } catch (quotaError) {
    console.warn("[pins/generate] quota log insert failed:", quotaError);
  }

  const quotaAfter = await getThreadGenerationQuota(supabase, user.id).catch(() => quota);
  return NextResponse.json({ pins: withImages, batchId, quota: quotaAfter });
}
