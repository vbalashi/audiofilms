import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  getPhraseTranslationAssociation,
  publicPhraseTranslationFromStored,
} from '@/lib/practice/phraseTranslations';
import { requireBearerToken } from '@/lib/twoThousandNlPlatform';

type RouteContext = {
  params: Promise<{ translationId: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request, context: RouteContext) {
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

  const { translationId } = await context.params;
  const stored = await getPhraseTranslationAssociation(decodeURIComponent(translationId));
  if (!stored) {
    return jsonResponse(
      request,
      {
        error: 'not_available',
        detail:
          'AudioFilms has no local phrase association for this translationId yet. Create it with POST /api/practice/phrase-translations.',
      },
      { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return jsonResponse(request, publicPhraseTranslationFromStored(stored), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
