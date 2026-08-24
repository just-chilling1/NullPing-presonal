"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { brand } from "@/config/brand.config";
import { usePromoLinks } from "@/context/PromoLinksContext";

export default function ScaleTrainingPage() {
    const { settings } = usePromoLinks();
    const ctaUrl = settings.scaleTrainingUrl;
    return (
        <div className="page-container pb-10">
            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center text-center gap-6"
            >
                <div className="inline-flex items-center gap-2 bg-pulse-100 border border-[var(--np-line-pulse)] rounded-full px-5 py-2">
                    <Sparkles size={14} className="text-pulse-700" />
                    <span className="text-[13px] font-medium text-pulse-700 uppercase tracking-[0.15em]">Exclusive Training</span>
                </div>

                <h1 className="brand-font text-4xl md:text-5xl lg:text-6xl font-medium text-text-heading leading-tight max-w-3xl">
                    Scale Your{" "}
                    <span className="text-pulse-700">{brand.productName}</span>
                    {" "}To $1,000+ Per Day
                </h1>

                <p className="text-text-secondary text-base md:text-lg max-w-xl">
                    Watch this exclusive training to multiply your results and automate your path to life-changing income.
                </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center"
            >
                <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-3 bg-grad-pulse hover:brightness-105 text-black font-medium text-lg px-10 py-5 rounded-xl transition-all shadow-pulse hover:shadow-pulse"
                >
                    <span className="brand-font tracking-wide">Click Here To Access Training</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
            </motion.div>
        </div>
    );
}
