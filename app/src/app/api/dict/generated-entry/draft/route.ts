import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  projectOverlayCard,
  type PlatformLookupItem,
} from '@/lib/dictionary/overlayProjection';
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

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400 });
  }
  if (!languageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400 });
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'user-dictionary/generated-entry/draft',
    {
      clickedForm,
      languageCode,
      ...(typeof body?.draftSetId === 'string' ? { draftSetId: body.draftSetId } : {}),
      ...(typeof body?.contextText === 'string' ? { contextText: body.contextText } : {}),
      ...(body?.sourceContext && typeof body.sourceContext === 'object'
        ? { sourceContext: body.sourceContext }
        : {}),
    },
    bearerToken,
  );

  const responseBody = projectDraftResponseCard(outcome.body, clickedForm, languageCode);

  return jsonResponse(request, responseBody, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function projectDraftResponseCard(body: unknown, clickedForm: string, languageCode: string) {
  if (!isRecord(body)) return body;
  const draft = isRecord(body.draft) ? body.draft : null;
  if (!draft || isRecord(draft.card)) return body;

  const item = draftItem(draft);
  if (!item) return body;

  return {
    ...body,
    draft: {
      ...draft,
      card: {
        ...projectOverlayCard(item, clickedForm, languageCode, 0, {
          allowProgressActions: true,
        }),
        generatedDraftItem: item,
      },
    },
  };
}

function draftItem(draft: Record<string, unknown>): PlatformLookupItem | null {
  if (isRecord(draft.item)) return draft.item as PlatformLookupItem;
  if (Array.isArray(draft.items) && isRecord(draft.items[0])) {
    return draft.items[0] as PlatformLookupItem;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
