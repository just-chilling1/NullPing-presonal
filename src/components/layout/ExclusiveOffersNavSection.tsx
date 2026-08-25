"use client";

import { ExternalLink, Gift, Play } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import type { ExclusiveOffer } from "@/config/offers.config";

interface ExclusiveOffersNavSectionProps {
  offers: ExclusiveOffer[];
  collapsed?: boolean;
  mobile?: boolean;
  className?: string;
}

export function ExclusiveOffersNavSection({
  offers,
  collapsed = false,
  mobile = false,
  className,
}: ExclusiveOffersNavSectionProps) {
  if (offers.length === 0 || collapsed) return null;

  return (
    <div
      className={clsx(
        "exclusive-offers-nav-section",
        mobile ? "p-2.5" : "mt-4 p-3",
        className
      )}
    >
      <p className="exclusive-offers-nav-section-label">
        <Gift className="exclusive-offers-nav-section-icon" strokeWidth={1.75} aria-hidden />
        Exclusive Offers
      </p>
      <div className={mobile ? "space-y-2.5" : "space-y-2"}>
        {offers.map((offer, index) => (
          <motion.a
            key={offer.href + offer.title}
            href={offer.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.06, duration: 0.22 }}
            className={clsx(
              "exclusive-offers-nav-item group",
              mobile ? "min-h-[52px] px-3 py-3 text-[15px]" : "px-2.5 py-2.5 text-[13px]"
            )}
          >
            <span className="exclusive-offers-nav-play" aria-hidden>
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
            </span>
            <span className="exclusive-offers-nav-copy min-w-0 flex-1">
              <span className="exclusive-offers-nav-title">{offer.title}</span>
              {offer.subtitle?.trim() ? (
                <span className="exclusive-offers-nav-subtitle">{offer.subtitle.trim()}</span>
              ) : null}
            </span>
            <ExternalLink
              className="exclusive-offers-nav-external h-3.5 w-3.5 shrink-0"
              strokeWidth={1.75}
            />
          </motion.a>
        ))}
      </div>
    </div>
  );
}
