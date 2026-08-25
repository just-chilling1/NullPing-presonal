import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchMoneyPageHeroOptions } from "./hero-options";

describe("fetchMoneyPageHeroOptions", () => {
  it("returns up to count distinct product-related URLs", async () => {
    const urls = [
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/c.jpg",
      "https://cdn.example.com/d.jpg",
      "https://cdn.example.com/e.jpg",
      "https://cdn.example.com/f.jpg",
    ];
    let call = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Sleep Aid Melatonin Gummies",
      niche: "Health & Wellness",
      count: 5,
      fetchCandidates: async () => {
        const slice = urls.slice(call, call + 2).map((url) => ({ url, relevanceScore: 80 }));
        call += 2;
        return slice;
      },
    });
    assert.equal(result.length, 5);
    assert.deepEqual(result, urls.slice(0, 5));
  });

  it("stops when no more candidates are returned", async () => {
    let n = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Boxing Gloves",
      count: 5,
      fetchCandidates: async () => {
        if (n++ > 0) return [];
        return [
          { url: "https://cdn.example.com/1.jpg", relevanceScore: 85 },
          { url: "https://cdn.example.com/2.jpg", relevanceScore: 82 },
        ];
      },
    });
    assert.equal(result.length, 2);
  });

  it("skips low-relevance and duplicate URLs", async () => {
    const dup = "https://cdn.example.com/same.jpg";
    const result = await fetchMoneyPageHeroOptions({
      productName: "Vitamin C Serum",
      count: 5,
      fetchCandidates: async () => [
        { url: dup, relevanceScore: 80 },
        { url: dup, relevanceScore: 90 },
        { url: "https://cdn.example.com/other.jpg", relevanceScore: 40 },
        { url: "https://cdn.example.com/good.jpg", relevanceScore: 88 },
      ],
    });
    assert.deepEqual(result, [dup, "https://cdn.example.com/good.jpg"]);
  });

  it("respects initial excludeUrls", async () => {
    const excluded = "https://cdn.example.com/already.jpg";
    const result = await fetchMoneyPageHeroOptions({
      productName: "Keto Diet Guide",
      count: 3,
      excludeUrls: [excluded],
      fetchCandidates: async (params) => {
        assert.ok(params.excludeUrls.includes(excluded));
        assert.ok(params.query.length > 0);
        return [{ url: "https://cdn.example.com/new.jpg", relevanceScore: 80 }];
      },
    });
    assert.deepEqual(result, ["https://cdn.example.com/new.jpg"]);
  });

  it("uses product-focused queries rather than niche lifestyle only", async () => {
    const queries: string[] = [];
    await fetchMoneyPageHeroOptions({
      productName: "Melatonin Sleep Gummies",
      niche: "Health & Wellness",
      count: 1,
      fetchCandidates: async (params) => {
        queries.push(params.query);
        return [{ url: "https://cdn.example.com/melatonin.jpg", relevanceScore: 90 }];
      },
    });
    assert.ok(queries.length > 0);
    assert.match(queries[0].toLowerCase(), /melatonin|gummies|sleep|supplement/);
    assert.doesNotMatch(queries[0].toLowerCase(), /entrepreneur desk|home office workspace/);
  });

  it("prefers scrapeUrls before stock candidates", async () => {
    let stockCalls = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "SleepWell Melatonin Gummies",
      scrapeUrls: [],
      count: 2,
      fetchCandidates: async () => {
        stockCalls += 1;
        return [{ url: "https://cdn.example.com/stock.jpg", relevanceScore: 90 }];
      },
    });
    assert.ok(stockCalls >= 1);
    assert.equal(result[0], "https://cdn.example.com/stock.jpg");
  });
});
