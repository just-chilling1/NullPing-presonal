"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Facebook,
  FileText,
  Globe,
  Loader2,
  Pin,
  RefreshCw,
  X,
} from "lucide-react";
import { GENERATION_RESULTS_ID } from "@/components/ui/generation-progress";
import { FacebookPostCard } from "@/features/blog-builder/components/FacebookPostCard";
import { wrapArticleWithTitle } from "@/features/blog-builder/lib/authority-article-content";
import type { SavedFacebookPost } from "@/features/blog-builder/lib/facebook-posts-vault";
import { copyPinImageToClipboard, PinCard } from "@/features/traffic/components/PinCard";
import { resolvePublicUrl } from "@/lib/public-url";

export interface DfySalesResult {
  siteId: string;
  offerUrl: string;
  offerPath?: string;
  templateName: string;
  templateId: string;
  productName: string;
}

export interface DfyPinResult {
  id: string;
  headline: string;
  title: string;
  description: string;
  keywords: string[];
  image_url: string | null;
}

export interface DfyArticleResult {
  id: string;
  title: string;
  excerpt: string;
  html: string;
}

interface DfyResultPanelProps {
  sales: DfySalesResult | null;
  pins: DfyPinResult[];
  pinsError: string;
  isGeneratingPins: boolean;
  retryingPins: boolean;
  onRetryPins: () => void;
  article: DfyArticleResult | null;
  articleError: string;
  isGeneratingArticle: boolean;
  retryingArticle: boolean;
  onRetryArticle: () => void;
  facebookPosts: SavedFacebookPost[];
  postsError: string;
  isGeneratingPosts: boolean;
  retryingPosts: boolean;
  onRetryPosts: () => void;
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

function countArticleWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

export function DfyResultPanel({
  sales,
  pins,
  pinsError,
  isGeneratingPins,
  retryingPins,
  onRetryPins,
  article,
  articleError,
  isGeneratingArticle,
  retryingArticle,
  onRetryArticle,
  facebookPosts,
  postsError,
  isGeneratingPosts,
  retryingPosts,
  onRetryPosts,
}: DfyResultPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showArticlePreview, setShowArticlePreview] = useState(false);

  const liveOfferUrl = useMemo(() => {
    if (!sales) return "";
    if (sales.offerPath) return resolvePublicUrl(sales.offerPath);
    return resolvePublicUrl(sales.offerUrl);
  }, [sales]);

