import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../brand";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 3600], [0, 220]);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 90);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      {/* purple glow top-right */}
      <div
        style={{
          position: "absolute",
          width: 1600,
          height: 1600,
          borderRadius: "50%",
          right: -600 + drift * 0.3,
          top: -800,
          background: `radial-gradient(circle, rgba(217,70,239,${0.16 + pulse * 0.05}) 0%, transparent 62%)`,
        }}
      />
      {/* violet glow bottom-left */}
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          borderRadius: "50%",
          left: -700,
          bottom: -750 + drift * 0.2,
          background: `radial-gradient(circle, rgba(139,92,246,${0.13 + pulse * 0.04}) 0%, transparent 60%)`,
        }}
      />
      {/* faint grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(217,70,239,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(217,70,239,0.05) 1px, transparent 1px)",
          backgroundSize: "110px 110px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
        }}
      />
      {/* diagonal light streak */}
      <div
        style={{
          position: "absolute",
          width: 2600,
          height: 220,
          left: -300,
          top: 300 + drift * 0.35,
          rotate: "-24deg",
          background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.06), transparent)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
