"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, HelpCircle, X } from "lucide-react";
import { ContactSupportWidget } from "@/components/dashboard/ContactSupportWidget";
import { support } from "@/config/support.config";

export function FloatingSupportButton() {
  const [open, setOpen] = useState(false);
  const { floatingWidget } = support;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close support panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="support-float-backdrop fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={floatingWidget.ariaLabel}
          aria-expanded={open}
          className="support-float-trigger fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-full border border-[var(--np-line-pulse)] bg-grad-pulse px-5 py-3 text-sm font-medium text-text-on-accent shadow-pulse ring-2 ring-white/10 transition-all hover:brightness-110 hover:shadow-pulse active:scale-[0.98] sm:bottom-6 sm:right-6 max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
        >
          <HelpCircle className="h-5 w-5 shrink-0" aria-hidden />
          {floatingWidget.label}
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={floatingWidget.panelTitle}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="support-float-panel fixed bottom-4 right-4 z-50 flex max-h-[min(82vh,680px)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden sm:bottom-6 sm:right-6 max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
          >
            <div className="support-float-panel-header">
              <div className="flex min-w-0 items-start gap-3">
                <div className="support-float-panel-icon" aria-hidden>
                  <Headphones className="h-5 w-5" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <span className="support-float-panel-title">{floatingWidget.panelTitle}</span>
                  {floatingWidget.panelSubtitle ? (
                    <span className="support-float-panel-subtitle">{floatingWidget.panelSubtitle}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close support panel"
                className="support-float-panel-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="support-widget-scroll support-float-panel-body min-h-0 flex-1 overflow-y-auto">
              <ContactSupportWidget embedded />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
