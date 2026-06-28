import type {
  DictionaryLookupV2NoMatchResponse,
  DictionaryLookupV2SuccessResponse,
  DictionaryOverlayCardV2,
  DictionarySessionResponse,
} from '@/types/dictionary';
import type {
  PhraseTranslation,
  PracticeOperation,
  PracticeSnapshot,
} from '@/types/practice';

const baseCard = {
  id: 'entry:lopen',
  entryId: 'entry:lopen',
  cardTypeId: 'word-to-definition',
  clickedForm: 'loopt',
  headword: 'lopen',
  language: 'nl',
  meaningId: 1,
  partOfSpeech: 'verb',
  match: {
    matchedForm: 'loopt',
    relation: 'inflection',
  },
  contentFingerprint: 'content:lopen:v1',
  chips: [
    { kind: 'part-of-speech', label: 'verb' },
  ],
  summary: {
    definition: 'to walk; to run',
    example: 'Hij loopt naar huis.',
  },
  sections: [
    {
      id: 'meaning-0',
      sourcePath: 'content.sections.0',
      kind: 'meaning',
      text: 'to walk; to run',
      translation: 'идти; бежать',
    },
    {
      id: 'example-0',
      sourcePath: 'content.sections.1',
      kind: 'example',
      text: 'Hij loopt naar huis.',
      translation: 'Он идет домой.',
    },
  ],
  dictionary: {
    id: 'dict:nl-core',
    slug: 'nl-core',
    name: '2000NL Core',
    kind: 'platform',
  },
} satisfies Omit<DictionaryOverlayCardV2, 'progress' | 'displayActions'>;

export const guestLookupFixture = {
  contractVersion: 'dict-lookup-v2',
  clickedForm: 'loopt',
  query: 'loopt',
  result: {
    word: 'lopen',
    language: 'nl',
    definition: 'to walk; to run',
    context: 'Hij loopt naar huis.',
  },
  definitions: ['to walk; to run'],
  cards: [
    {
      ...baseCard,
      progress: null,
      displayActions: [
        {
          id: 'translate',
          label: 'Translate',
          group: 'translation',
          command: { kind: 'card-translation' },
        },
      ],
    },
  ],
  meta: {
    provider: '2000nl',
    fallbackUsed: false,
    responseVersion: 'overlay-v2',
  },
} satisfies DictionaryLookupV2SuccessResponse;

export const connectedLearningLookupFixture = {
  ...guestLookupFixture,
  cards: [
    {
      ...baseCard,
      progress: {
        phase: 'learning',
        seenCount: 3,
        lastSeenAt: '2026-06-18T09:15:00.000Z',
      },
      displayActions: [
        {
          id: 'again',
          label: 'Again',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'fail',
            turnIdRequired: true,
          },
        },
        {
          id: 'hard',
          label: 'Hard',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'hard',
            turnIdRequired: true,
          },
        },
        {
          id: 'good',
          label: 'Good',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'success',
            turnIdRequired: true,
          },
        },
        {
          id: 'easy',
          label: 'Easy',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'easy',
            turnIdRequired: true,
          },
        },
        {
          id: 'translate',
          label: 'Translate',
          group: 'translation',
          command: { kind: 'card-translation' },
        },
      ],
    },
  ],
} satisfies DictionaryLookupV2SuccessResponse;

export const connectedReviewingLookupFixture = {
  ...connectedLearningLookupFixture,
  cards: [
    {
      ...connectedLearningLookupFixture.cards[0],
      progress: {
        phase: 'reviewing',
        seenCount: 7,
        lastSeenAt: '2026-06-17T18:05:00.000Z',
      },
    },
  ],
} satisfies DictionaryLookupV2SuccessResponse;

export const noMatchLookupFixture = {
  contractVersion: 'dict-lookup-v2',
  clickedForm: 'zzzz',
  query: 'zzzz',
  cards: [],
  error: 'no_match',
  code: 'no_match',
  meta: {
    provider: '2000nl',
    responseVersion: 'overlay-v2',
  },
} satisfies DictionaryLookupV2NoMatchResponse;

export const hiddenFrozenNoActionsCardsFixture = [
  {
    ...baseCard,
    id: 'entry:hidden',
    progress: {
      phase: 'hidden',
      seenCount: 4,
      lastSeenAt: '2026-06-14T12:00:00.000Z',
    },
    displayActions: [
      {
        id: 'translate',
        label: 'Translate',
        group: 'translation',
        command: { kind: 'card-translation' },
      },
    ],
  },
  {
    ...baseCard,
    id: 'entry:frozen',
    progress: {
      phase: 'frozen',
      seenCount: 5,
      lastSeenAt: '2026-06-16T08:30:00.000Z',
      frozenUntil: '2026-06-20T08:30:00.000Z',
    },
    displayActions: [
      {
        id: 'translate',
        label: 'Translate',
        group: 'translation',
        command: { kind: 'card-translation' },
      },
    ],
  },
] satisfies DictionaryOverlayCardV2[];

export const phraseTranslationReadyFixture = {
  phraseId: 'phrase-2',
  phraseSetRevisionId: 'phrase-set:abc123',
  snapshotRevisionId: 'practice-snapshot:def456',
  translationId: 'translation:ready',
  status: 'ready',
  sourceTextHash: 'sha256:source',
  contextTextHash: 'sha256:context',
  sourceLanguageCode: 'nl',
  targetLanguageCode: 'ru',
  translatedText: 'Он идет домой.',
  translationPolicyVersion: 'text-translation-v1',
  cached: true,
} satisfies PhraseTranslation;

