import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapePageWithCache } from "@/features/blog-builder/lib/scrape-cache";
import { fetchMoneyPageHeroOptions } from "@/features/money-page/lib/hero-options";
import { slugify } from "@/features/blog-builder/lib/seo";
import { getOrCreateUserHandle } from "@/lib/user-handle";
import { getServiceRoleClient } from "@/lib/api-auth";
import type { User } from "@supabase/supabase-js";
import type { ArmedLink } from "@/features/blog-builder/types";
import { detectLinkNetwork, normalizeAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import { generateMoneyPageCopy, fallbackMoneyPageCopy } from "./copy";
import { buildMoneyPageHtml } from "./html";
import { inferNiche } from "./niche";
import type { MoneyPageCopy } from "./types";
import {
  DEFAULT_MONEY_PAGE_COLOR_THEME,
  resolveMoneyPageColorThemeId,
  withMoneyPageThemeConfig,
  type MoneyPageColorThemeId,
} from "./themes";
import {
  pickNextMoneyPageVariation,
  resolveMoneyPageVariationId,
  type MoneyPageVariationId,
} from "./variations";

export interface ActivateInput {
  productUrl?: string;
  productName?: string;
  affiliateUrl?: string;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) || /^[\w.-]+\.[a-z]{2,}/i.test(value.trim());
}

export async function generateMoneyPageForSite(params: {
  supabase: SupabaseClient;
  userId: string;
  siteId: string;
  productName: string;
  niche: string;
  description?: string;
  productContext?: string;
  heroImage?: string;
  ctaUrl: string;
  colorTheme?: MoneyPageColorThemeId | null;
  variationId?: MoneyPageVariationId | null;
  excludeVariationId?: MoneyPageVariationId | null;
  existingThemeConfig?: unknown;
}): Promise<{ copy: MoneyPageCopy; html: string; colorTheme: MoneyPageColorThemeId; variationId: MoneyPageVariationId }> {
  const colorTheme = params.colorTheme ?? DEFAULT_MONEY_PAGE_COLOR_THEME;
  const { copy, variationId } = await generateMoneyPageCopy({
    productName: params.productName,
    niche: params.niche,
    description: params.description,
    productContext: params.productContext,
    variationId: params.variationId,
    excludeVariationId: params.excludeVariationId,
  });
  if (params.heroImage) copy.heroImage = params.heroImage;
  const html = buildMoneyPageHtml({
    siteId: params.siteId,
    productName: params.productName,
    copy,
    ctaUrl: params.ctaUrl,
    colorTheme,
    variationId,
  });
  const themeConfig = withMoneyPageThemeConfig(params.existingThemeConfig, {
    moneyColorTheme: colorTheme,
    moneyVariation: variationId,
  });
  const { error } = await params.supabase
    .from("sites")
    .update({
      title: copy.headline.slice(0, 180),
      tagline: copy.subheadline.slice(0, 160),
      site_type: "product",
      sales_page_html: html,
      sales_page_json: copy,
      theme_config: themeConfig,
    })
    .eq("id", params.siteId)
    .eq("user_id", params.userId);
  if (error) throw new Error(error.message);
  return { copy, html, colorTheme, variationId };
}

