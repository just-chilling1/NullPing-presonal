import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { getThreadGenerationQuota } from "@/features/publish-kit/lib/thread-generation-quota";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = featureApiGuard("traffic-pins");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const quota = await getThreadGenerationQuota(supabase, user.id);
    return NextResponse.json({ quota }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load quota";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
