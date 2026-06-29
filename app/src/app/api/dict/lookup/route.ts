import { DEFAULT_2000NL_API_BASE } from '@/lib/providers/dictionary';
import {
  projectDictionaryLookupV2Response,
  type PlatformLookupResponse,
} from '@/lib/dictionary/overlayProjection';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import { getBearerToken } from '@/lib/twoThousandNlPlatform';

type LookupMode = {
  endpoint: 'lookup' | 'catalog/lookup';
  accessToken: string;
  includeUserState: boolean;
  includeTranslations: boolean;
  allowProgressActions: boolean;
  cacheControl?: string;
};

type PlatformLookupAttempt = {
  response: Response | null;
  body: PlatformLookupResponse | null;
  detail: string | null;
  error: unknown;
  durationMs: number;
  serverTiming: string;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let lookupMode: LookupMode | null = null;
  let platformDurationMs = 0;
  let projectionDurationMs = 0;
  let platformStatus: number | null = null;
  let platformServerTiming = '';
  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const sourceLanguageCode =
    typeof body?.sourceLanguageCode === 'string' ? body.sourceLanguageCode.trim() : '';
  const contextText = typeof body?.contextText === 'string' ? body.contextText : undefined;

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400, headers: timingHeaders(startedAt, null) });
  }
  if (!sourceLanguageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400, headers: timingHeaders(startedAt, null) });
  }

  lookupMode = resolveLookupMode(request);
  if (!lookupMode) {
    return jsonResponse(
      request,
      {
        error: 'guest_lookup_unavailable',
        code: 'guest_lookup_unavailable',
        detail:
          'Guest 2000NL lookup requires DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN, or a forwarded 2000NL user Bearer token.',
      },
      { status: 401, headers: timingHeaders(startedAt, null) },
    );
  }

  const platformAttempt = await fetchPlatformLookup(
    clickedForm,
    sourceLanguageCode,
    contextText,
    lookupMode,
  );
  platformDurationMs = platformAttempt.durationMs;
  platformStatus = platformAttempt.response?.status || null;
  platformServerTiming = platformAttempt.serverTiming;
  let platformResponse = platformAttempt.response;
  let platformBody = platformAttempt.body;
  let translationFallbackReason: string | undefined;

  if (
    platformResponse &&
    platformResponse.status >= 500 &&
    lookupMode.includeTranslations &&
    lookupMode.endpoint === 'lookup'
  ) {
    const fallbackMode = {
      ...lookupMode,
      includeTranslations: false,
    };
    const fallbackAttempt = await fetchPlatformLookup(
      clickedForm,
      sourceLanguageCode,
      contextText,
      fallbackMode,
    );
    if (fallbackAttempt.response?.ok) {
      platformDurationMs += fallbackAttempt.durationMs;
      platformStatus = fallbackAttempt.response.status;
      platformServerTiming = fallbackAttempt.serverTiming;
      translationFallbackReason =
        platformAttempt.body?.error || platformAttempt.detail || `HTTP ${platformResponse.status}`;
      platformResponse = fallbackAttempt.response;
      platformBody = fallbackAttempt.body;
    }
  }

  if (!platformResponse) {
    return jsonResponse(
      request,
      {
        error: 'platform_unavailable',
        code: 'platform_unavailable',
        detail: platformAttempt.detail,
      },
      {
        status: 502,
        headers: responseHeaders(lookupMode, timingHeaders(startedAt, lookupMode, {
          platformDurationMs,
          platformStatus,
          platformServerTiming,
        })),
      },
    );
  }

  if (!platformResponse.ok) {
    return jsonResponse(
      request,
      {
        error: mapPlatformError(platformResponse.status),
        code: mapPlatformError(platformResponse.status),
        detail: platformBody?.error || platformBody?.detail || platformAttempt.detail,
      },
      {
        status: platformResponse.status === 429 ? 429 : 502,
        headers: responseHeaders(lookupMode, timingHeaders(startedAt, lookupMode, {
          platformDurationMs,
          platformStatus,
          platformServerTiming,
        })),
      },
    );
  }

  const projectionStartedAt = Date.now();
  const responseBody = projectDictionaryLookupV2Response(
    platformBody,
    clickedForm,
    sourceLanguageCode,
    contextText,
    {
      allowProgressActions: lookupMode.allowProgressActions,
      translationFallbackReason,
      audioBaseUrl: platformAudioBase(),
    },
  );
  projectionDurationMs = Date.now() - projectionStartedAt;

  if ('error' in responseBody) {
    logLookupTiming('lookup', clickedForm, lookupMode, 404, startedAt, {
      platformDurationMs,
      platformStatus,
      projectionDurationMs,
      platformServerTiming,
    });
    return jsonResponse(
      request,
      responseBody,
      {
        status: 404,
        headers: responseHeaders(lookupMode, timingHeaders(startedAt, lookupMode, {
          platformDurationMs,
          platformStatus,
          projectionDurationMs,
          platformServerTiming,
        })),
      },
    );
  }

  logLookupTiming('lookup', clickedForm, lookupMode, 200, startedAt, {
    platformDurationMs,
    platformStatus,
    projectionDurationMs,
    platformServerTiming,
  });
  return jsonResponse(
    request,
    responseBody,
    {
      status: 200,
      headers: responseHeaders(lookupMode, timingHeaders(startedAt, lookupMode, {
        platformDurationMs,
        platformStatus,
        projectionDurationMs,
        platformServerTiming,
      })),
    },
  );
}

