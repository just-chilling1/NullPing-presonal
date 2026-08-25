import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapWithConcurrency } from "./concurrency";
import { resolvePremiumNicheValue } from "@/lib/premium-niches";
import { SiteImagePool } from "./site-image-pool";
import { scrapeImageFromUrl, scrapeRelevantImagesFromUrl, scrapeRelevantImageCandidates, SCRAPE_USER_AGENT, MIN_PRODUCT_IMAGE_SCORE, type ScrapedImageCandidate } from "./scrape";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const RAPIDAPI_IMAGE_HOST =
  process.env.RAPIDAPI_IMAGE_HOST ?? "google-nano-banana4.p.rapidapi.com";
const RAPIDAPI_IMAGE_CREATE_PATH =
  process.env.RAPIDAPI_IMAGE_CREATE_PATH ?? "index.php";
const RAPIDAPI_IMAGE_OUTPUT_PATH =
  process.env.RAPIDAPI_IMAGE_OUTPUT_PATH ?? "index.php";
const RAPIDAPI_IMAGE_OUTPUT_QUERY =
  process.env.RAPIDAPI_IMAGE_OUTPUT_QUERY ?? "id";

// PR Labs (chatgpt-42) text-to-image — same RapidAPI key/subscription as text.
const RAPIDAPI_TEXT_HOST = process.env.RAPIDAPI_HOST ?? "chatgpt-42.p.rapidapi.com";
const RAPIDAPI_TEXTTOIMAGE_PATH = process.env.RAPIDAPI_TEXTTOIMAGE_PATH ?? "texttoimage3";
const TEXTTOIMAGE_TIMEOUT_MS = 45_000;

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY ?? "";
const PIXABAY_TIMEOUT_MS = 5_000;
const SCRAPE_IMAGE_TIMEOUT_MS = 15_000;

const NANO_TIMEOUT_MS = 12_000;
const ULTRA_FAST_CREATE_TIMEOUT_MS = 25_000;
const ULTRA_FAST_POLL_TIMEOUT_MS = 8_000;
const ULTRA_FAST_MAX_POLLS = 20;
const ULTRA_FAST_POLL_INTERVAL_MS = 1_500;
const POLLINATIONS_TIMEOUT_MS = 10_000;
const FAST_POLLINATIONS_TIMEOUT_MS = 7_000;
const FAST_PICSUM_TIMEOUT_MS = 4_000;

export const IMAGE_RESOLUTION_CONCURRENCY = Number(
  process.env.IMAGE_RESOLUTION_CONCURRENCY ?? 4
);

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "your",
  "best", "top", "guide", "review", "reviews", "vs", "under", "how", "what",
  "why", "is", "are", "buyers", "buyer", "buying", "tips", "avoid", "mistakes",
  "honest", "worth", "picks", "week", "simple", "plan", "first", "beginner",
  "beginners", "advanced", "pro", "insider", "maximize", "results", "budget",
  "growth", "tools", "tool", "magic", "tube", "2026", "2025", "2024",
]);

/** Visual search phrases that match what stock libraries actually have. */
export const HOBBY_VISUAL_QUERIES: Record<string, string> = {
  "YouTube / AI Tools": "youtube creator video editing laptop studio",
  "Pet Training": "dog training happy owner puppy",
  "Health Supplements": "health wellness vitamins supplements",
  "Online Education": "online learning student laptop classroom",
  "Financial Education": "personal finance budget planning desk",
  "Presentations / Software": "business presentation laptop office",
  "Affiliate Marketing": "online business entrepreneur laptop",
  "Dating / Relationships": "happy couple relationship together",
  "AI Writing Tools": "writer laptop content creation desk",
  "AI Platform": "artificial intelligence technology computer office",
  sleep: "sleep bedroom night rest pillow",
  "boxing & combat sports": "boxing gloves sparring training",
  "health & fitness": "fitness workout gym training",
  beauty: "skincare beauty serum bottle",
  "make money": "laptop desk productivity workspace",
  software: "laptop workspace software dashboard",
  pets: "happy pet dog owner home",
  education: "study desk books learning",
};

function tokenizeForQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

/** Build a concise Pixabay search query — hobby visuals first, not product brand names. */
function buildPixabayQuery(title: string, subject: string, hobby?: string): string {
  const hobbyHint = hobby?.trim() ? HOBBY_VISUAL_QUERIES[hobby.trim()] : undefined;
  const subjectTokens = new Set(tokenizeForQuery(subject));
  const titleTokens = tokenizeForQuery(title).filter((w) => !subjectTokens.has(w));

  if (hobbyHint) {
    const extra = titleTokens.slice(0, 2).join(" ");
    return `${hobbyHint}${extra ? ` ${extra}` : ""}`.slice(0, 100);
  }

  const words = tokenizeForQuery(`${subject} ${title}`);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    unique.push(w);
    if (unique.length >= 5) break;
  }

  return unique.join(" ").slice(0, 100);
}

