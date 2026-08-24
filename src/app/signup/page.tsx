"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, Lock, User, UserPlus, Sparkles } from "lucide-react";
import { ONBOARDING_META_KEY } from "@/config/onboarding-content";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthAlternateLink } from "@/components/auth/auth-alternate-link";
import { AuthTrustBadge } from "@/components/auth/auth-trust-badge";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { ErrorBanner } from "@/components/ui/error-banner";
import { brand } from "@/config/brand.config";
import { webhooks } from "@/config/webhooks.config";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";
import { friendlyAuthError } from "@/lib/auth-errors";

const SIGNUP_BENEFITS = [
  "Choose high-converting affiliate offers",
  "Publish ready-made money pages",
  "Generate Pinterest traffic on autopilot",
] as const;

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl("/onboarding"),
          data: {
            full_name: trimmedName,
            [ONBOARDING_META_KEY]: false,
          },
        },
      });

      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        setLoading(false);
        return;
      }

      if (webhooks.signup) {
        const firstName = trimmedName.split(/\s+/)[0];
        fetch(webhooks.signup, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, email: trimmedEmail }),
        }).catch(() => {});
      }

      if (data.session) {
        window.location.href = "/onboarding";
      } else {
        setPendingEmail(trimmedEmail);
        setLoading(false);
      }
    } catch {
      setError("An unexpected system error occurred.");
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <AuthLayout subtitle="You're almost in" footer={<AuthTrustBadge />}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 py-2 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--np-success)]/25 bg-[var(--np-success)]/10">
            <CheckCircle2 size={32} className="text-[var(--np-success)]" aria-hidden />
          </div>
          <div className="flex flex-col gap-2 max-w-xs">
            <p className="text-[15px] text-ink-2">
              We sent a confirmation link to{" "}
              <strong className="text-ink break-all">{pendingEmail}</strong>.
            </p>
            <p className="text-[13px] text-ink-4">Open the email and click the link to activate your account.</p>
          </div>
          <Link href="/login?check_email=1" className="btn-primary w-full flex items-center justify-center gap-2">
            Continue to login
            <ArrowRight size={16} aria-hidden />
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle={brand.signupTagline} footer={<AuthTrustBadge />} className="max-w-lg">
      <ul className="auth-benefits-list" aria-label="What you get">
        {SIGNUP_BENEFITS.map((benefit) => (
          <li key={benefit} className="auth-benefit-item">
            <Sparkles size={14} className="text-pulse-500 shrink-0 mt-0.5" aria-hidden />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSignup} className="flex flex-col gap-5">
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <ErrorBanner message={error} />
          </motion.div>
        )}

        <AuthField
          id="signup-name"
          label="Full name"
          icon={User}
          type="text"
          required
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          disabled={loading}
        />

        <AuthField
          id="signup-email"
          label="Email"
          icon={Mail}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
        />

        <div className="flex flex-col gap-2">
          <AuthField
            id="signup-password"
            label="Password"
            icon={Lock}
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            showPasswordToggle
            disabled={loading}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <AuthSubmitButton loading={loading} loadingLabel="Creating account…" label="Sign Up" icon={UserPlus} />
      </form>

      <AuthAlternateLink prompt="Already have an account?" href="/login" linkLabel="Log in" />
    </AuthLayout>
  );
}
