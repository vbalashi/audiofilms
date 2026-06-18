import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { getAsrJob, readAsrJobResult } from '@/lib/asr/asrJobs';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = authorizeAsrRequest(request);
  if (!auth.ok) {
    return jsonResponse(request, auth.body, { status: auth.status });
  }

  const { jobId } = await context.params;
  const job = await getAsrJob(jobId);
  if (!job) {
    return jsonResponse(request, { error: 'asr_job_not_found' }, { status: 404 });
  }

  if (job.status !== 'completed') {
    return jsonResponse(
      request,
      {
        error: 'asr_result_not_ready',
        status: job.status,
        pollAfterMs: job.pollAfterMs,
      },
      { status: 409 },
    );
  }

  const result = await readAsrJobResult(job);
  if (!result) {
    return jsonResponse(
      request,
      {
        error: 'asr_result_missing',
        status: 'failed',
        suggestedAction: 'The job is marked complete but its artifact is missing. Recreate the job with refresh=true.',
      },
      { status: 500 },
    );
  }

  return jsonResponse(request, result);
}
