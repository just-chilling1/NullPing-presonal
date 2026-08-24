/**
 * Applies site_promo_settings migration to a Supabase project via Management API.
 *
 * Usage:
 *   PROJECT_REF=cvkrtzmcbdymeaqznnnl node scripts/apply-promo-settings-migration.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN or ~/.supabase/access-token (from `npx supabase login`).
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_REF = process.env.PROJECT_REF?.trim() || process.env.SUPABASE_PROJECT_REF?.trim();
const API_BASE = "https://api.supabase.com/v1";

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const tokenPath = join(homedir(), ".supabase", "access-token");
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, "utf8").trim();
  }
  return null;
}

async function runQuery(token, query) {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(
      `Query failed (${res.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`
    );
  }
  return data;
}

async function main() {
  if (!PROJECT_REF) {
    console.error(
      "Missing PROJECT_REF. Example: PROJECT_REF=cvkrtzmcbdymeaqznnnl node scripts/apply-promo-settings-migration.mjs"
    );
    process.exit(1);
  }

  const token = loadToken();
  if (!token) {
    console.error("No Supabase access token. Run: npx supabase login");
    process.exit(1);
  }

  const migrationPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824120000_site_promo_settings.sql"
  );
  const sql = readFileSync(migrationPath, "utf8");

  console.log(`Applying site_promo_settings migration to ${PROJECT_REF}...`);
  await runQuery(token, sql);
  await runQuery(token, "NOTIFY pgrst, 'reload schema';");
  console.log("Done. site_promo_settings table is ready.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
