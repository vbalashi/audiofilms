#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const appRoot = path.join(repoRoot, "app");
const cacheDir = process.env.AUDIOFILMS_ASR_CACHE_DIR || path.join(appRoot, ".asr-cache");

const videoId = valueFor("--video") || valueFor("--videoId") || "RJrjzCuCHpo";
const language = valueFor("--lang") || "nl";
const fullAudio = hasFlag("--full");
const durationSec = Number(valueFor("--duration") || "300");
const engine = valueFor("--engine") || "faster-whisper";
const model = valueFor("--model") || "mobiuslabsgmbh/faster-whisper-large-v3-turbo";
const runDir = path.join(cacheDir, `${videoId}-${language}-${fullAudio ? "full" : `${durationSec}s`}`);
const manualPath = path.join(runDir, "manual-captions.json");
const wordsPath = path.join(runDir, `${engine}-${slugify(model)}-words.json`);
const outputJsonPath = path.join(runDir, `${engine}-${slugify(model)}-practice-preview.json`);
const outputMarkdownPath = path.join(runDir, `${engine}-${slugify(model)}-practice-preview.md`);

if (!fs.existsSync(manualPath)) {
  throw new Error(`Missing manual captions: ${manualPath}`);
}
if (!fs.existsSync(wordsPath)) {
  throw new Error(`Missing ASR words: ${wordsPath}`);
}

const manualPayload = JSON.parse(fs.readFileSync(manualPath, "utf8"));
const asrPayload = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
const preview = buildPreview(manualPayload, asrPayload);

fs.writeFileSync(outputJsonPath, JSON.stringify(preview, null, 2), "utf8");
fs.writeFileSync(outputMarkdownPath, renderMarkdown(preview), "utf8");

console.log(`[practice-preview] phrases: ${preview.practicePhrases.length}`);
console.log(`[practice-preview] ASR-aligned: ${preview.summary.asrAlignedPhraseCount}`);
console.log(`[practice-preview] fallback: ${preview.summary.fallbackPhraseCount}`);
console.log(`[practice-preview] wrote ${outputMarkdownPath}`);

