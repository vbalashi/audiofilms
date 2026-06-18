import crypto from 'node:crypto';
import { getAsrRuntimeConfig, testerTokens } from '@/lib/asr/asrConfig';

type AuthResult =
  | { ok: true; subject: string }
  | { ok: false; status: number; body: Record<string, unknown> };

function bearerToken(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || request.headers.get('x-audiofilms-tester-token')?.trim() || '';
}

function tokenSubject(token: string): string {
  return `tester:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
}

export function authorizeAsrRequest(request: Request): AuthResult {
  const config = getAsrRuntimeConfig();
  if (!config.authRequired) {
    return { ok: true, subject: 'auth-disabled' };
  }

  const acceptedTokens = testerTokens();
  if (!acceptedTokens.length) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'asr_auth_not_configured',
        status: 'unavailable',
        suggestedAction: 'Configure ASR_TESTER_TOKENS before enabling public ASR job creation.',
      },
    };
  }

  const token = bearerToken(request);
  if (!token || !acceptedTokens.includes(token)) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'asr_unauthorized',
        status: 'unauthorized',
        suggestedAction: 'Send an allowed tester token as a Bearer token.',
      },
    };
  }

  return { ok: true, subject: tokenSubject(token) };
}
