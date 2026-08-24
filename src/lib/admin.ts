import type { User } from "@supabase/supabase-js";

export const ADMIN_ROLE = "admin" as const;

export function getAdminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isAdminUser(
  userOrClaims: { app_metadata?: Record<string, unknown>; email?: string | null } | null | undefined
): boolean {
  if (!userOrClaims) return false;
  const role = userOrClaims.app_metadata?.role;
  if (role === ADMIN_ROLE) return true;

  const adminEmail = getAdminEmail();
  if (adminEmail && userOrClaims.email?.toLowerCase() === adminEmail) {
    return true;
  }

  return false;
}

export function isAdminClaims(claims: Record<string, unknown> | null): boolean {
  if (!claims) return false;
  const appMeta = (claims.app_metadata ?? null) as Record<string, unknown> | null;
  const email = typeof claims.email === "string" ? claims.email : null;
  return isAdminUser({ app_metadata: appMeta ?? undefined, email });
}

export function requireAdminUser(user: User | null): user is User {
  return !!user && isAdminUser(user);
}
