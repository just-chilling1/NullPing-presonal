"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import type { FaqItem, FaqSection } from "@/config/faq.config";

interface SupportFaqAccordionProps {
  items: FaqItem[];
}

export function SupportFaqAccordion({ items }: SupportFaqAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border-dim/80">
      {items.map((faq) => {
        const key = faq.q;
        const isOpen = expandedKey === key;

        return (
          <div key={key}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-1 py-3.5 text-left transition-colors hover:bg-pulse-100/80 sm:px-2"
              onClick={() => setExpandedKey(isOpen ? null : key)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-text-primary">{faq.q}</span>
              {isOpen ? (
                <ChevronUp size={18} className="shrink-0 text-pulse-700" />
              ) : (
                <ChevronDown size={18} className="shrink-0 text-text-muted" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-1 pb-4 text-sm leading-relaxed text-text-secondary sm:px-2">
                    {faq.a}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

interface SupportFaqSectionsProps {
  sections: FaqSection[];
}

export function SupportFaqSections({ sections }: SupportFaqSectionsProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-500 sm:px-2">
            {section.title}
          </h3>
          <SupportFaqAccordion items={section.items} />
        </div>
      ))}
    </div>
  );
}

export function SupportFaqCardHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-border-dim/80 px-5 py-4 sm:px-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-pulse-100">
        <HelpCircle className="h-5 w-5 text-pulse-700" />
      </div>
      <div>
        <h2 className="ds-h3">Frequently Asked Questions</h2>
        <p className="mt-1 text-sm text-text-muted">
          Quick answers about money pages, Pinterest traffic, and your account
        </p>
      </div>
    </div>
  );
}
