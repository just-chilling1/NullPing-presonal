/**
 * Stronger product identity for pin image selection.
 * Preserves brand/product terms while stripping review fluff.
 */

import {
  cleanProductLabel,
  productDisplayName,
  productSearchTokens,
} from "@/features/traffic/lib/product-label";

export type ProductType =
  | "supplement"
  | "apparel"
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
  /** Title-cased name for pin copy ("Polo Shirt"). */
  displayName: string;
  /** Head noun of the product phrase — "polo shirt" → "shirt". */
  headNoun: string;
  /** True when the name is a plain category noun rather than a brand. */
  isGenericNoun: boolean;
  /** Stock-photo tags that prove the image is a different subject entirely. */
  negativeTags: string[];
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
    type: "apparel",
    pattern:
      /\b(t[- ]?shirts?|tees?|polos?|shirts?|hoodies?|sweatshirts?|sweaters?|jumpers?|cardigans?|jackets?|coats?|blazers?|trousers?|jeans|joggers|leggings|skirts?|dress(?:es)?|blouses?|suits?|uniforms?|socks?|underwear|briefs|boxers|swimsuits?|swimwear|bikinis?|activewear|sportswear|loungewear|pyjamas?|pajamas?|robes?|sneakers?|trainers?|shoes?|boots?|sandals?|slippers?|heels?|loafers?|hats?|caps?|beanies?|scarves|scarf|belts?|apparel|clothing|garments?|outfits?)\b/i,
    categories: ["clothing", "apparel", "fashion", "textile"],
  },
  {
    type: "physical",
    pattern:
      /\b(football|soccer|basketball|volleyball|tennis|golf|racket|racquet|dumbbells?|kettlebells?|treadmill|yoga mat|helmet|skateboard|bicycle|bike|surfboard)\b/i,
    categories: ["sport", "equipment", "fitness"],
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

/** Plain category nouns — a name ending in one of these is a generic item, not a brand. */
const GENERIC_HEAD_NOUNS = new Set([
  "shirt", "tshirt", "tee", "polo", "hoodie", "sweater", "sweatshirt", "jacket", "coat",
  "blazer", "pants", "trousers", "jeans", "shorts", "joggers", "leggings", "skirt", "dress",
  "blouse", "suit", "uniform", "socks", "underwear", "swimsuit", "pajamas", "robe",
  "sneakers", "trainers", "shoes", "boots", "sandals", "slippers", "hat", "cap", "beanie",
  "scarf", "belt", "gloves", "watch", "bag", "backpack", "wallet", "luggage", "suitcase",
  "cubes", "organizer", "mug", "bottle", "pillow", "blanket", "lamp", "chair", "desk",
  "mattress", "sheets", "towel", "brush", "kit", "cream", "serum", "lotion", "shampoo",
  "soap", "perfume", "supplement", "supplements", "gummies", "vitamins", "capsules",
  "tablets", "powder", "tea", "coffee", "course", "ebook", "book", "guide", "planner",
  "template", "app", "software", "tracker", "subscription", "membership", "charger",
  "earbuds", "headphones", "speaker", "camera", "monitor", "keyboard", "toy", "collar",
  "leash", "treats",
]);

/**
 * Words that mean something entirely different in stock-photo tags.
 * A guard only fires when the product itself is not about that other subject
 * (so "polo horse mallet" keeps equestrian imagery, "polo shirt" does not).
 */
const HOMONYM_GUARDS: Array<{ token: string; avoid: string[] }> = [
  {
    token: "polo",
    avoid: ["horse", "horses", "equestrian", "pony", "rider", "riding", "saddle", "jockey", "mallet", "stallion"],
  },
  { token: "boxer", avoid: ["dog", "puppy", "canine"] },
  { token: "boxers", avoid: ["dog", "puppy", "canine"] },
  { token: "mouse", avoid: ["rodent", "rat", "mammal", "wildlife"] },
  { token: "apple", avoid: ["fruit", "orchard", "harvest"] },
  { token: "bass", avoid: ["fish", "fishing", "angler"] },
  { token: "crane", avoid: ["bird", "stork", "heron"] },
  { token: "jaguar", avoid: ["wildlife", "jungle", "predator"] },
  { token: "puma", avoid: ["wildlife", "cougar", "predator"] },
  { token: "tank", avoid: ["military", "army", "war", "soldier"] },
  { token: "mint", avoid: ["herb", "leaves", "plant"] },
  { token: "palm", avoid: ["tree", "beach", "tropical"] },
  { token: "rocket", avoid: ["space", "launch", "nasa", "spacecraft"] },
  { token: "bolt", avoid: ["lightning", "thunder", "storm"] },
];

/** Subjects that are never the product, per category. */
const CATEGORY_NEGATIVE_TAGS: Partial<Record<ProductType, string[]>> = {
  apparel: ["horse", "equestrian", "fruit", "vegetable", "landscape", "architecture", "real estate"],
  supplement: ["horse", "landscape", "architecture", "real estate"],
  software: ["fruit", "vegetable", "landscape", "livestock"],
};

function buildNegativeTags(params: {
  tokens: string[];
  productType: ProductType;
  haystack: string;
}): string[] {
  const haystack = params.haystack.toLowerCase();
  const mentionsInProduct = (term: string) =>
    new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i").test(
      haystack
    );

  const out = new Set<string>();

  for (const guard of HOMONYM_GUARDS) {
    if (!params.tokens.includes(guard.token)) continue;
    // The product genuinely belongs to the other subject — leave its imagery alone.
    if (guard.avoid.some(mentionsInProduct)) continue;
    for (const term of guard.avoid) out.add(term);
  }

  for (const term of CATEGORY_NEGATIVE_TAGS[params.productType] ?? []) {
    if (mentionsInProduct(term)) continue;
    out.add(term);
  }

  return [...out];
}

