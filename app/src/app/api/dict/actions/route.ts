import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  postTwoThousandNlPlatformJson,
  postTwoThousandNlPlatformV2Json,
  requireBearerToken,
} from '@/lib/twoThousandNlPlatform';

const CARD_TYPE_ID = 'word-to-definition';
const SUPPORTED_ACTIONS = new Set([
  'record-view',
  'start-learning',
  'mark-known',
  'mark-unknown',
  'review-card',
]);
const TURN_ID_REQUIRED_ACTIONS = new Set(['mark-known', 'mark-unknown', 'review-card']);
const TURN_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.contractVersion === 'dict-sense-card-action-v1') {
    return postSenseCardAction(request, body);
  }
  const action = typeof body?.action === 'string' ? body.action : '';
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';
  const clientEventId = normalizedMutationId(body?.clientEventId);
  const sourceContext = normalizedSourceContext(body?.sourceContext);

  if (!SUPPORTED_ACTIONS.has(action)) {
    return jsonResponse(request, { error: 'unsupported_action' }, { status: 400 });
  }
  if (!entryId) {
    return jsonResponse(request, { error: 'missing_entry_id' }, { status: 400 });
  }
  if (body?.clientEventId !== undefined && !clientEventId) {
    return jsonResponse(request, { error: 'invalid_client_event_id' }, { status: 400 });
  }
  if (body?.sourceContext !== undefined && !sourceContext) {
    return jsonResponse(request, { error: 'invalid_source_context' }, { status: 400 });
  }
  if (sourceContext && !clientEventId) {
    return jsonResponse(request, { error: 'missing_client_event_id' }, { status: 400 });
  }
  const turnId = normalizedTurnId(body?.turnId);
  if (TURN_ID_REQUIRED_ACTIONS.has(action) && !turnId && !clientEventId) {
    return jsonResponse(
      request,
      {
        error: 'invalid_turn_id',
        detail:
          'A non-empty turnId idempotency token is required for this dictionary action.',
      },
      { status: 400 },
    );
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
    action,
    entryId,
    cardTypeId: CARD_TYPE_ID,
  };

  if (action === 'review-card') {
    platformBody.result = body?.result;
  }
  if (turnId) {
    platformBody.turnId = turnId;
  }
  if (clientEventId) {
    platformBody.clientEventId = clientEventId;
  }
  if (sourceContext) {
    platformBody.sourceContext = sourceContext;
  }

  const outcome = await postTwoThousandNlPlatformJson(
    'actions',
    platformBody,
    bearerToken,
  );
  return jsonResponse(request, outcome.body, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function postSenseCardAction(request: Request, body: Record<string, unknown>) {
  const actionId = typeof body.actionId === 'string' ? body.actionId : '';
  const clientEventId = normalizedMutationId(body.clientEventId);
  const target = normalizedSenseCardTarget(body.target, actionId);
  const sourceContext = normalizedSourceContext(body.sourceContext);
  const supported = new Set(['start-learning', 'mark-known', 'undo-known', 'review-card']);

  if (!supported.has(actionId)) {
    return jsonResponse(request, { error: 'unsupported_action' }, { status: 400 });
  }
  if (!clientEventId) {
    return jsonResponse(request, { error: 'invalid_client_event_id' }, { status: 400 });
  }
  if (!target) {
    return jsonResponse(request, { error: 'invalid_action_target' }, { status: 400 });
  }
  if (body.sourceContext !== undefined && !sourceContext) {
    return jsonResponse(request, { error: 'invalid_source_context' }, { status: 400 });
  }
  const reviewResult =
    typeof body.reviewResult === 'string' &&
    ['fail', 'hard', 'success', 'easy'].includes(body.reviewResult)
      ? body.reviewResult
      : undefined;
  if (actionId === 'review-card' && !reviewResult) {
    return jsonResponse(request, { error: 'invalid_review_result' }, { status: 400 });
  }

  const bearerToken = requireBearerToken(request);
  if (!bearerToken) {
    return jsonResponse(
      request,
      { error: 'missing_2000nl_user_token' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const platformBody = {
    actionId,
    clientEventId,
    target,
    ...(reviewResult ? { reviewResult } : {}),
    ...(sourceContext ? { sourceContext } : {}),
  };
  const outcome = await postTwoThousandNlPlatformV2Json(
    'actions',
    platformBody,
    bearerToken,
  );
  return jsonResponse(request, outcome.body, {
    status: outcome.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function normalizedTurnId(value: unknown) {
  return normalizedMutationId(value);
}

function normalizedMutationId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return TURN_ID_PATTERN.test(id) ? id : undefined;
}

function normalizedSourceContext(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizedSenseCardTarget(value: unknown, actionId: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const target = value as Record<string, unknown>;
  if (
    target.kind !== 'sense-card' ||
    typeof target.entryId !== 'string' ||
    !target.entryId ||
    target.cardTypeId !== CARD_TYPE_ID ||
    typeof target.stateRevision !== 'string' ||
    !target.stateRevision
  ) {
    return undefined;
  }
  if (
    actionId === 'undo-known' &&
    (typeof target.activeKnownMarkId !== 'string' ||
      !target.activeKnownMarkId ||
      typeof target.knownMarkRevision !== 'string' ||
      !target.knownMarkRevision)
  ) {
    return undefined;
  }
  return target;
}
