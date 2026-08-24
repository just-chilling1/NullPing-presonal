"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Rocket } from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { GenerationProgress, GENERATION_RESULTS_ID } from "@/components/ui/generation-progress";
import { AffiliateLinkField } from "@/components/premium/AffiliateLinkField";
import { PremiumErrorAlert } from "@/components/premium/PremiumErrorAlert";
import { PremiumPageLayout } from "@/components/premium/PremiumPageLayout";
import { PremiumControlCard } from "@/components/premium/PremiumControlCard";
import { PremiumFooter } from "@/components/premium/PremiumFooter";
import { PremiumVideoTutorial } from "@/components/premium/PremiumVideoTutorial";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { PREMIUM_NICHE_FILTER_LABELS } from "@/lib/premium-niches";
import {
  TemplatePreviewOverlay,
  type VaultTemplatePreview,
} from "@/features/premium-accelerator/components/TemplatePreviewOverlay";
import {
  VaultTemplateCard,
  type VaultTemplateRow,
} from "@/features/premium-accelerator/components/VaultTemplateCard";

const PAGE_SIZE = 24;
const AFFILIATE_STORAGE_KEY = `${brand.storagePrefix}_accelerator_affiliate`;
const SEED_POLL_MS = 15_000;

export default function AcceleratorPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<VaultTemplateRow[]>([]);
  const [seededCount, setSeededCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [total, setTotal] = useState(200);
  const [niche, setNiche] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [affiliateLink, setAffiliateLink] = useState("");
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regeneratedId, setRegeneratedId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCatalogId, setPreviewCatalogId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<VaultTemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [cloneResult, setCloneResult] = useState<{
    catalogId: number;
    siteUrl: string;
    assetId: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AFFILIATE_STORAGE_KEY);
      if (saved) setAffiliateLink(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (affiliateLink.trim()) {
        localStorage.setItem(AFFILIATE_STORAGE_KEY, affiliateLink.trim());
      }
    } catch {
      /* ignore */
    }
  }, [affiliateLink]);

  const loadTemplates = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const res = await fetch("/api/premium/accelerator/templates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(data.templates ?? []);
      setTotal(data.total ?? 200);
      setSeededCount(
        data.seededCount ??
          (data.templates as VaultTemplateRow[] | undefined)?.filter((t) => t.seeded).length ??
          data.total ??
          0
      );
      setReady(data.ready ?? true);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => void loadTemplates({ silent: true }), SEED_POLL_MS);
    return () => window.clearInterval(timer);
  }, [ready, loadTemplates]);

  const filtered = useMemo(() => {
    const list = templates.filter((t) => niche === "All" || t.niche === niche);
    return [...list].sort((a, b) => {
      const aUsed = Boolean(a.used || cloneResult?.catalogId === a.id);
      const bUsed = Boolean(b.used || cloneResult?.catalogId === b.id);
      if (aUsed !== bUsed) return aUsed ? -1 : 1;
      if (aUsed && bUsed && cloneResult) {
        if (a.id === cloneResult.catalogId) return -1;
        if (b.id === cloneResult.catalogId) return 1;
      }
      return a.id - b.id;
    });
  }, [templates, niche, cloneResult]);

  const visibleTemplates = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [niche]);

  const hasAffiliateLink = affiliateLink.trim().length > 0;
  const hasMore = visibleCount < filtered.length;

  const handleRegeneratePins = useCallback(async (catalogId: number, assetId: string) => {
    setRegeneratingId(catalogId);
    setRegeneratedId(null);
    setError("");
    try {
      const res = await fetch("/api/pins/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: assetId, regenerate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate pins");
      setRegeneratedId(catalogId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate pins");
    } finally {
      setRegeneratingId(null);
    }
  }, []);

  const handleClone = useCallback(
    async (catalogId: number) => {
      if (!affiliateLink.trim()) {
        setError("Enter your affiliate link first.");
        return;
      }
      setCloningId(catalogId);
      setError("");
      setCloneResult(null);
      try {
        const res = await fetch("/api/premium/accelerator/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogId, affiliateUrl: affiliateLink.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Install failed");
        const assetId = (data.assetId as string) || (data.site?.id as string);
        const siteUrl = data.siteUrl as string;
        setCloneResult({ catalogId, siteUrl, assetId });
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === catalogId
              ? {
                  ...t,
                  used: true,
                  usedAssetId: assetId,
                  usedSiteUrl: siteUrl,
                  usedAt: new Date().toISOString(),
                }
              : t
          )
        );
        setPreviewOpen(false);
        setPreviewCatalogId(null);
        setPreviewData(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Install failed");
      } finally {
        setCloningId(null);
      }
    },
    [affiliateLink]
  );

  const handleView = useCallback(
    async (catalogId: number) => {
      setPreviewCatalogId(catalogId);
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewError("");
      setPreviewData(null);
      setViewingId(catalogId);

      try {
        const params = new URLSearchParams({ catalogId: String(catalogId) });
        const link = affiliateLink.trim();
        if (link) params.set("affiliateUrl", link);

        const res = await fetch(`/api/premium/accelerator/preview?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load preview");
        setPreviewData(data as VaultTemplatePreview);
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : "Failed to load preview");
      } finally {
        setPreviewLoading(false);
        setViewingId(null);
      }
    },
    [affiliateLink]
  );

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewCatalogId(null);
    setPreviewData(null);
    setPreviewError("");
    setPreviewLoading(false);
    setViewingId(null);
  }, []);

  const previewTemplate =
    previewCatalogId != null ? templates.find((t) => t.id === previewCatalogId) : undefined;

  if (loading && templates.length === 0) {
    return (
      <PremiumPageLayout
        title="Unlimited"
        subtitle="200 pre-made money pages — apply your link, install a page, and get 10 pins ready."
        animate={false}
      >
        <PageSkeleton cards={6} />
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout
      title="Unlimited"
      subtitle={`${seededCount} of ${total} pre-made money pages across every niche — apply your link, install a page with 10 pins included.`}
      footer={
        <PremiumFooter>
          Powered by {brand.productName}. Unlimited pages are seeded once — members always install stored copies.
        </PremiumFooter>
      }
    >
      <PremiumVideoTutorial
        vimeoId="1215530104"
        title="Unlimited Training"
        description="Browse ready-made money pages, apply your affiliate link, install one page, and get 10 Pinterest pins ready to post."
        iframeTitle="Unlimited training video"
      />

      <PremiumStepsSection
        steps={[
          {
            num: "1",
            title: "Pick a template",
            desc: "Browse 200 pre-made money pages across every niche and preview any one before you commit.",
          },
          {
            num: "2",
            title: "Install with your link",
            desc: "Paste your affiliate link and the money page plus 10 Pinterest pins become yours instantly.",
          },
          {
            num: "3",
            title: "Post your pins",
            desc: "Open Traffic for your installed page, download the pins, and start sending visitors to your live money page.",
          },
        ]}
      />

      <PremiumControlCard
        icon={Rocket}
        title="200 Money Pages + 10 Pins"
        description="Each template includes a ready-made money page — install instantly with your affiliate link and get 10 Pinterest pins."
        badge={
          !ready ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--np-line-pulse)] bg-pulse-100/10 px-3 py-1 text-[13px] font-medium text-pulse-700">
              {refreshing && <Loader2 size={12} className="animate-spin" />}
              Seeding in progress ({seededCount}/{total})
            </span>
          ) : undefined
        }
      >
        <AffiliateLinkField
          value={affiliateLink}
          onChange={setAffiliateLink}
          inputId="accelerator-affiliate-link"
          manualLabel="Your affiliate link"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          {PREMIUM_NICHE_FILTER_LABELS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(n)}
              className={clsx("select-chip-pill", niche === n && "is-selected")}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          Showing {visibleTemplates.length} of {filtered.length} page
          {filtered.length !== 1 ? "s" : ""}
          {filtered.length !== templates.length ? ` (${templates.length} total)` : ""}
        </p>

        {error ? <PremiumErrorAlert message={error} /> : null}
      </PremiumControlCard>

      <GenerationProgress
        active={cloningId !== null}
        label="Installing money page with your affiliate link and 10 pins..."
      />

      <div id={GENERATION_RESULTS_ID} className="scroll-mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTemplates.map((t) => (
          <VaultTemplateCard
            key={t.id}
            template={
              cloneResult?.catalogId === t.id
                ? {
                    ...t,
                    used: true,
                    usedAssetId: cloneResult.assetId,
                    usedSiteUrl: cloneResult.siteUrl,
                  }
                : t
            }
            cloningId={cloningId}
            viewingId={viewingId}
            regeneratingId={regeneratingId}
            regeneratedId={regeneratedId}
            clonedSiteUrl={cloneResult?.catalogId === t.id ? cloneResult.siteUrl : null}
            clonedAssetId={cloneResult?.catalogId === t.id ? cloneResult.assetId : null}
            hasAffiliateLink={hasAffiliateLink}
            onView={handleView}
            onClone={handleClone}
            onRegenerate={(catalogId, assetId) => void handleRegeneratePins(catalogId, assetId)}
          />
        ))}
      </div>

      {filtered.length === 0 && !loading ? (
        <p className="text-center text-sm text-text-muted">No pages match this filter.</p>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="btn-secondary px-6 py-2 text-sm"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-4 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : null}

      <TemplatePreviewOverlay
        open={previewOpen}
        onClose={closePreview}
        loading={previewLoading}
        error={previewError}
        preview={previewData}
        productName={previewTemplate?.productName}
        hasAffiliateLink={hasAffiliateLink}
        isCloning={cloningId === previewCatalogId}
        onUseTemplate={() => {
          if (previewCatalogId != null) void handleClone(previewCatalogId);
        }}
      />
    </PremiumPageLayout>
  );
}
