#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const appRoot = path.join(repoRoot, "app");
const cacheDir = path.join(appRoot, ".asr-cache");
const venvDir = path.join(cacheDir, ".venv");

const videoId = valueFor("--video") || valueFor("--videoId") || "RJrjzCuCHpo";
const language = valueFor("--lang") || "nl";
const durationSec = Number(valueFor("--duration") || "90");
const refresh = hasFlag("--refresh");
const fullAudio = hasFlag("--full");
const skipInstall = hasFlag("--skip-install");
const engine = valueFor("--engine") || process.env.ASR_ENGINE || "faster-whisper";
const engineConfig = getEngineConfig(engine);
const modelName = valueFor("--model") || process.env.ASR_MODEL || engineConfig.defaultModel;
const device = valueFor("--device") || process.env.ASR_DEVICE || "cpu";
const computeType = valueFor("--compute-type") || process.env.ASR_COMPUTE_TYPE || engineConfig.defaultComputeType;
const ytDlpPath = process.env.YT_DLP_PATH || findExecutable([
  "/opt/homebrew/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
  path.join(appRoot, "yt-dlp"),
]);

if (!ytDlpPath) {
  console.error("yt-dlp not found. Set YT_DLP_PATH or install yt-dlp.");
  process.exit(1);
}

ensureDir(cacheDir);

const runDir = path.join(cacheDir, `${videoId}-${language}-${fullAudio ? "full" : `${durationSec}s`}`);
ensureDir(runDir);

const audioPath = path.join(runDir, "audio.wav");
const asrOutputPrefix = `${engineConfig.filePrefix}-${slugify(modelName)}`;
const asrJsonPath = path.join(runDir, `${asrOutputPrefix}-words.json`);
const manualJsonPath = path.join(runDir, "manual-captions.json");
const reportPath = path.join(runDir, `${asrOutputPrefix}-alignment-report.md`);

console.log(`[local-asr] fixture=${videoId} lang=${language} duration=${fullAudio ? "full" : `${durationSec}s`} engine=${engineConfig.name}`);

if (!fs.existsSync(audioPath) || refresh) {
  downloadAudio(audioPath);
} else {
  console.log(`[local-asr] Reusing ${audioPath}`);
}

if (!fs.existsSync(manualJsonPath) || refresh) {
  const manual = fetchManualCaptions();
  fs.writeFileSync(manualJsonPath, JSON.stringify(manual, null, 2), "utf8");
} else {
  console.log(`[local-asr] Reusing ${manualJsonPath}`);
}

ensureEngine();

if (!fs.existsSync(asrJsonPath) || refresh) {
  transcribeAudio();
} else {
  console.log(`[local-asr] Reusing ${asrJsonPath}`);
}

const manualPayload = JSON.parse(fs.readFileSync(manualJsonPath, "utf8"));
const asrPayload = JSON.parse(fs.readFileSync(asrJsonPath, "utf8"));
const report = buildAlignmentReport(manualPayload, asrPayload);
fs.writeFileSync(reportPath, renderReport(report), "utf8");

console.log(renderSummary(report));
console.log(`[local-asr] Wrote ${reportPath}`);

function hasFlag(name) {
  return process.argv.includes(name);
}

