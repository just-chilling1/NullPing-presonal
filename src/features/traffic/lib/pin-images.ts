import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectStructuredScrapedImageCandidates,
  downloadImageForHash,
  fetchPixabayImage,
  MIN_STOCK_PRODUCT_RELEVANCE,
  normalizeImageUrl,
  persistExternalImageWithMeta,
} from "@/features/blog-builder/lib/images";
import {
  MIN_PRODUCT_IMAGE_SCORE,
  scrapePage,
  type ScrapedImageCandidate,
} from "@/features/blog-builder/lib/scrape";
import type { PinCopy } from "@/features/traffic/lib/pin-rules";
import {
  buildProductIdentity,
  productOnlyStockQueries,
  type ProductIdentity,
} from "@/features/traffic/lib/product-identity";
import {
  isImageAlreadyUsed,
  mergeUsedImageRecords,
  recordsFromUrls,
  strongNormalizeImageUrl,
  type UsedImageRecord,
} from "@/features/traffic/lib/image-identity";
import { cleanProductLabel } from "@/features/traffic/lib/product-label";

export { cleanProductLabel } from "@/features/traffic/lib/product-label";
export { strongNormalizeImageUrl } from "@/features/traffic/lib/image-identity";

export type PinImageSource = "product_page" | "pixabay";

export interface ResolvedPinBackground {
  url: string | null;
  normalizedUrl?: string;
  contentHash?: string;
  imageSource?: PinImageSource | null;
  relevanceScore?: number;
  matchReason?: string;
}

/**
 * Product-tagged Flickr photos via LoremFlickr — kept for non-commerce callers only.
 * Commerce pin pipeline must never use this.
 */
export function productPhotoFallbackUrl(productName: string, seed = 0, pinIdx = 0): string | null {
  const cleaned = cleanProductLabel(productName);
  const baseTags = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);
  if (baseTags.length === 0) return null;
  const variants = [
    baseTags,
    [...baseTags].reverse(),
    [...baseTags, "product"].slice(0, 3),
  ];
  const tags = variants[Math.abs(seed + pinIdx * 13) % variants.length] ?? baseTags;
  const lock =
    Math.abs(seed * 7919 + pinIdx * 104729 + tags.join("").length * 31 + pinIdx * 9973) % 1_000_000;
  return `https://loremflickr.com/1200/675/${encodeURIComponent(tags.join(","))}/all?lock=${lock}`;
}

function picsumPinFallbackUrl(productName: string, seed: number): string {
  const safe = Math.abs(seed) || 1;
  return `https://picsum.photos/seed/np-${encodeURIComponent(productName.slice(0, 24))}-${safe}/1200/675`;
}

/**
 * Unique non-AI fallback — NON-commerce features only.
 * Product pin pipeline must never call this.
 */
export function uniquePinFallbackUrl(params: {
  productName: string;
  pinIdx: number;
  usedKeys?: Set<string>;
  hobby?: string | null;
  headlineLen?: number;
}): string | null {
  const productName = cleanProductLabel(params.productName) || params.productName.trim();
  if (!productName) return picsumPinFallbackUrl("product", params.pinIdx);
  const used = params.usedKeys ?? new Set<string>();
  const headlineLen = params.headlineLen ?? 0;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = productPhotoFallbackUrl(
      productName,
      params.pinIdx * 97 + headlineLen * 13 + attempt * 7919 + 42,
      params.pinIdx + attempt
    );
    if (candidate && !used.has(normalizeImageUrl(candidate))) return candidate;
  }
  for (let attempt = 0; attempt < 16; attempt++) {
    const any = picsumPinFallbackUrl(
      productName,
      params.pinIdx * 9973 + headlineLen * 131 + attempt * 17 + 1103
    );
    if (!used.has(normalizeImageUrl(any))) return any;
  }
  return picsumPinFallbackUrl(productName, params.pinIdx + headlineLen + 1);
}

/**
 * Renderer candidates: ONLY the assigned source (and same-URL pinImages backup).
 * Never invents Picsum/LoremFlickr/hero substitutes.
 */
