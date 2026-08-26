import type { Metadata } from "next";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import {
  buildSiteHomeMetadata,
  renderSiteHome,
  SITE_HOME_COLUMNS,
  SITE_HOME_META_COLUMNS,
  type SiteHomeRow,
  type SiteHomeMetaRow,
} from "@/features/blog-builder/lib/site-home-page";
import { findLiveSiteBySlug } from "@/features/blog-builder/lib/public-site-lookup";
import { recordPublicPageVisit } from "@/features/money-page/lib/record-visit";
import { sitePublicPath } from "@/lib/app-url";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pin?: string; src?: string }>;
};

function withQuery(path: string, query: { pin?: string; src?: string }): string {
  const params = new URLSearchParams();
  if (query.pin) params.set("pin", query.pin);
  if (query.src) params.set("src", query.src);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicSupabaseClient();
  const site = await findLiveSiteBySlug<SiteHomeMetaRow>(
    supabase,
    SITE_HOME_META_COLUMNS,
    slug
  );
  return buildSiteHomeMetadata(site);
}

export default async function PublicMoneyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = createPublicSupabaseClient();
  const site = await findLiveSiteBySlug<SiteHomeRow>(supabase, SITE_HOME_COLUMNS, slug);
  if (!site) notFound();

  // Canonicalize legacy /m/{slug} links onto handle-scoped URLs when available.
  if (site.owner_handle) {
    redirect(withQuery(sitePublicPath({ slug: site.slug, owner_handle: site.owner_handle }), query));
  }

  await recordPublicPageVisit({
    siteId: site.id,
    pinId: query.pin || null,
    source: query.src || null,
  });
  return renderSiteHome(supabase, site);
}
