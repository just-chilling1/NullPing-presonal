import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/api-auth";
import { scrapePageWithCache } from "@/features/blog-builder/lib/scrape-cache";
import {
  fetchPixabayImageCandidates,
  MIN_STOCK_PRODUCT_RELEVANCE,
  normalizeImageUrl,
  persistExternalImage,
} from "@/features/blog-builder/lib/images";
import { resolvePinBackgroundImages } from "@/features/traffic/lib/pin-images";
import {
  buildProductIdentity,
  productOnlyStockQueries,
} from "@/features/traffic/lib/product-identity";
import { recordsFromUrls } from "@/features/traffic/lib/image-identity";
import type { VaultCatalogEntry } from "./catalog";
import { buildVaultPinDrafts, type VaultPinDraft } from "./vault-pins";

/** Hero + 10 pins per vault page. */
export const VAULT_IMAGE_SLOT_COUNT = 11;

/** Stricter than default commerce pins — empty is better than fruit/lifestyle fillers. */
export const VAULT_MIN_STOCK_RELEVANCE = 78;

function isGenericFallbackUrl(url: string): boolean {
  return /picsum\.photos|loremflickr\.com/i.test(url);
}

function markUsed(used: Set<string>, url: string | null | undefined) {
  if (url?.trim() && !isGenericFallbackUrl(url)) used.add(normalizeImageUrl(url));
}

/**
 * Product-only Pixabay fill for a single vault slot (no niche lifestyle queries).
 * Used when the full pin resolver is unavailable.
 */
export async function resolveUniqueVaultImage(params: {
  entry: VaultCatalogEntry;
  slot: number;
  used: Set<string>;
  nicheRelated?: boolean;
}): Promise<string> {
  const { entry, slot, used } = params;
  const identity = buildProductIdentity({
    productName: entry.productName,
    hobby: entry.niche,
  });
  const queries = productOnlyStockQueries(identity);

  for (let q = 0; q < queries.length; q++) {
    const hits = await fetchPixabayImageCandidates(identity.normalizedProductName, identity.normalizedProductName, {
      customQuery: queries[q],
      orientation: "all",
      pickOffset: slot * 5 + q,
      seedBoost: entry.id * 31 + slot * 19 + used.size,
      excludeUrls: [...used],
      productTokens: identity.productTokens,
      strongTokens: identity.strongTokens,
      categoryTokens: identity.categoryTokens,
      minRelevance: VAULT_MIN_STOCK_RELEVANCE,
      limit: 12,
    });
    for (const hit of hits) {
      if (!hit?.url || isGenericFallbackUrl(hit.url)) continue;
      if ((hit.relevanceScore ?? 0) < VAULT_MIN_STOCK_RELEVANCE) continue;
      const tryUrl = hit.url;
      if (used.has(normalizeImageUrl(tryUrl))) continue;
      markUsed(used, tryUrl);
      return tryUrl;
    }
  }

  return "";
}

/**
 * Pre-seed image pack: 10 pin backgrounds via the shared product pin resolver.
 * Hero is always empty — Unlimited money pages are text-only.
 * Empty pin slots when no trustworthy product image exists.
 */
export async function resolveVaultSeedImagePack(params: {
  entry: VaultCatalogEntry;
  used?: Set<string>;
  admin: SupabaseClient;
  ownerId: string;
  scrapeUrl?: string | null;
}): Promise<{ heroImage: string; pinImages: string[] }> {
  const used = params.used ?? new Set<string>();
  const pinDrafts = await resolveVaultPinDrafts({
    entry: params.entry,
    scrapeUrl: params.scrapeUrl ?? null,
    heroImage: "",
    excludeImages: [...used],
    userId: params.ownerId,
    supabase: params.admin,
    preloadedPinImages: null,
  });

  const pinImages = pinDrafts.map((draft) => draft.imageUrl?.trim() || "");
  for (const url of pinImages) {
    markUsed(used, url);
  }

  return { heroImage: "", pinImages };
}

/**
 * Sales-page hero: scrape affiliate page first, then product-only Pixabay.
 * Never LoremFlickr / Picsum / generic niche lifestyle.
 */
export async function resolveVaultHeroImage(params: {
  productName: string;
  niche: string;
  scrapeUrl?: string | null;
  used?: Set<string>;
}): Promise<string> {
  const scrapeUrl = params.scrapeUrl?.trim() || "";
  const used = params.used ?? new Set<string>();

  if (scrapeUrl) {
    const admin = getServiceRoleClient();
    const scraped = await scrapePageWithCache(scrapeUrl, admin);
    const hero = scraped.data?.imageUrl?.trim() || "";
    if (hero && !isGenericFallbackUrl(hero) && !used.has(normalizeImageUrl(hero))) {
      markUsed(used, hero);
      return hero;
    }
  }

  const identity = buildProductIdentity({
    productName: params.productName,
    hobby: params.niche,
  });
  const queries = productOnlyStockQueries(identity);
  for (let q = 0; q < queries.length; q++) {
    const hits = await fetchPixabayImageCandidates(identity.normalizedProductName, identity.normalizedProductName, {
      customQuery: queries[q],
      orientation: "all",
      pickOffset: q,
      seedBoost: used.size + q * 17,
      excludeUrls: [...used],
      productTokens: identity.productTokens,
      strongTokens: identity.strongTokens,
      categoryTokens: identity.categoryTokens,
      minRelevance: MIN_STOCK_PRODUCT_RELEVANCE,
      limit: 8,
    });
    for (const hit of hits) {
      if (!hit?.url || isGenericFallbackUrl(hit.url)) continue;
      if ((hit.relevanceScore ?? 0) < MIN_STOCK_PRODUCT_RELEVANCE) continue;
      if (used.has(normalizeImageUrl(hit.url))) continue;
      markUsed(used, hit.url);
      return hit.url;
    }
  }

  return "";
}

