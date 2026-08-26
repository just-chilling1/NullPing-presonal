import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Background } from "./components/Background";
import { Captions, CaptionChunk } from "./components/Captions";
import {
  IntroSlide,
  TitleSlide,
  QuoteSlide,
  ShotSlide,
  BannerSlide,
  StepsSlide,
  TermSlide,
  EndSlide,
} from "./components/Slides";

loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export type Slide = {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
};

export type VideoData = {
  durationSec: number;
  slides: Slide[];
  captions: CaptionChunk[];
};

const SlideContent: React.FC<{ slide: Slide }> = ({ slide }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = slide as any;
  switch (slide.type) {
    case "intro":
      return <IntroSlide num={s["num"]} title={s["title"]} sub={s["sub"]} />;
    case "title":
      return <TitleSlide kicker={s["kicker"]} headline={s["headline"]} sub={s["sub"]} />;
    case "quote":
      return <QuoteSlide text={s["text"]} label={s["label"]} />;
    case "shot":
      return <ShotSlide img={s["img"]} caption={s["caption"]} />;
    case "banner":
      return <BannerSlide headline={s["headline"]} sub={s["sub"]} note={s["note"]} />;
    case "steps":
      return <StepsSlide kicker={s["kicker"]} items={s["items"]} sub={s["sub"]} />;
    case "term":
      return <TermSlide n={s["n"]} term={s["term"]} def={s["def"]} analogy={s["analogy"]} />;
    case "end":
      return <EndSlide headline={s["headline"]} sub={s["sub"]} />;
    default:
      return null;
  }
};

const FADE_F = 10;

const SlideWrapper: React.FC<{ slide: Slide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  void fps;
  // cross-fade out at the end of each slide
  const opacity = interpolate(
    frame,
    [durationInFrames - FADE_F, durationInFrames - 1],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{<SlideContent slide={slide} />}</AbsoluteFill>;
};

export const TrainingVideo: React.FC<{ data: VideoData; audio: string }> = ({ data, audio }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background />
      <Audio src={staticFile(audio)} />
      {data.slides.map((slide, i) => {
        const from = Math.round(slide.start * fps);
        const dur = Math.max(1, Math.round((slide.end - slide.start) * fps) + FADE_F);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SlideWrapper slide={slide} />
          </Sequence>
        );
      })}
      <Captions chunks={data.captions} />
    </AbsoluteFill>
  );
};
