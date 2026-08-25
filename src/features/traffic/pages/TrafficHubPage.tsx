"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Pin, Rocket, Sparkles } from "lucide-react";
import { brand } from "@/config/brand.config";
import { PageHeader } from "@/components/ui/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { EmptyState } from "@/components/ui/empty-state";
import { TrafficGenerationQuota } from "@/features/traffic/components/TrafficGenerationQuota";
import type { ThreadGenerationQuota } from "@/features/publish-kit/lib/thread-generation-quota";

interface TrafficAssetRow {
  id: string;
  product: string;
  status: string;
  pins?: number;
  href: string;
}

export default function TrafficHubPage() {
  const [assets, setAssets] = useState<TrafficAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quota, setQuota] = useState<ThreadGenerationQuota | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/results")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.error) {
          setError(payload.error);
          return;
        }
        setAssets(payload.assets ?? []);
      })
      .catch(() => setError("Could not load your assets"))
      .finally(() => setLoading(false));

    void fetch("/api/pins/quota", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (payload.quota) setQuota(payload.quota as ThreadGenerationQuota);
      })
      .catch(() => {})
      .finally(() => setQuotaLoading(false));
  }, []);

  return (
    <WorkflowPage className="traffic-workspace">
      <PageHeader
        eyebrow="Step 2"
        title="Generate Traffic"
        subtitle={`Pick a money page and create Pinterest pins that send visitors to your sales page — separate from ${brand.productName} activation.`}
      />

      {error ? <div className="alert-banner">{error}</div> : null}

      <TrafficGenerationQuota quota={quota} loading={quotaLoading} />

      <GlassPanel className="traffic-hub-intro">
        <p className="traffic-hub-intro-badge">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden />
          Pinterest traffic
        </p>
        <p className="traffic-hub-intro-copy">
          Activate Asset builds your sales page. Open Generate Traffic when you are ready to create pin images,
          titles, descriptions, and tracking links for that page. You get 5 pin generations per day.
        </p>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="traffic-loading-panel">
          <Loader2 className="h-6 w-6 animate-spin text-pulse-500" aria-hidden />
          <p className="text-sm text-ink-3">Loading your money pages…</p>
        </GlassPanel>
      ) : assets.length === 0 ? (
        <GlassPanel className="p-6">
          <EmptyState
            icon={Pin}
            title="No money pages yet"
            description="Activate a product first to build a sales page, then come back here to generate Pinterest traffic."
            actionHref="/activate"
            actionLabel="Activate an asset"
          />
        </GlassPanel>
      ) : (
        <div className="traffic-hub-grid">
          {assets.map((asset) => {
            const live = asset.status.toLowerCase() === "active";
            const pinCount = asset.pins ?? 0;
            return (
              <GlassPanel key={asset.id} className="traffic-hub-card">
                <div className="traffic-hub-card-top">
                  <span className={`traffic-hub-status ${live ? "is-live" : "is-draft"}`}>
                    {live ? "Live" : "Draft"}
                  </span>
                  <span className="traffic-hub-pin-count">
                    {pinCount > 0 ? `${pinCount} pins ready` : "No pins yet"}
                  </span>
                </div>

                <h2 className="traffic-hub-card-title">{asset.product}</h2>
                <p className="traffic-hub-card-copy">
                  {pinCount > 0
                    ? "Open your pin workspace to download images, copy text, and post to Pinterest."
                    : "Generate 10 ready-to-post Pinterest pins with tracking links to this money page."}
                </p>

                <div className="traffic-hub-card-actions">
                  <Link href={`/traffic/${asset.id}`} className="btn-primary traffic-hub-primary">
                    {pinCount > 0 ? "Open pin workspace" : "Generate traffic"}
                    <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
                  </Link>
                  <Link href={asset.href} className="btn-secondary">
                    Edit money page
                  </Link>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {!loading && assets.length > 0 ? (
        <GlassPanel className="traffic-hub-footer">
          <div>
            <p className="results-panel-eyebrow">
              <Rocket size={14} strokeWidth={1.75} aria-hidden />
              Need another page?
            </p>
            <p className="text-sm text-ink-3">Activate a new product to generate another sales page first.</p>
          </div>
          <Link href="/activate" className="btn-secondary">
            Activate asset
          </Link>
        </GlassPanel>
      ) : null}
    </WorkflowPage>
  );
}
