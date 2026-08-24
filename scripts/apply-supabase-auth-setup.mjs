/**
 * Applies auth config to a Supabase project via Management API.
 *
 * Usage:
 *   APP_URL=https://yourdomain.com PROJECT_REF=your-ref node scripts/apply-supabase-auth-setup.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN or ~/.supabase/access-token (from `supabase login`).
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_REF = process.env.PROJECT_REF?.trim() || process.env.SUPABASE_PROJECT_REF?.trim();
const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const API_BASE = "https://api.supabase.com/v1";

const LOCAL_REDIRECTS = ["http://localhost:3000/**", "http://localhost:3001/**"];

const RECOVERY_TEMPLATE = `<h2>Reset Password</h2>
<p>Follow this link to reset the password for your account:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>`;

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

function parseAllowList(value) {
  if (!value || typeof value !== "string") return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function getRequiredRedirects() {
  const redirects = [...LOCAL_REDIRECTS];
  if (APP_URL) {
    redirects.push(`${APP_URL}/**`);
    redirects.push(`${APP_URL}/auth/callback`);
    redirects.push(`${APP_URL}/auth/callback?next=/reset-password`);
  }
  return redirects;
}

function mergeAllowList(existing) {
  const set = new Set(parseAllowList(existing));
  for (const url of getRequiredRedirects()) set.add(url);
  return [...set].join(",");
}

function needsConfirmationTemplateUpdate(content) {
  if (!content) return true;
  if (content.includes("{{ .ConfirmationURL }}")) return false;
  return true;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  if (!PROJECT_REF) {
    console.error("Missing PROJECT_REF. Example: PROJECT_REF=abc123 APP_URL=https://app.example.com node scripts/apply-supabase-auth-setup.mjs");
    process.exit(1);
  }

  if (!APP_URL) {
    console.warn("Warning: APP_URL not set — only localhost redirects will be added.");
  }

  const token = loadToken();
  if (!token) {
    console.error("No Supabase access token. Run: npx supabase login");
    process.exit(1);
  }

  console.log(`Fetching auth config for ${PROJECT_REF}...`);
  const before = await api("GET", `/projects/${PROJECT_REF}/config/auth`, token);

  const mergedAllowList = mergeAllowList(before.uri_allow_list);
  const allowListChanged = mergedAllowList !== (before.uri_allow_list ?? "");
  const siteUrlChanged = Boolean(APP_URL && before.site_url !== APP_URL);
  const recoveryChanged = (before.mailer_templates_recovery_content ?? "").trim() !== RECOVERY_TEMPLATE.trim();
  const confirmNeedsUpdate =
    before.mailer_autoconfirm === false &&
    needsConfirmationTemplateUpdate(before.mailer_templates_confirmation_content);

  const patch = {};
  if (siteUrlChanged) {
    patch.site_url = APP_URL;
    console.log(`Updating site_url to ${APP_URL}`);
  }

  if (allowListChanged) {
    patch.uri_allow_list = mergedAllowList;
    console.log("Updating uri_allow_list:");
    for (const url of parseAllowList(mergedAllowList)) console.log(`  - ${url}`);
  }

  if (recoveryChanged) {
    patch.mailer_templates_recovery_content = RECOVERY_TEMPLATE;
    console.log("Updating Reset Password template.");
  }

  if (confirmNeedsUpdate) {
    patch.mailer_templates_confirmation_content = `<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>`;
    console.log("Updating Confirm signup template.");
  }

  if (Object.keys(patch).length === 0) {
    console.log("No auth config changes needed.");
    return;
  }

  await api("PATCH", `/projects/${PROJECT_REF}/config/auth`, token, patch);
  console.log("Auth config updated.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
