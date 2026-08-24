import { NextResponse } from "next/server";
import { linkVaultApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS, PRIVATE_READ_CACHE_HEADERS } from "@/lib/api-cache-headers";
import type { ArmedLink } from "@/features/blog-builder/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = linkVaultApiGuard();
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const [{ data: vaultRow }, { data: sites }] = await Promise.all([
    supabase.from("link_vault").select("links").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("sites")
      .select("id, title, product_name, status, armed_links, product_url")
      .eq("user_id", user.id)
      .eq("is_template", false)
      .order("created_at", { ascending: false }),
  ]);

  const links = (vaultRow?.links ?? []) as ArmedLink[];
  return NextResponse.json(
    { links, sites: sites ?? [] },
    { headers: PRIVATE_READ_CACHE_HEADERS }
  );
}

export async function PUT(request: Request) {
  const guard = linkVaultApiGuard();
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const body = await request.json();
  const links = Array.isArray(body.links) ? (body.links as ArmedLink[]) : [];

  const { data, error } = await supabase
    .from("link_vault")
    .upsert(
      {
        user_id: user.id,
        links,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("links")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ links: data.links }, { headers: NO_STORE_HEADERS });
}
