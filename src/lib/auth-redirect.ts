import { getAppUrl } from "@/lib/brand-vars";

const PRODUCTION_APP_URL = "https://nullpingmembersarea.com";

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

/** Supabase email links must land on /auth/callback so we can exchange the code / verify OTP. */
export function buildAuthCallbackUrl(nextPath: string): string {
  const base = getAppUrl().replace(/\/$/, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Password reset redirect — always production when configured (CashTap pattern). */
export function buildPasswordResetCallbackUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const base =
    configured && !isLocalhostUrl(configured)
      ? configured
      : typeof window !== "undefined" && !isLocalhostUrl(window.location.origin)
        ? window.location.origin
        : PRODUCTION_APP_URL;
  return `${base}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}
