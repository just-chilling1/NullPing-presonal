const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ffmpeg = require("ffmpeg-static");
const audioRoot = path.join(
  __dirname,
  "..",
  "nullping-cash",
  "Audio"
);

function listParts(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".mp3"));
  return files
    .map((f) => {
      const m = f.match(/part\s*(\d+)/i);
      return { n: m ? parseInt(m[1], 10) : 999, file: f };
    })
    .sort((a, b) => a.n - b.n)
    .map((x) => path.join(dir, x.file));
}

function concat(parts, outPath) {
  const listFile = outPath + ".txt";
  const content = parts.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n");
  fs.writeFileSync(listFile, content);
  execFileSync(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath], {
    stdio: "inherit",
  });
  fs.unlinkSync(listFile);
  console.log(`Wrote ${outPath} (${parts.length} parts)`);
}

const v1Dir = path.join(audioRoot, "Video 1");
const v2Dir = path.join(audioRoot, "Video 2");
const outDir = path.join(__dirname, "audio");

fs.mkdirSync(outDir, { recursive: true });
concat(listParts(v1Dir), path.join(outDir, "1.mp3"));
concat(listParts(v2Dir), path.join(outDir, "2.mp3"));
