import { getConfiguredDictionaryProvider } from '@/lib/providers/dictionary';
import {
  DictionaryError,
  splitDictionaryDefinition,
  type DictionaryLookupErrorResponse,
  type DictionaryLookupSuccessResponse,
} from '@/types/dictionary';

export type DictionaryLookupParams = {
  word: string;
  language: string;
  context?: string;
};

export type DictionaryLookupOutcome =
  | {
      ok: true;
      status: 200;
      body: DictionaryLookupSuccessResponse;
    }
  | {
      ok: false;
      status: 400 | 404 | 429 | 500;
      body: DictionaryLookupErrorResponse;
    };

export async function lookupDictionaryEntry({
  word,
  language,
  context,
}: DictionaryLookupParams): Promise<DictionaryLookupOutcome> {
  try {
    const provider = getConfiguredDictionaryProvider();
    const result = await provider.getDefinition(word, language, context);

    return {
      ok: true,
      status: 200,
      body: {
        result,
        definitions: splitDictionaryDefinition(result.definition),
      },
    };
  } catch (error) {
    console.error('Dictionary API error:', error);

    if (error instanceof DictionaryError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return {
            ok: false,
            status: 404,
            body: {
              error: error.message,
              translateUrl: `https://translate.google.com/?sl=${language}&tl=en&text=${encodeURIComponent(
                word,
              )}&op=translate`,
            },
          };
        case 'RATE_LIMIT':
          return {
            ok: false,
            status: 429,
            body: { error: error.message },
          };
        case 'INVALID_INPUT':
          return {
            ok: false,
            status: 400,
            body: { error: error.message },
          };
        case 'API_ERROR':
        default:
          return {
            ok: false,
            status: 500,
            body: { error: 'Failed to fetch definition' },
          };
      }
    }

    return {
      ok: false,
      status: 500,
      body: { error: 'Failed to fetch definition' },
    };
  }
}