function valueFor(name) {
  const args = process.argv.slice(2);
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1] || "";
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : "";
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findExecutable(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function getEngineConfig(name) {
  if (name === "faster-whisper") {
    return {
      name,
      filePrefix: "faster-whisper",
      importCheck: "import faster_whisper",
      installPackage: "faster-whisper",
      transcriberPath: path.join(appRoot, "scripts", "transcribe-faster-whisper.py"),
      defaultModel: "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
      defaultComputeType: "int8",
    };
  }

  if (name === "stable-ts") {
    return {
      name,
      filePrefix: "stable-ts",
      importCheck: "import stable_whisper",
      installPackage: "stable-ts",
      transcriberPath: path.join(appRoot, "scripts", "transcribe-stable-ts.py"),
      defaultModel: "base",
      defaultComputeType: "dq",
    };
  }

  throw new Error(`Unsupported ASR engine: ${name}`);
}

function downloadAudio(outputPath) {
  console.log(`[local-asr] Downloading audio to ${outputPath}`);
  const outputTemplate = path.join(runDir, "audio.%(ext)s");
  const args = [
    "-f",
    "ba[ext=m4a]/ba",
    "--extract-audio",
    "--audio-format",
    "wav",
    "--audio-quality",
    "0",
    "-o",
    outputTemplate,
  ];

  if (!fullAudio) {
    args.push("--download-sections", `*00:00:00-${formatDuration(durationSec)}`);
  }

  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  execFileSync(ytDlpPath, args, {
    stdio: "inherit",
    maxBuffer: 100 * 1024 * 1024,
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Expected audio file was not created: ${outputPath}`);
  }
}

function formatDuration(seconds) {
  const total = Math.max(1, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `00:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function fetchManualCaptions() {
  console.log("[local-asr] Fetching manual captions with yt-dlp metadata");
  const infoText = execFileSync(ytDlpPath, [
    "--skip-download",
    "--dump-single-json",
    `https://www.youtube.com/watch?v=${videoId}`,
  ], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const info = JSON.parse(infoText);
  const sourceMap = info.subtitles || {};
  const trackKey = chooseTrackKey(sourceMap, language);
  if (!trackKey) {
    throw new Error(`No manual subtitle track found for ${language}`);
  }

  const track = sourceMap[trackKey] || [];
  const vtt = track.find((item) => item.ext === "vtt" && item.url && item.protocol !== "m3u8_native") ||
    track.find((item) => item.ext === "vtt" && item.url);
  if (!vtt?.url) {
    throw new Error(`No VTT manual subtitle URL found for ${trackKey}`);
  }

  const raw = fetchText(vtt.url);
  const cues = parseVttCues(raw)
    .filter((cue) => fullAudio || cue.start < durationSec)
    .map((cue) => ({
      ...cue,
      end: fullAudio ? cue.end : Math.min(cue.end, durationSec),
    }))
    .filter((cue) => cue.end > cue.start);

  return {
    videoId,
    language,
    trackKey,
    title: info.title || "",
    durationSec: info.duration || null,
    cues,
  };
}

function chooseTrackKey(sourceMap, lang) {
  const keys = Object.keys(sourceMap || {});
  return keys.find((key) => key === lang) ||
    keys.find((key) => key.startsWith(`${lang}-`)) ||
    "";
}

function fetchText(url) {
  return execFileSync(process.execPath, [
    "-e",
    "fetch(process.argv[1]).then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); process.stdout.write(await r.text()); }).catch(e => { console.error(e.message); process.exit(1); })",
    url,
  ], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseVttCues(raw) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timestampIndex = lines.findIndex((line) => line.includes("-->"));
    if (timestampIndex < 0) continue;
    const match = lines[timestampIndex].match(/(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})/);
    if (!match) continue;
    const start = toSeconds(match[1], match[2], match[3]);
    const end = toSeconds(match[4], match[5], match[6]);
    const text = cleanText(lines.slice(timestampIndex + 1).join(" "));
    if (text && end > start) cues.push({ id: cues.length, start, end, text });
  }
  return cues;
}

function toSeconds(hours, minutes, seconds) {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureEngine() {
  const python = path.join(venvDir, "bin", "python");
  if (!fs.existsSync(python)) {
    console.log(`[local-asr] Creating Python environment at ${venvDir}`);
    execFileSync("python3", ["-m", "venv", venvDir], { stdio: "inherit" });
  }

  const check = spawnSync(python, ["-c", engineConfig.importCheck], { stdio: "ignore" });
  if (check.status === 0) return;

  if (skipInstall) {
    throw new Error(`${engineConfig.installPackage} is not installed in ${venvDir}`);
  }

  console.log(`[local-asr] Installing ${engineConfig.installPackage} into the local ASR environment`);
  execFileSync(python, ["-m", "pip", "install", "--upgrade", "pip"], { stdio: "inherit" });
  execFileSync(python, ["-m", "pip", "install", engineConfig.installPackage], { stdio: "inherit" });
}

function transcribeAudio() {
  console.log(`[local-asr] Transcribing with ${engineConfig.name}:${modelName}`);
  const python = path.join(venvDir, "bin", "python");
  execFileSync(python, [
    engineConfig.transcriberPath,
    "--audio",
    audioPath,
    "--output",
    asrJsonPath,
    "--language",
    language,
    "--model",
    modelName,
    "--device",
    device,
    "--compute-type",
    computeType,
  ], {
    stdio: "inherit",
    maxBuffer: 100 * 1024 * 1024,
  });
}

function buildAlignmentReport(manualPayload, asrPayload) {
  const manualTokens = tokenizeManualCues(manualPayload.cues || []);
  const asrTokens = tokenizeAsrWords(asrPayload.words || []);
  const matches = alignTokens(manualTokens, asrTokens);
  const matchedManual = new Set(matches.map((match) => match.manualIndex));
  const matchedAsr = new Set(matches.map((match) => match.asrIndex));
  const projected = projectManualTimings(manualTokens, asrTokens, matches);
  const zeroLengthWords = asrTokens.filter((token) => token.end <= token.start);
  const oddDurationWords = asrTokens.filter((token) => token.end - token.start > 1.2 || token.end <= token.start);

  return {
    generatedAt: new Date().toISOString(),
    videoId,
    language,
    durationSec: fullAudio ? manualPayload.durationSec : durationSec,
    fullAudio,
    engine: asrPayload.engine || engineConfig.name,
    model: asrPayload.model,
    device: asrPayload.device,
    computeType: asrPayload.computeType,
    manualTrackKey: manualPayload.trackKey,
    title: manualPayload.title,
    manualCueCount: manualPayload.cues?.length || 0,
    manualTokenCount: manualTokens.length,
    asrSegmentCount: asrPayload.segments?.length || 0,
    asrWordCount: asrTokens.length,
    matchedTokenCount: matches.length,
    manualCoverage: ratio(matches.length, manualTokens.length),
    asrCoverage: ratio(matches.length, asrTokens.length),
    zeroLengthWordCount: zeroLengthWords.length,
    oddDurationWordCount: oddDurationWords.length,
    projectedCueCount: projected.length,
    projectedExactCueCount: projected.filter((cue) => cue.timingEvidence === "asr-word-alignment").length,
    lowConfidenceCueCount: projected.filter((cue) => cue.timingEvidence !== "asr-word-alignment").length,
    examples: sampleAlignmentExamples(manualTokens, asrTokens, matches),
    projectedSamples: projected.slice(0, 10),
    unmatchedManualSamples: manualTokens
      .filter((token) => !matchedManual.has(token.index))
      .slice(0, 20)
      .map((token) => token.raw),
    unmatchedAsrSamples: asrTokens
      .filter((token) => !matchedAsr.has(token.index))
      .slice(0, 20)
      .map((token) => token.raw),
  };
}

function tokenizeManualCues(cues) {
  const tokens = [];
  for (const cue of cues) {
    const parts = splitWords(cue.text);
    for (let i = 0; i < parts.length; i += 1) {
      const normalized = normalizeToken(parts[i]);
      if (!keepToken(normalized)) continue;
      tokens.push({
        index: tokens.length,
        cueId: cue.id,
        cueStart: cue.start,
        cueEnd: cue.end,
        raw: parts[i],
        normalized,
      });
    }
  }
  return tokens;
}

function tokenizeAsrWords(words) {
  return words.flatMap((word) => {
    const parts = splitWords(word.word || word.text || "");
    return parts.map((part) => ({
      start: Number(word.start),
      end: Number(word.end),
      raw: part,
      normalized: normalizeToken(part),
    }));
  }).filter((token) => keepToken(token.normalized) && Number.isFinite(token.start) && Number.isFinite(token.end))
    .map((token, index) => ({ ...token, index }));
}

function splitWords(text) {
  return String(text || "").match(/[\p{L}\p{N}'’-]+/gu) || [];
}

function normalizeToken(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function keepToken(token) {
  return token.length > 1 && !/^\d+$/.test(token);
}

function alignTokens(manualTokens, asrTokens) {
  const rows = manualTokens.length + 1;
  const cols = asrTokens.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint16Array(cols));

  for (let i = manualTokens.length - 1; i >= 0; i -= 1) {
    for (let j = asrTokens.length - 1; j >= 0; j -= 1) {
      if (manualTokens[i].normalized === asrTokens[j].normalized) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const matches = [];
  let i = 0;
  let j = 0;
  while (i < manualTokens.length && j < asrTokens.length) {
    if (manualTokens[i].normalized === asrTokens[j].normalized) {
      matches.push({ manualIndex: i, asrIndex: j });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return matches;
}

function projectManualTimings(manualTokens, asrTokens, matches) {
  const asrByManual = new Map(matches.map((match) => [
    match.manualIndex,
    { ...asrTokens[match.asrIndex], asrIndex: match.asrIndex },
  ]));
  const byCue = new Map();
  for (const token of manualTokens) {
    if (!byCue.has(token.cueId)) byCue.set(token.cueId, []);
    byCue.get(token.cueId).push(token);
  }

  const projected = [];
  for (const [cueId, tokens] of byCue.entries()) {
    const alignedWords = tokens.map((token) => asrByManual.get(token.index)).filter(Boolean);
    const coverage = ratio(alignedWords.length, tokens.length);
    const first = alignedWords[0];
    const last = alignedWords[alignedWords.length - 1];
    const cueDuration = tokens[tokens.length - 1].cueEnd - tokens[0].cueStart;
    const asrSpanSec = first && last ? last.end - first.start : 0;
    const asrSpanTokenCount = first && last ? last.asrIndex - first.asrIndex + 1 : 0;
    const localAsrDensity = ratio(alignedWords.length, asrSpanTokenCount);
    const spanIsPlausible = asrSpanSec <= Math.max(cueDuration * 3, cueDuration + 3);
    const timingEvidence = coverage >= 0.72 && localAsrDensity >= 0.55 && spanIsPlausible && first && last
      ? "asr-word-alignment"
      : "manual-cue-fallback";
    projected.push({
      cueId,
      text: tokens.map((token) => token.raw).join(" "),
      coverage,
      localAsrDensity,
      asrSpanSec,
      timingEvidence,
      startSec: timingEvidence === "asr-word-alignment" ? first.start : tokens[0].cueStart,
      endSec: timingEvidence === "asr-word-alignment" ? last.end : tokens[tokens.length - 1].cueEnd,
    });
  }
  return projected;
}

function sampleAlignmentExamples(manualTokens, asrTokens, matches) {
  return matches.slice(0, 20).map((match) => ({
    manual: manualTokens[match.manualIndex].raw,
    asr: asrTokens[match.asrIndex].raw,
    asrStart: asrTokens[match.asrIndex].start,
    asrEnd: asrTokens[match.asrIndex].end,
  }));
}

function ratio(count, total) {
  return total > 0 ? Number((count / total).toFixed(3)) : 0;
}

function renderSummary(report) {
  return [
    `[local-asr] manual coverage: ${report.manualCoverage}`,
    `[local-asr] ASR coverage: ${report.asrCoverage}`,
    `[local-asr] matched tokens: ${report.matchedTokenCount}/${report.manualTokenCount} manual, ${report.asrWordCount} ASR words`,
    `[local-asr] projected cues: ${report.projectedExactCueCount} ASR-aligned, ${report.lowConfidenceCueCount} fallback`,
  ].join("\n");
}

function renderReport(report) {
  const lines = [];
  lines.push("# Local ASR Alignment Smoke Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`- Video: \`${report.videoId}\``);
  lines.push(`- Title: ${report.title || "-"}`);
  lines.push(`- Language: \`${report.language}\``);
  lines.push(`- Duration window: ${report.fullAudio ? "full audio" : `${report.durationSec}s`}`);
  lines.push(`- Manual track: \`${report.manualTrackKey}\``);
  lines.push(`- ASR engine: \`${report.engine}\``);
  lines.push(`- ASR model: \`${report.model}\``);
  lines.push(`- Device: \`${report.device}\`, compute type: \`${report.computeType}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Manual cues: ${report.manualCueCount}`);
  lines.push(`- Manual tokens: ${report.manualTokenCount}`);
  lines.push(`- ASR segments: ${report.asrSegmentCount}`);
  lines.push(`- ASR words: ${report.asrWordCount}`);
  lines.push(`- Matched tokens: ${report.matchedTokenCount}`);
  lines.push(`- Manual coverage: ${report.manualCoverage}`);
  lines.push(`- ASR coverage: ${report.asrCoverage}`);
  lines.push(`- Zero-length ASR words: ${report.zeroLengthWordCount}`);
  lines.push(`- Odd-duration ASR words: ${report.oddDurationWordCount}`);
  lines.push(`- Projected manual cues: ${report.projectedCueCount}`);
  lines.push(`- ASR-aligned projected cues: ${report.projectedExactCueCount}`);
  lines.push(`- Fallback projected cues: ${report.lowConfidenceCueCount}`);
  lines.push("");
  lines.push("## First Matches");
  lines.push("");
  lines.push("| Manual | ASR | ASR start | ASR end |");
  lines.push("| --- | --- | ---: | ---: |");
  for (const example of report.examples) {
    lines.push(`| ${escapeCell(example.manual)} | ${escapeCell(example.asr)} | ${example.asrStart.toFixed(2)} | ${example.asrEnd.toFixed(2)} |`);
  }
  lines.push("");
  lines.push("## Projected Cue Samples");
  lines.push("");
  lines.push("| Cue | Evidence | Coverage | Density | ASR span | Start | End | Text |");
  lines.push("| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const cue of report.projectedSamples) {
    lines.push(`| ${cue.cueId} | ${cue.timingEvidence} | ${cue.coverage} | ${cue.localAsrDensity} | ${cue.asrSpanSec.toFixed(2)} | ${cue.startSec.toFixed(2)} | ${cue.endSec.toFixed(2)} | ${escapeCell(cue.text)} |`);
  }
  lines.push("");
  lines.push("## Unmatched Samples");
  lines.push("");
  lines.push(`Manual: ${report.unmatchedManualSamples.map((item) => `\`${item}\``).join(", ") || "-"}`);
  lines.push("");
  lines.push(`ASR: ${report.unmatchedAsrSamples.map((item) => `\`${item}\``).join(", ") || "-"}`);
  lines.push("");
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}
