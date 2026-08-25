import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashImageBuffer,
  isImageAlreadyUsed,
  mergeUsedImageRecords,
  recordsFromUrls,
  strongNormalizeImageUrl,
  type UsedImageRecord,
} from "./image-identity";
import {
  buildProductIdentity,
  preserveProductTokens,
  productOnlyStockQueries,
} from "./product-identity";
import {
  ensureUniquePinBackgrounds,
  pinRenderBackgroundCandidates,
} from "./pin-images";
import { scoreStockProductRelevance } from "@/features/blog-builder/lib/images";
import { MIN_PRODUCT_IMAGE_SCORE, rankPageImages } from "@/features/blog-builder/lib/scrape";

describe("strongNormalizeImageUrl", () => {
  it("treats query-string variants as the same image", () => {
    const a = strongNormalizeImageUrl("https://cdn.site.com/product/image.jpg");
    const b = strongNormalizeImageUrl("https://cdn.site.com/product/image.jpg?width=1200");
    assert.equal(a, b);
  });

  it("strips common CDN size suffixes", () => {
    const a = strongNormalizeImageUrl("https://cdn.site.com/product/image_1200x.jpg");
    const b = strongNormalizeImageUrl("https://cdn.site.com/product/image.jpg");
    assert.equal(a, b);
  });
});

describe("content hash uniqueness", () => {
  it("detects identical bytes as duplicates", () => {
    const buf = Buffer.from("fake-image-bytes");
    const hash = hashImageBuffer(buf);
    const registry: UsedImageRecord[] = [
      { normalizedUrl: "cdn.a/x.jpg", contentHash: hash, sourceUrl: "https://cdn.a/x.jpg" },
    ];
    assert.equal(
      isImageAlreadyUsed({ url: "https://cdn.b/y.jpg", contentHash: hash }, registry),
      true
    );
    assert.equal(
      isImageAlreadyUsed(
        { url: "https://cdn.b/other.jpg", contentHash: hashImageBuffer(Buffer.from("other")) },
        registry
      ),
      false
    );
  });
});

describe("used registry across batches", () => {
  it("merges prior batch identities so they cannot be reused", () => {
    const prior = recordsFromUrls(["https://cdn.example.com/a.jpg?w=800"]);
    const next = recordsFromUrls(["https://cdn.example.com/b.jpg"]);
    const merged = mergeUsedImageRecords(prior, next);
    assert.equal(
      isImageAlreadyUsed({ url: "https://cdn.example.com/a.jpg?w=1200" }, merged),
      true
    );
    assert.equal(
      isImageAlreadyUsed({ url: "https://cdn.example.com/c.jpg" }, merged),
      false
    );
  });
});

describe("product identity", () => {
  it("preserves brand/product terms from review-style titles", () => {
    const tokens = preserveProductTokens(
      "Should You Buy X Brand Magnesium Glycinate?"
    );
    assert.ok(tokens.includes("magnesium"));
    assert.ok(tokens.includes("glycinate"));
    assert.ok(tokens.includes("brand") || tokens.includes("x"));
    assert.ok(!tokens.includes("should"));
  });

  it("builds progressive product-only stock queries without bare niche lifestyle", () => {
    const identity = buildProductIdentity({
      productName: "SleepWell Melatonin Gummies",
    });
    const queries = productOnlyStockQueries(identity);
    assert.ok(queries.length > 0);
    assert.ok(queries.some((q) => /melatonin/i.test(q)));
    for (const q of queries) {
      assert.doesNotMatch(q, /^(wellness|sleep bedroom|healthy lifestyle)$/i);
    }
  });
});

describe("pinRenderBackgroundCandidates", () => {
  it("only returns the assigned source (and same backup), never Picsum/LoremFlickr/hero", () => {
    const source = "https://cdn.example.com/pin-0.jpg";
    const hero = "https://cdn.example.com/boxing-hero.jpg";
    const candidates = pinRenderBackgroundCandidates({
      sourceImageUrl: source,
      pinImageUrl: "https://cdn.example.com/pin-0.jpg?w=800",
      heroImage: hero,
      productName: "boxing gloves",
      pinIdx: 2,
      headline: "Honest review",
    });
    assert.equal(candidates[0], source);
    assert.ok(!candidates.includes(hero));
    assert.ok(candidates.every((u) => !/picsum|loremflickr/i.test(u)));
  });

  it("returns empty when no source is assigned", () => {
    const candidates = pinRenderBackgroundCandidates({
      heroImage: "https://cdn.example.com/hero.jpg",
      productName: "SleepWell Melatonin Gummies",
      pinIdx: 0,
      headline: "Try this",
    });
    assert.deepEqual(candidates, []);
  });
});

