import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  getBearerToken,
  postTwoThousandNlPlatformJson,
} from '@/lib/twoThousandNlPlatform';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';
  const targetLang = typeof body?.targetLang === 'string' ? body.targetLang : '';

  if (!entryId) {
    return jsonResponse(request, { error: 'missing_entry_id' }, { status: 400 });
  }
  if (!targetLang) {
    return jsonResponse(request, { error: 'missing_target_lang' }, { status: 400 });
  }

  const outcome = await postTwoThousandNlPlatformJson('translation', {
    entryId,
    targetLang,
    force: body?.force === true,
  }, getBearerToken(request));
  return jsonResponse(request, outcome.body, { status: outcome.status });
}
