import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/api-auth";
import {
  getDefaultPromoLinks,
  rowToPromoLinks,
  type PromoLinksRow,
  type PromoLinksSettings,
} from "@/lib/promo-links";

export async function fetchPromoLinksFromDb(
  client?: SupabaseClient | null
): Promise<PromoLinksSettings> {
  const supabase = client ?? getServiceRoleClient();
  if (!supabase) return getDefaultPromoLinks();

  const { data, error } = await supabase
    .from("site_promo_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[fetchPromoLinksFromDb]", error.message);
    return getDefaultPromoLinks();
  }

  return rowToPromoLinks(data as PromoLinksRow | null);
}

export async function upsertPromoLinksToDb(settings: PromoLinksSettings): Promise<void> {
  const admin = getServiceRoleClient();
  if (!admin) {
    throw new Error("Server configuration error.");
  }

  const row = {
    id: 1,
    exclusive_offers_enabled: settings.exclusiveOffersEnabled,
    exclusive_offers: settings.exclusiveOffers,
    external_training_url: settings.externalTrainingUrl.trim(),
    external_training_title: settings.externalTrainingTitle.trim(),
    external_training_cta_label: settings.externalTrainingCtaLabel.trim(),
    video_withdraw_url: settings.videoWithdrawUrl.trim(),
    scale_training_url: settings.scaleTrainingUrl.trim(),
    scale_training_title: settings.scaleTrainingTitle.trim(),
    scale_training_cta_label: settings.scaleTrainingCtaLabel.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("site_promo_settings").upsert(row, { onConflict: "id" });
  if (error) {
    if (/site_promo_settings/i.test(error.message) && /schema cache|does not exist|column/i.test(error.message)) {
      throw new Error(
        "Promo links schema is out of date on this Supabase project. Run: PROJECT_REF=your-project-ref node scripts/apply-promo-settings-migration.mjs"
      );
    }
    throw new Error(error.message);
  }
}
