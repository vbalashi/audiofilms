import { describe, expect, it } from 'vitest';
import { normalizePracticePhrases } from '../../src/lib/practice/phrases';
import type { Phrase } from '../../src/types/subtitles';

describe('normalizePracticePhrases', () => {
  it('merges short ellipsis continuation cues before sentence splitting', () => {
    const phrases: Phrase[] = [
      {
        id: 12,
        startSec: 33.92,
        endSec: 37.68,
        text: 'Op dit moment het meest bestudeerde planetenstelsel ter wereld...',
      },
      {
        id: 13,
        startSec: 37.96,
        endSec: 39.84,
        text: '...of ter universum.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 33.92,
        endSec: 39.84,
        text: 'Op dit moment het meest bestudeerde planetenstelsel ter wereld of ter universum.',
      },
    ]);
  });

  it('keeps ellipsis cues separate when the audio gap is too long', () => {
    const phrases: Phrase[] = [
      {
        id: 0,
        startSec: 1,
        endSec: 2,
        text: 'Dat gebeurde later...',
      },
      {
        id: 1,
        startSec: 3,
        endSec: 4,
        text: '...op een andere dag.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 1,
        endSec: 2,
        text: 'Dat gebeurde later...',
      },
      {
        id: 1,
        startSec: 3,
        endSec: 4,
        text: 'op een andere dag.',
      },
    ]);
  });
});
