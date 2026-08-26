const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/\.$/, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function requestHasAuthCookie(
  request: { cookies: { getAll: () => { name: string }[] } }
): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

/**
 * CSRF guard for cookie-authenticated mutating API calls.
 * Unauthenticated POSTs (forgot-password, support) are not CSRF-sensitive
 * the same way — those are rate-limited separately.
 */
export function allowMutatingApiRequest(
  request: Request,
  opts: { hasAuthCookie: boolean; allowedHosts: Set<string> }
): boolean {
  const method = request.method.toUpperCase();
  if (!MUTATING.has(method)) return true;
  if (!opts.hasAuthCookie) return true;

  const origin = request.headers.get("origin");
  if (origin) {
    const host = hostnameFromUrl(origin);
    return Boolean(host && opts.allowedHosts.has(host));
  }

  const referer = request.headers.get("referer");
  if (referer) {
    const host = hostnameFromUrl(referer);
    return Boolean(host && opts.allowedHosts.has(host));
  }

  return false;
}
