import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubtitleResponse } from '../../src/types/subtitles';

let dataRoot: string;

describe('subtitle service practice phrase cache handling', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-subtitle-service-'));
    process.env.AUDIOFILMS_CACHE_DIR = dataRoot;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_CACHE_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('renormalizes cached practice phrases with current continuation rules', async () => {
    const { setCachedSubtitles } = await import('../../src/lib/subtitleCache');
    const { loadSubtitles } = await import('../../src/lib/subtitleService');
    const cachedResponse: SubtitleResponse = {
      language: 'nl',
      phrases: [
        {
          id: 8,
          startSec: 21.44,
          endSec: 24.88,
          text: 'Het vinden van een tweede aarde is niet een kwestie van of...',
        },
        {
          id: 9,
          startSec: 25.16,
          endSec: 26,
          text: '...maar wanneer.',
        },
      ],
      practicePhrases: [
        {
          id: 8,
          startSec: 21.44,
          endSec: 24.88,
          text: 'Het vinden van een tweede aarde is niet een kwestie van of...',
        },
        {
          id: 9,
          startSec: 25.16,
          endSec: 26,
          text: 'maar wanneer.',
        },
      ],
      meta: {
        provider: 'yt-dlp',
        fallbackUsed: false,
        cacheStatus: 'stored',
        sourceKind: 'manual',
        retrievalPath: 'yt-dlp-manual',
        timingExactness: 'exact',
        qualityFlags: [],
        warnings: [],
      },
    };

    setCachedSubtitles('4EE7m94mJpk_nl_manual', cachedResponse);

    const result = await loadSubtitles('4EE7m94mJpk', 'nl', { sourceKind: 'manual' });

    expect(result.practicePhrases).toEqual([
      {
        id: 0,
        startSec: 21.44,
        endSec: 26,
        text: 'Het vinden van een tweede aarde is niet een kwestie van of maar wanneer.',
      },
    ]);
    expect(result.meta?.cacheStatus).toBe('hit');
  });
});
