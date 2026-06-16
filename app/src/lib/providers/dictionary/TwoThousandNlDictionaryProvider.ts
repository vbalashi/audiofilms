import type { DictionaryProvider, DictionaryResult } from '@/types/dictionary';
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
    languageCode?: string | null;
    headword?: string;
    partOfSpeech?: string | null;
    gender?: string | null;
    raw?: PlatformRawEntry;
  };
  dictionary?: {
    name?: string;
    slug?: string;
  } | null;
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

      const item = payload?.items?.[0];
      if (!item?.entry) {
        throw new DictionaryError(`Word "${query}" not found in 2000NL`, 'NOT_FOUND');
      }

      const raw = item.entry.raw;
      const headword = item.entry.headword || raw?.headword || query;
      const definition = formatDefinition(item);
      if (!definition) {
        throw new DictionaryError(`No definition found for "${query}"`, 'NOT_FOUND');
      }

      return {
        word: headword,
        language: item.entry.languageCode || sourceLanguage,
        definition,
        context,
      };
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

function formatDefinition(item: PlatformLookupItem) {
  const raw = item.entry?.raw;
  const lines: string[] = [];
  const source = item.dictionary?.name || item.dictionary?.slug || '2000NL';
  const partOfSpeech = item.entry?.partOfSpeech || raw?.part_of_speech || '';
  const gender = item.entry?.gender || raw?.gender || '';
  const descriptor = [partOfSpeech, gender].filter(Boolean).join(', ');

  if (descriptor) {
    lines.push(descriptor);
  }

  for (const meaning of raw?.meanings || []) {
    if (meaning.definition) {
      lines.push(meaning.definition);
    }
    if (meaning.examples?.length) {
      lines.push(`Examples: ${meaning.examples.join(' | ')}`);
    }
    const idioms = formatIdioms(meaning.idioms);
    if (idioms) {
      lines.push(`Idioms: ${idioms}`);
    }
  }

  if (raw?.plural) {
    lines.push(`Plural: ${raw.plural}`);
  }
  if (raw?.diminutive) {
    lines.push(`Diminutive: ${raw.diminutive}`);
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
    .filter(Boolean)
    .join(' | ');
}
