import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchMoneyPageHeroOptions } from "./hero-options";

describe("fetchMoneyPageHeroOptions", () => {
  it("returns up to count distinct URLs from the fetcher", async () => {
    const calls: string[][] = [];
    const urls = [
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/c.jpg",
      "https://cdn.example.com/d.jpg",
      "https://cdn.example.com/e.jpg",
      "https://cdn.example.com/f.jpg",
    ];
    let i = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Sleep Aid",
      niche: "health",
      count: 5,
      fetchOne: async (params) => {
        calls.push([...(params.excludeUrls ?? [])]);
        return urls[i++] ?? null;
      },
    });
    assert.deepEqual(result, urls.slice(0, 5));
    assert.equal(calls.length, 5);
    assert.deepEqual(calls[2], urls.slice(0, 2));
  });

  it("stops early when fetcher returns null", async () => {
    let n = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 5,
      fetchOne: async () => (n++ < 2 ? `https://cdn.example.com/${n}.jpg` : null),
    });
    assert.equal(result.length, 2);
  });

  it("skips duplicate URLs from the fetcher", async () => {
    const dup = "https://cdn.example.com/same.jpg";
    const sequence = [dup, dup, "https://cdn.example.com/other.jpg", null];
    let i = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 5,
      fetchOne: async () => sequence[i++] ?? null,
    });
    assert.deepEqual(result, [dup, "https://cdn.example.com/other.jpg"]);
  });

  it("respects initial excludeUrls", async () => {
    const excluded = "https://cdn.example.com/already.jpg";
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 3,
      excludeUrls: [excluded],
      fetchOne: async (params) => {
        assert.ok(params.excludeUrls?.includes(excluded));
        return "https://cdn.example.com/new.jpg";
      },
    });
    assert.deepEqual(result, ["https://cdn.example.com/new.jpg"]);
  });
});
