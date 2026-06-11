import { getSubtitleProviderCandidates } from '@/lib/providers';
import { getCachedSubtitles, setCachedSubtitles } from '@/lib/subtitleCache';
import type {
  Phrase,
  SubtitleLanguagePreference,
  SubtitleResponse,
  SubtitleSourceKind,
} from '@/types/subtitles';
import { SubtitleProviderError } from '@/types/subtitles';

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

type LoadSubtitleOptions = {
  sourceKind?: Extract<SubtitleSourceKind, 'manual' | 'auto'>;
  refresh?: boolean;
};

type TimingQualityIssue = {
  badCount: number;
  totalCount: number;
  ratio: number;
  examples: string[];
};

function getCacheKey(
  videoId: string,
  language: SubtitleLanguagePreference,
  options: LoadSubtitleOptions = {},
): string {
  const languageKey = language === 'auto' ? 'auto' : language;
  const sourceKindKey = options.sourceKind || 'any';
  return `${videoId}_${languageKey}_${sourceKindKey}`;
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

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length || 0;
}

function findUnusableTimingIssue(response: SubtitleResponse): TimingQualityIssue | null {
  const provider = response.meta?.provider;
  const sourceKind = response.meta?.sourceKind;
  if (provider !== 'yt-dlp' || sourceKind !== 'auto') {
    return null;
  }

  const phrases = response.phrases || [];
  if (phrases.length < 10) {
    return null;
  }

  const badPhrases = phrases.filter((phrase) => {
    const durationSec = phrase.endSec - phrase.startSec;
    const words = countWords(phrase.text);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return true;
    }

    const wordsPerSecond = words / durationSec;
    return (words >= 4 && durationSec < 0.75) || (words >= 6 && durationSec < 1) || wordsPerSecond > 9;
  });

  const ratio = badPhrases.length / phrases.length;
  if (badPhrases.length < 5 || ratio < 0.12) {
    return null;
  }

  return {
    badCount: badPhrases.length,
    totalCount: phrases.length,
    ratio,
    examples: badPhrases.slice(0, 3).map((phrase) => phrase.text),
  };
}

function timingIssueMessage(issue: TimingQualityIssue): string {
  const percent = Math.round(issue.ratio * 100);
  const examples = issue.examples.length ? ` Examples: ${issue.examples.join(' | ')}` : '';
  return `yt-dlp auto captions have unreliable timing (${issue.badCount}/${issue.totalCount} phrases, ${percent}%).${examples}`;
}

export async function loadSubtitles(
  videoId: string,
  language: SubtitleLanguagePreference,
  options: LoadSubtitleOptions = {},
): Promise<SubtitleResponse> {
  const cacheKey = getCacheKey(videoId, language, options);
  const existingCached = getCachedSubtitles(cacheKey);
  const cached = options.refresh ? null : existingCached;
  const cachedTimingIssue = cached?.language ? findUnusableTimingIssue(cached) : null;

  if (cached?.language) {
    if (cachedTimingIssue) {
      console.warn(
        `[SubtitleService] Ignoring cached subtitles for ${videoId}: ${timingIssueMessage(cachedTimingIssue)}`,
      );
    } else {
      console.log(
        `[SubtitleService] Returning cached subtitles for ${videoId} (language: ${cached.language})`,
      );
      return {
        ...cached,
        meta: cached.meta
          ? {
            ...cached.meta,
            cacheStatus: 'hit',
          }
          : {
            provider: 'cache',
            fallbackUsed: false,
            cacheStatus: 'hit',
          },
      };
    }
  }

  if (options.refresh) {
    console.log(`[SubtitleService] Cache refresh requested for ${videoId}`);
  } else if (cachedTimingIssue) {
    console.log(
      `[SubtitleService] Cached data failed timing quality for ${videoId}, refetching`,
    );
  } else if (cached) {
    console.log(
      `[SubtitleService] Cached data missing language field for ${videoId}, refetching`,
    );
  } else {
    console.log(`[SubtitleService] Cache miss for ${videoId}`);
  }

  const candidates = getSubtitleProviderCandidates();
  let lastError: Error | SubtitleProviderError | null = null;
  let notFoundError: SubtitleProviderError | null = null;
  const failedAttempts: { provider: string; reason: string }[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    try {
      const result = await candidate.provider.fetchSubtitles(videoId, {
        language: language === 'auto' ? undefined : language,
        sourceKind: options.sourceKind,
      });

      if (!result.phrases.length) {
        throw new Error('No subtitles returned from provider');
      }

      const fallbackUsed = index > 0;
      const primaryProvider = candidates[0]?.type || candidate.type;
      const lastFailedAttempt = failedAttempts[failedAttempts.length - 1];
      const response: SubtitleResponse = {
        phrases: result.phrases,
        language: result.language,
        meta: {
          provider: candidate.type,
          fallbackUsed,
          cacheStatus: 'stored',
          primaryProvider,
          failedProvider: fallbackUsed ? lastFailedAttempt?.provider : undefined,
          fallbackReason: fallbackUsed ? lastFailedAttempt?.reason : undefined,
          warning: [
            fallbackUsed
              ? `Primary subtitle provider ${primaryProvider} was unavailable. Loaded captions via ${candidate.type}.`
              : '',
            ...(result.warnings || []),
          ].filter(Boolean)[0],
          sourceKind: result.sourceKind,
          retrievalPath: result.retrievalPath || candidate.type,
          timingExactness: result.timingExactness || 'exact',
          qualityFlags: result.qualityFlags || [],
          warnings: [
            ...(fallbackUsed
              ? [`Primary subtitle provider ${primaryProvider} was unavailable. Loaded captions via ${candidate.type}.`]
              : []),
            ...(result.warnings || []),
          ],
          retrievalAttempts: [
            ...failedAttempts.map((attempt) => ({
              path: attempt.provider,
              status: 'failed' as const,
              error: attempt.reason,
            })),
            ...(result.retrievalAttempts || [{
              path: candidate.type,
              status: 'ok' as const,
              cues: result.phrases.length,
            }]),
          ],
        },
      };
      const timingIssue = findUnusableTimingIssue(response);
      if (timingIssue) {
        throw new Error(timingIssueMessage(timingIssue));
      }

      const shouldStore = !(
        options.refresh &&
        fallbackUsed &&
        existingCached?.meta &&
        existingCached.meta.fallbackUsed === false
      );
      if (shouldStore) {
        setCachedSubtitles(cacheKey, response);
      } else {
        console.log(
          `[SubtitleService] Keeping existing primary-provider cache for ${videoId}; refresh only produced fallback captions`,
        );
      }
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
        failedAttempts.push({
          provider: candidate.type,
          reason: providerError.message || providerError.code,
        });

        if (providerError.code === 'INVALID_VIDEO') {
          throw providerError;
        }
        if (providerError.code === 'NOT_FOUND') {
          notFoundError = providerError;
        }

        continue;
      }

      console.warn(
        `[SubtitleService] ${candidate.type} failed for ${videoId}: unexpected provider error`,
      );
      lastError =
        error instanceof Error ? error : new Error('Failed to fetch subtitles');
      failedAttempts.push({
        provider: candidate.type,
        reason: lastError.message,
      });
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

  throw notFoundError || lastError || new Error('Failed to fetch subtitles');
}
