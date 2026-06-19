import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from '@/lib/runtimePaths';
import type {
  PracticeAlignmentArtifact,
  PracticeAlignmentInput,
} from '@/types/practice';

export const PRACTICE_PAIRWISE_ALIGNER_VERSION = 'pairwise-alignment-contract-v1';
export const PRACTICE_ALIGNMENT_NORMALIZATION_VERSION = 'practice-text-normalization-v1';

function nowIso(): string {
  return new Date().toISOString();
}

function hashJson(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 128) || 'alignment';
}

function alignmentDir(): string {
  return dataDirectory('practice-alignments', '.practice-alignments');
}

function alignmentPath(id: string): string {
  return path.join(alignmentDir(), `${safeFilePart(id)}.json`);
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

export function practiceAlignmentCacheKey(input: PracticeAlignmentInput): string {
  return hashJson({
    videoId: input.videoId,
    textSourceRevisionId: input.textSourceRevisionId,
    timingEvidenceRevisionId: input.timingEvidenceRevisionId,
    phraseSetRevisionId: input.phraseSetRevisionId || null,
    alignerVersion: input.alignerVersion,
    normalizationVersion: input.normalizationVersion,
  });
}

export function practiceAlignmentArtifactId(input: PracticeAlignmentInput): string {
  return `alignment:${practiceAlignmentCacheKey(input).slice(0, 24)}`;
}

export function practiceAlignmentRevisionId(
  artifact: Omit<PracticeAlignmentArtifact, 'revisionId'>,
): string {
  return `alignment-revision:${hashJson({
    id: artifact.id,
    status: artifact.status,
    quality: artifact.quality,
    outputTimingEvidenceRevisionId: artifact.outputTimingEvidenceRevisionId || null,
    outputPhraseSetRevisionId: artifact.outputPhraseSetRevisionId || null,
    failure: artifact.failure || null,
  }).slice(0, 24)}`;
}

export function buildPracticeAlignmentArtifact(
  input: PracticeAlignmentInput,
  result:
    | {
        status: 'ready';
        outputTimingEvidenceRevisionId: string;
        outputPhraseSetRevisionId?: string;
      }
    | {
        status: 'failed';
        failure: NonNullable<PracticeAlignmentArtifact['failure']>;
      },
): PracticeAlignmentArtifact {
  const timestamp = nowIso();
  const base = {
    ...input,
    id: practiceAlignmentArtifactId(input),
    status: result.status,
    quality: 'aligned' as const,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(result.status === 'ready'
      ? {
          outputTimingEvidenceRevisionId: result.outputTimingEvidenceRevisionId,
          outputPhraseSetRevisionId: result.outputPhraseSetRevisionId,
        }
      : { failure: result.failure }),
  };

  return {
    ...base,
    revisionId: practiceAlignmentRevisionId(base),
  };
}

export async function savePracticeAlignmentArtifact(
  artifact: PracticeAlignmentArtifact,
): Promise<void> {
  const existing = await readPracticeAlignmentArtifact(artifact.id);
  await writeJson(alignmentPath(artifact.id), {
    ...artifact,
    createdAt: existing?.createdAt || artifact.createdAt,
    updatedAt: nowIso(),
  });
}

export async function readPracticeAlignmentArtifact(
  idOrInput: string | PracticeAlignmentInput,
): Promise<PracticeAlignmentArtifact | null> {
  const id = typeof idOrInput === 'string' ? idOrInput : practiceAlignmentArtifactId(idOrInput);
  return readJson<PracticeAlignmentArtifact>(alignmentPath(id));
}
