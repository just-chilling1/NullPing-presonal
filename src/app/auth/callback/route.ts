import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerAppUrl } from "@/lib/app-url";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

function safeNextPath(next: string | null, fallback: string): string {
    if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
    return next;
}

function defaultNextPath(type: EmailOtpType | null): string {
    if (type === "recovery") return "/reset-password";
    // Dashboard (middleware routes incomplete profiles to /onboarding).
    if (type === "signup" || type === "email") return "/dashboard?email_confirmed=1";
    return "/dashboard";
}

function authErrorRedirect(siteUrl: string, type: EmailOtpType | null, message: string) {
    const path = type === "recovery" ? "/reset-password" : "/login";
    const errorUrl = new URL(path, siteUrl);
    errorUrl.searchParams.set("error", message);
    return NextResponse.redirect(errorUrl);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = safeNextPath(searchParams.get("next"), defaultNextPath(type));

    // Resolve the public origin explicitly — request.url behind the DigitalOcean
    // proxy can point at the internal host instead of the real domain.
    const siteUrl = getServerAppUrl(request);
    const redirectTarget = new URL(next, siteUrl);

    if (code || (tokenHash && type)) {
        const response = NextResponse.redirect(redirectTarget);

        const supabase = createServerClient(
            getSupabaseUrl(),
            getSupabaseAnonKey(),
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        response.cookies.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({ name, value: "", ...options });
                    },
                },
            }
        );

        try {
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error("Code exchange error:", error.message);
                    return authErrorRedirect(siteUrl, type, error.message);
                }
                return response;
            }

            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash!,
                type: type!,
            });
            if (error) {
                console.error("OTP verify error:", error.message);
                return authErrorRedirect(siteUrl, type, error.message);
            }
            return response;
        } catch (err: unknown) {
            console.error("Auth callback exception:", err);
            return authErrorRedirect(
                siteUrl,
                type,
                type === "recovery"
                    ? "Failed to verify reset link. Please try again."
                    : "Failed to verify email link. Please try again.",
            );
        }
    }

    return NextResponse.redirect(new URL("/login", siteUrl));
}
