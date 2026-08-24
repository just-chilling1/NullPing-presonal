"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Megaphone,
  Copy,
  Check,
  ChevronDown,
  ClipboardCopy,
  Clock3,
  Gift,
  Loader2,
  MessagesSquare,
  ScrollText,
  Shuffle,
  Sparkles,
  Timer,
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { PremiumControlCard } from "@/components/premium/PremiumControlCard";
import { PremiumErrorAlert } from "@/components/premium/PremiumErrorAlert";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { PremiumBestPracticesSection } from "@/components/premium/PremiumBestPracticesSection";
import { LiveAssetPicker, type LiveAssetSummary } from "@/components/premium/LiveAssetPicker";
import { GenerationProgress, GENERATION_RESULTS_ID } from "@/components/ui/generation-progress";
import { formatThreadVersionDate } from "@/features/publish-kit/lib/thread-batches";

interface SavedPost {
  id: string;
  body: string;
  batchId?: string;
  createdAt?: string;
}

interface PostGeneration {
  batchId: string;
  createdAt: string;
  posts: SavedPost[];
}

interface PostCardProps {
  post: SavedPost;
  index: number;
  copiedId: string | null;
  onCopy: (post: SavedPost) => void;
}

const SITE_STORAGE_KEY = `${brand.storagePrefix}_instant_income_site`;

const FACEBOOK_BEST_PRACTICES = [
  {
    icon: ScrollText,
    title: "Read each group's rules first",
    desc: "Some groups ban outside links, some only allow them on promo days like \"Self-Promo Saturday\", and some require admin approval. One rule-breaking post can get you muted or banned — check the pinned rules before every post.",
  },
  {
    icon: Gift,
    title: "Lead with value (70/30 rule)",
    desc: "Spend your first 1–2 weeks in a group answering questions and sharing tips before dropping any link. Keep roughly 70% of your activity pure value and only 30% promotional — that's what keeps you welcome.",
  },
  {
    icon: MessagesSquare,
    title: "Put your link in the first comment",
    desc: "Posts with links in the body get their reach limited. Where the group allows it, keep the post itself helpful and drop your money-page link (with ?src=facebook) in the first comment instead.",
  },
  {
    icon: Shuffle,
    title: "Use a different variant per group",
    desc: "Identical text across groups is the clearest spam fingerprint on Facebook. That's exactly why you get 10 variants here — pick a different one for every group you post in.",
  },
  {
    icon: Timer,
    title: "Pace yourself",
    desc: "Space posts at least 1–2 minutes apart and stay under roughly 25–50 groups a day. Blasting the same money page into 30 groups in one minute reads as a bot and tanks your account.",
  },
  {
    icon: Clock3,
    title: "Post at peak times & disclose",
    desc: "Tuesday–Thursday mornings (8–10 AM) and lunch breaks (12–1 PM) tend to perform best — test your niche. And always add a short disclosure like \"I may earn a commission\" at the top of the post.",
  },
];

const PostCard = memo(function PostCard({ post, index, copiedId, onCopy }: PostCardProps) {
  const isCopied = copiedId === post.id;

  return (
    <article className="glass-card flex flex-col gap-3 p-4 transition-colors hover:border-[var(--np-line-pulse)] [content-visibility:auto] [contain-intrinsic-size:auto_180px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium uppercase tracking-wider text-pulse-700">
          Variant {index + 1}
        </p>
        <button
          type="button"
          onClick={() => onCopy(post)}
          className={clsx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            isCopied
              ? "bg-pulse-200 text-pulse-700"
              : "bg-pulse-100 text-text-secondary hover:bg-pulse-100/70"
          )}
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{post.body}</p>
    </article>
  );
});

