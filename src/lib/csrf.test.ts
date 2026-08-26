import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowMutatingApiRequest } from "./csrf";

const allowed = new Set(["nullpingmembersarea.com", "localhost"]);

describe("allowMutatingApiRequest", () => {
  it("allows GET without an Origin", () => {
    const request = new Request("https://nullpingmembersarea.com/api/assets/list");
    assert.equal(
      allowMutatingApiRequest(request, { hasAuthCookie: true, allowedHosts: allowed }),
      true
    );
  });

  it("allows mutating requests that have no auth cookie", () => {
    const request = new Request("https://nullpingmembersarea.com/api/auth/forgot-password", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(
      allowMutatingApiRequest(request, { hasAuthCookie: false, allowedHosts: allowed }),
      true
    );
  });

  it("rejects cookie-authenticated POSTs from a foreign Origin", () => {
    const request = new Request("https://nullpingmembersarea.com/api/blog/site", {
      method: "PATCH",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(
      allowMutatingApiRequest(request, { hasAuthCookie: true, allowedHosts: allowed }),
      false
    );
  });

  it("allows cookie-authenticated POSTs from an allowlisted Origin", () => {
    const request = new Request("https://nullpingmembersarea.com/api/blog/site", {
      method: "POST",
      headers: { origin: "https://nullpingmembersarea.com" },
    });
    assert.equal(
      allowMutatingApiRequest(request, { hasAuthCookie: true, allowedHosts: allowed }),
      true
    );
  });

  it("rejects cookie-authenticated POSTs with no Origin or Referer", () => {
    const request = new Request("https://nullpingmembersarea.com/api/blog/site", {
      method: "POST",
    });
    assert.equal(
      allowMutatingApiRequest(request, { hasAuthCookie: true, allowedHosts: allowed }),
      false
    );
  });
});
