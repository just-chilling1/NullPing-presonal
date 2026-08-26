"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { vimeoPlayerUrl, type AcademyVideo } from "@/lib/training-content";
import {
  clearTrainingComplete,
  fetchTrainingCompletions,
  markTrainingComplete,
} from "@/features/training/lib/training-completions";
import { cn } from "@/lib/utils";

const VideoOverlay = dynamic(
  () => import("@/components/ui/video-overlay").then((mod) => mod.VideoOverlay),
  { ssr: false }
);

interface TrainingVideoCardProps {
  video: AcademyVideo;
  index?: number;
  priority?: boolean;
  completed?: boolean;
  onCompletedChange?: (videoKey: string, completed: boolean) => void;
}

export function TrainingVideoCard({
  video,
  index,
  priority = false,
  completed = false,
  onCompletedChange,
}: TrainingVideoCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasVideo = Boolean(video.id.trim());
  const stepLabel = index != null ? `${index + 1}` : null;

  const handlePlay = () => {
    if (hasVideo) setOpen(true);
  };

  const persistComplete = useCallback(async () => {
    if (completed || saving) return;
    setSaving(true);
    const ok = await markTrainingComplete(video.completionKey);
    setSaving(false);
    if (ok) onCompletedChange?.(video.completionKey, true);
  }, [completed, onCompletedChange, saving, video.completionKey]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Opening the player counts as watched once Vimeo is wired; still mark
    // when the member closes so progress survives empty embed ids.
    void persistComplete();
  }, [persistComplete]);

  const handleToggleComplete = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    if (completed) {
      const ok = await clearTrainingComplete(video.completionKey);
      setSaving(false);
      if (ok) onCompletedChange?.(video.completionKey, false);
      return;
    }
    const ok = await markTrainingComplete(video.completionKey);
    setSaving(false);
    if (ok) onCompletedChange?.(video.completionKey, true);
  }, [completed, onCompletedChange, saving, video.completionKey]);

  return (
    <>
      <article
        className={cn(
          "glass-card flex flex-col overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_360px]",
          completed && "ring-1 ring-pulse-700/30"
        )}
      >
        <div className="border-b border-border-dim/60 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            {stepLabel ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pulse-100 text-[13px] font-medium text-pulse-700">
                {stepLabel}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {video.badge ? (
                  <span className="inline-block text-[13px] font-medium uppercase tracking-widest text-pulse-700">
                    {video.badge}
                  </span>
                ) : null}
                {completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-pulse-700/25 bg-pulse-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-pulse-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Completed
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-medium text-text-heading sm:text-base">{video.title}</h3>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <VideoThumbnail
            videoId={video.id}
            thumbnailSrc={video.thumbnailSrc}
            title={video.title}
            caption={hasVideo ? "▶ Click to Play Video" : "Video coming soon"}
            onPlay={handlePlay}
            eager={priority}
          />
        </div>

        <div className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <p className="text-[13px] leading-relaxed text-text-secondary">{video.description}</p>
          {video.duration ? (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {video.duration}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleToggleComplete()}
            disabled={saving}
            className={cn(
              "inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-medium transition-colors",
              completed
                ? "border-pulse-700/30 bg-pulse-100 text-pulse-700 hover:bg-pulse-100/80"
                : "border-border-dim bg-page/80 text-text-secondary hover:border-pulse-700/40 hover:text-pulse-700",
              saving && "opacity-70"
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {completed ? "Mark incomplete" : "Mark complete"}
          </button>
        </div>
      </article>

      {hasVideo && open ? (
        <VideoOverlay
          open={open}
          onClose={handleClose}
          videoUrl={vimeoPlayerUrl(video.id)}
          title={video.title}
        />
      ) : null}
    </>
  );
}

interface AcademyVideoGridProps {
  videos: AcademyVideo[];
  numbered?: boolean;
  columnsClassName?: string;
}

export function AcademyVideoGrid({
  videos,
  numbered = false,
  columnsClassName = "grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 xl:grid-cols-3 xl:gap-8",
}: AcademyVideoGridProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetchTrainingCompletions().then((ids) => {
      if (!cancelled) setCompletedIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCompletedChange = useCallback((videoKey: string, done: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (done) next.add(videoKey);
      else next.delete(videoKey);
      return next;
    });
  }, []);

  return (
    <div className={columnsClassName}>
      {videos.map((video, index) => (
        <TrainingVideoCard
          key={video.completionKey}
          video={video}
          index={numbered ? index : undefined}
          priority={numbered && index === 0}
          completed={completedIds.has(video.completionKey)}
          onCompletedChange={handleCompletedChange}
        />
      ))}
    </div>
  );
}
