/**
 * Seed all 200 Unlimited (accelerator) sales-page templates on your PC.
 *
 * Images: sales pages have no hero photo; 10 pin backgrounds use the shared pin-generator
 * resolver (product-page scrape → Pixabay product queries). No Picsum/LoremFlickr/AI.
 * After seeding, member install/preview clones stored pages — no generation wait.
 *
 * Usage (PowerShell / CMD from repo root):
 *   npx tsx scripts/seed-accelerator-vault.ts
 *   npx tsx scripts/seed-accelerator-vault.ts --force
 *   npx tsx scripts/seed-accelerator-vault.ts --offset=0 --limit=25
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEMPLATE_OWNER_ID          (a real Supabase auth user uuid that owns templates)
 * Optional:
 *   PIXABAY_API_KEY            (better niche-related stock photos)
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// Load .env.local before app modules read process.env at import time (e.g. PIXABAY_API_KEY).
loadEnvLocal();

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { countSeededAcceleratorTemplates, seedAcceleratorTemplates } = await import(
    "../src/features/premium-accelerator/lib/seed-vault-templates"
  );
  const { ACCELERATOR_TARGET_COUNT } = await import(
    "../src/features/premium-accelerator/lib/catalog"
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const ownerId = process.env.TEMPLATE_OWNER_ID?.trim();

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local");
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it from Supabase → Project Settings → API → service_role."
    );
  }
  if (!ownerId) {
    throw new Error(
      "TEMPLATE_OWNER_ID is missing. Set it to a real Supabase Auth user UUID that will own the template sites."
    );
  }

  const force = process.argv.includes("--force");
  const offset = Number(argValue("offset") ?? "0") || 0;
  const limit = Number(argValue("limit") ?? String(ACCELERATOR_TARGET_COUNT)) || ACCELERATOR_TARGET_COUNT;

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ownerUser, error: ownerErr } = await admin.auth.admin.getUserById(ownerId);
  if (ownerErr || !ownerUser?.user) {
    throw new Error(
      `TEMPLATE_OWNER_ID is not a valid Supabase Auth user (${ownerId}). Pick a real user UUID from Supabase → Authentication → Users.`
    );
  }

  const already = await countSeededAcceleratorTemplates(admin);
  console.log(
    `Unlimited vault seed — target ${ACCELERATOR_TARGET_COUNT}, already complete: ${already}, offset=${offset}, limit=${limit}${force ? " (force)" : ""}`
  );
  console.log(
    "Rules: no sales-page hero; stricter product-matched pin photos (Pixabay relevance ≥ 78)."
  );
  console.log(`Template owner: ${ownerUser.user.email ?? ownerId}`);

  const result = await seedAcceleratorTemplates({
    admin,
    ownerId,
    offset,
    limit,
    force,
    onProgress: (msg) => console.log(msg),
  });

  console.log(
    `\nDone. seeded=${result.seeded} skipped=${result.skipped} failed=${result.failed} totalComplete=${result.total}/${ACCELERATOR_TARGET_COUNT}`
  );
  if (result.errors.length) {
    console.log("Errors:");
    for (const err of result.errors) console.log(" -", err);
  }
  if (result.complete) {
    console.log("Vault is fully seeded. Member Unlimited installs will clone without regenerating pages.");
  } else {
    console.log(
      "Vault not fully complete yet. Re-run (optionally with --offset / --limit) until totalComplete reaches 200."
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