  const copyText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const copyPinImage = useCallback(async (id: string, imageUrl: string) => {
    const result = await copyPinImageToClipboard(imageUrl);
    if (result === "failed") return;
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const hasAnything =
    Boolean(sales) ||
    pins.length > 0 ||
    Boolean(pinsError) ||
    isGeneratingPins ||
    Boolean(article) ||
    Boolean(articleError) ||
    isGeneratingArticle ||
    facebookPosts.length > 0 ||
    Boolean(postsError) ||
    isGeneratingPosts;

  if (!hasAnything) return null;

  return (
    <section id={GENERATION_RESULTS_ID} className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-medium text-text-primary">Your Done-For-You Profit kit</h2>

      {sales ? (
        <article className="glass-card space-y-3 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pulse-100 text-pulse-700">
              <Globe size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">Sales page</p>
              <p className="text-xs text-text-muted">
                Template: {sales.templateName} · {sales.productName}
              </p>
              <p className="mt-2 truncate text-sm text-text-secondary">{liveOfferUrl}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={liveOfferUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              Open live page
            </a>
            <button
              type="button"
              onClick={() => void copyText("offer-url", liveOfferUrl)}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              {copiedId === "offer-url" ? <Check size={14} /> : <Copy size={14} />}
              {copiedId === "offer-url" ? "Copied" : "Copy URL"}
            </button>
          </div>
        </article>
      ) : null}

      <article className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pulse-100 text-pulse-700">
              <Pin size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">Pinterest pins</p>
              <p className="mt-1 text-sm text-text-secondary">
                {pins.length > 0
                  ? `${pins.length} ready-to-post pins with images, copy, keywords, and your live destination URL.`
                  : pinsError ||
                    (isGeneratingPins
                      ? "Generating 3 Pinterest pins with images…"
                      : "Your pins will appear here after the sales page is ready.")}
              </p>
            </div>
          </div>
        </div>

        {isGeneratingPins && pins.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            Building 3 pin images and headlines…
          </p>
        ) : null}

        {pinsError && pins.length === 0 ? (
          <button
            type="button"
            disabled={retryingPins}
            onClick={onRetryPins}
            className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {retryingPins ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Retry pins
          </button>
        ) : null}

        {pins.length > 0 ? (
          <div className="pin-card-grid">
            {pins.map((pin, index) => (
              <PinCard
                key={pin.id}
                pin={pin}
                index={index}
                destinationUrl={liveOfferUrl}
                copiedId={copiedId}
                onCopyText={(id, text) => void copyText(id, text)}
                onCopyImage={(id, url) => void copyPinImage(id, url)}
              />
            ))}
          </div>
        ) : null}
      </article>

      <article className="glass-card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pulse-100 text-pulse-700">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Authority article</p>
            <p className="mt-1 text-sm text-text-secondary">
              {article
                ? "Copy HTML for a site editor, or plain text for Medium and LinkedIn. Saved to your offer library."
                : articleError ||
                  (isGeneratingArticle
                    ? "Writing your authority article…"
                    : "Your article will appear here after pins are ready.")}
            </p>
          </div>
        </div>

        {isGeneratingArticle && !article ? (
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            Writing a long-form authority article…
          </p>
        ) : null}

        {articleError && !article ? (
          <button
            type="button"
            disabled={retryingArticle}
            onClick={onRetryArticle}
            className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {retryingArticle ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Retry article
          </button>
        ) : null}

        {article ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">{article.title}</p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {countArticleWords(article.html).toLocaleString()} words — full niche guide with your
              product featured. Copy HTML for a site editor, plain text for Medium and LinkedIn, or
              read the full article below.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowArticlePreview((open) => !open)}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                {showArticlePreview ? <X size={14} /> : <Eye size={14} />}
                {showArticlePreview ? "Hide article" : "View full article"}
              </button>
              <button
                type="button"
                onClick={() => void copyText("article-html", article.html)}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                {copiedId === "article-html" ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === "article-html" ? "Copied" : "Copy HTML"}
              </button>
              <button
                type="button"
                onClick={() => void copyText("article-text", htmlToPlainText(article.html))}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                {copiedId === "article-text" ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === "article-text" ? "Copied" : "Copy text"}
              </button>
            </div>
            {showArticlePreview ? (
              <div className="overflow-hidden rounded-xl border border-[var(--np-line-pulse)] bg-[var(--np-surface)] shadow-[0_0_40px_-18px_rgba(0,240,255,0.35)]">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--np-line)] bg-[color-mix(in_srgb,var(--np-signal-100)_55%,var(--np-surface))] px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">{article.title}</p>
                  <button
                    type="button"
                    onClick={() => setShowArticlePreview(false)}
                    className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-[var(--np-surface-field)] hover:text-text-primary"
                    aria-label="Close article preview"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div
                  className="recurring-article-body recurring-article-reader max-h-[min(70vh,720px)] max-w-none overflow-y-auto px-5 py-6 md:px-8 md:py-8"
                  dangerouslySetInnerHTML={{
                    __html: wrapArticleWithTitle(article.title, article.html),
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="glass-card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pulse-100 text-pulse-700">
            <Facebook size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Facebook posts</p>
            <p className="mt-1 text-sm text-text-secondary">
              {facebookPosts.length > 0
                ? `${facebookPosts.length} variants promoting your live sales page — copy one and post.`
                : postsError ||
                  (isGeneratingPosts
                    ? "Generating 3 Facebook posts…"
                    : "Your Facebook posts will appear here after the article is ready.")}
            </p>
          </div>
        </div>

        {isGeneratingPosts && facebookPosts.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            Writing 3 Facebook post variants…
          </p>
        ) : null}

        {postsError && facebookPosts.length === 0 ? (
          <button
            type="button"
            disabled={retryingPosts}
            onClick={onRetryPosts}
            className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {retryingPosts ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Retry Facebook posts
          </button>
        ) : null}

        {facebookPosts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {facebookPosts.map((post) => (
              <FacebookPostCard key={post.id} post={post} resolvedText={post.body} />
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}
