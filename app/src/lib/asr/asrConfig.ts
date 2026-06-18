import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirectory } from '@/lib/runtimePaths';

export type AsrMode = 'disabled' | 'file-queue' | 'worker';

export type AsrRuntimeConfig = {
  mode: AsrMode;
  queueUrl: string;
  queueDir: string;
  artifactStore: string;
  maxDurationSec: number;
  maxActiveJobs: number;
  pollAfterMs: number;
  authRequired: boolean;
  authConfigured: boolean;
};

const DEFAULT_MAX_DURATION_SEC = 15 * 60;
const DEFAULT_MAX_ACTIVE_JOBS = 4;
const DEFAULT_POLL_AFTER_MS = 3000;

function clean(value: string | undefined): string {
  return String(value || '').trim();
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] || '');
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function asrMode(): AsrMode {
  const raw = clean(process.env.ASR_MODE).toLowerCase();
  if (raw === 'file-queue' || raw === 'worker') return raw;
  return 'disabled';
}

export function localPathFromFileUrlOrPath(value: string): string {
  if (value.startsWith('file://')) {
    return fileURLToPath(value);
  }
  return path.resolve(value);
}

export function getAsrRuntimeConfig(): AsrRuntimeConfig {
  const mode = asrMode();
  const queueUrl = clean(process.env.ASR_QUEUE_URL);
  const explicitQueueDir = clean(process.env.ASR_QUEUE_DIR);
  const queueDir = explicitQueueDir
    ? localPathFromFileUrlOrPath(explicitQueueDir)
    : dataDirectory('asr-jobs', '.asr-jobs');
  const artifactStore = clean(process.env.ASR_ARTIFACT_STORE) ||
    `file://${dataDirectory('asr-artifacts', '.asr-cache/artifacts')}`;
  const authDisabled = clean(process.env.ASR_AUTH_REQUIRED).toLowerCase() === 'false';
  const authConfigured = testerTokens().length > 0;

  return {
    mode,
    queueUrl,
    queueDir,
    artifactStore,
    maxDurationSec: numberFromEnv('ASR_MAX_DURATION_SEC', DEFAULT_MAX_DURATION_SEC),
    maxActiveJobs: numberFromEnv('ASR_MAX_ACTIVE_JOBS', DEFAULT_MAX_ACTIVE_JOBS),
    pollAfterMs: numberFromEnv('ASR_POLL_AFTER_MS', DEFAULT_POLL_AFTER_MS),
    authRequired: !authDisabled,
    authConfigured,
  };
}

export function testerTokens(): string[] {
  return [
    ...clean(process.env.ASR_TESTER_TOKENS).split(','),
    ...clean(process.env.ASR_TESTER_TOKEN).split(','),
    ...clean(process.env.AUDIOFILMS_TESTER_TOKEN).split(','),
  ]
    .map((token) => token.trim())
    .filter(Boolean);
}

export function ensureAsrQueueDirectories(config = getAsrRuntimeConfig()) {
  fs.mkdirSync(path.join(config.queueDir, 'jobs'), { recursive: true });
  fs.mkdirSync(path.join(config.queueDir, 'index'), { recursive: true });
}

export function asrArtifactsAreFileBacked(config = getAsrRuntimeConfig()): boolean {
  return config.artifactStore.startsWith('file://') || !config.artifactStore.includes('://');
}

export function artifactRootPath(config = getAsrRuntimeConfig()): string {
  if (!asrArtifactsAreFileBacked(config)) {
    throw new Error(`Unsupported ASR artifact store for this worker: ${config.artifactStore}`);
  }
  return localPathFromFileUrlOrPath(config.artifactStore.replace(/^file:\/\//, 'file://'));
}
