import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedStylesheetUrl, sanitizeCss, sanitizePostHtml } from "./sanitize-html";

describe("sanitizeCss", () => {
  it("strips @import, javascript URLs, and expression() from injected CSS", () => {
    const out = sanitizeCss(`
      @import url("https://evil.example/x.css");
      body { background: url(javascript:alert(1)); }
      div { width: expression(alert(1)); behavior: url(xss.htc); }
    `);
    const lower = out.toLowerCase();
    assert.equal(lower.includes("@import"), false);
    assert.equal(lower.includes("javascript"), false);
    assert.equal(lower.includes("expression("), false);
    assert.equal(lower.includes("behavior"), false);
  });

  it("keeps ordinary color and layout rules", () => {
    const out = sanitizeCss(".title { color: #0f172a; font-size: 28px; }");
    assert.match(out, /color:\s*#0f172a/i);
    assert.match(out, /font-size:\s*28px/i);
  });
});

describe("isAllowedStylesheetUrl", () => {
  it("allows Google Fonts and rejects other hosts", () => {
    assert.equal(
      isAllowedStylesheetUrl("https://fonts.googleapis.com/css2?family=Inter"),
      true
    );
    assert.equal(isAllowedStylesheetUrl("https://evil.example/css"), false);
    assert.equal(isAllowedStylesheetUrl("javascript:alert(1)"), false);
  });
});

describe("sanitizePostHtml", () => {
  it("removes scripts and event handlers", () => {
    const out = sanitizePostHtml(
      `<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>`
    );
    const lower = out.toLowerCase();
    assert.equal(lower.includes("<script"), false);
    assert.equal(lower.includes("onclick"), false);
    assert.equal(lower.includes("javascript:"), false);
  });
});
