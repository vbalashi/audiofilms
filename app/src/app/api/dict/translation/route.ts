import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  postTwoThousandNlPlatformJson,
  requireBearerToken,
} from '@/lib/twoThousandNlPlatform';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';
  const item = body?.item && typeof body.item === 'object' ? body.item : null;
  const targetLang = typeof body?.targetLang === 'string' ? body.targetLang : undefined;

  if (!entryId && !item) {
    return jsonResponse(request, { error: 'missing_entry_id' }, { status: 400 });
  }
  const bearerToken = requireBearerToken(request);
  if (!bearerToken) {
    return jsonResponse(
      request,
      { error: 'missing_2000nl_user_token' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const platformBody: Record<string, unknown> = {
    force: body?.force === true,
  };
  if (entryId && !item) {
    platformBody.entryId = entryId;
  }
  if (item) {
    platformBody.item = item;
  }
  if (targetLang) {
    platformBody.targetLang = targetLang;
  }

  const outcome = await postTwoThousandNlPlatformJson('translation', platformBody, bearerToken);
  return jsonResponse(request, outcome.body, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
