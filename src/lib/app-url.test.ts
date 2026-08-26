import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAllowedAppHosts, originFromForwardedHeaders } from "./app-url";

describe("collectAllowedAppHosts", () => {
  it("always includes the production NullPing host and configured app URL", () => {
    const hosts = collectAllowedAppHosts({
      NEXT_PUBLIC_APP_URL: "https://nullpingmembersarea.com",
      VERCEL_URL: "preview-abc.vercel.app",
    });
    assert.equal(hosts.has("nullpingmembersarea.com"), true);
    assert.equal(hosts.has("www.nullpingmembersarea.com"), true);
    assert.equal(hosts.has("preview-abc.vercel.app"), true);
  });
});

describe("originFromForwardedHeaders", () => {
  const allowed = collectAllowedAppHosts({
    NEXT_PUBLIC_APP_URL: "https://nullpingmembersarea.com",
  });

  it("accepts the real production host", () => {
    assert.equal(
      originFromForwardedHeaders(
        {
          host: "nullpingmembersarea.com",
          forwardedHost: "nullpingmembersarea.com",
          forwardedProto: "https",
        },
        allowed
      ),
      "https://nullpingmembersarea.com"
    );
  });

  it("ignores a spoofed X-Forwarded-Host that is not on the allowlist", () => {
    assert.equal(
      originFromForwardedHeaders(
        {
          host: "nullpingmembersarea.com",
          forwardedHost: "evil.example",
          forwardedProto: "https",
        },
        allowed
      ),
      "https://nullpingmembersarea.com"
    );
  });

  it("returns null when every host header is hostile", () => {
    assert.equal(
      originFromForwardedHeaders(
        {
          host: "evil.example",
          forwardedHost: "phish.test",
          forwardedProto: "https",
        },
        allowed
      ),
      null
    );
  });
});
