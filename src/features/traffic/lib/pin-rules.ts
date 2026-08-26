import { generateStructuredJSON } from "@/features/blog-builder/lib/ai";
import {
  buildProductIdentity,
  productSubjectPhrase,
  type ProductType,
} from "@/features/traffic/lib/product-identity";
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

/**
 * Category-specific vocabulary so copy talks about the things this product
 * actually has — sizing for clothing, dosage for supplements, pricing for software.
 */
interface CopyProfile {
  categoryLabel: string;
  /** Long form used inside descriptions. */
  checks: string;
  /** Short form used inside titles. */
  checksShort: string;
  benefit: string;
  audience: string;
  keywords: string[];
}

const COPY_PROFILES: Record<ProductType, CopyProfile> = {
  apparel: {
    categoryLabel: "clothing",
    checks: "sizing, fabric weight, and the return window",
    checksShort: "sizing and fabric",
    benefit: "how it fits and holds up after a few washes",
    audience: "shoppers",
    keywords: ["size guide", "fabric", "outfit ideas", "everyday wear"],
  },
  supplement: {
    categoryLabel: "a supplement",
    checks: "ingredients, dosage, and the refund window",
    checksShort: "ingredients and dosage",
    benefit: "what is inside and how people actually take it",
    audience: "buyers",
    keywords: ["ingredients", "dosage", "supplement review", "daily routine"],
  },
  software: {
    categoryLabel: "software",
    checks: "pricing tiers, real usage limits, and how easy it is to cancel",
    checksShort: "pricing and limits",
    benefit: "which features matter day to day and where it falls short",
    audience: "beginners",
    keywords: ["features", "pricing", "free trial", "setup"],
  },
  app: {
    categoryLabel: "a mobile app",
    checks: "pricing, permissions, and how easy it is to cancel",
    checksShort: "pricing and features",
    benefit: "which features matter day to day and where it falls short",
    audience: "beginners",
    keywords: ["features", "pricing", "free plan", "app review"],
  },
  course: {
    categoryLabel: "an online course",
    checks: "the curriculum, time commitment, and refund terms",
    checksShort: "curriculum and time needed",
    benefit: "what you actually learn and how long it takes",
    audience: "beginners",
    keywords: ["curriculum", "who it suits", "time needed", "course review"],
  },
  ebook: {
    categoryLabel: "an ebook",
    checks: "the chapter list, length, and file format",
    checksShort: "length and chapters",
    benefit: "what it covers and how quickly you can read it",
    audience: "readers",
    keywords: ["chapters", "length", "format", "ebook review"],
  },
  subscription: {
    categoryLabel: "a subscription",
    checks: "the billing cycle, plan limits, and cancellation terms",
    checksShort: "billing and limits",
    benefit: "what each plan includes and when it stops being worth it",
    audience: "subscribers",
    keywords: ["plans", "billing", "cancel anytime", "membership"],
  },
  service: {
    categoryLabel: "a service",
    checks: "the scope, turnaround time, and pricing",
    checksShort: "scope and turnaround",
    benefit: "what is delivered and how long it takes",
    audience: "buyers",
    keywords: ["scope", "turnaround", "pricing", "service review"],
  },
  financial: {
    categoryLabel: "a financial product",
    checks: "fees, risk, and withdrawal terms",
    checksShort: "fees and risk",
    benefit: "how it works and where the real risk sits",
    audience: "beginners",
    keywords: ["fees", "risk", "withdrawals", "how it works"],
  },
  physical: {
    categoryLabel: "a physical product",
    checks: "build quality, size, and warranty",
    checksShort: "build and size",
    benefit: "how well it is built and how it performs in real use",
    audience: "shoppers",
    keywords: ["build quality", "size", "warranty", "real use"],
  },
  other: {
    categoryLabel: "a product",
    checks: "pricing, what is included, and the refund policy",
    checksShort: "pricing and what's included",
    benefit: "what you get and who it really helps",
    audience: "shoppers",
    keywords: ["what you get", "pricing", "who it suits", "real review"],
  },
};

interface PinTemplate {
  headline: (name: string) => string;
  title: (name: string, profile: CopyProfile) => string;
  description: (subject: string, profile: CopyProfile) => string;
  keywords: string[];
}

