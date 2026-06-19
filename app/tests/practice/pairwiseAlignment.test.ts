import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildPracticeAlignmentArtifact,
  practiceAlignmentArtifactId,
  practiceAlignmentCacheKey,
  readPracticeAlignmentArtifact,
  savePracticeAlignmentArtifact,
} from '../../src/lib/practice/pairwiseAlignment';
import type { PracticeAlignmentInput } from '../../src/types/practice';

let dataRoot: string;

const input: PracticeAlignmentInput = {
  videoId: 'video-1',
  textSourceRevisionId: 'text-source:captions-rev',
  timingEvidenceRevisionId: 'timing-evidence:asr-rev',
  phraseSetRevisionId: 'phrase-set:captions-rev',
  alignerVersion: 'pairwise-alignment-contract-v1',
  normalizationVersion: 'practice-text-normalization-v1',
};

describe('practice pairwise alignment artifacts', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-alignment-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
  });

  it('uses the source/timing revisions and version fields as the stable cache key', () => {
    const sameInput = { ...input };
    const differentTextSource = {
      ...input,
      textSourceRevisionId: 'text-source:auto-rev',
    };

    expect(practiceAlignmentCacheKey(input)).toBe(practiceAlignmentCacheKey(sameInput));
    expect(practiceAlignmentCacheKey(input)).not.toBe(
      practiceAlignmentCacheKey(differentTextSource),
    );
    expect(practiceAlignmentArtifactId(input)).toMatch(/^alignment:/);
  });

  it('stores ready and failed artifacts with typed revisions', async () => {
    const ready = buildPracticeAlignmentArtifact(input, {
      status: 'ready',
      outputTimingEvidenceRevisionId: 'timing-evidence:aligned-rev',
      outputPhraseSetRevisionId: 'phrase-set:aligned-rev',
    });

    await savePracticeAlignmentArtifact(ready);
    await expect(readPracticeAlignmentArtifact(input)).resolves.toMatchObject({
      id: ready.id,
      revisionId: ready.revisionId,
      status: 'ready',
      quality: 'aligned',
      outputTimingEvidenceRevisionId: 'timing-evidence:aligned-rev',
    });

    const failed = buildPracticeAlignmentArtifact(
      {
        ...input,
        textSourceRevisionId: 'text-source:missing-rev',
      },
      {
        status: 'failed',
        failure: {
          code: 'alignment_unavailable',
          message: 'No compatible timing evidence is available.',
          retryable: true,
        },
      },
    );

    await savePracticeAlignmentArtifact(failed);
    await expect(readPracticeAlignmentArtifact(failed.id)).resolves.toMatchObject({
      status: 'failed',
      failure: {
        code: 'alignment_unavailable',
        retryable: true,
      },
    });
  });
});
