/**
 * Stronger product identity for pin image selection.
 * Preserves brand/product terms while stripping review fluff.
 */

import { cleanProductLabel, productSearchTokens } from "@/features/traffic/lib/product-label";

export type ProductType =
  | "supplement"
  | "physical"
  | "software"
  | "course"
  | "ebook"
  | "service"
  | "app"
  | "subscription"
  | "financial"
  | "other";

export interface ProductIdentity {
  rawProductName: string;
  normalizedProductName: string;
  brand?: string;
  productTokens: string[];
  strongTokens: string[];
  categoryTokens: string[];
  productType: ProductType;
  pageTitle?: string;
  pageDescription?: string;
  pageH1?: string;
  canonicalUrl?: string;
}

/** Fluff phrases removed from review-style titles without dropping brand terms. */
const REVIEW_FLUFF = [
  /\bshould you (?:buy|skip)\b/gi,
  /\bis .+? worth(?: it)?\b/gi,
  /\ban honest (?:look|review)\b/gi,
  /\bwhat to check(?: first)?\b/gi,
  /\bin plain english\b/gi,
  /\bbefore you buy\b/gi,
  /\breview\b/gi,
  /\bhonest\b/gi,
  /\bworth it\b/gi,
];

const WEAK_TOKENS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "your",
  "you",
  "product",
  "featured",
  "pin",
  "official",
  "site",
  "page",
  "home",
  "shop",
  "store",
  "buy",
  "get",
  "new",
  "best",
]);

const CATEGORY_HINTS: Array<{ type: ProductType; pattern: RegExp; categories: string[] }> = [
  {
    type: "supplement",
    pattern:
      /\b(melatonin|gummies?|supplement|multi[- ]?vitamin|vitamin|capsule|softgel|magnesium|glycinate|serum|collagen|probiotic|omega|blend|digestive|relief|formula|gummy|nootropic|adaptogen|sleep support)\b/i,
    categories: ["supplement", "bottle", "gummies"],
  },
  {
    type: "software",
    pattern: /\b(software|saas|app|dashboard|platform|plugin|extension|api|crm|canva|ai tool)\b/i,
    categories: ["software", "dashboard", "mockup", "interface"],
  },
  {
    type: "course",
    pattern: /\b(course|masterclass|training|bootcamp|academy|curriculum|coaching program)\b/i,
    categories: ["course", "training", "cover"],
  },
  {
    type: "ebook",
    pattern: /\b(ebook|e-book|pdf|guidebook|handbook)\b/i,
    categories: ["ebook", "book", "cover"],
  },
  {
    type: "financial",
    pattern: /\b(invest|trading|forex|crypto|finance|budget|wealth)\b/i,
    categories: ["finance", "investing"],
  },
  {
    type: "app",
    pattern: /\b(mobile app|ios|android|iphone)\b/i,
    categories: ["mobile", "smartphone", "mockup"],
  },
  {
    type: "subscription",
    pattern: /\b(subscription|membership|monthly plan)\b/i,
    categories: ["subscription", "membership"],
  },
  {
    type: "service",
    pattern: /\b(service|agency|consulting|done[- ]for[- ]you)\b/i,
    categories: ["service"],
  },
  {
    type: "physical",
    pattern:
      /\b(gloves?|bottle|kit|gear|equipment|device|gadget|cream|lotion|packing\s*cubes?|cubes?|luggage|suitcase|organizer|carry[- ]?on|backpack|pillow|umbrella|charger|pump|planters?|frames?|lamp|throw|blanket|camera|earbuds?|buds|chair|pump|sheets?|containers?)\b/i,
    categories: ["product", "packaging", "gear", "travel"],
  },
];

export function preserveProductTokens(raw: string): string[] {
  let s = (raw || "").trim();
  if (!s) return [];

  for (const re of REVIEW_FLUFF) {
    s = s.replace(re, " ");
  }

  s = s
    .replace(/\?.*$/, " ")
    .replace(/\s*[—–]\s*.*$/, " ")
    .replace(/\s*:\s*.*$/, " ")
    .trim();

  const tokens = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !WEAK_TOKENS.has(w) && !/^\d+$/.test(w));

  // Prefer preserved tokens; fall back to cleanProductLabel path if empty.
  if (tokens.length > 0) return [...new Set(tokens)];
  return productSearchTokens(cleanProductLabel(raw) || raw);
}

function detectProductType(haystack: string): { type: ProductType; categories: string[] } {
  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(haystack)) {
      return { type: hint.type, categories: hint.categories };
    }
  }
  return { type: "other", categories: ["product"] };
}

