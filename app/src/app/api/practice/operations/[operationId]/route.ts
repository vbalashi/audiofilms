import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  getPracticeTimingOperation,
  publicPracticeTimingOperation,
} from '@/lib/practice/operations';

type RouteContext = {
  params: Promise<{ operationId: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = authorizeAsrRequest(request);
  if (!auth.ok) {
    return jsonResponse(request, auth.body, { status: auth.status });
  }

  const { operationId } = await context.params;
  const operation = await getPracticeTimingOperation(decodeURIComponent(operationId));
  if (!operation) {
    return jsonResponse(
      request,
      {
        error: {
          code: 'practice_operation_not_found',
          message: 'Practice operation not found.',
          retryable: false,
        },
      },
      { status: 404 },
    );
  }

  const publicOperation = await publicPracticeTimingOperation(operation, request);
  if (!publicOperation) {
    return jsonResponse(
      request,
      {
        id: operation.id,
        kind: 'improve-timing',
        state: 'failed',
        videoId: operation.videoId,
        input: operation.input,
        error: {
          code: 'asr_job_not_found',
          message: 'The underlying timing job is missing.',
          retryable: false,
        },
      },
      { status: 404 },
    );
  }

  return jsonResponse(request, publicOperation);
}
