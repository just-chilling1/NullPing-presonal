import { getAppUrl } from "@/lib/brand-vars";

const PRODUCTION_HOSTS = ["nullpingmembersarea.com", "www.nullpingmembersarea.com"];

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function hostnameFromUrlOrHost(raw: string): string | null {
  try {
    const value = raw.includes("://") ? raw : `https://${raw}`;
    const { hostname } = new URL(value);
    return hostname.replace(/\.$/, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function collectAllowedAppHosts(
  env: {
    NEXT_PUBLIC_APP_URL?: string;
    VERCEL_URL?: string;
    NODE_ENV?: string;
  } = process.env
): Set<string> {
  const hosts = new Set<string>(PRODUCTION_HOSTS);
  const add = (raw?: string) => {
    if (!raw?.trim()) return;
    const hostname = hostnameFromUrlOrHost(raw.trim());
    if (hostname) hosts.add(hostname);
  };
  add(env.NEXT_PUBLIC_APP_URL);
  add(env.VERCEL_URL);
  if (env.NODE_ENV !== "production") {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return hosts;
}

export function originFromForwardedHeaders(
  headers: {
    host?: string | null;
    forwardedHost?: string | null;
    forwardedProto?: string | null;
  },
  allowedHosts: Set<string>
): string | null {
  const candidates = [
    headers.forwardedHost?.split(",")[0]?.trim(),
    headers.host?.trim(),
  ].filter((value): value is string => Boolean(value));

  const protocol = headers.forwardedProto?.split(",")[0]?.trim() || "https";

  for (const host of candidates) {
    const hostname = host.split(":")[0]?.replace(/\.$/, "").toLowerCase();
    if (hostname && allowedHosts.has(hostname)) {
      return stripTrailingSlash(`${protocol}://${host}`);
    }
  }
  return null;
}

function getOriginFromRequest(request: Request): string | null {
  try {
    const url = new URL(request.url);
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      url.protocol.replace(":", "");
    return originFromForwardedHeaders(
      {
        host: request.headers.get("host"),
        forwardedHost: request.headers.get("x-forwarded-host"),
        forwardedProto: protocol,
      },
      collectAllowedAppHosts(process.env)
    );
  } catch {
    return null;
  }
}

/** Resolve the public app origin on the server — prefers the live request host over stale env. */
export function getServerAppUrl(request?: Request): string {
  if (request) {
    const origin = getOriginFromRequest(request);
    if (origin) return origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !isLocalhostUrl(configured)) {
    return stripTrailingSlash(configured);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${stripTrailingSlash(vercelUrl)}`;
  }

  if (configured) return stripTrailingSlash(configured);
  if (process.env.NODE_ENV === "production") {
    return "https://nullpingmembersarea.com";
  }
  return stripTrailingSlash(getAppUrl());
}

/** Turn a relative public path into an absolute URL for the current app origin. */
export function resolvePublicUrl(pathOrUrl: string, origin?: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : getServerAppUrl());

  return `${stripTrailingSlash(base)}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
/** Path a site is served at — member-handle URLs for new sites, /m/{slug} for legacy ones. */
export function sitePublicPath(site: { slug: string; owner_handle?: string | null }): string {
  const handle = site.owner_handle?.trim();
  if (handle) return `/${handle}/sites/${site.slug}`;
  return `/m/${site.slug}`;
}

export function buildOfferPageUrl(
  appUrl: string,
  slug: string,
  ownerHandle?: string | null
): string {
  return `${stripTrailingSlash(appUrl)}${sitePublicPath({ slug, owner_handle: ownerHandle })}`;
}

/** Rewrite stored money-page links that used localhost, a wrong host, or a legacy path. */
export function resolveOfferPageLinksInText(text: string, offerPageUrl: string, slug: string): string {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = "(?:\\?[^\\s]*)?";
  return text
    .replace(
      new RegExp(`https?:\\/\\/[^\\s]+\\/[^\\s/]+\\/sites\\/${escapedSlug}${query}`, "gi"),
      offerPageUrl
    )
    .replace(
      new RegExp(`https?:\\/\\/[^\\s]+\\/sites\\/${escapedSlug}${query}`, "gi"),
      offerPageUrl
    )
    .replace(
      new RegExp(`https?:\\/\\/[^\\s]+\\/m\\/${escapedSlug}${query}`, "gi"),
      offerPageUrl
    );
}
