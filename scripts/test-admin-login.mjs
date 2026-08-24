import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function main() {
  console.log("ADMIN_EMAIL:", email);
  console.log("ADMIN_PASSWORD length:", password?.length);

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.error("listUsers error:", error.message);
    return;
  }

  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  console.log(
    "User found:",
    match
      ? {
          id: match.id,
          email: match.email,
          confirmed: !!match.email_confirmed_at,
          role: match.app_metadata?.role,
        }
      : "NO"
  );

  const client = createClient(url, anon);
  const signIn = await client.auth.signInWithPassword({ email, password });
  console.log("signIn error:", signIn.error?.message ?? "none");
  console.log("signIn ok:", !!signIn.data.user);

  if (!match) {
    console.log("\nCreating admin user...");
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    console.log("create error:", created.error?.message ?? "none");
    if (created.data.user) {
      const retry = await client.auth.signInWithPassword({ email, password });
      console.log("retry signIn error:", retry.error?.message ?? "none");
    }
  } else if (signIn.error) {
    console.log("\nResetting admin password...");
    const updated = await admin.auth.admin.updateUserById(match.id, {
      password,
      email_confirm: true,
      app_metadata: { ...match.app_metadata, role: "admin" },
    });
    console.log("update error:", updated.error?.message ?? "none");
    const retry = await client.auth.signInWithPassword({ email, password });
    console.log("retry signIn error:", retry.error?.message ?? "none");
  }
}

main().catch(console.error);