/**
 * Grammatical noun phrase for mid-sentence copy:
 * generic singular → "a polo shirt", plural → "packing cubes", brand → "SleepWell Melatonin Gummies".
 */
export function productSubjectPhrase(identity: ProductIdentity): string {
  const display = identity.displayName || identity.normalizedProductName;
  if (!identity.isGenericNoun) return display;

  const lower = display.toLowerCase();
  const head = identity.headNoun;
  const isPlural = head.endsWith("s") && !head.endsWith("ss");
  if (isPlural) return lower;
  return `${/^[aeiou]/i.test(lower) ? "an" : "a"} ${lower}`;
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

  // Head noun comes from the product name alone — page tokens must not hijack it.
  const nameTokens = preserved.length > 0 ? preserved : productSearchTokens(fromClean);
  const headNoun = nameTokens[nameTokens.length - 1] ?? "";
  const hasBrandCasing = raw.split(/[^A-Za-z0-9]+/).some((w) => w.length > 1 && /[A-Z]/.test(w.slice(1)));
  const isGenericNoun = GENERIC_HEAD_NOUNS.has(headNoun) && !hasBrandCasing;

  return {
    rawProductName: raw,
    normalizedProductName: normalized,
    displayName: productDisplayName(raw),
    headNoun,
    isGenericNoun,
    negativeTags: buildNegativeTags({ tokens: nameTokens, productType: type, haystack }),
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
    case "apparel": {
      // Always pair with a clothing word — bare "polo shirt" returns equestrian photos.
      const head = identity.headNoun || "clothing";
      if (core) {
        queries.push(
          `${core} clothing`,
          `${core} apparel`,
          `${core} fashion`,
          `${core} textile`
        );
      }
      queries.push(`${head} clothing`, `${head} apparel`, `folded ${head}`);
      break;
    }
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
      if (core) {
        queries.push(core, `${core} product`, `${core} closeup`, `${core} isolated`);
      }
  }

  if (name && !queries.includes(name)) queries.push(name);
  if (brand && strong.length > 1) {
    queries.push([brand, ...strong.filter((t) => t !== brand).slice(0, 2)].join(" "));
  }
  if (strong.length >= 2) queries.push(strong.slice(0, 3).join(" "));

  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 10);
}
