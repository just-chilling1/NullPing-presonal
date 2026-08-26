import { createHash } from "node:crypto";

export function visitorHash(input: {
  ip: string;
  userAgent: string;
  siteId: string;
}): string {
  return createHash("sha256")
    .update(`${input.ip}\n${input.userAgent}\n${input.siteId}`)
    .digest("hex")
    .slice(0, 32);
}
