import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/features/blog-builder/lib/seo";
import { buildMoneyPageHtml } from "@/features/money-page/lib/html";
import { withMoneyPageThemeConfig } from "@/features/money-page/lib/themes";
import {
  ACCELERATOR_TARGET_COUNT,
  acceleratorTemplateKey,
  buildAcceleratorCatalog,
  type VaultCatalogEntry,
} from "./catalog";
import { buildVaultMoneyPageCopy } from "./vault-copy";
import { buildVaultPinDrafts } from "./vault-pins";
import { resolveVaultSeedImagePack } from "./vault-images";

const PLACEHOLDER_CTA = "https://example.com/affiliate-offer";

export interface AcceleratorSeedProgress {
  seeded: number;
  skipped: number;
  failed: number;
  total: number;
  complete: boolean;
  errors: string[];
}

function templateSlug(entry: VaultCatalogEntry): string {
  const base = slugify(entry.productName) || `vault-${entry.id}`;
  return `tpl-${base}-${entry.id}`;
}

export async function loadTemplateSite(
  admin: SupabaseClient,
  catalogId: number
): Promise<Record<string, unknown> | null> {
  const { data } = await admin
    .from("sites")
    .select("*")
    .eq("is_template", true)
    .eq("template_key", acceleratorTemplateKey(catalogId))
    .order("created_at", { ascending: true })
    .limit(1);
  return ((data ?? [])[0] as Record<string, unknown> | undefined) ?? null;
}

export function isTemplateComplete(site: Record<string, unknown> | null): boolean {
  if (!site) return false;
  const html = typeof site.sales_page_html === "string" ? site.sales_page_html.trim() : "";
  const json = site.sales_page_json as { vaultPinImages?: string[] } | null;
  const pins = Array.isArray(json?.vaultPinImages) ? json.vaultPinImages : [];
  return Boolean(html && pins.length >= 10);
}

/**
 * Seed one accelerator catalog entry as an is_template site with unique non-AI images.
 * Idempotent when the template already has HTML + 10 pin image URLs.
 */
export async function seedAcceleratorTemplate(params: {
  admin: SupabaseClient;
  ownerId: string;
  entry: VaultCatalogEntry;
  usedImages: Set<string>;
  force?: boolean;
}): Promise<"created" | "skipped" | "updated"> {
  const existing = await loadTemplateSite(params.admin, params.entry.id);
  if (!params.force && isTemplateComplete(existing)) {
    return "skipped";
  }

  const { pinImages } = await resolveVaultSeedImagePack({
    entry: params.entry,
    used: params.usedImages,
    admin: params.admin,
    ownerId: params.ownerId,
  });

  // Money pages stay text-only — no hero photos in the Unlimited vault.
  const copy = buildVaultMoneyPageCopy(params.entry, null);
  const pinDrafts = buildVaultPinDrafts(params.entry).map((draft, i) => ({
    ...draft,
    // Never fall back to draft placeholders — only product-resolved URLs.
    imageUrl: pinImages[i]?.trim() || "",
  }));

  const salesPageJson = {
    ...copy,
    heroImage: "",
    vaultPinImages: pinImages,
    vaultPins: pinDrafts,
  };

  const themeConfig = withMoneyPageThemeConfig(
    {},
    {
      moneyColorTheme: params.entry.colorTheme,
      moneyVariation: params.entry.variationId,
    }
  );

  const siteId =
    existing?.id && typeof existing.id === "string"
      ? (existing.id as string)
      : crypto.randomUUID();

  const html = buildMoneyPageHtml({
    siteId,
    productName: params.entry.productName,
    copy,
    ctaUrl: PLACEHOLDER_CTA,
    colorTheme: params.entry.colorTheme,
    variationId: params.entry.variationId,
  });

  const row: Record<string, unknown> = {
    user_id: params.ownerId,
    hobby: params.entry.niche,
    territory: params.entry.niche,
    title: copy.headline.slice(0, 180),
    tagline: copy.subheadline.slice(0, 160),
    slug: templateSlug(params.entry),
    theme: "editorial",
    theme_config: themeConfig,
    armed_links: [],
    status: "draft",
    site_type: "product",
    product_name: params.entry.productName,
    product_url: PLACEHOLDER_CTA,
    asset_source: "vault",
    template_key: acceleratorTemplateKey(params.entry.id),
    is_template: true,
    sales_page_html: html,
    sales_page_json: salesPageJson,
  };

  if (existing?.id) {
    const { error } = await params.admin
      .from("sites")
      .update(row)
      .eq("id", existing.id as string);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await params.admin.from("sites").insert({ id: siteId, ...row });
  if (error) {
    const { error: retryErr } = await params.admin.from("sites").insert(row);
    if (retryErr) throw new Error(retryErr.message);
  }
  return "created";
}

/**
 * Batch-seed accelerator vault templates (default: all 200).
 * Pass a shared usedImages set so no photo repeats across the vault.
 */
export async function seedAcceleratorTemplates(params: {
  admin: SupabaseClient;
  ownerId: string;
  offset?: number;
  limit?: number;
  force?: boolean;
  usedImages?: Set<string>;
  onProgress?: (msg: string) => void;
}): Promise<AcceleratorSeedProgress> {
  const catalog = buildAcceleratorCatalog();
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.max(1, Math.min(params.limit ?? catalog.length, catalog.length - offset));
  const slice = catalog.slice(offset, offset + limit);
  const usedImages = params.usedImages ?? new Set<string>();

  let seeded = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of slice) {
    try {
      const result = await seedAcceleratorTemplate({
        admin: params.admin,
        ownerId: params.ownerId,
        entry,
        usedImages,
        force: params.force,
      });
      if (result === "skipped") {
        skipped++;
        params.onProgress?.(`[${entry.id}/${ACCELERATOR_TARGET_COUNT}] skip ${entry.productName}`);
      } else {
        seeded++;
        params.onProgress?.(
          `[${entry.id}/${ACCELERATOR_TARGET_COUNT}] ${result} ${entry.productName} (unique images: ${usedImages.size})`
        );
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`#${entry.id} ${entry.productName}: ${msg}`);
      params.onProgress?.(`[${entry.id}] FAILED: ${msg}`);
    }
  }

  const total = await countSeededAcceleratorTemplates(params.admin);
  return {
    seeded,
    skipped,
    failed,
    total,
    complete: total >= ACCELERATOR_TARGET_COUNT && failed === 0,
    errors,
  };
}

export async function countSeededAcceleratorTemplates(admin: SupabaseClient): Promise<number> {
  const { data } = await admin
    .from("sites")
    .select("id, sales_page_html, sales_page_json")
    .eq("is_template", true)
    .like("template_key", "accelerator-%");

  let n = 0;
  for (const row of data ?? []) {
    if (isTemplateComplete(row as Record<string, unknown>)) n++;
  }
  return n;
}

export { PLACEHOLDER_CTA };
