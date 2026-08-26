import type { LucideIcon } from "lucide-react";
import { BookOpen, Rocket } from "lucide-react";
import { dashboardContent } from "@/config/dashboard.config";
import { trainingContent } from "@/config/training.config";
import { isFeatureEnabled } from "@/config/features.config";
import { getDashboardHowItWorksSteps } from "@/lib/dashboard-steps";
import {
  getDashboardVideoThumbnail,
  resolveVideoThumbnail,
  toEmbedUrl,
} from "@/lib/video-thumbnails";

export type DashboardVideo = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  thumbnailSrc: string | null;
};

export function getDashboardVideos(): DashboardVideo[] {
  return dashboardContent.videos.map((video, index) => {
    const id = video.id || trainingContent.videos[index]?.id || "";
    return {
      ...video,
      id,
      thumbnailSrc: resolveVideoThumbnail(id, getDashboardVideoThumbnail(index)),
    };
  });
}

export function getDashboardSubtitle(): string {
  return dashboardContent.subtitle;
}

export function getDashboardStartCta(): {
  href: string;
  label: string;
  icon: LucideIcon;
} {
  if (isFeatureEnabled("asset-activator")) {
    return {
      href: "/activate",
      label: "Activate your first asset",
      icon: Rocket,
    };
  }

  if (isFeatureEnabled("blog-builder")) {
    return {
      href: "/sales-offer-generator",
      label: "Get Started Now with Sales Offer Generator",
      icon: Rocket,
    };
  }

  const firstStep = getDashboardHowItWorksSteps()[0];
  return {
    href: firstStep.href,
    label: `Get Started Now — ${firstStep.title}`,
    icon: firstStep.icon,
  };
}

export function getDashboardAcademyCta(): {
  href: string;
  label: string;
  icon: LucideIcon;
} {
  return {
    href: "/training",
    label: "Know More from the Academy",
    icon: BookOpen,
  };
}

export function vimeoPlayerUrl(id: string): string {
  return toEmbedUrl(id, false);
}
