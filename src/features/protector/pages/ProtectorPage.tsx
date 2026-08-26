"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  CheckCircle,
  Check,
  Mail,
  KeyRound,
  Clock,
  Activity,
  Image as ImageIcon,
  Globe,
  AlertCircle,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageLoading } from "@/components/ui/page-loading";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";
import { clearCachedClientUser } from "@/lib/auth-client-cache";
import { brand } from "@/config/brand.config";

interface AccountActivity {
  lastPublishAt: string | null;
  lastPinAt: string | null;
  lastVisitAt: string | null;
  livePages: number;
  pinCount: number;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return days === 1 ? "1 day ago" : `${days} days ago`;
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatActivityTime(
  iso: string | null | undefined,
  emptyLabel: string
): string {
  if (!iso) return emptyLabel;
  return formatRelativeTime(iso);
}

async function loadProtectorActivity(): Promise<AccountActivity | null> {
  const endpoints = ["/api/results", "/api/protector/status"];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, { cache: "no-store", credentials: "include" });
    if (!res.ok) continue;

    const payload = (await res.json()) as {
      moneyPagesLive?: number;
      trafficAssetsCreated?: number;
      accountActivity?: AccountActivity;
      livePages?: number;
      pinCount?: number;
      lastPublishAt?: string | null;
      lastPinAt?: string | null;
      lastVisitAt?: string | null;
    };

    if (payload.accountActivity) {
      return payload.accountActivity;
    }

    if (typeof payload.livePages === "number") {
      return {
        livePages: payload.livePages,
        pinCount: payload.pinCount ?? 0,
        lastPublishAt: payload.lastPublishAt ?? null,
        lastPinAt: payload.lastPinAt ?? null,
        lastVisitAt: payload.lastVisitAt ?? null,
      };
    }

    if (typeof payload.moneyPagesLive === "number") {
      return {
        livePages: payload.moneyPagesLive,
        pinCount: payload.trafficAssetsCreated ?? 0,
        lastPublishAt: null,
        lastPinAt: null,
        lastVisitAt: null,
      };
    }
  }

  return null;
}

