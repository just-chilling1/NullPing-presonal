/** Server-only admin credential env access (kept separate from client-safe admin helpers). */
export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD?.trim() || null;
}
