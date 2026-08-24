import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractAnyPageImageUrl,
  extractPageImageUrl,
  rankPageImages,
  upgradeCdnImageUrl,
} from "./scrape";

const PAGE = "https://store.example.com/products/melatonin";

describe("upgradeCdnImageUrl", () => {
  it("upsizes Shopify thumbnail paths and width params", () => {
    assert.equal(
      upgradeCdnImageUrl("https://cdn.shopify.com/s/files/1/000/products/bottle_300x300.jpg"),
      "https://cdn.shopify.com/s/files/1/000/products/bottle_1200x.jpg"
    );
    assert.equal(
      upgradeCdnImageUrl("https://cdn.shopify.com/s/files/1/000/products/bottle.jpg?width=200"),
      "https://cdn.shopify.com/s/files/1/000/products/bottle.jpg?width=1200"
    );
  });

  it("strips Amazon size tokens", () => {
    assert.equal(
      upgradeCdnImageUrl("https://m.media-amazon.com/images/I/81abc._AC_SL300_.jpg"),
      "https://m.media-amazon.com/images/I/81abc.jpg"
    );
  });

  it("strips small WordPress size suffixes", () => {
    assert.equal(
      upgradeCdnImageUrl("https://cdn.example.com/wp-content/uploads/2024/bottle-300x200.jpg"),
      "https://cdn.example.com/wp-content/uploads/2024/bottle.jpg"
    );
  });
});

describe("extractPageImageUrl", () => {
  it("prefers a product photo over a logo og:image", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="/logo-icon.png" />
      </head><body>
        <img src="/cdn/shop/products/melatonin-bottle.jpg" alt="Melatonin sleep bottle" width="900" height="900" />
      </body></html>
    `;
    const url = extractPageImageUrl(html, PAGE);
    assert.ok(url?.includes("melatonin-bottle"));
  });

  it("reads lazy-load data-src when src is a placeholder", () => {
    const html = `
      <html><body>
        <img src="/placeholder.gif" data-src="/cdn/shop/products/hero.jpg" alt="Product hero" />
      </body></html>
    `;
    const url = extractPageImageUrl(html, PAGE);
    assert.equal(url, "https://store.example.com/cdn/shop/products/hero.jpg");
  });

  it("picks the largest srcset candidate", () => {
    const html = `
      <html><body>
        <img
          alt="Featured product"
          src="/img/small.jpg"
          srcset="/img/small.jpg 400w, /img/medium.jpg 800w, /products/large.jpg 1400w"
        />
      </body></html>
    `;
    const url = extractPageImageUrl(html, PAGE);
    assert.equal(url, "https://store.example.com/products/large.jpg");
  });

  it("extracts every JSON-LD product image", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@type": "Product",
            "name": "Melatonin",
            "image": [
              "https://cdn.example.com/gallery/front.jpg",
              "https://cdn.example.com/gallery/side.jpg"
            ]
          }
        </script>
      </head></html>
    `;
    const ranked = rankPageImages(html, PAGE, ["melatonin"]);
    const urls = ranked.map((c) => c.url);
    assert.ok(urls.includes("https://cdn.example.com/gallery/front.jpg"));
    assert.ok(urls.includes("https://cdn.example.com/gallery/side.jpg"));
  });

  it("reads Amazon data-a-dynamic-image maps", () => {
    const html = `
      <html><body>
        <img alt="Melatonin"
          src="https://m.media-amazon.com/images/I/81tiny._SX100_.jpg"
          data-a-dynamic-image='{"https://m.media-amazon.com/images/I/81full._AC_SL1500_.jpg":[1500,1500]}' />
      </body></html>
    `;
    const url = extractPageImageUrl(html, PAGE);
    assert.equal(url, "https://m.media-amazon.com/images/I/81full.jpg");
  });

  it("collects multiple og:image tags", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.example.com/logo-icon.png" />
        <meta property="og:image" content="https://cdn.example.com/products/real-hero.jpg" />
      </head></html>
    `;
    const ranked = rankPageImages(html, PAGE);
    assert.ok(ranked.some((c) => c.url.includes("real-hero")));
    const best = extractPageImageUrl(html, PAGE);
    assert.ok(best?.includes("real-hero"));
  });

  it("skips tracking pixels when choosing any fallback image", () => {
    const html = `
      <html><body>
        <img src="/pixel-tracking-1x1.gif" width="1" height="1" alt="" />
        <img src="/products/usable.jpg" alt="Product" width="800" height="800" />
      </body></html>
    `;
    assert.equal(
      extractAnyPageImageUrl(html, PAGE),
      "https://store.example.com/products/usable.jpg"
    );
  });
});
