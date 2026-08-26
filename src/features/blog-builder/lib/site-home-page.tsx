import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SiteHomeView, ProductSiteView, getPublicBrand } from "@/features/blog-builder/themes";
import type { ThemeConfig } from "@/features/blog-builder/types";

export const SITE_HOME_META_COLUMNS =
  "title, tagline, hobby, territory, sales_page_html, sales_page_json, site_type";

export const SITE_HOME_COLUMNS =
  "id, title, tagline, slug, owner_handle, hobby, territory, theme, theme_config, template_key, site_type, sales_page_html";

export interface SiteHomeMetaRow {
  title: string;
  tagline: string | null;
  hobby: string;
  territory: string | null;
  sales_page_html: string | null;
  sales_page_json: Record<string, unknown> | null;
  site_type: string | null;
}

export interface SiteHomeRow {
  id: string;
  title: string;
  tagline: string | null;
  slug: string;
  owner_handle?: string | null;
  hobby: string;
  territory: string | null;
  theme: string;
  theme_config: ThemeConfig | null;
  template_key: string | null;
  site_type: string | null;
  sales_page_html: string | null;
}

export function buildSiteHomeMetadata(site: SiteHomeMetaRow | null): Metadata {
  if (!site) return { title: "Not found" };

  const isProductSite = site.site_type === "product" || Boolean(site.sales_page_html);
  const salesCopy = site.sales_page_json as {
    subhook?: string;
    subtitle?: string;
    hook?: string;
  } | null;
  const productDescription =
    (typeof salesCopy?.subtitle === "string" && salesCopy.subtitle.trim()) ||
    (typeof salesCopy?.subhook === "string" && salesCopy.subhook.trim()) ||
    (typeof site.tagline === "string" && site.tagline.trim()) ||
    undefined;

  const brand = getPublicBrand(site);
  const title = brand.name;
  const description = isProductSite ? productDescription ?? brand.tagline : brand.tagline;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export async function renderSiteHome(supabase: SupabaseClient, site: SiteHomeRow) {
  const isProductSite = site.site_type === "product" || Boolean(site.sales_page_html);

  if (isProductSite && site.sales_page_html) {
    return <ProductSiteView html={site.sales_page_html} />;
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, is_pillar, created_at, image_url")
    .eq("site_id", site.id)
    .eq("status", "live")
    .order("is_pillar", { ascending: false })
    .order("created_at", { ascending: true });

  return <SiteHomeView site={site} siteSlug={site.slug} posts={posts ?? []} />;
}
