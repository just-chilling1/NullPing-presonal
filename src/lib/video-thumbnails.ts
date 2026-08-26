import type { StaticImageData } from "next/image";
import dashboard01 from "@/assets/video-thumbnails/dashboard-01-watch-this-first.png";
import dashboard02 from "@/assets/video-thumbnails/dashboard-02-how-the-money-flows.png";
import dashboard03 from "@/assets/video-thumbnails/dashboard-03-your-5-minute-tour.png";
import academy04 from "@/assets/video-thumbnails/academy-04-activate-first-asset.png";
import academy05 from "@/assets/video-thumbnails/academy-05-publish-money-page.png";
import academy06 from "@/assets/video-thumbnails/academy-06-pinterest-traffic-results.png";
import academy07 from "@/assets/video-thumbnails/academy-07-unlimited.png";
import academy08 from "@/assets/video-thumbnails/academy-08-done-for-you-profit.png";
import academy09 from "@/assets/video-thumbnails/academy-09-instant-income.png";
import academy10 from "@/assets/video-thumbnails/academy-10-automated-profits.png";
import academy11 from "@/assets/video-thumbnails/academy-11-guaranteed-high-ticket-payouts.png";
import academy12 from "@/assets/video-thumbnails/academy-12-cyber-protection.png";
import academy13 from "@/assets/video-thumbnails/academy-13-reseller-license-rights.png";

export const VIDEO_THUMBNAILS: Record<string, string> = {};

function bundledSrc(image: StaticImageData): string {
  return image.src;
}

export const DASHBOARD_VIDEO_THUMBNAILS = [
  bundledSrc(dashboard01),
  bundledSrc(dashboard02),
  bundledSrc(dashboard03),
] as const;

export const ACADEMY_PLATFORM_THUMBNAILS = [
  bundledSrc(academy04),
  bundledSrc(academy05),
  bundledSrc(academy06),
] as const;

export const ACADEMY_PREMIUM_THUMBNAILS = [
  bundledSrc(academy07),
  bundledSrc(academy08),
  bundledSrc(academy09),
  bundledSrc(academy10),
  bundledSrc(academy11),
  bundledSrc(academy12),
  bundledSrc(academy13),
] as const;

/** Premium feature pages — maps feature id to academy thumbnail (07–13). */
export const PREMIUM_FEATURE_THUMBNAILS: Record<string, string> = {
  "premium-accelerator": ACADEMY_PREMIUM_THUMBNAILS[0],
  "premium-dfy-profit": ACADEMY_PREMIUM_THUMBNAILS[1],
  "premium-social": ACADEMY_PREMIUM_THUMBNAILS[2],
  "premium-10x": ACADEMY_PREMIUM_THUMBNAILS[2],
  "premium-autopilot": ACADEMY_PREMIUM_THUMBNAILS[3],
  "premium-recurring": ACADEMY_PREMIUM_THUMBNAILS[4],
  "protector": ACADEMY_PREMIUM_THUMBNAILS[5],
  "premium-license-rights": ACADEMY_PREMIUM_THUMBNAILS[6],
};

const VIMEO_ID_REGEX = /vimeo\.com\/(?:video\/)?(\d+)/;

function normalizeVimeoId(videoId: string): string | null {
  const trimmed = videoId.trim();
  if (!trimmed) return null;
  const match = trimmed.match(VIMEO_ID_REGEX);
  const id = match?.[1] ?? trimmed.replace(/\D/g, "");
  return id || null;
}

/** Lightweight Vimeo poster URL — no API key required. */
export function getVimeoThumbnailUrl(videoId: string): string | null {
  const id = normalizeVimeoId(videoId);
  return id ? `https://vumbnail.com/${id}.jpg` : null;
}

export function getVideoThumbnailById(id: string): string | null {
  return VIDEO_THUMBNAILS[id] ?? getVimeoThumbnailUrl(id);
}

export function getDashboardVideoThumbnail(index: number): string | null {
  const src = DASHBOARD_VIDEO_THUMBNAILS[index];
  return src ?? null;
}

export function getAcademyPlatformThumbnail(index: number): string | null {
  const src = ACADEMY_PLATFORM_THUMBNAILS[index];
  return src ?? null;
}

export function getAcademyPremiumThumbnail(index: number): string | null {
  const src = ACADEMY_PREMIUM_THUMBNAILS[index];
  return src ?? null;
}

export function getPremiumFeatureThumbnail(featureId: string): string | null {
  return PREMIUM_FEATURE_THUMBNAILS[featureId] ?? null;
}

export function resolveVideoThumbnail(
  videoId: string,
  fallbackSrc?: string | null
): string | null {
  if (fallbackSrc) return fallbackSrc;
  return VIDEO_THUMBNAILS[videoId] ?? getVimeoThumbnailUrl(videoId);
}

export function toEmbedUrl(videoUrl: string, autoplay = true): string {
  const id = normalizeVimeoId(videoUrl);
  if (!id) return videoUrl;
  const params = new URLSearchParams({
    badge: "0",
    byline: "0",
    portrait: "0",
    title: "0",
    autopause: "0",
    player_id: "0",
    app_id: "58479",
    dnt: "1",
    ...(autoplay ? { autoplay: "1" } : {}),
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}
