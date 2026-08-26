import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPublicHttpUrl,
  isPrivateOrLocalHost,
  resolvePublicImageSourceUrl,
} from "./safe-url";

describe("isPrivateOrLocalHost", () => {
  it("blocks loopback, link-local metadata, and internal names", () => {
    assert.equal(isPrivateOrLocalHost("127.0.0.1"), true);
    assert.equal(isPrivateOrLocalHost("localhost"), true);
    assert.equal(isPrivateOrLocalHost("169.254.169.254"), true);
    assert.equal(isPrivateOrLocalHost("10.0.0.8"), true);
    assert.equal(isPrivateOrLocalHost("192.168.1.1"), true);
    assert.equal(isPrivateOrLocalHost("metadata.google.internal"), true);
  });

  it("allows ordinary public hostnames", () => {
    assert.equal(isPrivateOrLocalHost("cdn.pixabay.com"), false);
    assert.equal(isPrivateOrLocalHost("images.unsplash.com"), false);
  });
});

describe("assertPublicHttpUrl", () => {
  it("rejects private http(s) targets used for SSRF", () => {
    assert.throws(() => assertPublicHttpUrl("http://127.0.0.1/secret"));
    assert.throws(() => assertPublicHttpUrl("http://169.254.169.254/latest/meta-data/"));
    assert.throws(() => assertPublicHttpUrl("http://localhost/admin"));
    assert.throws(() => assertPublicHttpUrl("https://user:pass@example.com/img.jpg"));
  });
});

describe("resolvePublicImageSourceUrl", () => {
  it("passes through data image URLs", async () => {
    const data = "data:image/png;base64,aaa";
    assert.equal(await resolvePublicImageSourceUrl(data), data);
  });

  it("refuses stock placeholders and private URLs", async () => {
    assert.equal(await resolvePublicImageSourceUrl("https://picsum.photos/1200"), null);
    assert.equal(await resolvePublicImageSourceUrl("http://127.0.0.1/photo.jpg"), null);
    assert.equal(await resolvePublicImageSourceUrl("http://169.254.169.254/latest/meta-data/"), null);
    assert.equal(await resolvePublicImageSourceUrl("not-a-url"), null);
  });
});
