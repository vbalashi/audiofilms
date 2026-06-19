import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createOrGetAsrJob,
  getReusableAsrJob,
  updateAsrJob,
  type AsrJobRequest,
} from '../../src/lib/asr/asrJobs';

let dataRoot: string;

const request: AsrJobRequest = {
  videoId: '4EE7m94mJpk',
  language: 'nl',
  sourceKind: 'manual',
  textSource: 'asr',
  engine: 'faster-whisper',
  model: 'mobiuslabsgmbh/faster-whisper-large-v3-turbo',
  fullAudio: true,
  refresh: false,
};

describe('ASR job reuse', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-asr-jobs-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
    delete process.env.ASR_QUEUE_DIR;
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    delete process.env.ASR_QUEUE_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
  });

  it('returns an indexed completed job without creating a new queue item', async () => {
    const created = await createOrGetAsrJob(request, 'tester:one');
    const completed = await updateAsrJob(created.job.jobId, {
      status: 'completed',
      completedAt: '2026-06-19T09:27:20.968Z',
      resultPath: path.join(dataRoot, 'asr-artifacts', 'result.json'),
    });

    const reusable = await getReusableAsrJob(request);

    expect(reusable?.jobId).toBe(completed.jobId);
    expect(reusable?.status).toBe('completed');
  });

  it('does not reuse failed jobs or refresh requests', async () => {
    const created = await createOrGetAsrJob(request, 'tester:one');
    await updateAsrJob(created.job.jobId, {
      status: 'failed',
      error: 'transcription failed',
    });

    await expect(getReusableAsrJob(request)).resolves.toBeNull();
    await expect(getReusableAsrJob({ ...request, refresh: true })).resolves.toBeNull();
  });
});
