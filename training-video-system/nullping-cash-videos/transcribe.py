#!/usr/bin/env python3
"""Transcribe voiceover MP3s with word-level timestamps via openai-whisper."""
import json
import os
import sys
import time

import whisper

os.makedirs("transcripts", exist_ok=True)
model = whisper.load_model("large-v3-turbo")

for path in sys.argv[1:]:
    name = os.path.splitext(os.path.basename(path))[0]
    t0 = time.time()
    r = model.transcribe(path, word_timestamps=True, language="en")
    segments = []
    for seg in r["segments"]:
        words = []
        for w in seg.get("words", []):
            words.append({"w": w["word"].strip(), "s": w["start"], "e": w["end"]})
        segments.append(
            {"start": seg["start"], "end": seg["end"], "text": seg["text"], "words": words}
        )
    out = {"segments": segments}
    out_path = f"transcripts/{name}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f)
    print(f"{name} done in {time.time() - t0:.0f}s, {len(segments)} segments -> {out_path}")