/**
 * 10 vault pin backgrounds via the shared product-accurate pin resolver.
 * Prefer empty over unrelated niche imagery.
 */
export async function resolveVaultPinDrafts(params: {
  entry: VaultCatalogEntry;
  scrapeUrl?: string | null;
  heroImage?: string | null;
  /** When provided (e.g. from seed), use these URLs in order instead of resolving. */
  preloadedPinImages?: string[] | null;
  /** URLs already used in this vault batch — never reuse across templates. */
  excludeImages?: string[];
  userId?: string;
  supabase?: SupabaseClient | null;
}): Promise<VaultPinDraft[]> {
  const drafts = buildVaultPinDrafts(params.entry);
  const scrapeUrl = params.scrapeUrl?.trim() || "";
  const used = new Set<string>();
  markUsed(used, params.heroImage);
  for (const url of params.excludeImages ?? []) {
    markUsed(used, url);
  }

  const sanitizePreloaded = (url: string | undefined | null) => {
    const trimmed = url?.trim() || "";
    if (!trimmed || isGenericFallbackUrl(trimmed)) return "";
    return trimmed;
  };

  if (params.preloadedPinImages?.length) {
    const results: VaultPinDraft[] = [];
    const needResolveIdx: number[] = [];
    const pending = drafts.map((draft, i) => {
      const pre = sanitizePreloaded(params.preloadedPinImages?.[i]);
      if (pre && !used.has(normalizeImageUrl(pre))) {
        markUsed(used, pre);
        return { ...draft, imageUrl: pre };
      }
      needResolveIdx.push(i);
      return { ...draft, imageUrl: "" };
    });

    if (needResolveIdx.length > 0 && params.userId && params.supabase) {
      const { backgrounds } = await resolvePinBackgroundImages({
        pins: needResolveIdx.map((i) => ({
          headline: drafts[i].headline,
          title: drafts[i].title,
          description: drafts[i].description,
          keywords: drafts[i].keywords ?? [],
        })),
        productName: params.entry.productName,
        hobby: params.entry.niche,
        scrapeUrl: scrapeUrl || null,
        preferredImages: [],
        excludeImages: [
          ...(params.excludeImages ?? []),
          ...(params.heroImage ? [params.heroImage] : []),
          ...Object.values(pending)
            .map((p) => p.imageUrl)
            .filter(Boolean),
        ],
        usedIdentities: recordsFromUrls([
          ...(params.excludeImages ?? []),
          params.heroImage,
          ...pending.map((p) => p.imageUrl),
        ]),
        minStockRelevance: VAULT_MIN_STOCK_RELEVANCE,
        userId: params.userId,
        supabase: params.supabase,
      });
      needResolveIdx.forEach((draftIdx, bi) => {
        const url = backgrounds[bi]?.url || "";
        pending[draftIdx] = { ...pending[draftIdx], imageUrl: url };
        markUsed(used, url);
      });
    } else if (needResolveIdx.length > 0) {
      for (const draftIdx of needResolveIdx) {
        const url = await resolveUniqueVaultImage({
          entry: params.entry,
          slot: draftIdx + 1,
          used,
        });
        pending[draftIdx] = { ...pending[draftIdx], imageUrl: url };
      }
    }

    for (let i = 0; i < pending.length; i++) {
      let finalUrl = pending[i].imageUrl;
      if (finalUrl && params.userId && params.supabase) {
        try {
          const persisted = await persistExternalImage({
            url: finalUrl,
            userId: params.userId,
            supabase: params.supabase,
          });
          finalUrl = persisted ?? finalUrl;
          markUsed(used, finalUrl);
        } catch {
          /* keep remote URL */
        }
      }
      results.push({ ...pending[i], imageUrl: finalUrl });
    }
    return results;
  }

  if (params.userId && params.supabase) {
    const { backgrounds } = await resolvePinBackgroundImages({
      pins: drafts.map((d) => ({
        headline: d.headline,
        title: d.title,
        description: d.description,
        keywords: d.keywords ?? [],
      })),
      productName: params.entry.productName,
      hobby: params.entry.niche,
      scrapeUrl: scrapeUrl || null,
      preferredImages: params.heroImage ? [params.heroImage] : [],
      excludeImages: [
        ...(params.excludeImages ?? []),
        ...(params.heroImage ? [params.heroImage] : []),
      ],
      usedIdentities: recordsFromUrls([...(params.excludeImages ?? []), params.heroImage]),
      minStockRelevance: VAULT_MIN_STOCK_RELEVANCE,
      userId: params.userId,
      supabase: params.supabase,
    });

    return drafts.map((draft, i) => ({
      ...draft,
      imageUrl: backgrounds[i]?.url || "",
    }));
  }

  // No supabase — still use product-only Pixabay (same relevance rules).
  const results: VaultPinDraft[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const url = await resolveUniqueVaultImage({
      entry: params.entry,
      slot: i + 1,
      used,
    });
    results.push({ ...drafts[i], imageUrl: url });
  }
  return results;
}
