import React from "react";
import { Composition } from "remotion";
import { TrainingVideo, VideoData } from "./TrainingVideo";
import video1 from "./data/video1.json";
import video2 from "./data/video2.json";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Video1-WatchThisFirst"
        component={TrainingVideo}
        durationInFrames={Math.ceil((video1 as VideoData).durationSec * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ data: video1 as VideoData, audio: "vo1.mp3" }}
      />
      <Composition
        id="Video2-HowTheMoneyFlows"
        component={TrainingVideo}
        durationInFrames={Math.ceil((video2 as VideoData).durationSec * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ data: video2 as VideoData, audio: "vo2.mp3" }}
      />
    </>
  );
};
