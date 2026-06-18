import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { getAsrJob, publicAsrJob } from '@/lib/asr/asrJobs';
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

  return jsonResponse(request, publicAsrJob(job, request));
}
