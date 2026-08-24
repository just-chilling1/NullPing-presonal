"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertTriangle, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [checking, setChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const urlError = urlParams.get("error");
            if (urlError) {
                setError(urlError);
                setChecking(false);
                return;
            }

            const tokenHash = urlParams.get("token_hash");
            const type = urlParams.get("type");
            if (tokenHash && type === "recovery") {
                try {
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: "recovery",
                    });
                    if (verifyError) {
                        setError(verifyError.message);
                    } else {
                        setReady(true);
                    }
                } catch {
                    setError("Failed to verify reset link. Please request a new one.");
                }
                setChecking(false);
                return;
            }

            const code = urlParams.get("code");
            if (code) {
                try {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        setError(exchangeError.message);
                    } else {
                        setReady(true);
                    }
                } catch {
                    setError("Failed to verify reset code. Please request a new link.");
                }
                setChecking(false);
                return;
            }

            const hash = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hash);

            const hashError = hashParams.get("error_description");
            if (hashError) {
                setError(hashError.replace(/\+/g, " "));
                setChecking(false);
                return;
            }

            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            if (accessToken && refreshToken) {
                try {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (sessionError) {
                        setError(sessionError.message);
                    } else {
                        setReady(true);
                    }
                } catch {
                    setError("Failed to verify reset link. Please request a new one.");
                }
                setChecking(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setReady(true);
            } else {
                setError("No active reset session. Please request a new password reset link.");
            }
            setChecking(false);
        };

        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setReady(true);
                setChecking(false);
                setError(null);
            }
        });

        init();
        return () => { listener.subscription.unsubscribe(); };
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                await supabase.auth.signOut();
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const pageTitle = success
        ? "Password Updated"
        : ready
          ? "New Password"
          : checking
            ? "Verifying..."
            : "Reset Password";

    const pageSubtitle = success
        ? "You can now log in with your new password"
        : ready
          ? "Enter your new password below"
          : checking
            ? "Please wait..."
            : undefined;

    const renderContent = () => {
        if (checking) {
            return (
                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-8 h-8 border-2 border-pulse-700 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[15px] text-ink-3">Verifying your reset link...</p>
                </div>
            );
        }

        if (success) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 py-4"
                >
                    <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-[var(--np-success)]" />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-[15px] text-ink font-medium">Password updated!</p>
                        <p className="text-[13px] text-ink-3">Redirecting you to login...</p>
                    </div>
                </motion.div>
            );
        }

        if (!ready) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 py-4"
                >
                    <div className="w-16 h-16 bg-[var(--np-danger)]/10 border border-[var(--np-danger)]/20 rounded-full flex items-center justify-center">
                        <AlertTriangle size={32} className="text-[var(--np-danger)]" />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-[15px] text-ink font-medium">Link Expired or Invalid</p>
                        <p className="text-[13px] text-ink-3 leading-relaxed max-w-xs">
                            {error || "This password reset link has expired or is invalid. Please request a new one."}
                        </p>
                    </div>
                    <Link
                        href="/forgot-password"
                        className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
                    >
                        <Mail size={16} />
                        Request New Reset Link
                    </Link>
                </motion.div>
            );
        }

        return (
            <form onSubmit={handleUpdate} className="flex flex-col gap-5">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--np-danger)]/10 border border-[var(--np-danger)]/20 p-4 rounded-sm flex items-center gap-3 text-[var(--np-danger)] text-sm"
                    >
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="flex flex-col gap-2">
                    <label htmlFor="reset-password" className="auth-field-label">New Password</label>
                    <div className="relative group">
                        <Lock className="auth-field-icon absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                        <input
                            id="reset-password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="input-base w-full pl-12 pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="auth-field-icon absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer hover:text-pulse-700"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="reset-confirm-password" className="auth-field-label">Confirm Password</label>
                    <div className="relative group">
                        <Lock className="auth-field-icon absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                        <input
                            id="reset-confirm-password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="input-base w-full pl-12"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full mt-2 group relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? "Updating..." : (
                            <>
                                <Lock size={18} />
                                Update Password
                            </>
                        )}
                    </span>
                </button>
            </form>
        );
    };

    return (
        <AuthLayout subtitle={pageSubtitle}>
            <div className="flex flex-col items-center gap-1 text-center -mt-2">
                <h1 className="brand-font text-[34px] text-ink leading-tight">
                    {pageTitle}
                </h1>
            </div>

            {renderContent()}

            {(ready || checking) && !success && (
                <div className="flex flex-col items-center gap-4 auth-divider pt-6">
                    <Link
                        href="/login"
                        className="auth-link"
                    >
                        Back to Login
                    </Link>
                </div>
            )}

            <div className="flex items-center justify-center gap-1 text-[13px] text-ink-5">
                <ShieldCheck size={14} className="text-[var(--np-success)]" />
                <span>256-bit Encrypted</span>
            </div>
        </AuthLayout>
    );
}
