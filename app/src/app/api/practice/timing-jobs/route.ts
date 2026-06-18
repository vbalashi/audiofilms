import { getAsrRuntimeConfig } from '@/lib/asr/asrConfig';
import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { checkAsrJobCreationRateLimit } from '@/lib/asr/asrRateLimit';
import {
  createOrGetAsrJob,
  normalizeAsrJobRequest,
} from '@/lib/asr/asrJobs';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  practiceTimingInputFromBody,
  publicPracticeTimingOperation,
  upsertPracticeTimingOperation,
} from '@/lib/practice/operations';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const config = getAsrRuntimeConfig();

  if (config.mode === 'disabled') {
    return jsonResponse(
      request,
      rejectedOperation('asr_unavailable', 'ASR jobs are disabled for this deployment.', true),
      { status: 503 },
    );
  }

  const auth = authorizeAsrRequest(request);
  if (!auth.ok) {
    return jsonResponse(request, auth.body, { status: auth.status });
  }

  const rateLimit = checkAsrJobCreationRateLimit(auth.subject);
  if (!rateLimit.ok) {
    return jsonResponse(
      request,
      rejectedOperation('asr_rate_limited', 'Too many timing jobs were started recently.', true, {
        retryAfterMs: rateLimit.retryAfterMs,
      }),
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};

  try {
    const jobRequest = normalizeAsrJobRequest(record, config);
    const outcome = await createOrGetAsrJob(jobRequest, auth.subject, config);
    const operation = await upsertPracticeTimingOperation(
      outcome.job,
      practiceTimingInputFromBody(record, outcome.job),
      config,
    );
    const publicOperation = await publicPracticeTimingOperation(operation, request, config);
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
        { status: 500 },
      );
    }

    return jsonResponse(
      request,
      {
        ...publicOperation,
        deduplicated: !outcome.created,
      },
      { status: outcome.created ? 202 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'asr_job_create_failed';
    const [code, detail] = message.split(':');
    const status = code === 'asr_queue_full' ? 429 : 400;

    return jsonResponse(
      request,
      rejectedOperation(
        code,
        practiceErrorMessage(code, detail),
        code === 'asr_queue_full' || code === 'full_audio_disabled',
      ),
      { status },
    );
  }
}

function rejectedOperation(
  code: string,
  message: string,
  retryable: boolean,
  extra: Record<string, unknown> = {},
) {
  return {
    id: null,
    kind: 'improve-timing',
    state: 'failed',
    error: {
      code,
      message,
      retryable,
    },
    ...extra,
  };
}

function practiceErrorMessage(code: string, detail?: string): string {
  if (code === 'missing_video_id') return 'Missing videoId.';
  if (code === 'invalid_video_id') return 'Invalid YouTube video ID.';
  if (code === 'invalid_duration') return 'Invalid duration.';
  if (code === 'duration_exceeds_limit') return `Duration exceeds the configured limit of ${detail} seconds.`;
  if (code === 'full_audio_disabled') return 'Full-audio timing jobs are disabled for this deployment.';
  if (code === 'asr_queue_full') return `The timing job queue is full${detail ? ` (${detail} active jobs)` : ''}.`;
  return 'Timing job creation failed.';
}
