"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Link2, Loader2, Save } from "lucide-react";
import { ContentReservePicker } from "@/features/blog-builder/components/ContentReservePicker";
import type { ArmedLink } from "@/features/blog-builder/types";
import {
  detectLinkNetwork,
  isValidAffiliateUrl,
  normalizeAffiliateUrl,
} from "@/features/blog-builder/lib/affiliate-url";
import { invalidateClientFetchCache } from "@/lib/client-fetch-cache";

interface AffiliateLinkFieldProps {
  value: string;
  onChange: (url: string) => void;
  inputId?: string;
  placeholder?: string;
  /** Visible label above the manual URL input */
  manualLabel?: string;
  /**
   * `save-to-vault` (default): persist the URL to Links Library.
   * `apply`: validate and apply the URL for CTAs without saving to the vault.
   */
  actionMode?: "save-to-vault" | "apply";
  /** Called after a successful Apply Link (apply mode only). */
  onApply?: (url: string) => void;
  /** Override the success hint shown after Apply Link (apply mode only). */
  appliedMessage?: string;
}

function validVaultLinks(links: ArmedLink[]): ArmedLink[] {
  return links.filter((link) => isValidAffiliateUrl(link.url));
}

export function AffiliateLinkField({
  value,
  onChange,
  inputId = "affiliate-link",
  placeholder = "https://...",
  manualLabel,
  actionMode = "save-to-vault",
  onApply,
  appliedMessage = "This link will be used on money page CTAs when you install a page.",
}: AffiliateLinkFieldProps) {
  const [vaultLinks, setVaultLinks] = useState<ArmedLink[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [selectedVaultUrl, setSelectedVaultUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadVault = useCallback(async () => {
    setLoadingVault(true);
    try {
      const res = await fetch("/api/blog/link-vault", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { links?: ArmedLink[] };
      setVaultLinks(validVaultLinks(data.links ?? []));
    } catch {
      /* ignore */
    } finally {
      setLoadingVault(false);
    }
  }, []);

  useEffect(() => {
    void loadVault();
  }, [loadVault]);

  useEffect(() => {
    if (vaultLinks.length === 0) {
      setSelectedVaultUrl(null);
      return;
    }

    const normalizedValue = normalizeAffiliateUrl(value);
    if (!normalizedValue) {
      setSelectedVaultUrl(null);
      return;
    }

    const match = vaultLinks.find(
      (link) => normalizeAffiliateUrl(link.url) === normalizedValue
    );
    setSelectedVaultUrl(match?.url ?? null);
  }, [value, vaultLinks]);

  useEffect(() => {
    if (actionMode !== "apply") return;
    if (!isValidAffiliateUrl(value)) {
      setApplied(false);
    }
  }, [actionMode, value]);

  const handleSelectFromVault = (link: ArmedLink | null) => {
    if (!link) {
      setSelectedVaultUrl(null);
      onChange("");
      setSaved(false);
      setApplied(false);
      setSaveError("");
      return;
    }

    setSelectedVaultUrl(link.url);
    onChange(link.url);
    setSaved(true);
    setApplied(true);
    setSaveError("");
    if (actionMode === "apply") onApply?.(normalizeAffiliateUrl(link.url) || link.url);
  };

  const handleInputChange = (nextUrl: string) => {
    onChange(nextUrl);
    setSaved(false);
    setApplied(false);
    setSaveError("");

    if (!selectedVaultUrl) return;
    const vaultLink = vaultLinks.find((link) => link.url === selectedVaultUrl);
    if (
      vaultLink &&
      normalizeAffiliateUrl(nextUrl) !== normalizeAffiliateUrl(vaultLink.url)
    ) {
      setSelectedVaultUrl(null);
    }
  };

  const handleSaveToVault = async () => {
    const url = normalizeAffiliateUrl(value);
    if (!isValidAffiliateUrl(url)) {
      setSaveError("Enter a valid URL starting with https://");
      return;
    }

    setSaving(true);
    setSaveError("");

    const newLink: ArmedLink = {
      label: "Promotional Offer",
      url,
      network: detectLinkNetwork(url),
    };
    const nextLinks = [
      newLink,
      ...vaultLinks.filter(
        (link) => normalizeAffiliateUrl(link.url) !== url
      ),
    ];

    try {
      const res = await fetch("/api/blog/link-vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: nextLinks }),
      });
      if (!res.ok) throw new Error("Save failed");

      setVaultLinks(nextLinks);
      setSelectedVaultUrl(url);
      setSaved(true);
      invalidateClientFetchCache("/api/blog/link-vault");
    } catch {
      setSaveError("Could not save to Links Library. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLink = () => {
    const url = normalizeAffiliateUrl(value);
    if (!isValidAffiliateUrl(url)) {
      setSaveError("Enter a valid URL starting with https://");
      setApplied(false);
      return;
    }

    onChange(url);
    setApplied(true);
    setSaveError("");
    onApply?.(url);
  };

  const normalizedValue = normalizeAffiliateUrl(value);
  const isInVault = vaultLinks.some(
    (link) => normalizeAffiliateUrl(link.url) === normalizedValue
  );
  const canSave = isValidAffiliateUrl(value) && !isInVault && !saving;
  const canApply = Boolean(value.trim()) && !applied;

  return (
    <div className="space-y-3">
      <div>
        {loadingVault ? (
          <p className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 size={12} className="animate-spin" />
            Loading saved links…
          </p>
        ) : vaultLinks.length > 0 ? (
          <ContentReservePicker
            links={vaultLinks}
            selectedUrl={selectedVaultUrl}
            onSelect={handleSelectFromVault}
            roundedClassName="!rounded-3xl"
          />
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="wizard-form-label block">Select from Links Library</label>
            </div>
            <p className="rounded-xl border border-dashed border-border-dim px-3 py-4 text-center text-sm text-text-muted">
              No saved links yet.{" "}
              <Link href="/link-vault" className="auth-link">
                Open Links Library
              </Link>{" "}
              to create one, or paste a link below.
            </p>
            <p className="wizard-divider-label">or enter manually</p>
          </div>
        )}
      </div>

      <label className="block" htmlFor={inputId}>
        <span className={manualLabel ? "mb-2 flex items-center gap-2 text-sm font-medium text-text-primary" : "sr-only"}>
          {manualLabel ? (
            <>
              <Link2 size={14} className="text-pulse-700" />
              {manualLabel}
            </>
          ) : (
            "Affiliate link URL"
          )}
        </span>
        <input
          id={inputId}
          type="url"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="input-base w-full !rounded-3xl"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {actionMode === "apply" ? (
          <button
            type="button"
            onClick={handleApplyLink}
            disabled={!canApply}
            className="btn-secondary inline-flex items-center gap-2 border-[var(--np-line-pulse)] bg-pulse-100/40 text-sm font-medium text-pulse-700 shadow-sm hover:bg-pulse-100/70 disabled:opacity-40"
          >
            {applied ? <Check size={14} /> : <Link2 size={14} />}
            {applied ? "Link applied" : "Apply Link"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSaveToVault()}
            disabled={!canSave}
            className="btn-secondary inline-flex items-center gap-2 border-[var(--np-line-pulse)] bg-pulse-100/40 text-sm font-medium text-pulse-700 shadow-sm hover:bg-pulse-100/70 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved && isInVault ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {saved && isInVault ? "Saved to Links Library" : "Save to Links Library"}
          </button>
        )}
        {vaultLinks.length > 0 && (
          <Link
            href="/link-vault"
            className="btn-secondary inline-flex items-center gap-2 border-[var(--np-line-pulse)] text-sm font-medium text-text-primary shadow-sm hover:bg-surface-field"
          >
            Manage saved links
          </Link>
        )}
      </div>

      {actionMode === "apply" && applied ? (
        <p className="text-xs text-pulse-700">{appliedMessage}</p>
      ) : null}

      {saveError && <p className="text-xs text-error">{saveError}</p>}
    </div>
  );
}
