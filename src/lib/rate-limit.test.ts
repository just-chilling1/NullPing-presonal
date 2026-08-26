import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consumeRateLimit, resetRateLimitForTests } from "./rate-limit";

describe("consumeRateLimit", () => {
  it("blocks a key after the window limit is exceeded", () => {
    resetRateLimitForTests();
    const key = `forgot:${Date.now()}`;
    assert.equal(consumeRateLimit(key, { limit: 2, windowMs: 60_000 }), true);
    assert.equal(consumeRateLimit(key, { limit: 2, windowMs: 60_000 }), true);
    assert.equal(consumeRateLimit(key, { limit: 2, windowMs: 60_000 }), false);
  });
});
