import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/api-auth";
import { sendPasswordResetEmail } from "@/lib/send-reset-email";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIpFromRequest } from "@/lib/specialist-popup-eligibility";

export const runtime = "nodejs";

/** Always NullPing production — never localhost, even on shared Supabase. */
const NULLPING_ORIGIN = "https://nullpingmembersarea.com";

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

/** Direct link with token_hash — bypasses Supabase redirect (CashTap TokenHash pattern). */
function buildDirectResetUrl(hashedToken: string): string {
  return `${NULLPING_ORIGIN}/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
}

async function sendResetViaResend(
  admin: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${NULLPING_ORIGIN}/auth/callback?next=/reset-password`,
    },
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

  return sendPasswordResetEmail({
    to: email,
    resetUrl: buildDirectResetUrl(hashedToken),
  });
}

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request) || "unknown";
    if (!consumeRateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 15 * 60_000 })) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const admin = getServiceRoleClient();
    if (!admin) {
      console.error("[auth] Missing SUPABASE_SERVICE_ROLE_KEY.");
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }

    const sent = await sendResetViaResend(admin, email);
    if (sent) {
      return NextResponse.json({ success: true });
    }

    console.error("[auth] Reset email was not sent via Resend.");
    return NextResponse.json(
      { error: "Could not send the reset email. Please try again shortly." },
      { status: 503 },
    );
  } catch (error) {
    console.error("[auth] Forgot password error:", error);
    return NextResponse.json(
      { error: "Could not send the reset email. Please try again." },
      { status: 500 },
    );
  }
}
