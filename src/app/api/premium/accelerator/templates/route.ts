import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { sitePublicPath } from "@/lib/app-url";
import { normalizeAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import type { ArmedLink } from "@/features/blog-builder/types";
import {
  buildAcceleratorCatalog,
  getAcceleratorCardMeta,
  ACCELERATOR_TARGET_COUNT,
  acceleratorTemplateKey,
} from "@/features/premium-accelerator/lib/catalog";

export const dynamic = "force-dynamic";

function catalogIdFromTemplateKey(key: string | null | undefined): number | null {
  if (!key) return null;
  const match = /^accelerator-(\d+)$/.exec(key);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function siteAffiliateUrl(row: {
  product_url?: string | null;
  armed_links?: unknown;
}): string {
  const fromProduct = normalizeAffiliateUrl(row.product_url ?? "");
  if (fromProduct) return fromProduct;

  const links = Array.isArray(row.armed_links) ? (row.armed_links as ArmedLink[]) : [];
  return normalizeAffiliateUrl(links[0]?.url ?? "");
}

/** List vault catalog entries (deterministic, no DB seeding). */
export async function GET(request: Request) {
  const guard = featureApiGuard("premium-accelerator");
  if (guard) return guard;

  const { user, supabase } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const niche = new URL(request.url).searchParams.get("niche")?.trim() || "All";
  const filterByAffiliate = normalizeAffiliateUrl(
    new URL(request.url).searchParams.get("affiliateUrl")?.trim() ?? ""
  );
  const catalog = buildAcceleratorCatalog().filter(
    (e) => niche === "All" || e.niche === niche
  );

  /** Most recent install per catalog id (scoped to the selected affiliate link). */
  const usedByCatalogId = new Map<
    number,
    { assetId: string; siteUrl: string; usedAt: string }
  >();

  const { data: installedRows } = await supabase
    .from("sites")
    .select("id, slug, owner_handle, template_key, created_at, product_url, armed_links")
    .eq("user_id", user.id)
    .like("template_key", "accelerator-%")
    .order("created_at", { ascending: false });

  for (const row of installedRows ?? []) {
    if (filterByAffiliate && siteAffiliateUrl(row) !== filterByAffiliate) continue;

    const catalogId = catalogIdFromTemplateKey(
      (row as { template_key?: string | null }).template_key
    );
    if (catalogId == null || usedByCatalogId.has(catalogId)) continue;
    usedByCatalogId.set(catalogId, {
      assetId: row.id as string,
      siteUrl: sitePublicPath({
        slug: row.slug as string,
        owner_handle: (row as { owner_handle?: string | null }).owner_handle,
      }),
      usedAt: (row as { created_at?: string }).created_at || "",
    });
  }

  const templates = catalog.map((entry) => {
    const meta = getAcceleratorCardMeta(entry);
    const used = usedByCatalogId.get(entry.id);
    return {
      id: entry.id,
      niche: entry.niche,
      productName: entry.productName,
      templateName: meta.toneLabel,
      seeded: true,
      accent: meta.accent,
      hook: meta.hook,
      toneLabel: meta.toneLabel,
      themeLabel: meta.themeLabel,
      colorTheme: entry.colorTheme,
      variationId: entry.variationId,
      used: Boolean(used),
      usedAssetId: used?.assetId ?? null,
      usedSiteUrl: used?.siteUrl ?? null,
      usedAt: used?.usedAt ?? null,
      templateKey: acceleratorTemplateKey(entry.id),
    };
  });

  templates.sort((a, b) => {
    if (a.used !== b.used) return a.used ? -1 : 1;
    if (a.used && b.used) {
      return (b.usedAt || "").localeCompare(a.usedAt || "");
    }
    return a.id - b.id;
  });

  return NextResponse.json(
    {
      templates,
      total: ACCELERATOR_TARGET_COUNT,
      usedCount: usedByCatalogId.size,
    },
    { headers: NO_STORE_HEADERS }
  );
}
