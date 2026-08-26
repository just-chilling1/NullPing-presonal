import { NextResponse } from "next/server";
import { getApiUser, getServiceRoleClient } from "@/lib/api-auth";
import { ONBOARDING_META_KEY } from "@/config/onboarding-content";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { setOnboardingCompleteCookie } from "@/lib/onboarding-cookie";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let firstName = "";
  try {
    const body = (await request.json()) as { firstName?: unknown };
    firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!firstName) {
    return NextResponse.json({ error: "First name is required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const existingMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const completedAt = new Date().toISOString();
  const metadata = {
    ...existingMeta,
    [ONBOARDING_META_KEY]: true,
    first_name: firstName,
    full_name: firstName,
  };

  const admin = getServiceRoleClient();
  if (admin) {
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400, headers: NO_STORE_HEADERS });
    }
  } else {
    const { error: updateError } = await supabase.auth.updateUser({ data: metadata });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 400, headers: NO_STORE_HEADERS });
    }
  }

  const profileClient = getServiceRoleClient() ?? supabase;
  const { error: profileError } = await profileClient
    .from("users")
    .upsert(
      {
        id: user.id,
        onboarding_completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

  if (profileError) {
    // Auth metadata + cookie still gate onboarding; profile row is the durable store.
    console.warn("[onboarding/complete] users profile upsert failed:", profileError.message);
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  setOnboardingCompleteCookie(response);
  return response;
}
