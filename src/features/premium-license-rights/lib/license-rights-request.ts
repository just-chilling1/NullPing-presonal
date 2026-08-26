import { supabase } from "@/lib/supabase";
import { storageKeys } from "@/lib/storage-keys";

export const REQUEST_SUBJECT = "License Rights";

export const DEFAULT_REQUEST_MESSAGE = `I purchased the Full Turnkey Reseller & License Rights Edition and would like the team to activate it on my account.

Please reply to this email when the license is ready.`;

export interface PendingLicenseRightsRequest {
  email: string;
  submittedAt: string;
}

export type SubmitLicenseRightsResult = { ok: true } | { ok: false; error: string };

function pendingStorageKey(userId: string): string {
  return `${storageKeys.licenseRightsRequest}_${userId}`;
}

export function readPendingRequest(userId: string): PendingLicenseRightsRequest | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(pendingStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLicenseRightsRequest;
    if (typeof parsed?.email !== "string" || typeof parsed?.submittedAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePendingRequest(userId: string, email: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: PendingLicenseRightsRequest = {
      email,
      submittedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(pendingStorageKey(userId), JSON.stringify(payload));
  } catch {
    /* storage may be unavailable */
  }
}

export function clearPendingRequest(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(pendingStorageKey(userId));
  } catch {
    /* storage may be unavailable */
  }
}

/** Prefer server pending state; fall back to localStorage. */
export async function fetchPendingLicenseRequest(): Promise<PendingLicenseRightsRequest | null> {
  try {
    const res = await fetch("/api/premium/license-rights", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.pending?.email) {
      return {
        email: data.pending.email as string,
        submittedAt: (data.pending.submittedAt as string) || new Date().toISOString(),
      };
    }
  } catch {
    /* fall through */
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) return readPendingRequest(user.id);
  return null;
}

async function parseJsonResponse(res: Response): Promise<{
  error?: string;
  success?: boolean;
} | null> {
  const text = await res.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as { error?: string; success?: boolean };
  } catch {
    return null;
  }
}

export async function submitLicenseRightsRequest({
  email,
  message,
}: {
  email: string;
  message: string;
}): Promise<SubmitLicenseRightsResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    // Persist server-side first — pending state must survive browser clears.
    const persistRes = await fetch("/api/premium/license-rights", {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({ email, message }),
    });
    const persistData = await parseJsonResponse(persistRes);
    const persisted = persistRes.ok && Boolean(persistData?.success);

    const supportRes = await fetch("/api/support", {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({ email, message, subject: REQUEST_SUBJECT }),
    });
    const supportData = await parseJsonResponse(supportRes);
    const supportSent = supportRes.ok && Boolean(supportData?.success);

    // Prefer DB persistence. Allow support-only success only when the DB
    // migration is not applied yet (API returns 503 setup incomplete).
    if (persisted || (supportSent && persistRes.status === 503)) {
      return { ok: true };
    }

    return {
      ok: false,
      error: persistData?.error || supportData?.error || "Something went wrong. Please try again.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}
