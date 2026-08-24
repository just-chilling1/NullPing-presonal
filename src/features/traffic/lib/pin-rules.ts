import { generateStructuredJSON } from "@/features/blog-builder/lib/ai";
import { cleanProductLabel } from "@/features/traffic/lib/product-label";

export interface PinCopy {
  headline: string;
  title: string;
  description: string;
  keywords: string[];
}

export const DEFAULT_PIN_COUNT = 10;
export const MAX_PIN_COUNT = 10;

export function clampPinCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PIN_COUNT;
  return Math.min(MAX_PIN_COUNT, Math.max(1, Math.round(n)));
}

function normalizeCopyKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function systemPrompt(count: number): string {
  return `You write Pinterest pins for a beginner affiliate marketer.
Return ONLY JSON: { "pins": [ { "headline", "title", "description", "keywords" } ] }
Write exactly ${count} pins. Every field must be unique across pins.

headline: 4-7 words, punchy overlay text for a pin image. No emojis. Use the short product name only.
title: Pinterest title, max 100 characters. Must expand the headline with a fresh angle — never copy the headline verbatim.
description: Pinterest description, max 500 characters. Each pin needs a different hook (curiosity, social proof, checklist, who-it-is-for, before-you-buy, etc.).
keywords: 3-8 short search phrases. Do not repeat the same keyword set on another pin.
Angles to rotate: worth it?, honest review, before you buy, who it helps, pros and cons, what to check, first impressions, compare options.
Do not mention AI, SEO settings, or affiliate commissions.`;
}

/** Short overlay-safe headlines — each pin gets a distinct angle and copy set. */
export function fallbackPins(productName: string, count = DEFAULT_PIN_COUNT): PinCopy[] {
  const name = cleanProductLabel(productName) || productName || "this product";
  const pinCount = clampPinCount(count);
  const templates = [
    {
      headline: `What ${name} really does`,
      title: `${name}: what it actually does (honest review)`,
      description: `Curious what ${name} actually delivers? This breakdown covers the main promise, who it fits, and the first things to verify on the official page before you spend a dime.`,
      keywords: [name, "what does it do", "honest review", "product breakdown", "worth a look"],
    },
    {
      headline: `Is ${name} worth buying?`,
      title: `Is ${name} worth it? Pros, cons, and who should skip`,
      description: `Not sure if ${name} is worth your money? Here is a calm pros-and-cons style look at who it helps, common complaints, and what to check on the sales page before checkout.`,
      keywords: [name, "is it worth it", "pros and cons", "buyer's guide", "review 2026"],
    },
    {
      headline: `Before you buy ${name}`,
      title: `Before you buy ${name}: 5 things to check first`,
      description: `Save yourself buyer's remorse. Before you buy ${name}, read this quick checklist on pricing, refunds, ingredients or features, and whether the offer matches what you actually need.`,
      keywords: [name, "before you buy", "checklist", "what to know", "smart shopper"],
    },
    {
      headline: `${name}: honest take`,
      title: `${name} review — an honest take for beginners`,
      description: `A straight, beginner-friendly review of ${name} without hype. Learn what it is, who it is for, and the one question to answer before you click through to the official offer.`,
      keywords: [name, "honest take", "beginner review", "no hype", "full review"],
    },
    {
      headline: `Who ${name} is for`,
      title: `Who should use ${name}? (and who shouldn't)`,
      description: `${name} is not for everyone. This pin spells out the ideal customer, who should pass, and the fastest way to decide if it matches your goals before you commit.`,
      keywords: [name, "who is it for", "ideal customer", "fit check", "should you try it"],
    },
    {
      headline: `The truth about ${name}`,
      title: `The truth about ${name} — what the page won't say`,
      description: `Cut through the marketing noise. Here is the truth about ${name}: what it claims, what buyers should verify, and how to read the official page with clear eyes.`,
      keywords: [name, "truth about", "marketing vs reality", "verify claims", "deep dive"],
    },
    {
      headline: `${name}: first-week notes`,
      title: `${name} first-week notes — early impressions`,
      description: `Thinking about trying ${name}? These first-week style notes cover setup expectations, early wins, friction points, and what to watch during days 1–7.`,
      keywords: [name, "first week", "early impressions", "getting started", "real experience"],
    },
    {
      headline: `Try ${name} or pass?`,
      title: `Try ${name} or pass? A quick decision guide`,
      description: `Still on the fence? Use this quick decision guide for ${name} — three green flags, three red flags, and a simple rule for knowing when to buy or walk away.`,
      keywords: [name, "try or pass", "decision guide", "green flags", "red flags"],
    },
    {
      headline: `${name} explained simply`,
      title: `${name} explained simply for busy shoppers`,
      description: `No jargon, no fluff. ${name} explained in plain language: what you get, how it works at a high level, and the one link to read before you purchase.`,
      keywords: [name, "explained simply", "plain english", "quick summary", "easy review"],
    },
    {
      headline: `${name}: calm review`,
      title: `${name} calm review — facts before feelings`,
      description: `A calm, fact-first review of ${name} for shoppers who hate pressure tactics. Compare claims vs. reality and decide with a clear head.`,
      keywords: [name, "calm review", "fact check", "no pressure", "smart buy"],
    },
  ];
  return templates.slice(0, pinCount).map((template, i) => ({
    headline: template.headline,
    title: template.title.slice(0, 100),
    description: template.description.slice(0, 500),
    keywords: [...template.keywords, `pin ${i + 1}`].slice(0, 8),
  }));
}

