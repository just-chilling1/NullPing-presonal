"use client";

import Link from "next/link";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { dashboardContent } from "@/config/dashboard.config";
import { usePromoLinks } from "@/context/PromoLinksContext";

const MONEY_PATTERN = /(\$[\d,]+(?:-\$[\d,]+)?|\$[\d,]+,\s*\$[\d,]+,\s*or even \$[\d,]+)/g;

function emphasizeAmounts(text: string) {
  return text.split(MONEY_PATTERN).map((part, index) =>
    part.startsWith("$") ? (
      <span key={`${part}-${index}`} className="dashboard-bonus-ad-amount">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function formatParagraph(text: string) {
  const bestPartPrefix = "The best part? ";
  if (text.startsWith(bestPartPrefix)) {
    return (
      <>
        The best part?{" "}
        <span className="dashboard-bonus-ad-emphasis">
          {text.slice(bestPartPrefix.length)}
        </span>
      </>
    );
  }

  return emphasizeAmounts(text);
}

export function DashboardBonusAdCard() {
  const ad = dashboardContent.bonusAd;
  const { settings } = usePromoLinks();
  const ctaUrl = settings.externalTrainingUrl;

  return (
    <section className="dashboard-bonus-ad" aria-label="Member training offer">
      <div className="dashboard-bonus-ad-shimmer" aria-hidden />

      <div className="dashboard-bonus-ad-inner">
        <p className="dashboard-bonus-ad-badge">
          <Sparkles className="dashboard-bonus-ad-badge-icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Free member training
        </p>

        <div className="dashboard-bonus-ad-copy">
          {ad.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{formatParagraph(paragraph)}</p>
          ))}

          <p className="dashboard-bonus-ad-highlight">
            <Flame className="dashboard-bonus-ad-flame h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{ad.highlight}</span>
            <Flame className="dashboard-bonus-ad-flame h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          </p>

          <p className="dashboard-bonus-ad-closing">{emphasizeAmounts(ad.closing)}</p>
        </div>

        <div className="dashboard-bonus-ad-cta-wrap">
          <Link
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-bonus-ad-cta"
          >
            <span className="dashboard-bonus-ad-cta-shine" aria-hidden />
            <span className="dashboard-bonus-ad-cta-label">
              {ad.ctaLabel}
              <ArrowRight className="dashboard-bonus-ad-cta-arrow h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
          </Link>
          <p className="dashboard-bonus-ad-urgency">Limited access — register while it&apos;s still available</p>
        </div>
      </div>
    </section>
  );
}