function GenerationCard({
  generation,
  name,
  open,
  onToggle,
  copiedId,
  onCopy,
}: {
  generation: PostGeneration;
  name: string;
  open: boolean;
  onToggle: () => void;
  copiedId: string | null;
  onCopy: (post: SavedPost) => void;
}) {
  const [copiedAll, setCopiedAll] = useState(false);

  const copyAll = async () => {
    try {
      const text = generation.posts
        .map((post, i) => `Variant ${i + 1}\n${post.body}`)
        .join("\n\n---\n\n");
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 pr-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left transition-colors hover:bg-canvas"
        >
          <ChevronDown
            size={16}
            className={clsx("shrink-0 text-text-muted transition-transform", open && "rotate-180")}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{name}</p>
            <p className="text-xs text-text-muted">
              Generated {formatThreadVersionDate(generation.createdAt)} · {generation.posts.length}{" "}
              post{generation.posts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => void copyAll()}
          className={clsx(
            "btn-subtle inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium",
            copiedAll && "border-[var(--np-line-pulse)] bg-pulse-100 text-pulse-700"
          )}
        >
          {copiedAll ? <Check size={13} /> : <ClipboardCopy size={13} />}
          {copiedAll ? "Copied!" : "Copy all"}
        </button>
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border-dim/70 p-4 sm:grid-cols-2">
          {generation.posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} copiedId={copiedId} onCopy={onCopy} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function SocialPayoutsPage() {
  const searchParams = useSearchParams();
  const preferredId = searchParams.get("siteId");

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAssetSummary | null>(null);
  const [postsBySite, setPostsBySite] = useState<Record<string, SavedPost[]>>({});
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const posts = useMemo(
    () => postsBySite[selectedSiteId] ?? [],
    [postsBySite, selectedSiteId]
  );

  const loadPosts = useCallback(async (siteId: string) => {
    if (!siteId) {
      return;
    }

    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/premium/social-payouts?siteId=${encodeURIComponent(siteId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        const loaded = (data.posts ?? []) as SavedPost[];
        setPostsBySite((prev) => ({ ...prev, [siteId]: loaded }));
      } else {
        setError(typeof data.error === "string" ? data.error : "Failed to load posts");
      }
    } catch {
      setError("Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const handleAssetChange = useCallback(
    (assetId: string, asset: LiveAssetSummary | null) => {
      setSelectedSiteId(assetId);
      setSelectedAsset(asset);
      setOpenBatchId(null);
      setError("");
      if (assetId) {
        void loadPosts(assetId);
      }
    },
    [loadPosts]
  );

  const generations = useMemo<PostGeneration[]>(() => {
    const map = new Map<string, PostGeneration>();
    for (const post of posts) {
      const batchId = post.batchId ?? "legacy";
      let generation = map.get(batchId);
      if (!generation) {
        generation = { batchId, createdAt: post.createdAt ?? "", posts: [] };
        map.set(batchId, generation);
      }
      generation.posts.push(post);
    }
    return [...map.values()];
  }, [posts]);

  const hasExistingPosts = posts.length > 0;

  const handleGenerate = async () => {
    if (!selectedSiteId) {
      setError("Select a money page first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const promoBase = selectedAsset?.publicUrl?.trim() || "";
      const siteUrl = promoBase
        ? `${promoBase}${promoBase.includes("?") ? "&" : "?"}src=facebook`
        : undefined;

      const res = await fetch("/api/premium/social-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selectedSiteId, siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      await loadPosts(selectedSiteId);
      if (typeof data.batchId === "string" && data.batchId) {
        setOpenBatchId(data.batchId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = useCallback(async (post: SavedPost) => {
    try {
      await navigator.clipboard.writeText(post.body);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PremiumWorkflowShell
      title="Instant Income"
      subtitle="Bulk Facebook posts — pick a live money page, generate 10 scroll-stopping variants with different hooks and angles, then copy and paste."
      training={{
        vimeoId: "1215574185",
        title: "Instant Income Training",
        description:
          "Watch how to turn one money page into 10+ scroll-stopping Facebook posts with different hooks and angles — then copy, paste, and post.",
        iframeTitle: "Instant Income training video",
      }}
      tip={
        <>
          Tip: Each generation is saved as its own post set. Visits from these posts show in Results with{" "}
          <span className="text-text-primary">?src=facebook</span>.
        </>
      }
    >
      <PremiumStepsSection
        steps={[
          {
            num: "1",
            title: "Select a money page",
            desc: "Pick any live money page — its tracking link gets baked into every post automatically.",
          },
          {
            num: "2",
            title: "Generate post variants",
            desc: "One click creates 10 Facebook posts with different hooks and angles so you never sound repetitive.",
          },
          {
            num: "3",
            title: "Copy and post",
            desc: "Copy your favorites and paste them into Facebook groups and pages. Every generation is saved as its own set.",
          },
        ]}
      />

      <PremiumBestPracticesSection
        title="Facebook Posting Best Practices"
        subtitle="Follow these and your posts keep reaching people instead of getting flagged."
        items={FACEBOOK_BEST_PRACTICES}
      />

      <PremiumControlCard
        icon={Megaphone}
        title="Bulk post generator"
        description="One money page → many scroll-stopping posts with your link baked in."
      >
        <LiveAssetPicker
          value={selectedSiteId}
          preferredId={preferredId}
          storageKey={SITE_STORAGE_KEY}
          onChange={handleAssetChange}
          label="Live money page"
          disabled={generating}
        />

        {selectedAsset ? (
          <p className="text-xs text-text-muted">
            {selectedAsset.niche ? `Niche: ${selectedAsset.niche} · ` : ""}
            Published
            {posts.length > 0 ? ` · ${posts.length} saved posts` : ""}
          </p>
        ) : selectedSiteId ? null : (
          <p className="text-xs text-text-muted">
            Pick a live money page to see its saved post sets and generate new ones.
          </p>
        )}

        {error ? <PremiumErrorAlert message={error} /> : null}

        {selectedSiteId ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={generating || !selectedSiteId}
              onClick={() => void handleGenerate()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating
                ? "Generating 10 posts…"
                : hasExistingPosts
                  ? "Generate new posts"
                  : "Generate posts"}
            </button>
            {hasExistingPosts && !generating ? (
              <p className="text-xs text-text-muted">
                Each generation is saved as a new post set — your older sets stay below.
              </p>
            ) : null}
          </div>
        ) : null}
      </PremiumControlCard>

      <GenerationProgress
        active={generating}
        label="Generating 10 scroll-stopping Facebook post variants..."
      />

      {selectedSiteId && (loadingPosts || generations.length > 0) ? (
        <section id={GENERATION_RESULTS_ID} className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-medium text-text-primary">
            {loadingPosts && generations.length === 0
              ? "Loading saved posts…"
              : `Saved post sets (${generations.length})`}
          </h2>

          {loadingPosts && generations.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-divider bg-canvas px-4 py-6 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading saved posts…
            </div>
          ) : (
            generations.map((generation, i) => (
              <GenerationCard
                key={generation.batchId}
                generation={generation}
                name={`Post set #${generations.length - i}`}
                open={openBatchId === generation.batchId}
                onToggle={() =>
                  setOpenBatchId((prev) =>
                    prev === generation.batchId ? null : generation.batchId
                  )
                }
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))
          )}
        </section>
      ) : null}
    </PremiumWorkflowShell>
  );
}
