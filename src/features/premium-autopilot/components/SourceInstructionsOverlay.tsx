"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  ExternalLink,
  ListChecks,
  Users,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { TrafficSource } from "@/features/premium-autopilot/lib/source-types";
import {
  SourceDifficultyBadge,
  SourceTypeBadge,
} from "@/features/premium-autopilot/components/SourceBadges";

interface SourceInstructionsOverlayProps {
  source: TrafficSource | null;
  isDone: boolean;
  copied: boolean;
  onClose: () => void;
  onToggleComplete: () => void;
  onCopyDescription: () => void;
  renderCopy: (template: string) => string;
}

export function SourceInstructionsOverlay({
  source,
  isDone,
  copied,
  onClose,
  onToggleComplete,
  onCopyDescription,
  renderCopy,
}: SourceInstructionsOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!source) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [source, handleKeyDown]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {source && (
        <motion.div
          key={source.id}
          className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="autopilot-source-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close instructions"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="relative z-10 flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border-dim/80 bg-surface shadow-2xl outline-none sm:max-h-[min(88dvh,40rem)] sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border-dim bg-surface-sub px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <SourceTypeBadge type={source.type} />
                    <SourceDifficultyBadge difficulty={source.difficulty} />
                    {isDone && (
                      <span className="rounded-md border border-[var(--np-line-pulse)] bg-pulse-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-pulse-700">
                        Done
                      </span>
                    )}
                  </div>
                  <h2
                    id="autopilot-source-title"
                    className="brand-font text-2xl leading-tight text-text-heading sm:text-[1.75rem]"
                  >
                    {source.name}
                  </h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} className="text-pulse-700" />
                      Traffic Potential: {source.traffic}
                    </span>
                    <span className="hidden h-1 w-1 rounded-full bg-pulse-300 sm:inline-block" />
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-pulse-700" />
                      Time: {source.time}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-pulse-100/10 hover:text-text-heading"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <a
                  href={source.url.startsWith("/") ? source.url : source.url}
                  target={source.url.startsWith("/") ? undefined : "_blank"}
                  rel={source.url.startsWith("/") ? undefined : "noopener noreferrer"}
                  className="btn-primary h-12 flex-1 py-0 text-sm"
                >
                  <ExternalLink size={15} />
                  {source.url.startsWith("/") ? "Open in app" : "Go To Site"}
                </a>
                <button
                  type="button"
                  onClick={isDone ? undefined : onToggleComplete}
                  disabled={isDone}
                  aria-disabled={isDone}
                  className={clsx(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--np-r-pill)] px-5 text-sm font-medium transition-all sm:min-w-44",
                    isDone
                      ? "cursor-default border border-[var(--np-line-pulse)] bg-grad-pulse text-pulse-900 shadow-[var(--np-shadow-pulse)]"
                      : "btn-secondary h-12 border-success/35 py-0 text-success hover:bg-success/10 hover:text-success"
                  )}
                >
                  <CheckCircle2 size={16} />
                  {isDone ? "Completed" : "Mark Complete"}
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-surface-field px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 [scrollbar-color:var(--np-pulse-300)_var(--np-pulse-100)] [scrollbar-width:thin]">
              <section className="glass-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-text-heading">
                  <ListChecks size={16} className="text-pulse-700" />
                  Step-By-Step Instructions
                </div>
                <ol className="flex flex-col">
                  {source.instructions.map((step, index) => {
                    const isLast = index === source.instructions.length - 1;
                    return (
                      <li key={index} className="flex gap-3">
                        <div className="flex w-7 shrink-0 flex-col items-center">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-grad-pulse text-[12px] font-medium text-pulse-900 shadow-[var(--np-shadow-pulse)]">
                            {index + 1}
                          </span>
                          {!isLast && (
                            <span className="my-1 w-px flex-1 bg-[var(--np-line-pulse)]" />
                          )}
                        </div>
                        <p
                          className={clsx(
                            "min-w-0 flex-1 text-sm leading-relaxed text-text-primary",
                            isLast ? "pb-0" : "pb-4"
                          )}
                        >
                          {renderCopy(step)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-pulse-700">
                  <Clipboard size={14} />
                  Use This Description When Submitting
                </div>
                <div className="glass-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed break-words text-text-primary">
                    {renderCopy(source.description)}
                  </p>
                  <button
                    type="button"
                    onClick={onCopyDescription}
                    className={clsx(
                      "btn-subtle inline-flex h-10 shrink-0 items-center justify-center gap-1.5 text-[13px] font-medium",
                      copied && "border-[var(--np-line-pulse)] bg-grad-pulse text-pulse-900"
                    )}
                  >
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copied ? "Copied!" : "Copy Description"}
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
