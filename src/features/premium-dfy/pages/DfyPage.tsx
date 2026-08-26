"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown, Zap, Link as LinkIcon, ArrowRight, Copy, Check,
    ChevronRight, Flame, RotateCcw, Sparkles, ExternalLink
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { GenerationProgress, GENERATION_RESULTS_ID } from "@/components/ui/generation-progress";
import { PremiumPageLayout } from "@/components/premium/PremiumPageLayout";
import { PremiumVideoTutorial } from "@/components/premium/PremiumVideoTutorial";
import { PremiumFooter } from "@/components/premium/PremiumFooter";

interface Post {
    id: string;
    platform: string;
    text: string;
    title?: string;
    url: string;
    engagement: string | number;
}

interface PostWithReplies {
    post: Post;
    replies: string[];
}

const KEYWORDS = [
    {
        label: "Best natural appetite suppressant",
        search: "best natural appetite suppressant reddit 2024",
        niche: "Weight Loss",
        description: "Users looking for non-stimulant weight loss solutions with high buying intent."
    },
    {
        label: "Best VPN for streaming",
        search: "best vpn for netflix 2024 reddit",
        niche: "Cybersecurity",
        description: "Users looking to bypass geo-restrictions on streaming platforms."
    },
    {
        label: "How to make money with AI tools",
        search: "how to make money with ai tools reddit",
        niche: "MMO",
        description: "Users seeking ways to leverage AI technology for side income."
    },
    {
        label: "Best ergonomic chair for back pain",
        search: "best ergonomic chair back pain under 300 reddit",
        niche: "Home Office",
        description: "Office workers looking for specific comfort solutions within a budget."
    },
    {
        label: "Best email marketing tool for small business",
        search: "best email marketing platform for creators reddit",
        niche: "Marketing",
        description: "Founders deciding on their email marketing tech stack."
    }
];

