"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Clock } from "lucide-react";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { DashboardSection } from "./DashboardSection";
import { vimeoPlayerUrl, type DashboardVideo } from "@/lib/dashboard-content";

const VideoOverlay = dynamic(
  () => import("@/components/ui/video-overlay").then((mod) => mod.VideoOverlay),
  { ssr: false }
);

interface DashboardVideoCardProps {
  video: DashboardVideo;
  priority?: boolean;
}

export function DashboardVideoCard({ video, priority = false }: DashboardVideoCardProps) {
  const [open, setOpen] = useState(false);
  const hasVideo = Boolean(video.id.trim());

  const handlePlay = () => {
    if (hasVideo) setOpen(true);
  };

  return (
    <>
      <DashboardSection flush className="overflow-hidden">
        <div className="border-b border-border-dim/60 px-5 py-4 sm:px-6">
          <h3 className="ds-h3">{video.title}</h3>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <VideoThumbnail
            videoId={video.id}
            thumbnailSrc={video.thumbnailSrc}
            title={video.title}
            caption="▶ Click to Play Video"
            onPlay={handlePlay}
            eager={priority}
          />
        </div>

        <div className="space-y-2 px-5 py-4 sm:px-6 sm:py-5">
          <p className="text-sm leading-relaxed text-text-secondary">{video.description}</p>
          {video.duration ? (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {video.duration}
            </p>
          ) : null}
        </div>
      </DashboardSection>

      {hasVideo && open ? (
        <VideoOverlay
          open={open}
          onClose={() => setOpen(false)}
          videoUrl={vimeoPlayerUrl(video.id)}
          title={video.title}
        />
      ) : null}
    </>
  );
}
