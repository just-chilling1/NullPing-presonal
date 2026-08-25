"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Gift,
  GraduationCap,
  Loader2,
  Play,
  Save,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { getCachedClientUser } from "@/lib/auth-client-cache";
import { isAdminUser } from "@/lib/admin";
import { usePromoLinks } from "@/context/PromoLinksContext";
import type { ExclusiveOffer } from "@/config/offers.config";
import type { PromoLinksSettings } from "@/lib/promo-links";
import { getDefaultPromoLinks, isValidPromoUrl } from "@/lib/promo-links";
import { supabase } from "@/lib/supabase";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter } from "next/navigation";

const fieldClass = "input-base w-full text-sm";
const labelClass = "auth-field-label mb-1.5 block";
const hintClass = "mt-1.5 text-[12px] leading-relaxed text-text-muted";

function PreviewLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">
      {children}
    </p>
  );
}

function hostLabel(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "No URL set";
  try {
    return new URL(trimmed).hostname.replace(/^www\./, "");
  } catch {
    return "Invalid URL";
  }
}

function OfferPreview({ offer }: { offer: ExclusiveOffer }) {
  const title = offer.title.trim() || "Offer title";
  const subtitle = offer.subtitle?.trim();

  return (
    <div className="exclusive-offers-nav-section p-3" aria-hidden>
      <div className="exclusive-offers-nav-item px-2.5 py-2.5 text-[13px]">
        <span className="exclusive-offers-nav-play">
          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        </span>
        <span className="exclusive-offers-nav-copy min-w-0 flex-1">
          <span className="exclusive-offers-nav-title">{title}</span>
          {subtitle ? (
            <span className="exclusive-offers-nav-subtitle">{subtitle}</span>
          ) : null}
        </span>
        <ExternalLink
          className="exclusive-offers-nav-external h-3.5 w-3.5 shrink-0"
          strokeWidth={1.75}
        />
      </div>
    </div>
  );
}

function TrainingBannerPreview({
  url,
  title,
  ctaLabel,
}: {
  url: string;
  title: string;
  ctaLabel: string;
}) {
  const valid = isValidPromoUrl(url);
  const host = hostLabel(url);
  const headline = title.trim() || "Headline text";
  const button = ctaLabel.trim() || "Button text";

  return (
    <div
      className="relative overflow-hidden rounded-[var(--np-r-md)] border border-[var(--np-line-pulse)] bg-grad-tint p-3 text-center shadow-card"
      aria-hidden
    >
      <span className="mb-2 inline-block rounded-full bg-grad-ink px-2 py-0.5 text-[11px] font-medium tracking-[0.08em] text-[#FFFDF8]">
        Free Training
      </span>
      <p className="mb-2 text-[12px] font-medium uppercase leading-snug text-text-heading">
        {headline}
      </p>
      <div
        className={`inline-flex min-h-[36px] w-full items-center justify-center rounded-full bg-grad-pulse px-3 py-1.5 text-[12px] font-medium text-pulse-900 shadow-pulse ${
          valid ? "" : "opacity-50"
        }`}
      >
        {button}
      </div>
      <p className="mt-2 truncate text-[10px] text-text-muted" title={url.trim() || undefined}>
        → {host}
      </p>
    </div>
  );
}

function VideoWithdrawPreview({ url }: { url: string }) {
  const valid = isValidPromoUrl(url);
  const host = hostLabel(url);

  return (
    <div
      className="relative overflow-hidden rounded-[var(--np-r-md)] border border-[#00a36c]/35 bg-[#071510] p-3"
      aria-hidden
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: "#00a36c",
            boxShadow: "0 0 14px rgba(0,163,108,0.4)",
          }}
        >
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#22d38b]">
            Account Verified
          </p>
          <p className="mt-0.5 text-[12px] font-semibold leading-snug text-white">
            Eligible to withdraw <span className="text-[#22d38b]">$416.34</span>
          </p>
        </div>
      </div>
      <div
        className={`mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#00a36c] text-[12px] font-bold text-white ${
          valid ? "" : "opacity-50"
        }`}
      >
        Withdraw Now
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
      <p className="mt-2 truncate text-[10px] text-emerald-100/50" title={url.trim() || undefined}>
        → {host}
      </p>
    </div>
  );
}

