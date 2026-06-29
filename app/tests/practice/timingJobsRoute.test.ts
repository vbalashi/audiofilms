import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AsrJobRequest } from '../../src/lib/asr/asrJobs';
import type { SubtitleResponse } from '../../src/types/subtitles';

let dataRoot: string;

const request: AsrJobRequest = {
  videoId: '4EE7m94mJpk',
  language: 'nl',
  sourceKind: 'manual',
  textSource: 'manual',
  engine: 'faster-whisper',
  model: 'mobiuslabsgmbh/faster-whisper-large-v3-turbo',
  fullAudio: true,
  refresh: false,
};

const staleResult: SubtitleResponse = {
  language: 'nl',
  phrases: [
    { id: 0, startSec: 0, endSec: 1, text: 'Old ASR aligned phrase.' },
    { id: 1, startSec: 1, endSec: 2, text: 'Different phrase set.' },
  ],
  meta: {
    provider: 'audiofilms-asr-worker',
    fallbackUsed: false,
    sourceKind: 'manual',
    retrievalPath: 'asr-job',
    timingExactness: 'word-level',
    qualityFlags: [],
    warnings: [],
  },
};

describe('practice timing jobs route', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-timing-jobs-route-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
    process.env.ASR_MODE = 'file-queue';
    process.env.ASR_AUTH_REQUIRED = 'false';
    process.env.ASR_ALLOW_FULL_AUDIO = 'true';
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    delete process.env.ASR_MODE;
    delete process.env.ASR_AUTH_REQUIRED;
    delete process.env.ASR_ALLOW_FULL_AUDIO;
    await fs.rm(dataRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('treats a reusable completed timing job as a cache miss when its text source revision is stale', async () => {
    const { createOrGetAsrJob, updateAsrJob } = await import('../../src/lib/asr/asrJobs');
    const { buildPracticeSnapshot } = await import('../../src/lib/practice/snapshot');
    const { POST } = await import('../../src/app/api/practice/timing-jobs/route');
    const resultPath = path.join(dataRoot, 'stale-result.json');
    await fs.writeFile(resultPath, JSON.stringify(staleResult), 'utf8');

    const created = await createOrGetAsrJob(request, 'tester');
    const completed = await updateAsrJob(created.job.jobId, {
      status: 'completed',
      completedAt: '2026-06-29T12:00:00.000Z',
      resultPath,
    });
    const staleSnapshot = buildPracticeSnapshot(staleResult, {
      videoId: request.videoId,
      requestedLanguage: request.language,
    });

    const response = await POST(new Request('http://localhost:3000/api/practice/timing-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        videoId: request.videoId,
        lang: request.language,
        sourceKind: request.sourceKind,
        textSource: request.textSource,
        fullAudio: true,
        reuseOnly: true,
        snapshotRevisionId: 'practice-snapshot:current',
        textSourceRevisionId: 'text-source:current-captions',
      }),
    }));

    expect(completed.status).toBe('completed');
    expect(staleSnapshot.textSource?.revisionId).not.toBe('text-source:current-captions');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      state: 'failed',
      error: {
        code: 'asr_cache_miss',
      },
    });
  });
});
