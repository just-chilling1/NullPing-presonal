"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { dashboardContent } from "@/config/dashboard.config";
import {
  getDashboardAcademyCta,
  getDashboardStartCta,
  getDashboardVideos,
} from "@/lib/dashboard-content";
import { DashboardBonusAdCard } from "./DashboardBonusAdCard";
import { DashboardVideoCard } from "./DashboardVideoCard";

export function DashboardVideoTrack() {
  const videos = getDashboardVideos();
  const startCta = getDashboardStartCta();
  const academyCta = getDashboardAcademyCta();
  const StartIcon = startCta.icon;
  const AcademyIcon = academyCta.icon;

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-pulse-100">
            <Play className="h-5 w-5 text-pulse-700" />
          </div>
          <h2 className="ds-h2">{dashboardContent.startHereTitle}</h2>
        </div>
        {videos[0] ? <DashboardVideoCard video={videos[0]} priority /> : null}
      </section>

      <DashboardBonusAdCard />

      {videos[1] ? <DashboardVideoCard video={videos[1]} /> : null}

      <DashboardBonusAdCard />

      {videos[2] ? <DashboardVideoCard video={videos[2]} /> : null}

      <section className="dashboard-start-ctas flex min-w-0 flex-col gap-3">
        <Link
          href={startCta.href}
          className="btn-primary min-h-[48px] w-full px-4 text-center text-sm leading-snug sm:text-base"
        >
          <StartIcon className="h-5 w-5 shrink-0" />
          <span className="text-balance">{startCta.label}</span>
        </Link>
        <Link
          href={academyCta.href}
          className="btn-secondary min-h-[48px] w-full px-4 text-center text-sm leading-snug sm:text-base"
        >
          <AcademyIcon className="h-5 w-5 shrink-0" />
          <span className="text-balance">{academyCta.label}</span>
        </Link>
      </section>
    </div>
  );
}
