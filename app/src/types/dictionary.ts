/**
 * Dictionary provider interface for fetching word definitions
 */
export interface DictionaryProvider {
  /**
   * Get a definition for a word
   * @param word - The word to define
   * @param sourceLanguage - The language the word is in
   * @param context - Optional context sentence containing the word
   * @returns Promise with the definition
   */
  getDefinition(
    word: string,
    sourceLanguage: string,
    context?: string
  ): Promise<DictionaryResult>;
}

/**
 * Result from a dictionary lookup
 */
export interface DictionaryResult {
  word: string;
  language: string;
  definition: string;
  context?: string;
}

export type DictionaryOverlayCardMeaning = {
  definition: string;
  context?: string;
  examples: string[];
  idioms: string[];
};

export type DictionaryOverlayCardV2Section = {
  id: string;
  sourcePath: string;
  kind: 'meaning' | 'context' | 'example' | 'idiom' | 'form' | 'note';
  label?: string;
  text: string;
  translation?: string;
};

export type DictionaryOverlayCardV2TranslationStatus =
  | 'ready'
  | 'pending'
  | 'failed'
  | 'not_requested'
  | 'not_available';

export type DictionaryOverlayCardV2Translation = {
  status: DictionaryOverlayCardV2TranslationStatus;
  targetLanguageCode?: string;
  translationId?: string;
  translationPolicyVersion?: string;
  error?: {
    code: string;
    message?: string;
  };
};

export type DictionaryOverlayCardV2 = {
  id: string;
  entryId?: string;
  cardTypeId: 'word-to-definition';
  clickedForm: string;
  headword: string;
  headwordTranslation?: string;
  language: string;
  partOfSpeech?: string;
  article?: string;
  match?: {
    matchedForm?: string;
    relation: 'exact' | 'inflection' | 'lemma' | 'fuzzy' | 'unknown';
  };
  contentFingerprint?: string;
  chips: Array<{
    kind: 'part-of-speech' | 'language' | 'dictionary' | 'list' | 'form' | 'other' | string;
    label: string;
    value?: string;
  }>;
  summary: {
    definition: string;
    definitionTranslation?: string;
    example?: string;
    exampleTranslation?: string;
  };
  sections: DictionaryOverlayCardV2Section[];
  translation?: DictionaryOverlayCardV2Translation;
  progress: {
    phase:
      | 'not-started'
      | 'encountered'
      | 'learning'
      | 'reviewing'
      | 'hidden'
      | 'frozen';
    seenCount?: number;
    lastSeenAt?: string;
    frozenUntil?: string | null;
  } | null;
  displayActions: Array<{
    id: 'learn' | 'known' | 'again' | 'hard' | 'good' | 'easy' | 'translate';
    label: 'Learn' | 'Known' | 'Again' | 'Hard' | 'Good' | 'Easy' | 'Translate';
    group: 'progress' | 'translation';
    command:
      | {
          kind: 'platform-action';
          action: 'start-learning' | 'mark-known' | 'review-card';
          result?: 'fail' | 'hard' | 'success' | 'easy';
          turnIdRequired?: boolean;
        }
      | { kind: 'card-translation' };
  }>;
  dictionary?: {
    id?: string;
    slug?: string;
    name?: string;
    kind?: string;
  };
};

export type DictionaryOverlayCard = {
  id: string;
  entryId?: string;
  cardTypeId: 'word-to-definition';
  headword: string;
  language: string;
  partOfSpeech?: string;
  gender?: string;
  pronunciation?: string;
  plural?: string;
  diminutive?: string;
  dictionary?: {
    id?: string;
    slug?: string;
    name?: string;
    kind?: string;
  };
  meanings: DictionaryOverlayCardMeaning[];
  progressSummary?: unknown;
  userState?: unknown;
  listMemberships?: unknown[];
  availableActions: string[];
};

export type DictionaryRichLookup = {
  query: string;
  cards: DictionaryOverlayCard[];
};

export type DictionaryLookupV2SuccessResponse = {
  contractVersion: 'dict-lookup-v2';
  clickedForm: string;
  query: string;
  result: DictionaryResult;
  definitions: string[];
  cards: DictionaryOverlayCardV2[];
  meta: {
    provider: '2000nl';
    fallbackUsed: false;
    responseVersion: 'overlay-v2';
    translationFallbackUsed?: boolean;
    translationFallbackReason?: string;
  };
};

export type DictionaryLookupV2NoMatchResponse = {
  contractVersion: 'dict-lookup-v2';
  clickedForm: string;
  query: string;
  cards: [];
  error: 'no_match';
  code: 'no_match';
  meta: {
    provider: '2000nl';
    responseVersion: 'overlay-v2';
  };
};

export type DictionaryLookupV2Response =
  | DictionaryLookupV2SuccessResponse
  | DictionaryLookupV2NoMatchResponse;

export type DictionarySessionResponse = {
  authenticated: boolean;
  user: {
    id: string;
    email: string | null;
  } | null;
  preferences: {
    translationTargetLanguageCode: string;
    source: string;
    updatedAt: string | null;
  } | null;
  error?: 'platform_session_unavailable';
};

export interface DictionaryLookupSuccessResponse {
  result: DictionaryResult;
  definitions: string[];
  query?: string;
  cards?: DictionaryOverlayCard[];
  meta?: {
    provider: string;
    fallbackUsed: boolean;
    warning?: string;
    responseVersion?: 'legacy' | 'overlay-v1';
  };
}

export interface DictionaryLookupErrorResponse {
  error: string;
  code?: 'NOT_FOUND' | 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_INPUT';
  recoverable?: boolean;
  suggestedAction?: string;
  translateUrl?: string;
}

/**
 * Error thrown by dictionary providers
 */
export class DictionaryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'API_ERROR'
      | 'RATE_LIMIT'
      | 'INVALID_INPUT',
  ) {
    super(message);
    this.name = 'DictionaryError';
  }
}

export function splitDictionaryDefinition(definition: string): string[] {
  return definition
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}
