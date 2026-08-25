"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  MousePointerClick,
  Pencil,
  Pin,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { EmptyState } from "@/components/ui/empty-state";

interface ResultsPayload {
  moneyPagesLive: number;
  trafficAssetsCreated: number;
  visitorsGenerated: number;
  affiliateClicks: number;
  warning?: string;
  assets: {
    id: string;
    product: string;
    status: string;
    traffic: number;
    affiliateClicks: number;
    pins?: number;
    ctr: number;
    href: string;
    publicPath?: string | null;
    viewHref?: string;
  }[];
  activity: { at: string; text: string }[];
}

function StatusBadge({ status }: { status: string }) {
  const live = status.toLowerCase() === "live" || status.toLowerCase() === "active";
  return (
    <span className={live ? "status-badge status-badge--live" : "status-badge status-badge--draft"}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function activityIcon(text: string) {
  if (/clicked/i.test(text)) return MousePointerClick;
  if (/pinterest|pin created|pins generated/i.test(text)) return Pin;
  if (/published|activated/i.test(text)) return Rocket;
  return Users;
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/results")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.error) setError(payload.error);
        else {
          setData(payload);
          if (typeof payload.warning === "string" && payload.warning) {
            setError(payload.warning);
          }
        }
      })
      .catch(() => setError("Could not load results"))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Money pages live",
      value: data?.moneyPagesLive ?? 0,
      icon: FileText,
      tone: "pulse" as const,
    },
    {
      label: "Traffic assets created",
      value: data?.trafficAssetsCreated ?? 0,
      icon: Pin,
      tone: "accent" as const,
    },
    {
      label: "Visitors generated",
      value: data?.visitorsGenerated ?? 0,
      icon: Users,
      tone: "neutral" as const,
    },
    {
      label: "Affiliate clicks",
      value: data?.affiliateClicks ?? 0,
      icon: MousePointerClick,
      tone: "gold" as const,
    },
  ];

  const insight = useMemo(() => {
    if (!data || loading) return null;
    const assetCount = data.assets.length;
    const liveCount = data.moneyPagesLive;
    const hasTraffic = data.visitorsGenerated > 0;
    const hasClicks = data.affiliateClicks > 0;

    if (assetCount === 0) {
      return "Activate your first product to publish a money page and start tracking real performance.";
    }
    if (!hasTraffic && !hasClicks) {
      return `${assetCount} asset${assetCount === 1 ? "" : "s"} in your workspace · ${liveCount} live. Post your Pinterest pins to start generating visitors.`;
    }
    if (hasTraffic && !hasClicks) {
      return `${data.visitorsGenerated} visitor${data.visitorsGenerated === 1 ? "" : "s"} so far. Clicks usually follow once traffic hits your money page CTA.`;
    }
    return `${data.affiliateClicks} affiliate click${data.affiliateClicks === 1 ? "" : "s"} from ${data.visitorsGenerated} visitor${data.visitorsGenerated === 1 ? "" : "s"} across ${assetCount} asset${assetCount === 1 ? "" : "s"}.`;
  }, [data, loading]);

  return (
    <WorkflowPage className="results-workspace">
      <PageHeader
        eyebrow="Step 3"
        title="Your results"
        subtitle="These numbers come from real visits and clicks — nothing is simulated."
      />

      {error ? <div className="alert-banner">{error}</div> : null}

      <div className="results-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassPanel key={stat.label} className={`results-stat-card results-stat-card--${stat.tone}`}>
              <span className={`results-stat-icon results-stat-icon--${stat.tone}`} aria-hidden>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="results-stat-copy">
                <div className="results-stat-label">{stat.label}</div>
                <div className="results-stat-value">
                  {loading ? <Loader2 className="inline h-6 w-6 animate-spin text-pulse-500" /> : stat.value}
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {insight ? (
        <GlassPanel className="results-insight-panel">
          <p className="results-insight-badge">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden />
            Performance snapshot
          </p>
          <p className="results-insight-copy">{insight}</p>
        </GlassPanel>
      ) : null}

      <div className="results-main-grid">
        <GlassPanel className="results-performance-panel overflow-hidden p-0">
          <div className="results-panel-header">
            <div>
              <p className="results-panel-eyebrow">
                <TrendingUp size={14} strokeWidth={1.75} aria-hidden />
                Portfolio
              </p>
              <h2 className="ds-h3">Asset performance</h2>
            </div>
            {!loading && (data?.assets.length ?? 0) > 0 ? (
              <Link href="/activate" className="btn-secondary results-panel-action">
                Activate another
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </Link>
            ) : null}
          </div>

          {(data?.assets ?? []).length === 0 && !loading ? (
            <div className="p-6">
              <EmptyState
                icon={Rocket}
                title="No assets yet"
                description="Activate your first product to publish a money page and start tracking visitors."
                actionHref="/activate"
                actionLabel="Activate an asset"
              />
            </div>
          ) : loading ? (
            <div className="results-table-loading">
              <Loader2 className="h-6 w-6 animate-spin text-pulse-500" aria-hidden />
              <p className="text-sm text-ink-3">Loading asset performance…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="results-table w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Traffic</th>
                    <th className="px-5 py-3 font-medium">Pins</th>
                    <th className="px-5 py-3 font-medium">Affiliate clicks</th>
                    <th className="px-5 py-3 font-medium">CTR</th>
                    <th className="px-5 py-3 font-medium text-right">Sales page</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.assets ?? []).map((asset) => {
                    const viewHref = asset.viewHref || asset.publicPath || asset.href;
                    const ctrWidth = Math.min(100, Math.max(0, asset.ctr));
                    return (
                      <tr key={asset.id} className="results-table-row">
                        <td className="px-5 py-4">
                          <Link href={asset.href} className="results-product-link">
                            {asset.product}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={asset.status} />
                        </td>
                        <td className="px-5 py-4">
                          <span className="results-metric">{asset.traffic}</span>
                          <span className="results-metric-unit"> visitors</span>
                        </td>
                        <td className="px-5 py-4">
                          {(asset.pins ?? 0) > 0 ? (
                            <Link href={`/traffic/${asset.id}`} className="results-traffic-link">
                              {asset.pins} pins
                            </Link>
                          ) : (
                            <Link href={`/traffic/${asset.id}`} className="results-traffic-link results-traffic-link--muted">
                              Generate
                            </Link>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="results-metric">{asset.affiliateClicks}</span>
                          <span className="results-metric-unit"> clicks</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="results-ctr-cell">
                            <span className="results-metric">{asset.ctr.toFixed(1)}%</span>
                            <span className="results-ctr-bar" aria-hidden>
                              <span className="results-ctr-bar-fill" style={{ width: `${ctrWidth}%` }} />
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Link
                              href={asset.href}
                              className="btn-secondary inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 text-[13px]"
                            >
                              <Pencil size={14} strokeWidth={1.75} aria-hidden />
                              Edit
                            </Link>
                            <a
                              href={viewHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 text-[13px]"
                            >
                              Preview
                              <ExternalLink size={14} strokeWidth={1.75} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="results-activity-panel">
          <div className="results-panel-header results-panel-header--compact">
            <div>
              <p className="results-panel-eyebrow">
                <Activity size={14} strokeWidth={1.75} aria-hidden />
                Live feed
              </p>
              <h2 className="ds-h3">Recent activity</h2>
            </div>
          </div>

          {(data?.activity ?? []).length === 0 && !loading ? (
            <div className="results-activity-empty">
              <span className="results-activity-empty-icon" aria-hidden>
                <Activity size={22} strokeWidth={1.5} />
              </span>
              <p className="text-sm leading-relaxed text-ink-3">
                No activity yet. Activate a product, publish a money page, or generate pins to see updates here.
              </p>
              <Link href="/activate" className="btn-secondary mt-2 inline-flex items-center gap-1.5">
                Get started
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          ) : loading ? (
            <div className="results-table-loading results-table-loading--compact">
              <Loader2 className="h-5 w-5 animate-spin text-pulse-500" aria-hidden />
            </div>
          ) : (
            <ul className="results-activity-feed">
              {(data?.activity ?? []).map((item) => {
                const Icon = activityIcon(item.text);
                const isClick = /clicked/i.test(item.text);
                return (
                  <li key={item.at + item.text} className="results-activity-item">
                    <span
                      className={`results-activity-icon ${isClick ? "results-activity-icon--click" : "results-activity-icon--visit"}`}
                      aria-hidden
                    >
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                    <div className="results-activity-copy">
                      <p className="results-activity-text">{item.text}</p>
                      <time className="results-activity-time" dateTime={item.at}>
                        {formatRelativeTime(item.at)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>
      </div>
    </WorkflowPage>
  );
}
