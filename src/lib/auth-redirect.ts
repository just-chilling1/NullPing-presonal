import { getAppUrl } from "@/lib/brand-vars";

const PRODUCTION_APP_URL = "https://nullpingmembersarea.com";

/** Hardcoded production callback — shared Supabase must not fall back to localhost. */
export const NULLPING_PASSWORD_RESET_REDIRECT =
  `${PRODUCTION_APP_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

/** Supabase email links must land on /auth/callback so we can exchange the code / verify OTP. */
export function buildAuthCallbackUrl(nextPath: string): string {
  const base = getAppUrl().replace(/\/$/, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Password reset redirect — always NullPing production (CashTap hardcoded pattern). */
export function buildPasswordResetCallbackUrl(): string {
  return NULLPING_PASSWORD_RESET_REDIRECT;
}
