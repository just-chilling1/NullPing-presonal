import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/api-auth";
import { getServerAppUrl } from "@/lib/app-url";
import { sendPasswordResetEmail } from "@/lib/send-reset-email";

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const admin = getServiceRoleClient();
    if (!admin) {
      console.error("[auth] Missing SUPABASE_SERVICE_ROLE_KEY — cannot generate reset link.");
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const origin = resetEmailOrigin(request);
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    });

    if (error) {
      // Do not reveal whether the account exists.
      if (/user not found|unable to find/i.test(error.message)) {
        return NextResponse.json({ success: true });
      }
      console.error("[auth] generateLink failed:", error.message);
      return NextResponse.json(
        { error: "Could not start password reset. Please try again." },
        { status: 500 }
      );
    }

    const hashedToken =
      data.properties?.hashed_token || hashedTokenFromLink(data.properties?.action_link);

    if (!hashedToken) {
      console.error("[auth] Recovery link missing hashed_token.");
      return NextResponse.json(
        { error: "Could not start password reset. Please try again." },
        { status: 500 }
      );
    }

    const resetUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent("/reset-password")}`;
    const sent = await sendPasswordResetEmail({ to: email, resetUrl });

    if (!sent) {
      console.error("[auth] Reset email was not sent. Check RESEND_API_KEY.");
      return NextResponse.json(
        { error: "Could not send the reset email. Please try again shortly." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth] Forgot password error:", error);
    return NextResponse.json(
      { error: "Could not send the reset email. Please try again." },
      { status: 500 }
    );
  }
}
