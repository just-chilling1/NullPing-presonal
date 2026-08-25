"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Scale,
  BookOpen,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { AffiliateLinkField } from "@/components/premium/AffiliateLinkField";
import { isMoneyPageCopy, type MoneyPageCopy } from "@/features/money-page/lib/types";
import {
  getMoneyPageColorTheme,
  MONEY_PAGE_COLOR_THEMES,
  type MoneyPageColorThemeId,
  isMoneyPageColorThemeId,
} from "@/features/money-page/lib/themes";
import {
  MONEY_PAGE_VARIATIONS,
  type MoneyPageVariationId,
  isMoneyPageVariationId,
} from "@/features/money-page/lib/variations";
import { sitePublicPath } from "@/lib/app-url";
import { uploadMoneyPageImage } from "@/features/money-page/lib/upload-client";

const FIELD_LABELS: Partial<Record<keyof MoneyPageCopy, string>> = {
  headline: "Headline",
  subheadline: "Subheadline",
  productIntro: "Product introduction",
  overview: "Overview",
  review: "Review",
  finalRecommendation: "Final recommendation",
};

const VARIATION_ICONS: Record<MoneyPageVariationId, typeof Scale> = {
  "honest-review": Scale,
  "beginner-breakdown": BookOpen,
  "smart-buyer": ClipboardCheck,
};

