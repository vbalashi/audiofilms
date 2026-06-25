import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { SubtitleResponse } from '@/types/subtitles';
import {
  artifactRootPath,
  ensureAsrQueueDirectories,
  getAsrRuntimeConfig,
  type AsrRuntimeConfig,
} from '@/lib/asr/asrConfig';

export type AsrJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AsrTextSource = 'asr' | 'manual' | 'auto';
export type AsrSourceKind = 'manual' | 'auto';

export type AsrJobRequest = {
  videoId: string;
  language: string;
  sourceKind: AsrSourceKind;
  textSource: AsrTextSource;
  engine: string;
  model: string;
  fullAudio: boolean;
  durationSec?: number;
  refresh: boolean;
};

export type AsrJobRecord = {
  jobId: string;
  dedupeKey: string;
  status: AsrJobStatus;
  request: AsrJobRequest;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  resultPath?: string;
  error?: string;
  pollAfterMs: number;
};

export type CreateAsrJobOutcome = {
  job: AsrJobRecord;
  created: boolean;
};

const DEFAULT_ENGINE = 'faster-whisper';
const DEFAULT_MODEL = 'mobiuslabsgmbh/faster-whisper-large-v3-turbo';
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;

function nowIso(): string {
  return new Date().toISOString();
}

function cleanString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === '1' || value === 'true';
}

function normalizeLanguage(body: Record<string, unknown>): string {
  return cleanString(body.lang || body.language, 'nl') || 'nl';
}

function normalizeSourceKind(value: unknown): AsrSourceKind {
  return value === 'auto' ? 'auto' : 'manual';
}

function normalizeTextSource(value: unknown): AsrTextSource {
  if (value === 'auto') return 'auto';
  return value === 'manual' ? 'manual' : 'asr';
}

function parseDurationSec(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const durationSec = Number(value);
  return Number.isFinite(durationSec) && durationSec > 0 ? Math.floor(durationSec) : Number.NaN;
}

function hashJson(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function safeJobIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'job';
}

function jobPath(config: AsrRuntimeConfig, jobId: string): string {
  return path.join(config.queueDir, 'jobs', `${safeJobIdPart(jobId)}.json`);
}

function indexPath(config: AsrRuntimeConfig, dedupeKey: string): string {
  return path.join(config.queueDir, 'index', `${dedupeKey}.json`);
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

export function normalizeAsrJobRequest(body: unknown, config = getAsrRuntimeConfig()): AsrJobRequest {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const videoId = cleanString(record.videoId);
  const language = normalizeLanguage(record);
  const sourceKind = normalizeSourceKind(record.sourceKind);
  const textSource = normalizeTextSource(record.textSource);
  const engine = cleanString(record.engine, DEFAULT_ENGINE) || DEFAULT_ENGINE;
  const model = cleanString(record.model, DEFAULT_MODEL) || DEFAULT_MODEL;
  const durationSec = parseDurationSec(record.duration ?? record.durationSec);
  const fullAudio = parseBoolean(record.fullAudio) || durationSec === undefined;
  const refresh = parseBoolean(record.refresh);

  if (!videoId) {
    throw new Error('missing_video_id');
  }
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error('invalid_video_id');
  }
  if (durationSec !== undefined && !Number.isFinite(durationSec)) {
    throw new Error('invalid_duration');
  }
  if (!fullAudio && durationSec !== undefined && durationSec > config.maxDurationSec) {
    throw new Error(`duration_exceeds_limit:${config.maxDurationSec}`);
  }
  if (fullAudio && config.maxDurationSec > 0 && cleanString(process.env.ASR_ALLOW_FULL_AUDIO).toLowerCase() !== 'true') {
    throw new Error(`full_audio_disabled:${config.maxDurationSec}`);
  }

  return {
    videoId,
    language,
    sourceKind,
    textSource,
    engine,
    model,
    fullAudio,
    durationSec: fullAudio ? undefined : durationSec,
    refresh,
  };
}

export function asrJobDedupeKey(request: AsrJobRequest): string {
  return hashJson({ ...request, refresh: false });
}

async function readIndexedJob(config: AsrRuntimeConfig, dedupeKey: string): Promise<AsrJobRecord | null> {
  const indexed = await readJson<{ jobId?: string }>(indexPath(config, dedupeKey));
  if (!indexed?.jobId) return null;
  return getAsrJob(indexed.jobId, config);
}

