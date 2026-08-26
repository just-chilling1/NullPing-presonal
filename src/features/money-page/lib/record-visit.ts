import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { visitorHash } from "@/lib/visitor-hash";

const BOT_RE = /bot|crawler|spider|crawling|preview|facebookexternalhit|slackbot|twitterbot|linkedinbot|pingdom|lighthouse/i;

export function isBotUserAgent(ua: string): boolean {
  return BOT_RE.test(ua);
}

function ipFromHeaders(headerList: Awaited<ReturnType<typeof headers>>): string {
  const candidates = [
    headerList.get("do-connecting-ip"),
    headerList.get("true-client-ip"),
    headerList.get("cf-connecting-ip"),
    headerList.get("x-real-ip"),
    headerList.get("x-forwarded-for"),
  ];
  for (const raw of candidates) {
    const ip = raw?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return "0.0.0.0";
}

export async function recordPublicPageVisit(params: {
  siteId: string;
  pinId?: string | null;
  source?: string | null;
}) {
  const headerList = await headers();
  const ua = headerList.get("user-agent") || "";
  if (isBotUserAgent(ua)) return;

  const ip = ipFromHeaders(headerList);
  if (!consumeRateLimit(`visit-ip:${ip}`, { limit: 30, windowMs: 60_000 })) return;

  const hash = visitorHash({ ip, userAgent: ua, siteId: params.siteId });
  if (!consumeRateLimit(`visit-hash:${hash}`, { limit: 1, windowMs: 30 * 60_000 })) return;

  const country =
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    null;

  const supabase = createPublicSupabaseClient();
  await supabase.rpc("record_page_visit", {
    p_site_id: params.siteId,
    p_pin_id: params.pinId || null,
    p_source: params.source || null,
    p_country: country,
    p_visitor_hash: hash,
  }).then(({ error }) => {
    if (error) console.warn("[visit]", error.message);
  });
}
