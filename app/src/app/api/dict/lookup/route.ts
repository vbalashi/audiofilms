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
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const sourceLanguageCode =
    typeof body?.sourceLanguageCode === 'string' ? body.sourceLanguageCode.trim() : '';
  const contextText = typeof body?.contextText === 'string' ? body.contextText : undefined;

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400 });
  }
  if (!sourceLanguageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400 });
  }

  const lookupMode = resolveLookupMode(request);
  if (!lookupMode) {
    return jsonResponse(
      request,
      {
        error: 'guest_lookup_unavailable',
        code: 'guest_lookup_unavailable',
        detail:
          'Guest 2000NL lookup requires DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN, or a forwarded 2000NL user Bearer token.',
      },
      { status: 401 },
    );
  }

  const platformAttempt = await fetchPlatformLookup(
    clickedForm,
    sourceLanguageCode,
    contextText,
    lookupMode,
  );
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
        headers: responseHeaders(lookupMode),
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
        headers: responseHeaders(lookupMode),
      },
    );
  }

  const responseBody = projectDictionaryLookupV2Response(
    platformBody,
    clickedForm,
    sourceLanguageCode,
    contextText,
    {
      allowProgressActions: lookupMode.allowProgressActions,
      translationFallbackReason,
    },
  );

  if ('error' in responseBody) {
    return jsonResponse(
      request,
      responseBody,
      {
        status: 404,
        headers: responseHeaders(lookupMode),
      },
    );
  }

  return jsonResponse(
    request,
    responseBody,
    {
      status: 200,
      headers: responseHeaders(lookupMode),
    },
  );
}

async function fetchPlatformLookup(
  clickedForm: string,
  sourceLanguageCode: string,
  contextText: string | undefined,
  lookupMode: LookupMode,
): Promise<PlatformLookupAttempt> {
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
    };
  } catch (error) {
    return {
      response: null,
      body: null,
      detail: error instanceof Error ? error.message : String(error),
      error,
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

function responseHeaders(lookupMode: LookupMode) {
  return lookupMode.cacheControl ? { 'Cache-Control': lookupMode.cacheControl } : undefined;
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'authentication_required';
  if (status === 404) return 'no_match';
  if (status === 429) return 'rate_limited';
  return 'platform_unavailable';
}
