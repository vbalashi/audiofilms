import { createHash } from 'node:crypto';
import type {
  Phrase,
  SubtitleQualityFlag,
  SubtitleResponse,
  SubtitleSourceKind,
} from '@/types/subtitles';
import type {
  PracticeActiveOperation,
  PracticeTextSource,
  PracticeSnapshot,
  PracticeTextSourceKind,
  PracticeTimingQuality,
} from '@/types/practice';
import { normalizePracticePhrases } from '@/lib/practice/phrases';

export type {
  PracticeAction,
  PracticeActiveOperation,
  PracticeDisplayState,
  PracticeReadinessState,
  PracticeSnapshot,
  PracticeTextSource,
  PracticeTextSourceKind,
  PracticeTimingQuality,
} from '@/types/practice';

type BuildPracticeSnapshotOptions = {
  videoId: string;
  requestedLanguage: string;
  activeOperation?: PracticeActiveOperation;
  availableTextSources?: PracticeTextSource[];
};

const ROUGH_TIMING_FLAGS = new Set<SubtitleQualityFlag>([
  'duplicate-cues',
  'overlap-cues',
  'inferred-end',
  'long-cues',
  'rolling-caption',
]);

const ROUGH_SOURCE_FLAGS = new Set<SubtitleQualityFlag>([
  'source-kind-unverified',
  'source-kind-mismatch',
  'source-unverified',
  'language-mismatch',
]);

export function buildPracticeSnapshot(
  response: SubtitleResponse,
  options: BuildPracticeSnapshotOptions,
): PracticeSnapshot {
  const languageCode = response.language || options.requestedLanguage || 'auto';
  const phrases = usablePracticePhrases(response);
  const textSource = phrases.length
    ? buildTextSource(response, options.videoId, languageCode)
    : null;
  const timingEvidence =
    phrases.length && textSource
      ? buildTimingEvidence(response, options.videoId, textSource.revisionId)
      : null;
  const phraseSet = phrases.length
    ? buildPhraseSet(options.videoId, languageCode, phrases)
    : null;
  const readiness = applyActiveOperationOverlay(
    derivePracticeReadiness(response, phrases, timingEvidence),
    options.activeOperation,
  );
  const revisionPayload = {
    videoId: options.videoId,
    textSourceRevisionId: textSource?.revisionId || null,
    timingEvidenceRevisionId: timingEvidence?.revisionId || null,
    phraseSetRevisionId: phraseSet?.revisionId || null,
    readiness: readiness.baseState,
    displayState: readiness.displayState,
    activeOperation: readiness.activeOperation || null,
  };

  return {
    snapshotRevisionId: revisionId('practice-snapshot', revisionPayload),
    videoId: options.videoId,
    textSource,
    availableTextSources: mergeTextSources(textSource, options.availableTextSources),
    timingEvidence,
    phraseSet,
    readiness,
  };
}

function usablePracticePhrases(response: SubtitleResponse): Phrase[] {
  const phrases = response.practicePhrases?.length
    ? response.practicePhrases
    : response.phrases;

  return normalizePracticePhrases(phrases).filter(
    (phrase) =>
      phrase.text.trim().length > 0 &&
      Number.isFinite(phrase.startSec) &&
      Number.isFinite(phrase.endSec) &&
      phrase.endSec >= phrase.startSec,
  );
}

export function practiceTextSourceFromSubtitleResponse(
  response: SubtitleResponse,
  videoId: string,
  languageCode: string,
): PracticeTextSource {
  const provider = response.meta?.provider || 'subtitle-service';
  const sourceKind = response.meta?.sourceKind || 'unknown';
  const retrievalPath = response.meta?.retrievalPath || provider;
  const kind = practiceTextSourceKind(sourceKind, retrievalPath);
  const contentFingerprint = revisionId(
    'text-content',
    response.phrases.map((phrase) => phrase.text),
  );
  const revisionPayload = {
    videoId,
    languageCode,
    provider,
    sourceKind,
    retrievalPath,
    contentFingerprint,
  };
  const sourceKey = safeId(`${videoId}:${languageCode}:${kind}:${provider}:${sourceKind}`);

  return {
    id: `text-source:${sourceKey}`,
    revisionId: revisionId('text-source', revisionPayload),
    contentFingerprint,
    languageCode,
    label: textSourceLabel(kind, languageCode),
    kind,
    status: 'ready',
  };
}

function buildTextSource(
  response: SubtitleResponse,
  videoId: string,
  languageCode: string,
): NonNullable<PracticeSnapshot['textSource']> {
  return practiceTextSourceFromSubtitleResponse(response, videoId, languageCode);
}

function mergeTextSources(
  activeSource: PracticeTextSource | null,
  inventory: PracticeTextSource[] | undefined,
): PracticeTextSource[] {
  const byRevision = new Map<string, PracticeTextSource>();
  for (const source of [activeSource, ...(inventory || [])]) {
    if (!source) continue;
    byRevision.set(source.revisionId, source);
  }
  return Array.from(byRevision.values());
}