/** Cap overlay text so Satori does not clip mid-word on the pin image. */
export function pinOverlayHeadline(headline: string, maxChars = 36): string {
  const cleaned = headline.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const truncated = cleaned.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace >= 14) return truncated.slice(0, lastSpace).trim();
  return truncated.trim();
}

function keywordSignature(keywords: string[]): string {
  return keywords
    .map((k) => normalizeCopyKey(k))
    .filter(Boolean)
    .sort()
    .join("|");
}

function makeValidate(count: number) {
  const minAccept = count <= 4 ? count : Math.max(Math.ceil(count * 0.8), 1);
  return (raw: unknown): PinCopy[] | null => {
    if (!raw || typeof raw !== "object") return null;
    const pins = (raw as { pins?: unknown }).pins;
    if (!Array.isArray(pins) || pins.length < minAccept) return null;

    const seenHeadlines = new Set<string>();
    const seenTitles = new Set<string>();
    const seenDescriptions = new Set<string>();
    const seenKeywordSets = new Set<string>();

    const mapped = pins
      .slice(0, count)
      .map((pin) => {
        const p = pin as Record<string, unknown>;
        const headline = String(p.headline || p.title || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 56);
        const title = String(p.title || p.headline || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100);
        const description = String(p.description || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        const keywords = Array.isArray(p.keywords) ? p.keywords.map(String).slice(0, 8) : [];

        const headlineKey = normalizeCopyKey(headline);
        const titleKey = normalizeCopyKey(title);
        const descriptionKey = normalizeCopyKey(description.slice(0, 120));
        const keywordsKey = keywordSignature(keywords);

        if (
          !headline ||
          !title ||
          !description ||
          keywords.length < 3 ||
          seenHeadlines.has(headlineKey) ||
          seenTitles.has(titleKey) ||
          titleKey === headlineKey ||
          seenDescriptions.has(descriptionKey) ||
          seenKeywordSets.has(keywordsKey)
        ) {
          return null;
        }

        seenHeadlines.add(headlineKey);
        seenTitles.add(titleKey);
        seenDescriptions.add(descriptionKey);
        seenKeywordSets.add(keywordsKey);

        return { headline, title, description, keywords };
      })
      .filter((p): p is PinCopy => Boolean(p?.headline && p?.title));

    return mapped.length >= minAccept ? mapped.slice(0, count) : null;
  };
}

export async function generatePinCopy(
  productName: string,
  context = "",
  count = DEFAULT_PIN_COUNT
): Promise<PinCopy[]> {
  const name = cleanProductLabel(productName) || productName;
  const pinCount = clampPinCount(count);
  try {
    const pins = await generateStructuredJSON<PinCopy[]>({
      systemPrompt: systemPrompt(pinCount),
      userPrompt: `Create ${pinCount} Pinterest pins promoting a review page for the product "${name}".
Use the short product name "${name}" in headlines — do not use a long review title.
Each pin must use a different angle, title, description, and keyword set.
${context ? `Context:\n${context}` : ""}`,
      validate: makeValidate(pinCount),
      options: { temperature: 0.75, timeoutMs: 90_000 },
    });
    const result = pins.slice(0, pinCount);
    if (result.length < pinCount) {
      const fallbacks = fallbackPins(name, pinCount);
      return fallbacks.map((fallback, idx) => result[idx] ?? fallback);
    }
    return result;
  } catch {
    return fallbackPins(name, pinCount);
  }
}
