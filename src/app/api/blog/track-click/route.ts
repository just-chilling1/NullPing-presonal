import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertPublicHttpUrl } from "@/lib/safe-url";
import { normalizeAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import type { ArmedLink } from "@/features/blog-builder/types";
import { getServiceRoleClient } from "@/lib/api-auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { consumeRateLimit } from "@/lib/rate-limit";
import { visitorHash } from "@/lib/visitor-hash";
import { clientIpFromRequest } from "@/lib/specialist-popup-eligibility";

export const dynamic = "force-dynamic";

function getAnonClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}

function normalizeDest(raw: string): string {
  return normalizeAffiliateUrl(raw).replace(/\/$/, "").toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  const postId = searchParams.get("post");
  const siteId = searchParams.get("site");

  if (!to || !siteId) {
    return NextResponse.json({ error: "Missing destination or site" }, { status: 400 });
  }

  const normalizedTo = normalizeAffiliateUrl(to);
  if (!normalizedTo) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertPublicHttpUrl(normalizedTo);
  } catch {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  // Prefer service role for the allowlist lookup so RLS never blocks a valid click;
  // redirect still only goes to urls stored on that site.
  const admin = getServiceRoleClient();
  const reader = admin ?? getAnonClient();

  const { data: site } = await reader
    .from("sites")
    .select("armed_links, product_url")
    .eq("id", siteId)
    .maybeSingle();

  const links = Array.isArray(site?.armed_links) ? (site.armed_links as ArmedLink[]) : [];
  if (typeof site?.product_url === "string" && site.product_url.trim()) {
    links.push({ label: "product", url: site.product_url, network: "other" });
  }
  const allowed = new Set(
    links
      .map((l) => {
        try {
          return normalizeDest(assertPublicHttpUrl(l.url).toString());
        } catch {
          return null;
        }
      })
      .filter((u): u is string => Boolean(u))
  );

  if (allowed.size === 0 || !allowed.has(normalizeDest(target.toString()))) {
    return NextResponse.json({ error: "Destination not allowed for this site" }, { status: 400 });
  }

  const ip = clientIpFromRequest(request) || "0.0.0.0";
  if (!consumeRateLimit(`click-ip:${ip}`, { limit: 20, windowMs: 60_000 })) {
    return NextResponse.redirect(target.toString(), 302);
  }
  const ua = request.headers.get("user-agent") || "";
  const hash = visitorHash({ ip, userAgent: ua, siteId });
  const clickKey = `click-hash:${hash}:${normalizeDest(target.toString())}`;
  const shouldRecord = consumeRateLimit(clickKey, { limit: 1, windowMs: 15 * 60_000 });

  if (shouldRecord) {
    const safePostId =
      postId && /^[0-9a-f-]{36}$/i.test(postId) ? postId : null;
    await getAnonClient().rpc("record_affiliate_click", {
      p_site_id: siteId,
      p_post_id: safePostId,
      p_link_url: target.toString(),
      p_visitor_hash: hash,
    });
  }

  return NextResponse.redirect(target.toString(), 302);
}
