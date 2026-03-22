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

export interface DictionaryLookupSuccessResponse {
  result: DictionaryResult;
  definitions: string[];
}

export interface DictionaryLookupErrorResponse {
  error: string;
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

