"use client";

import { motion } from "framer-motion";
import { faqSections } from "@/config/faq.config";
import { SupportPageLayout } from "../components/SupportPageLayout";
import { SupportHeroSection } from "../components/SupportHeroSection";
import {
  SupportFaqCardHeader,
  SupportFaqSections,
} from "../components/SupportFaqAccordion";
import {
  SupportRefundSection,
  containerVariants,
  itemVariants,
} from "../components/SupportRefundSection";

export default function SupportPage() {
  return (
    <SupportPageLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex max-w-5xl flex-col gap-5"
      >
        <motion.div variants={itemVariants}>
          <SupportHeroSection />
        </motion.div>

        <motion.div variants={itemVariants} id="faq" className="card-base overflow-hidden p-0">
          <SupportFaqCardHeader />
          <div className="px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
            <SupportFaqSections sections={faqSections} />
          </div>
        </motion.div>

        <SupportRefundSection />
      </motion.div>
    </SupportPageLayout>
  );
}