export default function DfyPage() {
    const [step, setStep] = useState(1);
    const [selectedKeyword, setSelectedKeyword] = useState<typeof KEYWORDS[0] | null>(null);
    const [affiliateLink, setAffiliateLink] = useState("");
    const [results, setResults] = useState<PostWithReplies[]>([]);
    const [loadingPhase, setLoadingPhase] = useState<"" | "finding" | "generating">("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const handleSelectKeyword = (kw: typeof KEYWORDS[0]) => {
        setSelectedKeyword(kw);
        setStep(2);
        setResults([]);
        setError("");
    };

    const handleGenerate = async () => {
        if (!affiliateLink.trim()) {
            setError("Please enter your Digistore affiliate link.");
            return;
        }
        if (!selectedKeyword) return;

        setError("");
        setStep(3);

        try {
            // Phase 1: Find real posts
            setLoadingPhase("finding");
            const postsResp = await fetch("/api/jackpots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: selectedKeyword.search })
            });
            const postsData = await postsResp.json();
            const posts: Post[] = (postsData.results || []).slice(0, 10);

            if (posts.length === 0) {
                setError("No posts found for this keyword. Try a different one.");
                setStep(2);
                setLoadingPhase("");
                return;
            }

            // Phase 2: Generate replies for each post
            setLoadingPhase("generating");
            const repliesResp = await fetch("/api/replies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ads: posts, affiliateLink: affiliateLink.trim() })
            });
            const repliesData = await repliesResp.json();
            const repliesResults = repliesData.results || [];

            const combined: PostWithReplies[] = posts.map((post) => {
                const match = repliesResults.find((r: any) => r.id === post.id);
                return {
                    post,
                    replies: match?.replies || []
                };
            }).filter((item) => item.replies.length > 0);

            setResults(combined);
        } catch {
            setError("Something went wrong. Please try again.");
            setStep(2);
        } finally {
            setLoadingPhase("");
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleReset = () => {
        setStep(1);
        setSelectedKeyword(null);
        setAffiliateLink("");
        setResults([]);
        setError("");
        setLoadingPhase("");
    };

    const renderFormattedReply = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <span key={i} className="text-blue-400 hover:underline cursor-pointer transition-colors break-all">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <PremiumPageLayout
            title="Done-For-You"
            subtitle="50 proven search angles and keywords — pick one, add your link, and get ready-made replies you can post in minutes."
            footer={<PremiumFooter />}
        >
            <PremiumVideoTutorial
                vimeoId=""
                iframeTitle="Done-For-You Tutorial"
                title="How to Use Done-For-You"
                description="Watch this quick tutorial to learn how to pick a keyword, add your link, and get ready-made replies you can post in minutes."
            />

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-3">
                {[
                    { num: 1, label: "Pick Keyword" },
                    { num: 2, label: "Your Link" },
                    { num: 3, label: "Get Replies" }
                ].map((s, i) => (
                    <div key={s.num} className="flex items-center gap-3">
                        <div className={clsx(
                            "select-chip-pill flex items-center gap-2.5 px-4 py-2",
                            step >= s.num && "is-selected"
                        )}>
                            <span className={clsx(
                                "flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium",
                                step >= s.num ? "bg-grad-pulse text-black shadow-pulse" : "bg-pulse-100 text-text-muted"
                            )}>
                                {step > s.num ? <Check size={12} strokeWidth={3} /> : s.num}
                            </span>
                            <span className="text-[13px] font-medium uppercase tracking-wider">{s.label}</span>
                        </div>
                        {i < 2 && (
                            <ChevronRight size={14} className={clsx(
                                step > s.num ? "text-pulse-700" : "text-text-muted/30"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* Step 1: Pick a Keyword */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="flex items-center gap-3 px-1">
                            <Zap size={18} className="text-pulse-700" />
                            <h2 className="text-xl font-medium text-text-heading">Choose Your Keyword</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {KEYWORDS.map((kw, idx) => (
                                <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                    onClick={() => handleSelectKeyword(kw)}
                                    className="glass-card p-6 flex flex-col gap-4 text-left group hover:border-[var(--np-line-pulse)] transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-pulse-100 blur-3xl -mr-10 -mt-10 group-hover:bg-pulse-100 transition-colors" />

                                    <div className="flex items-center justify-between">
                                        <span className="bg-surface border border-border-dim px-2.5 py-1 rounded-md text-[13px] font-medium text-text-muted uppercase tracking-widest">
                                            {kw.niche}
                                        </span>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-pulse-100 border border-[var(--np-line-pulse)] text-[13px] font-medium text-pulse-700 uppercase tracking-widest">
                                            <Flame size={10} />
                                            <span>High Intent</span>
                                        </div>
                                    </div>

                                    <h3 className="text-[16px] font-medium text-text-heading group-hover:text-pulse-700 transition-colors leading-snug">
                                        &ldquo;{kw.label}&rdquo;
                                    </h3>

                                    <p className="text-[13px] text-text-secondary leading-relaxed">
                                        {kw.description}
                                    </p>

                                    <div className="flex items-center gap-2 text-[13px] font-medium text-pulse-700 uppercase tracking-widest mt-auto pt-3 border-t border-border-dim/30 group-hover:gap-3 transition-all">
                                        <span>Select This Keyword</span>
                                        <ChevronRight size={13} />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Enter Affiliate Link */}
                {step === 2 && selectedKeyword && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mx-auto flex w-full max-w-2xl flex-col gap-6"
                    >
                        <div className="glass-card p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-pulse-100 flex items-center justify-center">
                                    <Check size={16} className="text-pulse-700" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-text-muted uppercase tracking-widest">Selected Keyword</p>
                                    <p className="text-[15px] font-medium text-text-heading">&ldquo;{selectedKeyword.label}&rdquo;</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="text-[13px] font-medium text-text-muted hover:text-pulse-700 transition-colors flex items-center gap-1.5"
                            >
                                <RotateCcw size={12} />
                                Change
                            </button>
                        </div>

                        <div className="glass-card p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-pulse-100 flex items-center justify-center">
                                    <LinkIcon size={18} className="text-pulse-700" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-medium text-text-heading">Provide Your Digistore Affiliate Link</h2>
                                    <p className="text-[13px] text-text-muted">We&apos;ll find high-ranking posts and generate replies with your link.</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <input
                                    type="url"
                                    placeholder="https://www.digistore24.com/redir/XXXXX/your-id/"
                                    className="w-full surface-inset border-border-dim/40 px-4 py-4 text-sm text-text-primary placeholder:text-text-muted/40 outline-none focus:border-[var(--np-line-pulse)] transition-colors"
                                    value={affiliateLink}
                                    onChange={(e) => {
                                        setAffiliateLink(e.target.value);
                                        if (error) setError("");
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                />
                                {error && (
                                    <p className="text-[13px] text-[var(--np-danger)] font-medium px-1">{error}</p>
                                )}
                            </div>

                            <button
                                onClick={handleGenerate}
                                className="btn-primary py-4 group"
                            >
                                <Sparkles size={18} />
                                <span>Find Posts & Generate Replies</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Results */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col gap-6"
                    >
                        {/* Recap bar */}
                        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-pulse-100 border border-[var(--np-line-pulse)] rounded-lg">
                                    <Flame size={12} className="text-pulse-700" />
                                    <span className="text-[13px] font-medium text-pulse-700">{selectedKeyword?.niche}</span>
                                </div>
                                <span className="text-[13px] font-medium text-text-primary">&ldquo;{selectedKeyword?.label}&rdquo;</span>
                            </div>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-pulse-700 transition-colors"
                            >
                                <RotateCcw size={12} />
                                Start Over
                            </button>
                        </div>

                        {/* Loading state */}
                        <GenerationProgress
                            active={Boolean(loadingPhase)}
                            label={
                                loadingPhase === "finding"
                                    ? "Finding high-ranking posts on Reddit & Quora..."
                                    : "Generating replies with your affiliate link..."
                            }
                        />

                        {/* Results */}
                        {!loadingPhase && results.length > 0 && (
                            <div id={GENERATION_RESULTS_ID} className="flex flex-col gap-4 scroll-mt-24">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-lg font-medium text-text-heading">
                                        {results.length} Posts Found — Replies Ready
                                    </h2>
                                    <span className="text-[13px] font-medium text-pulse-700 bg-pulse-100 border border-[var(--np-line-pulse)] px-3 py-1 rounded-full">
                                        Copy Reply → Paste Under Post → Earn
                                    </span>
                                </div>

                                <div className="flex flex-col gap-5">
                                    {results.map((item, idx) => {
                                        const labels = ["Short & Direct", "Detailed Value", "Curiosity Hook"];
                                        return (
                                            <motion.div
                                                key={item.post.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="surface-inset border-border-dim/30 overflow-hidden"
                                            >
                                                {/* Post header */}
                                                <div className="p-4 flex items-start justify-between gap-3 border-b border-border-dim/15">
                                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "text-[13px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border inline-flex items-center gap-1",
                                                                item.post.platform === "Reddit"
                                                                    ? "text-[var(--np-warning)] border-[var(--np-warning)]/20 bg-[var(--np-warning)]/10"
                                                                    : "text-[var(--np-danger)] border-[var(--np-danger)]/20 bg-[var(--np-danger)]/10"
                                                            )}>
                                                                {item.post.platform}
                                                            </span>
                                                            <span className="text-[13px] text-text-muted">
                                                                {typeof item.post.engagement === "number"
                                                                    ? `${item.post.engagement.toLocaleString()} engagements`
                                                                    : item.post.engagement || "Trending"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[13px] text-text-primary leading-relaxed font-medium line-clamp-2">
                                                            {item.post.title || item.post.text}
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={item.post.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pulse-100 border border-[var(--np-line-pulse)] text-[13px] font-medium text-pulse-700 hover:bg-pulse-200 transition-all"
                                                    >
                                                        <ExternalLink size={11} />
                                                        <span>Go to Post</span>
                                                    </a>
                                                </div>

                                                {/* Replies */}
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                                        {item.replies.map((reply, rIdx) => {
                                                            const uniqueId = `${item.post.id}-${rIdx}`;
                                                            const isCopied = copiedId === uniqueId;

                                                            return (
                                                                <div key={rIdx} className="flex flex-col surface-nested border-border-dim/20 p-4 hover:border-[var(--np-line-pulse)] transition-all group">
                                                                    <div className="flex items-center justify-between mb-2.5">
                                                                        <span className="text-[13px] font-medium text-pulse-700 uppercase tracking-widest">
                                                                            {labels[rIdx] || `Reply #${rIdx + 1}`}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleCopy(reply, uniqueId)}
                                                                            className={clsx(
                                                                                "flex items-center gap-1 px-2 py-1 rounded text-[13px] font-medium transition-all",
                                                                                isCopied
                                                                                    ? "bg-success text-white"
                                                                                    : "bg-page border border-border-dim text-text-muted hover:bg-grad-pulse hover:text-black hover:border-[var(--np-line-pulse)]"
                                                                            )}
                                                                        >
                                                                            {isCopied ? <Check size={10} /> : <Copy size={10} />}
                                                                            <span>{isCopied ? "Copied!" : "Copy"}</span>
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[13px] text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                                                                        {renderFormattedReply(reply)}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Error in step 3 */}
                        {!loadingPhase && results.length === 0 && error && (
                            <div className="flex flex-col items-center py-16 gap-4">
                                <p className="text-sm text-[var(--np-danger)]">{error}</p>
                                <button onClick={() => setStep(2)} className="btn-primary">
                                    <RotateCcw size={14} />
                                    <span>Try Again</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </PremiumPageLayout>
    );
}
