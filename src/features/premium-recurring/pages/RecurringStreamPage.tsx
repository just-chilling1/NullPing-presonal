"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  Copy,
  Check,
  Loader2,
  Eye,
  Filter,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Pencil,
  Activity,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { cachedClientFetch } from "@/lib/client-fetch-cache";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { LiveAssetPicker, type LiveAssetSummary } from "@/components/premium/LiveAssetPicker";
import { GenerationProgress, GENERATION_RESULTS_ID } from "@/components/ui/generation-progress";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getPremiumFeatureThumbnail } from "@/lib/video-thumbnails";
import { PREMIUM_NICHE_FILTER_LABELS } from "@/lib/premium-niches";
import { CrossPlatformGuide } from "@/features/premium-recurring/components/CrossPlatformGuide";
import { wrapArticleWithTitle } from "@/features/blog-builder/lib/authority-article-content";

interface ArticleRow {
  id: number;
  niche: string;
  title: string;
  excerpt: string | null;
  angle: string | null;
}

const PAGE_SIZE = 24;
const SITE_STORAGE_KEY = `${brand.storagePrefix}_recurring_stream_site`;

function formatAngle(angle: string | null): string {
  if (!angle) return "Guide";
  return angle
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export default function RecurringStreamPage() {
  const searchParams = useSearchParams();
  const preferredId = searchParams.get("siteId");

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [seededCount, setSeededCount] = useState(0);
  const [niche, setNiche] = useState("All");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAssetSummary | null>(null);
  const [savedTemplateIds, setSavedTemplateIds] = useState<Set<number>>(new Set());
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [articleHtml, setArticleHtml] = useState<Record<number, string>>({});
  const [loadingAction, setLoadingAction] = useState<{
    articleId: number;
    action: "view" | "copy" | "save";
  } | null>(null);
  const [copiedMode, setCopiedMode] = useState<"text" | "html" | null>(null);
  const [copiedArticleId, setCopiedArticleId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [lastAttachedId, setLastAttachedId] = useState<number | null>(null);

  const loadArticles = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setRefreshing(true);
      setError("");
      try {
        const q = niche === "All" ? "" : `?niche=${encodeURIComponent(niche)}`;
        const data = await cachedClientFetch<{
          articles?: ArticleRow[];
          seededCount?: number;
          error?: string;
        }>(`/api/premium/recurring-stream/articles${q}`);
        setArticles(data.articles ?? []);
        setSeededCount(data.seededCount ?? 0);
        setPage(0);
        setPreviewId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [niche]
  );

  const loadSavedForOffer = useCallback(async (siteId: string) => {
    if (!siteId) {
      setSavedTemplateIds(new Set());
      setArticleHtml({});
      return;
    }

    try {
      const res = await fetch(
        `/api/premium/recurring-stream/articles?saved=1&siteId=${encodeURIComponent(siteId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) return;

      const saved = Array.isArray(data.saved) ? data.saved : [];
      const ids = new Set<number>(
        saved.map((row: { template_id: number }) => row.template_id).filter(Boolean)
      );
      setSavedTemplateIds(ids);

      const htmlMap: Record<number, string> = {};
      for (const row of saved) {
        if (row.template_id && row.html) htmlMap[row.template_id] = row.html;
      }
      setArticleHtml((prev) => ({ ...prev, ...htmlMap }));
    } catch {
      setSavedTemplateIds(new Set());
    }
  }, []);

  useEffect(() => {
    void loadArticles(true);
  }, [loadArticles]);

  const handleAssetChange = useCallback(
    (assetId: string, asset: LiveAssetSummary | null) => {
      setSelectedSiteId(assetId);
      setSelectedAsset(asset);
      setPreviewId(null);
      setLastAttachedId(null);
      void loadSavedForOffer(assetId);
    },
    [loadSavedForOffer]
  );

  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const paged = useMemo(
    () => articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [articles, page]
  );

  const previewArticle = previewId != null ? articles.find((a) => a.id === previewId) : null;

  const loadArticlePreview = async (
    articleId: number,
    action: "view" | "copy"
  ): Promise<string | null> => {
    if (!selectedSiteId) {
      setError("Select a money page before continuing.");
      return null;
    }
    if (articleHtml[articleId]) {
      setError("");
      return articleHtml[articleId];
    }

    setLoadingAction({ articleId, action });
    setError("");
    try {
      const params = new URLSearchParams({
        articleId: String(articleId),
        siteId: selectedSiteId,
      });
      const res = await fetch(`/api/premium/recurring-stream/articles?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preview");
      setArticleHtml((prev) => ({ ...prev, [articleId]: data.html }));
      return data.html as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  const attachToMoneyPage = async (articleId: number): Promise<boolean> => {
    if (!selectedSiteId) {
      setError("Select a money page before continuing.");
      return false;
    }

    setLoadingAction({ articleId, action: "save" });
    setError("");
    try {
      const res = await fetch("/api/premium/recurring-stream/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          siteId: selectedSiteId,
          attachToMoneyPage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add section");

      setArticleHtml((prev) => ({ ...prev, [articleId]: data.html }));
      setSavedTemplateIds((prev) => new Set([...prev, articleId]));
      setLastAttachedId(articleId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add section");
      return false;
    } finally {
      setLoadingAction(null);
    }
  };

  const openPreview = async (articleId: number) => {
    if (previewId === articleId) {
      setPreviewId(null);
      return;
    }
    const html = await loadArticlePreview(articleId, "view");
    if (html) setPreviewId(articleId);
  };

  const copyArticleFromCard = async (articleId: number) => {
    const html = await loadArticlePreview(articleId, "copy");
    const article = articles.find((a) => a.id === articleId);
    if (!html || !article) return;

    const exportHtml = wrapArticleWithTitle(article.title, html);
    const payload = `${article.title}\n\n${htmlToPlainText(exportHtml)}`;
    await navigator.clipboard.writeText(payload);
    setCopiedArticleId(articleId);
    setTimeout(() => setCopiedArticleId(null), 2000);
  };

  const copyArticle = async (mode: "text" | "html") => {
    if (previewId == null) return;
    const html = articleHtml[previewId];
    const article = articles.find((a) => a.id === previewId);
    if (!html || !article) return;

    const exportHtml = wrapArticleWithTitle(article.title, html);
    const payload =
      mode === "html" ? exportHtml : `${article.title}\n\n${htmlToPlainText(exportHtml)}`;

    await navigator.clipboard.writeText(payload);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 2000);
  };

  if (initialLoading && articles.length === 0) {
    return (
      <PremiumWorkflowShell
        title="Guaranteed High-Ticket Payouts"
        subtitle="Long-form authority sections that strengthen your money page — CTAs point at /m/{slug}."
      >
        <PageSkeleton cards={2} />
      </PremiumWorkflowShell>
    );
  }

  return (
    <PremiumWorkflowShell
      title="Guaranteed High-Ticket Payouts"
      subtitle={`${seededCount || 100} authority articles — add a section to your money page, or copy for external posts with tracking links.`}
      training={{
        vimeoId: "",
        title: "Guaranteed High-Ticket Payouts Training",
        description:
          "Pick a live money page, preview an authority article with your tracking link, then add it as a section on the money page.",
        iframeTitle: "Guaranteed High-Ticket Payouts training video",
        thumbnailSrc: getPremiumFeatureThumbnail("premium-recurring"),
      }}
      tip={
        <>
          Tip: Primary action is <span className="text-text-primary">Add to money page</span>. Copy
          for Medium/LinkedIn is secondary — always keep the tracking URL.
        </>
      }
    >
      <PremiumStepsSection
        steps={[
          {
            num: "1",
            title: "Select a live money page",
            desc: "Pick any published money page — your /m tracking URL gets woven into every article CTA automatically.",
          },
          {
            num: "2",
            title: "Browse & preview guides",
            desc: "Filter 100+ authority articles by niche and preview any guide with your tracking link before you commit.",
          },
          {
            num: "3",
            title: "Add to page or copy",
            desc: "Add the article as a section on your money page (primary), or copy plain text/HTML for Medium, LinkedIn, or your blog.",
          },
        ]}
      />

      <GlassPanel className="overflow-hidden p-0">
        <div className="relative overflow-hidden border-b border-[var(--np-line)] p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--np-pulse-500)_12%,transparent)_0%,transparent_42%,color-mix(in_srgb,#A855F7_10%,transparent)_100%)]"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-[color-mix(in_srgb,var(--np-signal-100)_80%,var(--np-surface))] text-pulse-500 shadow-[0_0_20px_-6px_rgba(0,240,255,0.45)]">
              <Repeat size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-text-heading">Strengthen your money page</p>
              <p className="mt-0.5 text-sm text-text-secondary">
                Pick a live page, preview a guide, then add it as an authority section — CTAs track
                with ?src=article.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6 md:p-8">
          <LiveAssetPicker
            value={selectedSiteId}
            preferredId={preferredId}
            storageKey={SITE_STORAGE_KEY}
            onChange={handleAssetChange}
            label="Live money page"
          />

          {!selectedSiteId ? (
            <p className="rounded-xl border border-dashed border-[var(--np-line-strong)] bg-[var(--np-surface-field)] px-4 py-3 text-sm text-text-muted">
              Select a live money page above to preview articles and unlock Add / Copy.
            </p>
          ) : null}

          {selectedAsset ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/money-page/${selectedAsset.id}`}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Pencil size={14} />
                Edit money page
              </Link>
              <Link href="/results" className="btn-secondary inline-flex items-center gap-2 text-sm">
                <Activity size={14} />
                Results
              </Link>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              <Filter size={13} aria-hidden />
              Niche
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[var(--np-danger)]/25 bg-[var(--np-danger)]/10 px-3.5 py-2.5 text-sm font-medium text-[var(--np-danger)]"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
      </GlassPanel>

      <CrossPlatformGuide />

      <GenerationProgress
        active={loadingAction !== null}
        label={
          loadingAction?.action === "save"
            ? "Adding authority section to your money page..."
            : "Loading article preview..."
        }
      />

      <AnimatePresence>
        {previewArticle && articleHtml[previewArticle.id] ? (
          <motion.section
            id={GENERATION_RESULTS_ID}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card scroll-mt-24 overflow-hidden border-[var(--np-line-pulse)] shadow-[0_0_40px_-18px_rgba(0,240,255,0.45)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--np-line)] bg-[color-mix(in_srgb,var(--np-signal-100)_55%,var(--np-surface))] p-4 md:p-5">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pulse-500">
                  {previewArticle.niche}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-heading">
                  {previewArticle.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--np-line)] bg-[var(--np-surface-field)] px-2.5 py-0.5 text-[12px] text-text-muted">
                    {formatAngle(previewArticle.angle)}
                  </span>
                  {savedTemplateIds.has(previewArticle.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/15 px-2.5 py-0.5 text-[12px] font-medium text-success">
                      <Check size={11} aria-hidden />
                      On money page
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="rounded-lg border border-transparent p-2 text-text-muted transition-colors hover:border-[var(--np-line)] hover:bg-[var(--np-surface-field)] hover:text-text-primary"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>
            <div
              className="recurring-article-body recurring-article-reader max-h-[min(70vh,720px)] max-w-none overflow-y-auto px-5 py-6 md:px-8 md:py-8"
              dangerouslySetInnerHTML={{
                __html: wrapArticleWithTitle(previewArticle.title, articleHtml[previewArticle.id]),
              }}
            />
            <div className="flex flex-wrap gap-2 border-t border-[var(--np-line)] bg-[color-mix(in_srgb,var(--np-surface)_88%,var(--np-signal-100))] p-4 md:p-5">
              {lastAttachedId === previewArticle.id ? (
                <p className="mb-1 w-full rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
                  Section added — publish your money page to make it live.{" "}
                  <Link
                    href={`/money-page/${selectedSiteId}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Review &amp; publish now
                  </Link>
                </p>
              ) : null}
              <button
                type="button"
                disabled={loadingAction?.articleId === previewArticle.id}
                onClick={() => void attachToMoneyPage(previewArticle.id)}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                {loadingAction?.articleId === previewArticle.id &&
                loadingAction.action === "save" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Add to money page
              </button>
              <button
                type="button"
                onClick={() => void copyArticle("text")}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                {copiedMode === "text" ? <Check size={14} /> : <Copy size={14} />}
                {copiedMode === "text" ? "Copied!" : "Copy (plain text)"}
              </button>
              <button
                type="button"
                onClick={() => void copyArticle("html")}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                {copiedMode === "html" ? <Check size={14} /> : <Copy size={14} />}
                {copiedMode === "html" ? "Copied!" : "Copy (HTML)"}
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className={clsx("space-y-4", refreshing && "pointer-events-none opacity-60")}>
        {lastAttachedId ? (
          <p className="rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success shadow-[0_0_24px_-12px_rgba(52,211,153,0.55)]">
            Your authority section is live on your money page — visitors will see it on your next
            publish.
          </p>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-heading">Article library</h2>
            <p className="text-xs text-text-muted">
              {articles.length} guide{articles.length === 1 ? "" : "s"}
              {niche !== "All" ? ` in ${niche}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((article, index) => {
            const isOpen = previewId === article.id;
            const isSaved = savedTemplateIds.has(article.id);
            const isBusy = loadingAction?.articleId === article.id;

            return (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.24) }}
                className={clsx(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-[var(--np-surface)] shadow-[var(--np-shadow-card)] transition-[border-color,box-shadow,transform] duration-200",
                  "hover:-translate-y-1 hover:border-[var(--np-line-pulse)] hover:shadow-[0_0_32px_-14px_rgba(0,240,255,0.4)]",
                  isOpen
                    ? "border-[var(--np-line-pulse)] shadow-[0_0_36px_-12px_rgba(0,240,255,0.55)]"
                    : "border-[var(--np-line)]",
                  isSaved && !isOpen && "border-success/30"
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--np-pulse-500)_14%,transparent),transparent_55%)] opacity-70"
                />
                <div
                  aria-hidden
                  className={clsx(
                    "pointer-events-none absolute inset-y-0 left-0 w-[3px] transition-colors",
                    isOpen
                      ? "bg-[var(--np-pulse-500)]"
                      : isSaved
                        ? "bg-success/70"
                        : "bg-[color-mix(in_srgb,var(--np-pulse-500)_35%,transparent)] group-hover:bg-[var(--np-pulse-500)]"
                  )}
                />

                <div className="relative flex flex-1 flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-[color-mix(in_srgb,var(--np-signal-100)_80%,var(--np-surface))] text-pulse-500 shadow-[0_0_16px_-8px_rgba(0,240,255,0.7)]">
                        <FileText size={16} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-500">
                          {article.niche}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">Authority guide</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--np-line-strong)] bg-[var(--np-surface-field)] px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                      {formatAngle(article.angle)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-text-heading">
                      {article.title}
                    </h3>
                    {article.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-text-secondary">
                        {article.excerpt}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                        <Check size={11} aria-hidden />
                        On money page
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--np-line)] bg-[var(--np-surface-field)] px-2.5 py-1 text-[11px] text-text-muted">
                        Ready to attach
                      </span>
                    )}
                    {isOpen ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--np-line-pulse)] bg-[color-mix(in_srgb,var(--np-signal-100)_70%,transparent)] px-2.5 py-1 text-[11px] font-medium text-pulse-500">
                        Preview open
                      </span>
                    ) : null}
                  </div>

                  {lastAttachedId === article.id ? (
                    <p className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-[12px] leading-relaxed text-success">
                      Section added — publish your money page to make it live.{" "}
                      <Link
                        href={`/money-page/${selectedSiteId}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        Review &amp; publish now
                      </Link>
                    </p>
                  ) : null}

                  <div className="mt-auto space-y-2 border-t border-[var(--np-line)] pt-3">
                    <button
                      type="button"
                      disabled={isBusy || !selectedSiteId}
                      onClick={() => void attachToMoneyPage(article.id)}
                      className="btn-primary inline-flex w-full items-center justify-center gap-2 text-sm disabled:opacity-40"
                    >
                      {isBusy && loadingAction?.action === "save" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isSaved ? (
                        <Check size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isSaved ? "Added — update again" : "Add to money page"}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isBusy || !selectedSiteId}
                        onClick={() => void openPreview(article.id)}
                        className={clsx(
                          "btn-secondary inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-40",
                          isOpen && "border-[var(--np-line-pulse)] text-pulse-500"
                        )}
                      >
                        {isBusy && loadingAction?.action === "view" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Eye size={14} />
                        )}
                        {isOpen ? "Close" : "View"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !selectedSiteId}
                        onClick={() => void copyArticleFromCard(article.id)}
                        className="btn-secondary inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-40"
                      >
                        {copiedArticleId === article.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedArticleId === article.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <span className="text-xs text-text-muted">
              Page {page + 1} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </PremiumWorkflowShell>
  );
}
