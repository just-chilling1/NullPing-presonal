import { NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/admin-server";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Ensures the admin account exists (ADMIN_EMAIL / ADMIN_PASSWORD env). Safe to call from /login. */
export async function POST() {
  try {
    await ensureAdminUser(true);
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Admin setup failed.";
    console.error("[ensure-admin]", message);
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function GET() {
  return POST();
}
