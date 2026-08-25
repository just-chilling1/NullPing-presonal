"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { support } from "@/config/support.config";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function SupportRefundSection() {
  const { refundPolicy } = support;

  return (
    <motion.section variants={itemVariants} className="card-base overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border-dim/80 px-5 py-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-pulse-100">
          <FileText className="h-5 w-5 text-pulse-700" />
        </div>
        <div>
          <h2 className="ds-h3">{refundPolicy.title}</h2>
          <p className="mt-1 text-sm text-text-muted">{refundPolicy.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {refundPolicy.items.map((item) => (
          <div
            key={item.title}
            className="flex h-full flex-col rounded-xl border border-[var(--np-line)] bg-[color-mix(in_srgb,var(--np-surface-field)_65%,transparent)] p-4"
          >
            <h3 className="ds-h4 mb-2 text-pulse-700">{item.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{item.body}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export { containerVariants, itemVariants };
