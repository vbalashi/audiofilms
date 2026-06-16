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