interface PixabayHit {
  id?: number;
  largeImageURL?: string;
  webformatURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  tags?: string;
  pageURL?: string;
  user?: string;
}

interface ImagePickOptions {
  pickOffset?: number;
  excludeUrls?: string[];
  excludeStockIds?: string[];
  hobby?: string;
  /** Extra seed variation (e.g. post index) so similar titles pick different hits. */
  seedBoost?: number;
  /** Override the built Pixabay query string. */
  customQuery?: string;
  orientation?: "horizontal" | "vertical" | "all";
  /** Prefer roughly square hits — useful for social thread cards. */
  preferSquare?: boolean;
  /** When set, try stock photos before scraping the affiliate page. */
  preferStock?: boolean;
}

export interface StockImageResult {
  url: string;
  stockId: string;
  tags?: string;
  relevanceScore?: number;
  matchReason?: string;
}

/** Minimum Pixabay relevance for commerce product pins. */
export const MIN_STOCK_PRODUCT_RELEVANCE = 70;

export interface ImageRelevance {
  score: number;
  matchedTokens: string[];
  reason: string;
}

export function scoreStockProductRelevance(params: {
  query: string;
  tags?: string;
  pageURL?: string;
  productTokens: string[];
  strongTokens: string[];
}): ImageRelevance {
  // Score against image metadata only — the query always contains product tokens.
  const haystack = `${params.tags ?? ""} ${params.pageURL ?? ""}`.toLowerCase();
  const matched: string[] = [];
  let score = 20;

  for (const token of params.strongTokens) {
    if (token.length > 2 && haystack.includes(token.toLowerCase())) {
      matched.push(token);
      // First strong token match is enough to clear the commerce threshold (~70).
      score += matched.length === 1 ? 55 : 12;
    }
  }
  for (const token of params.productTokens) {
    if (token.length > 2 && !matched.includes(token) && haystack.includes(token.toLowerCase())) {
      matched.push(token);
      score += 10;
    }
  }

  // Generic lifestyle tags without product tokens → reject
  if (
    matched.length === 0 &&
    /\b(bedroom|lifestyle|office|workspace|laptop|desk|wellness|fitness|gym|beautiful|woman|couple|sleeping)\b/i.test(
      haystack
    )
  ) {
    score -= 40;
  }

  // Product packaging / ball / bottle cues help when tokens match
  if (
    matched.length > 0 &&
    /\b(bottle|supplement|gummies|packaging|product|serum|ball|gloves?|kit|box)\b/i.test(haystack)
  ) {
    score += 8;
  }

  if (matched.length >= 2) score += 8;
  if (matched.length === 0) score -= 30;

  const reason =
    matched.length > 0
      ? `stock tokens: ${matched.slice(0, 5).join(", ")}`
      : "weak stock token match";

  return { score: Math.max(0, Math.min(100, score)), matchedTokens: matched, reason };
}

