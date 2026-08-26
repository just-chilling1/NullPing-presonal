import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser, getServiceRoleClient } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import {
  buildOfferPageUrl,
  getServerAppUrl,
  resolveOfferPageLinksInText,
} from "@/lib/app-url";
import {
  listFacebookPostsForSite,
  saveFacebookPostBatch,
} from "@/features/blog-builder/lib/facebook-posts-vault";
import { generateFacebookPostsForOffer } from "@/features/publish-kit/lib/generate-facebook-posts";
import type { BlogSite } from "@/features/blog-builder/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function moneyPagePromoLink(request: Request, slug: string, ownerHandle?: string | null): string {
  const base = buildOfferPageUrl(getServerAppUrl(request), slug, ownerHandle);
  return `${base}?src=facebook`;
}

/** Instant Income: bulk-generate Facebook post variants from a live money page. */
export async function POST(request: Request) {
  const guard = featureApiGuard("premium-social");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const siteUrlInput = typeof body.siteUrl === "string" ? body.siteUrl.trim() : "";

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { data: siteRow } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .eq("status", "live")
    .maybeSingle();

  if (!siteRow) {
    return NextResponse.json(
      { error: "Live money page not found. Publish the page before generating Instant Income posts." },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const site = siteRow as BlogSite;
  const promoLink =
    siteUrlInput || moneyPagePromoLink(request, site.slug, site.owner_handle);

  try {
    const scrapeClient = getServiceRoleClient();
    const generated = await generateFacebookPostsForOffer({
      site,
      promoLink,
      scrapeClient,
    });

    const saved = await saveFacebookPostBatch(supabase, user.id, siteId, generated);

    return NextResponse.json(
      {
        posts: saved.map((p) => ({
          id: p.id,
          body: p.body,
          batchId: p.batch_id,
          createdAt: p.created_at,
        })),
        batchId: saved[0]?.batch_id ?? null,
        promoLink,
        count: saved.length,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const status = msg.includes("no posts") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status, headers: NO_STORE_HEADERS });
  }
}

export async function GET(request: Request) {
  const guard = featureApiGuard("premium-social");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const siteId = new URL(request.url).searchParams.get("siteId")?.trim() || "";
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { data: siteRow } = await supabase
    .from("sites")
    .select("slug, owner_handle, product_name, title, status")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!siteRow?.slug) {
    return NextResponse.json({ error: "Money page not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const promoLink = moneyPagePromoLink(request, siteRow.slug, siteRow.owner_handle);
  const posts = await listFacebookPostsForSite(supabase, user.id, siteId);

  return NextResponse.json(
    {
      posts: posts.map((p) => ({
        id: p.id,
        body: resolveOfferPageLinksInText(p.body, promoLink, siteRow.slug),
        batchId: p.batch_id,
        createdAt: p.created_at,
      })),
      promoLink,
      productName: siteRow.product_name || siteRow.title,
      status: siteRow.status,
    },
    { headers: NO_STORE_HEADERS }
  );
}
