import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectScrapedImageCandidates,
  fetchAnyFallbackImage,
  normalizeImageUrl,
  persistExternalImage,
  pickUnusedScrapedImageUrl,
} from "@/features/blog-builder/lib/images";
import { SiteImagePool } from "@/features/blog-builder/lib/site-image-pool";
import { inferNicheKey } from "@/features/money-page/lib/niche";
import type { PinCopy } from "@/features/traffic/lib/pin-rules";
import {
  cleanProductLabel,
  productSearchTokens,
} from "@/features/traffic/lib/product-label";

export { cleanProductLabel } from "@/features/traffic/lib/product-label";

const NICHE_STOCK_QUERIES: Record<string, string[]> = {
  health: ["sleep supplement", "wellness product", "health supplement bottle", "nighttime wellness"],
  fitness: ["boxing gloves", "fitness workout gym", "workout product", "sports training"],
  finance: ["laptop desk productivity", "finance notebook", "investing desk"],
  marketing: ["laptop app workspace", "digital marketing desk", "software dashboard"],
  selfhelp: ["journal planner desk", "personal development notebook", "motivation workspace"],
  beauty: ["skincare product bottle", "serum bottle", "beauty product"],
  education: ["online course study desk", "learning notebook", "student laptop"],
  business: ["home office workspace", "entrepreneur desk laptop", "business notebook"],
  travel: ["pet product", "travel lifestyle photo", "home garden outdoor"],
};

/** Pixabay queries anchored to the cleaned product name — never pin-headline fluff. */
function productStockQueries(productName: string, hobby?: string | null): string[] {
  const cleaned = cleanProductLabel(productName);
  const tokens = productSearchTokens(cleaned);
  const base = tokens.length > 0 ? tokens.join(" ") : "";
  const niche = inferNicheKey(cleaned, hobby || "");
  const nicheQueries = NICHE_STOCK_QUERIES[niche] ?? [];

  if (!base) {
    const hobbyBits = productSearchTokens(hobby || "");
    return [
      ...nicheQueries,
      ...(hobbyBits.length
        ? [`${hobbyBits.slice(0, 4).join(" ")} product`, hobbyBits.slice(0, 3).join(" ")]
        : []),
    ]
      .filter(Boolean)
      .slice(0, 8);
  }

  const queries = [`${base} product`, `${base} bottle`, base, ...nicheQueries];

  if (/melatonin/i.test(cleaned)) {
    queries.unshift("melatonin supplement bottle", "melatonin sleep aid");
  }

  const combat = /box|glove|mma|martial|kick|sparr|punch/i.test(`${cleaned} ${hobby || ""}`);
  if (combat) {
    if (/glove/i.test(cleaned)) {
      queries.push("boxing gloves", "mma gloves", "red boxing glove", "sparring gloves");
    } else {
      queries.push("boxing training", "punching bag", "boxing ring");
    }
  }

  const fitness = /fitness|gym|sport|workout/i.test(hobby || "");
  if (fitness && !combat) queries.push(`${tokens[0]} fitness`);

  return [...new Set(queries.filter(Boolean))].slice(0, 8);
}

/**
 * Product-tagged Flickr photos via LoremFlickr — works without API keys and
 * stays related to the product (unlike random Picsum).
 * Rotates tag order/variants by seed so pins do not share the same lock+tags.
 */
export function productPhotoFallbackUrl(productName: string, seed = 0, pinIdx = 0): string | null {
  const cleaned = cleanProductLabel(productName);
  const baseTags = productSearchTokens(cleaned).slice(0, 3);
  if (baseTags.length === 0) return null;
  const variants = [
    baseTags,
    [...baseTags].reverse(),
    [...baseTags, "product"].slice(0, 3),
    [...baseTags, "lifestyle"].slice(0, 3),
    [baseTags[0], "photo", "product"].filter(Boolean),
    [...baseTags, "review"].slice(0, 3),
    [...baseTags, "wellness"].slice(0, 3),
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
 * Unique non-AI fallback for a pin slot after scrape retries fail.
 * LoremFlickr tagged photos first, then any Picsum image.
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
 * Ordered background candidates for the pin OG image renderer.
 * Never fall back to the shared money-page hero for pins after the first —
 * that caused every pin to show the same unrelated photo when primary URLs failed.
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
  /** Backgrounds already used by sibling pins — never reuse at render time. */
  excludeUrls?: (string | null | undefined)[];
}): string[] {
  const cleaned = cleanProductLabel(params.productName) || params.productName;
  const excluded = new Set(
    (params.excludeUrls ?? [])
      .filter((url): url is string => Boolean(url?.trim()))
      .map((url) => normalizeImageUrl(url))
  );
  const uniqueFallback = productPhotoFallbackUrl(
    cleaned,
    params.pinIdx * 17 + params.headline.length + 3,
    params.pinIdx
  );
  const anyFallback = picsumPinFallbackUrl(
    cleaned || "product",
    params.pinIdx * 17 + params.headline.length + 3
  );

  const candidates = [
    params.sourceImageUrl,
    params.pinImageUrl,
    uniqueFallback,
    anyFallback,
  ];

  // Shared hero only for pin 0, and only as last resort.
  if (params.pinIdx === 0) {
    candidates.push(params.heroImage);
  }

  return candidates
    .filter((u): u is string => Boolean(u?.trim()))
    .filter((url) => !excluded.has(normalizeImageUrl(url)));
}

