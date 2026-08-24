import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS, PRIVATE_READ_CACHE_HEADERS } from "@/lib/api-cache-headers";
import { fetchPromoLinksFromDb } from "@/lib/promo-links-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const settings = await fetchPromoLinksFromDb(supabase);
  return NextResponse.json(settings, { headers: PRIVATE_READ_CACHE_HEADERS });
}