export const phraseTranslationFailedFixture = {
  phraseId: 'phrase-3',
  phraseSetRevisionId: 'phrase-set:abc123',
  snapshotRevisionId: 'practice-snapshot:def456',
  translationId: 'translation:failed',
  status: 'failed',
  sourceLanguageCode: 'nl',
  targetLanguageCode: 'ru',
  error: {
    code: 'text_translation_failed',
    message: 'Translation provider failed.',
  },
} satisfies PhraseTranslation;

export const roughPracticeSnapshotFixture = {
  snapshotRevisionId: 'practice-snapshot:rough',
  videoId: 'dQw4w9WgXcQ',
  textSource: {
    id: 'text-source:rough',
    revisionId: 'text-source:rough-rev',
    contentFingerprint: 'text-content:rough',
    languageCode: 'nl',
    label: 'NL auto-captions',
    kind: 'auto-captions',
    status: 'ready',
  },
  availableTextSources: [
    {
      id: 'text-source:rough',
      revisionId: 'text-source:rough-rev',
      contentFingerprint: 'text-content:rough',
      languageCode: 'nl',
      label: 'NL auto-captions',
      kind: 'auto-captions',
      status: 'ready',
    },
  ],
  timingEvidence: {
    id: 'timing-evidence:rough',
    revisionId: 'timing-evidence:rough-rev',
    quality: 'approximate',
  },
  phraseSet: {
    id: 'phrase-set:nl',
    revisionId: 'phrase-set:rough',
    phrases: [{ id: 0, startSec: 1.2, endSec: 4.4, text: 'Hij loopt naar huis.' }],
  },
  readiness: {
    baseState: 'rough',
    displayState: 'rough',
    availableActions: ['get-captions', 'improve-timing'],
    recommendedAction: 'improve-timing',
    diagnosticFlags: ['timing-approximate', 'rolling-caption'],
  },
} satisfies PracticeSnapshot;

export const precisePracticeSnapshotFixture = {
  ...roughPracticeSnapshotFixture,
  snapshotRevisionId: 'practice-snapshot:precise',
  timingEvidence: {
    id: 'timing-evidence:precise',
    revisionId: 'timing-evidence:precise-rev',
    quality: 'word',
  },
  readiness: {
    baseState: 'precise',
    displayState: 'precise',
    availableActions: [],
    diagnosticFlags: ['timing-word-level'],
  },
} satisfies PracticeSnapshot;

export const runningPracticeOperationFixture = {
  id: 'timing:job-running',
  kind: 'improve-timing',
  state: 'running',
  videoId: 'dQw4w9WgXcQ',
  input: {
    language: 'nl',
    sourceKind: 'auto',
    snapshotRevisionId: 'practice-snapshot:rough',
    textSourceRevisionId: 'text-source:rough-rev',
    timingEvidenceRevisionId: 'timing-evidence:rough-rev',
  },
  pollUrl: 'http://localhost:3000/api/practice/operations/timing%3Ajob-running',
  retryAfterMs: 3000,
} satisfies PracticeOperation;

export const succeededPracticeOperationFixture = {
  ...runningPracticeOperationFixture,
  id: 'timing:job-succeeded',
  state: 'succeeded',
  pollUrl: 'http://localhost:3000/api/practice/operations/timing%3Ajob-succeeded',
  result: {
    snapshot: precisePracticeSnapshotFixture,
    snapshotRevisionId: precisePracticeSnapshotFixture.snapshotRevisionId,
    textSourceRevisionId: precisePracticeSnapshotFixture.textSource?.revisionId,
    timingEvidenceRevisionId: precisePracticeSnapshotFixture.timingEvidence?.revisionId,
    phraseSetRevisionId: precisePracticeSnapshotFixture.phraseSet?.revisionId,
    applicability: {
      appliesToCurrentSnapshot: true,
      requestedSnapshotRevisionId: 'practice-snapshot:rough',
      requestedTextSourceRevisionId: 'text-source:rough-rev',
      requestedTimingEvidenceRevisionId: 'timing-evidence:rough-rev',
      resultSnapshotRevisionId: precisePracticeSnapshotFixture.snapshotRevisionId,
      resultTextSourceRevisionId: precisePracticeSnapshotFixture.textSource?.revisionId,
      resultTimingEvidenceRevisionId: precisePracticeSnapshotFixture.timingEvidence?.revisionId,
      diagnostics: [
        'Requested timing evidence revision is an input baseline; the result timing evidence revision is a new output and is not a stale check.',
      ],
    },
    diagnostics: {
      asrJobId: 'job-succeeded',
      completedAt: '2026-06-18T09:20:00.000Z',
    },
  },
} satisfies PracticeOperation;

export const authenticatedSessionFixture = {
  authenticated: true,
  user: {
    id: 'user:123',
    email: 'learner@example.com',
  },
  preferences: {
    translationTargetLanguageCode: 'ru',
    source: 'user-setting',
    updatedAt: '2026-06-18T09:00:00.000Z',
  },
} satisfies DictionarySessionResponse;

export const guestSessionFixture = {
  authenticated: false,
  user: null,
  preferences: null,
} satisfies DictionarySessionResponse;
