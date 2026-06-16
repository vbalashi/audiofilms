import type {
  DictionaryOverlayCard,
  DictionaryProvider,
  DictionaryResult,
  DictionaryRichLookup,
} from '@/types/dictionary';
import { DictionaryError } from '@/types/dictionary';

type TwoThousandNlDictionaryProviderOptions = {
  apiBase: string;
  accessToken: string;
  timeoutMs?: number;
  includeUserState?: boolean;
};

type PlatformLookupResponse = {
  query?: string;
  items?: PlatformLookupItem[];
  error?: string;
  detail?: string;
};

type PlatformLookupItem = {
  entry?: {
    id?: string;
    dictionaryId?: string;
    languageCode?: string | null;
    headword?: string;
    meaningId?: number | null;
    partOfSpeech?: string | null;
    gender?: string | null;
    raw?: PlatformRawEntry;
  };
  dictionary?: {
    id?: string;
    name?: string;
    slug?: string;
    kind?: string;
  } | null;
  userStateByCardType?: Record<string, unknown>;
  progressSummary?: unknown;
  listMemberships?: unknown[];
  availableActions?: string[];
};

type PlatformRawEntry = {
  headword?: string;
  meanings?: PlatformMeaning[];
  part_of_speech?: string;
  gender?: string;
  plural?: string;
  diminutive?: string;
  pronunciation?: string;
};

type PlatformMeaning = {
  definition?: string;
  context?: string;
  examples?: string[];
  idioms?: Array<string | { expression?: string; explanation?: string }>;
};

export class TwoThousandNlDictionaryProvider implements DictionaryProvider {
  private readonly apiBase: string;
  private readonly accessToken: string;
  private readonly timeoutMs: number;
  private readonly includeUserState: boolean;

  constructor(options: TwoThousandNlDictionaryProviderOptions) {
    this.apiBase = options.apiBase.replace(/\/+$/, '');
    this.accessToken = options.accessToken;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.includeUserState = options.includeUserState ?? true;
  }

  async getDefinition(
    word: string,
    sourceLanguage: string,
    context?: string,
  ): Promise<DictionaryResult> {
    const lookup = await this.getRichLookup(word, sourceLanguage);
    const card = lookup.cards[0];
    if (!card) {
      throw new DictionaryError(`Word "${word.trim()}" not found in 2000NL`, 'NOT_FOUND');
    }

    const definition = formatCardDefinition(card);
    if (!definition) {
      throw new DictionaryError(`No definition found for "${word.trim()}"`, 'NOT_FOUND');
    }

    return {
      word: card.headword,
      language: card.language || sourceLanguage,
      definition,
      context,
    };
  }

  async getRichLookup(
    word: string,
    sourceLanguage: string,
  ): Promise<DictionaryRichLookup> {
    const query = word.trim();
    if (!query) {
      throw new DictionaryError('Word is required', 'INVALID_INPUT');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiBase}/lookup`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query,
          includeUserState: this.includeUserState,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as PlatformLookupResponse | null;
      if (!response.ok) {
        throw mapPlatformError(response.status, payload);
      }

      const items = payload?.items || [];
      const cards = items.map((item, index) => projectOverlayCard(item, query, sourceLanguage, index));
      if (cards.length === 0) {
        throw new DictionaryError(`Word "${query}" not found in 2000NL`, 'NOT_FOUND');
      }

      return { query: payload?.query || query, cards };
    } catch (error) {
      if (error instanceof DictionaryError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new DictionaryError('2000NL dictionary lookup timed out', 'RATE_LIMIT');
      }
      throw new DictionaryError('Failed to fetch definition from 2000NL', 'API_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapPlatformError(status: number, payload: PlatformLookupResponse | null) {
  const message = payload?.error || payload?.detail || `2000NL lookup failed with HTTP ${status}`;
  if (status === 400) {
    return new DictionaryError(message, 'INVALID_INPUT');
  }
  if (status === 401 || status === 403) {
    return new DictionaryError(message, 'API_ERROR');
  }
  if (status === 404) {
    return new DictionaryError(message, 'NOT_FOUND');
  }
  if (status === 429) {
    return new DictionaryError(message, 'RATE_LIMIT');
  }
  return new DictionaryError(message, 'API_ERROR');
}

function projectOverlayCard(
  item: PlatformLookupItem,
  query: string,
  sourceLanguage: string,
  index: number,
): DictionaryOverlayCard {
  const raw = item.entry?.raw;
  const entryId = item.entry?.id;
  const headword = item.entry?.headword || raw?.headword || query;
  const meanings = (raw?.meanings || [])
    .map((meaning) => ({
      definition: meaning.definition?.trim() || '',
      context: meaning.context?.trim() || undefined,
      examples: (meaning.examples || []).map((example) => example.trim()).filter(Boolean),
      idioms: formatIdioms(meaning.idioms),
    }))
    .filter((meaning) => meaning.definition || meaning.examples.length || meaning.idioms.length);
  const userState = item.userStateByCardType?.['word-to-definition'];

  return {
    id: entryId || `${headword}-${index}`,
    entryId,
    cardTypeId: 'word-to-definition',
    headword,
    language: item.entry?.languageCode || sourceLanguage,
    partOfSpeech: item.entry?.partOfSpeech || raw?.part_of_speech || undefined,
    gender: item.entry?.gender || raw?.gender || undefined,
    pronunciation: raw?.pronunciation || undefined,
    plural: raw?.plural || undefined,
    diminutive: raw?.diminutive || undefined,
    dictionary: item.dictionary
      ? {
          id: item.dictionary.id,
          slug: item.dictionary.slug,
          name: item.dictionary.name,
          kind: item.dictionary.kind,
        }
      : undefined,
    meanings,
    progressSummary: item.progressSummary,
    userState,
    listMemberships: item.listMemberships || [],
    availableActions: item.availableActions || [],
  };
}

function formatCardDefinition(card: DictionaryOverlayCard) {
  const lines: string[] = [];
  const source = card.dictionary?.name || card.dictionary?.slug || '2000NL';
  const descriptor = [card.partOfSpeech, card.gender].filter(Boolean).join(', ');

  if (descriptor) {
    lines.push(descriptor);
  }

  for (const meaning of card.meanings) {
    if (meaning.definition) {
      lines.push(meaning.definition);
    }
    if (meaning.examples?.length) {
      lines.push(`Examples: ${meaning.examples.join(' | ')}`);
    }
    if (meaning.idioms?.length) {
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

function formatIdioms(idioms: PlatformMeaning['idioms']) {
  return (idioms || [])
    .map((idiom) => {
      if (typeof idiom === 'string') return idiom;
      return [idiom.expression, idiom.explanation].filter(Boolean).join(' - ');
    })
    .filter(Boolean);
}
