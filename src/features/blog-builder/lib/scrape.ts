import * as cheerio from "cheerio";
import { assertPublicHttpsUrlResolved } from "@/lib/safe-url";

export interface ScrapedPageInfo {
  title: string;
  description: string;
  h1: string;
  price: string;
  brand: string;
  rating: string;
  features: string[];
  bodySnippet: string;
  /** og:image / JSON-LD product image when present on the page. */
  imageUrl: string;
}

const SCRAPER_API_TIMEOUT_MS = 30_000;
const DIRECT_FETCH_TIMEOUT_MS = 10_000;
/** Initial attempt plus this many retries when scrape/image extraction fails. */
const SCRAPE_RETRY_COUNT = 3;
const SCRAPE_RETRY_DELAY_MS = 400;
export const SCRAPE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function withScrapeRetries<T>(
  run: () => Promise<T | null>,
  isSuccess: (value: T | null) => boolean
): Promise<T | null> {
  let last: T | null = null;
  const attempts = 1 + SCRAPE_RETRY_COUNT;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await run();
    if (isSuccess(last)) return last;
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, SCRAPE_RETRY_DELAY_MS * attempt));
    }
  }
  return last;
}

function getScraperApiKey(): string | undefined {
  return (process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY)?.trim() || undefined;
}

async function fetchDirectHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": SCRAPE_USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (res.ok) return await res.text();
  } catch {
    /* fall through */
  }
  return null;
}

