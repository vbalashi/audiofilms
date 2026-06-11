#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const appRoot = path.join(repoRoot, "app");
const cacheDir = path.join(appRoot, ".subtitle-source-shootout-cache");
const maxWordDurationSec = 1.2;

const fixtures = [
  {
    id: "RJrjzCuCHpo",
    label: "manual-asr-divergence",
    language: "nl",
    note: "Manual Dutch has a long cue; ASR Dutch exposes rolling VTT.",
  },
  {
    id: "4EE7m94mJpk",
    label: "normal-manual",
    language: "nl",
    note: "Normal manual Dutch extension fixture.",
  },
  {
    id: "xymyDvCgWDA",
    label: "auto-only",
    language: "nl",
    note: "Dutch auto-caption-only fixture.",
  },
  {
    id: "EColTNIbOko",
    label: "no-captions",
    language: "nl",
    note: "No-caption empty-state fixture.",
  },
  {
    id: "KrdVIUmBoE4",
    label: "provider-fallback-stress",
    language: "nl",
    note: "Provider/geography fallback stress fixture.",
  },
  {
    id: "aircAruvnKk",
    label: "multilingual-manual",
    language: "en",
    note: "Many manual languages; English should be selectable.",
  },
];

const args = new Set(process.argv.slice(2));
const includeSupadata = args.has("--include-supadata");
const refresh = args.has("--refresh");
const fixtureFilter = valueFor("--only");
const ytDlpPath = process.env.YT_DLP_PATH || findExecutable(["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"]);

if (!ytDlpPath) {
  console.error("yt-dlp not found. Set YT_DLP_PATH or install yt-dlp.");
  process.exit(1);
}

ensureDir(cacheDir);

const selectedFixtures = fixtures.filter((fixture) => !fixtureFilter || fixture.id === fixtureFilter || fixture.label === fixtureFilter);
if (!selectedFixtures.length) {
  console.error(`No fixture matched ${fixtureFilter}`);
  process.exit(1);
}

const report = {
  generatedAt: new Date().toISOString(),
  includeSupadata,
  ytDlpPath,
  fixtures: [],
};

for (const fixture of selectedFixtures) {
  const row = {
    ...fixture,
    sources: [],
  };

  const videoInfo = readOrComputeJson(`yt-dlp-info-${fixture.id}`, () => getYtDlpInfo(fixture.id));
  row.title = videoInfo.title || "";
  row.durationSec = videoInfo.duration || null;
  row.available = summarizeAvailableTracks(videoInfo, fixture.language);

  row.sources.push(await inspectYtDlpSource(fixture, videoInfo, "manual"));
  row.sources.push(await inspectYtDlpSource(fixture, videoInfo, "auto"));

  if (includeSupadata) {
    row.sources.push(await inspectBackendApiSource(fixture, "manual"));
    row.sources.push(await inspectBackendApiSource(fixture, "auto"));
  }

  row.recommendation = recommendFixtureSource(row);
  row.alignment = analyzeAlignmentFeasibility(row);
  report.fixtures.push(row);
}

const markdown = renderMarkdown(report);
const outputPath = path.join(repoRoot, "docs/exec-plans/active/subtitle-source-quality-shootout-report.md");
fs.writeFileSync(outputPath, markdown, "utf8");

console.log(markdown);
console.log(`\nWrote ${outputPath}`);

function valueFor(name) {
  const arg = process.argv.slice(2).find((item) => item === name || item.startsWith(`${name}=`));
  if (!arg) return "";
  if (arg === name) {
    const index = process.argv.indexOf(name);
    return process.argv[index + 1] || "";
  }
  return arg.slice(name.length + 1);
}

