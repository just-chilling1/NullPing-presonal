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
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ userHandle: string; siteSlug: string }>;
  searchParams: Promise<{ pin?: string; src?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userHandle, siteSlug } = await params;
  const supabase = createPublicSupabaseClient();
  const site = await findLiveSiteBySlug<SiteHomeMetaRow>(
    supabase,
    SITE_HOME_META_COLUMNS,
    siteSlug,
    userHandle
  );
  return buildSiteHomeMetadata(site);
}

export default async function MemberSiteHomePage({ params, searchParams }: Props) {
  const { userHandle, siteSlug } = await params;
  const query = await searchParams;
  const supabase = createPublicSupabaseClient();
  const site = await findLiveSiteBySlug<SiteHomeRow>(
    supabase,
    SITE_HOME_COLUMNS,
    siteSlug,
    userHandle
  );
  if (!site) notFound();
  await recordPublicPageVisit({
    siteId: site.id,
    pinId: query.pin || null,
    source: query.src || null,
  });
  return renderSiteHome(supabase, site);
}
