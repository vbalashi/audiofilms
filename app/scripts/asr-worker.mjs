#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(new URL("..", import.meta.url).pathname);
const DEFAULT_ENGINE = "faster-whisper";
const DEFAULT_MODEL = "mobiuslabsgmbh/faster-whisper-large-v3-turbo";
const POLL_MS = Number(process.env.ASR_WORKER_POLL_MS || 3000);
const ONCE = process.argv.includes("--once");

main().catch((error) => {
  console.error("[asr-worker] fatal", error);
  process.exit(1);
});

async function main() {
  console.log(`[asr-worker] starting queueDir=${queueDir()} artifactStore=${artifactStore()}`);
  while (true) {
    const worked = await processNextJob();
    if (ONCE) break;
    if (!worked) await sleep(POLL_MS);
  }
}

async function processNextJob() {
  const job = nextQueuedJob();
  if (!job) return false;

  const startedAt = new Date().toISOString();
  writeJob({ ...job, status: "running", startedAt, updatedAt: startedAt });

  try {
    const result = runAsrPipeline(job);
    const resultPath = writeResult(job, result);
    const completedAt = new Date().toISOString();
    writeJob({
      ...readJob(job.jobId),
      status: "completed",
      resultPath,
      completedAt,
      updatedAt: completedAt,
      error: undefined,
    });
    console.log(`[asr-worker] completed ${job.jobId}`);
    return true;
  } catch (error) {
    const failedAt = new Date().toISOString();
    writeJob({
      ...readJob(job.jobId),
      status: "failed",
      failedAt,
      updatedAt: failedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`[asr-worker] failed ${job.jobId}`, error);
    return true;
  }
}

function queueDir() {
  const configured = process.env.ASR_QUEUE_DIR || process.env.ASR_QUEUE_URL || "";
  if (configured.startsWith("file://")) return fileURLToPath(configured);
  if (configured && !configured.includes("://")) return path.resolve(configured);
  return path.join(appRoot, ".asr-jobs");
}

function artifactStore() {
  return process.env.ASR_ARTIFACT_STORE || `file://${path.join(appRoot, ".asr-cache", "artifacts")}`;
}

function asrCacheDir() {
  return process.env.AUDIOFILMS_ASR_CACHE_DIR || path.join(appRoot, ".asr-cache");
}

function artifactRoot() {
  const store = artifactStore();
  if (store.startsWith("file://")) return fileURLToPath(store);
  if (!store.includes("://")) return path.resolve(store);
  throw new Error(`Unsupported ASR_ARTIFACT_STORE for this worker: ${store}`);
}

function jobsDir() {
  return path.join(queueDir(), "jobs");
}

function readJob(jobId) {
  return JSON.parse(fs.readFileSync(path.join(jobsDir(), `${safeJobIdPart(jobId)}.json`), "utf8"));
}

function writeJob(job) {
  fs.mkdirSync(jobsDir(), { recursive: true });
  const filePath = path.join(jobsDir(), `${safeJobIdPart(job.jobId)}.json`);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(job, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

function nextQueuedJob() {
  fs.mkdirSync(jobsDir(), { recursive: true });
  const jobs = fs.readdirSync(jobsDir())
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(jobsDir(), file), "utf8"));
      } catch {
        return null;
      }
    })
    .filter((job) => job?.status === "queued")
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  return jobs[0] || null;
}

function runAsrPipeline(job) {
  const request = job.request || {};
  const videoId = request.videoId;
  const language = request.language || request.lang || "nl";
  const engine = request.engine || DEFAULT_ENGINE;
  const model = request.model || DEFAULT_MODEL;
  const durationSec = Number(request.durationSec || 0);
  const fullAudio = Boolean(request.fullAudio) || !durationSec;
  const textSource = request.textSource || "asr";

  const alignArgs = [
    path.join(appRoot, "scripts", "local-asr-alignment-smoke.mjs"),
    "--video",
    videoId,
    "--lang",
    language,
    "--engine",
    engine,
    "--model",
    model,
    "--text-source",
    textSource,
  ];
  if (fullAudio) {
    alignArgs.push("--full");
  } else {
    alignArgs.push("--duration", String(durationSec));
  }

  execFileSync(process.execPath, alignArgs, {
    cwd: appRoot,
    stdio: "inherit",
    maxBuffer: 100 * 1024 * 1024,
  });

  const runDir = path.join(asrCacheDir(), `${safeArg(videoId)}-${safeArg(language)}-${fullAudio ? "full" : `${durationSec}s`}`);
  const modelSlug = slugify(model);
  const wordsPath = path.join(runDir, `${engine}-${modelSlug}-words.json`);
  const previewPath = path.join(runDir, `${engine}-${modelSlug}-practice-preview.json`);

  const preview = textSource === "asr"
    ? buildAsrTextPreview({ videoId, language, fullAudio, durationSec, engine, model, wordsPath })
    : buildManualTextPreview({ videoId, language, fullAudio, durationSec, engine, model, previewPath });
  const result = buildSubtitleResult({
    preview,
    videoId,
    language,
    engine,
    model,
    textSource,
    refresh: request.refresh,
  });

  if (textSource !== "asr") {
    const asrPreview = buildAsrTextPreview({ videoId, language, fullAudio, durationSec, engine, model, wordsPath });
    result.alternatives = [
      {
        id: "pure-asr",
        label: "ASR transcript",
        response: buildSubtitleResult({
          preview: asrPreview,
          videoId,
          language,
          engine,
          model,
          textSource: "asr",
          refresh: request.refresh,
        }),
      },
    ];
  }

  return result;
}

