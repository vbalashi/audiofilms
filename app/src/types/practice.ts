import type { Phrase } from '@/types/subtitles';

export type PracticeTextSourceKind = 'provided-captions' | 'auto-captions' | 'asr';

export type PracticeTimingQuality =
  | 'approximate'
  | 'cue'
  | 'word'
  | 'aligned'
  | 'accepted-cue';

export type PracticeReadinessState = 'no-captions' | 'rough' | 'ready' | 'precise';
export type PracticeDisplayState = PracticeReadinessState | 'improving';
export type PracticeAction = 'get-captions' | 'improve-timing';
export type PracticeOperationKind = 'get-captions' | 'improve-timing' | 'align-text';
export type PracticeOperationState = 'queued' | 'running' | 'succeeded' | 'failed';

export type PracticeTextSource = {
  id: string;
  revisionId: string;
  contentFingerprint: string;
  languageCode: string;
  label: string;
  kind: PracticeTextSourceKind;
  status: 'ready' | 'aligning' | 'failed';
  errorCode?: string;
};

export type PracticeActiveOperation = {
  id: string;
  kind: Extract<PracticeOperationKind, 'get-captions' | 'improve-timing' | 'align-text'>;
  state: Extract<PracticeOperationState, 'queued' | 'running'>;
  progress?: number;
};

export type PracticeSnapshot = {
  snapshotRevisionId: string;
  videoId: string;
  textSource: PracticeTextSource | null;
  availableTextSources: PracticeTextSource[];
  timingEvidence: {
    id: string;
    revisionId: string;
    quality: PracticeTimingQuality;
  } | null;
  phraseSet: {
    id: string;
    revisionId: string;
    phrases: Phrase[];
  } | null;
  readiness: {
    baseState: PracticeReadinessState;
    displayState: PracticeDisplayState;
    availableActions: PracticeAction[];
    recommendedAction?: PracticeAction;
    activeOperation?: PracticeActiveOperation;
    diagnosticFlags?: string[];
  };
};

export type PracticeCaptionsResponse = {
  state: 'ready';
  operation: {
    id: string;
    kind: 'get-captions';
    state: 'succeeded';
  };
  snapshot: PracticeSnapshot;
};

export type PracticeTimingOperationInput = {
  language?: string;
  sourceKind?: string;
  textSource?: string;
  engine?: string;
  model?: string;
  fullAudio?: boolean;
  durationSec?: number;
  snapshotRevisionId?: string;
  textSourceRevisionId?: string;
  timingEvidenceRevisionId?: string;
};

export type PracticeOperation = {
  id: string;
  kind: 'improve-timing';
  state: PracticeOperationState;
  videoId: string;
  input: PracticeTimingOperationInput;
  progress?: number;
  pollUrl: string;
  retryAfterMs: number;
  result?: {
    snapshot?: PracticeSnapshot;
    snapshotRevisionId?: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
    phraseSetRevisionId?: string;
    resultUrl?: string;
    diagnostics?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  diagnostics?: Record<string, unknown>;
};

export type RejectedPracticeOperation = {
  id: null;
  kind: 'improve-timing';
  state: 'failed';
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  retryAfterMs?: number;
};

export type PhraseTranslationStatus = 'missing' | 'pending' | 'ready' | 'failed' | string;

export type PhraseTranslationRequest = {
  phraseId: string;
  sourceText: string;
  sourceLanguageCode: string;
  contextText?: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  targetLanguageCode?: string;
  purpose: string;
};

export type PlatformTextTranslationResponse = {
  translationId?: string;
  status?: string;
  sourceTextHash?: string;
  contextTextHash?: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: string | null;
  detail?: string | null;
};

export type PhraseTranslation = {
  phraseId: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  translationId?: string;
  status: PhraseTranslationStatus;
  sourceTextHash?: string;
  contextTextHash?: string;
  sourceLanguageCode: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: {
    code: string;
    message?: string;
  };
};

export type StoredPhraseTranslationAssociation = PhraseTranslation & {
  purpose: string;
  sourceTextHash?: string;
  contextTextHash?: string;
  createdAt: string;
  updatedAt: string;
};
