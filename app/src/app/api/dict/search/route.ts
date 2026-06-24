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
  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const sourceLanguageCode =
    typeof body?.sourceLanguageCode === 'string' ? body.sourceLanguageCode.trim() : '';
  const group = typeof body?.group === 'string' ? body.group.trim() : null;
  const cursor = typeof body?.cursor === 'string' ? body.cursor.trim() : null;
  const limit = parseLimit(body?.limit);

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400 });
  }
  if (!sourceLanguageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400 });
  }
  if (limit === null) {
    return jsonResponse(request, { error: 'invalid_limit' }, { status: 400 });
  }

  const searchMode = resolveSearchMode(request);
  if (!searchMode) {
    return jsonResponse(
      request,
      {
        error: 'guest_search_unavailable',
        code: 'guest_search_unavailable',
        detail:
          'Guest 2000NL search requires DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN, or a forwarded 2000NL user Bearer token.',
      },
      { status: 401 },
    );
  }

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

  if (response instanceof Error) {
    return jsonResponse(
      request,
      {
        error: 'platform_unavailable',
        code: 'platform_unavailable',
        detail: response.message,
      },
      { status: 502, headers: responseHeaders(searchMode) },
    );
  }

  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    return jsonResponse(
      request,
      payload || {
        error: mapPlatformError(response.status),
        code: mapPlatformError(response.status),
        detail: safePlatformErrorDetail(text),
      },
      {
        status: response.status === 429 ? 429 : response.status === 503 ? 503 : 502,
        headers: responseHeaders(searchMode),
      },
    );
  }

  return jsonResponse(request, payload, {
    status: 200,
    headers: responseHeaders(searchMode),
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

function responseHeaders(searchMode: SearchMode) {
  return searchMode.cacheControl ? { 'Cache-Control': searchMode.cacheControl } : undefined;
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'authentication_required';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'search_index_not_ready';
  return 'platform_unavailable';
}
