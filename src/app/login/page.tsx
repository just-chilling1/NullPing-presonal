"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthAlternateLink } from "@/components/auth/auth-alternate-link";
import { AuthTrustBadge } from "@/components/auth/auth-trust-badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { brand } from "@/config/brand.config";
import { socialProof } from "@/config/social-proof.config";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Mail, Lock } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkEmail = searchParams.get("check_email") === "1";

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        setLoading(false);
      } else if (data.user) {
        window.location.href = "/dashboard";
      } else {
        setLoading(false);
      }
    } catch {
      setError("An unexpected system error occurred.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      subtitle={brand.authTagline}
      footer={
        socialProof.enabled && socialProof.loginPage.activeMembers > 0 ? (
          <p className="text-center text-[13px] text-ink-5">
            <span className="text-[var(--np-success)]">{socialProof.loginPage.activeMembers}</span> members active now
          </p>
        ) : (
          <AuthTrustBadge />
        )
      }
    >
      {checkEmail && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-sm border border-[var(--np-success)]/25 bg-[var(--np-success)]/10 px-4 py-3 text-[14px] text-ink-2 text-center"
          role="status"
        >
          Account created — check your email to confirm, then log in below.
        </motion.div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <ErrorBanner message={error} />
          </motion.div>
        )}

        <AuthField
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
        />

        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          showPasswordToggle
          disabled={loading}
        />

        <div className="flex justify-end -mt-1">
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton loading={loading} loadingLabel="Signing in…" label="Log In" icon={LogIn} />
      </form>

      <AuthAlternateLink prompt="New here?" href="/signup" linkLabel="Create an account" />
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
