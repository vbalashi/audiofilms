import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { jsonResponse, optionsResponse } from "@/lib/http/apiResponse";
import type { Phrase } from "@/types/subtitles";

export const maxDuration = 3600;

const DEFAULT_ENGINE = "faster-whisper";
const DEFAULT_MODEL = "mobiuslabsgmbh/faster-whisper-large-v3-turbo";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function safeArg(value: string) {
  return value.replace(/[^\w./:-]/g, "");
}

function localAsrPracticeEnabled(request: Request): boolean {
  const explicit = String(process.env.LOCAL_ASR_PRACTICE_ENABLED || '').toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;

  const hostname = new URL(request.url).hostname;
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  return process.env.NODE_ENV !== 'production' && localHost;
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ["GET", "OPTIONS"] });
}

export async function GET(request: Request) {
  if (!localAsrPracticeEnabled(request)) {
    return jsonResponse(
      request,
      {
        error: "local_asr_practice_disabled",
        suggestedAction: "Use /api/asr/jobs for remote ASR or set LOCAL_ASR_PRACTICE_ENABLED=true for private local dogfood.",
      },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId") || "";
  const language = searchParams.get("lang") || "nl";
  const duration = searchParams.get("duration") || "";
  const fullAudio = !duration;
  const engine = searchParams.get("engine") || DEFAULT_ENGINE;
  const model = searchParams.get("model") || DEFAULT_MODEL;
  const textSource = searchParams.get("textSource") || "manual";
  const refresh = searchParams.get("refresh") === "1" || searchParams.get("refresh") === "true";

  if (!videoId) {
    return jsonResponse(request, { error: "Missing videoId" }, { status: 400 });
  }

  if (duration && !/^\d+$/.test(duration)) {
    return jsonResponse(request, { error: "Invalid duration" }, { status: 400 });
  }

  const appRoot = process.cwd();
  const windowLabel = fullAudio ? "full" : `${duration}s`;
  const runDir = path.join(appRoot, ".asr-cache", `${safeArg(videoId)}-${safeArg(language)}-${windowLabel}`);
  const modelSlug = slugify(model);
  const previewPath = path.join(runDir, `${engine}-${modelSlug}-practice-preview.json`);
  const wordsPath = path.join(runDir, `${engine}-${modelSlug}-words.json`);

  try {
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
    ];
    if (fullAudio) {
      alignArgs.push("--full");
    } else {
      alignArgs.push("--duration", duration);
    }
    if (refresh) alignArgs.push("--refresh");

    execFileSync(process.execPath, alignArgs, {
      cwd: appRoot,
      stdio: "inherit",
      maxBuffer: 100 * 1024 * 1024,
    });

    const preview = textSource === "asr"
      ? buildAsrTextPreview(wordsPath, { videoId, language, duration, fullAudio, engine, model })
      : buildManualTextPreview(appRoot, previewPath, { videoId, language, duration, fullAudio, engine, model });
    const practicePhrases = (preview.practicePhrases || []).map((phrase: Phrase, index: number) => ({ ...phrase, id: index }));

    return jsonResponse(request, {
      phrases: practicePhrases,
      practicePhrases,
      language,
      meta: {
        provider: "local-asr-practice",
        fallbackUsed: false,
        cacheStatus: refresh ? "stored" : "hit",
        sourceKind: textSource === "asr" ? "provider" : "manual",
        retrievalPath: `local-asr:${engine}:${model}:${textSource}`,
        timingExactness: "word-level",
        qualityFlags: textSource !== "asr" && practicePhrases.some((phrase: { timingEvidence?: string }) => phrase.timingEvidence !== "asr-word-alignment")
          ? ["inferred-end"]
          : [],
        warnings: [
          textSource === "asr"
            ? `Local ASR practice prototype: ${practicePhrases.length} ASR transcript phrases.`
            : `Local ASR practice prototype: ${preview.summary.asrAlignedPhraseCount}/${preview.summary.practicePhraseCount} phrases use ASR word alignment.`,
        ],
        warning: textSource === "asr"
          ? `Local ASR practice prototype: ${practicePhrases.length} ASR transcript phrases.`
          : `Local ASR practice prototype: ${preview.summary.asrAlignedPhraseCount}/${preview.summary.practicePhraseCount} phrases use ASR word alignment.`,
      },
      localAsrPreview: preview.summary,
    });
  } catch (error) {
    console.error("[local-asr-practice] failed", error);
    return jsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : "Local ASR practice failed",
        recoverable: true,
        suggestedAction: "Check local ASR cache, yt-dlp, and faster-whisper setup.",
      },
      { status: 500 },
    );
  }
}

function buildManualTextPreview(
  appRoot: string,
  previewPath: string,
  options: { videoId: string; language: string; duration: string; fullAudio: boolean; engine: string; model: string },
) {
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
    args.push("--duration", options.duration);
  }

  execFileSync(process.execPath, args, {
    cwd: appRoot,
    stdio: "inherit",
    maxBuffer: 100 * 1024 * 1024,
  });

  return JSON.parse(fs.readFileSync(previewPath, "utf8"));
}

function buildAsrTextPreview(
  wordsPath: string,
  options: { videoId: string; language: string; duration: string; fullAudio: boolean; engine: string; model: string },
) {
  const asr = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
  const segments = mergeAsrSegments(asr.segments || []);
  const practicePhrases = segments
    .map((segment: { start?: number; end?: number; text?: string }, index: number) => ({
      id: index,
      startSec: Number(segment.start),
      endSec: Number(segment.end),
      text: String(segment.text || "").trim(),
      timingEvidence: "asr-segment",
    }))
    .filter((phrase: Phrase) => Number.isFinite(phrase.startSec) && Number.isFinite(phrase.endSec) && phrase.endSec > phrase.startSec && phrase.text);

  return {
    generatedAt: new Date().toISOString(),
    videoId: options.videoId,
    language: options.language,
    durationSec: options.fullAudio ? Number(asr.durationSec || 0) : Number(options.duration),
    fullAudio: options.fullAudio,
    engine: asr.engine || options.engine,
    model: asr.model || options.model,
    summary: {
      practicePhraseCount: practicePhrases.length,
      asrAlignedPhraseCount: practicePhrases.length,
      fallbackPhraseCount: 0,
      textSource: "asr",
    },
    practicePhrases,
  };
}

function mergeAsrSegments(segments: Array<{ start?: number; end?: number; text?: string }>) {
  const merged: Array<{ start?: number; end?: number; text?: string }> = [];

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

function shouldMergeAsrSegment(
  previous: { start?: number; end?: number; text?: string },
  next: { start?: number; end?: number; text?: string },
) {
  const previousText = String(previous.text || "").trim();
  const gapSec = Number(next.start) - Number(previous.end);
  return /\.{3,}$/.test(previousText) && Number.isFinite(gapSec) && gapSec <= 0.35;
}

function joinAsrContinuation(left: string, right: string) {
  const cleanLeft = left.replace(/\s*\.{3,}\s*$/, "").trim();
  const cleanRight = lowercaseInitialWord(right.trim());
  return `${cleanLeft} ${cleanRight}`.replace(/\s+/g, " ").trim();
}

function lowercaseInitialWord(text: string) {
  return text.replace(/^(\p{L})/u, (letter) => letter.toLocaleLowerCase());
}
