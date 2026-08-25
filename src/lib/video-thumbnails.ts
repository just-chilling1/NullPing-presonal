export const VIDEO_THUMBNAILS: Record<string, string> = {};

export const DASHBOARD_VIDEO_THUMBNAILS = [] as const;
export const ACADEMY_PLATFORM_THUMBNAILS = [] as const;
export const ACADEMY_PREMIUM_THUMBNAILS = [] as const;

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

export function resolveVideoThumbnail(
  videoId: string,
  fallbackSrc?: string | null
): string | null {
  if (fallbackSrc) return fallbackSrc;
  return VIDEO_THUMBNAILS[videoId] ?? null;
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
