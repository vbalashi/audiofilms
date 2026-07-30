export type PlatformSemanticTermV2 = {
  termId: string;
  messageKey: string;
  sourceValue?: string;
};

export type PlatformContentNodeTranslationV2 = {
  translationId: string;
  targetLanguageCode: string;
  status: 'ready' | 'pending' | 'failed' | 'not-available';
  text?: string;
  sourceTextFingerprint: string;
  translationPolicyVersion: string;
  providerRevision?: string;
  errorCode?: string;
};

export type PlatformContentNodeV2 = {
  contentNodeId: string;
  parentContentNodeId: string | null;
  kind:
    | 'definition'
    | 'usage-pattern'
    | 'example'
    | 'idiom'
    | 'idiom-explanation'
    | 'usage-note';
  order: number;
  text: string;
  sourceTextFingerprint: string;
  translations: PlatformContentNodeTranslationV2[];
};

export type PlatformSenseCardTargetV2 = {
  kind: 'sense-card';
  entryId: string;
  cardTypeId: 'word-to-definition';
  stateRevision: string;
};

export type PlatformSenseCardCapabilityV2 =
  | {
      actionId: 'start-learning' | 'mark-known';
      elementId: string;
      messageKey: string;
      target: PlatformSenseCardTargetV2;
    }
  | {
      actionId: 'undo-known';
      elementId: string;
      messageKey: string;
      target: PlatformSenseCardTargetV2 & {
        activeKnownMarkId: string;
        knownMarkRevision: string;
      };
    }
  | {
      actionId: 'review-card';
      elementId: string;
      messageKey: string;
      target: PlatformSenseCardTargetV2;
      reviewResult: 'fail' | 'hard' | 'success' | 'easy';
    }
  | {
      actionId: 'request-translation' | 'report-content' | 'open-word-details';
      elementId: string;
      messageKey: string;
      target: Record<string, unknown>;
      targetLanguageCode?: string;
    };

export type PlatformSenseCardEntryV2 = {
  kind: 'sense-card';
  entryId: string;
  meaningOrdinal: number | null;
  partOfSpeech?: PlatformSemanticTermV2;
  card: {
    cardTypeId: 'word-to-definition';
    scheduler: {
      phase: 'not-started' | 'encountered' | 'learning' | 'reviewing' | 'hidden' | 'frozen';
      repeatCount?: number;
      lastSeenAt?: string | null;
      frozenUntil?: string | null;
    };
    knownMark: {
      markId: string;
      revision: string;
      markedAt: string;
    } | null;
    stateRevision: string;
  } | null;
  contentRevision: string;
  summaryContentNodeId: string | null;
  contentNodes: PlatformContentNodeV2[];
  translation: {
    translationId: string;
    entryId: string;
    targetLanguageCode: string;
    status: 'ready' | 'pending' | 'failed' | 'not-available';
    text?: string;
    sourceContentFingerprint: string;
    translationPolicyVersion: string;
    providerRevision?: string;
    errorCode?: string;
    isFresh: boolean;
  } | null;
  capabilities: PlatformSenseCardCapabilityV2[];
  wordDetails?: Record<string, unknown>;
};

export type PlatformHeadwordGroupV2 = {
  headwordGroupId: string;
  dictionary: {
    dictionaryId: string;
    sourceLanguageCode: string;
    displayName: string;
    messageKey: string;
  };
  header: {
    text: string;
    homographNumber?: number;
    displayPronunciation?: string;
    pronunciation?: string;
    article?: string;
    partOfSpeech?: PlatformSemanticTermV2;
    audio?: {
      audioId: string;
      actionId: 'play-audio';
      contentLanguageCode: string;
    };
  };
  senseCount: number;
  entryCount: number;
  indicators: Array<{
    indicatorId: string;
    value: string;
    messageKey: string;
  }>;
  entries: Array<
    | PlatformSenseCardEntryV2
    | {
        kind: 'cross-reference';
        [key: string]: unknown;
      }
  >;
};

export type PlatformLookupV2Response = {
  contractVersion: 'platform-lookup-v2';
  query: string;
  request: {
    contentLanguageCode: string | null;
    translationTargetLanguageCode: string | null;
    cardTypeId: 'word-to-definition';
    intent: string;
  };
  groups: PlatformHeadwordGroupV2[];
  page: {
    selectedTierComplete: boolean;
    nextGroupCursor: string | null;
  };
};

export type DictionarySenseCardLookupResponse = {
  contractVersion: 'dict-sense-card-v1';
  clickedForm: string;
  query: string;
  request: PlatformLookupV2Response['request'];
  groups: PlatformHeadwordGroupV2[];
  cards: Array<{
    contractVersion: 'dict-sense-card-entry-v1';
    id: string;
    entryId: string;
    group: PlatformHeadwordGroupV2;
    entry: PlatformSenseCardEntryV2;
  }>;
  page: PlatformLookupV2Response['page'];
  meta: {
    provider: '2000nl';
    responseVersion: 'sense-card-v1';
    tracerEligible: boolean;
  };
};

export function isPlatformLookupV2Response(value: unknown): value is PlatformLookupV2Response {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformLookupV2Response>;
  return (
    candidate.contractVersion === 'platform-lookup-v2' &&
    typeof candidate.query === 'string' &&
    Array.isArray(candidate.groups) &&
    Boolean(candidate.request) &&
    Boolean(candidate.page)
  );
}

export function projectSenseCardLookup(
  response: PlatformLookupV2Response,
  clickedForm: string,
): DictionarySenseCardLookupResponse {
  const cards = response.groups.flatMap((group) => {
    const senseEntries = group.entries.filter(
      (entry): entry is PlatformSenseCardEntryV2 => entry.kind === 'sense-card',
    );
    if (group.senseCount !== 1 || senseEntries.length !== 1) return [];
    const entry = senseEntries[0];
    return [
      {
        contractVersion: 'dict-sense-card-entry-v1' as const,
        id: entry.entryId,
        entryId: entry.entryId,
        group,
        entry,
      },
    ];
  });
  return {
    contractVersion: 'dict-sense-card-v1',
    clickedForm,
    query: response.query,
    request: response.request,
    groups: response.groups,
    cards,
    page: response.page,
    meta: {
      provider: '2000nl',
      responseVersion: 'sense-card-v1',
      tracerEligible: cards.length > 0,
    },
  };
}
