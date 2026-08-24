import { brand } from "@/config/brand.config";
import { RESEND_SENDER_EMAIL } from "@/lib/support";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from =
    process.env.RESEND_FROM_EMAIL || `${brand.productName} <${RESEND_SENDER_EMAIL}>`;
  const safeUrl = escapeHtml(options.resetUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: `Reset your ${brand.productName} password`,
        text: `Reset your password using this link:\n\n${options.resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Reset your ${escapeHtml(brand.productName)} password:</p><p><a href="${safeUrl}">Reset Password</a></p><p>If the button does not work, copy this URL:</p><p>${safeUrl}</p><p>If you did not request this, you can ignore this email.</p>`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[auth] Reset email send failed:", res.status, detail);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[auth] Reset email send failed:", error);
    return false;
  }
}
