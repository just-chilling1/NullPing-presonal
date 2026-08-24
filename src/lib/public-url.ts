function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Client-safe helper — turn a relative public path into an absolute URL. */
export function resolvePublicUrl(pathOrUrl: string, origin?: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"));

  return `${stripTrailingSlash(base)}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
