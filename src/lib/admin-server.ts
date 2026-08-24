import { getServiceRoleClient } from "@/lib/api-auth";
import { ONBOARDING_META_KEY } from "@/config/onboarding-content";
import { getAdminEmail, ADMIN_ROLE } from "@/lib/admin";
import { getAdminPassword } from "@/lib/admin-credentials";

let adminUserEnsured = false;

/** Creates or updates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD env vars. */
export async function ensureAdminUser(): Promise<void> {
  if (adminUserEnsured) return;

  const email = getAdminEmail();
  const password = getAdminPassword();
  if (!email || !password) return;

  const admin = getServiceRoleClient();
  if (!admin) {
    console.warn("[ensureAdminUser] SUPABASE_SERVICE_ROLE_KEY not set — admin user not seeded.");
    return;
  }

  const completedAt = new Date().toISOString();

  const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = existingList?.users.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, role: ADMIN_ROLE },
      user_metadata: {
        ...existing.user_metadata,
        [ONBOARDING_META_KEY]: true,
        full_name: "Admin",
      },
    });
    if (error) {
      console.warn("[ensureAdminUser] update failed:", error.message);
      return;
    }

    await admin
      .from("users")
      .upsert({ id: existing.id, onboarding_completed_at: completedAt }, { onConflict: "id" });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: ADMIN_ROLE },
      user_metadata: {
        [ONBOARDING_META_KEY]: true,
        full_name: "Admin",
      },
    });
    if (error) {
      console.warn("[ensureAdminUser] create failed:", error.message);
      return;
    }

    if (data.user) {
      await admin
        .from("users")
        .upsert({ id: data.user.id, onboarding_completed_at: completedAt }, { onConflict: "id" });
    }
  }

  adminUserEnsured = true;
}
