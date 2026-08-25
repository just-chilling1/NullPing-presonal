import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { fetchMoneyPageHeroOptions } from "@/features/money-page/lib/hero-options";
import { isMoneyPageCopy } from "@/features/money-page/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const guard = featureApiGuard("money-page");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { assetId } = await context.params;
  const { data: site, error } = await supabase
    .from("sites")
    .select("id, product_name, title, tagline, hobby, sales_page_json, product_url, armed_links")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !site) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const productName =
    (typeof site.product_name === "string" && site.product_name.trim()) ||
    (typeof site.title === "string" && site.title.trim()) ||
    "product";
  const niche = typeof site.hobby === "string" ? site.hobby : "";
  const copy = isMoneyPageCopy(site.sales_page_json) ? site.sales_page_json : null;
  const pageDescription =
    copy?.productIntro?.trim() ||
    copy?.overview?.trim() ||
    (typeof site.tagline === "string" ? site.tagline.trim() : "") ||
    "";
  const excludeUrls = copy?.heroImage ? [copy.heroImage] : [];

  const scrapeUrls: string[] = [];
  if (typeof site.product_url === "string" && site.product_url.trim()) {
    scrapeUrls.push(site.product_url.trim());
  }
  const armed = Array.isArray(site.armed_links) ? site.armed_links : [];
  for (const link of armed) {
    const url = link && typeof link === "object" && typeof (link as { url?: string }).url === "string"
      ? (link as { url: string }).url.trim()
      : "";
    if (url && !scrapeUrls.includes(url)) scrapeUrls.push(url);
  }

  const images = await fetchMoneyPageHeroOptions({
    niche,
    productName,
    siteTitle: typeof site.title === "string" ? site.title : null,
    pageDescription,
    scrapeUrls,
    count: 5,
    excludeUrls,
  });

  return NextResponse.json({ images }, { headers: NO_STORE_HEADERS });
}
