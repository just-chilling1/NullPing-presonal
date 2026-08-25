"use client";

import { clsx } from "clsx";

interface VideoThumbnailProps {
  title: string;
  onPlay: () => void;
  className?: string;
}

export function VideoThumbnail({ title, onPlay, className }: VideoThumbnailProps) {
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
      <div className="relative aspect-video w-full bg-black" />
    </button>
  );
}