export default function ProtectorPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | undefined>();
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isHttps, setIsHttps] = useState(true);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [activity, setActivity] = useState<AccountActivity>({
    lastPublishAt: null,
    lastPinAt: null,
    lastVisitAt: null,
    livePages: 0,
    pinCount: 0,
  });

  useEffect(() => {
    setIsHttps(typeof window !== "undefined" ? window.location.protocol === "https:" : true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("email_confirmed") === "1") {
        setJustConfirmed(true);
        clearCachedClientUser();
        params.delete("email_confirmed");
        const next = params.toString();
        const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
        window.history.replaceState({}, "", url);
      }
    }

    void (async () => {
      clearCachedClientUser();

      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      const user = userData.user ?? sessionData.session?.user ?? null;
      if (user?.email) setUserEmail(user.email);
      setLastSignIn(user?.last_sign_in_at ?? undefined);
      setEmailConfirmed(Boolean(user?.email_confirmed_at));
      setHasSession(Boolean(sessionData.session));

      if (user || sessionData.session) {
        const loaded = await loadProtectorActivity();
        if (loaded) {
          setActivity(loaded);
        } else {
          console.error("[protector] failed to load activity from API");
        }
      }

      setLoading(false);
    })();
  }, []);

  const checks = useMemo(() => {
    const items: Array<{
      label: string;
      description: string;
      ok: boolean;
      icon: typeof CheckCircle;
    }> = [
      {
        label: emailConfirmed ? "Email confirmed" : "Email not confirmed",
        description: emailConfirmed
          ? "Your email address is verified on this account."
          : "Confirm your email to keep account recovery options working.",
        ok: emailConfirmed,
        icon: Mail,
      },
      {
        label: hasSession ? "Session active" : "No active session",
        description: hasSession
          ? "You are signed in with a valid auth session."
          : "Sign in again to restore your session.",
        ok: hasSession,
        icon: KeyRound,
      },
      {
        label: isHttps ? "Secure connection (HTTPS)" : "Insecure connection",
        description: isHttps
          ? "This page is served over HTTPS."
          : "You are not on HTTPS — use the production app URL.",
        ok: isHttps,
        icon: Lock,
      },
      {
        label: `${activity.livePages} live money page${activity.livePages === 1 ? "" : "s"}`,
        description: "Published NullPing money pages on your account.",
        ok: activity.livePages > 0,
        icon: Globe,
      },
    ];
    return items;
  }, [emailConfirmed, hasSession, isHttps, activity.livePages]);

  const resendConfirmation = async () => {
    if (!userEmail) {
      setResendError("Sign in to resend a confirmation email.");
      setResendState("error");
      return;
    }
    setResendState("sending");
    setResendError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: userEmail,
      options: {
        emailRedirectTo: buildAuthCallbackUrl("/protector?email_confirmed=1"),
      },
    });
    if (error) {
      setResendError(error.message);
      setResendState("error");
      return;
    }
    setResendState("sent");
  };

  if (loading) {
    return <PageLoading message="Loading account status..." />;
  }

  return (
    <PremiumWorkflowShell
      title="Cyber Protection"
      subtitle="Real account and activity status for your NullPing membership — no fake security scores."
      training={{
        vimeoId: "",
        title: "Cyber Protection Training",
        description:
          "See what is real on this page: email confirmation, session, HTTPS, and recent money-page activity.",
        iframeTitle: "Cyber Protection training video",
      }}
      tip={
        <>
          Tip: Manage profile and reseller license on{" "}
          <Link href="/account" className="text-pulse-700 underline">
            Account
          </Link>
          .
        </>
      }
    >
      <GlassPanel className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Account status</p>
            <p className="mt-1 text-xs text-text-muted">
              Facts from your {brand.productName} session and assets.
            </p>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
              emailConfirmed && hasSession && isHttps
                ? "border-success/20 bg-success/10"
                : "border-[var(--np-warning)]/25 bg-[var(--np-warning)]/10"
            )}
          >
            {emailConfirmed && hasSession && isHttps ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-[var(--np-warning)]" />
            )}
            <span
              className={cn(
                "text-sm font-medium uppercase tracking-wider",
                emailConfirmed && hasSession && isHttps
                  ? "text-success"
                  : "text-[var(--np-warning)]"
              )}
            >
              {emailConfirmed && hasSession && isHttps ? "Account healthy" : "Action recommended"}
            </span>
          </div>
        </div>

        <div className="stat-grid">
          {[
            {
              label: "Email",
              value: emailConfirmed ? "Confirmed" : "Unconfirmed",
              icon: Mail,
              color: emailConfirmed ? "text-success" : "text-[var(--np-warning)]",
            },
            {
              label: "Session",
              value: hasSession ? "Active" : "None",
              icon: KeyRound,
              color: hasSession ? "text-success" : "text-[var(--np-warning)]",
            },
            {
              label: "Last sign-in",
              value: formatRelativeTime(lastSignIn),
              icon: Clock,
              color: "text-text-secondary",
            },
            {
              label: "Connection",
              value: isHttps ? "HTTPS" : "HTTP",
              icon: Lock,
              color: isHttps ? "text-success" : "text-[var(--np-warning)]",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="rounded-[var(--np-r-lg)] border border-[var(--np-line)] bg-[var(--np-surface-field)] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                  <span className="text-[13px] font-medium uppercase tracking-wider text-text-muted">
                    {stat.label}
                  </span>
                </div>
                <div className="truncate text-xl font-medium text-text-heading">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-medium text-text-heading">Status checks</h2>
          <div className="space-y-3">
            {checks.map((check, i) => (
              <motion.div
                key={check.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <GlassPanel intensity="low" className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        check.ok
                          ? "border-success/20 bg-success/10"
                          : "border-[var(--np-warning)]/25 bg-[var(--np-warning)]/10"
                      )}
                    >
                      <check.icon
                        className={cn(
                          "h-5 w-5",
                          check.ok ? "text-success" : "text-[var(--np-warning)]"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-text-primary">{check.label}</h3>
                      <p className="text-xs text-text-muted">{check.description}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium uppercase tracking-wider",
                        check.ok ? "text-success" : "text-[var(--np-warning)]"
                      )}
                    >
                      {check.ok ? (
                        <>
                          <Check size={14} strokeWidth={2.5} aria-hidden />
                          CHECKED
                        </>
                      ) : (
                        "Review"
                      )}
                    </span>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </div>

          {!emailConfirmed ? (
            <div className="rounded-xl border border-[var(--np-warning)]/25 bg-[var(--np-warning)]/10 p-4">
              <p className="text-sm text-text-primary">Confirm your email</p>
              <p className="mt-1 text-xs text-text-muted">
                {userEmail
                  ? `We’ll resend a confirmation link to ${userEmail}.`
                  : "Sign in so we can send a confirmation link to your inbox."}
              </p>
              {justConfirmed ? (
                <p className="mt-2 text-xs text-success">
                  Email confirmed — your account is up to date.
                </p>
              ) : null}
              {resendError ? (
                <p className="mt-2 text-xs text-[var(--np-danger)]">{resendError}</p>
              ) : null}
              {userEmail ? (
                <button
                  type="button"
                  disabled={resendState === "sending" || resendState === "sent"}
                  onClick={() => void resendConfirmation()}
                  className="btn-primary mt-3 inline-flex text-sm disabled:opacity-50"
                >
                  {resendState === "sending"
                    ? "Sending…"
                    : resendState === "sent"
                      ? "Sent — check inbox"
                      : resendState === "error"
                        ? "Try again"
                        : "Resend confirmation"}
                </button>
              ) : (
                <Link href="/login" className="btn-primary mt-3 inline-flex text-sm">
                  Sign in
                </Link>
              )}
            </div>
          ) : justConfirmed ? (
            <div className="rounded-xl border border-success/20 bg-success/10 p-4">
              <p className="text-sm text-success">Email confirmed — your account is up to date.</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <GlassPanel intensity="low" className="p-5">
            <h3 className="mb-4 text-sm font-medium text-text-heading">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--np-line)] py-2">
                <span className="text-xs text-text-muted">Email</span>
                <span className="ml-4 truncate text-xs font-medium text-text-primary">
                  {userEmail || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--np-line)] py-2">
                <span className="text-xs text-text-muted">Membership</span>
                <span className="text-xs font-medium text-success">Active</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-text-muted">Last sign-in</span>
                <span className="text-xs font-medium text-text-primary">
                  {formatRelativeTime(lastSignIn)}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/account" className="btn-primary text-center text-sm">
                Manage account
              </Link>
              <Link href="/forgot-password" className="btn-secondary text-center text-sm">
                Reset password
              </Link>
            </div>
          </GlassPanel>

          <GlassPanel intensity="low" className="p-5">
            <h3 className="mb-4 text-sm font-medium text-text-heading">Recent activity</h3>
            <div className="space-y-3">
              {[
                {
                  event: "Last money page update",
                  time: formatActivityTime(
                    activity.lastPublishAt,
                    activity.livePages > 0 ? "Live — publish date unavailable" : "No live pages yet"
                  ),
                  icon: Globe,
                },
                {
                  event: `Pin assets (${activity.pinCount})`,
                  time: formatActivityTime(
                    activity.lastPinAt,
                    activity.pinCount > 0 ? "Created recently" : "No pins yet"
                  ),
                  icon: ImageIcon,
                },
                {
                  event: "Last public page visit",
                  time: formatActivityTime(activity.lastVisitAt, "No visits yet"),
                  icon: Activity,
                },
              ].map((item) => (
                <div key={item.event} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--np-line)] bg-[var(--np-surface-field)]">
                    <item.icon className="h-3.5 w-3.5 text-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary">{item.event}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-text-muted" />
                      <span className="text-[13px] text-text-muted">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </PremiumWorkflowShell>
  );
}
