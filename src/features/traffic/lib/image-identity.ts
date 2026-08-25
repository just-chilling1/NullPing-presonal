/**
 * Content-based image identity for pin uniqueness across batches.
 */

import { createHash } from "crypto";

export interface UsedImageRecord {
  normalizedUrl: string;
  contentHash?: string;
  sourceUrl?: string;
  pinId?: string;
  batchId?: string;
}

/** CDN-stable key: host + path with common size/transform suffixes stripped. */
export function strongNormalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .replace(
        /_(\d+x\d+|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|master|1200x)(?=\.[a-z0-9]+$)/i,
        ""
      )
      .replace(/-(\d{2,4})x(\d{2,4})(?=\.[a-z0-9]+$)/i, "")
      .replace(/\._[A-Z0-9,_]+_\./, ".");
    return `${parsed.hostname}${path}`.toLowerCase();
  } catch {
    return (url.split("?")[0] ?? url).toLowerCase();
  }
}

export function hashImageBuffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function parseUsedPinImageIdentities(salesPageJson: unknown): UsedImageRecord[] {
  if (!salesPageJson || typeof salesPageJson !== "object") return [];
  const raw = (salesPageJson as { usedPinImageIdentities?: unknown }).usedPinImageIdentities;
  if (!Array.isArray(raw)) return [];
  const out: UsedImageRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const normalizedUrl =
      typeof row.normalizedUrl === "string" ? row.normalizedUrl.trim() : "";
    if (!normalizedUrl) continue;
    out.push({
      normalizedUrl,
      contentHash: typeof row.contentHash === "string" ? row.contentHash : undefined,
      sourceUrl: typeof row.sourceUrl === "string" ? row.sourceUrl : undefined,
      pinId: typeof row.pinId === "string" ? row.pinId : undefined,
      batchId: typeof row.batchId === "string" ? row.batchId : undefined,
    });
  }
  return out;
}

export function mergeUsedImageRecords(
  existing: UsedImageRecord[],
  additions: UsedImageRecord[]
): UsedImageRecord[] {
  const byKey = new Map<string, UsedImageRecord>();
  const keyOf = (r: UsedImageRecord) =>
    r.contentHash ? `h:${r.contentHash}` : `u:${r.normalizedUrl}`;

  for (const r of [...existing, ...additions]) {
    if (!r.normalizedUrl && !r.contentHash) continue;
    byKey.set(keyOf(r), r);
    if (r.normalizedUrl) byKey.set(`u:${r.normalizedUrl}`, r);
    if (r.contentHash) byKey.set(`h:${r.contentHash}`, r);
  }
  return [...byKey.values()].filter(
    (r, i, arr) =>
      arr.findIndex(
        (x) =>
          x.normalizedUrl === r.normalizedUrl &&
          (x.contentHash || "") === (r.contentHash || "")
      ) === i
  );
}

export function isImageAlreadyUsed(
  candidate: { url?: string | null; contentHash?: string | null; normalizedUrl?: string | null },
  registry: UsedImageRecord[]
): boolean {
  const norm =
    candidate.normalizedUrl?.trim() ||
    (candidate.url?.trim() ? strongNormalizeImageUrl(candidate.url) : "");
  const hash = candidate.contentHash?.trim() || "";

  for (const used of registry) {
    if (hash && used.contentHash && hash === used.contentHash) return true;
    if (norm && used.normalizedUrl && norm === used.normalizedUrl) return true;
    if (candidate.url && used.sourceUrl && strongNormalizeImageUrl(used.sourceUrl) === norm) {
      return true;
    }
  }
  return false;
}

export function recordsFromUrls(urls: (string | null | undefined)[]): UsedImageRecord[] {
  const out: UsedImageRecord[] = [];
  for (const url of urls) {
    if (!url?.trim() || !/^https?:\/\//i.test(url)) continue;
    if (/picsum\.photos|loremflickr\.com/i.test(url)) continue;
    out.push({
      normalizedUrl: strongNormalizeImageUrl(url),
      sourceUrl: url.trim(),
    });
  }
  return out;
}
