"use client";

import { motion } from "framer-motion";
import { Check, Clock, ListChecks, Users } from "lucide-react";
import { clsx } from "clsx";
import type { TrafficSource } from "@/features/premium-autopilot/lib/source-types";
import {
  SourceDifficultyBadge,
  SourceTypeBadge,
} from "@/features/premium-autopilot/components/SourceBadges";

interface SourceCardProps {
  source: TrafficSource;
  isDone: boolean;
  index: number;
  onView: () => void;
  onToggleComplete: () => void;
}

export function SourceCard({
  source,
  isDone,
  index,
  onView,
  onToggleComplete,
}: SourceCardProps) {
  return (
    <motion.article
      initial={index < 8 ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.28 }}
      className={clsx(
        "glass-card group relative flex h-full flex-col overflow-hidden p-0 [content-visibility:auto] [contain-intrinsic-size:auto_210px]",
        isDone
          ? "border-[var(--np-line-pulse)] bg-grad-tint"
          : "hover:border-[var(--np-line-pulse)]"
      )}
    >
      <div
        className={clsx(
          "absolute inset-y-0 left-0 w-[3px]",
          isDone ? "bg-grad-pulse" : "bg-transparent group-hover:bg-pulse-300"
        )}
      />

      <div className="flex flex-1 flex-col gap-3.5 p-5 pl-[1.35rem]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <SourceTypeBadge type={source.type} />
            <SourceDifficultyBadge difficulty={source.difficulty} />
          </div>
          <button
            type="button"
            onClick={onToggleComplete}
            aria-label={isDone ? "Mark incomplete" : "Mark complete"}
            className={clsx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
              isDone
                ? "border-[var(--np-line-pulse)] bg-grad-pulse text-pulse-900"
                : "border-border-dim bg-surface-field text-ink-4 hover:border-[var(--np-line-pulse)] hover:text-pulse-700"
            )}
          >
            <Check size={13} strokeWidth={2.6} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <h3 className="brand-font text-[1.05rem] leading-snug text-text-heading">
            {source.name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} className="text-pulse-700" />
              <span>{source.traffic}</span>
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-pulse-300 sm:inline-block" />
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-pulse-700" />
              <span>{source.time}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onView}
          className="btn-primary mt-auto h-11 w-full py-0 text-sm"
        >
          <ListChecks size={15} />
          View Instructions
        </button>
      </div>
    </motion.article>
  );
}
