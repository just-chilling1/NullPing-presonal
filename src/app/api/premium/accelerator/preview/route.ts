import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser, getServiceRoleClient } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { normalizeAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import { buildMoneyPageHtml } from "@/features/money-page/lib/html";
import { getMoneyPageVariation } from "@/features/money-page/lib/variations";
import { getAcceleratorCatalogEntry } from "@/features/premium-accelerator/lib/catalog";
import { buildVaultMoneyPageCopy } from "@/features/premium-accelerator/lib/vault-copy";
import {
  isTemplateComplete,
  loadTemplateSite,
  PLACEHOLDER_CTA,
} from "@/features/premium-accelerator/lib/seed-vault-templates";
import { resolveVaultPinDrafts } from "@/features/premium-accelerator/lib/vault-images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Return money page HTML + Pinterest pin drafts for preview (no DB writes). */
export async function GET(request: Request) {
  const guard = featureApiGuard("premium-accelerator");
  if (guard) return guard;

  const { user, supabase } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const url = new URL(request.url);
  const catalogId = Number(url.searchParams.get("catalogId"));
  const affiliateRaw = url.searchParams.get("affiliateUrl")?.trim() || "";

  if (!catalogId || Number.isNaN(catalogId)) {
    return NextResponse.json(
      { error: "catalogId is required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const entry = getAcceleratorCatalogEntry(catalogId);
  if (!entry) {
    return NextResponse.json(
      { error: "Vault page not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const affiliateUrl = affiliateRaw ? normalizeAffiliateUrl(affiliateRaw) : "";
  const previewCta = affiliateUrl || "https://example.com";
  const variation = getMoneyPageVariation(entry.variationId);

  const admin = getServiceRoleClient();
  const imageClient = admin ?? supabase;
  const template = admin ? await loadTemplateSite(admin, entry.id) : null;
  // Unlimited money pages are text-only — never embed hero photos.
  const copy = buildVaultMoneyPageCopy(entry, null);
  const salesPageHtml = buildMoneyPageHtml({
    siteId: "preview",
    productName: entry.productName,
    copy,
    ctaUrl: previewCta,
    colorTheme: entry.colorTheme,
    variationId: entry.variationId,
    ctaHrefOverride: previewCta,
  });

  if (isTemplateComplete(template)) {
    // Always re-resolve pins with the product pipeline so stale/unrelated
    // seed images (e.g. fruit stock) are replaced with niche-relevant shots.
    const pins = await resolveVaultPinDrafts({
      entry,
      scrapeUrl: affiliateUrl || null,
      heroImage: null,
      preloadedPinImages: null,
      userId: user.id,
      supabase: imageClient,
    });

    return NextResponse.json(
      {
        catalogId: entry.id,
        niche: entry.niche,
        productName: entry.productName,
        templateName: variation.label,
        title: copy.headline,
        tagline: copy.subheadline,
        salesPageHtml: salesPageHtml.split(PLACEHOLDER_CTA).join(previewCta),
        pins,
        seeded: true,
        threads: [],
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const pins = await resolveVaultPinDrafts({
    entry,
    scrapeUrl: affiliateUrl || null,
    heroImage: null,
    userId: user.id,
    supabase: imageClient,
  });

  return NextResponse.json(
    {
      catalogId: entry.id,
      niche: entry.niche,
      productName: entry.productName,
      templateName: variation.label,
      title: copy.headline,
      tagline: copy.subheadline,
      salesPageHtml,
      pins,
      seeded: false,
      threads: [],
    },
    { headers: NO_STORE_HEADERS }
  );
}
