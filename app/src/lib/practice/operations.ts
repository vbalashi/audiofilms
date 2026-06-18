import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getAsrRuntimeConfig,
  type AsrRuntimeConfig,
} from '@/lib/asr/asrConfig';
import {
  getAsrJob,
  readAsrJobResult,
  type AsrJobRecord,
} from '@/lib/asr/asrJobs';
import {
  buildPracticeSnapshot,
  type PracticeSnapshot,
} from '@/lib/practice/snapshot';

export type PracticeOperationState = 'queued' | 'running' | 'succeeded' | 'failed';

export type PracticeTimingOperationInput = {
  language?: string;
  sourceKind?: string;
  textSource?: string;
  engine?: string;
  model?: string;
  fullAudio?: boolean;
  durationSec?: number;
  snapshotRevisionId?: string;
  textSourceRevisionId?: string;
  timingEvidenceRevisionId?: string;
};

export type StoredPracticeTimingOperation = {
  id: string;
  kind: 'improve-timing';
  asrJobId: string;
  videoId: string;
  input: PracticeTimingOperationInput;
  createdAt: string;
  updatedAt: string;
};

type PublicPracticeTimingOperation = {
  id: string;
  kind: 'improve-timing';
  state: PracticeOperationState;
  videoId: string;
  input: PracticeTimingOperationInput;
  pollUrl: string;
  retryAfterMs: number;
  result?: {
    snapshot?: PracticeSnapshot;
    snapshotRevisionId?: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
    phraseSetRevisionId?: string;
    resultUrl?: string;
    diagnostics?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  diagnostics?: Record<string, unknown>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function operationIdForAsrJob(jobId: string): string {
  return `timing:${jobId}`;
}

function safeOperationFilePart(operationId: string): string {
  return operationId.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 96);
}

function operationsDir(config: AsrRuntimeConfig): string {
  return path.join(config.queueDir, 'practice-operations');
}

function operationPath(config: AsrRuntimeConfig, operationId: string): string {
  return path.join(operationsDir(config), `${safeOperationFilePart(operationId)}.json`);
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function publicApiOrigin(request: Request): string {
  const configured = (
    process.env.AUDIOFILMS_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_AUDIOFILMS_API_BASE ||
    ''
  ).trim().replace(/\/+$/, '');
  if (configured) return configured;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || '';
  if (host) {
    const proto = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}

export function practiceTimingInputFromBody(
  body: Record<string, unknown>,
  job: AsrJobRecord,
): PracticeTimingOperationInput {
  return {
    language: job.request.language,
    sourceKind: job.request.sourceKind,
    textSource: job.request.textSource,
    engine: job.request.engine,
    model: job.request.model,
    fullAudio: job.request.fullAudio,
    durationSec: job.request.durationSec,
    snapshotRevisionId: cleanString(body.snapshotRevisionId),
    textSourceRevisionId: cleanString(body.textSourceRevisionId),
    timingEvidenceRevisionId: cleanString(body.timingEvidenceRevisionId),
  };
}

export async function upsertPracticeTimingOperation(
  job: AsrJobRecord,
  input: PracticeTimingOperationInput,
  config = getAsrRuntimeConfig(),
): Promise<StoredPracticeTimingOperation> {
  const id = operationIdForAsrJob(job.jobId);
  const existing = await readJson<StoredPracticeTimingOperation>(operationPath(config, id));
  const timestamp = nowIso();
  const operation: StoredPracticeTimingOperation = {
    id,
    kind: 'improve-timing',
    asrJobId: job.jobId,
    videoId: job.request.videoId,
    input,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await writeJson(operationPath(config, id), operation);
  return operation;
}

export async function getPracticeTimingOperation(
  operationId: string,
  config = getAsrRuntimeConfig(),
): Promise<StoredPracticeTimingOperation | null> {
  const normalizedId = operationId.startsWith('timing:')
    ? operationId
    : operationIdForAsrJob(operationId);
  const stored = await readJson<StoredPracticeTimingOperation>(operationPath(config, normalizedId));
  if (stored) return stored;

  const asrJobId = operationId.startsWith('timing:')
    ? operationId.slice('timing:'.length)
    : operationId;
  const job = await getAsrJob(asrJobId, config);
  if (!job) return null;

  return {
    id: operationIdForAsrJob(job.jobId),
    kind: 'improve-timing',
    asrJobId: job.jobId,
    videoId: job.request.videoId,
    input: practiceTimingInputFromBody({}, job),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function publicPracticeTimingOperation(
  operation: StoredPracticeTimingOperation,
  request: Request,
  config = getAsrRuntimeConfig(),
): Promise<PublicPracticeTimingOperation | null> {
  const job = await getAsrJob(operation.asrJobId, config);
  if (!job) return null;

  const origin = publicApiOrigin(request);
  const pollUrl = `${origin}/api/practice/operations/${encodeURIComponent(operation.id)}`;
  const state = practiceStateFromAsrStatus(job.status);
  const output: PublicPracticeTimingOperation = {
    id: operation.id,
    kind: 'improve-timing',
    state,
    videoId: operation.videoId,
    input: operation.input,
    pollUrl,
    retryAfterMs: job.pollAfterMs,
  };

  if (job.status === 'completed') {
    output.result = await buildCompletedResult(job, request);
  }

  if (job.status === 'failed') {
    output.error = {
      code: 'asr_job_failed',
      message: job.error || 'Timing improvement failed.',
      retryable: true,
    };
  }

  return output;
}

function practiceStateFromAsrStatus(status: AsrJobRecord['status']): PracticeOperationState {
  if (status === 'completed') return 'succeeded';
  if (status === 'failed') return 'failed';
  return status;
}

async function buildCompletedResult(
  job: AsrJobRecord,
  request: Request,
): Promise<NonNullable<PublicPracticeTimingOperation['result']>> {
  const origin = publicApiOrigin(request);
  const diagnostics: Record<string, unknown> = {
    asrJobId: job.jobId,
    completedAt: job.completedAt,
  };

  try {
    const result = await readAsrJobResult(job);
    if (!result) {
      return {
        resultUrl: `${origin}/api/asr/jobs/${encodeURIComponent(job.jobId)}/result`,
        diagnostics: {
          ...diagnostics,
          artifact: 'missing',
        },
      };
    }

    const snapshot = buildPracticeSnapshot(result, {
      videoId: job.request.videoId,
      requestedLanguage: job.request.language,
    });

    return {
      snapshot,
      snapshotRevisionId: snapshot.snapshotRevisionId,
      textSourceRevisionId: snapshot.textSource?.revisionId,
      timingEvidenceRevisionId: snapshot.timingEvidence?.revisionId,
      phraseSetRevisionId: snapshot.phraseSet?.revisionId,
      diagnostics,
    };
  } catch (error) {
    return {
      resultUrl: `${origin}/api/asr/jobs/${encodeURIComponent(job.jobId)}/result`,
      diagnostics: {
        ...diagnostics,
        artifact: 'unreadable',
        message: error instanceof Error ? error.message : 'result_read_failed',
      },
    };
  }
}
