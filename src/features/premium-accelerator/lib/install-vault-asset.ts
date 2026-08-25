import type { SupabaseClient, User } from "@supabase/supabase-js";
import { slugify } from "@/features/blog-builder/lib/seo";
import { detectLinkNetwork, normalizeAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import type { ArmedLink } from "@/features/blog-builder/types";
import { buildMoneyPageHtml } from "@/features/money-page/lib/html";
import { withMoneyPageThemeConfig } from "@/features/money-page/lib/themes";
import { getOrCreateUserHandle } from "@/lib/user-handle";
import {
  acceleratorTemplateKey,
  getAcceleratorCatalogEntry,
  type VaultCatalogEntry,
} from "./catalog";
import { isTemplateComplete, loadTemplateSite, PLACEHOLDER_CTA } from "./seed-vault-templates";
import { resolveVaultHeroImage } from "./vault-images";
import { buildVaultMoneyPageCopy } from "./vault-copy";
import { seedVaultPins } from "./seed-vault-pins";

export interface InstallVaultAssetResult {
  site: Record<string, unknown> & { id: string; slug: string; owner_handle?: string | null };
  catalogEntry: VaultCatalogEntry;
  pinCount: number;
}

function rewriteCtaInHtml(html: string, affiliateUrl: string): string {
  if (!html) return html;
  return html.split(PLACEHOLDER_CTA).join(affiliateUrl);
}

/**
 * Install a vault catalog entry as a live member-owned money page.
 * Prefers a pre-seeded template (instant clone) so members never wait on image generation.
 * Falls back to on-demand build when the template has not been seeded yet.
 */
export async function installVaultAsset(params: {
  supabase: SupabaseClient;
  user: User;
  catalogId: number;
  affiliateUrl: string;
}): Promise<InstallVaultAssetResult> {
  const entry = getAcceleratorCatalogEntry(params.catalogId);
  if (!entry) {
    throw new Error("Vault page not found");
  }

  const affiliateUrl = normalizeAffiliateUrl(params.affiliateUrl.trim());
  if (!affiliateUrl) {
    throw new Error("affiliateUrl is required");
  }

  const template = await loadTemplateSite(params.supabase, entry.id);
  const useTemplate = isTemplateComplete(template);

  const templateJson = (template?.sales_page_json ?? null) as Record<string, unknown> | null;
  const preloadedPins = Array.isArray(templateJson?.vaultPinImages)
    ? (templateJson.vaultPinImages as string[])
    : null;
  const heroImage = useTemplate
    ? String(templateJson?.heroImage ?? "").trim()
    : await resolveVaultHeroImage({
        productName: entry.productName,
        niche: entry.niche,
        scrapeUrl: affiliateUrl,
      });

  const copy = useTemplate
    ? ({
        ...templateJson,
        heroImage: heroImage || undefined,
      } as ReturnType<typeof buildVaultMoneyPageCopy>)
    : buildVaultMoneyPageCopy(entry, heroImage);

  const armedLinks: ArmedLink[] = [
    {
      label: entry.productName,
      url: affiliateUrl,
      network: detectLinkNetwork(affiliateUrl),
    },
  ];

  const baseSlug = slugify(entry.productName) || `vault-${entry.id}`;
  const { data: existingRows } = await params.supabase
    .from("sites")
    .select("slug")
    .eq("user_id", params.user.id)
    .like("slug", `${baseSlug}%`);
  const taken = new Set((existingRows ?? []).map((row) => row.slug as string));
  let slug = baseSlug;
  for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;

  const ownerHandle = await getOrCreateUserHandle(params.supabase, params.user);
  const themeConfig = withMoneyPageThemeConfig(
    {},
    {
      moneyColorTheme: entry.colorTheme,
      moneyVariation: entry.variationId,
    }
  );

  const baseRow: Record<string, unknown> = {
    user_id: params.user.id,
    hobby: entry.niche,
    territory: entry.niche,
    title: copy.headline.slice(0, 180),
    tagline: copy.subheadline.slice(0, 160),
    slug,
    theme: "editorial",
    theme_config: themeConfig,
    armed_links: armedLinks,
    status: "live",
    site_type: "product",
    product_name: entry.productName,
    product_url: affiliateUrl,
    asset_source: "vault",
    template_key: acceleratorTemplateKey(entry.id),
    is_template: false,
    sales_page_json: copy,
  };
  if (ownerHandle) baseRow.owner_handle = ownerHandle;

  const { data: site, error } = await params.supabase.from("sites").insert(baseRow).select().single();

  let created = site as InstallVaultAssetResult["site"] | null;
  if (error || !created) {
    const retry: Record<string, unknown> = {
      ...baseRow,
      slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
    };
    delete retry.owner_handle;
    delete retry.product_name;
    delete retry.product_url;
    delete retry.asset_source;
    delete retry.template_key;
    delete retry.is_template;
    delete retry.sales_page_json;

    const second = await params.supabase.from("sites").insert(retry).select().single();
    if (second.error || !second.data) {
      throw new Error(error?.message || second.error?.message || "Could not create vault asset");
    }
    created = second.data as InstallVaultAssetResult["site"];
  }

  // Rebuild HTML with the member CTA/site id (copy + unique images already come from seed).
  const finalHtml = buildMoneyPageHtml({
    siteId: created.id,
    productName: entry.productName,
    copy,
    ctaUrl: affiliateUrl,
    colorTheme: entry.colorTheme,
    variationId: entry.variationId,
  });

  const { error: updateError } = await params.supabase
    .from("sites")
    .update({
      sales_page_html: finalHtml,
      sales_page_json: {
        ...copy,
        heroImage: heroImage || undefined,
        vaultPinImages: preloadedPins ?? undefined,
      },
      title: copy.headline.slice(0, 180),
      tagline: copy.subheadline.slice(0, 160),
      site_type: "product",
      theme_config: themeConfig,
      product_name: entry.productName,
      product_url: affiliateUrl,
      asset_source: "vault",
      status: "live",
    })
    .eq("id", created.id)
    .eq("user_id", params.user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const pinCount = await seedVaultPins({
    supabase: params.supabase,
    userId: params.user.id,
    siteId: created.id,
    entry,
    // Always pass affiliate URL so re-resolved slots can scrape product images.
    scrapeUrl: affiliateUrl,
    heroImage,
    preloadedPinImages: preloadedPins,
    salesPageJson: copy as unknown as Record<string, unknown>,
  });

  return {
    site: {
      ...created,
      product_name: entry.productName,
      sales_page_html: finalHtml,
      sales_page_json: copy,
      status: "live",
    },
    catalogEntry: entry,
    pinCount,
  };
}
