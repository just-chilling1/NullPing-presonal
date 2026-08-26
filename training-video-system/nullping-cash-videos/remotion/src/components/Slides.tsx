import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, GRADIENT } from "../brand";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const useEnter = (delayFrames = 0) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delayFrames);
  const opacity = interpolate(f, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const y = interpolate(f, [0, 16], [36, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return { opacity, translate: `0px ${y}px` };
};

const Wordmark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 80,
      fontFamily: "Inter",
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: "0.42em",
      color: "rgba(250,250,250,0.85)",
    }}
  >
    NULLPING CASH
  </div>
);

const Kicker: React.FC<{ children: string }> = ({ children }) => {
  const st = useEnter(0);
  if (!children) return null;
  return (
    <div
      style={{
        ...st,
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.34em",
        color: COLORS.accent,
        marginBottom: 34,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
};

const GradText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      backgroundImage: GRADIENT,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);

const CenterCol: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "120px 160px 170px",
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

// ---------------------------------------------------------------- INTRO
export const IntroSlide: React.FC<{ num: string; title: string[]; sub: string }> = ({
  num,
  title,
  sub,
}) => {
  const frame = useCurrentFrame();
  const badgeScale = interpolate(frame, [0, 18], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const l1 = useEnter(6);
  const l2 = useEnter(12);
  const s = useEnter(20);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 14);

  return (
    <CenterCol>
      <Wordmark />
      <div
        style={{
          scale: String(badgeScale),
          width: 130,
          height: 130,
          borderRadius: "50%",
          border: `4px solid ${COLORS.accent}`,
          boxShadow: `0 0 ${44 + pulse * 26}px rgba(217,70,239,0.65)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
          fontWeight: 900,
          fontSize: 64,
          color: COLORS.text,
          marginBottom: 56,
          background: "rgba(217,70,239,0.12)",
        }}
      >
        {num}
      </div>
      <div style={{ ...l1, fontFamily: "Inter", fontWeight: 900, fontSize: 130, lineHeight: 1.02, color: COLORS.text }}>
        {title[0]}
      </div>
      <div style={{ ...l2, fontFamily: "Inter", fontWeight: 900, fontSize: 130, lineHeight: 1.02 }}>
        <GradText>{title[1]}</GradText>
      </div>
      {sub ? (
        <div style={{ ...s, marginTop: 44, fontFamily: "Inter", fontWeight: 500, fontSize: 42, color: COLORS.muted }}>
          {sub}
        </div>
      ) : null}
    </CenterCol>
  );
};

// ---------------------------------------------------------------- TITLE
export const TitleSlide: React.FC<{ kicker?: string; headline: string; sub?: string }> = ({
  kicker,
  headline,
  sub,
}) => {
  const h = useEnter(4);
  const s = useEnter(14);
  const lines = headline.split("\n");
  return (
    <CenterCol>
      <Wordmark />
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <div style={{ ...h, fontFamily: "Inter", fontWeight: 900, fontSize: 104, lineHeight: 1.08, color: COLORS.text }}>
        {lines.map((ln, i) => (
          <div key={i}>{i === lines.length - 1 && lines.length > 1 ? <GradText>{ln}</GradText> : ln}</div>
        ))}
      </div>
      {sub ? (
        <div style={{ ...s, marginTop: 42, fontFamily: "Inter", fontWeight: 500, fontSize: 42, lineHeight: 1.4, color: COLORS.muted, maxWidth: 1250 }}>
          {sub}
        </div>
      ) : null}
    </CenterCol>
  );
};

// ---------------------------------------------------------------- QUOTE
export const QuoteSlide: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const q = useEnter(6);
  const l = useEnter(0);
  const lines = text.split("\n");
  return (
    <CenterCol>
      <Wordmark />
      {label ? (
        <div
          style={{
            ...l,
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.3em",
            color: COLORS.accent,
            padding: "12px 30px",
            border: "1px solid rgba(217,70,239,0.4)",
            borderRadius: 100,
            marginBottom: 60,
            background: "rgba(217,70,239,0.08)",
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ ...q, position: "relative", maxWidth: 1420 }}>
        <div
          style={{
            position: "absolute",
            top: -110,
            left: -40,
            fontFamily: "Georgia, serif",
            fontSize: 240,
            color: "rgba(217,70,239,0.35)",
            lineHeight: 1,
          }}
        >
          {"\u201C"}
        </div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 88, lineHeight: 1.18, color: COLORS.text }}>
          {lines.map((ln, i) => (
            <div key={i}>{ln}</div>
          ))}
        </div>
      </div>
    </CenterCol>
  );
};

// ---------------------------------------------------------------- SHOT
export const ShotSlide: React.FC<{ img: string; caption?: string }> = ({ img, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, Math.max(durationInFrames, 1)], [1, 1.07]);
  const enter = useEnter(2);
  const cap = useEnter(12);
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "90px 120px 160px",
      }}
    >
      <Wordmark />
      <div
        style={{
          ...enter,
          width: "82%",
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(217,70,239,0.45)",
          boxShadow: "0 0 90px rgba(217,70,239,0.28), 0 40px 90px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <Img
            src={staticFile(`shots/${img}`)}
            style={{ width: "100%", display: "block", scale: String(zoom) }}
          />
        </div>
      </div>
      {caption ? (
        <div
          style={{
            ...cap,
            marginTop: 38,
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 42,
            color: COLORS.text,
            textAlign: "center",
          }}
        >
          <GradText>{caption}</GradText>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- BANNER
export const BannerSlide: React.FC<{ headline: string; sub: string; note?: string }> = ({
  headline,
  sub,
  note,
}) => {
  const frame = useCurrentFrame();
  const enter = useEnter(4);
  const noteEnter = useEnter(16);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 12);
  return (
    <CenterCol>
      <Wordmark />
      {note ? (
        <div
          style={{
            ...noteEnter,
            marginBottom: 54,
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: "0.2em",
            color: COLORS.muted,
            textTransform: "uppercase",
          }}
        >
          {note}
        </div>
      ) : null}
      <div
        style={{
          ...enter,
          width: 1250,
          borderRadius: 26,
          padding: "70px 80px",
          background: `linear-gradient(120deg, ${COLORS.successDark}, ${COLORS.success})`,
          boxShadow: `0 0 ${60 + pulse * 50}px rgba(34,197,94,0.55), 0 40px 80px rgba(0,0,0,0.5)`,
          border: "2px solid rgba(255,255,255,0.25)",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "Inter", fontWeight: 900, fontSize: 86, color: "#ffffff", lineHeight: 1.05 }}>
          {headline}
        </div>
        <div style={{ marginTop: 26, fontFamily: "Inter", fontWeight: 700, fontSize: 44, color: "rgba(255,255,255,0.92)" }}>
          {sub}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            padding: "20px 56px",
            borderRadius: 100,
            background: "#ffffff",
            color: COLORS.successDark,
            fontFamily: "Inter",
            fontWeight: 900,
            fontSize: 38,
            scale: String(1 + pulse * 0.04),
          }}
        >
          REGISTER FREE {"\u2192"}
        </div>
      </div>
    </CenterCol>
  );
};

// ---------------------------------------------------------------- STEPS
export const StepsSlide: React.FC<{ kicker?: string; items: string[]; sub?: string }> = ({
  kicker,
  items,
  sub,
}) => {
  const frame = useCurrentFrame();
  const s = useEnter(10 + items.length * 8);
  return (
    <CenterCol>
      <Wordmark />
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 34, alignItems: "flex-start" }}>
        {items.map((it, i) => {
          const d = 6 + i * 9;
          const op = interpolate(frame, [d, d + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });
          const x = interpolate(frame, [d, d + 14], [50, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                translate: `${x}px 0px`,
                display: "flex",
                alignItems: "center",
                gap: 34,
              }}
            >
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.accent}`,
                  background: "rgba(217,70,239,0.12)",
                  boxShadow: "0 0 30px rgba(217,70,239,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Inter",
                  fontWeight: 900,
                  fontSize: 36,
                  color: COLORS.text,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 62, color: COLORS.text }}>
                {it}
              </div>
            </div>
          );
        })}
      </div>
      {sub ? (
        <div style={{ ...s, marginTop: 56, fontFamily: "Inter", fontWeight: 500, fontSize: 38, color: COLORS.muted, maxWidth: 1250 }}>
          {sub}
        </div>
      ) : null}
    </CenterCol>
  );
};