/** Ten distinct angles, phrased so they stay grammatical for any product name. */
const PIN_TEMPLATES: PinTemplate[] = [
  {
    headline: (n) => `${n}: honest review`,
    title: (n, p) => `${n} review — ${p.benefit}`,
    description: (s, p) =>
      `An honest look at ${s}: ${p.benefit}. Here is what stands out, what does not, and which details to confirm before you buy — ${p.checks}.`,
    keywords: ["honest review", "real review"],
  },
  {
    headline: (n) => `Is ${n} worth it?`,
    title: (n, p) => `Is ${n} worth it? A quick look at ${p.checksShort}`,
    description: (s, p) =>
      `Trying to decide whether ${s} earns its price? Weigh ${p.checks} against what you actually need, and see who usually regrets the purchase.`,
    keywords: ["worth it", "value for money"],
  },
  {
    headline: (n) => `Before you buy ${n}`,
    title: (n, p) => `Before you buy ${n}: check ${p.checksShort} first`,
    description: (s, p) =>
      `Save yourself the hassle of a return. Before you order ${s}, run through this short checklist covering ${p.checks}.`,
    keywords: ["before you buy", "buying tips"],
  },
  {
    headline: (n) => `${n}: what to check`,
    title: (n) => `${n}: the details most listings bury`,
    description: (s, p) =>
      `Product pages rarely lead with the details that matter. For ${s}, look closely at ${p.checks} — that is where the surprises hide.`,
    keywords: ["what to check", "buyer checklist"],
  },
  {
    headline: (n) => `Who should buy ${n}`,
    title: (n, p) => `Who should buy ${n} — and which ${p.audience} should skip`,
    description: (s, p) =>
      `${s.charAt(0).toUpperCase()}${s.slice(1)} is not right for everyone. This breaks down the ${p.audience} it genuinely suits, who should pass, and the fastest way to tell which group you are in.`,
    keywords: ["who it's for", "best for"],
  },
  {
    headline: (n) => `${n}: pros and cons`,
    title: (n) => `${n} pros and cons, minus the hype`,
    description: (s, p) =>
      `A balanced pros-and-cons rundown for ${s}. The upsides worth paying for, the trade-offs people complain about, and how ${p.checksShort} affect the decision.`,
    keywords: ["pros and cons", "upsides and trade-offs"],
  },
  {
    headline: (n) => `${n}: first impressions`,
    title: (n, p) => `${n} first impressions — ${p.benefit}`,
    description: (s, p) =>
      `Early notes on ${s}: what the first week feels like, where it beat expectations, and which details mattered most — ${p.checks}.`,
    keywords: ["first impressions", "early thoughts"],
  },
  {
    headline: (n) => `${n}: buy or skip?`,
    title: (n) => `${n}: buy it or skip it? A simple decision guide`,
    description: (s, p) =>
      `Still on the fence about ${s}? Use three green flags and three red flags, plus a simple rule based on ${p.checksShort}, to decide without second-guessing.`,
    keywords: ["buy or skip", "decision guide"],
  },
  {
    headline: (n) => `${n} explained simply`,
    title: (n, p) => `${n} explained simply for busy ${p.audience}`,
    description: (s, p) =>
      `No jargon and no filler. Here is ${s} in plain language: ${p.benefit}, plus the one thing to read on the official page before you commit.`,
    keywords: ["explained simply", "beginner guide"],
  },
  {
    headline: (n) => `${n}: buyer's guide`,
    title: (n, p) => `${n}: a quick buyer's guide to ${p.checksShort}`,
    description: (s, p) =>
      `A short buyer's guide for ${s}. Compare ${p.checks}, learn which claims hold up, and walk into checkout knowing exactly what you are getting.`,
    keywords: ["buyer's guide", "shopping guide"],
  },
];

function copyContext(productName: string, context = "") {
  // The name decides the category. Page context is only consulted when the
  // name alone is inconclusive, so stray words there cannot hijack the vocabulary.
  let identity = buildProductIdentity({ productName });
  if (identity.productType === "other" && context.trim()) {
    const withContext = buildProductIdentity({ productName, hobby: context });
    if (withContext.productType !== "other") identity = withContext;
  }
  const profile = COPY_PROFILES[identity.productType] ?? COPY_PROFILES.other;
  const displayName =
    identity.displayName || cleanProductLabel(productName) || productName || "this product";
  const subject = productSubjectPhrase(identity) || displayName;
  return { identity, profile, displayName, subject };
}

