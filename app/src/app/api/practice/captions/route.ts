import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import { buildPracticeSnapshot } from '@/lib/practice/snapshot';
import { loadSubtitles } from '@/lib/subtitleService';
import {
  SubtitleProviderError,
  type SubtitleLanguagePreference,
  type SubtitleSourceKind,
} from '@/types/subtitles';
import type { ApiErrorBody } from '@/types/api';
import type { PracticeCaptionsResponse } from '@/types/practice';

type PracticeCaptionsRequest = {
  videoId?: unknown;
  language?: unknown;
  lang?: unknown;
  sourceKind?: unknown;
  refresh?: unknown;
};

function normalizeSubtitleFailure(error: unknown): {
  message: string;
  code: string;
  status: number;
  recoverable: boolean;
  suggestedAction: string;
} {
  const rawMessage =
    error instanceof Error ? error.message : 'Failed to fetch subtitles';

  if (error instanceof SubtitleProviderError) {
    switch (error.code) {
      case 'NOT_FOUND':
        return {
          message: 'No subtitles found',
          code: 'no_captions',
          status: 404,
          recoverable: true,
          suggestedAction: 'Try another language or another video.',
        };
      case 'INVALID_VIDEO':
        return {
          message: 'Invalid YouTube video ID or unsupported video URL.',
          code: 'invalid_video',
          status: 400,
          recoverable: true,
          suggestedAction: 'Check the video link and try again.',
        };
      case 'RATE_LIMIT':
        return {
          message: 'Subtitle providers are temporarily rate-limited.',
          code: 'provider_rate_limited',
          status: 503,
          recoverable: true,
          suggestedAction: 'Retry in a moment.',
        };
      case 'PROVIDER_ERROR':
      default:
        return {
          message: 'Failed to fetch subtitles',
          code: 'provider_error',
          status: 500,
          recoverable: true,
          suggestedAction: 'Check provider configuration or retry later.',
        };
    }
  }

  const noSubtitlesFound =
    rawMessage === 'No subtitles found' ||
    rawMessage === 'No subtitles found in any supported language' ||
    rawMessage.includes('No subtitles found');

  if (noSubtitlesFound) {
    return {
      message: 'No subtitles found',
      code: 'no_captions',
      status: 404,
      recoverable: true,
      suggestedAction: 'Try another language or another video.',
    };
  }

  const invalidVideoId =
    rawMessage.includes('Incomplete YouTube ID') ||
    rawMessage.includes('video provider could not be detected') ||
    rawMessage.includes('invalid-request');

  if (invalidVideoId) {
    return {
      message: 'Invalid YouTube video ID or unsupported video URL.',
      code: 'invalid_video',
      status: 400,
      recoverable: true,
      suggestedAction: 'Check the video link and try again.',
    };
  }

  return {
    message: 'Failed to fetch subtitles',
    code: 'caption_fetch_failed',
    status: 500,
    recoverable: true,
    suggestedAction: 'Check provider configuration or retry later.',
  };
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PracticeCaptionsRequest | null;
  const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
  const language = normalizeLanguage(body);
  const sourceKind = normalizeSourceKind(body?.sourceKind);
  const refresh = normalizeRefresh(body?.refresh);

  if (!videoId) {
    return jsonResponse(request, { error: 'missing_video_id' }, { status: 400 });
  }

  try {
    const subtitleResponse = await loadSubtitles(videoId, language, {
      sourceKind,
      refresh,
    });
    const snapshot = buildPracticeSnapshot(subtitleResponse, {
      videoId,
      requestedLanguage: language,
    });
    const responseBody: PracticeCaptionsResponse = {
      state: 'ready',
      operation: {
        id: `get-captions:${snapshot.snapshotRevisionId}`,
        kind: 'get-captions',
        state: 'succeeded',
      },
      snapshot,
    };

    return jsonResponse(request, responseBody);
  } catch (error) {
    if (error instanceof SubtitleProviderError) {
      console.warn(`[practice/captions] Caption fetch failed for ${videoId}: ${error.code}`);
    } else {
      console.error('[practice/captions] Error fetching captions:', error);
    }

    const failure = normalizeSubtitleFailure(error);
    const responseBody: ApiErrorBody = {
      error: failure.code,
      message: failure.message,
      recoverable: failure.recoverable,
      suggestedAction: failure.suggestedAction,
    };

    return jsonResponse(
      request,
      responseBody,
      { status: failure.status },
    );
  }
}

function normalizeLanguage(body: PracticeCaptionsRequest | null): SubtitleLanguagePreference {
  const rawLanguage = body?.language ?? body?.lang;
  return typeof rawLanguage === 'string' && rawLanguage.trim()
    ? rawLanguage.trim()
    : 'auto';
}

function normalizeSourceKind(
  sourceKind: unknown,
): Extract<SubtitleSourceKind, 'manual' | 'auto'> | undefined {
  return sourceKind === 'manual' || sourceKind === 'auto' ? sourceKind : undefined;
}

function normalizeRefresh(refresh: unknown): boolean {
  return refresh === true || refresh === '1' || refresh === 'true';
}