async function fetchScraperApiHtml(url: string): Promise<string | null> {
  const scraperApiKey = getScraperApiKey();
  if (!scraperApiKey) return null;

  try {
    const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(
      url
    )}&render=true&premium=true`;
    const res = await fetch(scraperUrl, {
      method: "GET",
      signal: AbortSignal.timeout(SCRAPER_API_TIMEOUT_MS),
    });
    if (res.ok) return await res.text();
  } catch {
    /* fall through */
  }
  return null;
}

function htmlHasOfferSignals(html: string): boolean {
  const lower = html.slice(0, 8000).toLowerCase();
  return (
    lower.includes("<title") &&
    (lower.includes("og:title") ||
      lower.includes('name="description"') ||
      lower.includes("<h1") ||
      lower.includes("application/ld+json"))
  );
}

/** Fetch raw HTML — direct request first (fast), ScraperAPI with JS render as fallback. */
async function fetchHtml(url: string): Promise<string | null> {
  const direct = await fetchDirectHtml(url);
  if (direct && htmlHasOfferSignals(direct)) return direct;

  const rendered = await fetchScraperApiHtml(url);
  if (rendered) return rendered;

  return direct;
}

type JsonLdNode = Record<string, unknown>;

/** Walk JSON-LD blocks looking for a Product node and pull structured fields. */
function extractFromJsonLd($: cheerio.CheerioAPI): Partial<ScrapedPageInfo> {
  const out: Partial<ScrapedPageInfo> = {};
  const nodes = collectJsonLdNodes($);
  const product = nodes.find((n) => jsonLdTypeMatches(n, "Product"));
  if (product) {
    if (typeof product.name === "string") out.title = product.name.trim();
    if (typeof product.description === "string") out.description = product.description.trim();

    const brand = product.brand;
    if (typeof brand === "string") out.brand = brand;
    else if (brand && typeof brand === "object" && typeof (brand as JsonLdNode).name === "string") {
      out.brand = (brand as JsonLdNode).name as string;
    }

    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    if (offers && typeof offers === "object") {
      const o = offers as JsonLdNode;
      const price = o.price ?? o.lowPrice;
      const currency = typeof o.priceCurrency === "string" ? o.priceCurrency : "";
      if (price != null && `${price}`.trim()) out.price = `${currency} ${price}`.trim();
    }

    const rating = product.aggregateRating;
    if (rating && typeof rating === "object") {
      const r = rating as JsonLdNode;
      if (r.ratingValue != null) {
        const count = r.reviewCount ?? r.ratingCount;
        out.rating = count != null ? `${r.ratingValue}/5 from ${count} reviews` : `${r.ratingValue}/5`;
      }
    }
  }

  return out;
}

function metaContent($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const sel of selectors) {
    const val = $(sel).attr("content");
    if (val && val.trim()) return val.replace(/\s+/g, " ").trim();
  }
  return "";
}

function collectJsonLdNodes($: cheerio.CheerioAPI): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && typeof item === "object") {
          nodes.push(item as JsonLdNode);
          const graph = (item as JsonLdNode)["@graph"];
          if (Array.isArray(graph)) nodes.push(...(graph as JsonLdNode[]));
        }
      }
    } catch {
      /* ignore malformed blocks */
    }
  });
  return nodes;
}

function jsonLdTypeMatches(node: JsonLdNode, type: string): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function resolveAbsoluteUrl(pageUrl: string, href: string): string | null {
  const trimmed = decodeImageHref(href);
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return null;
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}

function decodeImageHref(raw: string): string {
  return raw
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x2f;/gi, "/")
    .replace(/&#47;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageCandidate(raw: string): string {
  return decodeImageHref(raw);
}

/** Prefer a large CDN variant so we do not persist 100×100 thumbs as heroes. */
export function upgradeCdnImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("cdn.shopify.com") || host.includes("shopifycdn.com")) {
      const width = Number(parsed.searchParams.get("width") ?? 0);
      if (width > 0 && width < 1200) parsed.searchParams.set("width", "1200");
      parsed.pathname = parsed.pathname.replace(
        /_(\d+x\d+|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande)(?=\.[a-z0-9]+$)/i,
        "_1200x"
      );
      return parsed.toString();
    }

    if (host.includes("media-amazon.com") || host.includes("ssl-images-amazon.com")) {
      parsed.pathname = parsed.pathname.replace(/\._[A-Z0-9,_]+_\./, ".");
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }

  return url.replace(/-(\d{2,4})x(\d{2,4})(?=\.[a-z0-9]+(?:\?|$))/i, (match, w, h) => {
    const width = Number(w);
    const height = Number(h);
    return width < 800 || height < 800 ? "" : match;
  });
}

function imageDedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .replace(/_(\d+x\d+|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|master|1200x)(?=\.[a-z0-9]+$)/i, "")
      .replace(/-(\d{2,4})x(\d{2,4})(?=\.[a-z0-9]+$)/i, "")
      .replace(/\._[A-Z0-9,_]+_\./, ".");
    return `${parsed.hostname}${path}`.toLowerCase();
  } catch {
    return url.split("?")[0]?.toLowerCase() ?? url;
  }
}

interface SrcsetCandidate {
  url: string;
  width?: number;
}

function parseSrcset(srcset: string): SrcsetCandidate[] {
  return srcset
    .split(",")
    .map((part) => {
      const bits = part.trim().split(/\s+/);
      const url = bits[0] ?? "";
      const desc = bits[1] ?? "";
      let width: number | undefined;
      if (/^\d+w$/i.test(desc)) width = Number.parseInt(desc, 10);
      if (/^\d+(\.\d+)?x$/i.test(desc)) width = Math.round(Number.parseFloat(desc) * 800);
      return { url, width };
    })
    .filter((candidate) => candidate.url && !candidate.url.startsWith("data:"));
}

function bestSrcsetCandidate(srcset: string): SrcsetCandidate | null {
  const candidates = parseSrcset(srcset);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, next) =>
    (next.width ?? 0) > (best.width ?? 0) ? next : best
  );
}

function jsonLdImageUrls(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const url = normalizeImageCandidate(value);
    if (url) out.push(url);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) jsonLdImageUrls(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    const node = value as JsonLdNode;
    if (typeof node.url === "string") out.push(normalizeImageCandidate(node.url));
    if (typeof node.contentUrl === "string") out.push(normalizeImageCandidate(node.contentUrl));
    if (typeof node.thumbnailUrl === "string") out.push(normalizeImageCandidate(node.thumbnailUrl));
    if (node.image) jsonLdImageUrls(node.image, out);
    if (typeof node["@id"] === "string" && /^https?:\/\//i.test(node["@id"])) {
      out.push(normalizeImageCandidate(node["@id"]));
    }
  }
  return out;
}

const PRODUCT_JSONLD_TYPES = new Set([
  "Product",
  "ProductGroup",
  "Offer",
  "AggregateOffer",
  "ImageObject",
]);

const PAGE_JSONLD_TYPES = new Set(["Article", "BlogPosting", "WebPage", "WebSite", "ItemPage"]);

function extractImagesFromJsonLd($: cheerio.CheerioAPI): Array<{ url: string; weight: number }> {
  const found: Array<{ url: string; weight: number }> = [];
  for (const node of collectJsonLdNodes($)) {
    const isProduct = [...PRODUCT_JSONLD_TYPES].some((type) => jsonLdTypeMatches(node, type));
    const isPage = [...PAGE_JSONLD_TYPES].some((type) => jsonLdTypeMatches(node, type));
    const weight = isProduct ? 90 : isPage ? 78 : 0;
    if (!weight) continue;

    const urls = [
      ...jsonLdImageUrls(node.image),
      ...jsonLdImageUrls(node.contentUrl),
      ...jsonLdImageUrls(node.thumbnailUrl),
      ...jsonLdImageUrls(node.primaryImageOfPage),
    ];
    for (const url of urls) {
      if (url) found.push({ url, weight });
    }
  }
  return found;
}

/** Pull the best product/hero image URL from rendered HTML. */
export function extractPageImageUrl(html: string, pageUrl: string): string | null {
  const ranked = rankPageImages(html, pageUrl, []);
  return ranked.find((candidate) => candidate.score > 0)?.url ?? null;
}

const JUNK_IMAGE_PATTERN =
  /(?:logo|icon|avatar|badge|sprite|pixel|tracking|spacer|1x1|emoji|favicon|banner-ad|placeholder|spinner|loader|dummy|blank|transparent|wordmark|og-default)/i;

const PRODUCT_PATH_PATTERN =
  /\/(?:products?|cdn\/shop|wp-content\/uploads|media\/catalog|images\/i\/)\b/i;

export interface RankedPageImage {
  url: string;
  score: number;
  source: string;
}

function scoreImageCandidate(params: {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  sourceWeight: number;
  keywords: string[];
}): number {
  let score = params.sourceWeight;
  const haystack = `${params.url} ${params.alt ?? ""}`.toLowerCase();

  if (JUNK_IMAGE_PATTERN.test(haystack)) score -= 80;
  if (/\.svg(\?|$)/i.test(params.url)) score -= 40;
  if (/\.gif(\?|$)/i.test(params.url) && /pixel|track|spacer|1x1/i.test(haystack)) score -= 60;
  if (PRODUCT_PATH_PATTERN.test(params.url)) score += 16;
  if (/(?:hero|featured|product|gallery|main[-_]?image)/i.test(haystack)) score += 10;

  if (params.width && params.height) {
    if (params.width < 240 || params.height < 240) score -= 50;
    const ratio = params.width / params.height;
    if (ratio > 0.85 && ratio < 1.15) score += 18;
    if (params.width >= 800 || params.height >= 800) score += 12;
  } else if (params.width && params.width >= 800) {
    score += 8;
  }

  for (const keyword of params.keywords) {
    if (keyword.length > 2 && haystack.includes(keyword)) score += 18;
  }

  const matchCount = params.keywords.filter(
    (keyword) => keyword.length > 2 && haystack.includes(keyword)
  ).length;
  if (matchCount >= 2) score += matchCount * 6;

  // Content <img> without product terms is often unrelated chrome; keep meta/JSON-LD
  // product heroes even when the CDN path has no keyword (common on Shopify/CDN).
  if (params.keywords.length > 0 && matchCount === 0 && params.sourceWeight < 85) {
    score -= 55;
  }

  return score;
}

function numericAttr(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Rank every usable image on a page — meta tags, JSON-LD, lazy-load attrs, and srcset. */
export function rankPageImages(
  html: string,
  pageUrl: string,
  keywords: string[] = []
): RankedPageImage[] {
  const $ = cheerio.load(html);
  const ranked: RankedPageImage[] = [];
  const seen = new Set<string>();

  const add = (
    raw: string,
    sourceWeight: number,
    source: string,
    alt?: string,
    width?: number,
    height?: number
  ) => {
    if (!raw?.trim()) return;
    const abs = resolveAbsoluteUrl(pageUrl, raw);
    if (!abs || !/^https?:\/\//i.test(abs)) return;
    const upgraded = upgradeCdnImageUrl(abs);
    const key = imageDedupeKey(upgraded);
    if (seen.has(key)) return;
    seen.add(key);
    ranked.push({
      url: upgraded,
      score: scoreImageCandidate({
        url: upgraded,
        alt,
        width,
        height,
        sourceWeight,
        keywords,
      }),
      source,
    });
  };

  const addAll = (
    selector: string,
    attr: "content" | "href" | "src",
    sourceWeight: number,
    source: string
  ) => {
    $(selector).each((_, el) => {
      add($(el).attr(attr) ?? "", sourceWeight, source);
    });
  };

  addAll('meta[property="og:image:secure_url"]', "content", 100, "og:image");
  addAll('meta[property="og:image"]', "content", 100, "og:image");
  addAll('meta[property="og:image:url"]', "content", 100, "og:image");
  addAll('meta[name="twitter:image"]', "content", 92, "twitter:image");
  addAll('meta[name="twitter:image:src"]', "content", 92, "twitter:image");
  addAll('link[rel="image_src"]', "href", 88, "image_src");
  addAll('link[rel="preload"][as="image"]', "href", 80, "preload");
  addAll('[itemprop="image"]', "content", 86, "itemprop");
  addAll('img[itemprop="image"]', "src", 86, "itemprop");

  $('[itemprop="image"]').each((_, el) => {
    add($(el).attr("href") ?? "", 86, "itemprop");
  });

  $('link[rel="preload"][as="image"][imagesrcset]').each((_, el) => {
    const best = bestSrcsetCandidate($(el).attr("imagesrcset") ?? "");
    if (best) add(best.url, 80, "preload-srcset", undefined, best.width);
  });

  for (const { url, weight } of extractImagesFromJsonLd($)) {
    add(url, weight, "jsonld");
  }

  $("picture source[srcset]").each((_, el) => {
    const best = bestSrcsetCandidate($(el).attr("srcset") ?? "");
    if (best) add(best.url, 74, "picture-srcset", undefined, best.width);
  });

  $("img").each((_, el) => {
    const $el = $(el);
    const alt = $el.attr("alt") ?? "";
    const width = numericAttr($el.attr("width"));
    const height = numericAttr($el.attr("height"));

    const srcset =
      $el.attr("srcset") || $el.attr("data-srcset") || $el.attr("data-lazy-srcset") || "";
    const best = srcset ? bestSrcsetCandidate(srcset) : null;

    const src =
      $el.attr("data-zoom-image") ||
      $el.attr("data-large-image") ||
      $el.attr("data-large_image") ||
      $el.attr("data-old-hires") ||
      best?.url ||
      $el.attr("data-src") ||
      $el.attr("data-lazy-src") ||
      $el.attr("data-original") ||
      $el.attr("data-lazy") ||
      $el.attr("src") ||
      "";

    add(src, 70, "content-img", alt, best?.width ?? width, height);

    const amazonMap = $el.attr("data-a-dynamic-image");
    if (amazonMap) {
      try {
        const parsed = JSON.parse(amazonMap) as Record<string, unknown>;
        for (const [imgUrl, dims] of Object.entries(parsed)) {
          const pair = Array.isArray(dims) ? dims : [];
          add(
            imgUrl,
            88,
            "amazon-dynamic",
            alt,
            typeof pair[0] === "number" ? pair[0] : undefined,
            typeof pair[1] === "number" ? pair[1] : undefined
          );
        }
      } catch {
        /* ignore malformed Amazon maps */
      }
    }
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/** Any usable page image when og:image / JSON-LD is missing. */
export function extractAnyPageImageUrl(html: string, pageUrl: string): string | null {
  const ranked = rankPageImages(html, pageUrl, []);
  const usable = ranked.find((candidate) => candidate.score > 0);
  return usable?.url ?? ranked[0]?.url ?? null;
}

function imageFromHtml(html: string, pageUrl: string): string | null {
  return extractPageImageUrl(html, pageUrl) ?? extractAnyPageImageUrl(html, pageUrl);
}

/** Scrape a page and return image URLs ranked by relevance to keywords and post topic. */
export async function scrapeRelevantImagesFromUrl(
  url: string,
  options?: { keywords?: string[]; limit?: number }
): Promise<string[]> {
  let safeUrl: string;
  try {
    safeUrl = (await assertPublicHttpsUrlResolved(url)).toString();
  } catch {
    return [];
  }

  const keywords = (options?.keywords ?? [])
    .map((word) => word.toLowerCase().trim())
    .filter((word) => word.length > 2);
  const limit = options?.limit ?? 6;

  const run = async (): Promise<string[]> => {
    const ranked: RankedPageImage[] = [];
    const seen = new Set<string>();
    const minScore = keywords.length > 0 ? 28 : 20;

    const absorb = (html: string) => {
      for (const candidate of rankPageImages(html, safeUrl, keywords)) {
        const key = imageDedupeKey(candidate.url);
        if (seen.has(key)) continue;
        seen.add(key);
        ranked.push(candidate);
      }
    };

    const pick = () => {
      const matched = ranked
        .filter((candidate) => candidate.score > minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((candidate) => candidate.url);
      return matched.length > 0 ? matched : ranked.slice(0, limit).map((candidate) => candidate.url);
    };

    const direct = await fetchDirectHtml(safeUrl);
    if (direct) absorb(direct);

    const fromDirect = pick();
    if (fromDirect.length >= Math.min(3, limit) && ranked.some((c) => c.score > minScore)) {
      return fromDirect;
    }

    const rendered = await fetchScraperApiHtml(safeUrl);
    if (rendered && rendered !== direct) absorb(rendered);

    return pick();
  };

  const found = await withScrapeRetries(run, (urls) => Boolean(urls && urls.length > 0));
  return found ?? [];
}

/** Scrape an affiliate/product page and return its primary image URL, if any. */
export async function scrapeImageFromUrl(url: string): Promise<string | null> {
  let safeUrl: string;
  try {
    safeUrl = (await assertPublicHttpsUrlResolved(url)).toString();
  } catch {
    return null;
  }

  const run = async (): Promise<string | null> => {
    const direct = await fetchDirectHtml(safeUrl);
    if (direct) {
      const imageUrl = imageFromHtml(direct, safeUrl);
      if (imageUrl) return imageUrl;
    }

    // Many offer pages inject og:image via JS — retry with rendered HTML even when
    // the direct response already has title/description signals.
    const rendered = await fetchScraperApiHtml(safeUrl);
    if (rendered) {
      const imageUrl = imageFromHtml(rendered, safeUrl);
      if (imageUrl) return imageUrl;
    }

    return direct ? imageFromHtml(direct, safeUrl) : null;
  };

  return withScrapeRetries(run, (imageUrl) => Boolean(imageUrl));
}

/** Heuristic price sniff from visible text when JSON-LD has none. */
function sniffPrice(text: string): string {
  const match = text.match(/(?:[$€£]|USD|EUR)\s?\d{1,4}(?:[.,]\d{2})?/);
  return match ? match[0].trim() : "";
}

/** Collect the most "feature-like" list items (benefits/specs) on the page. */
function extractFeatures($: cheerio.CheerioAPI): string[] {
  const items: string[] = [];
  $("li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 12 && text.length <= 160 && !/^(home|login|sign|menu|cart)/i.test(text)) {
      items.push(text);
    }
  });

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 8) break;
  }
  return unique;
}

export async function scrapePage(url: string): Promise<ScrapedPageInfo | null> {
  // Defense in depth — resolve DNS so private/link-local targets cannot slip through.
  let safeUrl: string;
  try {
    safeUrl = (await assertPublicHttpsUrlResolved(url)).toString();
  } catch {
    return null;
  }

  const html = await withScrapeRetries(() => fetchHtml(safeUrl), (value) => Boolean(value));
  if (!html) return null;

  try {
    let imageUrl = imageFromHtml(html, safeUrl) ?? "";
    if (!imageUrl) {
      const rendered = await withScrapeRetries(
        () => fetchScraperApiHtml(safeUrl),
        (value) => Boolean(value && imageFromHtml(value, safeUrl))
      );
      if (rendered) {
        const renderedImage = imageFromHtml(rendered, safeUrl);
        if (renderedImage) {
          imageUrl = renderedImage;
        }
      }
    }

    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();

    const jsonLd = extractFromJsonLd(cheerio.load(html));

    const title =
      jsonLd.title ||
      metaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      $("title").first().text().replace(/\s+/g, " ").trim();

    const description =
      jsonLd.description ||
      metaContent($, [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]);

    const h1 = $("h1").first().text().replace(/\s+/g, " ").trim();

    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 2000);

    const price = jsonLd.price || sniffPrice(bodyText);
    const features = extractFeatures($);

    return {
      title: (title || h1).slice(0, 200),
      description: description.slice(0, 600),
      h1: h1.slice(0, 200),
      price: price.slice(0, 40),
      brand: (jsonLd.brand ?? "").slice(0, 80),
      rating: (jsonLd.rating ?? "").slice(0, 60),
      features,
      bodySnippet: bodyText.slice(0, 600),
      imageUrl: imageUrl.slice(0, 2048),
    };
  } catch {
    return null;
  }
}

/** Turn scraped details into a compact, model-friendly product context block. */
export function buildProductContext(info: ScrapedPageInfo): string {
  const lines: string[] = [];
  if (info.title) lines.push(`Product: ${info.title}`);
  if (info.brand) lines.push(`Brand: ${info.brand}`);
  if (info.price) lines.push(`Price: ${info.price}`);
  if (info.rating) lines.push(`Rating: ${info.rating}`);
  if (info.description) lines.push(`Summary: ${info.description}`);
  if (info.features.length > 0) {
    lines.push(`Key points: ${info.features.slice(0, 6).join("; ")}`);
  } else if (info.bodySnippet) {
    lines.push(`Page excerpt: ${info.bodySnippet}`);
  }
  return lines.join("\n");
}
