"use client";

import { motion } from "framer-motion";
import { faqSections } from "@/config/faq.config";
import { SupportPageLayout } from "../components/SupportPageLayout";
import { SupportChannelCards } from "../components/SupportChannelCards";
import { SupportStatCards } from "../components/SupportStatCards";
import {
  SupportFaqAccordion,
  SupportFaqCardHeader,
} from "../components/SupportFaqAccordion";
import {
  SupportRefundSection,
  containerVariants,
  itemVariants,
} from "../components/SupportRefundSection";

const allFaqs = faqSections.flatMap((section) => section.items);

export default function SupportPage() {
  return (
    <SupportPageLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5"
      >
        <motion.div variants={itemVariants}>
          <SupportStatCards />
        </motion.div>

        <motion.div variants={itemVariants}>
          <SupportChannelCards />
        </motion.div>

        <motion.div variants={itemVariants} id="faq" className="card-base overflow-hidden p-0">
          <SupportFaqCardHeader />
          <div className="px-4 pb-3 sm:px-5">
            <SupportFaqAccordion items={allFaqs} />
          </div>
        </motion.div>

        <SupportRefundSection />
      </motion.div>
    </SupportPageLayout>
  );
}
