import type { Phrase } from '@/types/subtitles';

export const DEFAULT_MAX_WORDS_PER_PRACTICE_PHRASE = 18;
export const DEFAULT_MAX_CHARACTERS_PER_PRACTICE_PHRASE = 140;
export const DEFAULT_MAX_CONTINUATION_GAP_SEC = 0.85;

export type PracticePhraseOptions = {
  maxWords?: number;
  maxCharacters?: number;
  maxContinuationGapSec?: number;
};

export function wordCount(text: string) {
  const matches = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function splitLongText(text: string, options: Required<PracticePhraseOptions>) {
  const words = normalizeEllipsisContinuations(text).trim().split(/\s+/).filter(Boolean);
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
  mergeShortTrailingChunk(chunks, options);
  return chunks.length > 0 ? chunks : [text];
}

function partRangesInDisplayText(displayText: string, parts: string[]) {
  const ranges: Array<{ text: string; start: number; end: number }> = [];
  let cursor = 0;

  for (const part of parts) {
    const cleanPart = part.trim();
    const start = displayText.indexOf(cleanPart, cursor);
    const resolvedStart = start >= 0 ? start : cursor;
    const resolvedEnd = resolvedStart + cleanPart.length;
    ranges.push({ text: cleanPart, start: resolvedStart, end: resolvedEnd });
    cursor = resolvedEnd;
  }

  return ranges;
}

function mergeShortTrailingChunk(
  chunks: string[],
  options: Required<PracticePhraseOptions>,
) {
  if (chunks.length < 2) return;

  const tail = chunks.at(-1) || '';
  if (wordCount(tail) > 3) return;

  const previous = chunks[chunks.length - 2];
  const combined = `${previous} ${tail}`.trim().replace(/\s+/g, ' ');
  if (
    wordCount(combined) <= options.maxWords + 2 &&
    combined.length <= options.maxCharacters
  ) {
    chunks.splice(chunks.length - 2, 2, combined);
  }
}

function splitPhraseIntoTimedParts(
  phrase: Phrase,
  options: Required<PracticePhraseOptions>,
): Phrase[] {
  const text = normalizeHyphenatedNumericNames(
    normalizeEllipsisContinuations(phrase.text).trim().replace(/\s+/g, ' '),
  );
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

    if (
      (
        isShortNumericSuffix(cleanPart.split(/\s+/).at(-1) || '') ||
        hasShortHyphenatedNumericSuffix(cleanPart)
      ) &&
      wordCount(cleanPart) <= options.maxWords + 2 &&
      cleanPart.length <= options.maxCharacters
    ) {
      return [cleanPart];
    }

    return splitLongText(cleanPart, options);
  });

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
  const displayRanges = partRangesInDisplayText(text, parts);
  let elapsed = 0;

  return displayRanges.map((range, index) => {
    const isLast = index === parts.length - 1;
    const partDuration = isLast
      ? duration - elapsed
      : totalChars > 0
        ? duration * (range.text.length / totalChars)
        : 0;
    const startSec = phrase.startSec + elapsed;
    const endSec = isLast ? phrase.endSec : startSec + partDuration;

    elapsed += partDuration;

    return {
      ...(parts.length === 1 ? phrase : {}),
      id: index,
      startSec,
      endSec,
      text: range.text,
      ...(parts.length > 1
        ? {
            displayText: text,
            translationText: text,
            displayStartChar: range.start,
            displayEndChar: range.end,
            displaySegmentId: `${phrase.id ?? 'phrase'}:${Math.round(phrase.startSec * 1000)}-${Math.round(phrase.endSec * 1000)}`,
            segmentRole: 'sentence-segment' as const,
            timingFlags: [
              ...new Set([...(phrase.timingFlags || []), 'segmented-sentence-replay']),
            ],
          }
        : {}),
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

function normalizeEllipsisContinuations(text: string) {
  return text
    .replace(/\s*(?:\.\.\.|…)\s*(?=\p{Ll})/gu, ' ')
    .replace(/^(?:\.\.\.|…)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHyphenatedNumericNames(text: string) {
  return text.replace(/\b(TRAPPIST|Trappist)\s+(\d{1,3})(?=[.!?]?(?:\s|$))/g, '$1-$2');
}

function startsWithContinuationCue(text: string) {
  const cleanText = text.trim();
  if (/^(?:\.\.\.|…)/.test(cleanText)) return true;

  const firstLetter = cleanText.match(/\p{L}/u)?.[0];
  return Boolean(firstLetter && firstLetter === firstLetter.toLocaleLowerCase());
}

function isShortNumericSuffix(text: string) {
  return /^\d{1,3}[.!?]?$/.test(text.trim());
}

function hasShortHyphenatedNumericSuffix(text: string) {
  return /[\p{L}]-\d{1,3}[.!?]?$/u.test(text.trim());
}

function shouldKeepShortSuffixWithBuffer(
  buffer: string,
  part: Phrase,
  bufferEnd: number,
  options: Required<PracticePhraseOptions>,
) {
  if (!buffer || !isShortNumericSuffix(part.text) || /[.!?]$/.test(buffer.trim())) {
    return false;
  }

  const gapSec = part.startSec - bufferEnd;
  const combinedText = joinPracticeText(buffer, part.text);
  return (
    Number.isFinite(gapSec) &&
    gapSec >= 0 &&
    gapSec <= options.maxContinuationGapSec &&
    wordCount(combinedText) <= options.maxWords + 2 &&
    combinedText.length <= options.maxCharacters
  );
}

function shouldMergeShortNumericSuffix(
  previous: Phrase,
  next: Phrase,
  options: Required<PracticePhraseOptions>,
) {
  const previousText = previous.text.trim();
  const nextText = next.text.trim();
  if (!previousText || !isShortNumericSuffix(nextText) || /[.!?]$/.test(previousText)) {
    return false;
  }

  const gapSec = next.startSec - previous.endSec;
  const combinedText = joinPracticeText(previousText, nextText);
  return (
    Number.isFinite(gapSec) &&
    gapSec >= 0 &&
    gapSec <= options.maxContinuationGapSec &&
    wordCount(combinedText) <= options.maxWords + 2 &&
    combinedText.length <= options.maxCharacters
  );
}

function shouldMergeShortSentenceTail(
  previous: Phrase,
  next: Phrase,
  options: Required<PracticePhraseOptions>,
) {
  const previousText = previous.text.trim();
  const nextText = next.text.trim();
  if (
    !previousText ||
    !nextText ||
    /[.!?]$/.test(previousText) ||
    !/[.!?]$/.test(nextText) ||
    wordCount(nextText) > 3
  ) {
    return false;
  }

  const gapSec = next.startSec - previous.endSec;
  const combinedText = joinPracticeText(previousText, nextText);
  return (
    Number.isFinite(gapSec) &&
    gapSec >= 0 &&
    gapSec <= options.maxContinuationGapSec &&
    wordCount(combinedText) <= options.maxWords + 2 &&
    combinedText.length <= options.maxCharacters
  );
}

function cleanContinuationSegmentText(phrase: Phrase, index: number) {
  const withoutTrailing = stripTrailingEllipsis(phrase.text);
  const clean = index === 0 ? withoutTrailing : stripLeadingEllipsis(withoutTrailing);
  return clean.trim().replace(/\s+/g, ' ');
}

function continuationGroupDisplayText(group: Phrase[]) {
  return group
    .map((phrase, index) => cleanContinuationSegmentText(phrase, index))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldKeepContinuationGroupAsReplaySegments(
  group: Phrase[],
  displayText: string,
  options: Required<PracticePhraseOptions>,
) {
  if (group.length >= 3) return true;
  if (
    wordCount(displayText) > options.maxWords ||
    displayText.length > options.maxCharacters
  ) {
    return true;
  }

  const meaningfulSegments = group.filter(
    (phrase, index) => wordCount(cleanContinuationSegmentText(phrase, index)) >= 7,
  );
  const combinedDuration = Math.max(...group.map((phrase) => phrase.endSec)) - group[0].startSec;
  return meaningfulSegments.length >= 2 && combinedDuration >= 6;
}

function applySegmentedSentenceGroupContext(group: Phrase[], displayText: string) {
  const segmentId = `continuation:${group[0].id ?? 'phrase'}:${Math.round(group[0].startSec * 1000)}-${Math.round(group.at(-1)!.endSec * 1000)}`;
  let cursor = 0;

  return group.map((phrase, index) => {
    const text = cleanContinuationSegmentText(phrase, index);
    const start = displayText.indexOf(text, cursor);
    const displayStartChar = start >= 0 ? start : cursor;
    const displayEndChar = displayStartChar + text.length;
    cursor = displayEndChar;

    return {
      ...phrase,
      text,
      displayText,
      translationText: displayText,
      displayStartChar,
      displayEndChar,
      displaySegmentId: segmentId,
      segmentRole: 'sentence-segment' as const,
      timingFlags: [
        ...new Set([...(phrase.timingFlags || []), 'segmented-sentence-replay']),
      ],
    };
  });
}

function continuationGapOk(previous: Phrase, next: Phrase, maxContinuationGapSec: number) {
  const gapSec = next.startSec - previous.endSec;
  return Number.isFinite(gapSec) && gapSec >= 0 && gapSec <= maxContinuationGapSec;
}

function isEllipsisContinuation(previous: Phrase, next: Phrase, options: Required<PracticePhraseOptions>) {
  return (
    hasTrailingEllipsis(previous.text) &&
    startsWithContinuationCue(next.text) &&
    continuationGapOk(previous, next, options.maxContinuationGapSec)
  );
}

function resolveEllipsisContinuationGroups(
  phrases: Phrase[],
  options: Required<PracticePhraseOptions>,
) {
  const resolved: Phrase[] = [];

  for (let index = 0; index < phrases.length; index += 1) {
    const group = [{ ...phrases[index] }];

    while (
      index + 1 < phrases.length &&
      isEllipsisContinuation(group.at(-1)!, phrases[index + 1], options)
    ) {
      index += 1;
      group.push({ ...phrases[index] });
    }

    if (group.length === 1) {
      resolved.push(group[0]);
      continue;
    }

    const displayText = continuationGroupDisplayText(group);
    if (!shouldKeepContinuationGroupAsReplaySegments(group, displayText, options)) {
      resolved.push({
        ...group[0],
        endSec: group.at(-1)!.endSec,
        text: displayText,
      });
      continue;
    }

    resolved.push(...applySegmentedSentenceGroupContext(group, displayText));
  }

  return resolved;
}

function joinPracticeText(left: string, right: string) {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  if (!cleanLeft) return cleanRight;
  if (!cleanRight) return cleanLeft;

  if (isShortNumericSuffix(cleanRight) && /\p{L}$/u.test(cleanLeft)) {
    return `${cleanLeft}-${cleanRight}`.replace(/\s+/g, ' ').trim();
  }

  return `${cleanLeft} ${cleanRight}`.replace(/\s+/g, ' ').trim();
}

function mergeContinuationPhrases(
  phrases: Phrase[],
  options: Required<PracticePhraseOptions>,
) {
  const merged: Phrase[] = [];

  for (const phrase of resolveEllipsisContinuationGroups(phrases, options)) {
    const previous = merged.at(-1);

    if (!previous) {
      merged.push({ ...phrase });
      continue;
    }

    if (shouldMergeShortNumericSuffix(previous, phrase, options)) {
      previous.endSec = Math.max(previous.endSec, phrase.endSec);
      previous.text = joinPracticeText(previous.text, phrase.text);
      continue;
    }

    if (shouldMergeShortSentenceTail(previous, phrase, options)) {
      previous.endSec = Math.max(previous.endSec, phrase.endSec);
      previous.text = joinPracticeText(previous.text, phrase.text);
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
      merged.push({
        ...phrase,
        text: hasTrailingEllipsis(previous.text) ? stripLeadingEllipsis(phrase.text) : phrase.text,
      });
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
  let bufferSource: Phrase | null = null;
  let bufferPartCount = 0;

  const flush = () => {
    const text = buffer.trim().replace(/\s+/g, ' ');
    if (!text) return;

    normalized.push({
      ...(bufferPartCount === 1 && bufferSource ? phrasePlaybackMetadata(bufferSource) : {}),
      id: normalized.length,
      startSec: bufferStart ?? bufferEnd,
      endSec: bufferEnd,
      text,
    });
    buffer = '';
    bufferStart = null;
    bufferSource = null;
    bufferPartCount = 0;
  };

  for (const phrase of mergeContinuationPhrases(phrases, resolvedOptions)) {
    const parts = splitPhraseIntoTimedParts(phrase, resolvedOptions);

    for (const part of parts) {
      if (part.segmentRole === 'sentence-segment') {
        flush();
        normalized.push({
          ...phrasePlaybackMetadata(part),
          id: normalized.length,
          startSec: part.startSec,
          endSec: part.endSec,
          text: part.text.trim().replace(/\s+/g, ' '),
        });
        continue;
      }

      let nextText = joinPracticeText(buffer, part.text);
      if (
        buffer &&
        !shouldKeepShortSuffixWithBuffer(buffer, part, bufferEnd, resolvedOptions) &&
        (
          wordCount(nextText) > resolvedOptions.maxWords ||
          nextText.length > resolvedOptions.maxCharacters
        )
      ) {
        flush();
        nextText = joinPracticeText(buffer, part.text);
      }

      if (bufferStart === null) {
        bufferStart = part.startSec;
        bufferSource = part;
      }

      buffer = nextText;
      bufferEnd = Math.max(bufferEnd, part.endSec);
      bufferPartCount += 1;

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

function phrasePlaybackMetadata(phrase: Phrase): Partial<Phrase> {
  return {
    ...(phrase.displayText ? { displayText: phrase.displayText } : {}),
    ...(phrase.displayStartChar !== undefined ? { displayStartChar: phrase.displayStartChar } : {}),
    ...(phrase.displayEndChar !== undefined ? { displayEndChar: phrase.displayEndChar } : {}),
    ...(phrase.translationText ? { translationText: phrase.translationText } : {}),
    ...(phrase.displaySegmentId ? { displaySegmentId: phrase.displaySegmentId } : {}),
    ...(phrase.segmentRole ? { segmentRole: phrase.segmentRole } : {}),
    ...(phrase.playbackStartSec !== undefined ? { playbackStartSec: phrase.playbackStartSec } : {}),
    ...(phrase.timingFlags?.length ? { timingFlags: [...phrase.timingFlags] } : {}),
    ...(phrase.wordTimings?.length ? { wordTimings: phrase.wordTimings.map((word) => ({ ...word })) } : {}),
  };
}
