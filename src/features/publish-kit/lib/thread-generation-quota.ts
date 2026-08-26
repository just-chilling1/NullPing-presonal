import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfUtcDay } from "@/features/blog-builder/lib/site-quota";

export const THREAD_GENERATION_DAILY_LIMIT = 5;

export interface ThreadGenerationQuota {
  limit: number;
  usedToday: number;
  remaining: number;
}

/** True when the quota table/migration is not applied yet. */
function isQuotaTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || "";
  const message = error.message || "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /schema cache|does not exist|Could not find the/i.test(message)
  );
}

export async function getThreadGenerationQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<ThreadGenerationQuota> {
  const { count, error } = await supabase
    .from("thread_generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfUtcDay());

  if (error) {
    // Soft-fail only when the table is absent so older DBs still generate pins.
    if (isQuotaTableMissing(error)) {
      return {
        limit: THREAD_GENERATION_DAILY_LIMIT,
        usedToday: 0,
        remaining: THREAD_GENERATION_DAILY_LIMIT,
      };
    }
    throw new Error(error.message);
  }

  const usedToday = count ?? 0;
  return {
    limit: THREAD_GENERATION_DAILY_LIMIT,
    usedToday,
    remaining: Math.max(0, THREAD_GENERATION_DAILY_LIMIT - usedToday),
  };
}

export async function recordThreadGeneration(
  supabase: SupabaseClient,
  userId: string,
  siteId: string
): Promise<void> {
  const { error } = await supabase.from("thread_generation_log").insert({
    user_id: userId,
    site_id: siteId,
  });

  // Soft-fail only when the table is absent; real insert failures must surface.
  if (error && !isQuotaTableMissing(error)) {
    throw new Error(error.message);
  }
}
