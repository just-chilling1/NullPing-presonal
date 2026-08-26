"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { getNavIcon } from "@/lib/nav-icons";
import { supabase } from "@/lib/supabase";
import { completePendingAuthFromUrl } from "@/lib/auth-pending-url";
import { clearCachedClientUser } from "@/lib/auth-client-cache";
import {
  onboardingContent,
  ONBOARDING_DASHBOARD_ROUTE,
  ONBOARDING_PRODUCT_NAME,
} from "@/config/onboarding-content";

function OnboardingBrand() {
  const Icon = getNavIcon(brand.logo.icon);
  const useImage = brand.logo.type === "image";
  const isWordmarkImage = useImage && brand.logo.wordmark;
  const imageSrc = isWordmarkImage ? brand.logo.src : brand.logo.iconSrc ?? brand.logo.src;

  return (
    <div className="flex items-center gap-3">
      {useImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={brand.logo.alt}
          width={isWordmarkImage ? undefined : 40}
          height={isWordmarkImage ? undefined : 40}
          className={clsx(
            "w-auto shrink-0 object-contain",
            isWordmarkImage ? "h-12 sm:h-14 md:h-16" : "h-10"
          )}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-grad-pulse shadow-sm">
          <Icon size={20} className="text-pulse-900" />
        </div>
      )}
      {!isWordmarkImage && (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{brand.productName}</p>
          <p className="truncate text-sm text-ink-4">{brand.tagline}</p>
        </div>
      )}
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const cfg = onboardingContent.activation;

  const [firstName, setFirstName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState(0);

  useEffect(() => {
    void (async () => {
      const result = await completePendingAuthFromUrl();
      if (result.status === "error") {
        setError(result.message);
        setCheckingAuth(false);
        return;
      }

      if (result.status === "none") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/login");
          return;
        }
      }

      clearCachedClientUser();
      setCheckingAuth(false);
    })();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    const timers = cfg.infoSteps.map((_, i) =>
      window.setTimeout(() => setActivationStep(i + 1), 600 * (i + 1))
    );
    return () => timers.forEach(window.clearTimeout);
  }, [cfg.infoSteps, checkingAuth]);

  const handleActivate = async () => {
    const trimmed = firstName.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ firstName: trimmed }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not activate your account. Please try again.");
        return;
      }

      await supabase.auth.refreshSession();
      clearCachedClientUser();
      window.location.href = ONBOARDING_DASHBOARD_ROUTE;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 z-[300] flex min-h-[100dvh] items-center justify-center bg-canvas">
        <p className="text-sm text-ink-4">Setting up your account…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex min-h-[100dvh] bg-canvas">
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 sm:px-10">
          <div className="mb-8">
            <OnboardingBrand />
          </div>

          <h1 className="ds-h1 sm:text-4xl">{cfg.headline}</h1>
          <p className="mt-3 text-lg text-ink-3">{cfg.subheadline}</p>

          <input
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={cfg.inputPlaceholder}
            aria-label={`Your first name for ${ONBOARDING_PRODUCT_NAME}`}
            autoComplete="given-name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && firstName.trim() && !submitting) {
                void handleActivate();
              }
            }}
            className="input-base mt-6 h-14 w-full text-lg sm:text-xl"
          />

          <div className="page-section-card mt-6 p-5">
            <p className="mb-3 text-sm font-medium text-ink">{cfg.infoTitle}</p>
            <ol className="space-y-2.5">
              {cfg.infoSteps.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-start gap-3 text-sm transition-all duration-500 ${ activationStep > i ? "text-ink-2" : "text-ink-4" }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${ activationStep > i ? "bg-success text-white" : "bg-pulse-100 text-ink-3" }`}
                  >
                    {activationStep > i ? "✓" : i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-4 text-sm font-medium text-pulse-700">{cfg.note}</p>

          {error && (
            <p className="mt-5 rounded-xl border border-[var(--np-danger)]/20 bg-[var(--np-danger)]/10 px-4 py-3 text-[15px] text-[var(--np-danger)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={!firstName.trim() || submitting}
            className="btn-primary mt-6 h-14 w-full text-lg sm:text-xl"
          >
            {submitting ? "Activating…" : cfg.ctaLabel}
          </button>
        </div>
      </main>
    </div>
  );
}

export default OnboardingFlow;
