import { DEFAULT_2000NL_API_BASE } from '@/lib/providers/dictionary';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import { getBearerToken } from '@/lib/twoThousandNlPlatform';

type SearchMode = {
  endpoint: 'search' | 'catalog/search';
  accessToken: string;
  cacheControl?: string;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let searchMode: SearchMode | null = null;
  let platformDurationMs = 0;
  let platformStatus: number | null = null;
  let platformServerTiming = '';
  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const sourceLanguageCode =
    typeof body?.sourceLanguageCode === 'string' ? body.sourceLanguageCode.trim() : '';
  const group = typeof body?.group === 'string' ? body.group.trim() : null;
  const cursor = typeof body?.cursor === 'string' ? body.cursor.trim() : null;
  const limit = parseLimit(body?.limit);

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, {
      status: 400,
      headers: timingHeaders(startedAt, null),
    });
  }
  if (!sourceLanguageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, {
      status: 400,
      headers: timingHeaders(startedAt, null),
    });
  }
  if (limit === null) {
    return jsonResponse(request, { error: 'invalid_limit' }, {
      status: 400,
      headers: timingHeaders(startedAt, null),
    });
  }

  searchMode = resolveSearchMode(request);
  if (!searchMode) {
    return jsonResponse(
      request,
      {
        error: 'guest_search_unavailable',
        code: 'guest_search_unavailable',
        detail:
          'Guest 2000NL search requires DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN, or a forwarded 2000NL user Bearer token.',
      },
      { status: 401, headers: timingHeaders(startedAt, null) },
    );
  }

  const platformStartedAt = Date.now();
  const response = await fetch(`${platformApiBase()}/${searchMode.endpoint}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${searchMode.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: clickedForm,
      languageCode: sourceLanguageCode,
      ...(group ? { group } : {}),
      limit,
      ...(cursor ? { cursor } : {}),
    }),
  }).catch((error) => error as Error);
  platformDurationMs = Date.now() - platformStartedAt;

  if (response instanceof Error) {
    logSearchTiming(clickedForm, searchMode, 502, startedAt, {
      platformDurationMs,
      platformStatus,
      platformServerTiming,
    });
    return jsonResponse(
      request,
      {
        error: 'platform_unavailable',
        code: 'platform_unavailable',
        detail: response.message,
      },
      {
        status: 502,
        headers: responseHeaders(searchMode, timingHeaders(startedAt, searchMode, {
          platformDurationMs,
          platformStatus,
          platformServerTiming,
        })),
      },
    );
  }
  platformStatus = response.status;
  platformServerTiming = response.headers.get('server-timing') || '';

  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    logSearchTiming(clickedForm, searchMode, response.status === 429 ? 429 : response.status === 503 ? 503 : 502, startedAt, {
      platformDurationMs,
      platformStatus,
      platformServerTiming,
    });
    return jsonResponse(
      request,
      payload || {
        error: mapPlatformError(response.status),
        code: mapPlatformError(response.status),
        detail: safePlatformErrorDetail(text),
      },
      {
        status: response.status === 429 ? 429 : response.status === 503 ? 503 : 502,
        headers: responseHeaders(searchMode, timingHeaders(startedAt, searchMode, {
          platformDurationMs,
          platformStatus,
          platformServerTiming,
        })),
      },
    );
  }

  logSearchTiming(clickedForm, searchMode, 200, startedAt, {
    platformDurationMs,
    platformStatus,
    platformServerTiming,
  });
  return jsonResponse(request, payload, {
    status: 200,
    headers: responseHeaders(searchMode, timingHeaders(startedAt, searchMode, {
      platformDurationMs,
      platformStatus,
      platformServerTiming,
    })),
  });
}

function parseLimit(value: unknown) {
  if (value === undefined || value === null) return 6;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(Math.max(Math.trunc(numeric), 1), 100);
}

function parseJson(text: string) {
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

function safePlatformErrorDetail(text: string) {
  const value = text.trim();
  if (!value) return null;
  if (/^<!doctype\s+html/i.test(value) || /<html[\s>]/i.test(value)) {
    return '2000NL returned HTML instead of JSON.';
  }
  return value.slice(0, 240);
}

function platformApiBase() {
  return (process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE).replace(
    /\/+$/,
    '',
  );
}

function getLocalDogfoodGuestSearchToken() {
  const enabled =
    process.env.DICTIONARY_2000NL_LOCAL_DOGFOOD_GUEST_LOOKUP === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (!enabled) return undefined;
  return process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim() || undefined;
}

function resolveSearchMode(request: Request): SearchMode | null {
  const forwardedBearer = getBearerToken(request);
  if (forwardedBearer) {
    return {
      endpoint: 'search',
      accessToken: forwardedBearer,
      cacheControl: 'private, no-store',
    };
  }

  const catalogToken = process.env.DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN?.trim();
  if (catalogToken) {
    return {
      endpoint: 'catalog/search',
      accessToken: catalogToken,
    };
  }

  const localDogfoodToken = getLocalDogfoodGuestSearchToken();
  if (localDogfoodToken) {
    return {
      endpoint: 'search',
      accessToken: localDogfoodToken,
    };
  }

  return null;
}

function responseHeaders(searchMode: SearchMode, headers: Record<string, string> = {}) {
  return searchMode.cacheControl ? { ...headers, 'Cache-Control': searchMode.cacheControl } : headers;
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'authentication_required';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'search_index_not_ready';
  return 'platform_unavailable';
}

function timingHeaders(
  startedAt: number,
  searchMode: SearchMode | null,
  timing: {
    platformDurationMs?: number;
    platformStatus?: number | null;
    platformServerTiming?: string;
  } = {},
) {
  const totalMs = Date.now() - startedAt;
  const mode = searchMode?.endpoint === 'search' ? 'authenticated' : searchMode ? 'catalog' : 'none';
  const values = [
    timingMetric('af_total', totalMs),
    timingMetric('af_platform', timing.platformDurationMs || 0),
    `af_mode;desc="${mode}"`,
  ];
  if (typeof timing.platformStatus === 'number') {
    values.push(`af_platform_status;desc="${timing.platformStatus}"`);
  }
  if (timing.platformServerTiming) {
    values.push(`af_platform_server;desc="${sanitizeServerTiming(timing.platformServerTiming)}"`);
  }
  return {
    'Server-Timing': values.join(', '),
    ...(timing.platformServerTiming
      ? { 'X-AF-Platform-Server-Timing': sanitizeHeaderValue(timing.platformServerTiming) }
      : {}),
  };
}

function timingMetric(name: string, value: number) {
  return `${name};dur=${Math.max(0, Math.round(value))}`;
}

function sanitizeServerTiming(value: string) {
  return value.replace(/["\\\r\n]/g, ' ').slice(0, 600);
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]/g, ' ').slice(0, 2000);
}

function logSearchTiming(
  query: string,
  searchMode: SearchMode,
  status: number,
  startedAt: number,
  timing: {
    platformDurationMs?: number;
    platformStatus?: number | null;
    platformServerTiming?: string;
  },
) {
  console.info('[dict.search.timing]', {
    operation: 'search',
    query,
    mode: searchMode.endpoint === 'search' ? 'authenticated' : 'catalog',
    status,
    totalMs: Date.now() - startedAt,
    platformMs: timing.platformDurationMs || 0,
    platformStatus: timing.platformStatus,
    platformServerTiming: timing.platformServerTiming || '',
  });
}