function buildTimingEvidence(
  response: SubtitleResponse,
  videoId: string,
  textSourceRevisionId: string,
): NonNullable<PracticeSnapshot['timingEvidence']> {
  const quality = timingQuality(response);
  const revisionPayload = {
    videoId,
    textSourceRevisionId,
    quality,
    timingExactness: response.meta?.timingExactness || 'exact',
    qualityFlags: response.meta?.qualityFlags || [],
    retrievalPath: response.meta?.retrievalPath || response.meta?.provider || 'subtitle-service',
  };

  return {
    id: `timing-evidence:${safeId(`${videoId}:${quality}:${response.meta?.retrievalPath || 'subtitles'}`)}`,
    revisionId: revisionId('timing-evidence', revisionPayload),
    quality,
  };
}

function buildPhraseSet(
  videoId: string,
  languageCode: string,
  phrases: Phrase[],
): NonNullable<PracticeSnapshot['phraseSet']> {
  const revisionPayload = {
    videoId,
    languageCode,
    phrases: phrases.map((phrase) => ({
      startSec: roundTime(phrase.startSec),
      endSec: roundTime(phrase.endSec),
      text: phrase.text,
    })),
  };
  const revision = revisionId('phrase-set', revisionPayload);

  return {
    id: `phrase-set:${safeId(`${videoId}:${languageCode}`)}`,
    revisionId: revision,
    phrases: phrases.map((phrase, index) => ({ ...phrase, id: index })),
  };
}

function derivePracticeReadiness(
  response: SubtitleResponse,
  phrases: Phrase[],
  timingEvidence: PracticeSnapshot['timingEvidence'],
): PracticeSnapshot['readiness'] {
  const diagnosticFlags = diagnosticReadinessFlags(response);

  if (!phrases.length || !timingEvidence) {
    return {
      baseState: 'no-captions',
      displayState: 'no-captions',
      availableActions: ['get-captions'],
      recommendedAction: 'get-captions',
      diagnosticFlags,
    };
  }

  if (isRough(response, timingEvidence.quality)) {
    return {
      baseState: 'rough',
      displayState: 'rough',
      availableActions: ['get-captions', 'improve-timing'],
      recommendedAction: 'improve-timing',
      diagnosticFlags,
    };
  }

  if (
    timingEvidence.quality === 'word' ||
    timingEvidence.quality === 'aligned' ||
    timingEvidence.quality === 'accepted-cue'
  ) {
    return {
      baseState: 'precise',
      displayState: 'precise',
      availableActions: [],
      diagnosticFlags,
    };
  }

  return {
    baseState: 'ready',
    displayState: 'ready',
    availableActions: ['improve-timing'],
    recommendedAction: 'improve-timing',
    diagnosticFlags,
  };
}

function applyActiveOperationOverlay(
  readiness: PracticeSnapshot['readiness'],
  activeOperation?: PracticeActiveOperation,
): PracticeSnapshot['readiness'] {
  if (!activeOperation) return readiness;

  return {
    ...readiness,
    displayState:
      activeOperation.kind === 'get-captions'
        ? readiness.displayState
        : 'improving',
    activeOperation,
  };
}

function practiceTextSourceKind(
  sourceKind: SubtitleSourceKind,
  retrievalPath: string,
): PracticeTextSourceKind {
  const normalizedPath = retrievalPath.toLowerCase();
  if (sourceKind === 'manual') return 'provided-captions';
  if (sourceKind === 'auto') return 'auto-captions';
  if (normalizedPath.includes('asr')) return 'asr';
  return 'auto-captions';
}

function timingQuality(response: SubtitleResponse): PracticeTimingQuality {
  const exactness = response.meta?.timingExactness || 'exact';
  const sourceKind = response.meta?.sourceKind || 'unknown';
  const retrievalPath = (response.meta?.retrievalPath || '').toLowerCase();

  if (exactness === 'word-level') return 'word';
  if (retrievalPath.includes('align')) return 'aligned';
  if (exactness === 'approximate' || exactness === 'inferred-end') return 'approximate';
  if (sourceKind === 'manual' && exactness === 'exact') return 'accepted-cue';
  return 'cue';
}

function isRough(response: SubtitleResponse, quality: PracticeTimingQuality): boolean {
  const flags = response.meta?.qualityFlags || [];

  return (
    quality === 'approximate' ||
    response.meta?.sourceKind === 'transcript-panel' ||
    flags.some((flag) => ROUGH_TIMING_FLAGS.has(flag) || ROUGH_SOURCE_FLAGS.has(flag))
  );
}

function diagnosticReadinessFlags(response: SubtitleResponse): string[] {
  return Array.from(
    new Set(
      [
        response.meta?.fallbackUsed ? 'fallback-used' : '',
        response.meta?.cacheStatus ? `cache-${response.meta.cacheStatus}` : '',
        response.meta?.sourceKind ? `source-${response.meta.sourceKind}` : '',
        response.meta?.timingExactness ? `timing-${response.meta.timingExactness}` : '',
        ...(response.meta?.qualityFlags || []),
      ].filter(Boolean),
    ),
  );
}

function textSourceLabel(kind: PracticeTextSourceKind, languageCode: string): string {
  const language = languageCode === 'auto' ? 'Detected' : languageCode.toUpperCase();

  if (kind === 'provided-captions') return `${language} captions`;
  if (kind === 'asr') return `${language} ASR transcript`;
  return `${language} auto-captions`;
}

function revisionId(prefix: string, payload: unknown): string {
  return `${prefix}:${createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16)}`;
}

function safeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}