function buildSubtitleResult({ preview, language, engine, model, textSource, refresh }) {
  const practicePhrases = (preview.practicePhrases || []).map((phrase, index) => ({ ...phrase, id: index }));
  const sourcePhrases = textSource === "asr"
    ? practicePhrases
    : Array.isArray(preview.sourcePhrases) && preview.sourcePhrases.length
      ? preview.sourcePhrases.map((phrase, index) => ({ ...phrase, id: index }))
      : practicePhrases;
  const suspiciousLeadingWordGapCount = Number(preview.summary?.suspiciousLeadingWordGapCount || 0);
  const qualityFlags = [
    ...(textSource !== "asr" && practicePhrases.some((phrase) => phrase.timingEvidence !== "asr-word-alignment")
      ? ["inferred-end"]
      : []),
    ...(suspiciousLeadingWordGapCount > 0 ? ["asr-suspicious-leading-word-gap"] : []),
  ];
  const warnings = [
    textSource === "asr"
      ? `ASR job completed: ${practicePhrases.length} ASR transcript phrases.`
      : `ASR job completed: ${preview.summary.asrAlignedPhraseCount}/${preview.summary.practicePhraseCount} ${textSource} caption phrases use ASR word alignment.`,
    ...(suspiciousLeadingWordGapCount > 0
      ? [`Adjusted playback starts for ${suspiciousLeadingWordGapCount} ASR phrases with suspicious leading word gaps.`]
      : []),
  ];
  return {
    phrases: sourcePhrases,
    practicePhrases,
    language,
    meta: {
      provider: "audiofilms-asr-worker",
      fallbackUsed: false,
      cacheStatus: refresh ? "stored" : "hit",
      sourceKind: textSource === "manual" ? "manual" : textSource === "auto" ? "auto" : "provider",
      retrievalPath: `asr-job:${engine}:${model}:${textSource}`,
      timingExactness: "word-level",
      qualityFlags,
      warnings,
    },
    localAsrPreview: preview.summary,
  };
}

function buildManualTextPreview(options) {
  const args = [
    path.join(appRoot, "scripts", "build-practice-preview.mjs"),
    "--video",
    options.videoId,
    "--lang",
    options.language,
    "--engine",
    options.engine,
    "--model",
    options.model,
  ];
  if (options.fullAudio) {
    args.push("--full");
  } else {
    args.push("--duration", String(options.durationSec));
  }

  execFileSync(process.execPath, args, {
    cwd: appRoot,
    stdio: "inherit",
    maxBuffer: 100 * 1024 * 1024,
  });

  return JSON.parse(fs.readFileSync(options.previewPath, "utf8"));
}

function buildAsrTextPreview(options) {
  const asr = JSON.parse(fs.readFileSync(options.wordsPath, "utf8"));
  const segments = mergeAsrSegments(asr.segments || []);
  const practicePhrases = segments
    .map((segment, index) => asrSegmentToPracticePhrase(segment, segments[index - 1], index))
    .filter((phrase) => Number.isFinite(phrase.startSec) && Number.isFinite(phrase.endSec) && phrase.endSec > phrase.startSec && phrase.text);

  return {
    generatedAt: new Date().toISOString(),
    videoId: options.videoId,
    language: options.language,
    durationSec: options.fullAudio ? Number(asr.durationSec || asr.duration || 0) : Number(options.durationSec),
    fullAudio: options.fullAudio,
    engine: asr.engine || options.engine,
    model: asr.model || options.model,
    summary: {
      practicePhraseCount: practicePhrases.length,
      asrAlignedPhraseCount: practicePhrases.length,
      fallbackPhraseCount: 0,
      textSource: "asr",
      suspiciousLeadingWordGapCount: practicePhrases.filter((phrase) => phrase.timingFlags?.includes("asr-suspicious-leading-word-gap")).length,
    },
    practicePhrases,
  };
}

