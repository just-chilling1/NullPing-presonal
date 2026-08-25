"use client";

import Link from "next/link";
import { ArrowRight, Clock, Headphones, Mail, Shield, Star } from "lucide-react";
import { clsx } from "clsx";
import { support, supportRoutes } from "@/config/support.config";

const STAT_ICONS = {
  clock: Clock,
  star: Star,
  shield: Shield,
} as const;

export function SupportHeroSection() {
  return (
    <section className="support-hero relative overflow-hidden rounded-2xl border border-[var(--np-line-pulse)] bg-[var(--np-surface)] shadow-[var(--np-shadow-card)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--np-pulse-500)_14%,transparent)_0%,transparent_48%,color-mix(in_srgb,#A855F7_10%,transparent)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pulse-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--np-line-pulse)] bg-pulse-100 text-pulse-500 shadow-[0_0_24px_-8px_rgba(0,240,255,0.45)]">
              <Headphones size={26} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pulse-500">
                Member support
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-text-heading sm:text-2xl">
                Get help from our team
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                Questions about money pages, Pinterest traffic, premium tools, or your account — send
                a message and we&apos;ll get back to you quickly.
              </p>
            </div>
          </div>

          <Link
            href={supportRoutes.contact}
            className="btn-primary group inline-flex w-full shrink-0 items-center justify-center gap-2 px-6 py-3.5 text-sm sm:w-auto lg:min-w-[220px]"
          >
            <Mail size={16} />
            {support.ctaLabel}
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {support.stats.map((stat, index) => {
            const Icon = STAT_ICONS[stat.icon as keyof typeof STAT_ICONS] ?? Star;
            const isPrimary = index === 0;

            return (
              <li
                key={stat.label}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border px-4 py-3.5",
                  isPrimary
                    ? "border-success/25 bg-success/10"
                    : "border-[var(--np-line)] bg-[color-mix(in_srgb,var(--np-surface-field)_70%,transparent)]"
                )}
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isPrimary ? "bg-success/15 text-success" : "bg-pulse-100 text-text-muted"
                  )}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  {isPrimary && "highlight" in stat && stat.highlight ? (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                        {stat.label}
                      </p>
                      <p
                        className={clsx(
                          "text-sm font-medium",
                          stat.highlightClass ?? "text-success"
                        )}
                      >
                        {stat.highlight}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium leading-snug text-text-primary">
                      {stat.label}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
