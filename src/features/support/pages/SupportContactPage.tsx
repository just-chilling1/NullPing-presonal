"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ContactSupportWidget } from "@/components/dashboard/ContactSupportWidget";
import { PageHeader } from "@/components/ui/page-header";
import { support, supportRoutes } from "@/config/support.config";
import {
  containerVariants,
  itemVariants,
} from "../components/SupportRefundSection";

export default function SupportContactPage() {
  return (
    <div className="page-container mx-auto w-full max-w-6xl">
      <div className="mx-auto w-full max-w-xl">
        <PageHeader
          eyebrow="Help"
          title={support.contactPageTitle}
          subtitle={support.contactPageSubtitle}
          actions={
            <Link href={supportRoutes.home} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to Support
            </Link>
          }
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-2"
        >
          <motion.div variants={itemVariants}>
            <ContactSupportWidget />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