function asrSegmentToPracticePhrase(segment, previousSegment, index) {
  const words = normalizeAsrWords(segment.words);
  const timingAdjustment = suspiciousLeadingWordGapAdjustment({
    segmentStart: Number(segment.start),
    previousEnd: previousSegment ? Number(previousSegment.end) : null,
    words,
  });
  return {
    id: index,
    startSec: Number(segment.start),
    endSec: Number(segment.end),
    ...(timingAdjustment ? { playbackStartSec: timingAdjustment.playbackStartSec } : {}),
    text: String(segment.text || "").trim(),
    timingEvidence: "asr-segment",
    ...(timingAdjustment ? { timingFlags: ["asr-suspicious-leading-word-gap"] } : {}),
    ...(words.length ? { wordTimings: words } : {}),
  };
}

function normalizeAsrWords(words) {
  if (!Array.isArray(words)) return [];
  return words
    .map((word) => ({
      word: String(word.word || "").trim(),
      startSec: Number(word.start),
      endSec: Number(word.end),
      ...(Number.isFinite(Number(word.probability)) ? { probability: Number(word.probability) } : {}),
    }))
    .filter((word) => word.word && Number.isFinite(word.startSec) && Number.isFinite(word.endSec) && word.endSec > word.startSec)
    .sort((left, right) => left.startSec - right.startSec || left.endSec - right.endSec);
}

function suspiciousLeadingWordGapAdjustment({ segmentStart, previousEnd, words }) {
  if (!Number.isFinite(segmentStart) || !Number.isFinite(previousEnd) || words.length < 2) return null;

  const previousBoundaryGapSec = Math.max(0, segmentStart - previousEnd);
  const firstWordGapSec = words[1].startSec - words[0].endSec;
  if (previousBoundaryGapSec > 0.3 || firstWordGapSec < 0.9) return null;

  const internalGaps = [];
  for (let index = 1; index < words.length; index += 1) {
    const gapSec = words[index].startSec - words[index - 1].endSec;
    if (Number.isFinite(gapSec) && gapSec > 0) internalGaps.push(gapSec);
  }
  const laterGaps = internalGaps.slice(1);
  const medianLaterGapSec = median(laterGaps);
  const outlierThresholdSec = Math.max(0.9, medianLaterGapSec * 3);
  if (firstWordGapSec < outlierThresholdSec) return null;

  return {
    playbackStartSec: words[1].startSec,
    previousBoundaryGapSec,
    firstWordGapSec,
    medianLaterGapSec,
  };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mergeAsrSegments(segments) {
  const merged = [];

  for (const segment of segments) {
    const text = String(segment.text || "").trim();
    if (!text) continue;

    const previous = merged[merged.length - 1];
    if (previous && shouldMergeAsrSegment(previous, segment)) {
      previous.end = segment.end;
      previous.text = joinAsrContinuation(String(previous.text || ""), text);
      continue;
    }

    merged.push({ ...segment, text });
  }

  return merged;
}

function shouldMergeAsrSegment(previous, next) {
  const previousText = String(previous.text || "").trim();
  const gapSec = Number(next.start) - Number(previous.end);
  return /\.{3,}$/.test(previousText) && Number.isFinite(gapSec) && gapSec <= 0.35;
}

function joinAsrContinuation(left, right) {
  const cleanLeft = left.replace(/\s*\.{3,}\s*$/, "").trim();
  const cleanRight = lowercaseInitialWord(right.trim());
  return `${cleanLeft} ${cleanRight}`.replace(/\s+/g, " ").trim();
}

function lowercaseInitialWord(text) {
  return text.replace(/^(\p{L})/u, (letter) => letter.toLocaleLowerCase());
}

function writeResult(job, result) {
  const outputDir = path.join(artifactRoot(), "jobs", safeJobIdPart(job.jobId));
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "result.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  return outputPath;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function safeArg(value) {
  return String(value || "").replace(/[^\w./:-]/g, "");
}

function safeJobIdPart(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96) || "job";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
