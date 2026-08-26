export const VIDEO_THUMBNAILS: Record<string, string> = {};

export const DASHBOARD_VIDEO_THUMBNAILS = [
  "/video-thumbnails/dashboard-01-watch-this-first.png",
  "/video-thumbnails/dashboard-02-how-the-money-flows.png",
  "/video-thumbnails/dashboard-03-your-5-minute-tour.png",
] as const;
export const ACADEMY_PLATFORM_THUMBNAILS = [
  "/video-thumbnails/academy-04-activate-first-asset.png",
  "/video-thumbnails/academy-05-publish-money-page.png",
  "/video-thumbnails/academy-06-pinterest-traffic-results.png",
] as const;

export const ACADEMY_PREMIUM_THUMBNAILS = [
  "/video-thumbnails/academy-07-unlimited.png",
  "/video-thumbnails/academy-08-done-for-you-profit.png",
  "/video-thumbnails/academy-09-instant-income.png",
  "/video-thumbnails/academy-10-automated-profits.png",
  "/video-thumbnails/academy-11-guaranteed-high-ticket-payouts.png",
  "/video-thumbnails/academy-12-cyber-protection.png",
  "/video-thumbnails/academy-13-reseller-license-rights.png",
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