export function pinRenderBackgroundCandidates(params: {
  sourceImageUrl?: string | null;
  pinImageUrl?: string | null;
  heroImage?: string | null;
  productName: string;
  pinIdx: number;
  headline: string;
  hobby?: string | null;
  width?: number;
  height?: number;
  excludeUrls?: (string | null | undefined)[];
}): string[] {
  const candidates = [params.sourceImageUrl, params.pinImageUrl]
    .filter((u): u is string => Boolean(u?.trim()))
    .filter((url) => /^https?:\/\//i.test(url))
    .filter((url) => !/picsum\.photos|loremflickr\.com/i.test(url));

  // Deduplicate same underlying image if both fields point at variants.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of candidates) {
    const key = strongNormalizeImageUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function isGenericFallbackUrl(url: string): boolean {
  return /picsum\.photos|loremflickr\.com/i.test(url);
}

async function claimCandidate(params: {
  url: string;
  score: number;
  reason: string;
  imageSource: PinImageSource;
  registry: UsedImageRecord[];
  userId: string;
  supabase: SupabaseClient;
}): Promise<ResolvedPinBackground | null> {
  if (isGenericFallbackUrl(params.url)) return null;
  const normalizedUrl = strongNormalizeImageUrl(params.url);
  if (isImageAlreadyUsed({ url: params.url, normalizedUrl }, params.registry)) {
    return null;
  }

  let contentHash: string | undefined;
  let finalUrl = params.url;

  try {
    const persisted = await persistExternalImageWithMeta({
      url: params.url,
      userId: params.userId,
      supabase: params.supabase,
    });
    if (persisted) {
      contentHash = persisted.contentHash;
      finalUrl = persisted.url;
      if (
        isImageAlreadyUsed(
          { url: finalUrl, normalizedUrl: strongNormalizeImageUrl(finalUrl), contentHash },
          params.registry
        )
      ) {
        return null;
      }
    } else {
      const downloaded = await downloadImageForHash(params.url);
      if (!downloaded) return null;
      contentHash = downloaded.contentHash;
      if (isImageAlreadyUsed({ url: params.url, normalizedUrl, contentHash }, params.registry)) {
        return null;
      }
    }
  } catch {
    return null;
  }

  const record: UsedImageRecord = {
    normalizedUrl: strongNormalizeImageUrl(finalUrl),
    contentHash,
    sourceUrl: finalUrl,
  };
  params.registry.push(record);

  return {
    url: finalUrl,
    normalizedUrl: record.normalizedUrl,
    contentHash,
    imageSource: params.imageSource,
    relevanceScore: params.score,
    matchReason: params.reason,
  };
}

/**
 * Resolve unique Pinterest pin backgrounds for commerce products.
 * Hierarchy: product-page (≥ threshold) → Pixabay product queries (≥ threshold) → null.
 * Never uses Picsum, LoremFlickr, or generic niche imagery.
 */
export async function resolvePinBackgroundImages(params: {
  pins: PinCopy[];
  productName: string;
  siteTitle?: string | null;
  hobby?: string | null;
  scrapeUrl?: string | null;
  scrapeUrls?: string[];
  preferredImages?: (string | null | undefined)[];
  /** Already-used backgrounds (prior batches) — never reuse these. */
  excludeImages?: (string | null | undefined)[];
  /** Durable used-image registry from sales_page_json. */
  usedIdentities?: UsedImageRecord[];
  userId: string;
  supabase: SupabaseClient;
}): Promise<{
  backgrounds: ResolvedPinBackground[];
  usedIdentities: UsedImageRecord[];
  identity: ProductIdentity;
}> {
  const registry: UsedImageRecord[] = mergeUsedImageRecords(
    [...(params.usedIdentities ?? []), ...recordsFromUrls(params.excludeImages ?? [])],
    []
  );

  // Scrape primary page once for identity meta.
  let pageMeta: Awaited<ReturnType<typeof scrapePage>> = null;
  const primaryUrl = params.scrapeUrl?.trim() || params.scrapeUrls?.[0]?.trim() || "";
  if (primaryUrl) {
    try {
      pageMeta = await scrapePage(primaryUrl);
    } catch {
      pageMeta = null;
    }
  }

  const identity = buildProductIdentity({
    productName: params.productName,
    siteTitle: params.siteTitle,
    hobby: params.hobby,
    pageTitle: pageMeta?.title,
    pageDescription: pageMeta?.description,
    pageH1: pageMeta?.h1,
    brand: pageMeta?.brand,
    canonicalUrl: primaryUrl || undefined,
  });

  console.info(`[PINS] Product: ${identity.normalizedProductName} (${identity.productType})`);

  const hasScrapeTargets = Boolean(
    params.scrapeUrl?.trim() || (params.scrapeUrls?.length ?? 0) > 0
  );

  console.info("[PINS] Scraping product page...");
  const scrapedPool: ScrapedImageCandidate[] = hasScrapeTargets
    ? await collectStructuredScrapedImageCandidates({
        scrapeUrl: params.scrapeUrl,
        scrapeUrls: params.scrapeUrls,
        scrapeKeywords: identity.strongTokens.length
          ? identity.strongTokens
          : identity.productTokens,
        limit: Math.max(24, params.pins.length * 3),
        hardThreshold: MIN_PRODUCT_IMAGE_SCORE,
      })
    : [];

  const validProduct = scrapedPool.filter((c) => c.score >= MIN_PRODUCT_IMAGE_SCORE);
  console.info(`[PINS] Found ${scrapedPool.length} image candidates`);
  console.info(`[PINS] Valid product images: ${validProduct.length}`);

  // Preferred hero only if it is already a valid product candidate (or scores via pool match).
  const preferred = (params.preferredImages ?? [])
    .filter((u): u is string => Boolean(u?.trim() && /^https?:\/\//i.test(u)))
    .filter((u) => !isGenericFallbackUrl(u));

  const heroUrl = preferred[0] ?? null;
  const heroInPool = heroUrl
    ? validProduct.find((c) => strongNormalizeImageUrl(c.url) === strongNormalizeImageUrl(heroUrl))
    : undefined;

  const orderedPool: ScrapedImageCandidate[] = [];
  if (heroInPool) {
    orderedPool.push(heroInPool);
  } else if (heroUrl && pageMeta?.imageUrl && strongNormalizeImageUrl(heroUrl) === strongNormalizeImageUrl(pageMeta.imageUrl)) {
    // Hero is the scraped page primary image — treat as product_page with threshold credit.
    orderedPool.push({
      url: heroUrl,
      score: MIN_PRODUCT_IMAGE_SCORE + 5,
      source: "og-image",
      matchedKeywords: identity.strongTokens.slice(0, 3),
      productEvidence: ["money-page hero matches product page image"],
    });
  }
  for (const c of validProduct) {
    if (orderedPool.some((x) => strongNormalizeImageUrl(x.url) === strongNormalizeImageUrl(c.url))) {
      continue;
    }
    orderedPool.push(c);
  }

  const results: ResolvedPinBackground[] = [];
  let poolIdx = 0;
  let rejectedUnrelated = 0;
  let rejectedDupes = 0;

  for (let i = 0; i < params.pins.length; i++) {
    let assigned: ResolvedPinBackground | null = null;

    while (poolIdx < orderedPool.length && !assigned) {
      const candidate = orderedPool[poolIdx++];
      if (candidate.score < MIN_PRODUCT_IMAGE_SCORE) {
        rejectedUnrelated++;
        console.info(
          `[PINS] rejected image:\nscore=${candidate.score}\nreason=${candidate.productEvidence.join(", ") || "below threshold"}`
        );
        continue;
      }
      if (isImageAlreadyUsed({ url: candidate.url }, registry)) {
        rejectedDupes++;
        continue;
      }
      assigned = await claimCandidate({
        url: candidate.url,
        score: candidate.score,
        reason:
          candidate.productEvidence.join(" + ") ||
          `${candidate.source} score=${candidate.score}`,
        imageSource: "product_page",
        registry,
        userId: params.userId,
        supabase: params.supabase,
      });
      if (!assigned) rejectedDupes++;
    }

    // Pixabay product-only queries when product-page pool is exhausted.
    if (!assigned) {
      const queries = productOnlyStockQueries(identity);
      for (let q = 0; q < queries.length && !assigned; q++) {
        const hit = await fetchPixabayImage(identity.normalizedProductName, identity.normalizedProductName, {
          customQuery: queries[q],
          orientation: "horizontal",
          pickOffset: i * 5 + q,
          seedBoost: i * 19 + q * 5 + registry.length,
          excludeUrls: registry.map((r) => r.sourceUrl || "").filter(Boolean),
          excludeStockIds: registry.map((r) => r.normalizedUrl),
          productTokens: identity.productTokens,
          strongTokens: identity.strongTokens,
          minRelevance: MIN_STOCK_PRODUCT_RELEVANCE,
        });
        if (!hit?.url) continue;
        if ((hit.relevanceScore ?? 0) < MIN_STOCK_PRODUCT_RELEVANCE) {
          rejectedUnrelated++;
          continue;
        }
        if (isImageAlreadyUsed({ url: hit.url }, registry)) {
          rejectedDupes++;
          continue;
        }
        assigned = await claimCandidate({
          url: hit.url,
          score: hit.relevanceScore ?? MIN_STOCK_PRODUCT_RELEVANCE,
          reason: hit.matchReason || `pixabay query: ${queries[q]}`,
          imageSource: "pixabay",
          registry,
          userId: params.userId,
          supabase: params.supabase,
        });
      }
    }

    if (assigned?.url) {
      console.info(
        `[PINS] Pin ${i + 1} -> ${assigned.imageSource} score=${assigned.relevanceScore}`
      );
      results.push(assigned);
    } else {
      console.info(`[PINS] Pin ${i + 1} -> no trustworthy image`);
      results.push({
        url: null,
        imageSource: null,
        relevanceScore: undefined,
        matchReason: "no trustworthy product image",
      });
    }
  }

  console.info(`[PINS] Rejected unrelated images: ${rejectedUnrelated}`);
  console.info(`[PINS] Rejected duplicates: ${rejectedDupes}`);

  return { backgrounds: results, usedIdentities: registry, identity };
}

/** Replace duplicate backgrounds within a batch — null out dupes (no generic fill). */
export function ensureUniquePinBackgrounds(
  backgrounds: (string | null)[],
  _params?: {
    productName: string;
    hobby?: string | null;
    pins: PinCopy[];
  }
): (string | null)[] {
  const used = new Set<string>();
  return backgrounds.map((url) => {
    if (!url) return null;
    if (isGenericFallbackUrl(url)) return null;
    const key = strongNormalizeImageUrl(url);
    if (used.has(key)) return null;
    used.add(key);
    return url;
  });
}
