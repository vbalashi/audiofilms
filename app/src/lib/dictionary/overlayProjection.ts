import type {
  DictionaryLookupV2NoMatchResponse,
  DictionaryLookupV2SuccessResponse,
  DictionaryOverlayCardV2,
  DictionaryOverlayCardV2Section,
} from '@/types/dictionary';

export const DICTIONARY_OVERLAY_CARD_TYPE_ID = 'word-to-definition';

type OverlayChip = DictionaryOverlayCardV2['chips'][number];
type OverlayDisplayAction = DictionaryOverlayCardV2['displayActions'][number];
type OverlayMatchRelation = NonNullable<DictionaryOverlayCardV2['match']>['relation'];
type OverlayProgressPhase = NonNullable<DictionaryOverlayCardV2['progress']>['phase'];
type OverlaySectionKind = DictionaryOverlayCardV2Section['kind'];
type OverlayTranslation = NonNullable<DictionaryOverlayCardV2['translation']>;
type OverlayTranslationStatus = OverlayTranslation['status'];

export type PlatformCardCapabilities = {
  phase?: string;
  actions?: string[];
  reviewResults?: string[];
  frozenUntil?: string | null;
};

export type PlatformLookupItem = {
  entry?: {
    id?: string;
    dictionaryId?: string | null;
    languageCode?: string | null;
    headword?: string | null;
    partOfSpeech?: string | null;
    gender?: string | null;
    content?: Record<string, unknown> | null;
    contentFingerprint?: string | null;
  } | null;
  dictionary?: {
    id?: string;
    slug?: string;
    name?: string;
    kind?: string;
  } | null;
  match?: {
    queriedForm?: string;
    matchedForm?: string;
    relation?: string;
  } | null;
  cardCapabilitiesByType?: Record<string, PlatformCardCapabilities>;
  userStateByCardType?: Record<string, {
    seenCount?: number;
    lastSeenAt?: string;
    frozenUntil?: string;
  } | unknown>;
};

export type PlatformLookupResponse = {
  query?: string;
  request?: unknown;
  items?: PlatformLookupItem[];
  error?: string;
  detail?: string;
};

export function projectDictionaryLookupV2Response(
  platformBody: PlatformLookupResponse | null,
  clickedForm: string,
  sourceLanguageCode: string,
  contextText: string | undefined,
  options: { allowProgressActions: boolean },
): DictionaryLookupV2SuccessResponse | DictionaryLookupV2NoMatchResponse {
  const cards: DictionaryOverlayCardV2[] = (platformBody?.items || []).map((item, index) =>
    projectOverlayCard(item, clickedForm, sourceLanguageCode, index, options),
  );

  if (!cards.length) {
    return {
      contractVersion: 'dict-lookup-v2',
      clickedForm,
      query: platformBody?.query || clickedForm,
      cards: [],
      error: 'no_match',
      code: 'no_match',
      meta: { provider: '2000nl', responseVersion: 'overlay-v2' },
    };
  }

  const firstCard = cards[0];
  return {
    contractVersion: 'dict-lookup-v2',
    clickedForm,
    query: platformBody?.query || clickedForm,
    result: {
      word: firstCard.headword,
      language: firstCard.language || sourceLanguageCode,
      definition: firstCard.summary.definition,
      context: contextText,
    },
    definitions: firstCard.summary.definition ? [firstCard.summary.definition] : [],
    cards,
    meta: {
      provider: '2000nl',
      fallbackUsed: false,
      responseVersion: 'overlay-v2',
    },
  };
}

