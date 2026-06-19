import type { Phrase } from '@/types/subtitles';

export const DEFAULT_MAX_WORDS_PER_PRACTICE_PHRASE = 18;
export const DEFAULT_MAX_CHARACTERS_PER_PRACTICE_PHRASE = 140;
export const DEFAULT_MAX_CONTINUATION_GAP_SEC = 0.5;

export type PracticePhraseOptions = {
  maxWords?: number;
  maxCharacters?: number;
  maxContinuationGapSec?: number;
};

export function wordCount(text: string) {
  const matches = text.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

function splitLongText(text: string, options: Required<PracticePhraseOptions>) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  for (const word of words) {
    const next = `${buffer} ${word}`.trim();
    if (
      buffer &&
      (wordCount(next) > options.maxWords || next.length > options.maxCharacters)
    ) {
      chunks.push(buffer);
      buffer = word;
    } else {
      buffer = next;
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [text];
}

function splitPhraseIntoTimedParts(
  phrase: Phrase,
  options: Required<PracticePhraseOptions>,
): Phrase[] {
  const text = phrase.text.trim().replace(/\s+/g, ' ');
  const duration = Math.max(0, phrase.endSec - phrase.startSec);
  const sentenceParts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const parts = sentenceParts.flatMap((part) => {
    const cleanPart = part.trim();
    if (!cleanPart) return [];

    if (
      wordCount(cleanPart) <= options.maxWords &&
      cleanPart.length <= options.maxCharacters
    ) {
      return [cleanPart];
    }

    return splitLongText(cleanPart, options);
  });

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
  let elapsed = 0;

  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const partDuration = isLast
      ? duration - elapsed
      : totalChars > 0
        ? duration * (part.length / totalChars)
        : 0;
    const startSec = phrase.startSec + elapsed;
    const endSec = isLast ? phrase.endSec : startSec + partDuration;

    elapsed += partDuration;

    return {
      id: index,
      startSec,
      endSec,
      text: part,
    };
  });
}

function hasTrailingEllipsis(text: string) {
  return /(?:\.\.\.|…)\s*$/.test(text.trim());
}

function stripTrailingEllipsis(text: string) {
  return text.trim().replace(/\s*(?:\.\.\.|…)\s*$/, '');
}

function stripLeadingEllipsis(text: string) {
  return text.trim().replace(/^(?:\.\.\.|…)\s*/, '');
}

function startsWithContinuationCue(text: string) {
  const cleanText = text.trim();
  if (/^(?:\.\.\.|…)/.test(cleanText)) return true;

  const firstLetter = cleanText.match(/\p{L}/u)?.[0];
  return Boolean(firstLetter && firstLetter === firstLetter.toLocaleLowerCase());
}

function mergeContinuationPhrases(
  phrases: Phrase[],
  options: Required<PracticePhraseOptions>,
) {
  const merged: Phrase[] = [];

  for (const phrase of phrases) {
    const previous = merged.at(-1);

    if (!previous) {
      merged.push({ ...phrase });
      continue;
    }

    const gapSec = phrase.startSec - previous.endSec;
    const nextText = stripLeadingEllipsis(phrase.text);
    const combinedText = `${stripTrailingEllipsis(previous.text)} ${nextText}`
      .trim()
      .replace(/\s+/g, ' ');

    const shouldMerge =
      hasTrailingEllipsis(previous.text) &&
      startsWithContinuationCue(phrase.text) &&
      gapSec >= 0 &&
      gapSec <= options.maxContinuationGapSec &&
      wordCount(combinedText) <= options.maxWords &&
      combinedText.length <= options.maxCharacters;

    if (shouldMerge) {
      previous.endSec = Math.max(previous.endSec, phrase.endSec);
      previous.text = combinedText;
    } else {
      merged.push({ ...phrase });
    }
  }

  return merged;
}

export function normalizePracticePhrases(
  phrases: Phrase[],
  options: PracticePhraseOptions = {},
) {
  const resolvedOptions = {
    maxWords: options.maxWords ?? DEFAULT_MAX_WORDS_PER_PRACTICE_PHRASE,
    maxCharacters: options.maxCharacters ?? DEFAULT_MAX_CHARACTERS_PER_PRACTICE_PHRASE,
    maxContinuationGapSec: options.maxContinuationGapSec ?? DEFAULT_MAX_CONTINUATION_GAP_SEC,
  };
  const normalized: Phrase[] = [];
  let buffer = '';
  let bufferStart: number | null = null;
  let bufferEnd = 0;

  const flush = () => {
    const text = buffer.trim().replace(/\s+/g, ' ');
    if (!text) return;

    normalized.push({
      id: normalized.length,
      startSec: bufferStart ?? bufferEnd,
      endSec: bufferEnd,
      text,
    });
    buffer = '';
    bufferStart = null;
  };

  for (const phrase of mergeContinuationPhrases(phrases, resolvedOptions)) {
    const parts = splitPhraseIntoTimedParts(phrase, resolvedOptions);

    for (const part of parts) {
      const nextText = `${buffer} ${part.text}`.trim();
      if (
        buffer &&
        (
          wordCount(nextText) > resolvedOptions.maxWords ||
          nextText.length > resolvedOptions.maxCharacters
        )
      ) {
        flush();
      }

      if (bufferStart === null) {
        bufferStart = part.startSec;
      }

      buffer = `${buffer} ${part.text}`.trim();
      bufferEnd = Math.max(bufferEnd, part.endSec);

      if (
        /[.!?]$/.test(part.text) ||
        wordCount(buffer) >= resolvedOptions.maxWords ||
        buffer.length >= resolvedOptions.maxCharacters
      ) {
        flush();
      }
    }
  }

  flush();

  return normalized.length > 0 ? normalized : phrases;
}
