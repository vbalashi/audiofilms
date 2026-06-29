import { DEFAULT_2000NL_API_BASE } from '@/lib/providers/dictionary';

export type PlatformProxyOutcome = {
  status: number;
  body: unknown;
};

export function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

export function requireBearerToken(request: Request) {
  return getBearerToken(request);
}

export async function postTwoThousandNlPlatformJson(
  path:
    | 'actions'
    | 'translation'
    | 'lookup'
    | 'text-translation'
    | 'audio/resolve'
    | 'user-dictionary/generated-entry'
    | 'user-dictionary/generated-entry/draft',
  body: unknown,
  accessToken: string,
): Promise<PlatformProxyOutcome> {
  if (!accessToken) {
    return {
      status: 401,
      body: {
        error: 'missing_2000nl_user_token',
        detail: 'A forwarded 2000NL user Bearer token is required for this platform write.',
      },
    };
  }

  const apiBase = (
    process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE
  ).replace(/\/+$/, '');
  const response = await fetch(`${apiBase}/${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  return {
    status: response.status,
    body: payload || { error: `2000NL ${path} returned HTTP ${response.status}` },
  };
}

export async function getTwoThousandNlPlatformJson(
  path: 'session',
  accessToken: string,
): Promise<PlatformProxyOutcome> {
  if (!accessToken) {
    return {
      status: 401,
      body: {
        error: 'missing_2000nl_user_token',
        detail: 'A forwarded 2000NL user Bearer token is required for this platform read.',
      },
    };
  }

  const apiBase = (
    process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE
  ).replace(/\/+$/, '');
  const response = await fetch(`${apiBase}/${path}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await response.json().catch(() => null);

  return {
    status: response.status,
    body: payload || { error: `2000NL ${path} returned HTTP ${response.status}` },
  };
}