/** Short overlay-safe headlines — each pin gets a distinct, category-appropriate angle. */
export function fallbackPins(productName: string, count = DEFAULT_PIN_COUNT): PinCopy[] {
  const { profile, displayName, subject } = copyContext(productName);
  const pinCount = clampPinCount(count);
  const nameKeyword = displayName.toLowerCase();

  return PIN_TEMPLATES.slice(0, pinCount).map((template, i) => {
    // Rotate the category keyword so pins do not all carry the same tail.
    const categoryKeyword = profile.keywords[i % profile.keywords.length];
    return {
      headline: template.headline(displayName),
      title: template.title(displayName, profile).slice(0, 100),
      description: template.description(subject, profile).slice(0, 500),
      keywords: [...new Set([nameKeyword, ...template.keywords, categoryKeyword])].slice(0, 8),
    };
  });
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

/**
 * Keep every usable AI pin and top the batch up from fallbacks.
 * One repeated angle must never cost the whole generated batch.
 */
export function mergePinCopy(primary: PinCopy[], fallback: PinCopy[], count: number): PinCopy[] {
  const out: PinCopy[] = [];
  const seenHeadlines = new Set<string>();
  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();

  const add = (pin: PinCopy | undefined): void => {
    if (out.length >= count || !pin) return;
    const headline = pin.headline?.replace(/\s+/g, " ").trim() ?? "";
    const title = pin.title?.replace(/\s+/g, " ").trim() ?? "";
    const description = pin.description?.replace(/\s+/g, " ").trim() ?? "";
    if (!headline || !title) return;

    const headlineKey = normalizeCopyKey(headline);
    const titleKey = normalizeCopyKey(title);
    const descriptionKey = normalizeCopyKey(description.slice(0, 120));
    if (seenHeadlines.has(headlineKey) || seenTitles.has(titleKey)) return;
    if (descriptionKey && seenDescriptions.has(descriptionKey)) return;

    seenHeadlines.add(headlineKey);
    seenTitles.add(titleKey);
    if (descriptionKey) seenDescriptions.add(descriptionKey);
    out.push({ headline, title, description, keywords: pin.keywords ?? [] });
  };

  for (const pin of primary) add(pin);
  for (const pin of fallback) add(pin);
  return out.slice(0, count);
}

function systemPrompt(count: number, profile: CopyProfile): string {
  return `You write Pinterest pins for a beginner affiliate marketer promoting a product review page.
Return ONLY JSON: { "pins": [ { "headline", "title", "description", "keywords" } ] }
Write exactly ${count} pins. Every field must be unique across pins.

headline: 4-7 words of punchy overlay text for the pin image, max 36 characters. No emojis.
title: Pinterest title, max 100 characters. Must expand the headline with a fresh angle — never copy it verbatim.
description: Pinterest description, max 500 characters. Each pin needs a different hook.
keywords: 3-8 short phrases a real shopper would search. Never output filler such as "pin 1" or "product".

This product is ${profile.categoryLabel}. Only use angles that apply to ${profile.categoryLabel},
and keep the specifics on ${profile.checks}. Never reference attributes this category does not have.
Rotate angles across pins: honest review, worth it, before you buy, what to check, who it suits,
pros and cons, first impressions, buy or skip, explained simply, buyer's guide.
Grammar: treat the product name as a proper noun, or pair it with an article ("a", "the") when the
sentence needs one. Never write it as a verb.
Never invent prices, discounts, ratings, medical claims, or fake personal results.
Do not mention AI, SEO settings, or affiliate commissions.`;
}

function makeValidate(count: number) {
  return (raw: unknown): PinCopy[] | null => {
    if (!raw || typeof raw !== "object") return null;
    const pins = (raw as { pins?: unknown }).pins;
    if (!Array.isArray(pins) || pins.length === 0) return null;

    const seenHeadlines = new Set<string>();
    const seenTitles = new Set<string>();
    const seenDescriptions = new Set<string>();

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
        const keywords = Array.isArray(p.keywords)
          ? p.keywords
              .map(String)
              .map((k) => k.trim())
              .filter((k) => k.length > 1 && !/^pin\s*\d+$/i.test(k))
              .slice(0, 8)
          : [];

        const headlineKey = normalizeCopyKey(headline);
        const titleKey = normalizeCopyKey(title);
        const descriptionKey = normalizeCopyKey(description.slice(0, 120));

        if (
          !headline ||
          !title ||
          !description ||
          keywords.length < 3 ||
          seenHeadlines.has(headlineKey) ||
          seenTitles.has(titleKey) ||
          titleKey === headlineKey ||
          seenDescriptions.has(descriptionKey)
        ) {
          return null;
        }

        seenHeadlines.add(headlineKey);
        seenTitles.add(titleKey);
        seenDescriptions.add(descriptionKey);

        return { headline, title, description, keywords };
      })
      .filter((p): p is PinCopy => Boolean(p?.headline && p?.title));

    // Keep any usable pin — the caller tops the batch up from category fallbacks.
    return mapped.length > 0 ? mapped.slice(0, count) : null;
  };
}

export async function generatePinCopy(
  productName: string,
  context = "",
  count = DEFAULT_PIN_COUNT
): Promise<PinCopy[]> {
  const pinCount = clampPinCount(count);
  const { profile, displayName, subject } = copyContext(productName, context);
  const fallbacks = fallbackPins(productName, pinCount);

  try {
    const pins = await generateStructuredJSON<PinCopy[]>({
      systemPrompt: systemPrompt(pinCount, profile),
      userPrompt: `Create ${pinCount} Pinterest pins for a review page about ${subject}.
Display the product as "${displayName}" in headlines — never a long review title.
Product category: ${profile.categoryLabel}.
Keep the concrete details on ${profile.checks}.
${context ? `Page context:\n${context}` : ""}`,
      repairHint: `Return ONLY valid JSON shaped { "pins": [ { "headline": string, "title": string, "description": string, "keywords": string[] } ] } with ${pinCount} unique pins.`,
      validate: makeValidate(pinCount),
      options: { temperature: 0.75, timeoutMs: 90_000 },
    });
    return mergePinCopy(pins, fallbacks, pinCount);
  } catch {
    return fallbacks;
  }
}