export async function activateAsset(params: {
  supabase: SupabaseClient;
  user: User;
  input: ActivateInput;
}) {
  const productUrlRaw = params.input.productUrl?.trim() || "";
  const nameRaw = params.input.productName?.trim() || "";
  const affiliateRaw = params.input.affiliateUrl?.trim() || "";

  if (!productUrlRaw && !nameRaw) {
    throw new Error("Paste a product URL or enter a product name.");
  }

  const productUrl = productUrlRaw && looksLikeUrl(productUrlRaw)
    ? normalizeAffiliateUrl(productUrlRaw)
    : "";

  const affiliateUrl = affiliateRaw ? normalizeAffiliateUrl(affiliateRaw) : "";
  const admin = getServiceRoleClient();

  let scrapedTitle = "";
  let scrapedDescription = "";
  let productContext = "";
  let heroImage = "";

  const scrapeTarget = productUrl || affiliateUrl;
  if (scrapeTarget && looksLikeUrl(scrapeTarget)) {
    const scraped = await scrapePageWithCache(scrapeTarget, admin);
    scrapedTitle = scraped.data?.title || "";
    scrapedDescription = scraped.data?.description || "";
    productContext = scraped.context || "";
    heroImage = scraped.data?.imageUrl || "";
  }

  const productName =
    nameRaw && !looksLikeUrl(nameRaw)
      ? nameRaw
      : scrapedTitle || nameRaw || "Featured product";

  const niche = inferNiche(productName, productContext || scrapedDescription);
  if (!heroImage) {
    const productPhotos = await fetchMoneyPageHeroOptions({
      niche,
      productName,
      pageDescription: productContext || scrapedDescription,
      count: 1,
    });
    heroImage = productPhotos[0] ?? "";
  }
  const ctaUrl = affiliateUrl || productUrl || "";
  const armedLinks: ArmedLink[] = ctaUrl
    ? [{ label: productName, url: ctaUrl, network: detectLinkNetwork(ctaUrl) }]
    : [];

  const baseSlug = slugify(productName) || "money-page";
  const { data: existingRows } = await params.supabase
    .from("sites")
    .select("slug")
    .eq("user_id", params.user.id)
    .like("slug", `${baseSlug}%`);
  const taken = new Set((existingRows ?? []).map((row) => row.slug as string));
  let slug = baseSlug;
  for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;

  const ownerHandle = await getOrCreateUserHandle(params.supabase, params.user);
  const initialVariation = pickNextMoneyPageVariation(null);
  const initialThemeConfig = withMoneyPageThemeConfig(
    {},
    {
      moneyColorTheme: DEFAULT_MONEY_PAGE_COLOR_THEME,
      moneyVariation: initialVariation,
    }
  );
  const baseRow: Record<string, unknown> = {
    user_id: params.user.id,
    hobby: niche,
    territory: niche,
    title: productName,
    tagline: scrapedDescription.slice(0, 160) || `Review of ${productName}`,
    slug,
    theme: "editorial",
    theme_config: initialThemeConfig,
    armed_links: armedLinks,
    status: "draft",
    site_type: "product",
    product_name: productName,
    product_url: productUrl || null,
    asset_source: "activator",
  };
  if (ownerHandle) baseRow.owner_handle = ownerHandle;

  const { data: site, error } = await params.supabase.from("sites").insert(baseRow).select().single();
  if (error || !site) {
    // Only strip columns that may be missing on older schemas (42703 = undefined_column).
    // Other failures (unique collision, RLS, etc.) keep full row data and retry with a fresh slug.
    const retry: Record<string, unknown> = {
      ...baseRow,
      slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
    };
    if (error?.code === "42703") {
      delete retry.owner_handle;
      delete retry.product_name;
      delete retry.product_url;
      delete retry.asset_source;
    }
    const second = await params.supabase.from("sites").insert(retry).select().single();
    if (second.error || !second.data) {
      throw new Error(error?.message || second.error?.message || "Could not create asset");
    }
    const created = second.data;
    const { copy } = await generateMoneyPageForSite({
      supabase: params.supabase,
      userId: params.user.id,
      siteId: created.id,
      productName,
      niche,
      description: scrapedDescription,
      productContext,
      heroImage,
      ctaUrl,
      colorTheme: DEFAULT_MONEY_PAGE_COLOR_THEME,
      variationId: initialVariation,
      existingThemeConfig: initialThemeConfig,
    });
    return { site: { ...created, product_name: productName }, copy };
  }

  try {
    const { copy } = await generateMoneyPageForSite({
      supabase: params.supabase,
      userId: params.user.id,
      siteId: site.id,
      productName,
      niche,
      description: scrapedDescription,
      productContext,
      heroImage,
      ctaUrl,
      colorTheme: DEFAULT_MONEY_PAGE_COLOR_THEME,
      variationId: initialVariation,
      existingThemeConfig: initialThemeConfig,
    });
    return { site, copy };
  } catch {
    const copy = fallbackMoneyPageCopy(productName, scrapedDescription, initialVariation);
    if (heroImage) copy.heroImage = heroImage;
    const html = buildMoneyPageHtml({
      siteId: site.id,
      productName,
      copy,
      ctaUrl,
      colorTheme: DEFAULT_MONEY_PAGE_COLOR_THEME,
      variationId: initialVariation,
    });
    await params.supabase
      .from("sites")
      .update({
        sales_page_html: html,
        sales_page_json: copy,
        title: copy.headline,
        theme_config: initialThemeConfig,
      })
      .eq("id", site.id);
    return { site, copy };
  }
}

export function moneyPageThemeFromSite(site: { theme_config?: unknown }) {
  return {
    colorTheme: resolveMoneyPageColorThemeId(site.theme_config),
    variationId: resolveMoneyPageVariationId(site.theme_config),
  };
}
