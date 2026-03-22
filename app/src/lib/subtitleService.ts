import { getSubtitleProviderCandidates } from '@/lib/providers';
import { getCachedSubtitles, setCachedSubtitles } from '@/lib/subtitleCache';
import type {
  Phrase,
  SubtitleLanguagePreference,
  SubtitleProviderError,
  SubtitleResponse,
} from '@/types/subtitles';

function getMockPhrases(): Phrase[] {
  return [
    { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
    { id: 1, startSec: 2, endSec: 4.5, text: 'You know the rules and so do I' },
    {
      id: 2,
      startSec: 4.5,
      endSec: 8,
      text: "A full commitment's what I'm thinking of",
    },
    {
      id: 3,
      startSec: 8,
      endSec: 10,
      text: "You wouldn't get this from any other guy",
    },
  ];
}

function getCacheKey(videoId: string, language: SubtitleLanguagePreference): string {
  return language === 'auto' ? videoId : `${videoId}_${language}`;
}

function getDemoSubtitleFallback(videoId: string): SubtitleResponse | null {
  if (videoId !== 'dQw4w9WgXcQ') {
    return null;
  }

  return {
    phrases: getMockPhrases(),
    language: 'en',
  };
}

export async function loadSubtitles(
  videoId: string,
  language: SubtitleLanguagePreference,
): Promise<SubtitleResponse> {
  const cacheKey = getCacheKey(videoId, language);
  const cached = getCachedSubtitles(cacheKey);

  if (cached?.language) {
    console.log(
      `[SubtitleService] Returning cached subtitles for ${videoId} (language: ${cached.language})`,
    );
    return cached;
  }

  if (cached) {
    console.log(
      `[SubtitleService] Cached data missing language field for ${videoId}, refetching`,
    );
  } else {
    console.log(`[SubtitleService] Cache miss for ${videoId}`);
  }

  const candidates = getSubtitleProviderCandidates();
  let lastError: Error | SubtitleProviderError | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    try {
      const result = await candidate.provider.fetchSubtitles(videoId, {
        language: language === 'auto' ? undefined : language,
      });

      if (!result.phrases.length) {
        throw new Error('No subtitles returned from provider');
      }

      const fallbackUsed = index > 0;
      const response: SubtitleResponse = {
        phrases: result.phrases,
        language: result.language,
        meta: {
          provider: candidate.type,
          fallbackUsed,
          warning: fallbackUsed
            ? `Primary subtitle provider was unavailable. Loaded captions via ${candidate.type}.`
            : undefined,
        },
      };

      setCachedSubtitles(cacheKey, response);
      return response;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'SubtitleProviderError' &&
        'code' in error
      ) {
        const providerError = error as SubtitleProviderError;
        console.warn(
          `[SubtitleService] ${candidate.type} failed for ${videoId}: ${providerError.code}`,
        );
        lastError = providerError;

        if (providerError.code === 'INVALID_VIDEO') {
          throw providerError;
        }

        continue;
      }

      console.warn(
        `[SubtitleService] ${candidate.type} failed for ${videoId}: unexpected provider error`,
      );
      lastError =
        error instanceof Error ? error : new Error('Failed to fetch subtitles');
    }
  }

  const demoFallback = getDemoSubtitleFallback(videoId);
  if (demoFallback) {
    console.log('[SubtitleService] Using demo fallback subtitles');
    return {
      ...demoFallback,
      meta: {
        provider: 'demo-fallback',
        fallbackUsed: true,
        warning:
          'Live subtitle providers were unavailable. Showing the built-in sample transcript.',
      },
    };
  }

  throw lastError || new Error('Failed to fetch subtitles');
}
