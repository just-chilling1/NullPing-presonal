import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PIN_COUNT,
  fallbackPins,
  mergePinCopy,
  pinOverlayHeadline,
  type PinCopy,
} from "./pin-rules";

const SUPPLEMENT_WORDS = /\b(ingredients?|dosage|dose|capsules?|gummies|serving|supplement)\b/i;
const APPAREL_WORDS = /\b(fit|fits|sizing|size|fabric|wash|wardrobe|wear)\b/i;

describe("fallbackPins copy quality", () => {
  it("returns the requested number of unique pins", () => {
    const pins = fallbackPins("polo shirt", DEFAULT_PIN_COUNT);
    assert.equal(pins.length, DEFAULT_PIN_COUNT);
    assert.equal(new Set(pins.map((p) => p.headline)).size, DEFAULT_PIN_COUNT);
    assert.equal(new Set(pins.map((p) => p.title)).size, DEFAULT_PIN_COUNT);
    assert.equal(new Set(pins.map((p) => p.description)).size, DEFAULT_PIN_COUNT);
  });

  it("uses a title-cased product name instead of raw lowercase input", () => {
    const pins = fallbackPins("polo shirt", 3);
    for (const pin of pins) {
      assert.match(pin.headline, /Polo Shirt/);
      assert.doesNotMatch(pin.headline, /\bpolo shirt\b/);
    }
  });

  it("never produces article-less phrasing like 'What polo shirt really does'", () => {
    const pins = fallbackPins("polo shirt", DEFAULT_PIN_COUNT);
    for (const pin of pins) {
      assert.doesNotMatch(pin.headline, /^What Polo Shirt really does$/i);
      assert.doesNotMatch(`${pin.description}`, /\bat Polo Shirt\b/);
    }
  });

  it("writes apparel-specific angles for clothing and no supplement language", () => {
    const pins = fallbackPins("polo shirt", DEFAULT_PIN_COUNT);
    const blob = pins.map((p) => `${p.title} ${p.description}`).join(" ");
    assert.match(blob, APPAREL_WORDS);
    assert.doesNotMatch(blob, SUPPLEMENT_WORDS);
  });

  it("writes supplement-specific angles for supplements and no apparel language", () => {
    const pins = fallbackPins("SleepWell Melatonin Gummies", DEFAULT_PIN_COUNT);
    const blob = pins.map((p) => `${p.title} ${p.description}`).join(" ");
    assert.match(blob, SUPPLEMENT_WORDS);
    assert.doesNotMatch(blob, /\b(fabric|sizing|wash)\b/i);
  });

  it("writes software angles for software products", () => {
    const pins = fallbackPins("Ranktracker SEO Software", 4);
    const blob = pins.map((p) => `${p.title} ${p.description}`).join(" ");
    assert.match(blob, /\b(pricing|features?|trial|plan|cancel)\b/i);
    assert.doesNotMatch(blob, /\b(fabric|sizing|dosage)\b/i);
  });

  it("keeps keyword sets unique and free of filler like 'pin 3'", () => {
    const pins = fallbackPins("polo shirt", DEFAULT_PIN_COUNT);
    const signatures = new Set<string>();
    for (const pin of pins) {
      assert.ok(pin.keywords.length >= 3);
      for (const keyword of pin.keywords) {
        assert.doesNotMatch(keyword, /^pin\s*\d+$/i);
      }
      signatures.add([...pin.keywords].sort().join("|"));
    }
    assert.equal(signatures.size, pins.length);
  });

  it("keeps headlines short enough for the image overlay", () => {
    for (const pin of fallbackPins("polo shirt", DEFAULT_PIN_COUNT)) {
      assert.equal(pinOverlayHeadline(pin.headline), pin.headline.trim());
    }
  });
});

describe("mergePinCopy", () => {
  const ai: PinCopy[] = [
    {
      headline: "Polo Shirt: honest review",
      title: "Polo Shirt review — how it fits after five washes",
      description: "A real look at fit and fabric.",
      keywords: ["polo shirt", "fit", "review"],
    },
    {
      headline: "Polo Shirt sizing guide",
      title: "Polo Shirt sizing — pick the right size first try",
      description: "Sizing notes for wide shoulders.",
      keywords: ["polo shirt", "sizing", "size guide"],
    },
  ];

  it("keeps every valid AI pin and tops up the rest from fallbacks", () => {
    const merged = mergePinCopy(ai, fallbackPins("polo shirt", DEFAULT_PIN_COUNT), DEFAULT_PIN_COUNT);
    assert.equal(merged.length, DEFAULT_PIN_COUNT);
    assert.equal(merged[0].headline, ai[0].headline);
    assert.equal(merged[1].headline, ai[1].headline);
  });

  it("drops duplicate headlines and titles rather than emitting repeats", () => {
    const merged = mergePinCopy([...ai, ai[0]], [], 10);
    assert.equal(merged.length, 2);
  });

  it("never exceeds the requested count", () => {
    const merged = mergePinCopy(ai, fallbackPins("polo shirt", DEFAULT_PIN_COUNT), 3);
    assert.equal(merged.length, 3);
  });
});
