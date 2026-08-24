"use client";

import { memo } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  ArrowRight,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { resolvePublicUrl } from "@/lib/public-url";

export interface VaultTemplateRow {
  id: number;
  niche: string;
  productName: string;
  templateName: string;
  seeded: boolean;
  accent: string;
  hook: string;
  toneLabel: string;
  themeLabel?: string;
  colorTheme?: string;
  variationId?: string;
  used?: boolean;
  usedAssetId?: string | null;
  usedSiteUrl?: string | null;
  usedAt?: string | null;
}

interface VaultTemplateCardProps {
  template: VaultTemplateRow;
  cloningId: number | null;
  viewingId: number | null;
  regeneratingId: number | null;
  regeneratedId: number | null;
  clonedSiteUrl: string | null;
  clonedAssetId: string | null;
  hasAffiliateLink: boolean;
  onView: (id: number) => void;
  onClone: (id: number) => void;
  onRegenerate: (catalogId: number, assetId: string) => void;
}

export const VaultTemplateCard = memo(function VaultTemplateCard({
  template,
  cloningId,
  viewingId,
  regeneratingId,
  regeneratedId,
  clonedSiteUrl,
  clonedAssetId,
  hasAffiliateLink,
  onView,
  onClone,
  onRegenerate,
}: VaultTemplateCardProps) {
  const isCloning = cloningId === template.id;
  const isViewing = viewingId === template.id;
  const isRegenerating = regeneratingId === template.id;
  const sitePath = clonedSiteUrl || template.usedSiteUrl || null;
  const assetId = clonedAssetId || template.usedAssetId || null;
  const liveSiteUrl = sitePath ? resolvePublicUrl(sitePath) : null;
  const isUsed = Boolean(template.used || liveSiteUrl);

  return (
    <article
      className={clsx(
        "glass-card flex flex-col gap-3 p-4 transition-colors hover:border-[var(--np-line-pulse)] [content-visibility:auto] [contain-intrinsic-size:auto_180px]",
        isUsed && "border-[var(--np-line-pulse)] bg-pulse-100/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase tracking-wider text-pulse-700">
            {template.niche}
          </p>
          <h3 className="mt-1 line-clamp-2 font-medium text-text-primary">{template.productName}</h3>
          <p className="mt-1 text-xs text-text-muted">{template.templateName}</p>
        </div>
        {isUsed ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--np-line-pulse)] bg-pulse-100/20 px-2.5 py-0.5 text-[12px] font-medium text-pulse-700">
            <Check size={12} />
            Used
          </span>
        ) : !template.seeded ? (
          <span className="shrink-0 rounded bg-pulse-100 px-2 py-0.5 text-[13px] text-text-muted">
            Pending
          </span>
        ) : null}
      </div>

      {isUsed && liveSiteUrl ? (
        <div className="mt-auto flex flex-col gap-2">
          <Link
            href={liveSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 text-sm"
          >
            View offer
            <ExternalLink size={14} />
          </Link>
          {assetId ? (
            <button
              type="button"
              disabled={isRegenerating}
              onClick={() => onRegenerate(template.id, assetId)}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {isRegenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Regenerate pins
            </button>
          ) : null}
          <Link
            href="/offers"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--np-line)] bg-[var(--np-surface)] px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-[var(--np-line-strong)]"
          >
            <FolderOpen size={14} />
            Offers Library
            <ArrowRight size={14} />
          </Link>
          {regeneratedId === template.id ? (
            <p className="text-center text-[11px] text-success">Pins regenerated with AI.</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            disabled={!template.seeded || isViewing}
            onClick={() => onView(template.id)}
            className="btn-secondary inline-flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {isViewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            View
          </button>
          <button
            type="button"
            disabled={!template.seeded || isCloning || !hasAffiliateLink}
            onClick={() => onClone(template.id)}
            className="btn-primary inline-flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {isCloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Use this template
          </button>
        </div>
      )}
    </article>
  );
});
