import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/api-auth";
import { getServerAppUrl } from "@/lib/app-url";
import {
  sendPasswordResetEmail,
  sendSupabaseRecoveryEmail,
} from "@/lib/send-reset-email";

export const runtime = "nodejs";

const PRODUCTION_ORIGIN = "https://nullpingmembersarea.com";

function isLocalhost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

function resetEmailOrigin(request: Request): string {
  const fromRequest = getServerAppUrl(request);
  if (fromRequest && !isLocalhost(fromRequest)) return fromRequest.replace(/\/$/, "");

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (configured && !isLocalhost(configured)) return configured;

  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;
  return fromRequest.replace(/\/$/, "") || "http://localhost:3000";
}

function hashedTokenFromLink(actionLink: string | undefined): string | null {
  if (!actionLink) return null;
  try {
    const url = new URL(actionLink);
    return (
      url.searchParams.get("token") ||
      url.searchParams.get("token_hash") ||
      url.hash.match(/(?:token|token_hash)=([^&]+)/)?.[1] ||
      null
    );
  } catch {
    return null;
  }
}

async function sendViaResend(
  admin: SupabaseClient,
  email: string,
  origin: string,
  redirectTo: string
): Promise<boolean> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    if (/user not found|unable to find/i.test(error.message)) return true;
    console.error("[auth] generateLink failed:", error.message);
    return false;
  }

  const hashedToken =
    data.properties?.hashed_token || hashedTokenFromLink(data.properties?.action_link);

  if (!hashedToken) {
    console.error("[auth] Recovery link missing hashed_token.");
    return false;
  }

  const resetUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent("/reset-password")}`;
  return sendPasswordResetEmail({ to: email, resetUrl });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const origin = resetEmailOrigin(request);
    const redirectTo = `${origin}/auth/callback?next=/reset-password`;
    const admin = getServiceRoleClient();

    const [viaSupabase, viaResend] = await Promise.all([
      sendSupabaseRecoveryEmail(email, redirectTo),
      admin ? sendViaResend(admin, email, origin, redirectTo) : Promise.resolve(false),
    ]);

    if (viaSupabase || viaResend) {
      return NextResponse.json({ success: true });
    }

    console.error("[auth] Reset email was not sent via Supabase or Resend.");
    return NextResponse.json(
      { error: "Could not send the reset email. Please try again shortly." },
      { status: 503 }
    );
  } catch (error) {
    console.error("[auth] Forgot password error:", error);
    return NextResponse.json(
      { error: "Could not send the reset email. Please try again." },
      { status: 500 }
    );
  }
}
