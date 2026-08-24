import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultPromoLinks,
  isValidPromoUrl,
  validatePromoLinksSettings,
} from "./promo-links";

describe("promo-links", () => {
  it("accepts valid https URLs", () => {
    assert.equal(isValidPromoUrl("https://example.com/path"), true);
    assert.equal(isValidPromoUrl("http://example.com"), false);
    assert.equal(isValidPromoUrl("not-a-url"), false);
  });

  it("validates full settings", () => {
    const settings = getDefaultPromoLinks();
    assert.equal(validatePromoLinksSettings(settings), null);
  });

  it("rejects invalid training URL", () => {
    const settings = { ...getDefaultPromoLinks(), externalTrainingUrl: "ftp://bad" };
    assert.match(validatePromoLinksSettings(settings) ?? "", /training URL/i);
  });
});
