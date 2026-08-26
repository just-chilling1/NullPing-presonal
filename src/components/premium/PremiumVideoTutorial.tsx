"use client";

import { useState } from "react";
import { Clock, Play, Sparkles } from "lucide-react";
import { VideoOverlay } from "@/components/ui/video-overlay";
import { vimeoPlayerUrl } from "@/lib/dashboard-content";
import { resolveVideoThumbnail } from "@/lib/video-thumbnails";

interface PremiumVideoTutorialProps {
  vimeoId?: string;
  title: string;
  description: string;
  iframeTitle: string;
  thumbnailSrc?: string | null;
}

export function PremiumVideoTutorial({
  vimeoId = "",
  title,
  description,
  iframeTitle,
  thumbnailSrc,
}: PremiumVideoTutorialProps) {
  const [open, setOpen] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const hasVideo = Boolean(vimeoId);
  const posterSrc = posterFailed
    ? null
    : resolveVideoThumbnail(vimeoId, thumbnailSrc);

  const handlePlay = () => {
    if (hasVideo) setOpen(true);
  };

  return (
    <>
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-col md:flex-row">
          <div className="relative bg-black md:w-1/2">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <button
                type="button"
                onClick={handlePlay}
                disabled={!hasVideo}
                aria-label={hasVideo ? `Play ${iframeTitle}` : `${iframeTitle} — coming soon`}
                className="absolute inset-0 block w-full cursor-pointer bg-black text-left disabled:cursor-default"
              >
                {posterSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterSrc}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    onError={() => setPosterFailed(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink-2 to-ink" />
                )}
                <div className="video-thumb-scrim absolute inset-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-grad-pulse text-white opacity-90 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105">
                    <Play className="ml-1 h-8 w-8 fill-white" />
                  </span>
                  {hasVideo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm">
                      ▶ Click to Play Video
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm">
                      <Clock size={12} />
                      Training video coming soon
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 p-8 md:w-1/2 md:p-10">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-pulse-700" />
              <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-pulse-700">
                Watch First
              </span>
            </div>
            <h2 className="text-2xl font-medium text-text-primary">{title}</h2>
            <p className="leading-relaxed text-text-secondary">{description}</p>
          </div>
        </div>
      </section>

      {hasVideo && open ? (
        <VideoOverlay
          open={open}
          onClose={() => setOpen(false)}
          videoUrl={vimeoPlayerUrl(vimeoId)}
          title={title}
        />
      ) : null}
    </>
  );
}
