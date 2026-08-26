"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { resolveVideoThumbnail } from "@/lib/video-thumbnails";

interface VideoThumbnailProps {
  videoId?: string;
  title: string;
  onPlay: () => void;
  caption?: string;
  className?: string;
  eager?: boolean;
  thumbnailSrc?: string | null;
}

export function VideoThumbnail({
  videoId = "",
  title,
  onPlay,
  caption,
  className,
  eager = false,
  thumbnailSrc,
}: VideoThumbnailProps) {
  const [posterFailed, setPosterFailed] = useState(false);
  const posterSrc = posterFailed
    ? null
    : resolveVideoThumbnail(videoId, thumbnailSrc);

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${title}`}
      className={clsx(
        "group relative w-full overflow-hidden rounded-xl border border-border-dim/40 bg-black text-left cursor-pointer transition-all duration-200 hover:border-[var(--np-line-pulse)] hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-video w-full">
        {posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt=""
            aria-hidden
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "auto"}
            onError={() => setPosterFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink-2 to-ink" />
        )}

        <div className="video-thumb-scrim absolute inset-0" />

        {brand.logo.type === "image" && brand.logo.iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo.iconSrc}
            alt=""
            aria-hidden
            className="absolute right-3 top-3 z-10 h-8 w-8 rounded-lg object-contain shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:h-9 sm:w-9"
          />
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-grad-pulse text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
            <Play className="ml-1 h-8 w-8 fill-white sm:h-9 sm:w-9" />
          </span>
        </div>

        {caption ? (
          <p className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 text-center text-sm font-medium text-white drop-shadow-lg sm:text-base">
            {caption}
          </p>
        ) : null}
      </div>
    </button>
  );
}
