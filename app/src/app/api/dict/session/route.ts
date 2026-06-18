import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  getTwoThousandNlPlatformJson,
  requireBearerToken,
} from '@/lib/twoThousandNlPlatform';
import type { DictionarySessionResponse } from '@/types/dictionary';

type PlatformSessionBody = {
  user?: {
    id?: string;
    email?: string | null;
  } | null;
  preferences?: {
    translationTargetLanguageCode?: string | null;
    source?: string | null;
    updatedAt?: string | null;
  } | null;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request) {
  const bearerToken = requireBearerToken(request);
  if (!bearerToken) {
    const responseBody: DictionarySessionResponse = {
      authenticated: false,
      user: null,
      preferences: null,
    };

    return jsonResponse(
      request,
      responseBody,
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const outcome = await getTwoThousandNlPlatformJson('session', bearerToken);
  if (outcome.status === 404) {
    const responseBody: DictionarySessionResponse = {
      authenticated: true,
      user: null,
      preferences: null,
      error: 'platform_session_unavailable',
    };

    return jsonResponse(
      request,
      responseBody,
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const body = outcome.body as PlatformSessionBody;
  const targetLanguage = body?.preferences?.translationTargetLanguageCode || null;
  const responseBody: DictionarySessionResponse = {
    authenticated: outcome.status < 400,
    user: body?.user?.id
      ? {
          id: body.user.id,
          email: body.user.email || null,
        }
      : null,
    preferences: targetLanguage
      ? {
          translationTargetLanguageCode: targetLanguage,
          source: body.preferences?.source || 'user-setting',
          updatedAt: body.preferences?.updatedAt || null,
        }
      : null,
  };

  return jsonResponse(
    request,
    responseBody,
    {
      status: outcome.status,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
