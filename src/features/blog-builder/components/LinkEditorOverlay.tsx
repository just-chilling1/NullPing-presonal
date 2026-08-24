"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { ArmedLink } from "../types";
import { detectLinkNetwork, isValidAffiliateUrl, normalizeAffiliateUrl } from "../lib/affiliate-url";

interface LinkEditorOverlayProps {
  open: boolean;
  /** Link being edited, or null when creating a new one. */
  initial: ArmedLink | null;
  onSave: (link: ArmedLink) => Promise<void>;
  onClose: () => void;
}

export function LinkEditorOverlay({ open, initial, onSave, onClose }: LinkEditorOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [label, setLabel] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset the form each time the overlay opens.
  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setTag(initial?.tag ?? "");
    setDescription(initial?.description ?? "");
    setUrl(initial?.url ?? "");
    setError(null);
    setSaving(false);
  }, [open, initial]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    },
    [saving, onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  const handleSave = async () => {
    const normalizedUrl = normalizeAffiliateUrl(url);
    if (!isValidAffiliateUrl(normalizedUrl)) {
      setError("Enter a valid URL starting with https://");
      return;
    }

    setSaving(true);
    setError(null);

    const link: ArmedLink = {
      label: label.trim() || "Promotional Offer",
      url: normalizedUrl,
      network: detectLinkNetwork(normalizedUrl),
      tag: tag.trim() || undefined,
      description: description.trim() || undefined,
    };

    try {
      await onSave(link);
      onClose();
    } catch {
      setError("Could not save the link. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-editor-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-dim/80 bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-dim bg-surface-sub px-6 py-4">
          <h2 id="link-editor-title" className="brand-font text-xl text-text-heading">
            {initial ? "Edit Link" : "Create New Link"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-pulse-100/10 hover:text-text-heading disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-surface-field px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="link-editor-label">
              Link Name
            </label>
            <input
              id="link-editor-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My Fitness eBook, Keto Supplement"
              className="input-base w-full rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="link-editor-url">
              URL
            </label>
            <input
              id="link-editor-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product?ref=your-id"
              className="input-base w-full rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="link-editor-tag">
              Tag <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              id="link-editor-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. health, weight-loss, supplement"
              className="input-base w-full rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="link-editor-description">
              Description <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              id="link-editor-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about this offer — payout, audience, angle..."
              rows={2}
              className="input-base min-h-[72px] w-full resize-y rounded-xl"
            />
          </div>

          {error && <p className="text-sm font-medium text-[var(--np-danger)]">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border-dim bg-surface-sub px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary w-full sm:w-auto disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !url.trim()}
            className="btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {initial ? "Save Changes" : "Create Link"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
