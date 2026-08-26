import { fetchJson } from "@/lib/fetch-json";

const COMPLETIONS_URL = "/api/training/completions";

/** Stable Academy completion key — survives empty Vimeo ids and title tweaks within a track. */
export function academyCompletionKey(
  kind: "platform" | "premium",
  video: { title: string; badge?: string }
): string {
  const label = (video.badge || video.title).trim().toLowerCase();
  const slug = label
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${kind}:${slug || "untitled"}`;
}

export async function fetchTrainingCompletions(): Promise<string[]> {
  const result = await fetchJson<{ video_ids?: string[] }>(COMPLETIONS_URL, {
    credentials: "include",
    cache: "no-store",
  });
  if (!result.ok) return [];
  return Array.isArray(result.data.video_ids)
    ? result.data.video_ids.filter((id) => typeof id === "string")
    : [];
}

export async function markTrainingComplete(videoId: string): Promise<boolean> {
  const result = await fetchJson(COMPLETIONS_URL, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId }),
  });
  return result.ok;
}

export async function clearTrainingComplete(videoId: string): Promise<boolean> {
  const result = await fetchJson(
    `${COMPLETIONS_URL}?video_id=${encodeURIComponent(videoId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  return result.ok;
}