export default function MoneyPageEditor() {
  const params = useParams<{ assetId: string }>();
  const router = useRouter();
  const assetId = params.assetId;
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [copy, setCopy] = useState<MoneyPageCopy | null>(null);
  const [colorTheme, setColorTheme] = useState<MoneyPageColorThemeId>("ocean");
  const [variationId, setVariationId] = useState<MoneyPageVariationId>("honest-review");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heroOptions, setHeroOptions] = useState<string[]>([]);
  const [heroOptionsLoading, setHeroOptionsLoading] = useState(false);
  const [heroOptionsEmpty, setHeroOptionsEmpty] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkSaved, setLinkSaved] = useState(false);
  const [linkError, setLinkError] = useState("");
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const customizeBusy =
    busy === "theme" || busy === "design" || busy === "regen" || busy === "hero";

  function applyThemeFromPayload(data: Record<string, unknown>) {
    if (isMoneyPageColorThemeId(data.colorTheme)) {
      setColorTheme(data.colorTheme);
    } else {
      const config = (data.site as { theme_config?: unknown } | undefined)?.theme_config;
      if (config && typeof config === "object" && isMoneyPageColorThemeId((config as Record<string, unknown>).moneyColorTheme)) {
        setColorTheme((config as Record<string, unknown>).moneyColorTheme as MoneyPageColorThemeId);
      }
    }

    if (isMoneyPageVariationId(data.variationId)) {
      setVariationId(data.variationId);
      return;
    }
    const config = (data.site as { theme_config?: unknown } | undefined)?.theme_config;
    if (config && typeof config === "object" && isMoneyPageVariationId((config as Record<string, unknown>).moneyVariation)) {
      setVariationId((config as Record<string, unknown>).moneyVariation as MoneyPageVariationId);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load asset");
        return;
      }
      setSite(data.site);
      const pageCopy = isMoneyPageCopy(data.site.sales_page_json) ? data.site.sales_page_json : null;
      if (pageCopy) setCopy(pageCopy);
      applyThemeFromPayload(data);
      const links = Array.isArray(data.site.armed_links) ? data.site.armed_links : [];
      const link = links[0]?.url || data.site.product_url || "";
      setAffiliateUrl(link);

      // Rebuild stored HTML when FAQ arrow styles are missing (template updates).
      const html = typeof data.site.sales_page_html === "string" ? data.site.sales_page_html : "";
      if (pageCopy && !html.includes("summary::after")) {
        const config = data.site.theme_config;
        const fromConfig =
          config && typeof config === "object"
            ? (config as Record<string, unknown>).moneyColorTheme
            : null;
        const fromVariation =
          config && typeof config === "object"
            ? (config as Record<string, unknown>).moneyVariation
            : null;
        const theme = isMoneyPageColorThemeId(data.colorTheme)
          ? data.colorTheme
          : isMoneyPageColorThemeId(fromConfig)
            ? fromConfig
            : "ocean";
        const variation = isMoneyPageVariationId(data.variationId)
          ? data.variationId
          : isMoneyPageVariationId(fromVariation)
            ? fromVariation
            : "honest-review";
        const rebuild = await fetch(`/api/assets/${assetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ copy: pageCopy, affiliateUrl: link, colorTheme: theme, variationId: variation }),
        });
        const rebuilt = await rebuild.json().catch(() => null);
        if (rebuild.ok && rebuilt?.site) {
          setSite(rebuilt.site);
          applyThemeFromPayload(rebuilt);
        } else if (!rebuild.ok) {
          setError(rebuilt?.error || "Could not refresh the live preview");
        }
      }

      setHeroOptionsLoading(true);
      try {
        const optRes = await fetch(`/api/assets/${assetId}/hero-options`);
        const optData = await optRes.json().catch(() => ({}));
        const images = Array.isArray(optData.images)
          ? optData.images.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
          : [];
        setHeroOptions(images);
        setHeroOptionsEmpty(images.length === 0);
      } catch {
        setHeroOptions([]);
        setHeroOptionsEmpty(true);
      } finally {
        setHeroOptionsLoading(false);
      }
    } catch {
      setError("Could not load asset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [assetId]);

  async function saveAffiliateLink(url: string) {
    if (!copy) {
      setLinkError("Could not update this sales page.");
      return;
    }

    setLinkSaving(true);
    setLinkError("");
    setLinkSaved(false);

    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy,
          affiliateUrl: url,
          colorTheme,
          variationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(typeof data.error === "string" ? data.error : "Could not update affiliate link.");
        return;
      }

      setAffiliateUrl(url);
      setSite(data.site);
      applyThemeFromPayload(data);
      if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
      setLinkSaved(true);
    } catch {
      setLinkError("Could not update affiliate link. Please try again.");
    } finally {
      setLinkSaving(false);
    }
  }

  async function save(nextTheme?: MoneyPageColorThemeId, nextVariation?: MoneyPageVariationId) {
    setBusy(nextTheme ? "theme" : nextVariation ? "design" : "save");
    setError("");
    const theme = nextTheme ?? colorTheme;
    const variation = nextVariation ?? variationId;
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy, affiliateUrl, colorTheme: theme, variationId: variation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed");
        return false;
      }
      setSite(data.site);
      applyThemeFromPayload(data);
      if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
      if (!nextTheme && !nextVariation) setEditing(false);
      return true;
    } catch {
      setError("Save failed");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function applyHeroImage(nextUrl: string, options?: { continueBusy?: boolean }) {
    if (!copy) {
      if (options?.continueBusy) setBusy("");
      return;
    }
    const normalizedNext = nextUrl.trim();
    const previous = copy.heroImage;
    if (normalizedNext === (previous ?? "").trim()) {
      if (options?.continueBusy) setBusy("");
      return;
    }
    if (!options?.continueBusy && busy) return;

    const nextCopy: MoneyPageCopy = { ...copy };
    if (normalizedNext) {
      nextCopy.heroImage = normalizedNext;
    } else {
      delete nextCopy.heroImage;
    }
    setCopy(nextCopy);
    if (!options?.continueBusy) {
      setBusy("hero");
      setError("");
    }
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy: nextCopy,
          affiliateUrl,
          colorTheme,
          variationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCopy({ ...nextCopy, heroImage: previous });
        setError(typeof data.error === "string" ? data.error : "Could not update photo");
        return;
      }
      setSite(data.site);
      if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
      applyThemeFromPayload(data);
    } catch {
      setCopy({ ...nextCopy, heroImage: previous });
      setError("Could not update photo");
    } finally {
      setBusy("");
    }
  }

  async function onUploadHero(file: File | null) {
    if (!file || busy) return;
    setBusy("hero");
    setError("");
    try {
      const url = await uploadMoneyPageImage(file);
      await applyHeroImage(url, { continueBusy: true });
    } catch (err) {
      setBusy("");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function removeHeroImage() {
    if (!copy?.heroImage || busy) return;
    await applyHeroImage("");
  }

  async function changeTheme(themeId: MoneyPageColorThemeId) {
    if (themeId === colorTheme || busy) return;
    const previous = colorTheme;
    setColorTheme(themeId);
    const ok = await save(themeId);
    if (!ok) setColorTheme(previous);
  }

  async function changeVariation(nextVariationId: MoneyPageVariationId) {
    if (nextVariationId === variationId || busy) return;
    const previous = variationId;
    setVariationId(nextVariationId);
    setBusy("design");
    setError("");
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", colorTheme, variationId: nextVariationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVariationId(previous);
        setError(typeof data.error === "string" ? data.error : "Could not apply page design");
        return;
      }
      setSite(data.site);
      if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
      applyThemeFromPayload(data);
    } catch {
      setVariationId(previous);
      setError("Could not apply page design");
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    setBusy("regen");
    setError("");
    const res = await fetch(`/api/assets/${assetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate", colorTheme }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Regenerate failed");
      return;
    }
    setSite(data.site);
    if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
    applyThemeFromPayload(data);
  }

  async function publish() {
    setBusy("publish");
    setError("");
    const res = await fetch(`/api/assets/${assetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Publish failed");
      return;
    }
    setSite(data.site);
  }

  const live = site?.status === "live";
  const publicUrl =
    typeof window !== "undefined" && site?.slug
      ? `${window.location.origin}${sitePublicPath({ slug: String(site.slug), owner_handle: site.owner_handle as string | null })}`
      : "";
  const previewBg = getMoneyPageColorTheme(colorTheme).css.bg;

  return (
    <WorkflowPage>
      <PageHeader
        title="Money page"
        subtitle="This is the review page NullPing built. Edit if you want, then publish."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit"}
            </button>
            <button type="button" className="btn-secondary" disabled={busy === "regen"} onClick={() => void regenerate()}>
              {busy === "regen" ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.open(`/api/assets/${assetId}/preview`, "_blank")}
            >
              <ExternalLink size={16} />
              Preview
            </button>
            <button type="button" className="btn-primary" disabled={busy === "publish"} onClick={() => void publish()}>
              {busy === "publish" ? "Publishing..." : live ? "Update live page" : "Publish"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert-banner">{error}</div> : null}

      {live ? (
        <GlassPanel className="space-y-5 p-6 sm:p-7">
          <div className="success-banner">
            <CheckCircle2 size={18} />
            Your money page is live
          </div>
          <div className="live-url-box">{publicUrl}</div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push("/traffic")}>
              Open Generate Traffic
            </button>
          </div>
        </GlassPanel>
      ) : null}

      {editing && copy ? (
        <GlassPanel className="space-y-5 p-6 sm:p-7">
          <h2 className="ds-h3">Edit page copy</h2>
          {(["headline", "subheadline", "productIntro", "overview", "review", "finalRecommendation"] as const).map(
            (key) => (
              <label key={key} className="block">
                <span className="field-label">{FIELD_LABELS[key] ?? key}</span>
                <textarea
                  className="input-base min-h-24 w-full py-3"
                  value={copy[key]}
                  onChange={(e) => setCopy({ ...copy, [key]: e.target.value })}
                />
              </label>
            )
          )}
          <button type="button" className="btn-primary" disabled={busy === "save"} onClick={() => void save()}>
            Save edits
          </button>
        </GlassPanel>
      ) : null}

      {loading ? (
        <GlassPanel className="flex items-center justify-center gap-3 p-10 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin text-pulse-500" />
          Loading preview...
        </GlassPanel>
      ) : typeof site?.sales_page_html === "string" ? (
        <div className="preview-frame preview-frame--fill">
          <div className="preview-frame-bar">
            <span className="preview-frame-dot" />
            <span className="preview-frame-dot" />
            <span className="preview-frame-dot" />
            <span className="preview-frame-label">Live preview</span>
          </div>
          <iframe
            title="Money page preview"
            className="preview-frame-iframe"
            style={{ background: previewBg }}
            srcDoc={site.sales_page_html as string}
          />
        </div>
      ) : (
        <GlassPanel className="p-6 text-sm text-ink-4">No preview available yet.</GlassPanel>
      )}

      {copy ? (
        <GlassPanel className="money-affiliate-link space-y-4 p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <Link2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-pulse-500" aria-hidden />
            <div>
              <h2 className="ds-h3">Add or update your affiliate link</h2>
              <p className="mt-1 text-sm text-ink-2">
                Optional — you can publish without a CTA. If you add a link, this sales page updates to include
                CTA buttons that use it.
              </p>
            </div>
          </div>

          <AffiliateLinkField
            value={affiliateUrl}
            onChange={(url) => {
              setAffiliateUrl(url);
              setLinkSaved(false);
              setLinkError("");
            }}
            onApply={(url) => {
              void saveAffiliateLink(url);
            }}
            actionMode="apply"
            inputId="money-page-affiliate-link"
            manualLabel="Affiliate link URL"
            appliedMessage="CTA buttons on this sales page now use your affiliate link."
          />

          {linkSaving ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Updating sales page…
            </p>
          ) : null}
          {linkSaved && !linkSaving ? (
            <p className="text-sm text-success">Affiliate link saved — CTAs are on this sales page.</p>
          ) : null}
          {linkError ? (
            <p className="text-sm text-[var(--np-danger)]" role="alert">
              {linkError}
            </p>
          ) : null}
        </GlassPanel>
      ) : null}

      {copy ? (
        <GlassPanel className="space-y-5 p-6 sm:p-7">
          <div>
            <h2 className="ds-h3">Sales page photo</h2>
            <p className="mt-1 text-sm text-ink-2">
              Upload your own photo or pick a product-related image. Changes apply right away.
            </p>
          </div>

          <div className="money-hero-layout">
            <div className="money-hero-current">
              {copy.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={copy.heroImage} alt="Current sales page photo" className="money-hero-current-img" />
              ) : (
                <div className="money-hero-current-empty">
                  <ImagePlus size={22} strokeWidth={1.75} aria-hidden />
                  <span>No photo yet</span>
                </div>
              )}
            </div>

            <div className="money-hero-actions">
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="sr-only"
                tabIndex={-1}
                disabled={customizeBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onUploadHero(file);
                }}
              />
              <button
                type="button"
                className="btn-primary money-hero-upload-btn"
                disabled={customizeBusy}
                onClick={() => heroFileInputRef.current?.click()}
              >
                {busy === "hero" ? (
                  <Loader2 size={16} strokeWidth={2.25} className="animate-spin" aria-hidden />
                ) : (
                  <ImagePlus size={16} strokeWidth={2.25} aria-hidden />
                )}
                {busy === "hero" ? "Updating photo…" : "Upload a photo"}
              </button>
              {copy.heroImage ? (
                <button
                  type="button"
                  className="btn-secondary money-hero-remove-btn"
                  disabled={customizeBusy}
                  onClick={() => void removeHeroImage()}
                >
                  <Trash2 size={16} strokeWidth={2.25} aria-hidden />
                  Remove photo
                </button>
              ) : null}
              <p className="money-hero-upload-hint">PNG, JPG, WebP, GIF, or AVIF · max 8MB</p>
            </div>
          </div>

          <div className="money-hero-stock">
            <p className="money-hero-stock-label">Or choose a product-related photo</p>
            {heroOptionsLoading ? (
              <p className="mt-2 text-xs text-ink-3">Finding product photos…</p>
            ) : heroOptionsEmpty ? (
              <p className="mt-2 text-xs text-ink-3">
                No product-related photos found. Upload your own, or add an affiliate / product link so we can
                pull images from the offer page.
              </p>
            ) : (
              <div className="money-hero-grid" role="radiogroup" aria-label="Product-related sales page photos">
                {heroOptions.map((url) => {
                  const selected = copy.heroImage === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={customizeBusy}
                      className={`money-hero-thumb ${selected ? "is-selected" : ""}`}
                      onClick={() => void applyHeroImage(url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="money-hero-thumb-img" />
                      {selected ? (
                        <span className="money-hero-thumb-check" aria-hidden>
                          <Check size={14} strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </GlassPanel>
      ) : null}

      <div className="money-page-customize-grid">
        <GlassPanel className="space-y-5 p-6 sm:p-7">
          <div>
            <h2 className="ds-h3">Color theme</h2>
            <p className="mt-1 text-sm text-ink-2">Pick one of four looks for your sales page.</p>
          </div>
          <div className="money-theme-grid" role="radiogroup" aria-label="Money page color theme">
            {MONEY_PAGE_COLOR_THEMES.map((theme) => {
              const selected = theme.id === colorTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={customizeBusy}
                  className={`money-theme-card ${selected ? "is-selected" : ""}`}
                  style={{ "--theme-accent": theme.swatch } as React.CSSProperties}
                  onClick={() => void changeTheme(theme.id)}
                >
                  <span
                    className={`money-theme-swatch ${selected ? "is-selected" : ""}`}
                    style={{ background: theme.swatch }}
                    aria-hidden
                  >
                    {selected ? <Check size={14} strokeWidth={3} className="money-theme-swatch-check" /> : null}
                  </span>
                  <span className="money-theme-copy">
                    <span className="money-theme-label">{theme.label}</span>
                    <span className="money-theme-desc">{theme.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {busy === "theme" ? <p className="text-xs text-ink-3">Updating theme…</p> : null}
        </GlassPanel>

        <GlassPanel className="space-y-5 p-6 sm:p-7">
          <div>
            <h2 className="ds-h3">Page design</h2>
            <p className="mt-1 text-sm text-ink-2">Choose how your review page is framed and structured.</p>
          </div>
          <div className="money-theme-grid" role="radiogroup" aria-label="Money page design">
            {MONEY_PAGE_VARIATIONS.map((variation) => {
              const selected = variation.id === variationId;
              const Icon = VARIATION_ICONS[variation.id];
              return (
                <button
                  key={variation.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={customizeBusy}
                  className={`money-theme-card money-design-card ${selected ? "is-selected" : ""}`}
                  onClick={() => void changeVariation(variation.id)}
                >
                  <span className={`money-design-icon ${selected ? "is-selected" : ""}`} aria-hidden>
                    {selected ? (
                      <Check size={14} strokeWidth={3} className="money-theme-swatch-check" />
                    ) : (
                      <Icon size={16} strokeWidth={2.25} />
                    )}
                  </span>
                  <span className="money-theme-copy">
                    <span className="money-theme-label">{variation.label}</span>
                    <span className="money-theme-desc">{variation.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {busy === "design" ? (
            <p className="text-xs text-ink-3">Rewriting page copy and layout for this design…</p>
          ) : null}
        </GlassPanel>
      </div>
    </WorkflowPage>
  );
}
