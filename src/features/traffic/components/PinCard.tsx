"use client";

import { Copy, ImageIcon } from "lucide-react";

export interface PinCardData {
  id: string;
  headline: string;
  title: string;
  description: string;
  keywords: string[];
  image_url: string | null;
}

interface PinCardProps {
  pin: PinCardData;
  index: number;
  destinationUrl: string;
  copiedId: string | null;
  onCopyText: (id: string, text: string) => void;
  onCopyImage: (id: string, imageUrl: string) => void;
}

function pinImageSrc(url: string) {
  const base = url.includes("?") ? url : `${url}?v=10`;
  if (base.includes("v=")) return base.replace(/([?&])v=\d+/, "$1v=10");
  return `${base}&v=10`;
}

export function buildPinTextBundle(pin: PinCardData, destinationUrl: string): string {
  const keywords = (pin.keywords ?? []).filter(Boolean).join(", ");
  return [
    pin.headline ? `Headline: ${pin.headline}` : "",
    pin.title ? `Title: ${pin.title}` : "",
    pin.description ? `Description: ${pin.description}` : "",
    keywords ? `Keywords: ${keywords}` : "",
    destinationUrl ? `Destination: ${destinationUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function copyPinImageToClipboard(imageUrl: string): Promise<"image" | "url" | "failed"> {
  const resolved = imageUrl.startsWith("/")
    ? `${window.location.origin}${imageUrl}`
    : imageUrl;

  try {
    const response = await fetch(resolved);
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      return "image";
    }
  } catch {
    /* fall through to URL copy */
  }

  try {
    await navigator.clipboard.writeText(resolved);
    return "url";
  } catch {
    return "failed";
  }
}

export function PinCard({
  pin,
  index,
  destinationUrl,
  copiedId,
  onCopyText,
  onCopyImage,
}: PinCardProps) {
  const imageSrc = pin.image_url?.trim() ? pinImageSrc(pin.image_url.trim()) : null;
  const textBundle = buildPinTextBundle(pin, destinationUrl);
  const textCopyId = `pin-text-${pin.id}`;
  const imageCopyId = `pin-image-${pin.id}`;
  const imageCopied = copiedId === imageCopyId;
  const textCopied = copiedId === textCopyId;

  return (
    <article className="pin-card">
      {imageCopied ? (
        <p className="pin-copy-toast" role="status" aria-live="polite">
          Image copied
        </p>
      ) : null}

      <div className="pin-card-media">
        <div className="pin-card-media-chrome">
          <span className="pin-card-badge">Pin #{index + 1}</span>
          {textCopied ? <span className="pin-card-copied">Text copied</span> : null}
        </div>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={pin.headline || pin.title} loading="lazy" decoding="async" />
        ) : (
          <div className="pin-card-media-empty">
            <ImageIcon size={22} strokeWidth={1.75} aria-hidden />
            <span>No preview</span>
          </div>
        )}
      </div>

      <div className="pin-card-body">
        <div className="pin-copy-row">
          <span className="pin-meta-label">Attention-grabbing headline</span>
          <p className="pin-card-headline">{pin.headline}</p>
        </div>

        <div className="pin-copy-stack">
          <div className="pin-copy-row">
            <div className="pin-copy-row-top">
              <span className="pin-meta-label">Title</span>
            </div>
            <p className="pin-meta-value">{pin.title}</p>
          </div>

          <div className="pin-copy-row">
            <div className="pin-copy-row-top">
              <span className="pin-meta-label">Pinterest description</span>
            </div>
            <p className="pin-meta-value">{pin.description}</p>
          </div>
        </div>

        {(pin.keywords ?? []).length > 0 ? (
          <div className="pin-keywords-block">
            <span className="pin-meta-label">Keywords</span>
            <div className="pin-meta-keywords">
              {pin.keywords.map((keyword) => (
                <span key={keyword} className="pin-keyword-chip">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pin-destination-row">
          <div className="pin-destination-copy">
            <span className="pin-meta-label">Destination URL</span>
            <p className="pin-meta-link">{destinationUrl}</p>
          </div>
        </div>
      </div>

      <div className="pin-card-actions">
        <button
          type="button"
          className={`pin-action-btn pin-action-btn--primary${imageCopied ? " is-copied" : ""}`}
          disabled={!imageSrc}
          onClick={() => imageSrc && onCopyImage(imageCopyId, imageSrc)}
        >
          <ImageIcon size={15} strokeWidth={1.75} aria-hidden />
          {imageCopied ? "Image copied" : "Copy image"}
        </button>
        <button
          type="button"
          className={`pin-action-btn${textCopied ? " is-copied" : ""}`}
          onClick={() => onCopyText(textCopyId, textBundle)}
        >
          <Copy size={14} strokeWidth={1.75} aria-hidden />
          {textCopied ? "Text copied" : "Copy text"}
        </button>
      </div>
    </article>
  );
}
