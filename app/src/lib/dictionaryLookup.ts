import { getDictionaryProviderCandidates } from '@/lib/providers/dictionary';
import {
  DictionaryError,
  splitDictionaryDefinition,
  type DictionaryOverlayCard,
  type DictionaryProvider,
  type DictionaryLookupErrorResponse,
  type DictionaryLookupSuccessResponse,
  type DictionaryRichLookup,
} from '@/types/dictionary';

export type DictionaryLookupParams = {
  word: string;
  language: string;
  context?: string;
  platformAccessToken?: string;
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
          error: error.message || 'Failed to fetch definition',
          code: 'API_ERROR',
          recoverable: true,
          suggestedAction: 'Try again later or use a different word.',
        },
      };
  }
}

type RichDictionaryProvider = DictionaryProvider & {
  getRichLookup(
    word: string,
    sourceLanguage: string,
    context?: string,
  ): Promise<DictionaryRichLookup>;
};

function hasRichLookup(provider: DictionaryProvider): provider is RichDictionaryProvider {
  return typeof (provider as Partial<RichDictionaryProvider>).getRichLookup === 'function';
}

function formatDefinitionFromCard(card: DictionaryOverlayCard) {
  const lines: string[] = [];
  const descriptor = [card.partOfSpeech, card.gender].filter(Boolean).join(', ');
  const source = card.dictionary?.name || card.dictionary?.slug || '2000NL';

  if (descriptor) {
    lines.push(descriptor);
  }

  for (const meaning of card.meanings) {
    if (meaning.definition) {
      lines.push(meaning.definition);
    }
    if (meaning.examples.length) {
      lines.push(`Examples: ${meaning.examples.join(' | ')}`);
    }
    if (meaning.idioms.length) {
      lines.push(`Idioms: ${meaning.idioms.join(' | ')}`);
    }
  }

  if (card.plural) {
    lines.push(`Plural: ${card.plural}`);
  }
  if (card.diminutive) {
    lines.push(`Diminutive: ${card.diminutive}`);
  }
  lines.push(`Source: ${source}`);

  return lines.filter(Boolean).join('\n\n');
}

export async function lookupDictionaryEntry({
  word,
  language,
  context,
  platformAccessToken,
}: DictionaryLookupParams): Promise<DictionaryLookupOutcome> {
  const candidates = getDictionaryProviderCandidates(language, {
    twoThousandNlAccessToken: platformAccessToken,
  });
  let lastDictionaryError: DictionaryError | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    try {
      const richLookup = hasRichLookup(candidate.provider)
        ? await candidate.provider.getRichLookup(word, language, context)
        : null;
      const firstCard = richLookup?.cards[0];
      const result = firstCard
        ? {
            word: firstCard.headword,
            language: firstCard.language || language,
            definition: formatDefinitionFromCard(firstCard),
            context,
          }
        : await candidate.provider.getDefinition(word, language, context);
      const fallbackUsed = index > 0;

      return {
        ok: true,
        status: 200,
        body: {
          result,
          definitions: splitDictionaryDefinition(result.definition),
          query: richLookup?.query,
          cards: richLookup?.cards,
          meta: {
            provider: candidate.type,
            fallbackUsed,
            warning: fallbackUsed
              ? `Primary dictionary provider was unavailable. Showing a fallback definition from ${candidate.type}.`
              : undefined,
            responseVersion: richLookup ? 'overlay-v1' : 'legacy',
          },
        },
      };
    } catch (error) {
      console.error(`[Dictionary API] Provider "${candidate.type}" failed:`, error);

      if (error instanceof DictionaryError) {
        lastDictionaryError = error;
        const primaryProvider = process.env.DICTIONARY_PROVIDER || '';
        const shouldTryFallback =
          index < candidates.length - 1 &&
          (error.code === 'API_ERROR' || error.code === 'RATE_LIMIT') &&
          !(primaryProvider === '2000nl' && candidate.type === '2000nl');

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
