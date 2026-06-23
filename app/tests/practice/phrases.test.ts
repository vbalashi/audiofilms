import { describe, expect, it } from 'vitest';
import { buildPracticeSnapshot } from '../../src/lib/practice/snapshot';
import { normalizePracticePhrases } from '../../src/lib/practice/phrases';
import type { Phrase, SubtitleResponse } from '../../src/types/subtitles';

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

  it('cleans intra-phrase ellipsis continuations before enforcing length limits', () => {
    const phrases: Phrase[] = [
      {
        id: 0,
        startSec: 215.57,
        endSec: 229.61,
        text: 'Palantir gebruikt satellietbeelden, informatie over personen, locaties, voertuigen, routes...wetenschappelijke onderzoeken, AI-modellen, gebeurtenissen van eerdere missies...en nog veel, veel meer, met als doel oorlogen winnen.',
      },
    ];

    const normalized = normalizePracticePhrases(phrases);

    expect(normalized.length).toBeGreaterThan(1);
    expect(normalized.map((phrase) => phrase.text).join(' ')).not.toContain('...');
    expect(normalized.every((phrase) => phrase.text.length <= 140)).toBe(true);
  });

  it('keeps short numeric title suffixes with the preceding phrase', () => {
    const phrases: Phrase[] = [
      {
        id: 1,
        startSec: 3.52,
        endSec: 11.812,
        text: 'Hoog aan de nachthemel, verscholen in het sterrenbeeld Waterman brandt een kleine rode ster met de naam Trappist',
      },
      {
        id: 2,
        startSec: 11.812,
        endSec: 11.96,
        text: '1.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 3.52,
        endSec: 11.96,
        text: 'Hoog aan de nachthemel, verscholen in het sterrenbeeld Waterman brandt een kleine rode ster met de naam Trappist-1.',
      },
    ]);
  });

  it('renormalizes cached backend practice phrases when building snapshots', () => {
    const response: SubtitleResponse = {
      phrases: [],
      practicePhrases: [
        {
          id: 42,
          startSec: 229.61,
          endSec: 236.87,
          text: "In promotievideo's laat het bedrijf zien hoe hun systemen aanvalsplannen kunnen maken...en vijandelijke aanvallen voorspellen...",
        },
      ],
      language: 'nl',
      meta: {
        provider: 'audiofilms-practice-timing',
        fallbackUsed: false,
        sourceKind: 'asr',
        retrievalPath: 'practice-timing-cache',
        timingExactness: 'word-level',
        qualityFlags: [],
        warnings: [],
      },
    };

    const snapshot = buildPracticeSnapshot(response, {
      videoId: 'SQ33BIl9D0c',
      requestedLanguage: 'nl',
    });

    expect(snapshot.phraseSet?.phrases).toEqual([
      {
        id: 0,
        startSec: 229.61,
        endSec: 236.87,
        text: "In promotievideo's laat het bedrijf zien hoe hun systemen aanvalsplannen kunnen maken en vijandelijke aanvallen voorspellen...",
      },
    ]);
  });
});
