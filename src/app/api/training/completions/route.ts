import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS, PRIVATE_READ_CACHE_HEADERS } from "@/lib/api-cache-headers";

export const dynamic = "force-dynamic";

function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || "";
  const message = error.message || "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /does not exist|schema cache/i.test(message)
  );
}

function normalizeVideoIds(body: { video_id?: unknown; video_ids?: unknown }): string[] {
  const fromArray = Array.isArray(body.video_ids) ? body.video_ids : [];
  const fromSingle = typeof body.video_id === "string" ? [body.video_id] : [];
  return [...fromArray, ...fromSingle]
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0 && id.length <= 120);
}

export async function GET() {
  const guard = featureApiGuard("training");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { data, error } = await supabase
    .from("user_training_completions")
    .select("video_id, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ video_ids: [], completions: [] }, { headers: PRIVATE_READ_CACHE_HEADERS });
    }
    return NextResponse.json(
      { error: "Failed to load training completions" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const completions = (data ?? []).map((row) => ({
    videoId: row.video_id as string,
    completedAt: row.completed_at as string,
  }));

  return NextResponse.json(
    {
      video_ids: completions.map((c) => c.videoId),
      completions,
    },
    { headers: PRIVATE_READ_CACHE_HEADERS }
  );
}

export async function POST(request: Request) {
  const guard = featureApiGuard("training");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const body = (await request.json().catch(() => ({}))) as {
    video_id?: unknown;
    video_ids?: unknown;
  };
  const ids = normalizeVideoIds(body);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "video_id required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const now = new Date().toISOString();
  const rows = ids.map((video_id) => ({
    user_id: user.id,
    video_id,
    completed_at: now,
  }));

  const { error } = await supabase
    .from("user_training_completions")
    .upsert(rows, { onConflict: "user_id,video_id", ignoreDuplicates: true });

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json(
        {
          error:
            "Database setup incomplete. Run the user_training_completions migration, then try again.",
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to save completion" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ ok: true, video_ids: ids }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const guard = featureApiGuard("training");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const videoId = new URL(request.url).searchParams.get("video_id")?.trim() || "";
  if (!videoId) {
    return NextResponse.json(
      { error: "video_id required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { error } = await supabase
    .from("user_training_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("video_id", videoId);

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      { error: error.message || "Failed to remove completion" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
