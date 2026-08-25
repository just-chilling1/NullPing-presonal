import type { PinCopy } from "@/features/traffic/lib/pin-rules";
import type { VaultCatalogEntry, VaultNiche } from "./catalog";

const NICHE_PIN_HOOKS: Record<VaultNiche, string[]> = {
  "Health & Wellness": [
    "What nobody tells you about this wellness pick",
    "Is this health product worth it in 2026?",
    "Before you buy another wellness aid, read this",
    "Honest look: daily routines without the hype",
    "Who this health option is actually for",
    "The simple truth about wind-down and recovery",
    "What I wish I knew before trying this",
    "Should you skip this wellness product?",
    "A calm breakdown in plain English",
    "Routine check: does this fit your goal?",
  ],
  "Finance & Investing": [
    "7 things beginners miss about this money tool",
    "Is this finance product worth it in 2026?",
    "Before you buy another investing guide, read this",
    "Honest look without get-rich promises",
    "Who this finance product is actually for",
    "The simple truth about starter money systems",
    "What I wish I knew before paying",
    "Should you skip this finance product?",
    "A calm money overview in plain English",
    "Checklist: does this match your money goal?",
  ],
  "Fitness & Sports": [
    "7 things nobody tells you about this fitness pick",
    "Is this fitness product worth it in 2026?",
    "Before you buy another workout tool, read this",
    "Honest review for beginners and returners",
    "Who this fitness option is actually for",
    "The simple truth about home-gym upgrades",
    "What I wish I knew before ordering",
    "Should you skip this fitness product?",
    "A plain-English fitness product breakdown",
    "A calm look at whether it fits your routine",
  ],
  "Digital Marketing": [
    "7 things marketers notice about this tool",
    "Is this marketing product worth it in 2026?",
    "Before you subscribe to another growth tool, read this",
    "Honest marketing look without jargon",
    "Who this marketing product is actually for",
    "The simple truth about traffic and conversion upgrades",
    "What I wish I knew before signing up",
    "Should you skip this marketing tool?",
    "A plain-English marketing breakdown",
    "Fit-check: does this clear your funnel bottleneck?",
  ],
  "Self-Help & Personal Development": [
    "7 things people notice about this growth tool",
    "Is this self-help product worth it in 2026?",
    "Before you buy another habit system, read this",
    "Honest personal-development look without fluff",
    "Who this growth product is actually for",
    "The simple truth about practical habit upgrades",
    "What I wish I knew before starting",
    "Should you skip this self-help product?",
    "A calm personal-growth breakdown",
    "Fit-check: does this match your next chapter?",
  ],
  "Beauty & Skincare": [
    "7 things skincare buyers notice first",
    "Is this beauty product worth it in 2026?",
    "Before you add another serum, read this",
    "Honest look without beauty buzzwords",
    "Who this beauty product is actually for",
    "The simple truth about routine upgrades",
    "What I wish I knew before buying",
    "Should you skip this beauty product?",
    "A calm skincare breakdown in plain English",
    "Fit-check: does this match your skin goal?",
  ],
  "Education & Learning": [
    "7 things learners notice about this course kit",
    "Is this learning product worth it in 2026?",
    "Before you buy another study system, read this",
    "Honest education look without hype",
    "Who this learning product is actually for",
    "The simple truth about structured practice",
    "What I wish I knew before enrolling",
    "Should you skip this education product?",
    "A plain-English learning breakdown",
    "Fit-check: does this match your study goal?",
  ],
  "Business & Entrepreneurship": [
    "7 things founders miss about this business tool",
    "Is this business product worth it in 2026?",
    "Before you buy another founder toolkit, read this",
    "Honest look without income promises",
    "Who this business product is actually for",
    "The simple truth about operator systems",
    "What I wish I knew before paying",
    "Should you skip this business product?",
    "A calm entrepreneurship overview",
    "Checklist: does this match your offer goal?",
  ],
  "Travel & Lifestyle": [
    "7 things travelers notice about this product",
    "Is this lifestyle product worth it in 2026?",
    "Before you buy another travel gadget, read this",
    "Honest lifestyle look without fluff",
    "Who this travel product is actually for",
    "The simple truth about smarter packing and living",
    "What I wish I knew before ordering",
    "Should you skip this lifestyle product?",
    "A calm travel and lifestyle breakdown",
    "Fit-check: does this match your next trip?",
  ],
};

export interface VaultPinDraft extends PinCopy {
  /** Background URL after product-accurate resolve; empty until resolved. */
  imageUrl: string;
}

/**
 * @deprecated Do not use for pin backgrounds — LoremFlickr is unrelated stock.
 * Kept only so old imports compile; always returns empty.
 */
export function buildVaultPinImageUrl(_entry: VaultCatalogEntry, _pinIdx: number): string {
  return "";
}

/** Build 10 pin copy drafts. Images are assigned later by the product pin resolver. */
export function buildVaultPinDrafts(entry: VaultCatalogEntry): VaultPinDraft[] {
  const name = entry.productName;
  const hooks = NICHE_PIN_HOOKS[entry.niche];
  const nicheKeyword = entry.niche.split("&")[0].trim();

  return hooks.map((hook, i) => {
    const headline = hook.includes("this")
      ? hook
          .replace(
            /this (health |wellness |finance |fitness |marketing |beauty |education |business |lifestyle |travel |growth |self-help |money )?product/i,
            name
          )
          .replace(/this (marketing |business )?tool/i, name)
          .replace(/this app/i, name)
          .replace(/this course kit/i, name)
          .replace(/this learning product/i, name)
          .replace(/this founder toolkit/i, name)
          .replace(/this travel gadget/i, name)
      : `${hook}: ${name}`;
    const clippedHeadline = (headline.includes(name) ? headline : `${headline} — ${name}`).slice(
      0,
      80
    );
    return {
      headline: clippedHeadline,
      title: clippedHeadline.slice(0, 100),
      description: `A simple review of ${name} for ${entry.niche}. Tap through to the money page for benefits, drawbacks, and a clear recommendation.`,
      keywords: [name, nicheKeyword, "review", "is it worth it", "honest review", `pin ${i + 1}`].slice(
        0,
        6
      ),
      imageUrl: "",
    };
  });
}
