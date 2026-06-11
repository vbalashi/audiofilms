import type { Phrase } from '@/types/subtitles';

export const DEFAULT_MAX_WORDS_PER_PRACTICE_PHRASE = 18;
export const DEFAULT_MAX_CHARACTERS_PER_PRACTICE_PHRASE = 140;

export type PracticePhraseOptions = {
  maxWords?: number;
  maxCharacters?: number;
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

export function normalizePracticePhrases(
  phrases: Phrase[],
  options: PracticePhraseOptions = {},
) {
  const resolvedOptions = {
    maxWords: options.maxWords ?? DEFAULT_MAX_WORDS_PER_PRACTICE_PHRASE,
    maxCharacters: options.maxCharacters ?? DEFAULT_MAX_CHARACTERS_PER_PRACTICE_PHRASE,
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

  for (const phrase of phrases) {
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
