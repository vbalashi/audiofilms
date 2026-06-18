import { getAsrRuntimeConfig } from '@/lib/asr/asrConfig';
import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { checkAsrJobCreationRateLimit } from '@/lib/asr/asrRateLimit';
import {
  createOrGetAsrJob,
  listAsrJobs,
  normalizeAsrJobRequest,
  publicAsrJob,
} from '@/lib/asr/asrJobs';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'POST', 'OPTIONS'] });
}

export async function GET(request: Request) {
  const auth = authorizeAsrRequest(request);
  if (!auth.ok) {
    return jsonResponse(request, auth.body, { status: auth.status });
  }

  const jobs = await listAsrJobs();
  return jsonResponse(request, {
    jobs: jobs
      .slice(-25)
      .reverse()
      .map((job) => publicAsrJob(job, request)),
  });
}

export async function POST(request: Request) {
  const config = getAsrRuntimeConfig();

  if (config.mode === 'disabled') {
    return jsonResponse(
      request,
      {
        error: 'asr_unavailable',
        status: 'unavailable',
        suggestedAction: 'ASR jobs are disabled for this deployment. Subtitle and dictionary APIs can still be used.',
      },
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
      {
        error: 'asr_rate_limited',
        status: 'rate_limited',
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);

  try {
    const jobRequest = normalizeAsrJobRequest(body, config);
    const outcome = await createOrGetAsrJob(jobRequest, auth.subject, config);
    return jsonResponse(
      request,
      {
        ...publicAsrJob(outcome.job, request),
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
      {
        error: code,
        detail,
        status: 'rejected',
        suggestedAction: code === 'full_audio_disabled'
          ? 'Set a shorter duration for tester ASR jobs or enable ASR_ALLOW_FULL_AUDIO=true for private dogfood.'
          : undefined,
      },
      { status },
    );
  }
}