export function projectOverlayCard(
  item: PlatformLookupItem,
  clickedForm: string,
  sourceLanguageCode: string,
  index: number,
  options: { allowProgressActions: boolean },
): DictionaryOverlayCardV2 {
  const content = item.entry?.content || {};
  const headword =
    stringValue(content.headword) ||
    stringValue(item.entry?.headword) ||
    item.match?.matchedForm ||
    clickedForm;
  const partOfSpeech = stringValue(content.partOfSpeech) || stringValue(item.entry?.partOfSpeech);
  const article = normalizedArticle(
    stringValue(content.article) ||
    stringValue(content.gender) ||
    stringValue(item.entry?.gender),
  );
  const sections = normalizedSections(content);
  const definition = sections.find((section) => section.kind === 'meaning')?.text || '';
  const example = sections.find((section) => section.kind === 'example')?.text;
  const summary = recordValue(content.summary);
  const capabilities = item.cardCapabilitiesByType?.[DICTIONARY_OVERLAY_CARD_TYPE_ID];
  const phase = normalizedPhase(capabilities?.phase);
  const progress = options.allowProgressActions && phase
    ? {
        phase,
        ...progressFields(item.userStateByCardType?.[DICTIONARY_OVERLAY_CARD_TYPE_ID], capabilities),
      }
    : null;

  return {
    id: item.entry?.id || `${headword}-${index}`,
    entryId: item.entry?.id,
    cardTypeId: DICTIONARY_OVERLAY_CARD_TYPE_ID,
    clickedForm,
    headword,
    headwordTranslation: stringValue(content.headwordTranslation) || undefined,
    language: item.entry?.languageCode || sourceLanguageCode,
    partOfSpeech: partOfSpeech || undefined,
    article: article || undefined,
    match: {
      matchedForm: item.match?.matchedForm,
      relation: normalizedMatchRelation(item.match?.relation),
    },
    contentFingerprint: item.entry?.contentFingerprint || undefined,
    chips: chipsFromContent(item, content),
    summary: {
      definition,
      definitionTranslation: stringValue(summary.definitionTranslation) || undefined,
      example,
      exampleTranslation: stringValue(summary.exampleTranslation) || undefined,
    },
    sections,
    translation: normalizedTranslation(content.translation),
    progress,
    displayActions: displayActionsForCapabilities(capabilities, options.allowProgressActions),
    dictionary: item.dictionary
      ? {
          id: item.dictionary.id,
          slug: item.dictionary.slug,
          name: displayDictionaryName(item.dictionary.name, item.dictionary.slug),
          kind: item.dictionary.kind,
        }
      : undefined,
  };
}

function normalizedSections(content: Record<string, unknown>) {
  const sections = arrayValue(content.sections)
    .map((section, index) => normalizedSection(section, index))
    .filter((section): section is DictionaryOverlayCardV2Section => Boolean(section));
  if (sections.length) return sections;

  const meanings = arrayValue(content.meanings)
    .map((meaning, index) => normalizedMeaning(meaning, index))
    .filter((meaning): meaning is DictionaryOverlayCardV2Section => Boolean(meaning));
  if (meanings.length) return meanings;

  const definition = stringValue(content.definition) || stringValue(content.shortDefinition);
  return definition
    ? [
        {
          id: 'meaning-0',
          sourcePath: 'content.definition',
          kind: 'meaning',
          text: definition,
        } satisfies DictionaryOverlayCardV2Section,
      ]
    : [];
}

function normalizedSection(section: unknown, index: number): DictionaryOverlayCardV2Section | null {
  if (!isRecord(section)) return null;
  const text = stringValue(section.text) || stringValue(section.definition);
  if (!text) return null;
  return {
    id: stringValue(section.id) || `section-${index}`,
    sourcePath: stringValue(section.sourcePath) || `content.sections.${index}`,
    kind: normalizedSectionKind(section.kind),
    label: stringValue(section.label) || undefined,
    text,
    translation: stringValue(section.translation) || undefined,
  };
}

function normalizedTranslation(value: unknown): OverlayTranslation | undefined {
  if (!isRecord(value)) return undefined;
  const status = normalizedTranslationStatus(value.status);
  if (!status) return undefined;
  const error = recordValue(value.error);
  return {
    status,
    targetLanguageCode: stringValue(value.targetLanguageCode) || undefined,
    translationId: stringValue(value.translationId) || undefined,
    translationPolicyVersion: stringValue(value.translationPolicyVersion) || undefined,
    ...(Object.keys(error).length
      ? {
          error: {
            code: stringValue(error.code) || 'translation_failed',
            message: stringValue(error.message) || undefined,
          },
        }
      : {}),
  };
}

function normalizedMeaning(meaning: unknown, index: number): DictionaryOverlayCardV2Section | null {
  if (!isRecord(meaning)) return null;
  const text = stringValue(meaning.definition) || stringValue(meaning.text);
  if (!text) return null;
  return {
    id: stringValue(meaning.id) || `meaning-${index}`,
    sourcePath: `content.meanings.${index}`,
    kind: 'meaning',
    label: stringValue(meaning.label) || stringValue(meaning.context) || undefined,
    text,
  };
}

function chipsFromContent(item: PlatformLookupItem, content: Record<string, unknown>): OverlayChip[] {
  return [
    chip('part-of-speech', stringValue(content.partOfSpeech) || stringValue(item.entry?.partOfSpeech)),
  ].filter((item): item is OverlayChip => Boolean(item));
}

function chip(kind: OverlayChip['kind'], label?: string | null): OverlayChip | null {
  return label ? { kind, label } : null;
}

function normalizedArticle(value?: string | null) {
  const article = stringValue(value).toLocaleLowerCase();
  return article === 'de' || article === 'het' ? article : '';
}

