"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Save, Link2 } from "lucide-react";
import { getCachedClientUser } from "@/lib/auth-client-cache";
import { isAdminUser } from "@/lib/admin";
import { usePromoLinks } from "@/context/PromoLinksContext";
import type { ExclusiveOffer } from "@/config/offers.config";
import type { PromoLinksSettings } from "@/lib/promo-links";
import { getDefaultPromoLinks } from "@/lib/promo-links";
import { supabase } from "@/lib/supabase";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useRouter } from "next/navigation";

const fieldClass =
  "input-base w-full text-sm";

const labelClass = "auth-field-label mb-2 block";

function OfferFields({
  index,
  offer,
  onChange,
}: {
  index: number;
  offer: ExclusiveOffer;
  onChange: (index: number, patch: Partial<ExclusiveOffer>) => void;
}) {
  return (
    <div className="dashboard-nested-card space-y-3 p-4">
      <p className="text-sm font-medium text-text-heading">Offer {index + 1}</p>
      <div>
        <label htmlFor={`offer-title-${index}`} className={labelClass}>
          Title
        </label>
        <input
          id={`offer-title-${index}`}
          type="text"
          value={offer.title}
          onChange={(e) => onChange(index, { title: e.target.value })}
          className={fieldClass}
          placeholder="Earn $400/Day Testing New Apps"
        />
      </div>
      <div>
        <label htmlFor={`offer-subtitle-${index}`} className={labelClass}>
          Subtitle (optional)
        </label>
        <input
          id={`offer-subtitle-${index}`}
          type="text"
          value={offer.subtitle ?? ""}
          onChange={(e) => onChange(index, { subtitle: e.target.value })}
          className={fieldClass}
          placeholder="Claim Now"
        />
      </div>
      <div>
        <label htmlFor={`offer-url-${index}`} className={labelClass}>
          URL
        </label>
        <input
          id={`offer-url-${index}`}
          type="url"
          value={offer.href}
          onChange={(e) => onChange(index, { href: e.target.value })}
          className={fieldClass}
          placeholder="https://..."
        />
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
    <div className="page-container max-w-3xl pb-12">
      <div className="mb-8 flex items-start gap-3">
        <div className="dashboard-section-icon">
          <Link2 size={20} />
        </div>
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-text-muted">Admin</p>
          <h1 className="ds-h1 mt-1">Promo Links</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Edit Exclusive Offers, Free member training, and other promotional URLs. Changes apply
            immediately for all members.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {error ? <ErrorBanner message={error} /> : null}
        {success ? (
          <p
            className="rounded-sm border border-[var(--np-success)]/25 bg-[var(--np-success)]/10 px-4 py-3 text-sm text-ink-2"
            role="status"
          >
            Promo links saved successfully.
          </p>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="ds-h3">Exclusive Offers</h2>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
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
          </div>
          <p className="text-sm text-text-muted">
            Three partner links shown in the sidebar and mobile &quot;More&quot; menu.
          </p>
          {form.exclusiveOffers.map((offer, index) => (
            <OfferFields key={index} index={index} offer={offer} onChange={updateOffer} />
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="ds-h3">Training &amp; banners</h2>
          <p className="text-sm text-text-muted">
            Free member training URL — used on the dashboard bonus ad, earnings banner, and support
            upsell.
          </p>
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
          </div>
          <div>
            <label htmlFor="video-withdraw-url" className={labelClass}>
              Video overlay withdraw URL
            </label>
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
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="ds-h3">Scale Training</h2>
          <p className="text-sm text-text-muted">
            Checkout link on the Scale Training page (when that feature is enabled).
          </p>
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
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 self-start px-8">
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
      </form>
    </div>
  );
}