// ---------------------------------------------------------------- TERM
export const TermSlide: React.FC<{ n: number; term: string; def: string; analogy: string }> = ({
  n,
  term,
  def,
  analogy,
}) => {
  const t = useEnter(4);
  const d = useEnter(14);
  const a = useEnter(24);
  return (
    <CenterCol>
      <Wordmark />
      {/* big watermark number */}
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 30,
          fontFamily: "Inter",
          fontWeight: 900,
          fontSize: 430,
          lineHeight: 1,
          color: "rgba(217,70,239,0.08)",
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "0.34em",
          color: COLORS.accent,
          marginBottom: 30,
        }}
      >
        JARGON SCHOOL · {n} / 10
      </div>
      <div style={{ ...t, fontFamily: "Inter", fontWeight: 900, fontSize: 150, lineHeight: 1 }}>
        <GradText>{term}</GradText>
      </div>
      <div style={{ ...d, marginTop: 48, fontFamily: "Inter", fontWeight: 700, fontSize: 50, color: COLORS.text, maxWidth: 1350, lineHeight: 1.3 }}>
        {def}
      </div>
      <div style={{ ...a, marginTop: 30, fontFamily: "Inter", fontWeight: 500, fontSize: 40, color: COLORS.muted, maxWidth: 1250, lineHeight: 1.35 }}>
        {analogy}
      </div>
    </CenterCol>
  );
};

// ---------------------------------------------------------------- END
export const EndSlide: React.FC<{ headline: string; sub?: string }> = ({ headline, sub }) => {
  const frame = useCurrentFrame();
  const h = useEnter(6);
  const s = useEnter(16);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 14);
  return (
    <CenterCol>
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.42em",
          marginBottom: 70,
          color: COLORS.text,
          textShadow: `0 0 ${20 + pulse * 20}px rgba(217,70,239,0.8)`,
        }}
      >
        NULLPING CASH
      </div>
      <div style={{ ...h, fontFamily: "Inter", fontWeight: 900, fontSize: 100, lineHeight: 1.1, color: COLORS.text, maxWidth: 1500 }}>
        <GradText>{headline}</GradText>
      </div>
      {sub ? (
        <div style={{ ...s, marginTop: 44, fontFamily: "Inter", fontWeight: 500, fontSize: 44, color: COLORS.muted }}>
          {sub}
        </div>
      ) : null}
    </CenterCol>
  );
};
