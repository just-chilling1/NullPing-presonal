"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { ThreadGenerationQuota } from "@/features/publish-kit/lib/thread-generation-quota";

interface TrafficGenerationQuotaProps {
  quota: ThreadGenerationQuota | null;
  loading?: boolean;
  className?: string;
}

export function TrafficGenerationQuota({
  quota,
  loading = false,
  className = "",
}: TrafficGenerationQuotaProps) {
  if (loading && !quota) {
    return (
      <div className={`traffic-quota-card ${className}`.trim()}>
        <Loader2 className="h-4 w-4 animate-spin text-pulse-500" aria-hidden />
        <p className="text-sm text-ink-3">Loading daily generations…</p>
      </div>
    );
  }

  if (!quota) return null;

  const { limit, usedToday, remaining } = quota;
  const depleted = remaining <= 0;
  const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;

  return (
    <div
      className={`traffic-quota-card ${depleted ? "is-depleted" : ""} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="traffic-quota-icon" aria-hidden>
        <Sparkles size={18} strokeWidth={1.75} />
      </div>
      <div className="traffic-quota-body">
        <div className="traffic-quota-top">
          <p className="traffic-quota-label">Daily pin generations</p>
          <p className="traffic-quota-count">
            <span className="traffic-quota-remaining">{remaining}</span>
            <span className="traffic-quota-limit"> / {limit}</span>
          </p>
        </div>
        <div className="traffic-quota-bar" aria-hidden>
          <span className="traffic-quota-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="traffic-quota-hint">
          {depleted ? (
            <>You&apos;ve used all {limit} generations today. Resets at midnight UTC.</>
          ) : (
            <>
              {remaining} of {limit} generations left today
              {usedToday > 0 ? <> · {usedToday} used</> : null}. Resets at midnight UTC.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
