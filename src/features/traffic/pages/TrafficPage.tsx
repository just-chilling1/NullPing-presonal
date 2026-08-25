"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  ImageIcon,
  Link2,
  Loader2,
  Pin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { sitePublicPath } from "@/lib/app-url";

interface PinRow {
  id: string;
  headline: string;
  title: string;
  description: string;
  keywords: string[];
  image_url: string | null;
}

function pinImageSrc(url: string) {
  const base = url.includes("?") ? url : `${url}?v=12`;
  if (base.includes("v=")) return base.replace(/([?&])v=\d+/, "$1v=12");
  return `${base}&v=12`;
}

function pinDownloadHref(url: string | null) {
  if (!url) return "#";
  const withVersion = pinImageSrc(url);
  return `${withVersion}${withVersion.includes("?") ? "&" : "?"}download=1`;
}

export default function TrafficPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const router = useRouter();
  const [pins, setPins] = useState<PinRow[]>([]);
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [pinRes, siteRes] = await Promise.all([
        fetch(`/api/pins/generate?siteId=${assetId}`),
        fetch(`/api/assets/${assetId}`),
      ]);
      const pinData = await pinRes.json().catch(() => ({}));
      const siteData = await siteRes.json().catch(() => ({}));
      const loadedPins = pinData.pins ?? [];
      setPins(loadedPins);
      if (siteData.site?.slug) setSlug(siteData.site.slug);

      if (loadedPins.length > 0) {
        setError("");
      } else if (!pinRes.ok && typeof pinData.error === "string") {
        setError(pinData.error);
      } else if (!siteRes.ok && typeof siteData.error === "string") {
        setError(siteData.error);
      }
    } catch {
      setError("Could not load traffic assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [assetId]);

  async function generate() {
    setBusy(true);
    setError("");
    const previousPins = pins;
    const pinCount = previousPins.length > 0 ? previousPins.length : 10;
    try {
      const res = await fetch("/api/pins/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: assetId,
          regenerate: previousPins.length > 0,
          count: pinCount,
        }),
      });
      const raw = await res.text();
      let data: { pins?: PinRow[]; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { pins?: PinRow[]; error?: string }) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        setError(data.error || raw.slice(0, 180) || "Could not generate pins");
        if (previousPins.length > 0) setPins(previousPins);
        return;
      }
      setPins(data.pins ?? []);
      setError("");
    } catch {
      setError("Could not generate pins");
      if (previousPins.length > 0) setPins(previousPins);
    } finally {
      setBusy(false);
    }
  }

  function destination(pinId: string) {
    if (!slug || typeof window === "undefined") return "";
    return `${window.location.origin}${sitePublicPath({ slug })}?pin=${pinId}&src=pinterest`;
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1200);
  }

  return (
    <WorkflowPage className="traffic-workspace">
      <Link href="/traffic" className="traffic-back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Back to Generate Traffic
      </Link>
      <PageHeader
        eyebrow="Pin workspace"
        title="Generate Pinterest traffic"
        subtitle="NullPing prepares Pinterest pins that send visitors straight to your money page."
      />

      {error && pins.length === 0 ? <div className="alert-banner">{error}</div> : null}

      {loading ? (
        <GlassPanel className="traffic-loading-panel">
          <Loader2 className="h-6 w-6 animate-spin text-pulse-500" aria-hidden />
          <p className="text-sm text-ink-3">Loading traffic workspace…</p>
        </GlassPanel>
      ) : busy ? (
        <div className="pin-generating-panel traffic-generating-panel" role="status" aria-live="polite">
          <div className="pin-generating-visual" aria-hidden>
            <span className="pin-generating-ring" />
            <span className="pin-generating-ring pin-generating-ring--delay" />
            <Loader2 className="pin-generating-spinner" />
          </div>
          <h3 className="ds-h3">Generating your pins</h3>
          <p className="pin-generating-copy">
            Creating images, titles, and tracking links for your money page. This usually takes a moment.
          </p>
          <div className="pin-generating-bars" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : pins.length === 0 ? (
        <GlassPanel className="traffic-hero-panel traffic-hero-panel--fill">
          <div className="traffic-hero-shimmer" aria-hidden />
          <div className="traffic-hero-inner">
            <p className="traffic-hero-badge">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Pinterest traffic
            </p>

            <div className="traffic-hero-icon" aria-hidden>
              <ImageIcon size={28} strokeWidth={1.5} />
            </div>

            <h2 className="traffic-hero-title">No traffic assets yet</h2>
            <p className="traffic-hero-lead">
              Generate 10 ready-to-post Pinterest pins for this money page. Each pin includes the image, title,
              description, and tracking link.
            </p>

            <ul className="traffic-hero-list">
              <li>Images sized for Pinterest</li>
              <li>Titles and descriptions included</li>
              <li>Links track visitors to your money page</li>
            </ul>

            <button
              type="button"
              className="btn-primary traffic-generate-cta"
              disabled={busy}
              onClick={() => void generate()}
            >
              <Pin size={18} strokeWidth={1.75} aria-hidden />
              Generate Traffic Assets
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </button>

            <p className="traffic-hero-note">
              Post the pins to Pinterest and use the provided link. Each visitor goes directly to your money page.
            </p>
          </div>
        </GlassPanel>
      ) : (
        <div className="traffic-workspace-body">
          <div className="traffic-summary-strip">
            <GlassPanel className="traffic-summary-card">
              <span className="traffic-summary-icon" aria-hidden>
                <Pin size={18} strokeWidth={1.75} />
              </span>
              <div>
                <p className="traffic-summary-value">{pins.length}</p>
                <p className="traffic-summary-label">Pinterest pins ready</p>
              </div>
            </GlassPanel>
            <GlassPanel className="traffic-summary-card">
              <span className="traffic-summary-icon traffic-summary-icon--accent" aria-hidden>
                <Link2 size={18} strokeWidth={1.75} />
              </span>
              <div>
                <p className="traffic-summary-value">Tracked</p>
                <p className="traffic-summary-label">Each pin links to your money page</p>
              </div>
            </GlassPanel>
            <GlassPanel className="traffic-summary-card">
              <span className="traffic-summary-icon traffic-summary-icon--gold" aria-hidden>
                <TrendingUp size={18} strokeWidth={1.75} />
              </span>
              <div>
                <p className="traffic-summary-value">Post &amp; earn</p>
                <p className="traffic-summary-label">Download images and copy text to Pinterest</p>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="traffic-toolbar-panel">
            <div className="traffic-toolbar-copy">
              <p className="traffic-toolbar-eyebrow">
                <Pin size={14} strokeWidth={1.75} aria-hidden />
                Pinterest workspace
              </p>
              <h2 className="ds-h4">Your pins are ready to post</h2>
              <p className="text-sm leading-relaxed text-ink-2">
                Download each image, copy the title and description, then paste your tracking link when you publish on
                Pinterest. Every click routes visitors to your money page.
              </p>
            </div>
            <div className="traffic-toolbar-actions">
              {error && pins.length > 0 ? (
                <p className="traffic-inline-alert" role="alert">
                  {error} Your current pins are still available below.
                </p>
              ) : null}
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void generate()}>
                Regenerate traffic assets
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.push("/results")}>
                Save &amp; continue to Results
              </button>
            </div>
          </GlassPanel>

          <div className="pin-card-grid">
            {pins.map((pin, index) => (
              <GlassPanel key={pin.id} className="pin-card">
                <div className="pin-card-media">
                  <div className="pin-card-media-chrome">
                    <span className="pin-card-badge">Pin #{index + 1}</span>
                    {copied.endsWith(pin.id) ? (
                      <span className="pin-card-copied">Copied</span>
                    ) : null}
                  </div>
                  {pin.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pinImageSrc(pin.image_url)}
                      alt={pin.headline}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="pin-card-media-empty">
                      <ImageIcon size={22} strokeWidth={1.75} aria-hidden />
                      <span>No preview</span>
                    </div>
                  )}
                </div>

                <div className="pin-card-body">
                  <p className="pin-card-headline">{pin.headline}</p>

                  <div className="pin-copy-stack">
                    <div className="pin-copy-row">
                      <div className="pin-copy-row-top">
                        <span className="pin-meta-label">Title</span>
                        <button
                          type="button"
                          className="pin-copy-mini"
                          onClick={() => void copy(`t${pin.id}`, pin.title)}
                        >
                          <Copy size={12} strokeWidth={2} aria-hidden />
                          {copied === `t${pin.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="pin-meta-value">{pin.title}</p>
                    </div>

                    <div className="pin-copy-row">
                      <div className="pin-copy-row-top">
                        <span className="pin-meta-label">Description</span>
                        <button
                          type="button"
                          className="pin-copy-mini"
                          onClick={() => void copy(`d${pin.id}`, pin.description)}
                        >
                          <Copy size={12} strokeWidth={2} aria-hidden />
                          {copied === `d${pin.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="pin-meta-value">{pin.description}</p>
                    </div>
                  </div>

                  {(pin.keywords || []).length > 0 ? (
                    <div className="pin-keywords-block">
                      <span className="pin-meta-label">Keywords</span>
                      <div className="pin-meta-keywords">
                        {(pin.keywords || []).map((keyword) => (
                          <span key={keyword} className="pin-keyword-chip">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="pin-destination-row">
                    <div className="pin-destination-copy">
                      <span className="pin-meta-label">Destination</span>
                      <p className="pin-meta-link">{destination(pin.id)}</p>
                    </div>
                    <button
                      type="button"
                      className="pin-copy-mini"
                      onClick={() => void copy(`l${pin.id}`, destination(pin.id))}
                      aria-label="Copy destination link"
                    >
                      <Link2 size={12} strokeWidth={2} aria-hidden />
                      {copied === `l${pin.id}` ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="pin-card-actions">
                  <a
                    className="pin-action-btn pin-action-btn--primary"
                    href={pinDownloadHref(pin.image_url)}
                  >
                    <Download size={15} strokeWidth={1.75} aria-hidden />
                    Download image
                  </a>
                  <button
                    type="button"
                    className="pin-action-btn"
                    onClick={() =>
                      void copy(
                        `all${pin.id}`,
                        [pin.title, pin.description, destination(pin.id)].filter(Boolean).join("\n\n")
                      )
                    }
                  >
                    <Copy size={14} strokeWidth={1.75} aria-hidden />
                    {copied === `all${pin.id}` ? "Copied all" : "Copy all"}
                  </button>
                </div>
              </GlassPanel>
            ))}
          </div>

          <GlassPanel className="traffic-results-cta">
            <div className="traffic-results-copy">
              <p className="traffic-toolbar-eyebrow">
                <TrendingUp size={14} strokeWidth={1.75} aria-hidden />
                Next step
              </p>
              <h2 className="ds-h3">Ready to track results?</h2>
              <p className="mt-1 text-sm text-ink-3">
                Your pins are saved. Continue to see visits, clicks, and what is converting.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => router.push("/results")}>
              Continue to Results
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </GlassPanel>
        </div>
      )}
    </WorkflowPage>
  );
}
