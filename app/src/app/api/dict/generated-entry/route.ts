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
      { error: 'missing_2000nl_user_token' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const languageCode =
    typeof body?.sourceLanguageCode === 'string'
      ? body.sourceLanguageCode.trim()
      : typeof body?.languageCode === 'string'
        ? body.languageCode.trim()
        : '';
  const generated = body?.generated && typeof body.generated === 'object'
    ? body.generated
    : null;

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400 });
  }
  if (!languageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400 });
  }
  if (!generated) {
    return jsonResponse(request, { error: 'missing_generated_content' }, { status: 400 });
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'user-dictionary/generated-entry',
    {
      clickedForm,
      languageCode,
      generated,
      ...(typeof body?.contextText === 'string' ? { contextText: body.contextText } : {}),
      ...(body?.sourceContext && typeof body.sourceContext === 'object'
        ? { sourceContext: body.sourceContext }
        : {}),
    },
    bearerToken,
  );

  return jsonResponse(request, outcome.body, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
