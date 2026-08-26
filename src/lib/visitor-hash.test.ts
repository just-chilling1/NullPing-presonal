import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { visitorHash } from "./visitor-hash";

describe("visitorHash", () => {
  it("is stable for the same visitor and does not embed the raw IP", () => {
    const a = visitorHash({ ip: "203.0.113.9", userAgent: "Mozilla/5.0", siteId: "site-1" });
    const b = visitorHash({ ip: "203.0.113.9", userAgent: "Mozilla/5.0", siteId: "site-1" });
    assert.equal(a, b);
    assert.equal(a.includes("203.0.113.9"), false);
    assert.match(a, /^[a-f0-9]{16,64}$/);
  });

  it("changes when the site or IP changes", () => {
    const base = visitorHash({ ip: "203.0.113.9", userAgent: "Mozilla/5.0", siteId: "site-1" });
    const otherSite = visitorHash({ ip: "203.0.113.9", userAgent: "Mozilla/5.0", siteId: "site-2" });
    const otherIp = visitorHash({ ip: "198.51.100.2", userAgent: "Mozilla/5.0", siteId: "site-1" });
    assert.notEqual(base, otherSite);
    assert.notEqual(base, otherIp);
  });
});
