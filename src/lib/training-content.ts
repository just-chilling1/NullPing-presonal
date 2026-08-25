import type { LucideIcon } from "lucide-react";
import { Rocket } from "lucide-react";
import { trainingContent } from "@/config/training.config";
import {
  trainingCta,
  trainingPremiumVideos,
  trainingProTips,
  trainingQuickStartChecklist,
  trainingWorkflowSteps,
} from "@/config/training-content.config";
import { isFeatureEnabled } from "@/config/features.config";
import { faqSections } from "@/config/faq.config";
import { toEmbedUrl } from "@/lib/video-thumbnails";

export type AcademyVideo = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  badge?: string;
};

export function getPlatformTutorialVideos(): AcademyVideo[] {
  return [...trainingContent.videos];
}

export function getPremiumTutorialVideos(): AcademyVideo[] {
  return trainingPremiumVideos
    .filter((video) => isFeatureEnabled(video.feature))
    .map(({ feature: _feature, ...video }) => video);
}

export function getTrainingStartCta(): {
  href: string;
  label: string;
  icon: LucideIcon;
} {
  if (isFeatureEnabled("asset-activator")) {
    return {
      href: trainingCta.href,
      label: trainingCta.buttonLabel,
      icon: Rocket,
    };
  }
  if (isFeatureEnabled("blog-builder")) {
    return {
      href: "/sales-offer-generator",
      label: "Get Started with Sales Offer Generator",
      icon: Rocket,
    };
  }
  return {
    href: trainingCta.href,
    label: trainingCta.buttonLabel,
    icon: Rocket,
  };
}

export function getAcademyOverview(): {
  platformCount: number;
  premiumCount: number;
  faqCount: number;
} {
  return {
    platformCount: trainingContent.videos.length,
    premiumCount: getPremiumTutorialVideos().length,
    faqCount: faqSections.reduce((total, section) => total + section.items.length, 0),
  };
}

export { trainingCta, trainingProTips, trainingQuickStartChecklist, trainingWorkflowSteps };

export function vimeoPlayerUrl(id: string): string {
  return toEmbedUrl(id, false);
}
