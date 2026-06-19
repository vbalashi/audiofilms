import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getPracticeCaptionsOperation,
  publicPracticeCaptionsOperation,
  upsertPracticeCaptionsOperation,
} from '../../src/lib/practice/operations';
import type { PracticeSnapshot } from '../../src/types/practice';

let dataRoot: string;

const snapshot: PracticeSnapshot = {
  snapshotRevisionId: 'practice-snapshot:captions',
  videoId: 'video-1',
  textSource: {
    id: 'text-source:captions',
    revisionId: 'text-source:captions-rev',
    contentFingerprint: 'text-content:captions',
    languageCode: 'nl',
    label: 'NL captions',
    kind: 'provided-captions',
    status: 'ready',
  },
  availableTextSources: [],
  timingEvidence: {
    id: 'timing-evidence:captions',
    revisionId: 'timing-evidence:captions-rev',
    quality: 'accepted-cue',
  },
  phraseSet: {
    id: 'phrase-set:nl',
    revisionId: 'phrase-set:captions',
    phrases: [{ id: 0, startSec: 1, endSec: 2, text: 'Hij loopt.' }],
  },
  readiness: {
    baseState: 'precise',
    displayState: 'precise',
    availableActions: [],
  },
};

describe('practice captions operations', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-captions-operation-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
  });

  it('stores completed captions operations as pollable practice operations', async () => {
    const stored = await upsertPracticeCaptionsOperation(
      'video-1',
      {
        language: 'nl',
        sourceKind: 'manual',
        refresh: false,
      },
      snapshot,
    );

    const loaded = await getPracticeCaptionsOperation(stored.id);
    expect(loaded?.snapshot.snapshotRevisionId).toBe('practice-snapshot:captions');

    const publicOperation = publicPracticeCaptionsOperation(
      loaded!,
      new Request('http://localhost:3000/api/practice/captions'),
    );
    expect(publicOperation).toMatchObject({
      id: 'get-captions:practice-snapshot:captions',
      kind: 'get-captions',
      state: 'succeeded',
      videoId: 'video-1',
      pollUrl: 'http://localhost:3000/api/practice/operations/get-captions%3Apractice-snapshot%3Acaptions',
      retryAfterMs: 0,
      result: {
        snapshotRevisionId: 'practice-snapshot:captions',
        textSourceRevisionId: 'text-source:captions-rev',
        timingEvidenceRevisionId: 'timing-evidence:captions-rev',
        phraseSetRevisionId: 'phrase-set:captions',
      },
    });
  });
});
