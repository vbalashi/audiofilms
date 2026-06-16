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

export async function postTwoThousandNlPlatformJson(
  path: 'actions' | 'translation',
  body: unknown,
  accessTokenOverride?: string,
): Promise<PlatformProxyOutcome> {
  const accessToken =
    accessTokenOverride || process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return {
      status: 500,
      body: {
        error: 'missing_2000nl_access_token',
        detail: 'DICTIONARY_2000NL_ACCESS_TOKEN is required for 2000NL platform proxy calls.',
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
