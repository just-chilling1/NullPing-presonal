import {
  collectStructuredScrapedImageCandidates,
  fetchPixabayImageCandidates,
  MIN_STOCK_PRODUCT_RELEVANCE,
  normalizeImageUrl,
} from "@/features/blog-builder/lib/images";
import { MIN_PRODUCT_IMAGE_SCORE } from "@/features/blog-builder/lib/scrape";
import {
  buildProductIdentity,
  productOnlyStockQueries,
} from "@/features/traffic/lib/product-identity";

export type HeroCandidateFetcher = (params: {
  query: string;
  productName: string;
  excludeUrls: string[];
  productTokens: string[];
  strongTokens: string[];
  categoryTokens: string[];
  pickOffset: number;
  seedBoost: number;
}) => Promise<Array<{ url: string; relevanceScore?: number }>>;

const DEFAULT_COUNT = 5;

function isGenericFallbackUrl(url: string): boolean {
  return /picsum\.photos|loremflickr\.com/i.test(url);
}

async function defaultFetchCandidates(params: {
  query: string;
  productName: string;
  excludeUrls: string[];
  productTokens: string[];
  strongTokens: string[];
  categoryTokens: string[];
  pickOffset: number;
  seedBoost: number;
}): Promise<Array<{ url: string; relevanceScore?: number }>> {
  return fetchPixabayImageCandidates(params.productName, params.productName, {
    customQuery: params.query,
    orientation: "horizontal",
    pickOffset: params.pickOffset,
    seedBoost: params.seedBoost,
    excludeUrls: params.excludeUrls,
    productTokens: params.productTokens,
    strongTokens: params.strongTokens,
    categoryTokens: params.categoryTokens,
    minRelevance: MIN_STOCK_PRODUCT_RELEVANCE,
    limit: 12,
  });
}

/**
 * Product-related photos for the money page hero picker.
 * Prefers real product-page images, then product-identity stock — never bare niche lifestyle shots.
 */
export async function fetchMoneyPageHeroOptions(params: {
  niche?: string | null;
  productName?: string;
  siteTitle?: string | null;
  pageDescription?: string | null;
  /** Product / affiliate URLs to scrape for real offer images first. */
  scrapeUrls?: string[];
  count?: number;
  excludeUrls?: string[];
  fetchCandidates?: HeroCandidateFetcher;
}): Promise<string[]> {
  const count = Math.max(0, Math.min(params.count ?? DEFAULT_COUNT, 10));
  if (count === 0) return [];

  const productName = params.productName?.trim() || "product";
  const identity = buildProductIdentity({
    productName,
    siteTitle: params.siteTitle,
    hobby: params.niche,
    pageDescription: params.pageDescription,
  });

  const excludeUrls = [...(params.excludeUrls ?? [])];
  const used = new Set(excludeUrls.map((url) => normalizeImageUrl(url)));
  const out: string[] = [];

  const scrapeTargets = (params.scrapeUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));

  if (scrapeTargets.length > 0) {
    try {
      const scraped = await collectStructuredScrapedImageCandidates({
        scrapeUrls: scrapeTargets,
        scrapeKeywords: identity.strongTokens.length > 0 ? identity.strongTokens : identity.productTokens,
        limit: count * 2,
        hardThreshold: MIN_PRODUCT_IMAGE_SCORE,
      });
      for (const candidate of scraped) {
        if (out.length >= count) break;
        const url = candidate.url?.trim();
        if (!url || isGenericFallbackUrl(url)) continue;
        const key = normalizeImageUrl(url);
        if (used.has(key)) continue;
        used.add(key);
        out.push(url);
        excludeUrls.push(url);
      }
    } catch {
      /* stock fallback below */
    }
  }

  if (out.length >= count) return out;

  const queries = productOnlyStockQueries(identity);
  if (queries.length === 0) return out;

  const fetchCandidates = params.fetchCandidates ?? defaultFetchCandidates;

  for (let q = 0; q < queries.length && out.length < count; q++) {
    const hits = await fetchCandidates({
      query: queries[q],
      productName: identity.normalizedProductName,
      excludeUrls,
      productTokens: identity.productTokens,
      strongTokens: identity.strongTokens,
      categoryTokens: identity.categoryTokens,
      pickOffset: q * 5 + out.length,
      seedBoost: q * 31 + out.length * 17,
    });

    for (const hit of hits) {
      if (out.length >= count) break;
      const url = hit.url?.trim();
      if (!url || isGenericFallbackUrl(url)) continue;
      if ((hit.relevanceScore ?? 0) < MIN_STOCK_PRODUCT_RELEVANCE) continue;
      const key = normalizeImageUrl(url);
      if (used.has(key)) continue;
      used.add(key);
      out.push(url);
      excludeUrls.push(url);
    }
  }

  return out;
}