export async function getReusableAsrJob(
  request: AsrJobRequest,
  config = getAsrRuntimeConfig(),
): Promise<AsrJobRecord | null> {
  if (request.refresh) return null;
  ensureAsrQueueDirectories(config);
  const existing = await readIndexedJob(config, asrJobDedupeKey(request));
  return existing && existing.status !== 'failed' ? existing : null;
}

export async function listAsrJobs(config = getAsrRuntimeConfig()): Promise<AsrJobRecord[]> {
  ensureAsrQueueDirectories(config);
  const dir = path.join(config.queueDir, 'jobs');
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const jobs = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map((file) => readJson<AsrJobRecord>(path.join(dir, file))),
  );

  return jobs
    .filter((job): job is AsrJobRecord => Boolean(job?.jobId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function activeAsrJobCount(config = getAsrRuntimeConfig()): Promise<number> {
  const jobs = await listAsrJobs(config);
  return jobs.filter((job) => job.status === 'queued' || job.status === 'running').length;
}

export async function createOrGetAsrJob(
  request: AsrJobRequest,
  createdBy: string,
  config = getAsrRuntimeConfig(),
): Promise<CreateAsrJobOutcome> {
  ensureAsrQueueDirectories(config);
  const dedupeKey = asrJobDedupeKey(request);
  if (!request.refresh) {
    const existing = await readIndexedJob(config, dedupeKey);
    if (existing && existing.status !== 'failed') {
      return { job: existing, created: false };
    }
  }

  const activeCount = await activeAsrJobCount(config);
  if (activeCount >= config.maxActiveJobs) {
    throw new Error(`asr_queue_full:${config.maxActiveJobs}`);
  }

  const createdAt = nowIso();
  const jobId = `asr_${dedupeKey.slice(0, 12)}_${Date.now().toString(36)}`;
  const job: AsrJobRecord = {
    jobId,
    dedupeKey,
    status: 'queued',
    request,
    createdBy,
    createdAt,
    updatedAt: createdAt,
    pollAfterMs: config.pollAfterMs,
  };

  await writeJson(jobPath(config, jobId), job);
  await writeJson(indexPath(config, dedupeKey), { jobId, updatedAt: createdAt });
  return { job, created: true };
}

export async function getAsrJob(jobId: string, config = getAsrRuntimeConfig()): Promise<AsrJobRecord | null> {
  return readJson<AsrJobRecord>(jobPath(config, jobId));
}

export async function updateAsrJob(
  jobId: string,
  patch: Partial<AsrJobRecord>,
  config = getAsrRuntimeConfig(),
): Promise<AsrJobRecord> {
  const existing = await getAsrJob(jobId, config);
  if (!existing) throw new Error('asr_job_not_found');

  const updated = {
    ...existing,
    ...patch,
    jobId: existing.jobId,
    dedupeKey: existing.dedupeKey,
    request: patch.request || existing.request,
    updatedAt: nowIso(),
  } satisfies AsrJobRecord;

  await writeJson(jobPath(config, jobId), updated);
  return updated;
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

export function publicAsrJob(job: AsrJobRecord, request: Request) {
  const origin = publicApiOrigin(request);
  const statusUrl = `${origin}/api/asr/jobs/${encodeURIComponent(job.jobId)}`;
  const resultUrl = `${statusUrl}/result`;

  return {
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    failedAt: job.failedAt,
    error: job.error,
    pollAfterMs: job.pollAfterMs,
    statusUrl,
    resultUrl: job.status === 'completed' ? resultUrl : undefined,
    request: {
      videoId: job.request.videoId,
      language: job.request.language,
      sourceKind: job.request.sourceKind,
      textSource: job.request.textSource,
      engine: job.request.engine,
      model: job.request.model,
      fullAudio: job.request.fullAudio,
      durationSec: job.request.durationSec,
    },
  };
}

export function defaultAsrResultPath(job: AsrJobRecord, config = getAsrRuntimeConfig()): string {
  return path.join(artifactRootPath(config), 'jobs', safeJobIdPart(job.jobId), 'result.json');
}

export async function readAsrJobResult(job: AsrJobRecord): Promise<SubtitleResponse | null> {
  if (!job.resultPath) return null;
  return readJson<SubtitleResponse>(job.resultPath);
}
