import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  normalizePhraseTranslationRequest,
  platformTextTranslationBody,
  projectPhraseTranslation,
  savePhraseTranslationAssociation,
  type PlatformTextTranslationResponse,
} from '@/lib/practice/phraseTranslations';
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
      {
        error: 'authentication_required',
        code: 'missing_2000nl_user_token',
      },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = normalizePhraseTranslationRequest(body);
  } catch (error) {
    return jsonResponse(
      request,
      { error: (error as Error).message || 'invalid_phrase_translation_request' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'text-translation',
    platformTextTranslationBody(input),
    bearerToken,
  );
  const translation = projectPhraseTranslation(
    input,
    outcome.body as PlatformTextTranslationResponse,
  );

  await savePhraseTranslationAssociation(input, translation);

  return jsonResponse(request, translation, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
