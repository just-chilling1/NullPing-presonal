"use client";

import { useCallback, useState } from "react";
import { Check, Filter, Link as LinkIcon, Loader2, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { AffiliateLinkField } from "@/components/premium/AffiliateLinkField";
import { PremiumErrorAlert } from "@/components/premium/PremiumErrorAlert";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getPremiumFeatureThumbnail } from "@/lib/video-thumbnails";
import { isValidAffiliateUrl } from "@/features/blog-builder/lib/affiliate-url";
import type { SavedFacebookPost } from "@/features/blog-builder/lib/facebook-posts-vault";
import {
  DfyResultPanel,
  type DfyArticleResult,
  type DfyPinResult,
  type DfySalesResult,
} from "@/features/dfy-profit/components/DfyResultPanel";
import { PREMIUM_NICHE_OPTIONS } from "@/lib/premium-niches";
import { sitePublicPath } from "@/lib/app-url";

type Stage = "idle" | "sales" | "pins" | "article" | "posts" | "done";

const DFY_PIN_COUNT = 3;

const STAGE_LABELS: Record<Exclude<Stage, "idle" | "done">, string> = {
  sales: "Building your sales page…",
  pins: "Generating 3 Pinterest pins with images…",
  article: "Writing your authority article…",
  posts: "Generating 3 Facebook posts…",
};

