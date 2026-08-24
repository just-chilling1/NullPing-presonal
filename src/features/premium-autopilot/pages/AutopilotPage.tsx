"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LiveAssetPicker, type LiveAssetSummary } from "@/components/premium/LiveAssetPicker";
import { SourceCard } from "@/features/premium-autopilot/components/SourceCard";
import { SourceInstructionsOverlay } from "@/features/premium-autopilot/components/SourceInstructionsOverlay";
import {
  NICHES,
  filterSourcesByNiche,
  resolveAutopilotNiche,
  SOURCES,
  autopilotTrackingUrl,
} from "@/features/premium-autopilot/lib/traffic-sources";
import {
  fetchAutopilotState,
  fetchLatestLivePage,
  migrateLegacyCompletions,
  saveAutopilotSettings,
  setAutopilotCompletion,
} from "@/features/premium-autopilot/lib/autopilot-client";

const PAGE_SIZE = 24;
const LINK_PLACEHOLDER = "[YOUR_MONEY_PAGE_URL]";
const SITE_STORAGE_KEY = `${brand.storagePrefix}_autopilot_site`;

function renderSourceCopy(template: string, pageUrl: string) {
  return template.replaceAll("{LINK}", pageUrl || LINK_PLACEHOLDER);
}

export default function AutomatedProfitsPage() {
  const searchParams = useSearchParams();
  const preferredId = searchParams.get("siteId");

  const [selectedNiche, setSelectedNiche] = useState("All");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAssetSummary | null>(null);
  const [pageUrl, setPageUrl] = useState("");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedDescId, setCopiedDescId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hydrated, setHydrated] = useState(false);
  const lastSavedUrl = useRef<string | null>(null);
  const lastSavedNiche = useRef<string | null>(null);
  const appliedAssetDefault = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [initialState, latestPage] = await Promise.all([
        fetchAutopilotState(),
        fetchLatestLivePage(),
      ]);
      const state = await migrateLegacyCompletions(initialState);
      if (cancelled) return;

      const savedUrl = state?.promotion_url?.trim() ?? "";
      if (savedUrl) {
        setPageUrl(savedUrl);
        lastSavedUrl.current = savedUrl;
      } else if (latestPage?.promotionUrl) {
        setPageUrl(latestPage.promotionUrl);
        lastSavedUrl.current = latestPage.promotionUrl;
      }

      const savedNiche = resolveAutopilotNiche(state?.selected_niche);
      const hasSavedNiche = savedNiche !== "All";
      const defaultNiche = hasSavedNiche ? savedNiche : (latestPage?.niche ?? "All");
      setSelectedNiche(defaultNiche);
      if (hasSavedNiche) lastSavedNiche.current = savedNiche;

      if (state?.completed_source_ids?.length) {
        setCompleted(new Set(state.completed_source_ids));
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAssetChange = useCallback(
    (assetId: string, asset: LiveAssetSummary | null) => {
      setSelectedSiteId(assetId);
      setSelectedAsset(asset);
      if (asset?.publicUrl) {
        setPageUrl(asset.publicUrl);
        lastSavedUrl.current = null;
      }

      if (!appliedAssetDefault.current && asset?.niche && lastSavedNiche.current == null) {
        const nicheFromAsset = resolveAutopilotNiche(asset.niche);
        if (nicheFromAsset !== "All") {
          setSelectedNiche(nicheFromAsset);
          appliedAssetDefault.current = true;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!hydrated) return;
    const trimmed = pageUrl.trim();
    if (lastSavedUrl.current === trimmed) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const ok = await saveAutopilotSettings({
          promotion_url: trimmed || null,
        });
        if (ok) lastSavedUrl.current = trimmed;
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [pageUrl, hydrated]);

  const handleNicheChange = useCallback(
    async (niche: string) => {
      if (niche === selectedNiche) return;
      setSelectedNiche(niche);
      setVisibleCount(PAGE_SIZE);
      setExpandedId(null);
      if (!hydrated) return;
      if (lastSavedNiche.current === niche) return;
      const ok = await saveAutopilotSettings({ selected_niche: niche });
      if (ok) lastSavedNiche.current = niche;
    },
    [selectedNiche, hydrated]
  );

  const toggleCompleted = useCallback(
    async (id: string) => {
      const wasDone = completed.has(id);
      const nextDone = !wasDone;

      setCompleted((prev) => {
        const next = new Set(prev);
        if (nextDone) next.add(id);
        else next.delete(id);
        return next;
      });

      if (!hydrated) return;

      const ok = await setAutopilotCompletion(id, nextDone);
      if (!ok) {
        setCompleted((prev) => {
          const rollback = new Set(prev);
          if (wasDone) rollback.add(id);
          else rollback.delete(id);
          return rollback;
        });
      }
    },
    [completed, hydrated]
  );

  const filteredSources = useMemo(
    () => filterSourcesByNiche(selectedNiche),
    [selectedNiche]
  );

  const visibleSources = useMemo(
    () => filteredSources.slice(0, visibleCount),
    [filteredSources, visibleCount]
  );

  const completedCount = useMemo(
    () => filteredSources.filter((s) => completed.has(s.id)).length,
    [filteredSources, completed]
  );

  const progressPercent =
    filteredSources.length > 0
      ? Math.round((completedCount / filteredSources.length) * 100)
      : 0;

  const hasMore = visibleCount < filteredSources.length;
  const selectedSource = SOURCES.find((source) => source.id === expandedId) ?? null;

  const copyDescription = async (id: string) => {
    const source = SOURCES.find((s) => s.id === id);
    if (!source) return;
    const url = autopilotTrackingUrl(pageUrl, id) || pageUrl || LINK_PLACEHOLDER;
    const body = renderSourceCopy(source.description, url);
    try {
      await navigator.clipboard.writeText(body);
      setCopiedDescId(id);
      window.setTimeout(() => setCopiedDescId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <PremiumWorkflowShell
      title="Automated Profits"
      subtitle="180 practical traffic sources across 9 niches — choose the market your money page was built for and share it where it is genuinely useful."
      training={{
        vimeoId: "1215530104",
        title: "How to Use Automated Profits",
        description:
          "Pick a live money page, filter by niche, follow each source’s steps, and copy the ready-made description with your tracking link.",
        iframeTitle: "Automated Profits training video",
      }}
      tip={
        <>
          Tip: Start with a few sources where you can genuinely help the audience. Read each
          community&apos;s rules first, and only share your money page when it directly supports
          your answer. Visits show up in Results.
        </>
      }
    >
      <PremiumStepsSection
        title="How This Works (Super Simple!)"
        steps={[
          {
            num: "1",
            title: "Pick Your Niche",
            desc: "Choose the niche your money page was built for and get 20 practical traffic sources tailored to that market.",
          },
          {
            num: "2",
            title: "Share Your Money Page",
            desc: "Follow the platform rules and use the step-by-step guidance to share your page where it directly helps the conversation.",
          },
          {
            num: "3",
            title: "Build Consistent Visibility",
            desc: "Return to the sources that work for you, contribute useful answers, mark them complete, and check Results for visits.",
          },
        ]}
      />

      <GlassPanel className="space-y-5 p-5 sm:p-6">
        <LiveAssetPicker
          value={selectedSiteId}
          preferredId={preferredId}
          storageKey={SITE_STORAGE_KEY}
          onChange={handleAssetChange}
          label="Live money page"
        />

        {selectedAsset ? (
          <div className="rounded-xl border border-[var(--np-line)] bg-[var(--np-surface-field)] px-4 py-3">
            <p className="text-sm font-medium text-text-primary">{selectedAsset.productName}</p>
            <p className="truncate text-xs text-text-muted">{pageUrl || selectedAsset.publicUrl}</p>
            <p className="mt-1 text-xs text-text-muted">
              We insert this URL into every submission description below. Progress syncs to your
              account.
            </p>
          </div>
        ) : pageUrl ? (
          <p className="text-xs text-text-muted">
            Promoting: <span className="break-all text-text-secondary">{pageUrl}</span>
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            Select a live money page so we can insert the tracking link into each source
            description.
          </p>
        )}
      </GlassPanel>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by niche">
        {NICHES.map((niche) => (
          <button
            key={niche}
            type="button"
            onClick={() => void handleNicheChange(niche)}
            className={clsx("select-chip-pill", selectedNiche === niche && "is-selected")}
          >
            {niche}
          </button>
        ))}
      </div>

      <GlassPanel className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-text-primary">Your Progress</h3>
            <p className="text-sm text-text-secondary">
              {completedCount} of {filteredSources.length} sources completed
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-medium text-pulse-700">{progressPercent}%</span>
            <p className="text-xs text-text-muted">Complete</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-grad-pulse"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Lightbulb size={12} className="text-pulse-700" />
          Progress is counted for the niche filter you have selected.
        </p>
      </GlassPanel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {visibleSources.map((source, idx) => (
          <SourceCard
            key={source.id}
            source={source}
            isDone={completed.has(source.id)}
            index={idx}
            onView={() => setExpandedId(source.id)}
            onToggleComplete={() => void toggleCompleted(source.id)}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredSources.length))
            }
            className="btn-secondary px-6 py-3 text-sm"
          >
            Show more sources ({filteredSources.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}

      <SourceInstructionsOverlay
        source={selectedSource}
        isDone={selectedSource ? completed.has(selectedSource.id) : false}
        copied={selectedSource != null && copiedDescId === selectedSource.id}
        onClose={() => setExpandedId(null)}
        onToggleComplete={() => {
          if (selectedSource && !completed.has(selectedSource.id)) {
            void toggleCompleted(selectedSource.id);
          }
        }}
        onCopyDescription={() => {
          if (selectedSource) void copyDescription(selectedSource.id);
        }}
        renderCopy={(template) =>
          renderSourceCopy(
            template,
            selectedSource
              ? autopilotTrackingUrl(pageUrl, selectedSource.id) || pageUrl
              : pageUrl
          )
        }
      />
    </PremiumWorkflowShell>
  );
}
