import { verifyAudioResolveToken } from '@/lib/audio/resolveToken';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  postTwoThousandNlPlatformJson,
  requireBearerToken,
} from '@/lib/twoThousandNlPlatform';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const bearerToken = requireBearerToken(request);
  if (!bearerToken) {
    return jsonResponse(
      request,
      { status: 'failed', error: { code: 'missing_2000nl_user_token' } },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const body = await request.json().catch(() => null);
  const resolveToken = typeof body?.resolveToken === 'string' ? body.resolveToken : '';
  const payload = verifyAudioResolveToken(resolveToken);
  if (!payload) {
    return jsonResponse(
      request,
      { status: 'failed', error: { code: 'invalid_audio_resolve_token' } },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'audio/resolve',
    {
      text: payload.text,
      languageCode: payload.languageCode,
      purpose: payload.purpose,
      quality: body?.quality === 'premium' ? 'premium' : 'free',
    },
    bearerToken,
  );

  return jsonResponse(request, normalizeAudioResolveOutcome(outcome.body), {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function normalizeAudioResolveOutcome(body: unknown) {
  if (!isRecord(body)) return { status: 'failed', error: { code: 'audio_resolve_failed' } };
  if (body.status === 'ready' && isRecord(body.asset)) {
    const url = stringValue(body.asset.url);
    if (!url) {
      return { status: 'failed', error: { code: 'audio_resolve_missing_url' } };
    }
    return {
      status: 'ready',
      asset: {
        assetId: stringValue(body.asset.assetId) || undefined,
        kind: body.asset.kind === 'curated' ? 'curated' : 'generated',
        source: stringValue(body.asset.source) || '2000nl-tts',
        url,
        format: stringValue(body.asset.format) || 'audio/mpeg',
        expiresAt: stringValue(body.asset.expiresAt) || undefined,
        cache: stringValue(body.asset.cache) || undefined,
      },
    };
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
