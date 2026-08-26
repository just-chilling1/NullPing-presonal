import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../brand";

export type CaptionChunk = { s: number; e: number; text: string };

export const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let active: CaptionChunk | null = null;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const next = chunks[i + 1];
    // extend chunk until the next one starts to avoid flicker in small gaps
    const end = next ? Math.min(next.s, c.e + 0.6) : c.e + 0.6;
    if (t >= c.s && t < end) {
      active = c;
      break;
    }
  }
  if (!active) return null;

  const sinceStart = (t - active.s) * fps;
  const opacity = interpolate(sinceStart, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 52,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          maxWidth: 1400,
          padding: "16px 36px",
          borderRadius: 14,
          background: "rgba(12,10,14,0.78)",
          border: "1px solid rgba(217,70,239,0.18)",
          color: COLORS.text,
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: "center",
          fontFamily: "Inter",
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
