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
import { isFeatureEnabled, type FeatureId } from "@/config/features.config";
import { faqSections } from "@/config/faq.config";
import {
  getAcademyPlatformThumbnail,
  getPremiumFeatureThumbnail,
  resolveVideoThumbnail,
  toEmbedUrl,
} from "@/lib/video-thumbnails";
import { academyCompletionKey } from "@/features/training/lib/training-completions";

export type AcademyVideo = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  badge?: string;
  thumbnailSrc: string | null;
  /** Stable key for user_training_completions.video_id */
  completionKey: string;
};

function withThumbnailAndKey<
  T extends { id: string; title: string; badge?: string; feature?: FeatureId },
>(video: T, kind: "platform" | "premium", index: number): T & {
  thumbnailSrc: string | null;
  completionKey: string;
} {
  const fallbackSrc =
    kind === "platform"
      ? getAcademyPlatformThumbnail(index)
      : video.feature
        ? getPremiumFeatureThumbnail(video.feature)
        : null;

  return {
    ...video,
    thumbnailSrc: resolveVideoThumbnail(video.id, fallbackSrc),
    completionKey: academyCompletionKey(kind, video),
  };
}

export function getPlatformTutorialVideos(): AcademyVideo[] {
  return trainingContent.videos.map((video, index) =>
    withThumbnailAndKey(video, "platform", index)
  );
}

export function getPremiumTutorialVideos(): AcademyVideo[] {
  return trainingPremiumVideos
    .filter((video) => isFeatureEnabled(video.feature))
    .map(({ feature: _feature, ...video }, index) =>
      withThumbnailAndKey({ ...video, feature: _feature }, "premium", index)
    );
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