function ScaleTrainingPreview({
  url,
  title,
  ctaLabel,
}: {
  url: string;
  title: string;
  ctaLabel: string;
}) {
  const valid = isValidPromoUrl(url);
  const host = hostLabel(url);
  const headline = title.trim() || "Headline text";
  const button = ctaLabel.trim() || "Button text";

  return (
    <div
      className="rounded-[var(--np-r-md)] border border-[var(--np-line)] bg-[var(--np-surface-field)] p-3 text-center"
      aria-hidden
    >
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--np-line-pulse)] bg-pulse-100 px-2.5 py-1">
        <Sparkles size={11} className="text-pulse-700" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-pulse-700">
          Exclusive Training
        </span>
      </div>
      <p className="brand-font mb-2 text-[13px] font-medium leading-snug text-text-heading">
        {headline}
      </p>
      <div
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-grad-pulse px-3 py-2.5 text-[12px] font-medium text-black shadow-pulse ${
          valid ? "" : "opacity-50"
        }`}
      >
        {button}
        <ArrowRight size={14} />
      </div>
      <p className="mt-2 truncate text-[10px] text-text-muted" title={url.trim() || undefined}>
        → {host}
      </p>
    </div>
  );
}

function OfferFields({
  index,
  offer,
  onChange,
}: {
  index: number;
  offer: ExclusiveOffer;
  onChange: (index: number, patch: Partial<ExclusiveOffer>) => void;
}) {
  const slot = index + 1;

  return (
    <div className="dashboard-nested-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-dim/50 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--np-line-pulse)] bg-pulse-200 text-[12px] font-semibold text-pulse-700">
            {slot}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-heading">Exclusive Offer {slot}</p>
            <p className="text-[12px] text-text-muted">Sidebar &amp; mobile More menu · slot {slot} of 3</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-3.5">
          <div>
            <label htmlFor={`offer-title-${index}`} className={labelClass}>
              Offer title
            </label>
            <input
              id={`offer-title-${index}`}
              type="text"
              value={offer.title}
              onChange={(e) => onChange(index, { title: e.target.value })}
              className={fieldClass}
              placeholder="Earn $400/Day Testing New Apps"
            />
            <p className={hintClass}>Main line members see in the Exclusive Offers list.</p>
          </div>
          <div>
            <label htmlFor={`offer-subtitle-${index}`} className={labelClass}>
              Subtitle / CTA label
            </label>
            <input
              id={`offer-subtitle-${index}`}
              type="text"
              value={offer.subtitle ?? ""}
              onChange={(e) => onChange(index, { subtitle: e.target.value })}
              className={fieldClass}
              placeholder="Claim Now"
            />
            <p className={hintClass}>
              Smaller text under the title (e.g. &quot;Claim Now&quot;). Leave blank to hide.
            </p>
          </div>
          <div>
            <label htmlFor={`offer-url-${index}`} className={labelClass}>
              Destination URL
            </label>
            <input
              id={`offer-url-${index}`}
              type="url"
              value={offer.href}
              onChange={(e) => onChange(index, { href: e.target.value })}
              className={fieldClass}
              placeholder="https://..."
            />
            <p className={hintClass}>Must be a valid https:// link.</p>
          </div>
        </div>

        <div className="space-y-2">
          <PreviewLabel>Live preview</PreviewLabel>
          <OfferPreview offer={offer} />
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Gift;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="dashboard-section-header mb-0 border-b-0 pb-0">
      <div className="dashboard-section-icon">
        <Icon size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ds-h3">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

export default function AdminPromoLinksPage() {
  const router = useRouter();
  const { settings: liveSettings, refresh, updateLocal } = usePromoLinks();
  const [form, setForm] = useState<PromoLinksSettings>(() => getDefaultPromoLinks());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void getCachedClientUser().then((user) => {
      if (!user || !isAdminUser(user)) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    setForm(liveSettings);
  }, [liveSettings]);

  const updateOffer = useCallback((index: number, patch: Partial<ExclusiveOffer>) => {
    setForm((prev) => {
      const next = [...prev.exclusiveOffers];
      next[index] = { ...next[index], ...patch };
      return { ...prev, exclusiveOffers: next };
    });
    setSuccess(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const res = await fetch("/api/admin/promo-links", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as { error?: string; settings?: PromoLinksSettings };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save promo links.");
      }

      const saved = data.settings ?? form;
      updateLocal(saved);
      setForm(saved);
      setSuccess(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promo links.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pulse-700" aria-hidden />
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl pb-36 lg:pb-28">
      <PageHeader
        eyebrow="Admin"
        title="Promo Links"
        subtitle="Edit Exclusive Offers, Free member training, and other promotional URLs. Changes apply immediately for all members."
      />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {success ? (
          <p
            className="rounded-[var(--np-r-md)] border border-[var(--np-success)]/25 bg-[var(--np-success)]/10 px-4 py-3 text-sm text-ink-2"
            role="status"
          >
            Promo links saved successfully.
          </p>
        ) : null}

        <section className="page-section-card space-y-5">
          <SectionHeading
            icon={Gift}
            title="Exclusive Offers"
            description="Three partner links shown in the sidebar and mobile More menu."
            action={
              <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-border-dim bg-[var(--np-surface-field)] px-3 py-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.exclusiveOffersEnabled}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, exclusiveOffersEnabled: e.target.checked }));
                    setSuccess(false);
                  }}
                  className="h-4 w-4 rounded border-border-dim text-pulse-700 focus:ring-pulse-700"
                />
                Show in sidebar
              </label>
            }
          />
          <div className="space-y-4">
            {form.exclusiveOffers.map((offer, index) => (
              <OfferFields key={index} index={index} offer={offer} onChange={updateOffer} />
            ))}
          </div>
        </section>

        <section className="page-section-card space-y-5">
          <SectionHeading
            icon={GraduationCap}
            title="Training & banners"
            description="Free member training URL — used on the dashboard bonus ad, earnings banner, and support upsell."
          />
          <div className="space-y-4">
            <div className="dashboard-nested-card space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="space-y-3.5">
                  <div>
                    <label htmlFor="external-training-title" className={labelClass}>
                      Headline text
                    </label>
                    <input
                      id="external-training-title"
                      type="text"
                      value={form.externalTrainingTitle}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, externalTrainingTitle: e.target.value }));
                        setSuccess(false);
                      }}
                      className={fieldClass}
                      placeholder="Multiply Your Earnings To $1,000 – $5,000 A Day"
                    />
                    <p className={hintClass}>Main headline on the earnings / free training banner.</p>
                  </div>
                  <div>
                    <label htmlFor="external-training-cta" className={labelClass}>
                      Button text
                    </label>
                    <input
                      id="external-training-cta"
                      type="text"
                      value={form.externalTrainingCtaLabel}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          externalTrainingCtaLabel: e.target.value,
                        }));
                        setSuccess(false);
                      }}
                      className={fieldClass}
                      placeholder="Click Here To Learn How"
                    />
                    <p className={hintClass}>
                      CTA label on the earnings banner and dashboard bonus ad button.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="external-training-url" className={labelClass}>
                      Free member training URL
                    </label>
                    <input
                      id="external-training-url"
                      type="url"
                      value={form.externalTrainingUrl}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, externalTrainingUrl: e.target.value }));
                        setSuccess(false);
                      }}
                      className={fieldClass}
                      placeholder="https://..."
                    />
                    <p className={hintClass}>
                      Powers the dashboard bonus ad, earnings banner, and support upsell CTA.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <PreviewLabel>Earnings banner</PreviewLabel>
                  <TrainingBannerPreview
                    url={form.externalTrainingUrl}
                    title={form.externalTrainingTitle}
                    ctaLabel={form.externalTrainingCtaLabel}
                  />
                </div>
              </div>
            </div>

            <div className="dashboard-nested-card space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Video size={14} className="text-text-muted" aria-hidden />
                    <label htmlFor="video-withdraw-url" className={`${labelClass} mb-0`}>
                      Video overlay withdraw URL
                    </label>
                  </div>
                  <input
                    id="video-withdraw-url"
                    type="url"
                    value={form.videoWithdrawUrl}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, videoWithdrawUrl: e.target.value }));
                      setSuccess(false);
                    }}
                    className={fieldClass}
                    placeholder="https://..."
                  />
                  <p className={hintClass}>
                    Shown under video overlays for withdraw / account-verified CTAs.
                  </p>
                </div>
                <div className="space-y-2">
                  <PreviewLabel>Video overlay</PreviewLabel>
                  <VideoWithdrawPreview url={form.videoWithdrawUrl} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section-card space-y-5">
          <SectionHeading
            icon={TrendingUp}
            title="Scale Training"
            description="Checkout link on the Scale Training page (when that feature is enabled)."
          />
          <div className="dashboard-nested-card space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="scale-training-title" className={labelClass}>
                    Headline text
                  </label>
                  <input
                    id="scale-training-title"
                    type="text"
                    value={form.scaleTrainingTitle}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, scaleTrainingTitle: e.target.value }));
                      setSuccess(false);
                    }}
                    className={fieldClass}
                    placeholder="Scale Your NullPing Cash To $1,000+ Per Day"
                  />
                  <p className={hintClass}>Main headline on the Scale Training page.</p>
                </div>
                <div>
                  <label htmlFor="scale-training-cta" className={labelClass}>
                    Button text
                  </label>
                  <input
                    id="scale-training-cta"
                    type="text"
                    value={form.scaleTrainingCtaLabel}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, scaleTrainingCtaLabel: e.target.value }));
                      setSuccess(false);
                    }}
                    className={fieldClass}
                    placeholder="Click Here To Access Training"
                  />
                  <p className={hintClass}>Primary CTA label on the Scale Training page.</p>
                </div>
                <div>
                  <label htmlFor="scale-training-url" className={labelClass}>
                    Scale Training URL
                  </label>
                  <input
                    id="scale-training-url"
                    type="url"
                    value={form.scaleTrainingUrl}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, scaleTrainingUrl: e.target.value }));
                      setSuccess(false);
                    }}
                    className={fieldClass}
                    placeholder="https://..."
                  />
                  <p className={hintClass}>Destination for the Scale Training page primary CTA.</p>
                </div>
              </div>
              <div className="space-y-2">
                <PreviewLabel>Scale Training page</PreviewLabel>
                <ScaleTrainingPreview
                  url={form.scaleTrainingUrl}
                  title={form.scaleTrainingTitle}
                  ctaLabel={form.scaleTrainingCtaLabel}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-border-dim bg-[color-mix(in_srgb,var(--np-surface)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:px-6 lg:bottom-0 lg:left-[var(--sidebar-w)]">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {success ? "All changes saved." : "Unsaved edits apply after you save."}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-7"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
