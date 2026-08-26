/**
 * Strip review-headline fluff so copy and image search use the real product
 * ("Should You Buy Melatonin? What to Check First" → "Melatonin").
 */

const STOP = new Set([
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
  "review",
  "reviews",
  "honest",
  "worth",
  "product",
  "featured",
  "pin",
  "should",
  "buy",
  "check",
  "first",
  "look",
  "things",
  "nobody",
  "tells",
  "about",
  "before",
  "read",
  "this",
  "simple",
  "truth",
  "calm",
  "plain",
  "english",
  "skip",
  "actually",
  "2024",
  "2025",
  "2026",
]);

export function productSearchTokens(productName: string): string[] {
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

function tidyLabel(value: string): string {
  const tokens = productSearchTokens(value);
  if (tokens.length === 0) return value.trim();
  const focused = tokens.filter((t) => !STOP.has(t));
  const pick = (focused.length > 0 ? focused : tokens).slice(0, 4);
  return pick.join(" ");
}

/** Kept lowercase inside a title-cased name (never in first position). */
const MINOR_WORDS = new Set(["and", "or", "for", "the", "a", "an", "of", "in", "on", "with", "to"]);

/**
 * Human-facing product name for pin copy: "polo shirt" → "Polo Shirt",
 * while deliberate brand casing survives ("SleepWell" stays "SleepWell").
 */
export function productDisplayName(raw: string): string {
  const input = (raw || "").trim();
  if (!input) return "";
  const cleaned = cleanProductLabel(input) || input;

  const originalByLower = new Map<string, string>();
  for (const word of input.split(/[^A-Za-z0-9]+/)) {
    if (!word) continue;
    const key = word.toLowerCase();
    if (!originalByLower.has(key)) originalByLower.set(key, word);
  }

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((token, index) => {
      const original = originalByLower.get(token.toLowerCase());
      if (original && /[A-Z]/.test(original.slice(1))) return original;
      if (index > 0 && MINOR_WORDS.has(token.toLowerCase())) return token.toLowerCase();
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

export function cleanProductLabel(raw: string): string {
  const input = (raw || "").trim();
  if (!input) return "";
  let s = input;

  const isWorth = s.match(/^is\s+(.+?)\s+worth\s+it\b/i);
  if (isWorth?.[1]) return tidyLabel(isWorth[1]);

  const shouldBuy = s.match(/^should you (?:buy|skip)\s+(.+?)(?:\?|$)/i);
  if (shouldBuy?.[1]) return tidyLabel(shouldBuy[1]);

  const beforeBuy = s.match(/^before you buy\s+(.+?)(?:,|$)/i);
  if (beforeBuy?.[1]) return tidyLabel(beforeBuy[1]);

  s = s
    .replace(/\?.*$/, " ")
    .replace(/\s*[—–-]\s*.*$/, " ")
    .replace(/\s*:\s*.*$/, " ")
    .replace(/\ban honest (?:look|review)\b/gi, " ")
    .replace(/\s+worth it\b.*$/i, " ")
    .replace(/\s+what to check(?: first)?\b.*$/i, " ")
    .replace(/\s+in plain english\b.*$/i, " ")
    .replace(/\s+what i wish i knew.*$/i, " ")
    .trim();

  return tidyLabel(s) || tidyLabel(input) || input;
}
