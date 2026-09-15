import {
  isPlatformLookupV2Response,
  projectSenseCardLookup,
} from '@/lib/dictionary/senseCardContract';
import { twoThousandNlPlatformV2ApiBase } from '@/lib/twoThousandNlPlatform';

type SenseCardLookupInput = {
  clickedForm: string;
  sourceLanguageCode: string;
  translationTargetLanguageCode: string;
  endpoint: 'lookup' | 'catalog/lookup';
  accessToken: string;
  includeTranslations: boolean;
};

export type SenseCardLookupOutcome = {
  status: number;
  body: unknown;
  platformDurationMs: number;
  platformStatus?: number;
  platformServerTiming?: string;
};

export function senseCardV2Enabled() {
  return process.env.DICTIONARY_2000NL_SENSE_CARD_V2 === 'true';
}

export async function lookupSenseCard(
  input: SenseCardLookupInput,
): Promise<SenseCardLookupOutcome> {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${twoThousandNlPlatformV2ApiBase()}/${input.endpoint}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: input.clickedForm,
        contentLanguageCode: input.sourceLanguageCode,
        translationTargetLanguageCode:
          input.includeTranslations && input.translationTargetLanguageCode
            ? input.translationTargetLanguageCode
            : null,
        cardTypeId: 'word-to-definition',
        intent: 'external-click',
      }),
    });
    const text = await response.text();
    const payload = parseJson(text);
    const timing = {
      platformDurationMs: Date.now() - startedAt,
      platformStatus: response.status,
      platformServerTiming: response.headers.get('server-timing') || '',
    };

    if (!response.ok) {
      const error = mapPlatformError(response.status);
      return {
        status: response.status === 429 ? 429 : 502,
        body: {
          error,
          code: error,
          detail: platformErrorDetail(payload, text),
        },
        ...timing,
      };
    }
    if (!isPlatformLookupV2Response(payload)) {
      return {
        status: 502,
        body: {
          error: 'invalid_platform_contract',
          code: 'platform_unavailable',
          detail: '2000NL did not return platform-lookup-v2.',
        },
        ...timing,
      };
    }

    return {
      status: 200,
      body: projectSenseCardLookup(payload, input.clickedForm),
      ...timing,
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: 'platform_unavailable',
        code: 'platform_unavailable',
        detail: error instanceof Error ? error.message : String(error),
      },
      platformDurationMs: Date.now() - startedAt,
    };
  }
}

function parseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function platformErrorDetail(payload: unknown, text: string) {
  if (payload && typeof payload === 'object') {
    const body = payload as { error?: unknown; detail?: unknown };
    if (typeof body.error === 'string') return body.error;
    if (typeof body.detail === 'string') return body.detail;
  }
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return '2000NL returned HTML instead of JSON.';
  }
  return trimmed.slice(0, 240);
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'platform_unauthorized';
  if (status === 404) return 'no_match';
  if (status === 429) return 'rate_limited';
  return 'platform_unavailable';
}
