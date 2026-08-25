import type { SupabaseClient } from "@supabase/supabase-js";
import type { VaultCatalogEntry } from "./catalog";
import { resolveVaultPinDrafts } from "./vault-images";

/**
 * Insert 10 ready Pinterest pins for a vault money page.
 * Images come from the shared product pin resolver (scrape → product Pixabay → empty).
 * Skips if pins already exist for the site.
 */
export async function seedVaultPins(params: {
  supabase: SupabaseClient;
  userId: string;
  siteId: string;
  entry: VaultCatalogEntry;
  scrapeUrl?: string | null;
  heroImage?: string | null;
  /** Pre-seeded unique pin images — generic URLs are re-resolved. */
  preloadedPinImages?: string[] | null;
  salesPageJson?: Record<string, unknown> | null;
}): Promise<number> {
  const { count } = await params.supabase
    .from("site_pins")
    .select("*", { count: "exact", head: true })
    .eq("site_id", params.siteId)
    .eq("user_id", params.userId);

  if ((count ?? 0) > 0) return count ?? 0;

  const copies = await resolveVaultPinDrafts({
    entry: params.entry,
    scrapeUrl: params.scrapeUrl,
    heroImage: params.heroImage,
    preloadedPinImages: params.preloadedPinImages,
    userId: params.userId,
    supabase: params.supabase,
  });
  const batchId = crypto.randomUUID();

  const rows = copies.map((pin, idx) => {
    const source =
      pin.imageUrl?.trim() && !/picsum\.photos|loremflickr\.com/i.test(pin.imageUrl)
        ? pin.imageUrl.trim()
        : null;
    return {
      user_id: params.userId,
      site_id: params.siteId,
      batch_id: batchId,
      idx,
      headline: pin.headline,
      title: pin.title,
      description: pin.description,
      keywords: pin.keywords,
      source_image_url: source,
    };
  });

  let { data: inserted, error } = await params.supabase.from("site_pins").insert(rows).select("id");

  if (error) {
    const legacyRows = rows.map(({ source_image_url: _s, ...rest }) => rest);
    const second = await params.supabase.from("site_pins").insert(legacyRows).select("id");
    inserted = second.data;
    error = second.error;
  }

  if (error || !inserted?.length) {
    console.error("[seedVaultPins]", error?.message || "insert failed");
    return 0;
  }

  const pinImages: Record<string, string> = {
    ...((params.salesPageJson as { pinImages?: Record<string, string> } | null)?.pinImages ?? {}),
  };

  await Promise.all(
    inserted.map(async (row, idx) => {
      const imagePath = `/api/pins/${row.id}/image`;
      const source = rows[idx]?.source_image_url;
      if (source) pinImages[row.id] = source;
      await params.supabase
        .from("site_pins")
        .update({
          image_url: imagePath,
          ...(source ? { source_image_url: source } : {}),
        })
        .eq("id", row.id);
    })
  );

  if (Object.keys(pinImages).length > 0 || params.salesPageJson) {
    await params.supabase
      .from("sites")
      .update({
        sales_page_json: {
          ...(params.salesPageJson && typeof params.salesPageJson === "object"
            ? params.salesPageJson
            : {}),
          pinImages,
        },
      })
      .eq("id", params.siteId)
      .eq("user_id", params.userId);
  }

  return inserted.length;
}