async function fetchPlatformLookup(
  clickedForm: string,
  sourceLanguageCode: string,
  contextText: string | undefined,
  lookupMode: LookupMode,
): Promise<PlatformLookupAttempt> {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${platformApiBase()}/${lookupMode.endpoint}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${lookupMode.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(
        platformLookupRequest(clickedForm, sourceLanguageCode, contextText, lookupMode),
      ),
    });
    const text = await response.text();
    const body = parsePlatformJson(text);

    return {
      response,
      body,
      detail: body?.error || body?.detail || safePlatformErrorDetail(text),
      error: null,
      durationMs: Date.now() - startedAt,
      serverTiming: response.headers.get('server-timing') || '',
    };
  } catch (error) {
    return {
      response: null,
      body: null,
      detail: error instanceof Error ? error.message : String(error),
      error,
      durationMs: Date.now() - startedAt,
      serverTiming: '',
    };
  }
}

function parsePlatformJson(text: string) {
  try {
    return text ? (JSON.parse(text) as PlatformLookupResponse) : null;
  } catch {
    return null;
  }
}

function safePlatformErrorDetail(text: string) {
  const body = text.trim();
  if (!body) return null;
  if (/^<!doctype\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
    return '2000NL returned HTML instead of JSON.';
  }
  return body.slice(0, 240);
}

function platformApiBase() {
  return (process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE).replace(
    /\/+$/,
    '',
  );
}

function platformAudioBase() {
  const configured = process.env.DICTIONARY_2000NL_AUDIO_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  try {
    const url = new URL(platformApiBase());
    return url.origin;
  } catch {
    return '';
  }
}

function getLocalDogfoodGuestLookupToken() {
  const enabled =
    process.env.DICTIONARY_2000NL_LOCAL_DOGFOOD_GUEST_LOOKUP === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (!enabled) return undefined;
  return process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim() || undefined;
}

function getCatalogLookupToken() {
  return process.env.DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN?.trim() || undefined;
}

function resolveLookupMode(request: Request): LookupMode | null {
  const forwardedBearer = getBearerToken(request);
  if (forwardedBearer) {
    return {
      endpoint: 'lookup',
      accessToken: forwardedBearer,
      includeUserState: true,
      includeTranslations: true,
      allowProgressActions: true,
      cacheControl: 'private, no-store',
    };
  }

  const catalogToken = getCatalogLookupToken();
  if (catalogToken) {
    return {
      endpoint: 'catalog/lookup',
      accessToken: catalogToken,
      includeUserState: false,
      includeTranslations: false,
      allowProgressActions: false,
    };
  }

  const localDogfoodToken = getLocalDogfoodGuestLookupToken();
  if (localDogfoodToken) {
    return {
      endpoint: 'lookup',
      accessToken: localDogfoodToken,
      includeUserState: false,
      includeTranslations: false,
      allowProgressActions: false,
    };
  }

  return null;
}

function platformLookupRequest(
  clickedForm: string,
  sourceLanguageCode: string,
  contextText: string | undefined,
  lookupMode: LookupMode,
) {
  const baseRequest: Record<string, unknown> = {
    query: clickedForm,
    languageCode: sourceLanguageCode,
    contextText,
  };

  if (lookupMode.includeUserState) {
    return {
      ...baseRequest,
      includeUserState: true,
      includeTranslations: lookupMode.includeTranslations,
      intent: 'external-click',
    };
  }

  return baseRequest;
}

function responseHeaders(lookupMode: LookupMode, headers: Record<string, string> = {}) {
  return lookupMode.cacheControl ? { ...headers, 'Cache-Control': lookupMode.cacheControl } : headers;
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'authentication_required';
  if (status === 404) return 'no_match';
  if (status === 429) return 'rate_limited';
  return 'platform_unavailable';
}

function timingHeaders(
  startedAt: number,
  lookupMode: LookupMode | null,
  timing: {
    platformDurationMs?: number;
    platformStatus?: number | null;
    projectionDurationMs?: number;
    platformServerTiming?: string;
  } = {},
) {
  const totalMs = Date.now() - startedAt;
  const mode = lookupMode?.includeUserState ? 'authenticated' : lookupMode ? 'catalog' : 'none';
  const values = [
    timingMetric('af_total', totalMs),
    timingMetric('af_platform', timing.platformDurationMs || 0),
    timingMetric('af_projection', timing.projectionDurationMs || 0),
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

function logLookupTiming(
  operation: string,
  query: string,
  lookupMode: LookupMode,
  status: number,
  startedAt: number,
  timing: {
    platformDurationMs?: number;
    platformStatus?: number | null;
    projectionDurationMs?: number;
    platformServerTiming?: string;
  },
) {
  console.info('[dict.lookup.timing]', {
    operation,
    query,
    mode: lookupMode.includeUserState ? 'authenticated' : 'catalog',
    status,
    totalMs: Date.now() - startedAt,
    platformMs: timing.platformDurationMs || 0,
    platformStatus: timing.platformStatus,
    projectionMs: timing.projectionDurationMs || 0,
    platformServerTiming: timing.platformServerTiming || '',
  });
}
