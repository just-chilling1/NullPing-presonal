"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { BrandLogo } from "./BrandLogo";
import { FloatingSupportButton } from "@/components/support/FloatingSupportButton";
import { DeferredParticleBackground } from "@/components/ui/deferred-particle-background";

interface AuthLayoutProps {
  children: React.ReactNode;
  subtitle?: string;
  /** Optional content shown below the card (trust badges, social proof) */
  footer?: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, subtitle, footer, className }: AuthLayoutProps) {
  return (
    <div className="auth-page-bg min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="auth-page-glow auth-page-glow--cyan" aria-hidden />
      <div className="auth-page-glow auth-page-glow--purple" aria-hidden />
      <DeferredParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
        className={clsx("w-full max-w-md relative z-10", className)}
      >
        <div className="auth-card glass-card p-5 sm:p-6 lg:p-8 flex flex-col gap-5 sm:gap-6">
          <div className="flex flex-col items-center gap-3 text-center w-full">
            <BrandLogo size="lg" showTagline={false} stacked className="w-full" />
            {subtitle && <p className="text-[15px] text-ink-3 leading-relaxed max-w-xs">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-4 px-2">{footer}</div> : null}
      </motion.div>

      <FloatingSupportButton />
    </div>
  );
}
