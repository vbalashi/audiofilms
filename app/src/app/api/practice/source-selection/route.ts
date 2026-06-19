import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  buildPracticeSnapshot,
  type PracticeTextSourceKind,
} from '@/lib/practice/snapshot';
import {
  buildPracticeSourceInventory,
  findPracticeSourceInventoryEntry,
} from '@/lib/practice/sourceInventory';
import { loadSubtitles } from '@/lib/subtitleService';
import {
  SubtitleProviderError,
  type SubtitleLanguagePreference,
  type SubtitleSourceKind,
} from '@/types/subtitles';

type SourceSelectionRequest = {
  videoId?: unknown;
  language?: unknown;
  lang?: unknown;
  sourceKind?: unknown;
  textSourceKind?: unknown;
  textSourceId?: unknown;
  textSourceRevisionId?: unknown;
  selectedTextSource?: {
    id?: unknown;
    revisionId?: unknown;
    kind?: unknown;
  } | null;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SourceSelectionRequest | null;
  const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
  const language = normalizeLanguage(body);
  const requestedKind = normalizeRequestedKind(body);

  if (!videoId) {
    return jsonResponse(request, { error: 'missing_video_id' }, { status: 400 });
  }

  try {
    const requested = requestedSelection(body);
    const selectedEntry = await selectedInventoryEntry(videoId, language, requested);
    const subtitleResponse = selectedEntry?.response || await loadSubtitles(videoId, language, {
      sourceKind: sourceKindForTextSource(requestedKind),
      refresh: false,
    });
    const availableTextSources = await buildPracticeSourceInventory({
      videoId,
      requestedLanguage: language,
      activeResponse: subtitleResponse,
    });
    const snapshot = buildPracticeSnapshot(subtitleResponse, {
      videoId,
      requestedLanguage: language,
      availableTextSources,
    });
    const activeSource = snapshot.textSource;

    if (!activeSource) {
      return jsonResponse(
        request,
        {
          error: 'source_not_available',
          message: 'No selectable text source is currently available for this video.',
          requested,
          snapshot,
        },
        { status: 404 },
      );
    }

    if (
      (requested.id && requested.id !== activeSource.id) ||
      (requested.revisionId && requested.revisionId !== activeSource.revisionId) ||
      (requested.kind && requested.kind !== activeSource.kind)
    ) {
      return jsonResponse(
        request,
        {
          error: 'source_not_available',
          message: 'The requested text source revision is not currently available.',
          requested,
          availableTextSources: snapshot.availableTextSources,
          snapshot,
        },
        { status: 409 },
      );
    }

    return jsonResponse(request, {
      state: 'ready',
      selection: {
        textSourceId: activeSource.id,
        textSourceRevisionId: activeSource.revisionId,
        status: activeSource.status,
      },
      snapshot,
    });
  } catch (error) {
    const failure = normalizeSubtitleFailure(error);
    return jsonResponse(
      request,
      {
        error: failure.code,
        message: failure.message,
        requested: requestedSelection(body),
      },
      { status: failure.status },
    );
  }
}

async function selectedInventoryEntry(
  videoId: string,
  language: SubtitleLanguagePreference,
  requested: ReturnType<typeof requestedSelection>,
) {
  if (!requested.id && !requested.revisionId && requested.kind !== 'asr') return null;
  return findPracticeSourceInventoryEntry(
    { videoId, requestedLanguage: language },
    requested,
  );
}

function normalizeLanguage(body: SourceSelectionRequest | null): SubtitleLanguagePreference {
  const rawLanguage = body?.language ?? body?.lang;
  return typeof rawLanguage === 'string' && rawLanguage.trim()
    ? rawLanguage.trim()
    : 'auto';
}

function normalizeRequestedKind(
  body: SourceSelectionRequest | null,
): PracticeTextSourceKind | undefined {
  const rawKind = body?.selectedTextSource?.kind ?? body?.textSourceKind;
  if (
    rawKind === 'provided-captions' ||
    rawKind === 'auto-captions' ||
    rawKind === 'asr'
  ) {
    return rawKind;
  }
  if (body?.sourceKind === 'manual') return 'provided-captions';
  if (body?.sourceKind === 'auto') return 'auto-captions';
  return undefined;
}

function sourceKindForTextSource(
  kind: PracticeTextSourceKind | undefined,
): Extract<SubtitleSourceKind, 'manual' | 'auto'> | undefined {
  if (kind === 'provided-captions') return 'manual';
  if (kind === 'auto-captions') return 'auto';
  return undefined;
}

function requestedSelection(body: SourceSelectionRequest | null) {
  return {
    id: cleanString(body?.selectedTextSource?.id) || cleanString(body?.textSourceId),
    revisionId:
      cleanString(body?.selectedTextSource?.revisionId) ||
      cleanString(body?.textSourceRevisionId),
    kind: normalizeRequestedKind(body),
  };
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeSubtitleFailure(error: unknown): {
  message: string;
  code: string;
  status: number;
} {
  if (error instanceof SubtitleProviderError) {
    if (error.code === 'NOT_FOUND') {
      return {
        message: 'No selectable text source is currently available for this video.',
        code: 'source_not_available',
        status: 404,
      };
    }
    if (error.code === 'INVALID_VIDEO') {
      return {
        message: 'Invalid YouTube video ID or unsupported video URL.',
        code: 'invalid_video',
        status: 400,
      };
    }
    if (error.code === 'RATE_LIMIT') {
      return {
        message: 'Subtitle providers are temporarily rate-limited.',
        code: 'provider_rate_limited',
        status: 503,
      };
    }
  }

  const message = error instanceof Error ? error.message : 'Source selection failed.';
  if (message.includes('No subtitles found')) {
    return {
      message: 'No selectable text source is currently available for this video.',
      code: 'source_not_available',
      status: 404,
    };
  }

  return {
    message: 'Source selection failed.',
    code: 'selection_failed',
    status: 500,
  };
}
