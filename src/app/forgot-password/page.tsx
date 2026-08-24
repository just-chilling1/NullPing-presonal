"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setError(data?.error || "Could not send the reset email. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle={sent ? "Check your inbox for the reset link" : "Enter your email and we'll send you a reset link"}>
      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 py-4"
        >
          <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[var(--np-success)]" />
          </div>
          <p className="text-[15px] text-ink-3 text-center max-w-xs">
            We sent a password reset link to <strong className="text-ink">{email}</strong>.
          </p>
          <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[var(--np-danger)]/10 border border-[var(--np-danger)]/20 p-4 rounded-sm text-[#A32D2D] text-[15px]"
            >
              {error}
            </motion.div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="forgot-email" className="auth-field-label">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="auth-field-icon absolute left-4 top-1/2 -translate-y-1/2" size={18} />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-base w-full pl-12"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            <span className="flex items-center justify-center gap-2">
              {loading ? "Sending..." : (
                <>
                  <Mail size={18} />
                  Send Reset Link
                </>
              )}
            </span>
          </button>
        </form>
      )}

      <div className="flex flex-col items-center gap-4 auth-divider pt-6">
        <Link href="/login" className="auth-link flex items-center gap-2">
          <ArrowLeft size={14} />
          Back to Login
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1 text-[13px] text-ink-5">
        <ShieldCheck size={14} className="text-[var(--np-success)]" />
        <span>256-bit Encrypted</span>
      </div>
    </AuthLayout>
  );
}