function displayDictionaryName(name?: string | null, slug?: string | null) {
  const label = stringValue(name) || stringValue(slug);
  if (/^vandale\s+dutch$/i.test(label)) return 'VanDale';
  return label || undefined;
}

function displayActionsForCapabilities(
  capabilities: PlatformCardCapabilities | undefined,
  allowProgressActions: boolean,
): OverlayDisplayAction[] {
  const phase = normalizedPhase(capabilities?.phase);
  const actions = new Set(capabilities?.actions || []);
  const reviewResults = new Set(capabilities?.reviewResults || []);
  const displayActions: OverlayDisplayAction[] = [];

  if (allowProgressActions) {
    if ((phase === 'not-started' || phase === 'encountered') && actions.has('start-learning')) {
      displayActions.push(progressAction('learn', 'Learn', 'start-learning'));
    }
    if ((phase === 'not-started' || phase === 'encountered') && actions.has('mark-known')) {
      displayActions.push(progressAction('known', 'Known', 'mark-known', undefined, true));
    }
    if ((phase === 'learning' || phase === 'reviewing') && actions.has('review-card')) {
      if (reviewResults.has('fail')) displayActions.push(progressAction('again', 'Again', 'review-card', 'fail', true));
      if (reviewResults.has('hard')) displayActions.push(progressAction('hard', 'Hard', 'review-card', 'hard', true));
      if (reviewResults.has('success')) displayActions.push(progressAction('good', 'Good', 'review-card', 'success', true));
      if (reviewResults.has('easy')) displayActions.push(progressAction('easy', 'Easy', 'review-card', 'easy', true));
    }
  }

  displayActions.push({
    id: 'translate',
    label: 'Translate',
    group: 'translation',
    command: { kind: 'card-translation' },
  });
  return displayActions;
}

function progressAction(
  id: Extract<OverlayDisplayAction['id'], 'learn' | 'known' | 'again' | 'hard' | 'good' | 'easy'>,
  label: Extract<OverlayDisplayAction['label'], 'Learn' | 'Known' | 'Again' | 'Hard' | 'Good' | 'Easy'>,
  action: 'start-learning' | 'mark-known' | 'review-card',
  result?: 'fail' | 'hard' | 'success' | 'easy',
  turnIdRequired = false,
): OverlayDisplayAction {
  return {
    id,
    label,
    group: 'progress',
    command: {
      kind: 'platform-action',
      action,
      ...(result ? { result } : {}),
      ...(turnIdRequired ? { turnIdRequired } : {}),
    },
  };
}

function progressFields(userState: unknown, capabilities: { frozenUntil?: string | null } | undefined) {
  if (!isRecord(userState)) {
    return capabilities?.frozenUntil ? { frozenUntil: capabilities.frozenUntil } : {};
  }
  return {
    ...(typeof userState.seenCount === 'number' ? { seenCount: userState.seenCount } : {}),
    ...(stringValue(userState.lastSeenAt) ? { lastSeenAt: stringValue(userState.lastSeenAt) } : {}),
    ...(stringValue(userState.frozenUntil) || capabilities?.frozenUntil
      ? { frozenUntil: stringValue(userState.frozenUntil) || capabilities?.frozenUntil }
      : {}),
  };
}

function normalizedPhase(value: unknown): OverlayProgressPhase | null {
  const phase = stringValue(value);
  const validPhases: OverlayProgressPhase[] = [
    'not-started',
    'encountered',
    'learning',
    'reviewing',
    'hidden',
    'frozen',
  ];
  return validPhases.includes(phase as OverlayProgressPhase)
    ? (phase as OverlayProgressPhase)
    : null;
}

function normalizedMatchRelation(value: unknown): OverlayMatchRelation {
  const relation = stringValue(value);
  const validRelations: OverlayMatchRelation[] = ['exact', 'inflection', 'lemma', 'fuzzy', 'unknown'];
  return validRelations.includes(relation as OverlayMatchRelation)
    ? relation as OverlayMatchRelation
    : 'unknown';
}

function normalizedSectionKind(value: unknown): OverlaySectionKind {
  const kind = stringValue(value);
  const validKinds: OverlaySectionKind[] = ['meaning', 'context', 'example', 'idiom', 'form', 'note'];
  return validKinds.includes(kind as OverlaySectionKind) ? kind as OverlaySectionKind : 'meaning';
}

function normalizedTranslationStatus(value: unknown): OverlayTranslationStatus | null {
  const status = stringValue(value);
  const validStatuses: OverlayTranslationStatus[] = [
    'ready',
    'pending',
    'failed',
    'not_requested',
    'not_available',
  ];
  return validStatuses.includes(status as OverlayTranslationStatus)
    ? status as OverlayTranslationStatus
    : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
