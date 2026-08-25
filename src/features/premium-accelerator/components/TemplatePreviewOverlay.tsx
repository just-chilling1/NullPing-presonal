"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Copy, Eye, Image, Loader2, X } from "lucide-react";
import type { PinCopy } from "@/features/traffic/lib/pin-rules";

export interface VaultTemplatePreview {
  catalogId: number;
  niche: string;
  productName: string;
  templateName: string;
  title: string;
  tagline: string | null;
  salesPageHtml: string;
  pins: Array<PinCopy & { imageUrl?: string }>;
}

type PreviewTab = "money-page" | "pins";

interface TemplatePreviewOverlayProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  preview: VaultTemplatePreview | null;
  productName?: string;
  hasAffiliateLink: boolean;
  isCloning: boolean;
  onUseTemplate: () => void;
}

export function TemplatePreviewOverlay({
  open,
  onClose,
  loading,
  error,
  preview,
  productName,
  hasAffiliateLink,
  isCloning,
  onUseTemplate,
}: TemplatePreviewOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<PreviewTab>("money-page");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    setTab("money-page");
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!mounted || !open) return null;

  const title = preview?.productName ?? productName ?? "Template preview";
  const pinCount = preview?.pins.length ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex h-[min(94dvh,56rem)] w-full max-w-5xl flex-col overflow-hidden border border-[var(--np-line-strong)] bg-[var(--np-surface)] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accelerator-preview-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--np-line)] bg-[var(--np-surface-sub)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <div className="min-w-0">
            {preview?.niche ? (
              <p className="text-[13px] font-medium uppercase tracking-wider text-pulse-700">
                {preview.niche}
              </p>
            ) : null}
            <h2
              id="accelerator-preview-title"
              className="truncate text-sm font-medium text-text-heading sm:text-base"
            >
              {title}
            </h2>
            {preview?.templateName ? (
              <p className="mt-0.5 truncate text-xs text-text-muted">{preview.templateName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-pulse-100/10 hover:text-text-heading active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-[var(--np-line)] bg-[var(--np-surface-sub)]/80 px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => setTab("money-page")}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "money-page"
                ? "border border-[var(--np-line-pulse)] bg-[var(--np-surface-tint)] text-text-primary"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Eye size={14} />
            Money page
          </button>
          <button
            type="button"
            onClick={() => setTab("pins")}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "pins"
                ? "border border-[var(--np-line-pulse)] bg-[var(--np-surface-tint)] text-text-primary"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Image size={14} />
            Pinterest pins
            {pinCount > 0 ? (
              <span className="rounded-full border border-[var(--np-line-pulse)] bg-pulse-100/10 px-2 py-0.5 text-[13px] font-medium text-pulse-700">
                {pinCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--np-surface-field)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-text-muted">
              <Loader2 size={28} className="animate-spin text-pulse-700" />
              <p className="text-sm">Loading money page preview…</p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="m-4 rounded-lg border border-[var(--np-danger)]/20 bg-[var(--np-danger)]/10 px-4 py-3 text-[15px] text-[var(--np-danger)]">
              {error}
            </div>
          ) : null}

          {!loading && !error && preview && tab === "money-page" ? (
            <div className="preview-frame m-0 rounded-none border-0">
              <iframe
                title="Money page preview"
                className="h-[min(70dvh,40rem)] min-h-[420px] w-full bg-white"
                sandbox="allow-same-origin"
                srcDoc={preview.salesPageHtml}
              />
            </div>
          ) : null}

          {!loading && !error && preview && tab === "pins" ? (
            <div className="space-y-4 p-4 sm:p-5">
              <p className="text-xs text-text-muted">
                Each template includes 10 Pinterest pins with unique images. Install to save them to
                Traffic ready to download and post.
              </p>
              {preview.pins.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {preview.pins.map((pin, i) => (
                    <li
                      key={i}
                      className="overflow-hidden rounded-xl border border-[var(--np-line)] bg-[var(--np-surface)]"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--np-surface-field)]">
                        {pin.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pin.imageUrl}
                            alt={pin.headline}
                            className="h-full w-full object-cover"
                            loading={i < 2 ? "eager" : "lazy"}
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-text-muted">
                            Image {i + 1}
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                          Pin {i + 1}
                        </span>
                      </div>
                      <div className="space-y-2 p-4">
                        <h3 className="text-sm font-semibold leading-snug text-text-primary">
                          {pin.headline}
                        </h3>
                        <p className="text-xs leading-relaxed text-text-muted line-clamp-3">
                          {pin.description}
                        </p>
                        {pin.keywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {pin.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="rounded-md border border-[var(--np-line)] px-2 py-0.5 text-[11px] text-text-muted"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-[var(--np-line)] bg-[var(--np-surface)] px-4 py-8 text-center text-sm text-text-muted">
                  No pin drafts for this page yet.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--np-line)] bg-[var(--np-surface-sub)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <p className="text-xs text-text-muted">
            {hasAffiliateLink
              ? "Money page CTAs use your applied affiliate link. 10 pins with images are included on install."
              : "Apply your affiliate link above to wire the money page CTA."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
              Close
            </button>
            <button
              type="button"
              disabled={!preview || !hasAffiliateLink || isCloning}
              onClick={onUseTemplate}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40"
            >
              {isCloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              Use this page
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