describe("ensureUniquePinBackgrounds", () => {
  it("nulls duplicates and generic fallbacks instead of inventing replacements", () => {
    const out = ensureUniquePinBackgrounds(
      [
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/a.jpg?w=800",
        "https://picsum.photos/seed/x/1200/675",
        "https://cdn.example.com/b.jpg",
      ],
      { productName: "Melatonin", pins: [] }
    );
    assert.equal(out[0], "https://cdn.example.com/a.jpg");
    assert.equal(out[1], null);
    assert.equal(out[2], null);
    assert.equal(out[3], "https://cdn.example.com/b.jpg");
  });
});

describe("stock relevance", () => {
  it("rejects generic lifestyle stock without product tokens", () => {
    const rel = scoreStockProductRelevance({
      query: "melatonin gummies",
      tags: "bedroom, sleep, lifestyle, woman, asleep",
      productTokens: ["melatonin", "gummies", "sleepwell"],
      strongTokens: ["melatonin", "gummies", "sleepwell"],
    });
    assert.ok(rel.score < 70, `expected < 70, got ${rel.score}`);
  });

  it("accepts stock that matches product tokens", () => {
    const rel = scoreStockProductRelevance({
      query: "melatonin gummies",
      tags: "melatonin, gummies, supplement, bottle",
      productTokens: ["melatonin", "gummies", "sleepwell"],
      strongTokens: ["melatonin", "gummies"],
    });
    assert.ok(rel.score >= 70);
  });

  it("accepts a single-token product like football when tags match", () => {
    const rel = scoreStockProductRelevance({
      query: "football",
      tags: "football, sport, ball, american football",
      productTokens: ["football"],
      strongTokens: ["football"],
    });
    assert.ok(rel.score >= 70, `expected >= 70, got ${rel.score}`);
  });

  it("accepts melatonin supplement query when tags are product photography without ingredient word", () => {
    const rel = scoreStockProductRelevance({
      query: "melatonin supplement",
      tags: "tablets, medicine, supplement, vitamin, pharmaceutical",
      productTokens: ["melatonin"],
      strongTokens: ["melatonin"],
      categoryTokens: ["supplement", "bottle", "gummies"],
    });
    assert.ok(rel.score >= 70, `expected >= 70, got ${rel.score}`);
  });
});

describe("product page ranking threshold", () => {
  it("ranks JSON-LD Product images above weak content images", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Product","name":"SleepWell Melatonin Gummies","image":"https://cdn.example.com/products/sleepwell-bottle.jpg"}
        </script>
      </head><body>
        <img src="https://cdn.example.com/blog/woman-sleeping.jpg" alt="peaceful sleep" width="900" height="600" />
      </body></html>
    `;
    const ranked = rankPageImages(html, "https://example.com/product", [
      "sleepwell",
      "melatonin",
      "gummies",
    ]);
    assert.ok(ranked.length >= 1);
    assert.ok(ranked[0].url.includes("sleepwell-bottle"));
    assert.ok(ranked[0].score >= MIN_PRODUCT_IMAGE_SCORE);
  });

  it("scores gallery images highly", () => {
    const html = `
      <html><body>
        <div class="product-gallery">
          <img src="https://cdn.example.com/products/melatonin-front.jpg" alt="SleepWell Melatonin Gummies" width="1000" height="1000" />
        </div>
        <img src="https://cdn.example.com/assets/logo.png" alt="logo" width="64" height="64" />
      </body></html>
    `;
    const ranked = rankPageImages(html, "https://example.com/p", ["sleepwell", "melatonin", "gummies"]);
    const gallery = ranked.find((r) => r.url.includes("melatonin-front"));
    assert.ok(gallery);
    assert.ok((gallery?.score ?? 0) >= MIN_PRODUCT_IMAGE_SCORE);
    const logo = ranked.find((r) => r.url.includes("logo"));
    if (logo) assert.ok(logo.score < MIN_PRODUCT_IMAGE_SCORE);
  });
});
