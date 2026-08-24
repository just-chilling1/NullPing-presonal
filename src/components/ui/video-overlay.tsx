"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { brand } from "@/config/brand.config";
import { usePromoLinks } from "@/context/PromoLinksContext";
import { toEmbedUrl } from "@/lib/video-thumbnails";

interface VideoOverlayProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export function VideoOverlay({ open, onClose, videoUrl, title }: VideoOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const { settings } = usePromoLinks();
  const embedUrl = toEmbedUrl(videoUrl);

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
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Video player"}
    >
      <button
        type="button"
        aria-label="Close video"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border border-border-dim bg-white shadow-2xl sm:h-[min(92dvh,56rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-dim bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <h2 className="min-w-0 flex-1 truncate pr-2 text-sm font-medium text-text-heading sm:text-base">
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {brand.logo.type === "image" && brand.logo.iconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo.iconSrc}
                alt=""
                aria-hidden
                className="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-9 sm:w-9"
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted cursor-pointer transition-all duration-200 hover:bg-pulse-100 hover:text-text-heading active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              allowFullScreen
              title={title}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20"
              >
                Open video in a new tab
              </a>
            </div>
          )}
        </div>

        {/* Account verified / withdraw ad — Profit Loop pattern */}
        <div
          className="relative shrink-0 overflow-hidden border-t border-emerald-400/15 px-5 py-4 sm:px-6"
          style={{
            backgroundColor: "rgba(7, 12, 10, 0.96)",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="banner-blob-left pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#00a36c]/30 blur-3xl" />
          <div className="banner-blob-right pointer-events-none absolute -bottom-24 -right-14 h-52 w-52 rounded-full bg-[#22d38b]/25 blur-3xl" />
          <div className="ad-emerald-pulse pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00a36c]/[0.12] via-transparent to-[#22d38b]/[0.12]" />
          <div className="ad-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <div className="flex flex-1 items-center gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#00a36c",
                  boxShadow: "0 0 22px rgba(0,163,108,0.45)",
                }}
              >
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#22d38b]">
                  Account Verified
                </p>
                <p className="mt-1 text-base font-semibold leading-snug text-white">
                  Congratulations! You&apos;re eligible to withdraw{" "}
                  <span className="font-extrabold text-[#22d38b]">$416.34</span>
                </p>
                <p className="mt-0.5 text-xs font-medium text-emerald-100/55">
                  Available balance from your activity
                </p>
              </div>
            </div>
            <a
              href={settings.videoWithdrawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ad-cta-glow flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#00a36c] px-7 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#03b879] active:translate-y-0 sm:w-auto"
            >
              Withdraw Now
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
