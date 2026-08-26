import { NextResponse } from "next/server";
import { getApiUserFromRequest } from "@/lib/api-auth";
import { sendSupportMessage } from "@/lib/send-support-message";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIpFromRequest } from "@/lib/specialist-popup-eligibility";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request) || "unknown";
    if (!consumeRateLimit(`support:${ip}`, { limit: 5, windowMs: 15 * 60_000 })) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const { user } = await getApiUserFromRequest(request);

    // Visitors on login / signup / password pages can contact support without a session.
    const userId = user?.id ?? "not signed in (auth pages)";

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (message.length < 10) {
      return NextResponse.json({ error: "Message is too short" }, { status: 400 });
    }

    const sent = await sendSupportMessage({ email, message, userId, subject });

    if (!sent) {
      return NextResponse.json(
        { error: "Could not send your message. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[support] Support error:", error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again in a moment." },
      { status: 500 }
    );
  }
}
