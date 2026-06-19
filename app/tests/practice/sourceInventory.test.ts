import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AsrRuntimeConfig } from '../../src/lib/asr/asrConfig';
import type { SubtitleResponse } from '../../src/types/subtitles';

let dataRoot: string;

const captionsResponse = (sourceKind: 'manual' | 'auto'): SubtitleResponse => ({
  language: 'nl',
  phrases: [{ id: 0, startSec: 1, endSec: 2, text: `${sourceKind} captions` }],
  meta: {
    provider: 'test',
    fallbackUsed: false,
    sourceKind,
    retrievalPath: `test:${sourceKind}`,
    timingExactness: 'exact',
    qualityFlags: [],
  },
});

describe('practice source inventory', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-source-inventory-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('enumerates cached manual and auto caption sources', async () => {
    const { setCachedSubtitles } = await import('../../src/lib/subtitleCache');
    const { buildPracticeSourceInventory } = await import('../../src/lib/practice/sourceInventory');

    setCachedSubtitles('video-1_nl_manual', captionsResponse('manual'));
    setCachedSubtitles('video-1_nl_auto', captionsResponse('auto'));

    const sources = await buildPracticeSourceInventory({
      videoId: 'video-1',
      requestedLanguage: 'nl',
    });

    expect(sources.map((source) => source.kind).sort()).toEqual([
      'auto-captions',
      'provided-captions',
    ]);
    expect(sources.every((source) => source.contentFingerprint)).toBe(true);
  });

  it('enumerates readable completed ASR result artifacts only', async () => {
    const queueDir = path.join(dataRoot, 'asr-jobs');
    const resultPath = path.join(dataRoot, 'asr-result.json');
    await fs.mkdir(path.join(queueDir, 'jobs'), { recursive: true });
    await fs.mkdir(path.join(queueDir, 'index'), { recursive: true });
    await fs.writeFile(
      path.join(queueDir, 'jobs', 'asr_completed.json'),
      JSON.stringify({
        jobId: 'asr_completed',
        dedupeKey: 'dedupe',
        status: 'completed',
        request: {
          videoId: 'video-1',
          language: 'nl',
          sourceKind: 'auto',
          textSource: 'asr',
          engine: 'test',
          model: 'test',
          fullAudio: true,
          refresh: false,
        },
        createdBy: 'test',
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:01:00.000Z',
        completedAt: '2026-06-18T00:01:00.000Z',
        resultPath,
        pollAfterMs: 1000,
      }),
      'utf8',
    );
    await fs.writeFile(
      resultPath,
      JSON.stringify({
        language: 'nl',
        phrases: [{ id: 0, startSec: 1, endSec: 2, text: 'asr transcript' }],
        meta: {
          provider: 'audiofilms-asr-worker',
          fallbackUsed: false,
          sourceKind: 'provider',
          retrievalPath: 'asr-job:test:test:asr',
          timingExactness: 'word-level',
          qualityFlags: [],
        },
      } satisfies SubtitleResponse),
      'utf8',
    );

    const { buildPracticeSourceInventory } = await import('../../src/lib/practice/sourceInventory');
    const config: AsrRuntimeConfig = {
      mode: 'file-queue',
      queueUrl: '',
      queueDir,
      artifactStore: `file://${path.join(dataRoot, 'artifacts')}`,
      maxDurationSec: 900,
      maxActiveJobs: 4,
      pollAfterMs: 1000,
      authRequired: false,
      authConfigured: false,
    };
    const sources = await buildPracticeSourceInventory({
      videoId: 'video-1',
      requestedLanguage: 'nl',
      config,
    });

    expect(sources.map((source) => source.kind)).toContain('asr');
  });
});
