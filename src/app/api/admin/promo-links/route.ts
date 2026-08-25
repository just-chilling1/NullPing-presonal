import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { requireAdminUser } from "@/lib/admin";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import {
  type PromoLinksSettings,
  validatePromoLinksSettings,
} from "@/lib/promo-links";
import { upsertPromoLinksToDb } from "@/lib/promo-links-server";

export const dynamic = "force-dynamic";

function parseBody(body: unknown): PromoLinksSettings | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const exclusiveOffersEnabled = raw.exclusiveOffersEnabled === true;
  const exclusiveOffers = Array.isArray(raw.exclusiveOffers)
    ? raw.exclusiveOffers.map((item) => {
        const o = item as Record<string, unknown>;
        const subtitleRaw = typeof o.subtitle === "string" ? o.subtitle.trim() : "";
        return {
          title: typeof o.title === "string" ? o.title : "",
          href: typeof o.href === "string" ? o.href : "",
          subtitle: subtitleRaw || undefined,
        };
      })
    : [];

  const externalTrainingUrl =
    typeof raw.externalTrainingUrl === "string" ? raw.externalTrainingUrl : "";
  const videoWithdrawUrl = typeof raw.videoWithdrawUrl === "string" ? raw.videoWithdrawUrl : "";
  const scaleTrainingUrl = typeof raw.scaleTrainingUrl === "string" ? raw.scaleTrainingUrl : "";

  return {
    exclusiveOffersEnabled,
    exclusiveOffers,
    externalTrainingUrl,
    videoWithdrawUrl,
    scaleTrainingUrl,
  };
}

export async function PUT(request: Request) {
  const { user } = await getApiUser();
  if (!requireAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const settings = parseBody(body);
  if (!settings) {
    return NextResponse.json({ error: "Invalid promo link data" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const validationError = validatePromoLinksSettings(settings);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    await upsertPromoLinksToDb(settings);
    return NextResponse.json({ ok: true, settings }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save promo links.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
