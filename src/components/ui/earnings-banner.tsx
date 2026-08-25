"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { usePromoLinks } from "@/context/PromoLinksContext";

interface EarningsBannerProps {
  onDismiss?: () => void;
  compact?: boolean;
  /** High-visibility styling for use during AI generation */
  prominent?: boolean;
}

export function EarningsBanner({
  onDismiss,
  compact = false,
  prominent = false,
}: EarningsBannerProps) {
  const [visible, setVisible] = useState(true);
  const { settings } = usePromoLinks();
  const ctaUrl = settings.externalTrainingUrl;
  const title = settings.externalTrainingTitle;
  const ctaLabel = settings.externalTrainingCtaLabel;

  if (!visible || !ctaUrl) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const isLarge = prominent || !compact;

  if (prominent) {
    return (
      <div
        className={clsx(
          "relative w-full rounded-lg border border-[var(--np-line-pulse)] bg-grad-tint",
          "px-6 py-8 sm:px-10 sm:py-10 text-center",
          "shadow-card"
        )}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss offer"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-border-dim/50 hover:text-text-heading"
        >
          <X size={16} />
        </button>

        <span className="mb-4 inline-block rounded-full bg-grad-ink px-4 py-1.5 text-[13px] font-medium tracking-[0.08em] text-[#FFFDF8]">
          Free Training
        </span>

        <h3 className="mx-auto mb-4 max-w-3xl text-xl font-medium uppercase leading-tight tracking-tight text-text-heading sm:text-2xl md:text-[1.75rem]">
          {title}
        </h3>

        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[54px] w-full max-w-xl items-center justify-center rounded-xl bg-grad-pulse px-8 py-4 text-sm font-medium uppercase tracking-wide text-pulse-900 shadow-pulse transition-all duration-200 hover:brightness-110 active:scale-[0.98] sm:text-base"
        >
          {ctaLabel}
        </a>

        <p className="mt-5 text-[13px] font-medium uppercase tracking-wider text-[var(--np-danger)] sm:text-sm">
          Warning: This Will Be Taken Down Soon
        </p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative w-full rounded-lg border border-[var(--np-line-pulse)] bg-grad-tint text-center shadow-card transition-[border-color,box-shadow] duration-[160ms]",
        isLarge ? "p-5 sm:p-6" : "p-3 sm:p-3.5"
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss offer"
        className={clsx(
          "absolute flex items-center justify-center rounded-full text-text-muted transition-colors hover:bg-border-dim/50 hover:text-text-heading",
          isLarge ? "top-3 right-3 h-9 w-9" : "top-2 right-2 h-7 w-7"
        )}
      >
        <X size={isLarge ? 16 : 14} />
      </button>

      <span
        className={clsx(
          "inline-block rounded-full bg-grad-ink font-medium tracking-[0.08em] text-[#FFFDF8]",
          isLarge ? "mb-3 px-3 py-1 text-[13px]" : "mb-2 px-2 py-0.5 text-[13px]"
        )}
      >
        Free Training
      </span>

      <h3
        className={clsx(
          "font-medium uppercase leading-tight text-text-heading",
          isLarge ? "mb-2 text-xl sm:text-2xl" : "mb-1.5 text-sm sm:text-base"
        )}
      >
        {title}
      </h3>

      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "inline-flex w-full items-center justify-center gap-2 rounded-full bg-grad-pulse font-medium tracking-normal text-pulse-900 shadow-pulse transition-[background,box-shadow] duration-[160ms] hover:brightness-[1.03] sm:w-auto",
          isLarge ? "min-h-[48px] px-8 py-3 text-sm" : "min-h-[40px] px-5 py-2 text-[13px]"
        )}
      >
        {ctaLabel}
      </a>
    </div>
  );
}