export function normalizeImageUrl(url: string): string {
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

function isExcludedUrl(url: string, excludeUrls: string[]): boolean {
  const key = normalizeImageUrl(url);
  return excludeUrls.some((ex) => normalizeImageUrl(ex) === key || ex === url);
}

function stockIdForHit(hit: PixabayHit, imageUrl: string): string {
  return hit.id ? `pixabay:${hit.id}` : normalizeImageUrl(imageUrl);
}

/**
 * Look up a relevant free stock photo from Pixabay.
 */
export async function fetchPixabayImage(
  title: string,
  subject: string,
  options?: ImagePickOptions & {
    productTokens?: string[];
    strongTokens?: string[];
    minRelevance?: number;
  }
): Promise<StockImageResult | null> {
  if (!PIXABAY_API_KEY) {
    console.warn("[images] PIXABAY_API_KEY not set — skipping stock photos");
    return null;
  }

  const query =
    options?.customQuery?.trim() ||
    buildPixabayQuery(title, subject, options?.hobby);
  if (!query) return null;

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", PIXABAY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", options?.orientation ?? "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", "40");
  url.searchParams.set("min_width", "800");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(PIXABAY_TIMEOUT_MS) });
    if (!response.ok) return null;

    const data = (await response.json()) as { hits?: PixabayHit[] };
    let hits = (data.hits ?? []).filter((h) => h.largeImageURL || h.webformatURL);

    if (options?.preferSquare) {
      const squareish = hits.filter((h) => {
        const w = h.imageWidth ?? 0;
        const hgt = h.imageHeight ?? 1;
        const ratio = w / hgt;
        return ratio > 0.75 && ratio < 1.33;
      });
      if (squareish.length > 0) hits = squareish;
    } else if (options?.orientation === "vertical") {
      // Keep portrait hits when vertical was requested (do not filter to landscape).
      const vertical = hits.filter((h) => (h.imageHeight ?? 0) >= (h.imageWidth ?? 1));
      if (vertical.length > 0) hits = vertical;
    } else if (options?.orientation === "horizontal") {
      hits = hits.filter((h) => (h.imageWidth ?? 0) >= (h.imageHeight ?? 1));
    }
    if (hits.length === 0) return null;

    const seed =
      title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + (options?.seedBoost ?? 0) * 17;
    const offset = options?.pickOffset ?? 0;
    const exclude = options?.excludeUrls ?? [];
    const excludeIds = new Set(options?.excludeStockIds ?? []);
    const productTokens = options?.productTokens ?? [];
    const strongTokens = options?.strongTokens ?? productTokens;
    const minRelevance = options?.minRelevance;

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[(seed + offset + i) % hits.length];
      const imageUrl = hit.largeImageURL || hit.webformatURL || null;
      if (!imageUrl) continue;
      const stockId = stockIdForHit(hit, imageUrl);
      if (excludeIds.has(stockId)) continue;
      if (isExcludedUrl(imageUrl, exclude)) continue;

      let relevance: ImageRelevance | null = null;
      if (typeof minRelevance === "number" && (productTokens.length > 0 || strongTokens.length > 0)) {
        relevance = scoreStockProductRelevance({
          query,
          tags: hit.tags,
          pageURL: hit.pageURL,
          productTokens,
          strongTokens,
        });
        if (relevance.score < minRelevance) continue;
      }

      console.info("[images] pixabay hit", query.slice(0, 48));
      return {
        url: imageUrl,
        stockId,
        tags: hit.tags,
        relevanceScore: relevance?.score,
        matchReason: relevance?.reason,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPixabayImageUrl(
  title: string,
  subject: string,
  options?: ImagePickOptions
): Promise<string | null> {
  const hit = await fetchPixabayImage(title, subject, options);
  return hit?.url ?? null;
}

function picsumFallbackUrl(title: string, seedOffset = 0): string {
  const seed = title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + seedOffset;
  return `https://picsum.photos/seed/sms-${seed}/1200/800`;
}

/** Last-resort photo after scrape retries fail — stock, then any Picsum image. */
export async function fetchAnyFallbackImage(params: {
  title: string;
  subject?: string;
  hobby?: string;
  seedOffset?: number;
}): Promise<string> {
  const related = await fetchNicheRelatedImage({
    niche: params.hobby,
    productName: params.title,
    seedOffset: params.seedOffset,
  });
  if (related) return related;
  return picsumFallbackUrl(params.title, params.seedOffset ?? 0);
}

const NICHE_PHOTO_QUERIES: Record<string, string[]> = {
  health: ["sleep bedroom night", "peaceful sleep bed", "wellness supplement"],
  fitness: ["boxing gloves training", "fitness workout gym", "healthy lifestyle training"],
  finance: ["laptop desk productivity", "home office workspace", "finance planning desk"],
  marketing: ["laptop workspace software", "digital marketing desk", "computer dashboard office"],
  selfhelp: ["journal planner desk", "personal development workspace", "motivation notebook"],
  beauty: ["skincare serum bottle", "beauty vanity skincare"],
  education: ["study desk books", "student laptop learning"],
  business: ["entrepreneur desk laptop", "business workspace office"],
  travel: ["happy dog owner", "travel lifestyle outdoor", "home garden patio"],
};

/**
 * Niche-related stock photo only. Returns null when nothing matching is found —
 * callers should omit the image rather than show a random unrelated photo.
 */
export async function fetchNicheRelatedImage(params: {
  niche?: string | null;
  productName?: string;
  seedOffset?: number;
  excludeUrls?: string[];
  excludeStockIds?: string[];
}): Promise<string | null> {
  const niche = params.niche?.trim() || "";
  const nicheKey = resolvePremiumNicheValue(niche) ?? niche;
  const productName = params.productName?.trim() || niche || "product";
  const queries = [
    ...(NICHE_PHOTO_QUERIES[nicheKey] ?? []),
    HOBBY_VISUAL_QUERIES[niche],
    niche,
  ].filter((q): q is string => Boolean(q?.trim()));
  const excludeUrls = params.excludeUrls ?? [];
  const excludeStockIds = params.excludeStockIds ?? [];

  for (const query of queries) {
    const hit = await fetchPixabayImage(productName, niche || productName, {
      customQuery: query,
      hobby: niche || undefined,
      seedBoost: params.seedOffset,
      excludeUrls,
      excludeStockIds,
    });
    if (hit?.url && !isExcludedUrl(hit.url, excludeUrls)) return hit.url;
  }
  return null;
}

function findBase64InResponse(val: unknown, depth = 0): string | null {
  if (depth > 8 || val == null) return null;
  if (typeof val === "string") {
    const s = val.trim();
    if (s.startsWith("data:image")) {
      const comma = s.indexOf(",");
      return comma !== -1 ? s.slice(comma + 1) : null;
    }
    const compact = s.replace(/\s/g, "");
    if (compact.length > 200 && /^[A-Za-z0-9+/]+=*$/.test(compact)) {
      return compact;
    }
    return null;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const found = findBase64InResponse(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof val === "object") {
    for (const v of Object.values(val as Record<string, unknown>)) {
      const found = findBase64InResponse(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function isUltraFastNanoBananaHost(host: string): boolean {
  return host.includes("ultra-fast-nano-banana");
}

function rapidApiHeaders(host: string): Record<string, string> {
  return {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": host,
    "Content-Type": "application/json",
  };
}

function findRemoteImageUrl(val: unknown, depth = 0): string | null {
  if (depth > 8 || val == null) return null;

  if (typeof val === "string") {
    const s = val.trim();
    if (/^https?:\/\//i.test(s) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(s)) {
      return s;
    }
    if (/^https?:\/\//i.test(s) && s.includes("image")) return s;
    return null;
  }

  if (Array.isArray(val)) {
    for (const item of val) {
      const found = findRemoteImageUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const preferredKeys = [
      "imageUrl",
      "image_url",
      "resultImageUrl",
      "result_image_url",
      "output_url",
      "url",
      "image",
    ];
    for (const key of preferredKeys) {
      const v = obj[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
    for (const v of Object.values(obj)) {
      const found = findRemoteImageUrl(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function findTaskId(val: unknown, depth = 0): string | null {
  if (depth > 8 || val == null) return null;

  if (typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    const preferredKeys = ["task_id", "taskId", "request_id", "requestId", "id", "job_id"];
    for (const key of preferredKeys) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
    }
    for (const v of Object.values(obj)) {
      const found = findTaskId(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

async function bufferFromRapidApiImageResponse(data: unknown): Promise<Buffer | null> {
  const b64 = findBase64InResponse(data);
  if (b64) return Buffer.from(b64, "base64");

  const remoteUrl = findRemoteImageUrl(data);
  if (remoteUrl) return fetchImageBuffer(remoteUrl, 15_000);

  return null;
}

function looksLikeImageBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer.subarray(0, 8).toString("ascii") === "\x89PNG\r\n\x1a\n") return true;
  const gif = buffer.subarray(0, 6).toString("ascii");
  if (gif === "GIF87a" || gif === "GIF89a") return true;
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

function urlLooksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif|bmp)(\?|$)/i.test(url) || /\/image/i.test(url);
}

async function fetchImageBuffer(
  url: string,
  timeoutMs: number,
  referer?: string
): Promise<Buffer | null> {
  try {
    const { assertPublicHttpUrlResolved } = await import("@/lib/safe-url");
    const safeUrl = (await assertPublicHttpUrlResolved(url)).toString();

    const headers: Record<string, string> = {
      "User-Agent": SCRAPE_USER_AGENT,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    };
    if (referer) headers.Referer = referer;

    const response = await fetch(safeUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 800) return null;

    if (type.startsWith("image/")) return buffer;
    if (type.includes("octet-stream") && (urlLooksLikeImage(url) || looksLikeImageBytes(buffer))) {
      return buffer;
    }
    if (!type || type.includes("binary")) {
      if (looksLikeImageBytes(buffer) || urlLooksLikeImage(url)) return buffer;
    }
    return null;
  } catch {
    return null;
  }
}

/** Scrape og:image / product image from a page via ScraperAPI. Returns null when unavailable. */
async function resolveScrapedImage(
  scrapeUrl: string
): Promise<{ url: string; buffer: Buffer } | null> {
  try {
    const url = await scrapeImageFromUrl(scrapeUrl);
    if (!url) return null;
    const buffer = await fetchImageBuffer(url, SCRAPE_IMAGE_TIMEOUT_MS, scrapeUrl);
    if (!buffer || buffer.length < 800) return null;
    console.info("[images] scraped page image", scrapeUrl.slice(0, 64));
    return { url, buffer };
  } catch {
    return null;
  }
}

async function fetchScrapedImageUrl(
  scrapeUrl: string,
  scrapeKeywords?: string[],
  pickOffset = 0,
  excludeUrls: string[] = []
): Promise<string | null> {
  if (scrapeKeywords && scrapeKeywords.length > 0) {
    const ranked = await scrapeRelevantImagesFromUrl(scrapeUrl, {
      keywords: scrapeKeywords,
      limit: 8,
    });
    for (let i = 0; i < ranked.length; i++) {
      const candidate = ranked[(pickOffset + i) % ranked.length];
      if (isExcludedUrl(candidate, excludeUrls)) continue;
      const buffer = await fetchImageBuffer(candidate, SCRAPE_IMAGE_TIMEOUT_MS, scrapeUrl);
      if (buffer && buffer.length >= 800) {
        console.info("[images] scraped relevant page image", scrapeUrl.slice(0, 64));
        return candidate;
      }
    }
  }

  const scraped = await resolveScrapedImage(scrapeUrl);
  if (scraped?.url && !isExcludedUrl(scraped.url, excludeUrls)) return scraped.url;
  return null;
}

/** Merge scraped page images from all targets, deduped in stable order. */
export async function collectScrapedImageCandidates(params: {
  scrapeUrl?: string | null;
  scrapeUrls?: string[];
  scrapeKeywords?: string[];
  limit?: number;
}): Promise<string[]> {
  const structured = await collectStructuredScrapedImageCandidates(params);
  return structured.map((c) => c.url);
}

const structuredScrapeCache = new Map<string, { at: number; candidates: ScrapedImageCandidate[] }>();
const STRUCTURED_SCRAPE_CACHE_TTL_MS = 10 * 60 * 1000;

function normalizeProductPageCacheKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Drop common tracking params but keep path identity.
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "aff", "affid"].forEach(
      (k) => u.searchParams.delete(k)
    );
    return `${u.hostname}${u.pathname}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Structured product-page candidates (once per URL per request window).
 * Uses a hard product-relevance threshold when keywords are provided.
 */
export async function collectStructuredScrapedImageCandidates(params: {
  scrapeUrl?: string | null;
  scrapeUrls?: string[];
  scrapeKeywords?: string[];
  limit?: number;
  hardThreshold?: number;
}): Promise<ScrapedImageCandidate[]> {
  const targets = [params.scrapeUrl, ...(params.scrapeUrls ?? [])].filter((url): url is string =>
    Boolean(url?.trim())
  );
  if (targets.length === 0) return [];

  const keywords = params.scrapeKeywords ?? [];
  const limit = params.limit ?? 24;
  const hardThreshold =
    typeof params.hardThreshold === "number"
      ? params.hardThreshold
      : keywords.length > 0
        ? MIN_PRODUCT_IMAGE_SCORE
        : undefined;
  const seen = new Set<string>();
  const out: ScrapedImageCandidate[] = [];

  const push = (candidate: ScrapedImageCandidate | null | undefined) => {
    if (!candidate?.url?.trim()) return;
    if (typeof hardThreshold === "number" && candidate.score < hardThreshold) return;
    const key = normalizeImageUrl(candidate.url);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(candidate);
  };

  for (const target of targets) {
    const cacheKey = normalizeProductPageCacheKey(target);
    const cached = structuredScrapeCache.get(cacheKey);
    let candidates: ScrapedImageCandidate[];
    if (cached && Date.now() - cached.at < STRUCTURED_SCRAPE_CACHE_TTL_MS) {
      candidates = cached.candidates;
    } else {
      candidates = await scrapeRelevantImageCandidates(target, {
        keywords,
        limit: 16,
        hardThreshold,
      });
      structuredScrapeCache.set(cacheKey, { at: Date.now(), candidates });
    }
    for (const c of candidates) push(c);
    if (out.length >= limit) break;
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Return the first scraped candidate not present in excludeUrls (normalized compare). */
export function pickFirstUnusedImageCandidate(
  candidates: readonly string[],
  excludeUrls: readonly string[]
): string | null {
  for (const candidate of candidates) {
    if (!isExcludedUrl(candidate, [...excludeUrls])) return candidate;
  }
  return null;
}

/** Pick the next unused scraped page image; each URL is only returned once per exclude set. */
export async function pickUnusedScrapedImageUrl(params: {
  candidates: readonly string[];
  excludeUrls: readonly string[];
}): Promise<string | null> {
  const exclude = [...params.excludeUrls];

  for (const candidate of params.candidates) {
    if (isExcludedUrl(candidate, exclude)) continue;

    const buffer = await fetchImageBuffer(candidate, SCRAPE_IMAGE_TIMEOUT_MS);
    if (!buffer || buffer.length < 800) continue;

    console.info("[images] assigned unique scraped pin image", candidate.slice(0, 64));
    return candidate;
  }

  return null;
}

async function fetchScrapedImageBuffer(scrapeUrl: string): Promise<Buffer | null> {
  const scraped = await resolveScrapedImage(scrapeUrl);
  return scraped?.buffer ?? null;
}

async function pollUltraFastOutput(taskId: string): Promise<Buffer | null> {
  const queryKeys = [
    RAPIDAPI_IMAGE_OUTPUT_QUERY,
    "task_id",
    "taskId",
    "id",
    "request_id",
  ].filter((key, index, arr) => arr.indexOf(key) === index);

  for (let attempt = 0; attempt < ULTRA_FAST_MAX_POLLS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, ULTRA_FAST_POLL_INTERVAL_MS));
    }

    for (const queryKey of queryKeys) {
      const url = new URL(`https://${RAPIDAPI_IMAGE_HOST}/${RAPIDAPI_IMAGE_OUTPUT_PATH}`);
      url.searchParams.set(queryKey, taskId);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: rapidApiHeaders(RAPIDAPI_IMAGE_HOST),
          signal: AbortSignal.timeout(ULTRA_FAST_POLL_TIMEOUT_MS),
        });
        if (!response.ok) continue;

        const data = await response.json();
        if (typeof data === "object" && data && "success" in data && data.success === false) {
          continue;
        }

        const buffer = await bufferFromRapidApiImageResponse(data);
        if (buffer) return buffer;
      } catch {
        /* try next query key / poll */
      }
    }
  }

  return null;
}

async function callUltraFastNanoBanana(
  prompt: string,
  negativePrompt: string,
  referenceImageUrl: string
): Promise<Buffer | null> {
  if (!RAPIDAPI_KEY) return null;

  const fullPrompt = negativePrompt
    ? `${prompt.slice(0, 450)}\n\nAvoid: ${negativePrompt.slice(0, 200)}`
    : prompt.slice(0, 500);

  try {
    const response = await fetch(
      `https://${RAPIDAPI_IMAGE_HOST}/${RAPIDAPI_IMAGE_CREATE_PATH}`,
      {
        method: "POST",
        headers: rapidApiHeaders(RAPIDAPI_IMAGE_HOST),
        body: JSON.stringify({
          prompt: fullPrompt,
          image_urls: [referenceImageUrl],
        }),
        signal: AbortSignal.timeout(ULTRA_FAST_CREATE_TIMEOUT_MS),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data === "object" && data && "success" in data && data.success === false) {
      return null;
    }

    const immediate = await bufferFromRapidApiImageResponse(data);
    if (immediate) return immediate;

    const taskId = findTaskId(data);
    if (taskId) return pollUltraFastOutput(taskId);
  } catch {
    return null;
  }

  return null;
}

async function callLegacyNanoBanana(
  prompt: string,
  negativePrompt: string
): Promise<Buffer | null> {
  if (!RAPIDAPI_KEY) return null;

  try {
    const response = await fetch(`https://${RAPIDAPI_IMAGE_HOST}/txt-to-img`, {
      method: "POST",
      headers: rapidApiHeaders(RAPIDAPI_IMAGE_HOST),
      body: JSON.stringify({
        prompt: prompt.slice(0, 500),
        negative_prompt: negativePrompt.slice(0, 300),
      }),
      signal: AbortSignal.timeout(NANO_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return bufferFromRapidApiImageResponse(data);
  } catch {
    return null;
  }
}

async function callRapidApiImage(params: {
  prompt: string;
  negativePrompt: string;
  referenceImageUrl: string;
}): Promise<Buffer | null> {
  if (!RAPIDAPI_KEY) return null;

  if (isUltraFastNanoBananaHost(RAPIDAPI_IMAGE_HOST)) {
    return callUltraFastNanoBanana(
      params.prompt,
      params.negativePrompt,
      params.referenceImageUrl
    );
  }

  return callLegacyNanoBanana(params.prompt, params.negativePrompt);
}

/**
 * Generate an image via the PR Labs (chatgpt-42) text-to-image endpoint using
 * the same RapidAPI key as text generation. Returns the hosted image URL.
 * NOTE: shares the account's per-second rate limit with article text calls.
 */
async function prLabsImageUrl(prompt: string): Promise<string | null> {
  if (!RAPIDAPI_KEY) return null;
  try {
    const res = await fetch(`https://${RAPIDAPI_TEXT_HOST}/${RAPIDAPI_TEXTTOIMAGE_PATH}`, {
      method: "POST",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_TEXT_HOST,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: prompt.slice(0, 500), width: 1024, height: 768 }),
      signal: AbortSignal.timeout(TEXTTOIMAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const url =
      typeof (data as { generated_image?: unknown })?.generated_image === "string"
        ? (data as { generated_image: string }).generated_image
        : findRemoteImageUrl(data);
    return url && /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

async function prLabsImageBuffer(prompt: string): Promise<Buffer | null> {
  const url = await prLabsImageUrl(prompt);
  return url ? fetchImageBuffer(url, 20_000) : null;
}

async function uploadToBlogImages(
  supabase: SupabaseClient,
  userId: string,
  buffer: Buffer,
  ext: "png" | "jpg" = "jpg"
): Promise<string | null> {
  const fileName = `${userId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("blog-images")
    .upload(fileName, buffer, {
      contentType: ext === "png" ? "image/png" : "image/jpeg",
      upsert: false,
    });

  if (error) return null;
  const { data } = supabase.storage.from("blog-images").getPublicUrl(fileName);
  return data.publicUrl;
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function isSupportedImageType(contentType: string): boolean {
  return contentType.toLowerCase() in CONTENT_TYPE_EXT;
}

/**
 * Persist a user-uploaded image to the `blog-images` bucket and return its
 * public URL. Used by the manual image upload / replace flow in the editor.
 */
export async function uploadUserImage(params: {
  supabase: SupabaseClient;
  userId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string | null> {
  const ext = CONTENT_TYPE_EXT[params.contentType.toLowerCase()] ?? "jpg";
  const fileName = `${params.userId}/uploads/${randomUUID()}.${ext}`;
  const { error } = await params.supabase.storage
    .from("blog-images")
    .upload(fileName, params.buffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) return null;
  const { data } = params.supabase.storage.from("blog-images").getPublicUrl(fileName);
  return data.publicUrl;
}

export interface ResolvedImage {
  url: string;
  alt: string;
  stockId?: string;
}

/**
 * FAST path: return a directly-usable image URL with NO download/upload.
 */
async function resolveStockImageUrl(
  params: {
    title: string;
    subject: string;
    hobby?: string;
    pickOffset?: number;
    seedBoost?: number;
    excludeUrls?: string[];
    excludeStockIds?: string[];
    customQuery?: string;
    orientation?: "horizontal" | "vertical" | "all";
    preferSquare?: boolean;
  },
  exclude: string[],
  excludeStockIds: string[]
): Promise<string | null> {
  return fetchPixabayImageUrl(params.title, params.subject, {
    pickOffset: params.pickOffset,
    seedBoost: params.seedBoost,
    excludeUrls: exclude,
    excludeStockIds,
    hobby: params.hobby,
    customQuery: params.customQuery,
    orientation: params.orientation ?? "all",
    preferSquare: params.preferSquare ?? false,
  });
}

async function resolveScrapedImageUrl(
  scrapeUrl: string,
  scrapeKeywords: string[] | undefined,
  offset: number,
  exclude: string[]
): Promise<string | null> {
  return fetchScrapedImageUrl(scrapeUrl, scrapeKeywords, offset, exclude);
}

export async function resolveFastImageUrl(params: {
  title: string;
  subject: string;
  hobby?: string;
  /** Affiliate/product page to scrape for og:image. */
  scrapeUrl?: string;
  /** Extra pages (e.g. offer page) to scrape when the primary URL has no match. */
  scrapeUrls?: string[];
  /** Keywords from the thread post — used to rank scraped page images. */
  scrapeKeywords?: string[];
  pickOffset?: number;
  seedBoost?: number;
  excludeUrls?: string[];
  excludeStockIds?: string[];
  customQuery?: string;
  orientation?: "horizontal" | "vertical" | "all";
  preferSquare?: boolean;
  /** Story/lifestyle posts: stock first. Product/proof posts: scrape first (default). */
  preferStock?: boolean;
  /**
   * When false, skip the random Picsum placeholder (use for product/commerce pins
   * so unrelated city/forest photos never become the background).
   */
  allowPicsumFallback?: boolean;
}): Promise<ResolvedImage> {
  const alt = `${params.title} — ${params.subject}`;
  const offset = params.pickOffset ?? 0;
  const exclude = params.excludeUrls ?? [];
  const excludeStockIds = params.excludeStockIds ?? [];
  const stockParams = {
    title: params.title,
    subject: params.subject,
    hobby: params.hobby,
    pickOffset: offset,
    seedBoost: params.seedBoost,
    customQuery: params.customQuery,
    orientation: params.orientation,
    preferSquare: params.preferSquare,
  };

  const tryStock = () =>
    resolveStockImageUrl(stockParams, exclude, excludeStockIds);

  const scrapeTargets = [
    params.scrapeUrl,
    ...(params.scrapeUrls ?? []),
  ].filter((url): url is string => Boolean(url?.trim()));

  const tryScrape = async () => {
    for (let i = 0; i < scrapeTargets.length; i++) {
      const scraped = await resolveScrapedImageUrl(
        scrapeTargets[i],
        params.scrapeKeywords,
        offset + i,
        exclude
      );
      if (scraped) return scraped;
    }
    return null;
  };

  const stockFirst = params.preferStock === true;
  const primary = stockFirst ? await tryStock() : await tryScrape();
  if (primary) {
    return { url: primary, alt, stockId: normalizeImageUrl(primary) };
  }

  const fallback = stockFirst ? await tryScrape() : await tryStock();
  if (fallback) {
    return { url: fallback, alt, stockId: normalizeImageUrl(fallback) };
  }

  if (params.allowPicsumFallback === false) {
    return { url: "", alt, stockId: "" };
  }

  const picsum = picsumFallbackUrl(params.title, offset + (params.seedBoost ?? 0));
  return { url: picsum, alt, stockId: normalizeImageUrl(picsum) };
}

/** Prefetch hero images for all cluster topics (unique per site generation). */
export async function prefetchTopicImages(
  topics: ReadonlyArray<{ title: string; slug: string }>,
  subject: string,
  hobby?: string,
  concurrency = IMAGE_RESOLUTION_CONCURRENCY,
  scrapeUrl?: string
): Promise<Record<string, ResolvedImage>> {
  const pool = new SiteImagePool();
  const pairs = await mapWithConcurrency(topics, concurrency, async (topic, i) => {
    const image = await pool.resolveUnique({
      title: topic.title,
      subject,
      hobby,
      scrapeUrl,
      seedBoost: i,
      pickOffset: 0,
    });
    return [topic.slug, image] as const;
  });

  const out: Record<string, ResolvedImage> = {};
  for (const [slug, image] of pairs) {
    if (image.url) out[slug] = image;
  }
  return out;
}

/**
 * Download an external image URL and cache it to Supabase Storage.
 * Returns the new public URL, or null on failure (caller keeps the original).
 */
export async function persistExternalImage(params: {
  url: string;
  userId: string;
  supabase: SupabaseClient;
}): Promise<string | null> {
  const result = await persistExternalImageWithMeta(params);
  return result?.url ?? null;
}

/** Persist external image and return content hash for uniqueness registry. */
export async function persistExternalImageWithMeta(params: {
  url: string;
  userId: string;
  supabase: SupabaseClient;
}): Promise<{ url: string; contentHash: string; buffer: Buffer } | null> {
  if (!params.url || params.url.includes("/blog-images/")) return null;
  const buffer = await fetchImageBuffer(params.url, 20_000);
  if (!buffer || buffer.length < 800) return null;
  const { hashImageBuffer } = await import("@/features/traffic/lib/image-identity");
  const contentHash = hashImageBuffer(buffer);
  const uploaded = await uploadToBlogImages(params.supabase, params.userId, buffer);
  if (!uploaded) {
    return { url: params.url, contentHash, buffer };
  }
  return { url: uploaded, contentHash, buffer };
}

/** Download image bytes for hashing without requiring persist. */
export async function downloadImageForHash(url: string): Promise<{ buffer: Buffer; contentHash: string } | null> {
  const buffer = await fetchImageBuffer(url, 20_000);
  if (!buffer || buffer.length < 800) return null;
  const { hashImageBuffer } = await import("@/features/traffic/lib/image-identity");
  return { buffer, contentHash: hashImageBuffer(buffer) };
}

/**
 * Always returns a Supabase-hosted URL (scrape → stock photo → placeholder).
 */
export async function resolvePostImage(params: {
  title: string;
  subject: string;
  userId: string;
  supabase: SupabaseClient;
  /** Affiliate/product page to scrape for og:image. */
  scrapeUrl?: string;
  /** @deprecated AI image generation is disabled; kept for API compatibility. */
  fast?: boolean;
}): Promise<{ url: string; alt: string }> {
  const alt = `${params.title} — ${params.subject}`;

  const scrapeSource = async (): Promise<Buffer | null> =>
    params.scrapeUrl ? fetchScrapedImageBuffer(params.scrapeUrl) : null;

  const pixabaySource = async (): Promise<Buffer | null> => {
    const hit = await fetchPixabayImage(params.title, params.subject);
    if (!hit) return null;
    return fetchImageBuffer(hit.url, PIXABAY_TIMEOUT_MS + 5_000);
  };

  const sources: Array<() => Promise<Buffer | null>> = [
    scrapeSource,
    pixabaySource,
    () => fetchImageBuffer(picsumFallbackUrl(params.title), FAST_PICSUM_TIMEOUT_MS),
  ];

  for (const load of sources) {
    const buffer = await load();
    if (!buffer) continue;
    const url = await uploadToBlogImages(params.supabase, params.userId, buffer);
    if (url) return { url, alt };
  }

  // Never return an imageless post: picsum is a reliable, whitelisted host so a
  // hero always renders even if scrape/stock/upload all failed.
  return { url: picsumFallbackUrl(params.title), alt };
}
