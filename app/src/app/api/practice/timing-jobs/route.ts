import { getAsrRuntimeConfig } from '@/lib/asr/asrConfig';
import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { checkAsrJobCreationRateLimit } from '@/lib/asr/asrRateLimit';
import {
  createOrGetAsrJob,
  getReusableAsrJob,
  normalizeAsrJobRequest,
  type AsrJobRequest,
} from '@/lib/asr/asrJobs';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import {
  practiceTimingInputFromBody,
  publicPracticeTimingOperation,
  upsertPracticeTimingOperation,
} from '@/lib/practice/operations';
import type { RejectedPracticeOperation } from '@/types/practice';

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

  const body = await request.json().catch(() => null);
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};

  try {
    const jobRequest = normalizeAsrJobRequest(record, config);
    const reusableJob = await getReusableAsrJob(jobRequest, config);
    if (!reusableJob && parseBoolean(record.reuseOnly)) {
      return jsonResponse(
        request,
        rejectedOperation('asr_cache_miss', 'No cached ASR timing is available for this request.', false),
        { status: 404 },
      );
    }
    const outcome = reusableJob
      ? { job: reusableJob, created: false }
      : await createRateLimitedAsrJob(jobRequest, auth.subject, config);
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
    const retryAfterMs = error instanceof RateLimitedTimingJobError ? error.retryAfterMs : undefined;
    const status = code === 'asr_queue_full' || code === 'asr_rate_limited' ? 429 : 400;

    return jsonResponse(
      request,
      rejectedOperation(
        code,
        practiceErrorMessage(code, detail),
        code === 'asr_queue_full' || code === 'full_audio_disabled',
        retryAfterMs ? { retryAfterMs } : {},
      ),
      {
        status,
        headers: retryAfterMs
          ? { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) }
          : undefined,
      },
    );
  }
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === '1' || value === 'true';
}

async function createRateLimitedAsrJob(
  jobRequest: AsrJobRequest,
  subject: string,
  config: ReturnType<typeof getAsrRuntimeConfig>,
) {
  const rateLimit = checkAsrJobCreationRateLimit(subject);
  if (!rateLimit.ok) {
    return Promise.reject(new RateLimitedTimingJobError(rateLimit.retryAfterMs));
  }

  try {
    return await createOrGetAsrJob(jobRequest, subject, config);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('asr_queue_full')) {
      throw error;
    }

    const reusableJob = await getReusableAsrJob(jobRequest, config);
    if (reusableJob) return { job: reusableJob, created: false };
    throw error;
  }
}

class RateLimitedTimingJobError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('asr_rate_limited');
  }
}

function rejectedOperation(
  code: string,
  message: string,
  retryable: boolean,
  extra: Record<string, unknown> = {},
): RejectedPracticeOperation & Record<string, unknown> {
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
  if (code === 'asr_cache_miss') return 'No cached ASR timing is available for this request.';
  if (code === 'asr_rate_limited') return 'Too many timing jobs were started recently.';
  if (code === 'asr_queue_full') return `The timing job queue is full${detail ? ` (${detail} active jobs)` : ''}.`;
  return 'Timing job creation failed.';
}
