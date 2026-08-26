"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  Package,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { PageHeader } from "@/components/ui/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { WorkflowPage } from "@/components/ui/workflow-page";
import { AiLoadingBar } from "@/components/ui/AiLoadingBar";
import { AffiliateLinkField } from "@/components/premium/AffiliateLinkField";

const STAGES = [
  "Analyzing product",
  "Identifying target buyers",
  "Building money page",
  "Writing product review",
  "Creating headlines",
  "Adding monetization links",
  "Finalizing sales page",
] as const;

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "We research",
    body: "Scrape the product and map who buys it.",
  },
  {
    icon: FileText,
    title: "We write",
    body: "Build a full review money page ready to publish.",
  },
  {
    icon: Rocket,
    title: "You publish",
    body: "Review the page, publish when ready, then generate traffic separately.",
  },
] as const;

function ActivateStageList({ stageIndex }: { stageIndex: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="activate-stage-list" role="list" aria-label="Activation progress">
      {STAGES.map((label, i) => {
        const done = i < stageIndex;
        const active = i === stageIndex && stageIndex < STAGES.length;
        const pending = !done && !active;

        return (
          <motion.li
            key={label}
            layout={!reduceMotion}
            className={[
              "activate-stage-row",
              done ? "is-done" : "",
              active ? "is-active" : "",
              pending ? "is-pending" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            initial={reduceMotion ? false : { opacity: 0.55, y: 4 }}
            animate={{
              opacity: pending ? 0.55 : 1,
              y: 0,
              scale: active && !reduceMotion ? 1.01 : 1,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.2, 0, 0, 1] }}
          >
            <span className="activate-stage-icon" aria-hidden>
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span
                    key="done"
                    className="activate-stage-check"
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  >
                    <CheckCircle2 size={18} strokeWidth={2.25} />
                  </motion.span>
                ) : active ? (
                  <motion.span
                    key="active"
                    className="activate-stage-spinner"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="activate-stage-ring" />
                    <Loader2 size={16} className="activate-stage-loader" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="pending"
                    className="activate-stage-dot"
                    initial={false}
                    animate={{ opacity: 1 }}
                  />
                )}
              </AnimatePresence>
            </span>
            <span className="activate-stage-label">{label}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default function ActivateAssetPage() {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "activating" | "ready">("form");
  const [stageIndex, setStageIndex] = useState(0);
  const [assetId, setAssetId] = useState("");

  const progressPct = useMemo(() => {
    if (stageIndex >= STAGES.length) return 100;
    return Math.min(96, Math.round(((stageIndex + 0.35) / STAGES.length) * 100));
  }, [stageIndex]);

  const urlFilled = productUrl.trim().length > 0;
  const nameFilled = productName.trim().length > 0;
  const productNameDisabled = urlFilled;
  const productUrlDisabled = nameFilled && !urlFilled;

  const currentLabel =
    stageIndex >= STAGES.length ? "Finalizing asset" : STAGES[Math.min(stageIndex, STAGES.length - 1)];

  async function activate() {
    setError("");
    if (!productUrl.trim() && !productName.trim()) {
      setError("Paste a product URL or enter a product name.");
      return;
    }

    setPhase("activating");
    setStageIndex(0);

    const timer = window.setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 900);

    try {
      const res = await fetch("/api/assets/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, productName, affiliateUrl }),
      });
      const data = await res.json().catch(() => ({}));
      window.clearInterval(timer);

      if (!res.ok) {
        setPhase("form");
        setError(typeof data.error === "string" ? data.error : "Activation failed.");
        return;
      }

      setStageIndex(STAGES.length);
      setAssetId(data.assetId);
      setPhase("ready");
    } catch {
      window.clearInterval(timer);
      setPhase("form");
      setError("Something went wrong. Please try again.");
    }
  }

  if (phase === "ready") {
    const assetLabel = productName.trim() || productUrl.trim() || "Your product";

    return (
      <WorkflowPage width="full">
        <PageHeader
          title="Your sales page is ready"
          subtitle={`${brand.productName} built a money page for this product. Preview it, publish when you're happy, then use Generate Traffic when you want Pinterest pins.`}
        />

        <div className="activate-ready-layout">
          <GlassPanel className="activate-ready-panel">
            <div className="activate-ready-hero">
              <span className="activate-ready-badge" aria-hidden>
                <CheckCircle2 size={22} strokeWidth={2.25} />
              </span>
              <div className="activate-ready-hero-copy">
                <p className="activate-ready-kicker">
                  <Sparkles size={14} strokeWidth={1.75} aria-hidden />
                  Activation complete
                </p>
                <h2 className="activate-ready-title">Money page unlocked</h2>
                <p className="activate-ready-summary">
                  <span className="activate-ready-product">{assetLabel}</span>
                  {" "}is ready in your workspace. Review the sales page, tweak anything you want, then publish.
                </p>
              </div>
            </div>

            <ol className="activate-ready-steps" aria-label="Next steps">
              <li className="activate-ready-step is-current">
                <span className="activate-ready-step-num" aria-hidden>
                  1
                </span>
                <div className="activate-ready-step-copy">
                  <p className="activate-ready-step-title">
                    <FileText size={15} strokeWidth={1.75} aria-hidden />
                    Preview your money page
                  </p>
                  <p className="activate-ready-step-body">
                    Check headlines, review copy, and publish when it looks right.
                  </p>
                </div>
              </li>
              <li className="activate-ready-step">
                <span className="activate-ready-step-num" aria-hidden>
                  2
                </span>
                <div className="activate-ready-step-copy">
                  <p className="activate-ready-step-title">
                    <Rocket size={15} strokeWidth={1.75} aria-hidden />
                    Track results
                  </p>
                  <p className="activate-ready-step-body">
                    After you publish and send traffic, watch visits and clicks in Results.
                  </p>
                </div>
              </li>
            </ol>

            <div className="activate-ready-actions">
              <button
                type="button"
                className="btn-primary activate-ready-primary"
                onClick={() => router.push(`/money-page/${assetId}`)}
              >
                View my asset
                <ArrowRight size={16} strokeWidth={2.25} />
              </button>
            </div>
          </GlassPanel>

          <aside className="activate-ready-aside" aria-label="Quick tips">
            <div className="activate-aside-card">
              <p className="activate-aside-eyebrow">Recommended</p>
              <p className="activate-ready-aside-lead">
                Open the money page first. Small edits now make your sales page convert better later.
              </p>
              <ul className="activate-aside-list">
                <li>Confirm the product name &amp; offer</li>
                <li>Add an affiliate link in the money page editor if you want CTAs</li>
                <li>Publish before sending traffic</li>
              </ul>
            </div>
          </aside>
        </div>
      </WorkflowPage>
    );
  }

  if (phase === "activating") {
    return (
      <WorkflowPage width="wide">
        <PageHeader
          title="Activating your asset…"
          subtitle={`Sit tight — ${brand.productName} is doing the work.`}
        />
        <GlassPanel className="activate-progress-panel space-y-5 p-6 sm:p-8">
          <AiLoadingBar label={currentLabel} progress={progressPct} active eta="Working…" />
          <ActivateStageList stageIndex={stageIndex} />
        </GlassPanel>
      </WorkflowPage>
    );
  }

  return (
    <WorkflowPage width="full">
      <PageHeader
        eyebrow="Step 1"
        title="What do you want to promote?"
        subtitle={`Paste a product URL or type the name. ${brand.productName} builds your sales page only — use Generate Traffic separately when you're ready for pins.`}
      />

      <div className="activate-layout">
        <GlassPanel className="activate-form-panel">
          <div className="activate-how">
            {HOW_IT_WORKS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="activate-how-step">
                  <span className="activate-how-index" aria-hidden>
                    {index + 1}
                  </span>
                  <div className="activate-how-copy">
                    <p className="activate-how-title">
                      <Icon size={14} strokeWidth={1.75} className="activate-how-inline-icon" aria-hidden />
                      {step.title}
                    </p>
                    <p className="activate-how-body">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="activate-form-body">
            <section className="activate-field-block">
              <div className="activate-field-heading">
                <Package size={16} strokeWidth={1.75} className="text-pulse-500" aria-hidden />
                <div>
                  <h2 className="activate-field-title">Product details</h2>
                  <p className="activate-field-hint">Provide a product URL or enter a name.</p>
                </div>
              </div>

              <label className={clsx("activate-field", productUrlDisabled && "activate-field--disabled")}>
                <span className="field-label">Product URL</span>
                <input
                  className="input-base w-full"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  autoComplete="url"
                  inputMode="url"
                  disabled={productUrlDisabled}
                  aria-disabled={productUrlDisabled}
                />
              </label>

              <div className="or-divider" role="separator">
                or
              </div>

              <label className={clsx("activate-field", productNameDisabled && "activate-field--disabled")}>
                <span className="field-label">Product name</span>
                <input
                  className="input-base w-full"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Best sleep supplement"
                  autoComplete="off"
                  disabled={productNameDisabled}
                  aria-disabled={productNameDisabled}
                />
              </label>
            </section>

            <div className="form-section-divider" aria-hidden />

            <section className="activate-field-block activate-field-block--optional">
              <div className="activate-field-heading">
                <Link2 size={16} strokeWidth={1.75} className="text-ink-4" aria-hidden />
                <div>
                  <h2 className="activate-field-title">
                    Affiliate link <span className="activate-optional-badge">Optional</span>
                  </h2>
                  <p className="activate-field-hint">
                    Pick a saved link from Links Library or paste a new one — we’ll wire it into the
                    money page CTA.
                  </p>
                </div>
              </div>

              <label className="activate-field">
                <span className="sr-only">Affiliate link</span>
                <AffiliateLinkField
                  value={affiliateUrl}
                  onChange={setAffiliateUrl}
                  inputId="activate-affiliate-link"
                  placeholder="https://your-affiliate-link.com"
                  actionMode="apply"
                  appliedMessage="This link will be wired into the money page CTA."
                />
              </label>
            </section>

            {error ? <div className="alert-banner">{error}</div> : null}

            <div className="activate-form-footer">
              <p className="activate-form-footer-note">
                Usually takes under a minute. You can edit everything after.
              </p>
              <button type="button" className="btn-primary activate-submit" onClick={() => void activate()}>
                Activate asset
                <ArrowRight size={16} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </GlassPanel>

        <aside className="activate-aside" aria-label="What you get">
          <div className="activate-aside-card">
            <p className="activate-aside-eyebrow">What you get</p>
            <ul className="activate-aside-list">
              <li>Full product review money page</li>
              <li>Buyer-focused headlines &amp; structure</li>
              <li>Monetization CTA ready to publish</li>
              <li>Generate Traffic available separately</li>
            </ul>
          </div>
        </aside>
      </div>
    </WorkflowPage>
  );
}
