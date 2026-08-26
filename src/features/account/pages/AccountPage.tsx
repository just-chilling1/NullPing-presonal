"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { NULLPING_PASSWORD_RESET_REDIRECT } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/page-header";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageLoading } from "@/components/ui/page-loading";
import { LicenseRightsPanel } from "@/features/premium-license-rights/components/LicenseRightsPanel";
import { getCachedClientUser } from "@/lib/auth-client-cache";
import { isFeatureEnabled } from "@/config/features.config";
import { brand } from "@/config/brand.config";

function formatWhen(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("Member");
  const [lastSignIn, setLastSignIn] = useState<string | undefined>();
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const licenseEnabled = isFeatureEnabled("premium-license-rights");
  const protectorEnabled = isFeatureEnabled("protector");

  const handleResetPassword = async () => {
    if (!email || resetLoading) return;

    setResetLoading(true);
    setResetError(null);
    setResetSent(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (res.ok) {
        setResetSent(true);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: NULLPING_PASSWORD_RESET_REDIRECT,
      });

      if (resetError) {
        setResetError(data?.error || resetError.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError("Could not send the reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    void getCachedClientUser().then((user) => {
      if (user) {
        setEmail(user.email ?? "");
        const handle = user.email?.split("@")[0] || "Member";
        setDisplayName(
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
            handle.charAt(0).toUpperCase() + handle.slice(1)
        );
        setLastSignIn(user.last_sign_in_at ?? undefined);
        setEmailConfirmed(Boolean(user.email_confirmed_at));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#license") {
      window.requestAnimationFrame(() => {
        document.getElementById("license")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading]);

  if (loading) {
    return <PageLoading message="Loading account..." />;
  }

  return (
    <WorkflowPage width="wide">
      <PageHeader
        eyebrow="Account"
        title="Your account"
        subtitle={`Profile, security shortcuts, and reseller license for ${brand.productName}.`}
      />

      <GlassPanel className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-pulse-100 text-pulse-700">
            <User size={22} aria-hidden />
          </div>
          <div>
            <p className="text-lg font-medium text-text-primary">{displayName}</p>
            <p className="text-sm text-text-muted">Active member</p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--np-line)] bg-[var(--np-surface-field)] p-4">
            <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <Mail size={12} />
              Email
            </dt>
            <dd className="mt-1 truncate text-sm text-text-primary">{email || "—"}</dd>
            <dd className="mt-1 text-xs text-text-muted">
              {emailConfirmed ? "Email confirmed" : "Email not confirmed yet"}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--np-line)] bg-[var(--np-surface-field)] p-4">
            <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <Clock size={12} />
              Last sign-in
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{formatWhen(lastSignIn)}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              disabled={!email || resetLoading}
              className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-60"
            >
              <KeyRound size={14} />
              {resetLoading ? "Sending reset link..." : "Reset password"}
            </button>
            {protectorEnabled ? (
              <Link href="/protector" className="btn-secondary inline-flex items-center gap-2 text-sm">
                <ShieldCheck size={14} />
                Cyber Protection
              </Link>
            ) : null}
          </div>
          {resetSent ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 size={14} aria-hidden />
              We sent a password reset link to {email}.
            </p>
          ) : null}
          {resetError ? (
            <p className="text-sm text-[var(--np-danger)]">{resetError}</p>
          ) : null}
        </div>
      </GlassPanel>

      {licenseEnabled ? (
        <section id="license" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-text-primary">Reseller & License Rights</h2>
            <p className="mt-1 text-sm text-text-muted">
              Request turnkey reseller activation. Our team unlocks the edition on your account.
            </p>
          </div>
          <LicenseRightsPanel compact />
        </section>
      ) : null}
    </WorkflowPage>
  );
}
