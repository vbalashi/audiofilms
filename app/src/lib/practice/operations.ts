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
} from '@/lib/practice/snapshot';
import { dataDirectory } from '@/lib/runtimePaths';
import type {
  PracticeCaptionsOperation,
  PracticeCaptionsOperationInput,
  PracticeOperationResultApplicability,
  PracticeOperationState,
  PracticeSnapshot,
  PracticeTimingOperation,
  PracticeTimingOperationInput,
} from '@/types/practice';

export type {
  PracticeCaptionsOperation,
  PracticeCaptionsOperationInput,
  PracticeOperation,
  PracticeOperationResultApplicability,
  PracticeOperationState,
  PracticeTimingOperation,
  PracticeTimingOperationInput,
} from '@/types/practice';

export type StoredPracticeTimingOperation = {
  id: string;
  kind: 'improve-timing';
  asrJobId: string;
  videoId: string;
  input: PracticeTimingOperationInput;
  createdAt: string;
  updatedAt: string;
};

export type StoredPracticeCaptionsOperation = {
  id: string;
  kind: 'get-captions';
  videoId: string;
  input: PracticeCaptionsOperationInput;
  snapshot: PracticeSnapshot;
  createdAt: string;
  updatedAt: string;
};

type PublicPracticeTimingOperation = PracticeTimingOperation;

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

function captionOperationsDir(): string {
  return dataDirectory('practice-caption-operations', '.practice-caption-operations');
}

function captionOperationPath(operationId: string): string {
  return path.join(captionOperationsDir(), `${safeOperationFilePart(operationId)}.json`);
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

export async function upsertPracticeCaptionsOperation(
  videoId: string,
  input: PracticeCaptionsOperationInput,
  snapshot: PracticeSnapshot,
): Promise<StoredPracticeCaptionsOperation> {
  const id = `get-captions:${snapshot.snapshotRevisionId}`;
  const existing = await readJson<StoredPracticeCaptionsOperation>(captionOperationPath(id));
  const timestamp = nowIso();
  const operation: StoredPracticeCaptionsOperation = {
    id,
    kind: 'get-captions',
    videoId,
    input: {
      ...input,
      snapshotRevisionId: snapshot.snapshotRevisionId,
    },
    snapshot,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await writeJson(captionOperationPath(id), operation);
  return operation;
}

export async function getPracticeCaptionsOperation(
  operationId: string,
): Promise<StoredPracticeCaptionsOperation | null> {
  if (!operationId.startsWith('get-captions:')) return null;
  return readJson<StoredPracticeCaptionsOperation>(captionOperationPath(operationId));
}

export function publicPracticeCaptionsOperation(
  operation: StoredPracticeCaptionsOperation,
  request: Request,
): PracticeCaptionsOperation {
  const origin = publicApiOrigin(request);
  return {
    id: operation.id,
    kind: 'get-captions',
    state: 'succeeded',
    videoId: operation.videoId,
    input: operation.input,
    pollUrl: `${origin}/api/practice/operations/${encodeURIComponent(operation.id)}`,
    retryAfterMs: 0,
    result: {
      snapshot: operation.snapshot,
      snapshotRevisionId: operation.snapshot.snapshotRevisionId,
      textSourceRevisionId: operation.snapshot.textSource?.revisionId,
      timingEvidenceRevisionId: operation.snapshot.timingEvidence?.revisionId,
      phraseSetRevisionId: operation.snapshot.phraseSet?.revisionId,
    },
  };
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
    output.result = await buildCompletedResult(job, operation.input, request);
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
  input: PracticeTimingOperationInput,
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
        applicability: practiceOperationResultApplicability(input, null),
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
    const alternatives = (result.alternatives || []).map((alternative) => {
      const alternativeSnapshot = buildPracticeSnapshot(alternative.response, {
        videoId: job.request.videoId,
        requestedLanguage: job.request.language,
      });
      return {
        id: alternative.id,
        label: alternative.label,
        snapshot: alternativeSnapshot,
        snapshotRevisionId: alternativeSnapshot.snapshotRevisionId,
        textSourceRevisionId: alternativeSnapshot.textSource?.revisionId,
        timingEvidenceRevisionId: alternativeSnapshot.timingEvidence?.revisionId,
        phraseSetRevisionId: alternativeSnapshot.phraseSet?.revisionId,
      };
    });

    return {
      snapshot,
      alternatives,
      snapshotRevisionId: snapshot.snapshotRevisionId,
      textSourceRevisionId: snapshot.textSource?.revisionId,
      timingEvidenceRevisionId: snapshot.timingEvidence?.revisionId,
      phraseSetRevisionId: snapshot.phraseSet?.revisionId,
      applicability: practiceOperationResultApplicability(input, snapshot),
      diagnostics,
    };
  } catch (error) {
    return {
      resultUrl: `${origin}/api/asr/jobs/${encodeURIComponent(job.jobId)}/result`,
      applicability: practiceOperationResultApplicability(input, null),
      diagnostics: {
        ...diagnostics,
        artifact: 'unreadable',
        message: error instanceof Error ? error.message : 'result_read_failed',
      },
    };
  }
}

export function practiceOperationResultApplicability(
  input: PracticeTimingOperationInput,
  snapshot: PracticeSnapshot | null,
): PracticeOperationResultApplicability {
  const resultSnapshotRevisionId = snapshot?.snapshotRevisionId;
  const resultTextSourceRevisionId = snapshot?.textSource?.revisionId;
  const resultTimingEvidenceRevisionId = snapshot?.timingEvidence?.revisionId;
  const applicability: PracticeOperationResultApplicability = {
    appliesToCurrentSnapshot: false,
    requestedSnapshotRevisionId: input.snapshotRevisionId,
    requestedTextSourceRevisionId: input.textSourceRevisionId,
    requestedTimingEvidenceRevisionId: input.timingEvidenceRevisionId,
    resultSnapshotRevisionId,
    resultTextSourceRevisionId,
    resultTimingEvidenceRevisionId,
  };
  const diagnostics: string[] = [];

  if (!input.snapshotRevisionId) {
    applicability.staleReason = 'missing-requested-snapshot-revision';
    diagnostics.push('Auto-apply is unsafe because the timing job was created without a requested snapshot revision.');
  } else if (!snapshot) {
    applicability.staleReason = 'result-snapshot-unavailable';
    diagnostics.push('Auto-apply is unsafe because the completed timing job did not expose a readable result snapshot.');
  } else if (
    input.textSourceRevisionId &&
    resultTextSourceRevisionId &&
    input.textSourceRevisionId !== resultTextSourceRevisionId
  ) {
    applicability.staleReason = 'text-source-revision-mismatch';
    diagnostics.push('The result snapshot is based on a different text source revision than the timing job requested.');
  } else {
    applicability.appliesToCurrentSnapshot = true;
    if (input.textSourceRevisionId && !resultTextSourceRevisionId) {
      diagnostics.push('Requested text source revision was supplied, but the result snapshot has no text source revision to compare.');
    }
    if (input.timingEvidenceRevisionId && !resultTimingEvidenceRevisionId) {
      diagnostics.push('Requested timing evidence revision was supplied, but the result snapshot has no timing evidence revision to compare.');
    } else if (
      input.timingEvidenceRevisionId &&
      resultTimingEvidenceRevisionId &&
      input.timingEvidenceRevisionId !== resultTimingEvidenceRevisionId
    ) {
      diagnostics.push('Requested timing evidence revision is an input baseline; the result timing evidence revision is a new output and is not a stale check.');
    }
  }

  if (diagnostics.length) {
    applicability.diagnostics = diagnostics;
  }

  return applicability;
}
