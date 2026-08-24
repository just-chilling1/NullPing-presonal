"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { dashboardContent } from "@/config/dashboard.config";
import { getCachedClientUser } from "@/lib/auth-client-cache";
import { DashboardTipsWidget } from "@/components/dashboard/DashboardTipsWidget";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RouteLoading } from "@/components/ui/route-loading";

const DashboardVideoTrack = dynamic(
  () =>
    import("@/components/dashboard/DashboardVideoTrack").then((m) => ({
      default: m.DashboardVideoTrack,
    })),
  { loading: () => <RouteLoading /> }
);

const ContactSupportWidget = dynamic(
  () =>
    import("@/components/dashboard/ContactSupportWidget").then((m) => ({
      default: m.ContactSupportWidget,
    })),
  { loading: () => <div className="dashboard-container min-h-[12rem] animate-pulse" aria-hidden />, ssr: false }
);

const PremiumUpgradesWidget = dynamic(
  () =>
    import("@/components/dashboard/PremiumUpgradesWidget").then((m) => ({
      default: m.PremiumUpgradesWidget,
    })),
  { loading: () => <div className="premium-upgrades-panel min-h-[10rem] animate-pulse" aria-hidden /> }
);

const SETUP_STEPS = [
  {
    title: "Connect Supabase",
    body: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then run the auth setup script (see DEVELOPER-SETUP.md).",
  },
  {
    title: "Customize branding",
    body: "Edit brand.config.ts, promos.config.ts, offers.config.ts, support.config.ts, and training.config.ts.",
  },
  {
    title: "Add client links",
    body: "Replace example URLs for ads, support, training videos, and partner offers — full table in DEVELOPER-SETUP.md.",
  },
  {
    title: "Enable product workflow",
    body: "Add your feature ids to enabledFeatures in features.config.ts (e.g. core-workflow, blog-builder, product-wizard).",
  },
  {
    title: "Review Training page",
    body: "Add Vimeo video IDs and copy in training.config.ts. Always visible when training is enabled.",
    href: "/training",
  },
  {
    title: "Review Support page",
    body: "Set support email, contact URL, and stats in support.config.ts.",
    href: "/support",
  },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");

  const showDevChecklist = process.env.NODE_ENV === "development";

  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash &&
      hash.includes("error=") &&
      (hash.includes("otp_expired") || hash.includes("access_denied") || hash.includes("recovery"))
    ) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorDesc =
        hashParams.get("error_description") || "This password reset link has expired or is invalid.";
      router.replace(`/reset-password?error=${encodeURIComponent(errorDesc.replace(/\+/g, " "))}`);
    }
  }, [router]);

  useEffect(() => {
    void getCachedClientUser().then((user) => {
      if (!user) return;
      const metaName = user.user_metadata?.full_name as string | undefined;
      if (metaName) {
        setFirstName(metaName.split(" ")[0] ?? "");
        return;
      }
      const emailPrefix = user.email?.split("@")[0];
      if (emailPrefix) setFirstName(emailPrefix);
    });
  }, []);

  const welcomeTitle = firstName
    ? `${dashboardContent.title}, ${firstName}`
    : dashboardContent.title;

  return (
    <div className="page-container mx-auto w-full max-w-7xl">
      <header className="flex min-w-0 flex-col gap-3 pt-1">
        {dashboardContent.eyebrow ? <span className="page-eyebrow">{dashboardContent.eyebrow}</span> : null}
        <h1 className="ds-h1">{welcomeTitle}</h1>
        <p className="ds-subtitle max-w-3xl" suppressHydrationWarning>
          {dashboardContent.subtitle}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 flex flex-col gap-6 lg:gap-8">
          <DashboardVideoTrack />
        </div>

        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-8 xl:self-start">
          <ContactSupportWidget />
          <DashboardTipsWidget />
          <PremiumUpgradesWidget variant="sidebar" />
        </aside>
      </div>

      {showDevChecklist ? (
        <DashboardSection className="border-dashed border-[var(--np-line-pulse)]">
          <div className="flex items-center gap-3">
            <Sparkles className="shrink-0 text-pulse-700" size={20} />
            <span className="font-medium text-text-primary">Developer setup checklist</span>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {SETUP_STEPS.map((step) => (
              <li key={step.title} className="flex gap-3 text-sm">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-pulse-700" />
                <div>
                  <p className="font-medium text-text-primary">{step.title}</p>
                  <p className="leading-relaxed text-text-secondary">{step.body}</p>
                  {"href" in step && step.href ? (
                    <Link
                      href={step.href}
                      className="mt-1 inline-block text-[13px] font-medium text-pulse-700 hover:underline"
                    >
                      Open page →
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-text-muted">
            Full handoff guide: <code className="text-pulse-700">DEVELOPER-SETUP.md</code> in the project root.
          </p>
        </DashboardSection>
      ) : null}
    </div>
  );
}