function valueFor(name) {
  const args = process.argv.slice(2);
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1] || "";
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function buildPreview(manual, asr) {
  const manualTokens = tokenizeManualCues(manual.cues || []);
  const asrTokens = tokenizeAsrWords(asr.words || []);
  const matches = alignTokens(manualTokens, asrTokens);
  const asrByManual = new Map(matches.map((match) => [
    match.manualIndex,
    { ...asrTokens[match.asrIndex], asrIndex: match.asrIndex },
  ]));
  const sentenceUnits = Array.isArray(manual.practicePhrases) && manual.practicePhrases.length
    ? buildPracticeUnitsFromPracticePhrases(manual.practicePhrases, manualTokens)
    : buildSentenceUnits(manual.cues || [], manualTokens);
  const practicePhrases = sentenceUnits.map((unit, index) => {
    const timing = timingForUnit(unit, manualTokens, asrByManual);
    return {
      id: index,
      startSec: timing.startSec,
      endSec: timing.endSec,
      text: unit.text,
      timingEvidence: timing.timingEvidence,
      alignmentCoverage: timing.coverage,
      localAsrDensity: timing.localAsrDensity,
      asrSpanSec: timing.asrSpanSec,
      sourceCueIds: unit.sourceCueIds,
      ...(unit.displayText ? { displayText: unit.displayText } : {}),
      ...(Number.isFinite(unit.displayStartChar) ? { displayStartChar: unit.displayStartChar } : {}),
      ...(Number.isFinite(unit.displayEndChar) ? { displayEndChar: unit.displayEndChar } : {}),
      ...(unit.translationText ? { translationText: unit.translationText } : {}),
      ...(unit.displaySegmentId ? { displaySegmentId: unit.displaySegmentId } : {}),
      ...(unit.segmentRole ? { segmentRole: unit.segmentRole } : {}),
      ...(Array.isArray(unit.timingFlags) && unit.timingFlags.length ? { timingFlags: unit.timingFlags } : {}),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    videoId,
    language,
    durationSec: fullAudio ? manual.durationSec : durationSec,
    fullAudio,
    engine: asr.engine || engine,
    model: asr.model || model,
    manualTrackKey: manual.trackKey,
    title: manual.title,
    sourcePhrases: Array.isArray(manual.sourcePhrases) && manual.sourcePhrases.length
      ? manual.sourcePhrases
      : (manual.cues || []).map((cue, index) => ({
        id: index,
        startSec: cue.start,
        endSec: cue.end,
        text: cue.text,
      })),
    sourceMeta: manual.meta || {},
    summary: {
      sourceCueCount: manual.cues?.length || 0,
      practicePhraseCount: practicePhrases.length,
      asrAlignedPhraseCount: practicePhrases.filter((phrase) => phrase.timingEvidence === "asr-word-alignment").length,
      fallbackPhraseCount: practicePhrases.filter((phrase) => phrase.timingEvidence !== "asr-word-alignment").length,
      manualTokenCount: manualTokens.length,
      asrWordCount: asrTokens.length,
      matchedTokenCount: matches.length,
      manualCoverage: ratio(matches.length, manualTokens.length),
      asrCoverage: ratio(matches.length, asrTokens.length),
    },
    practicePhrases,
  };
}

function buildPracticeUnitsFromPracticePhrases(practicePhrases, manualTokens) {
  const units = [];
  let cursor = 0;
  for (const phrase of practicePhrases) {
    const words = splitWords(phrase.text).map((word) => normalizeToken(word.raw)).filter(keepToken);
    const span = findTokenSpan(words, manualTokens, cursor);
    if (span) cursor = span.end + 1;
    units.push({
      text: cleanupSentence(phrase.text),
      tokenStart: span?.start ?? null,
      tokenEnd: span?.end ?? null,
      sourceCueIds: span
        ? Array.from(new Set(manualTokens.slice(span.start, span.end + 1).map((token) => token.cueId)))
        : [],
      startSec: Number(phrase.startSec),
      endSec: Number(phrase.endSec),
      displayText: phrase.displayText,
      displayStartChar: phrase.displayStartChar,
      displayEndChar: phrase.displayEndChar,
      translationText: phrase.translationText,
      displaySegmentId: phrase.displaySegmentId,
      segmentRole: phrase.segmentRole,
      timingFlags: phrase.timingFlags,
    });
  }
  return units;
}

function findTokenSpan(words, manualTokens, cursor) {
  if (!words.length) return null;
  for (let start = Math.max(0, cursor); start < manualTokens.length; start += 1) {
    let offset = 0;
    while (
      offset < words.length &&
      manualTokens[start + offset] &&
      manualTokens[start + offset].normalized === words[offset]
    ) {
      offset += 1;
    }
    if (offset === words.length) {
      return { start, end: start + words.length - 1 };
    }
  }
  return null;
}

function tokenizeManualCues(cues) {
  const tokens = [];
  for (const cue of cues) {
    for (const part of splitWords(cue.text)) {
      const normalized = normalizeToken(part.raw);
      if (!keepToken(normalized)) continue;
      tokens.push({
        index: tokens.length,
        cueId: cue.id,
        cueStart: cue.start,
        cueEnd: cue.end,
        raw: part.raw,
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
      raw: part.raw,
      normalized: normalizeToken(part.raw),
    }));
  }).filter((token) => keepToken(token.normalized) && Number.isFinite(token.start) && Number.isFinite(token.end))
    .map((token, index) => ({ ...token, index }));
}

function splitWords(text) {
  const matches = [];
  const regex = /[\p{L}\p{N}'’-]+/gu;
  let match;
  while ((match = regex.exec(String(text || "")))) {
    matches.push({ raw: match[0], start: match.index, end: regex.lastIndex });
  }
  return matches;
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
      dp[i][j] = manualTokens[i].normalized === asrTokens[j].normalized
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
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

function buildSentenceUnits(cues, manualTokens) {
  const units = [];
  let buffer = "";
  let tokenStart = null;
  let tokenEnd = null;
  let sourceCueIds = [];

  for (let cueIndex = 0; cueIndex < cues.length; cueIndex += 1) {
    const cue = cues[cueIndex];
    const nextCue = cues[cueIndex + 1];
    const segments = splitCueIntoSentenceSegments(
      cue.text,
      Boolean(nextCue && continuesAfterEllipsis(cue.text, nextCue.text)),
      !nextCue || startsNewSentence(nextCue.text),
    );
    const cueTokens = manualTokens.filter((token) => token.cueId === cue.id);
    let tokenCursor = 0;

    for (const segment of segments) {
      const segmentWordCount = splitWords(segment.text).filter((word) => keepToken(normalizeToken(word.raw))).length;
      const segmentTokens = cueTokens.slice(tokenCursor, tokenCursor + segmentWordCount);
      tokenCursor += segmentWordCount;

      if (!buffer) {
        tokenStart = segmentTokens[0]?.index ?? null;
      }
      tokenEnd = segmentTokens[segmentTokens.length - 1]?.index ?? tokenEnd;
      sourceCueIds = Array.from(new Set([...sourceCueIds, cue.id]));
      buffer = joinSentenceText(buffer, segment.text, segment.continues);

      if (segment.flush) {
        flushUnit();
      }
    }
  }

  flushUnit();
  return splitLongUnits(units);

  function flushUnit() {
    const text = cleanupSentence(buffer);
    if (!text) return;
    units.push({
      text,
      tokenStart,
      tokenEnd,
      sourceCueIds,
    });
    buffer = "";
    tokenStart = null;
    tokenEnd = null;
    sourceCueIds = [];
  }
}

function splitCueIntoSentenceSegments(text, ellipsisContinues, flushTail) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const segments = [];
  let start = 0;
  const regex = /([.!?]+|…+)/g;
  let match;
  while ((match = regex.exec(normalized))) {
    const punctuation = match[0];
    const end = regex.lastIndex;
    const rawSegment = normalized.slice(start, end).trim();
    const isTrailingEllipsis = punctuation.includes(".") && /\.{3,}$/.test(punctuation) && end === normalized.length;
    const continues = isTrailingEllipsis && ellipsisContinues;
    if (rawSegment) {
      segments.push({
        text: continues ? rawSegment.replace(/\.{3,}$/, "").trim() : rawSegment,
        flush: !continues,
        continues,
      });
    }
    start = end;
  }
  const tail = normalized.slice(start).trim();
  if (tail) {
    segments.push({ text: tail, flush: flushTail, continues: !flushTail });
  }
  return segments.length ? segments : [{ text: normalized, flush: false, continues: true }];
}

function continuesAfterEllipsis(currentText, nextText) {
  return /\.{3,}\s*$/.test(String(currentText || "")) &&
    /^[a-zà-ž]/u.test(String(nextText || "").trim());
}

function startsNewSentence(text) {
  return /^[A-ZÀ-Ž0-9]/u.test(String(text || "").trim());
}

function joinSentenceText(left, right, continues) {
  const cleanRight = String(right || "").trim();
  if (!left) return cleanRight;
  const spacer = continues ? " " : " ";
  return `${left}${spacer}${cleanRight}`.trim();
}

function cleanupSentence(text) {
  return String(text || "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLongUnits(units) {
  const result = [];
  for (const unit of units) {
    const wordCount = splitWords(unit.text).length;
    if (wordCount <= 18 && unit.text.length <= 140) {
      result.push(unit);
      continue;
    }

    const parts = splitLongText(unit.text);
    const tokenCount = Math.max(1, (unit.tokenEnd ?? 0) - (unit.tokenStart ?? 0) + 1);
    let offset = 0;
    for (const part of parts) {
      const partTokenCount = splitWords(part).filter((word) => keepToken(normalizeToken(word.raw))).length;
      result.push({
        ...unit,
        text: part,
        tokenStart: (unit.tokenStart ?? 0) + offset,
        tokenEnd: Math.min(unit.tokenEnd ?? 0, (unit.tokenStart ?? 0) + offset + partTokenCount - 1),
      });
      offset = Math.min(tokenCount, offset + partTokenCount);
    }
  }
  return result;
}

function splitLongText(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const chunks = [];
  let buffer = "";
  for (const word of words) {
    const next = `${buffer} ${word}`.trim();
    if (buffer && (splitWords(next).length > 18 || next.length > 140)) {
      chunks.push(buffer);
      buffer = word;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

function timingForUnit(unit, manualTokens, asrByManual) {
  const tokens = manualTokens.filter((token) => token.index >= unit.tokenStart && token.index <= unit.tokenEnd);
  const alignedWords = tokens.map((token) => asrByManual.get(token.index)).filter(Boolean);
  const coverage = ratio(alignedWords.length, tokens.length);
  const first = alignedWords[0];
  const last = alignedWords[alignedWords.length - 1];
  const fallbackStart = tokens[0]?.cueStart ?? unit.startSec ?? 0;
  const fallbackEnd = tokens[tokens.length - 1]?.cueEnd ?? unit.endSec ?? fallbackStart;
  const fallbackDuration = fallbackEnd - fallbackStart;
  const asrSpanSec = first && last ? last.end - first.start : 0;
  const asrSpanTokenCount = first && last ? last.asrIndex - first.asrIndex + 1 : 0;
  const localAsrDensity = ratio(alignedWords.length, asrSpanTokenCount);
  const spanIsPlausible = asrSpanSec <= Math.max(fallbackDuration * 3, fallbackDuration + 3);
  const timingEvidence = coverage >= 0.72 && localAsrDensity >= 0.55 && spanIsPlausible && first && last
    ? "asr-word-alignment"
    : "manual-cue-fallback";
  return {
    timingEvidence,
    coverage,
    localAsrDensity,
    asrSpanSec,
    startSec: timingEvidence === "asr-word-alignment" ? first.start : fallbackStart,
    endSec: timingEvidence === "asr-word-alignment" ? last.end : fallbackEnd,
  };
}

function ratio(count, total) {
  return total > 0 ? Number((count / total).toFixed(3)) : 0;
}

function renderMarkdown(preview) {
  const lines = [];
  lines.push("# Practice Phrase Preview");
  lines.push("");
  lines.push(`Generated: ${preview.generatedAt}`);
  lines.push("");
  lines.push(`- Video: \`${preview.videoId}\``);
  lines.push(`- Title: ${preview.title || "-"}`);
  lines.push(`- Language: \`${preview.language}\``);
  lines.push(`- Window: ${preview.durationSec}s`);
  lines.push(`- Engine: \`${preview.engine}\``);
  lines.push(`- Model: \`${preview.model}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Source cues: ${preview.summary.sourceCueCount}`);
  lines.push(`- Practice phrases: ${preview.summary.practicePhraseCount}`);
  lines.push(`- ASR-aligned phrases: ${preview.summary.asrAlignedPhraseCount}`);
  lines.push(`- Fallback phrases: ${preview.summary.fallbackPhraseCount}`);
  lines.push(`- Manual coverage: ${preview.summary.manualCoverage}`);
  lines.push(`- ASR coverage: ${preview.summary.asrCoverage}`);
  lines.push("");
  lines.push("## Phrases");
  lines.push("");
  lines.push("| # | Start | End | Evidence | Cov. | Text |");
  lines.push("| ---: | ---: | ---: | --- | ---: | --- |");
  for (const phrase of preview.practicePhrases) {
    lines.push(`| ${phrase.id + 1} | ${phrase.startSec.toFixed(2)} | ${phrase.endSec.toFixed(2)} | ${phrase.timingEvidence} | ${phrase.alignmentCoverage} | ${escapeCell(phrase.text)} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}
