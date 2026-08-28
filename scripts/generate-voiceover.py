"""Generate one ElevenLabs v3 MP3 per script paragraph.

Usage:
    python scripts/generate-voiceover.py <script.md> <output-dir> [label]

Each blank-line-separated paragraph becomes its own request, as required by the
v3 delivery spec (tags flatten when a whole script is sent in one call).
"""

import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

MODEL_ID = "eleven_v3"
STABILITY = 0.0  # "Creative" end of the v3 slider
SIMILARITY = 0.8
PRIMARY_FORMAT = "mp3_44100_192"
FALLBACK_FORMAT = "mp3_44100_128"
MAX_CHARS = 2000

REPO = pathlib.Path(__file__).resolve().parent.parent


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (REPO / ".env.local").read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def paragraphs(md_path: pathlib.Path) -> list[str]:
    text = md_path.read_text(encoding="utf-8-sig")
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text)]
    return [b for b in blocks if b]


def synthesize(text: str, key: str, voice: str, fmt: str) -> bytes:
    payload = json.dumps(
        {
            "text": text,
            "model_id": MODEL_ID,
            "voice_settings": {
                "stability": STABILITY,
                "similarity_boost": SIMILARITY,
            },
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format={fmt}",
        data=payload,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.read()


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    script_path = pathlib.Path(sys.argv[1])
    if not script_path.is_absolute():
        script_path = REPO / script_path
    out_dir = pathlib.Path(sys.argv[2])
    label = sys.argv[3] if len(sys.argv) > 3 else script_path.stem

    env = load_env()
    key = env.get("ELEVENLABS_API_KEY")
    voice = env.get("ELEVENLABS_VOICE_ID")
    if not key or not voice:
        print("ERROR: ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID missing from .env.local")
        return 1

    blocks = paragraphs(script_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"{len(blocks)} paragraphs -> {out_dir}")

    fmt = PRIMARY_FORMAT
    failures: list[int] = []

    for index, block in enumerate(blocks, start=1):
        if len(block) > MAX_CHARS:
            print(f"  [{index:02d}] WARNING {len(block)} chars exceeds {MAX_CHARS}")

        target = out_dir / f"{label} - {index:02d}.mp3"
        for attempt in (1, 2, 3):
            try:
                audio = synthesize(block, key, voice, fmt)
                target.write_bytes(audio)
                print(f"  [{index:02d}] {len(block):>5} chars -> {target.name} ({len(audio) // 1024} KB)")
                break
            except urllib.error.HTTPError as err:
                body = err.read().decode("utf-8", errors="replace")[:300]
                if err.code in (401, 403) and fmt != FALLBACK_FORMAT:
                    print(f"  [{index:02d}] {fmt} rejected; falling back to {FALLBACK_FORMAT}")
                    fmt = FALLBACK_FORMAT
                    continue
                print(f"  [{index:02d}] HTTP {err.code} attempt {attempt}: {body}")
                if attempt == 3:
                    failures.append(index)
                else:
                    time.sleep(4 * attempt)
            except Exception as err:  # noqa: BLE001 - report and retry
                print(f"  [{index:02d}] {type(err).__name__} attempt {attempt}: {err}")
                if attempt == 3:
                    failures.append(index)
                else:
                    time.sleep(4 * attempt)

    print(f"\nDone. {len(blocks) - len(failures)}/{len(blocks)} generated at {fmt}.")
    if failures:
        print("Failed paragraphs:", ", ".join(f"{i:02d}" for i in failures))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
