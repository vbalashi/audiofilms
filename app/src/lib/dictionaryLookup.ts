import { getDictionaryProviderCandidates } from '@/lib/providers/dictionary';
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

function toErrorOutcome(
  error: DictionaryError,
  language: string,
  word: string,
): DictionaryLookupOutcome {
  switch (error.code) {
    case 'NOT_FOUND':
      return {
        ok: false,
        status: 404,
        body: {
          error: error.message,
          code: error.code,
          recoverable: true,
          suggestedAction: 'Try another word or open a translation fallback.',
          translateUrl: `https://translate.google.com/?sl=${language}&tl=en&text=${encodeURIComponent(
            word,
          )}&op=translate`,
        },
      };
    case 'RATE_LIMIT':
      return {
        ok: false,
        status: 429,
        body: {
          error: error.message,
          code: error.code,
          recoverable: true,
          suggestedAction: 'Retry in a moment.',
        },
      };
    case 'INVALID_INPUT':
      return {
        ok: false,
        status: 400,
        body: {
          error: error.message,
          code: error.code,
          recoverable: false,
        },
      };
    case 'API_ERROR':
    default:
      return {
        ok: false,
        status: 500,
        body: {
          error: 'Failed to fetch definition',
          code: 'API_ERROR',
          recoverable: true,
          suggestedAction: 'Try again later or use a different word.',
        },
      };
  }
}

export async function lookupDictionaryEntry({
  word,
  language,
  context,
}: DictionaryLookupParams): Promise<DictionaryLookupOutcome> {
  const candidates = getDictionaryProviderCandidates(language);
  let lastDictionaryError: DictionaryError | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    try {
      const result = await candidate.provider.getDefinition(word, language, context);
      const fallbackUsed = index > 0;

      return {
        ok: true,
        status: 200,
        body: {
          result,
          definitions: splitDictionaryDefinition(result.definition),
          meta: {
            provider: candidate.type,
            fallbackUsed,
            warning: fallbackUsed
              ? `Primary dictionary provider was unavailable. Showing a fallback definition from ${candidate.type}.`
              : undefined,
          },
        },
      };
    } catch (error) {
      console.error(`[Dictionary API] Provider "${candidate.type}" failed:`, error);

      if (error instanceof DictionaryError) {
        lastDictionaryError = error;
        const shouldTryFallback =
          index < candidates.length - 1 &&
          (error.code === 'API_ERROR' || error.code === 'RATE_LIMIT');

        if (shouldTryFallback) {
          continue;
        }

        return toErrorOutcome(error, language, word);
      }

      lastDictionaryError = new DictionaryError(
        'Failed to fetch definition',
        'API_ERROR',
      );
    }
  }

  if (lastDictionaryError) {
    return toErrorOutcome(lastDictionaryError, language, word);
  }

  return {
    ok: false,
    status: 500,
    body: {
      error: 'No dictionary provider is currently available',
      code: 'API_ERROR',
      recoverable: true,
      suggestedAction: 'Check provider configuration and try again.',
    },
  };
}
