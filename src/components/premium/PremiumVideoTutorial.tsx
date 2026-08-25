"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { VideoOverlay } from "@/components/ui/video-overlay";
import { vimeoPlayerUrl } from "@/lib/dashboard-content";

interface PremiumVideoTutorialProps {
  vimeoId?: string;
  title: string;
  description: string;
  iframeTitle: string;
}

export function PremiumVideoTutorial({
  vimeoId = "",
  title,
  description,
  iframeTitle,
}: PremiumVideoTutorialProps) {
  const [open, setOpen] = useState(false);
  const hasVideo = Boolean(vimeoId);

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
                aria-label={hasVideo ? `Play ${iframeTitle}` : iframeTitle}
                className="absolute inset-0 block w-full cursor-pointer bg-black text-left disabled:cursor-default"
              />
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
