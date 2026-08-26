import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "169.254.169.254",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80")
  );
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIpv4(host);
  if (ipVersion === 6) return isPrivateIpv6(host);
  return false;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new Error("Private or local URLs are not allowed");
  }
  return url;
}

export async function assertPublicHttpsUrlResolved(raw: string): Promise<URL> {
  const url = assertPublicHttpsUrl(raw);
  if (isIP(url.hostname)) return url;

  try {
    const records = await lookup(url.hostname, { all: true });
    if (records.length === 0) throw new Error("Host could not be resolved");
    for (const rec of records) {
      if (isPrivateOrLocalHost(rec.address)) {
        throw new Error("Host resolves to a private address");
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("private")) throw err;
    throw new Error("Host could not be resolved");
  }

  return url;
}

export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new Error("Private or local URLs are not allowed");
  }
  return url;
}

/** Like assertPublicHttpsUrlResolved, but allows http as well (remote images). */
export async function assertPublicHttpUrlResolved(raw: string): Promise<URL> {
  const url = assertPublicHttpUrl(raw);
  if (isIP(url.hostname)) return url;

  try {
    const records = await lookup(url.hostname, { all: true });
    if (records.length === 0) throw new Error("Host could not be resolved");
    for (const rec of records) {
      if (isPrivateOrLocalHost(rec.address)) {
        throw new Error("Host resolves to a private address");
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("private")) throw err;
    throw new Error("Host could not be resolved");
  }

  return url;
}

const BLOCKED_IMAGE_HOSTS = /picsum\.photos|loremflickr\.com/i;

/**
 * Pin/hero image sources must be public http(s) after DNS resolution,
 * or an already-inlined data:image URL. Private/metadata hosts are rejected.
 */
export async function resolvePublicImageSourceUrl(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (BLOCKED_IMAGE_HOSTS.test(trimmed)) return null;
  try {
    return (await assertPublicHttpUrlResolved(trimmed)).toString();
  } catch {
    return null;
  }
}
