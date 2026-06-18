import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  getBearerToken,
  postTwoThousandNlPlatformJson,
} from '@/lib/twoThousandNlPlatform';

const CARD_TYPE_ID = 'word-to-definition';
const SUPPORTED_ACTIONS = new Set([
  'record-view',
  'start-learning',
  'mark-known',
  'mark-unknown',
  'review-card',
]);

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';

  if (!SUPPORTED_ACTIONS.has(action)) {
    return jsonResponse(request, { error: 'unsupported_action' }, { status: 400 });
  }
  if (!entryId) {
    return jsonResponse(request, { error: 'missing_entry_id' }, { status: 400 });
  }

  const platformBody: Record<string, unknown> = {
    action,
    entryId,
    cardTypeId: CARD_TYPE_ID,
  };

  if (action === 'review-card') {
    platformBody.result = body?.result;
    if (typeof body?.turnId === 'string') {
      platformBody.turnId = body.turnId;
    }
  } else if (typeof body?.turnId === 'string') {
    platformBody.turnId = body.turnId;
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'actions',
    platformBody,
    getBearerToken(request),
  );
  return jsonResponse(request, outcome.body, { status: outcome.status });
}