export default function DfyProfitPage() {
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [linkApplied, setLinkApplied] = useState(false);
  const [niche, setNiche] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [sales, setSales] = useState<DfySalesResult | null>(null);
  const [pins, setPins] = useState<DfyPinResult[]>([]);
  const [pinsError, setPinsError] = useState("");
  const [retryingPins, setRetryingPins] = useState(false);
  const [article, setArticle] = useState<DfyArticleResult | null>(null);
  const [articleError, setArticleError] = useState("");
  const [retryingArticle, setRetryingArticle] = useState(false);
  const [facebookPosts, setFacebookPosts] = useState<SavedFacebookPost[]>([]);
  const [postsError, setPostsError] = useState("");
  const [retryingPosts, setRetryingPosts] = useState(false);
  const [lastTemplateId, setLastTemplateId] = useState<string | undefined>();

  const generating =
    stage === "sales" || stage === "pins" || stage === "article" || stage === "posts";

  const runPinsStage = useCallback(async (siteId: string) => {
    const res = await fetch("/api/pins/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, count: DFY_PIN_COUNT }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Pin generation failed");
    return (data.pins ?? []) as DfyPinResult[];
  }, []);

  const runArticleStage = useCallback(async (siteId: string) => {
    const res = await fetch("/api/premium/dfy-profit/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Authority article generation failed");
    return {
      id: data.id as string,
      title: (data.title as string) || "",
      excerpt: (data.excerpt as string) || "",
      html: (data.html as string) || "",
    } satisfies DfyArticleResult;
  }, []);

  const runPostsStage = useCallback(async (siteId: string) => {
    const res = await fetch("/api/premium/dfy-profit/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Facebook post generation failed");
    return (data.posts ?? []) as SavedFacebookPost[];
  }, []);

  const handleGenerate = async () => {
    if (!linkApplied || !isValidAffiliateUrl(affiliateUrl)) {
      setError("Apply a valid affiliate URL starting with https://");
      return;
    }
    if (!niche) {
      setError("Pick a niche first.");
      return;
    }

    setError("");
    setPinsError("");
    setArticleError("");
    setPostsError("");
    setSales(null);
    setPins([]);
    setArticle(null);
    setFacebookPosts([]);
    setStage("sales");

    let siteId = "";

    try {
      const startRes = await fetch("/api/premium/dfy-profit/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateUrl,
          niche,
          excludeTemplateId: lastTemplateId,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || "Sales page generation failed");

      siteId = startData.siteId as string;
      setLastTemplateId(startData.templateId as string);
      setSales({
        siteId,
        offerUrl: startData.offerUrl as string,
        offerPath:
          (startData.offerPath as string | undefined) ??
          sitePublicPath({ slug: startData.slug as string }),
        templateName: startData.templateName as string,
        templateId: startData.templateId as string,
        productName: (startData.productName as string) || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sales page generation failed");
      setStage("idle");
      return;
    }

    setStage("pins");
    try {
      const pinResults = await runPinsStage(siteId);
      setPins(pinResults);
    } catch (e) {
      setPinsError(e instanceof Error ? e.message : "Pin generation failed");
    }

    setStage("article");
    try {
      const articleResult = await runArticleStage(siteId);
      setArticle(articleResult);
    } catch (e) {
      setArticleError(e instanceof Error ? e.message : "Authority article generation failed");
    }

    setStage("posts");
    try {
      const postResults = await runPostsStage(siteId);
      setFacebookPosts(postResults);
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : "Facebook post generation failed");
    }

    setStage("done");
  };

  const handleRetryPins = async () => {
    if (!sales?.siteId) return;
    setRetryingPins(true);
    setPinsError("");
    try {
      const result = await runPinsStage(sales.siteId);
      setPins(result);
    } catch (e) {
      setPinsError(e instanceof Error ? e.message : "Pin generation failed");
    } finally {
      setRetryingPins(false);
    }
  };

  const handleRetryArticle = async () => {
    if (!sales?.siteId) return;
    setRetryingArticle(true);
    setArticleError("");
    try {
      const result = await runArticleStage(sales.siteId);
      setArticle(result);
    } catch (e) {
      setArticleError(e instanceof Error ? e.message : "Authority article generation failed");
    } finally {
      setRetryingArticle(false);
    }
  };

  const handleRetryPosts = async () => {
    if (!sales?.siteId) return;
    setRetryingPosts(true);
    setPostsError("");
    try {
      const result = await runPostsStage(sales.siteId);
      setFacebookPosts(result);
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : "Facebook post generation failed");
    } finally {
      setRetryingPosts(false);
    }
  };

  const progressStage =
    stage === "sales" || stage === "pins" || stage === "article" || stage === "posts"
      ? STAGE_LABELS[stage]
      : "Generating…";

  return (
    <PremiumWorkflowShell
      title="Done-For-You Profit"
      subtitle="Paste your affiliate link, pick a niche, and get a live sales page, 3 Pinterest pins, an authority article, and 3 Facebook posts."
      tip={
        <>
          Tip: Apply your link first, then generate. You&apos;ll get a published sales page plus
          pins, an article, and Facebook copy ready to post.
        </>
      }
      training={{
        vimeoId: "",
        title: "Done-For-You Profit Training",
        description:
          "Apply your affiliate link, pick a niche, and generate a live sales page with 3 pins, an authority article, and 3 Facebook posts in one run.",
        iframeTitle: "Done-For-You Profit training video",
        thumbnailSrc: getPremiumFeatureThumbnail("premium-dfy-profit"),
      }}
    >
      <PremiumStepsSection
        steps={[
          {
            num: "1",
            title: "Apply your affiliate link",
            desc: "Paste your offer URL and click Apply. We scrape the product details and wire your link into every asset in the kit.",
          },
          {
            num: "2",
            title: "Pick a niche & generate",
            desc: "Choose the niche that matches your offer, then click Generate. One run builds a live sales page, 3 Pinterest pins, an authority article, and 3 Facebook posts.",
          },
          {
            num: "3",
            title: "Publish & promote",
            desc: "Open your live sales page, download the pins, copy the article and Facebook posts, and start driving traffic to your offer.",
          },
        ]}
      />

      <GlassPanel className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Generate your kit</p>
            <p className="mt-1 text-xs text-text-muted">
              One click creates a published sales page, 3 pins, an authority article, and 3 Facebook
              posts.
            </p>
          </div>
        </div>

        <div>
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
            <LinkIcon size={14} className="text-pulse-700" />
            Affiliate URL
          </span>
          <AffiliateLinkField
            value={affiliateUrl}
            onChange={(url) => {
              setAffiliateUrl(url);
              setLinkApplied(false);
            }}
            onApply={(url) => {
              setAffiliateUrl(url);
              setLinkApplied(true);
              setError("");
            }}
            actionMode="apply"
            inputId="dfy-profit-affiliate-link"
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Filter size={14} className="text-pulse-700" />
              Select niche
            </p>
            <p className="text-xs text-text-muted">
              {niche
                ? PREMIUM_NICHE_OPTIONS.find((o) => o.value === niche)?.label ?? niche
                : "Choose one"}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2 rounded-xl border border-[var(--np-line)] bg-[var(--np-surface-field)] p-3"
            role="group"
            aria-label="Select niche"
          >
            {PREMIUM_NICHE_OPTIONS.map((option) => {
              const selected = niche === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={generating}
                  onClick={() => setNiche(option.value)}
                  className={clsx("select-chip-pill", selected && "is-selected")}
                >
                  {selected ? <Check size={13} className="mr-1 inline" /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <PremiumErrorAlert message={error} /> : null}

        <button
          type="button"
          disabled={generating || !linkApplied || !niche}
          onClick={() => void handleGenerate()}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Generating…" : sales ? "Generate another kit" : "Generate kit"}
        </button>
      </GlassPanel>

      <GenerationProgress active={generating} label={progressStage} />

      <DfyResultPanel
        sales={sales}
        pins={pins}
        pinsError={pinsError}
        isGeneratingPins={stage === "pins" || retryingPins}
        retryingPins={retryingPins}
        onRetryPins={() => void handleRetryPins()}
        article={article}
        articleError={articleError}
        isGeneratingArticle={stage === "article" || retryingArticle}
        retryingArticle={retryingArticle}
        onRetryArticle={() => void handleRetryArticle()}
        facebookPosts={facebookPosts}
        postsError={postsError}
        isGeneratingPosts={stage === "posts" || retryingPosts}
        retryingPosts={retryingPosts}
        onRetryPosts={() => void handleRetryPosts()}
      />
    </PremiumWorkflowShell>
  );
}