function guessBrand(tokens: string[]): string | undefined {
  if (tokens.length === 0) return undefined;
  // First capitalized-looking multi-char token from original is hard; use first strong token.
  const brand = tokens.find((t) => t.length >= 3 && !WEAK_TOKENS.has(t));
  return brand;
}

export function buildProductIdentity(params: {
  productName: string;
  siteTitle?: string | null;
  hobby?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageH1?: string | null;
  brand?: string | null;
  canonicalUrl?: string | null;
}): ProductIdentity {
  const raw = (params.productName || "").trim();
  const fromClean = cleanProductLabel(raw) || raw;
  const preserved = preserveProductTokens(raw);
  const fromPage = [
    ...preserveProductTokens(params.pageTitle || ""),
    ...preserveProductTokens(params.pageH1 || ""),
    ...preserveProductTokens(params.brand || ""),
  ];

  const productTokens = [...new Set([...preserved, ...fromPage, ...productSearchTokens(fromClean)])];
  const strongTokens = productTokens.filter((t) => t.length >= 3).slice(0, 8);
  const haystack = [
    raw,
    params.siteTitle,
    params.hobby,
    params.pageTitle,
    params.pageDescription,
    params.pageH1,
    params.brand,
  ]
    .filter(Boolean)
    .join(" ");

  const { type, categories } = detectProductType(haystack);
  const normalized =
    strongTokens.length > 0
      ? strongTokens.slice(0, 5).join(" ")
      : fromClean || raw;

  return {
    rawProductName: raw,
    normalizedProductName: normalized,
    brand: params.brand?.trim() || guessBrand(strongTokens),
    productTokens,
    strongTokens,
    categoryTokens: categories,
    productType: type,
    pageTitle: params.pageTitle?.trim() || undefined,
    pageDescription: params.pageDescription?.trim() || undefined,
    pageH1: params.pageH1?.trim() || undefined,
    canonicalUrl: params.canonicalUrl?.trim() || undefined,
  };
}

/** Progressive product-only Pixabay queries — never bare niche lifestyle. */
export function productOnlyStockQueries(identity: ProductIdentity): string[] {
  const name = identity.normalizedProductName.trim();
  const strong = identity.strongTokens;
  const brand = identity.brand;
  const queries: string[] = [];
  const core = strong.slice(0, 2).join(" ") || name;

  // Prefer multi-word product queries first — bare ingredient names (e.g. "melatonin")
  // often return 0 Pixabay hits while "melatonin supplement" works.
  switch (identity.productType) {
    case "supplement":
      if (core) {
        queries.push(
          `${core} supplement`,
          `${core} supplement bottle`,
          `${core} gummies`,
          `${core} vitamins`,
          "supplement bottle",
          "vitamin gummies"
        );
      }
      break;
    case "software":
    case "app":
      if (core) {
        queries.push(
          `${core} software mockup`,
          `${core} app interface`,
          `${core} dashboard ui`,
          `${core} saas product`
        );
      }
      break;
    case "course":
      if (core) {
        queries.push(
          `${core} course workbook`,
          `${core} online course`,
          `${core} training materials`,
          `${core} masterclass`
        );
      }
      break;
    case "ebook":
      if (core) queries.push(`${core} ebook`, `${core} book cover`);
      break;
    case "physical":
      if (core) {
        queries.push(
          `${core} product`,
          `${core} gear`,
          `${core} equipment`,
          `${core} packing`,
          `${core} travel accessory`,
          `${core} organizer`,
          core
        );
      }
      // Common travel-organizer products need explicit luggage framing.
      if (/\b(packing|cube|cubes|organizer|luggage|carry)\b/i.test(name)) {
        queries.unshift(
          "packing cubes luggage",
          "travel packing cubes",
          "luggage organizer cubes",
          "suitcase packing cubes",
          "travel organizer bag"
        );
      }
      break;
    default:
      if (strong.length === 1) {
        queries.push(core, `${core} ball`, `${core} sport`, `${core} equipment`, `${core} product`);
      } else if (core) {
        queries.push(core, `${core} product`, `${core} gear`);
      }
  }

  if (name && !queries.includes(name)) queries.push(name);
  if (brand && strong.length > 1) {
    queries.push([brand, ...strong.filter((t) => t !== brand).slice(0, 2)].join(" "));
  }
  if (strong.length >= 2) queries.push(strong.slice(0, 3).join(" "));

  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 10);
}
