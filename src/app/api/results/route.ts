import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { loadAccountActivity } from "@/lib/account-activity";
import { buildResultsActivityFeed } from "@/lib/results-activity";
import { sitePublicPath } from "@/lib/app-url";
import { countLiveSites, loadUserSites } from "@/lib/user-sites";

export const dynamic = "force-dynamic";

type SiteRow = {
  id: string;
  title: string;
  product_name?: string | null;
  slug: string;
  status: string | null;
  owner_handle?: string | null;
  created_at?: string;
};

async function loadUserSitesForResults(
  supabase: Awaited<ReturnType<typeof getApiUser>>["supabase"],
  userId: string
): Promise<{ sites: SiteRow[]; error: string | null }> {
  const { sites, error } = await loadUserSites(supabase, userId);
  return {
    sites: sites as SiteRow[],
    error,
  };
}

export async function GET() {
  const guard = featureApiGuard("results");
  if (guard) return guard;
  const { supabase, user } = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sites: siteList, error: sitesError } = await loadUserSitesForResults(supabase, user.id);
  if (sitesError) {
    return NextResponse.json({ error: sitesError }, { status: 500 });
  }

  const siteIds = siteList.map((s) => s.id);
  const accountActivity = await loadAccountActivity(supabase, user.id);

  const empty = {
    moneyPagesLive: countLiveSites(siteList),
    trafficAssetsCreated: 0,
    visitorsGenerated: 0,
    affiliateClicks: 0,
    accountActivity,
    assets: [] as unknown[],
    activity: [] as unknown[],
  };

  if (siteIds.length === 0) return NextResponse.json(empty);

  const [{ data: pins, error: pinsError }, { data: visits, error: visitsError }, { data: clicks, error: clicksError }, { data: pinEvents, error: pinEventsError }] =
    await Promise.all([
      supabase.from("site_pins").select("id, site_id").eq("user_id", user.id).in("site_id", siteIds),
      supabase
        .from("page_visits")
        .select("id, site_id, source, created_at")
        .in("site_id", siteIds)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("affiliate_clicks")
        .select("id, site_id, created_at")
        .in("site_id", siteIds)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("site_pins")
        .select("site_id, batch_id, headline, title, created_at")
        .eq("user_id", user.id)
        .in("site_id", siteIds)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

  const metricsWarning =
    [pinsError, visitsError, clicksError, pinEventsError]
      .map((err) => err?.message)
      .filter(Boolean)
      .join(" · ") || null;

  const exact = await Promise.all(
    siteIds.map(async (id) => {
      const [v, c, p] = await Promise.all([
        supabase.from("page_visits").select("*", { count: "exact", head: true }).eq("site_id", id),
        supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("site_id", id),
        supabase.from("site_pins").select("*", { count: "exact", head: true }).eq("site_id", id),
      ]);
      return { id, visits: v.count ?? 0, clicks: c.count ?? 0, pins: p.count ?? 0 };
    })
  );
  const exactMap = Object.fromEntries(exact.map((row) => [row.id, row]));

  const assets = siteList.map((site) => {
    const stats = exactMap[site.id] ?? { visits: 0, clicks: 0, pins: 0 };
    const ctr = stats.visits > 0 ? (stats.clicks / stats.visits) * 100 : 0;
    const live = site.status === "live";
    return {
      id: site.id,
      product: site.product_name || site.title,
      status: live ? "ACTIVE" : "DRAFT",
      traffic: stats.visits,
      affiliateClicks: stats.clicks,
      pins: stats.pins,
      ctr,
      href: `/money-page/${site.id}`,
      publicPath: site.slug ? sitePublicPath(site) : null,
      viewHref: live && site.slug ? sitePublicPath(site) : `/api/assets/${site.id}/preview`,
    };
  });

  const activity = buildResultsActivityFeed({
    sites: siteList,
    visits,
    clicks,
    pins: pinEvents,
  });

  return NextResponse.json({
    moneyPagesLive: countLiveSites(siteList),
    trafficAssetsCreated: exact.reduce((sum, row) => sum + row.pins, 0),
    visitorsGenerated: exact.reduce((sum, row) => sum + row.visits, 0),
    affiliateClicks: exact.reduce((sum, row) => sum + row.clicks, 0),
    accountActivity,
    assets,
    activity,
    ...(metricsWarning ? { warning: metricsWarning } : {}),
  });
}
