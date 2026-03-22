import type {
  DictionaryProvider,
  DictionaryResult,
} from '@/types/dictionary';
import { DictionaryError } from '@/types/dictionary';

/**
 * Free Dictionary API response structure
 */
interface FreeDictionaryApiResponse {
  word: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

/**
 * Free Dictionary API provider (existing implementation)
 * This is a fallback for when LLM providers are not available
 */
export class FreeDictionaryProvider implements DictionaryProvider {
  private readonly baseUrl =
    'https://api.dictionaryapi.dev/api/v2/entries/en/';

  async getDefinition(
    word: string,
    sourceLanguage: string,
    context?: string,
  ): Promise<DictionaryResult> {
    if (!word) {
      throw new DictionaryError('Word is required', 'INVALID_INPUT');
    }

    // This API only supports English
    if (sourceLanguage.toLowerCase() !== 'en' && sourceLanguage.toLowerCase() !== 'english') {
      throw new DictionaryError(
        'Free Dictionary API only supports English',
        'INVALID_INPUT',
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}${encodeURIComponent(word)}`, {
        next: { revalidate: 3600 },
      });

      if (response.status === 404) {
        throw new DictionaryError(
          `Word "${word}" not found in dictionary`,
          'NOT_FOUND',
        );
      }

      if (!response.ok) {
        throw new DictionaryError('Dictionary lookup failed', 'API_ERROR');
      }

      const data: FreeDictionaryApiResponse[] = await response.json();

      if (!data || data.length === 0) {
        throw new DictionaryError('No definition found', 'NOT_FOUND');
      }

      // Extract the first definition
      const firstEntry = data[0];
      const definitions: string[] = [];

      for (const meaning of firstEntry.meanings) {
        if (meaning.definitions && meaning.definitions.length > 0) {
          const def = meaning.definitions[0];
          definitions.push(
            `(${meaning.partOfSpeech}) ${def.definition}${def.example ? ` Example: "${def.example}"` : ''}`,
          );
        }
      }

      if (definitions.length === 0) {
        throw new DictionaryError('No definition found', 'NOT_FOUND');
      }

      return {
        word,
        language: sourceLanguage,
        definition: definitions.join('\n\n'),
        context,
      };
    } catch (error) {
      if (error instanceof DictionaryError) {
        throw error;
      }

      console.error('Error fetching definition from Free Dictionary:', error);
      throw new DictionaryError(
        'Failed to fetch definition from Free Dictionary',
        'API_ERROR',
      );
    }
  }
}