function findExecutable(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cachePath(key) {
  const digest = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
  return path.join(cacheDir, `${digest}.json`);
}

function readOrComputeJson(key, compute) {
  const file = cachePath(key);
  if (!refresh && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  const value = compute();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function getYtDlpInfo(videoId) {
  const stdout = execFileSync(ytDlpPath, [
    "--skip-download",
    "--dump-single-json",
    `https://www.youtube.com/watch?v=${videoId}`,
  ], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function summarizeAvailableTracks(info, language) {
  const subtitles = Object.keys(info.subtitles || {}).filter((lang) => lang === language || lang.startsWith(`${language}-`));
  const automatic = Object.keys(info.automatic_captions || {}).filter((lang) => lang === language || lang.startsWith(`${language}-`));
  return { subtitles, automatic };
}

async function inspectYtDlpSource(fixture, videoInfo, sourceKind) {
  const sourceMap = sourceKind === "manual" ? videoInfo.subtitles || {} : videoInfo.automatic_captions || {};
  const trackKey = chooseTrackKey(sourceMap, fixture.language, sourceKind);
  if (!trackKey) {
    return emptySource(`yt-dlp-${sourceKind}`, sourceKind, "not-found", "No matching track key");
  }

  const formats = sourceMap[trackKey] || [];
  const vtt = formats.find((item) => item.ext === "vtt" && item.url && item.protocol !== "m3u8_native") ||
    formats.find((item) => item.ext === "vtt" && item.url);
  if (!vtt?.url) {
    return emptySource(`yt-dlp-${sourceKind}`, sourceKind, "not-found", `No VTT URL for ${trackKey}`);
  }

  try {
    const raw = readOrComputeText(`yt-dlp-vtt-${fixture.id}-${sourceKind}-${trackKey}`, () => fetchText(vtt.url));
    const cues = parseVttCues(raw);
    const normalized = sourceKind === "auto" ? normalizeRollingCues(cues) : cues;
    return {
      source: `yt-dlp-${sourceKind}`,
      provider: "yt-dlp",
      sourceKind,
      trackKey,
      status: "ok",
      rawCueCount: cues.length,
      normalizedCueCount: normalized.length,
      quality: analyzeCueQuality(normalized),
      normalizedCues: normalized,
      sample: normalized.slice(0, 5).map(compactCue),
      rawSample: cues.slice(0, 5).map(compactCue),
    };
  } catch (error) {
    return emptySource(`yt-dlp-${sourceKind}`, sourceKind, "failed", error instanceof Error ? error.message : String(error));
  }
}

function readOrComputeText(key, compute) {
  const file = cachePath(`${key}:text`);
  if (!refresh && fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8");
  }
  const value = compute();
  fs.writeFileSync(file, value, "utf8");
  return value;
}

function fetchText(url) {
  const response = execFileSync(process.execPath, [
    "-e",
    "fetch(process.argv[1]).then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); process.stdout.write(await r.text()); }).catch(e => { console.error(e.message); process.exit(1); })",
    url,
  ], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return response;
}

function chooseTrackKey(sourceMap, language, sourceKind) {
  const keys = Object.keys(sourceMap || {});
  if (sourceKind === "auto") {
    return keys.find((key) => key === `${language}-orig`) ||
      keys.find((key) => key === language) ||
      keys.find((key) => key.startsWith(`${language}-`)) ||
      "";
  }
  return keys.find((key) => key === language) ||
    keys.find((key) => key.startsWith(`${language}-`)) ||
    "";
}

async function inspectBackendApiSource(fixture, sourceKind) {
  const url = `http://localhost:3000/api/get-subs?videoId=${encodeURIComponent(fixture.id)}&lang=${encodeURIComponent(fixture.language)}&sourceKind=${sourceKind}`;
  try {
    const payload = readOrComputeJson(`backend-${fixture.id}-${fixture.language}-${sourceKind}`, () => {
      const stdout = execFileSync(process.execPath, [
        "-e",
        "fetch(process.argv[1]).then(async r => { const t = await r.text(); if (!r.ok) throw new Error(`HTTP ${r.status} ${t}`); process.stdout.write(t); }).catch(e => { console.error(e.message); process.exit(1); })",
        url,
      ], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    });
    const cues = (payload.phrases || []).map((phrase) => ({
      start: Number(phrase.startSec),
      end: Number(phrase.endSec),
      text: cleanText(phrase.text || ""),
    })).filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start && cue.text);
    return {
      source: `backend-${sourceKind}`,
      provider: payload.meta?.provider || "backend",
      sourceKind: payload.meta?.sourceKind || sourceKind,
      trackKey: payload.language || fixture.language,
      status: "ok",
      rawCueCount: cues.length,
      normalizedCueCount: cues.length,
      quality: analyzeCueQuality(cues),
      normalizedCues: cues,
      sample: cues.slice(0, 5).map(compactCue),
      meta: payload.meta || null,
    };
  } catch (error) {
    return emptySource(`backend-${sourceKind}`, sourceKind, "failed", error instanceof Error ? error.message : String(error));
  }
}

function emptySource(source, sourceKind, status, error) {
  return {
    source,
    provider: source.startsWith("yt-dlp") ? "yt-dlp" : source.split("-")[0],
    sourceKind,
    status,
    error,
    rawCueCount: 0,
    normalizedCueCount: 0,
    quality: analyzeCueQuality([]),
    sample: [],
  };
}

function parseVttCues(raw) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timestampIndex = lines.findIndex((line) => line.includes("-->"));
    if (timestampIndex < 0) continue;
    const timestamp = lines[timestampIndex];
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})/);
    if (!match) continue;
    const start = toSeconds(match[1], match[2], match[3]);
    const end = toSeconds(match[4], match[5], match[6]);
    const body = lines.slice(timestampIndex + 1).join(" ");
    const text = cleanText(body);
    const wordTimings = parseInlineWordTimings(body, start, end);
    if (text) {
      cues.push({ start, end, text, wordTimings });
    }
  }
  return cues;
}

function toSeconds(hours, minutes, seconds) {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function parseInlineWordTimings(body, cueStart, cueEnd) {
  const tokens = [];
  const regex = /<(?:(\d{2}):)?(\d{2}):(\d{2}\.\d{3})>|<c>|<\/c>|([^<\s]+)/g;
  let currentTime = cueStart;
  let match;
  while ((match = regex.exec(body))) {
    if (match[2] && match[3]) {
      currentTime = match[1]
        ? toSeconds(match[1], match[2], match[3])
        : Number(match[2]) * 60 + Number(match[3]);
      continue;
    }
    if (match[4]) {
      tokens.push({
        start: currentTime,
        end: cueEnd,
        text: cleanText(match[4]),
      });
    }
  }
  for (let index = 0; index < tokens.length; index += 1) {
    tokens[index].end = tokens[index + 1]?.start || cueEnd;
  }
  return tokens.filter((token) => token.text && token.end > token.start);
}

function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRollingCues(cues) {
  const words = [];
  let previousDisplayTokens = [];
  for (const cue of cues) {
    const displayTokens = tokenizeDisplayText(cue.text);
    if (!displayTokens.length) continue;

    const overlap = suffixPrefixOverlap(previousDisplayTokens, displayTokens);
    const newDisplayTokens = displayTokens.slice(overlap);
    const timings = cue.wordTimings?.length ? cue.wordTimings : approximateWordTimings(cue, displayTokens);

    for (let index = overlap; index < displayTokens.length; index += 1) {
      const displayToken = displayTokens[index];
      const timing = timings[index] || timings[timings.length - 1];
      if (!timing) continue;
      const normalized = normalizeToken(displayToken);
      if (normalized) {
        const boundedTiming = boundWordTiming(timing);
        words.push({
          start: boundedTiming.start,
          end: boundedTiming.end,
          text: displayToken,
          normalized,
        });
      }
    }
    if (newDisplayTokens.length) {
      previousDisplayTokens = displayTokens;
    }
  }

  if (!words.length) {
    return dedupeRollingCueText(cues);
  }

  return dropConsecutiveDuplicatePhrases(makeNonOverlapping(buildPhrasesFromWords(words)));
}

function tokenizeDisplayText(text) {
  return cleanText(text).split(/\s+/).filter(Boolean);
}

function suffixPrefixOverlap(previousTokens, currentTokens) {
  const max = Math.min(previousTokens.length, currentTokens.length);
  for (let size = max; size > 0; size -= 1) {
    let matches = true;
    for (let index = 0; index < size; index += 1) {
      if (normalizeToken(previousTokens[previousTokens.length - size + index]) !== normalizeToken(currentTokens[index])) {
        matches = false;
        break;
      }
    }
    if (matches) return size;
  }
  return 0;
}

function approximateWordTimings(cue, tokens) {
  if (!tokens.length) return [];
  const duration = cue.end - cue.start;
  return tokens.map((token, index) => ({
    text: token,
    start: cue.start + (duration * index) / tokens.length,
    end: cue.start + (duration * (index + 1)) / tokens.length,
  }));
}

function normalizeToken(text) {
  return cleanText(text).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function boundWordTiming(timing) {
  const start = Number(timing.start);
  const end = Number(timing.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return timing;
  }
  return {
    ...timing,
    end: Math.min(end, start + maxWordDurationSec),
  };
}

function buildPhrasesFromWords(words) {
  const phrases = [];
  let current = null;
  for (const word of words) {
    if (!current) {
      current = { start: word.start, end: word.end, text: word.text };
      continue;
    }

    const candidateText = `${current.text} ${word.text}`.trim();
    const duration = word.end - current.start;
    const wordCount = candidateText.split(/\s+/).filter(Boolean).length;
    const pause = word.start - current.end;
    const endsSentence = /[.!?…]$/.test(current.text);
    const tooLong = duration > 6 || wordCount > 12 || candidateText.length > 90 || pause > 0.9;
    if (endsSentence || tooLong) {
      phrases.push(current);
      current = { start: word.start, end: word.end, text: word.text };
    } else {
      current.text = candidateText;
      current.end = word.end;
    }
  }
  if (current) phrases.push(current);
  return phrases.map((phrase) => ({ ...phrase, text: cleanText(phrase.text) })).filter((phrase) => phrase.text && phrase.end > phrase.start);
}

function dropConsecutiveDuplicatePhrases(cues) {
  const result = [];
  for (const cue of cues) {
    const previous = result[result.length - 1];
    if (previous && normalizePhrase(previous.text) === normalizePhrase(cue.text)) {
      previous.end = Math.max(previous.end, cue.end);
      continue;
    }
    result.push(cue);
  }
  return result;
}

function normalizePhrase(text) {
  return tokenizeDisplayText(text).map(normalizeToken).filter(Boolean).join(" ");
}

function makeNonOverlapping(cues) {
  const sorted = [...cues].sort((a, b) => a.start - b.start || a.end - b.end);
  const result = [];
  for (const cue of sorted) {
    const previous = result[result.length - 1];
    const next = { ...cue };
    if (previous && next.start < previous.end) {
      next.start = previous.end;
    }
    if (next.end <= next.start) {
      continue;
    }
    result.push(next);
  }
  return result;
}

function dedupeRollingCueText(cues) {
  const normalized = [];
  let previous = "";
  for (const cue of cues) {
    const text = removeRepeatedPrefix(previous, cue.text);
    if (text) {
      normalized.push({ ...cue, text });
      previous = cue.text;
    }
  }
  return normalized;
}

function removeRepeatedPrefix(previous, current) {
  if (!previous) return current;
  if (current.startsWith(previous)) return current.slice(previous.length).trim();
  return current;
}

function analyzeCueQuality(cues) {
  if (!cues.length) {
    return {
      longCueCount: 0,
      overlapCount: 0,
      duplicateTextCount: 0,
      maxDurationSec: 0,
      avgDurationSec: 0,
      flags: ["empty"],
    };
  }
  let longCueCount = 0;
  let overlapCount = 0;
  let duplicateTextCount = 0;
  let totalDuration = 0;
  let maxDurationSec = 0;
  let longestCue = null;
  const seen = new Set();
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const duration = cue.end - cue.start;
    totalDuration += duration;
    if (duration > maxDurationSec) {
      maxDurationSec = duration;
      longestCue = cue;
    }
    if (duration > 12) longCueCount += 1;
    if (index > 0 && cue.start < cues[index - 1].end - 0.02) overlapCount += 1;
    const normalized = cue.text.toLowerCase();
    if (seen.has(normalized)) duplicateTextCount += 1;
    seen.add(normalized);
  }
  const flags = [];
  if (longCueCount) flags.push("long-cues");
  if (overlapCount) flags.push("overlap-cues");
  if (duplicateTextCount) flags.push("duplicate-text");
  if (maxDurationSec <= 6 && !overlapCount) flags.push("phrase-sized");
  return {
    longCueCount,
    overlapCount,
    duplicateTextCount,
    maxDurationSec: round(maxDurationSec),
    avgDurationSec: round(totalDuration / cues.length),
    longestCue: longestCue ? compactCue(longestCue) : null,
    flags,
  };
}

function recommendFixtureSource(fixture) {
  const okSources = fixture.sources.filter((source) => source.status === "ok" && source.normalizedCueCount > 0);
  if (!okSources.length) {
    return {
      source: "none",
      confidence: "high",
      reason: "No usable caption source was found. The UI should show the no-captions state and avoid paid retries during normal playback.",
    };
  }

  const manual = bestSource(okSources.filter((source) => source.sourceKind === "manual"));
  const auto = bestSource(okSources.filter((source) => source.sourceKind === "auto"));

  if (manual && isGoodShadowingSource(manual)) {
    return {
      source: manual.source,
      confidence: "high",
      reason: "Manual captions are available and already phrase-sized enough for shadowing.",
    };
  }

  if (auto && isGoodShadowingSource(auto)) {
    return {
      source: auto.source,
      confidence: manual ? "medium" : "high",
      reason: manual
        ? "Manual captions exist, but automatic captions currently provide better phrase timing after rolling-caption normalization."
        : "No manual captions are available, and automatic captions normalize into usable phrase-sized cues.",
    };
  }

  if (manual && auto && scoreSource(auto) > scoreSource(manual)) {
    return {
      source: auto.source,
      confidence: "low",
      reason: "Automatic captions look more usable than manual captions, but remaining long/duplicate artifacts require a dedicated rolling-caption cleanup pass.",
    };
  }

  if (manual) {
    return {
      source: manual.source,
      confidence: "low",
      reason: "Manual captions are the best available source, but they need degraded long-cue splitting or a clean-text/ASR-timing experiment before product use.",
    };
  }

  return {
    source: auto?.source || okSources[0].source,
    confidence: "low",
    reason: "Only automatic captions are available, and normalization is not yet clean enough to treat this as a solved product path.",
  };
}

function analyzeAlignmentFeasibility(fixture) {
  const manual = bestSource(fixture.sources.filter((source) => source.status === "ok" && source.sourceKind === "manual" && source.normalizedCueCount > 0));
  const auto = bestSource(fixture.sources.filter((source) => source.status === "ok" && source.sourceKind === "auto" && source.normalizedCueCount > 0));
  if (!manual || !auto) {
    return {
      status: "not-applicable",
      confidence: "none",
      reason: "Clean-text/ASR-timing alignment needs both manual and automatic captions.",
    };
  }

  const manualTokens = tokenizeForAlignment(manual.normalizedCues || []);
  const autoTokens = tokenizeForAlignment(auto.normalizedCues || []);
  if (!manualTokens.length || !autoTokens.length) {
    return {
      status: "not-applicable",
      confidence: "none",
      reason: "One source has no usable text tokens after normalization.",
    };
  }

  const matchCount = countAlignedTokens(manualTokens, autoTokens);
  const manualCoverage = matchCount / manualTokens.length;
  const autoCoverage = matchCount / autoTokens.length;
  const balancedCoverage = Math.min(manualCoverage, autoCoverage);
  if (balancedCoverage >= 0.72) {
    return {
      status: "candidate",
      confidence: "high",
      manualTokens: manualTokens.length,
      autoTokens: autoTokens.length,
      manualCoverage: round(manualCoverage),
      autoCoverage: round(autoCoverage),
      reason: "Manual and ASR text are close enough for a lightweight token-alignment experiment.",
    };
  }
  if (balancedCoverage >= 0.5) {
    return {
      status: "candidate",
      confidence: "medium",
      manualTokens: manualTokens.length,
      autoTokens: autoTokens.length,
      manualCoverage: round(manualCoverage),
      autoCoverage: round(autoCoverage),
      reason: "Manual and ASR text partially match; alignment may work only after better normalization and local-window matching.",
    };
  }
  return {
    status: "poor-match",
    confidence: "low",
    manualTokens: manualTokens.length,
    autoTokens: autoTokens.length,
    manualCoverage: round(manualCoverage),
    autoCoverage: round(autoCoverage),
    reason: "Manual and ASR text diverge too much for a simple browser-side alignment pass.",
  };
}

function tokenizeForAlignment(cues) {
  return cues
    .flatMap((cue) => tokenizeDisplayText(cue.text))
    .map(normalizeToken)
    .filter((token) => token.length > 1 && !/^\d+$/.test(token));
}

function countAlignedTokens(leftTokens, rightTokens) {
  const previous = new Uint16Array(rightTokens.length + 1);
  const current = new Uint16Array(rightTokens.length + 1);
  for (let leftIndex = 1; leftIndex <= leftTokens.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= rightTokens.length; rightIndex += 1) {
      current[rightIndex] = leftTokens[leftIndex - 1] === rightTokens[rightIndex - 1]
        ? previous[rightIndex - 1] + 1
        : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }
    previous.set(current);
    current.fill(0);
  }
  return previous[rightTokens.length];
}

function bestSource(sources) {
  return [...sources].sort((a, b) => scoreSource(b) - scoreSource(a))[0] || null;
}

function isGoodShadowingSource(source) {
  const flags = new Set(source.quality?.flags || []);
  return source.status === "ok" &&
    source.normalizedCueCount > 0 &&
    !flags.has("long-cues") &&
    !flags.has("overlap-cues") &&
    source.quality?.maxDurationSec <= 8;
}

function scoreSource(source) {
  if (source.status !== "ok" || !source.normalizedCueCount) return -1000;
  const quality = source.quality || {};
  const flags = new Set(quality.flags || []);
  let score = 100;
  score -= (quality.longCueCount || 0) * 20;
  score -= (quality.overlapCount || 0) * 30;
  score -= Math.min(quality.duplicateTextCount || 0, 20) * 2;
  score -= Math.max(0, (quality.maxDurationSec || 0) - 8) * 8;
  if (flags.has("phrase-sized")) score += 15;
  if (source.sourceKind === "manual") score += 6;
  if (source.provider === "yt-dlp") score += 3;
  return score;
}

function compactCue(cue) {
  return {
    start: round(cue.start),
    end: round(cue.end),
    text: cue.text,
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function renderMarkdown(data) {
  const lines = [];
  lines.push("# Subtitle Source Quality Shootout Report");
  lines.push("");
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push("");
  lines.push(`Supadata/API calls included: ${data.includeSupadata ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Recommended Source By Fixture");
  lines.push("");
  lines.push("| Fixture | Recommendation | Confidence | Why |");
  lines.push("| --- | --- | --- | --- |");
  for (const fixture of data.fixtures) {
    lines.push([
      `${fixture.label} (${fixture.id})`,
      fixture.recommendation?.source || "none",
      fixture.recommendation?.confidence || "",
      (fixture.recommendation?.reason || "").replace(/\|/g, "\\|"),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("## Clean Text + ASR Timing Feasibility");
  lines.push("");
  lines.push("| Fixture | Status | Confidence | Manual coverage | ASR coverage | Why |");
  lines.push("| --- | --- | --- | ---: | ---: | --- |");
  for (const fixture of data.fixtures) {
    lines.push([
      `${fixture.label} (${fixture.id})`,
      fixture.alignment?.status || "",
      fixture.alignment?.confidence || "",
      String(fixture.alignment?.manualCoverage ?? ""),
      String(fixture.alignment?.autoCoverage ?? ""),
      (fixture.alignment?.reason || "").replace(/\|/g, "\\|"),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("## Raw Measurements");
  lines.push("");
  lines.push("| Fixture | Source | Status | Provider | Track | Raw | Normalized | Flags | Max cue | Longest cue | Sample |");
  lines.push("| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- |");
  for (const fixture of data.fixtures) {
    for (const source of fixture.sources) {
      lines.push([
        `${fixture.label} (${fixture.id})`,
        source.source,
        source.status,
        source.provider || "",
        source.trackKey || "",
        String(source.rawCueCount || 0),
        String(source.normalizedCueCount || 0),
        source.quality?.flags?.join(", ") || "",
        String(source.quality?.maxDurationSec ?? ""),
        source.quality?.longestCue?.text?.replace(/\|/g, "\\|") || "",
        source.sample?.[0]?.text?.replace(/\|/g, "\\|") || source.error || "",
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
  }
  lines.push("");
  lines.push("## Fixture Details");
  lines.push("");
  for (const fixture of data.fixtures) {
    lines.push(`### ${fixture.label} (${fixture.id})`);
    lines.push("");
    lines.push(fixture.note || "");
    lines.push("");
    lines.push(`Title: ${fixture.title || "-"}`);
    lines.push("");
    lines.push(`Available ${fixture.language} tracks: manual=${fixture.available?.subtitles?.join(", ") || "-"}; auto=${fixture.available?.automatic?.join(", ") || "-"}`);
    lines.push("");
    for (const source of fixture.sources) {
      lines.push(`- ${source.source}: ${source.status}; raw ${source.rawCueCount}, normalized ${source.normalizedCueCount}; flags ${source.quality?.flags?.join(", ") || "-"}; max ${source.quality?.maxDurationSec ?? "-"}s.`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