/**
 * Resolve unique Pinterest pin backgrounds:
 * unused scraped affiliate images → Pixabay stock → any non-AI photo.
 *
 * Each image URL is assigned at most once per batch.
 */
export async function resolvePinBackgroundImages(params: {
  pins: PinCopy[];
  productName: string;
  hobby?: string | null;
  scrapeUrl?: string | null;
  scrapeUrls?: string[];
  preferredImages?: (string | null | undefined)[];
  /** Already-used backgrounds (prior batches) — never reuse these. */
  excludeImages?: (string | null | undefined)[];
  userId: string;
  supabase: SupabaseClient;
}): Promise<(string | null)[]> {
  const pool = new SiteImagePool();
  const results: (string | null)[] = [];
  const usedKeys = new Set<string>();

  const productName = cleanProductLabel(params.productName) || params.productName.trim();

  const collectHttpUrls = (list: (string | null | undefined)[] | undefined) =>
    [
      ...new Set(
        (list ?? []).filter((u): u is string => {
          if (typeof u !== "string") return false;
          const trimmed = u.trim();
          return trimmed.length > 0 && /^https?:\/\//i.test(trimmed) && !/picsum\.photos/i.test(trimmed);
        })
      ),
    ];

  const preferred = collectHttpUrls(params.preferredImages);
  const excluded = collectHttpUrls(params.excludeImages);

  const markUsed = (...urls: (string | null | undefined)[]) => {
    for (const url of urls) {
      if (!url?.trim()) continue;
      usedKeys.add(normalizeImageUrl(url));
      pool.seed([{ url, stockId: normalizeImageUrl(url) }]);
    }
  };

  const isUsed = (url: string | null | undefined) =>
    Boolean(url?.trim() && usedKeys.has(normalizeImageUrl(url)));

  const heroForFirstPin = preferred[0] ?? null;

  // Exclude prior/extra-batch images and preferred aliases — but leave the first-pin
  // hero free so it can be claimed exactly once.
  markUsed(...excluded, ...preferred.slice(1));
  if (heroForFirstPin) {
    pool.seed([{ url: heroForFirstPin, stockId: normalizeImageUrl(heroForFirstPin) }]);
  }

  const stockQueries = productStockQueries(productName, params.hobby);
  const productTokens = productSearchTokens(productName);

  const hasScrapeTargets = Boolean(
    params.scrapeUrl?.trim() || (params.scrapeUrls?.length ?? 0) > 0
  );
  const scrapedCandidates = hasScrapeTargets
    ? await collectScrapedImageCandidates({
        scrapeUrl: params.scrapeUrl,
        scrapeUrls: params.scrapeUrls,
        scrapeKeywords: productTokens,
        limit: Math.max(24, params.pins.length * 3),
      })
    : [];

  const excludeForImages = () => [...usedKeys];

  const pickUnusedFallback = (pinIdx: number, headlineLen: number): string | null =>
    uniquePinFallbackUrl({
      productName,
      pinIdx,
      usedKeys,
      hobby: params.hobby,
      headlineLen,
    });

  for (let i = 0; i < params.pins.length; i++) {
    const pin = params.pins[i];
    const keywords = [
      ...productTokens,
      ...(pin.keywords ?? []).flatMap((k) => productSearchTokens(cleanProductLabel(k))),
    ].slice(0, 12);

    let chosen: string | null = null;

    // 1) At most one known product photo (money-page hero) on the first pin.
    if (i === 0 && heroForFirstPin && !isUsed(heroForFirstPin)) {
      chosen = heroForFirstPin;
    }

    // 2) Next unused scraped affiliate image — each scraped URL at most once per batch.
    if (!chosen && scrapedCandidates.length > 0) {
      const scraped = await pickUnusedScrapedImageUrl({
        candidates: scrapedCandidates,
        excludeUrls: excludeForImages(),
      });
      if (scraped && !isUsed(scraped)) {
        chosen = scraped;
      }
    }

    // 3) Product-name Pixabay stock (never re-scrape through the pool).
    if (!chosen) {
      const queryList =
        stockQueries.length > 0 ? stockQueries : [productName.trim()].filter(Boolean);
      const rotated = [
        ...queryList.slice(i % Math.max(queryList.length, 1)),
        ...queryList.slice(0, i % Math.max(queryList.length, 1)),
      ];
      for (let q = 0; q < rotated.length && !chosen; q++) {
        try {
          const resolved = await pool.resolveUnique({
            title: cleanedTitleForStock(pin, productName),
            subject: [
              productName,
              "Photorealistic product photo matching this exact product",
              "horizontal landscape composition",
              "no text overlay",
            ].join(". "),
            hobby: params.hobby?.trim() || undefined,
            scrapeKeywords: keywords.length ? keywords : productTokens,
            pickOffset: i * 5 + q,
            seedBoost: i * 19 + q * 5 + keywords.length + (pin.headline?.length ?? 0) + usedKeys.size,
            customQuery: rotated[q],
            orientation: "horizontal",
            preferStock: true,
            allowPicsumFallback: false,
          });
          if (resolved.url && !isUsed(resolved.url)) {
            chosen = resolved.url;
          }
        } catch {
          // try next query
        }
      }
    }

    // 4) Any non-AI photo after scrape retries — Pixabay/Picsum, then tagged fallback.
    if (!chosen || isUsed(chosen)) {
      const anyImage = await fetchAnyFallbackImage({
        title: productName || pin.title || "product",
        subject: productName,
        hobby: params.hobby ?? undefined,
        seedOffset: i * 19 + (pin.headline?.length ?? 0) + usedKeys.size,
      });
      if (anyImage && !isUsed(anyImage)) {
        chosen = anyImage;
      } else {
        chosen = pickUnusedFallback(i, pin.headline?.length ?? 0);
      }
    }

    if (!chosen || isUsed(chosen)) {
      results.push(null);
      continue;
    }

    try {
      const persisted = await persistExternalImage({
        url: chosen,
        userId: params.userId,
        supabase: params.supabase,
      });
      let finalUrl = persisted ?? chosen;

      // Persisted CDN path might collide with an earlier pin — force a fresh fallback.
      if (isUsed(finalUrl) && normalizeImageUrl(finalUrl) !== normalizeImageUrl(chosen)) {
        const retry = pickUnusedFallback(i, (pin.headline?.length ?? 0) + 13);
        if (!retry) {
          results.push(null);
          continue;
        }
        chosen = retry;
        const persistedRetry = await persistExternalImage({
          url: retry,
          userId: params.userId,
          supabase: params.supabase,
        });
        finalUrl = persistedRetry ?? retry;
        if (isUsed(finalUrl)) {
          results.push(null);
          continue;
        }
      } else if (isUsed(finalUrl)) {
        results.push(null);
        continue;
      }

      results.push(finalUrl);
      markUsed(chosen, finalUrl);
    } catch {
      if (isUsed(chosen)) {
        results.push(null);
        continue;
      }
      results.push(chosen);
      markUsed(chosen);
    }

    // If pin 0 skipped the hero, still burn it so later pins never reuse it.
    if (i === 0 && heroForFirstPin && !isUsed(heroForFirstPin)) {
      markUsed(heroForFirstPin);
    }
  }

  return ensureUniquePinBackgrounds(results, {
    productName,
    hobby: params.hobby,
    pins: params.pins,
  });
}

/** Replace duplicate backgrounds within a batch — each pin gets a unique image URL. */
export function ensureUniquePinBackgrounds(
  backgrounds: (string | null)[],
  params: {
    productName: string;
    hobby?: string | null;
    pins: PinCopy[];
  }
): (string | null)[] {
  const used = new Set<string>();
  return backgrounds.map((url, idx) => {
    if (url) {
      const key = normalizeImageUrl(url);
      if (!used.has(key)) {
        used.add(key);
        return url;
      }
    }

    for (let attempt = 0; attempt < 24; attempt++) {
      const replacement = uniquePinFallbackUrl({
        productName: params.productName,
        pinIdx: idx + attempt,
        usedKeys: used,
        hobby: params.hobby,
        headlineLen: (params.pins[idx]?.headline?.length ?? 0) + attempt * 7,
      });
      if (!replacement) continue;
      const replacementKey = normalizeImageUrl(replacement);
      if (used.has(replacementKey)) continue;
      used.add(replacementKey);
      return replacement;
    }

    return url;
  });
}

function cleanedTitleForStock(pin: PinCopy, productName: string): string {
  return productName || pin.title || pin.headline || "product";
}
