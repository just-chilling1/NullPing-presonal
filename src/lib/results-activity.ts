export interface ResultsActivityItem {
  at: string;
  text: string;
}

type SiteRef = {
  id: string;
  title: string;
  product_name?: string | null;
  status: string | null;
  created_at?: string;
};

type VisitRow = {
  site_id: string;
  source: string | null;
  created_at: string;
};

type ClickRow = {
  site_id: string;
  created_at: string;
};

type PinRow = {
  site_id: string;
  batch_id: string;
  headline?: string | null;
  title?: string | null;
  created_at: string;
};

function siteLabel(sites: SiteRef[], siteId: string): string {
  const site = sites.find((row) => row.id === siteId);
  return site?.product_name || site?.title || "your asset";
}

/** Merge visits, clicks, pin batches, and publish events into a single activity feed. */
export function buildResultsActivityFeed(params: {
  sites: SiteRef[];
  visits?: VisitRow[] | null;
  clicks?: ClickRow[] | null;
  pins?: PinRow[] | null;
  limit?: number;
}): ResultsActivityItem[] {
  const { sites, visits, clicks, pins, limit = 20 } = params;
  const activity: ResultsActivityItem[] = [];

  for (const row of visits ?? []) {
    if (!row.created_at) continue;
    const label = siteLabel(sites, row.site_id);
    activity.push({
      at: row.created_at,
      text:
        row.source === "pinterest"
          ? `Pinterest visitor reached ${label}.`
          : `Visitor reached ${label}.`,
    });
  }

  for (const row of clicks ?? []) {
    if (!row.created_at) continue;
    activity.push({
      at: row.created_at,
      text: `Affiliate link clicked on ${siteLabel(sites, row.site_id)}.`,
    });
  }

  const batches = new Map<
    string,
    { siteId: string; count: number; at: string; sample: string }
  >();

  for (const pin of pins ?? []) {
    if (!pin.created_at || !pin.batch_id) continue;
    const existing = batches.get(pin.batch_id);
    const sample = pin.headline?.trim() || pin.title?.trim() || "Pinterest pin";
    if (!existing) {
      batches.set(pin.batch_id, {
        siteId: pin.site_id,
        count: 1,
        at: pin.created_at,
        sample,
      });
      continue;
    }
    existing.count += 1;
    if (+new Date(pin.created_at) > +new Date(existing.at)) {
      existing.at = pin.created_at;
    }
  }

  for (const batch of batches.values()) {
    const label = siteLabel(sites, batch.siteId);
    activity.push({
      at: batch.at,
      text:
        batch.count === 1
          ? `Pinterest pin created for ${label}: “${batch.sample}”.`
          : `${batch.count} Pinterest pins generated for ${label}.`,
    });
  }

  for (const site of sites) {
    if (!site.created_at) continue;
    const label = site.product_name || site.title || "your asset";
    if (site.status === "live") {
      activity.push({
        at: site.created_at,
        text: `Money page published for ${label}.`,
      });
    } else {
      activity.push({
        at: site.created_at,
        text: `Asset activated: ${label}.`,
      });
    }
  }

  return activity
    .filter((item) => item.at && item.text)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, limit);
}
