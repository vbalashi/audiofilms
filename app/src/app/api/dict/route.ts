import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import { lookupDictionaryEntry } from '@/lib/dictionaryLookup';
import { getBearerToken } from '@/lib/twoThousandNlPlatform';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');
  const language = searchParams.get('language') || 'en';
  const context = searchParams.get('context') || undefined;

  if (!word) {
    return jsonResponse(request, { error: 'Missing word' }, { status: 400 });
  }

  try {
    const outcome = await lookupDictionaryEntry({
      word,
      language,
      context,
      platformAccessToken: getBearerToken(request),
    });
    return jsonResponse(request, outcome.body, { status: outcome.status });
  } catch {
    return jsonResponse(request, { error: 'Failed to fetch definition' }, { status: 500 });
  }
}
