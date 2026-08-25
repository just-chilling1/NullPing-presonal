import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/api-auth";
import { scrapePageWithCache } from "@/features/blog-builder/lib/scrape-cache";
import {
  fetchNicheRelatedImage,
  normalizeImageUrl,
  persistExternalImage,
} from "@/features/blog-builder/lib/images";
import { resolvePinBackgroundImages } from "@/features/traffic/lib/pin-images";
import { productSearchTokens } from "@/features/traffic/lib/product-label";
import type { VaultCatalogEntry } from "./catalog";
import { buildVaultPinDrafts, type VaultPinDraft } from "./vault-pins";

/** Hero + 10 pins per vault page. */
export const VAULT_IMAGE_SLOT_COUNT = 11;
/** At least 25% of images must be niche/product-related stock (never AI). */
export const VAULT_NICHE_IMAGE_RATIO = 0.25;

function nicheRelatedSlotCount(total = VAULT_IMAGE_SLOT_COUNT): number {
  return Math.max(1, Math.ceil(total * VAULT_NICHE_IMAGE_RATIO));
}

function markUsed(used: Set<string>, url: string | null | undefined) {
  if (url?.trim()) used.add(normalizeImageUrl(url));
}

/**
 * Resolve one unique product-relevant image for a vault seed slot when the
 * full pin resolver is unavailable. Prefer product-token stock; empty string
 * when nothing trustworthy is found (never Picsum/LoremFlickr for product pins).
 */
export async function resolveUniqueVaultImage(params: {
  entry: VaultCatalogEntry;
  slot: number;
  used: Set<string>;
  nicheRelated: boolean;
}): Promise<string> {
  const { entry, slot, used, nicheRelated } = params;
  let chosen: string | null = null;

  if (nicheRelated) {
    const stock = await fetchNicheRelatedImage({
      niche: entry.productName,
      productName: entry.productName,
      seedOffset: entry.id * 31 + slot * 19 + used.size,
      excludeUrls: [...used],
    });
    if (stock && !used.has(normalizeImageUrl(stock))) {
      chosen = stock;
    }
  }

  if (!chosen || used.has(normalizeImageUrl(chosen))) {
    return "";
  }

  markUsed(used, chosen);
  return chosen;
}

/**
 * Pre-seed image pack for one catalog entry: no sales-page hero + 10 pin backgrounds.
 * Pins use the shared product pin resolver (product-page scrape → Pixabay product queries).
 * Empty pin slots are allowed when no trustworthy product image exists.
 */
export async function resolveVaultSeedImagePack(params: {
  entry: VaultCatalogEntry;
  used?: Set<string>;
  admin: SupabaseClient;
  ownerId: string;
}): Promise<{ heroImage: string; pinImages: string[] }> {
  const used = params.used ?? new Set<string>();
  const pinDrafts = await resolveVaultPinDrafts({
    entry: params.entry,
    heroImage: "",
    excludeImages: [...used],
    userId: params.ownerId,
    supabase: params.admin,
    preloadedPinImages: null,
    scrapeUrl: null,
  });

  const pinImages = pinDrafts.map((draft) => draft.imageUrl?.trim() || "");
  for (const url of pinImages) {
    markUsed(used, url);
  }

  return { heroImage: "", pinImages };
}

/** Scrape the affiliate page, else a product-related stock photo. Empty = no sales-page image. */
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
    if (hero && !used.has(normalizeImageUrl(hero))) {
      markUsed(used, hero);
      return hero;
    }
  }

  const nicheImage = await fetchNicheRelatedImage({
    niche: params.productName,
    productName: params.productName,
    excludeUrls: [...used],
  });
  if (nicheImage && !used.has(normalizeImageUrl(nicheImage))) {
    markUsed(used, nicheImage);
    return nicheImage;
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

  if (params.preloadedPinImages?.length) {
    const results: VaultPinDraft[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      let finalUrl = params.preloadedPinImages[i]?.trim() || "";
      if (finalUrl && /picsum\.photos|loremflickr\.com/i.test(finalUrl)) {
        finalUrl = "";
      }
      if (finalUrl) markUsed(used, finalUrl);

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

      results.push({ ...draft, imageUrl: finalUrl });
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
      userId: params.userId,
      supabase: params.supabase,
    });

    return drafts.map((draft, i) => ({
      ...draft,
      imageUrl: backgrounds[i]?.url || "",
    }));
  }

  // Without supabase, only use product-token stock — never generic fallbacks.
  const results: VaultPinDraft[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const stock = await fetchNicheRelatedImage({
      niche: params.entry.productName,
      productName: params.entry.productName,
      seedOffset: i * 19 + productSearchTokens(params.entry.productName).length,
      excludeUrls: [...used],
    });
    let chosen = stock && !used.has(normalizeImageUrl(stock)) ? stock : "";
    if (chosen) markUsed(used, chosen);
    results.push({ ...drafts[i], imageUrl: chosen });
  }
  return results;
}
