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

  it('normalizes known hyphenated numeric names from ASR text', () => {
    const phrases: Phrase[] = [
      {
        id: 1,
        startSec: 3.52,
        endSec: 11.96,
        text: 'Hoog aan de nachthemel, verscholen in het sterrenbeeld Waterman brandt een kleine rode ster met de naam Trappist 1.',
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

  it('keeps a short natural sentence tail instead of making a two-word phrase', () => {
    const phrases: Phrase[] = [
      {
        id: 24,
        startSec: 74.24,
        endSec: 80.56,
        text: "Dit is de planeet die ons idee over leven in het universum dit jaar op z'n kop gaat zetten.",
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 74.24,
        endSec: 80.56,
        text: "Dit is de planeet die ons idee over leven in het universum dit jaar op z'n kop gaat zetten.",
      },
    ]);
  });

  it('counts apostrophes and hyphenated numeric names as one word for continuation limits', () => {
    const phrases: Phrase[] = [
      {
        id: 3,
        startSec: 3.64,
        endSec: 7.12,
        text: 'Hoog aan de nachthemel, verscholen in het sterrenbeeld Waterman...',
      },
      {
        id: 4,
        startSec: 7.4,
        endSec: 12.04,
        text: '...brandt een kleine rode ster met de naam TRAPPIST-1.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 3.64,
        endSec: 12.04,
        text: 'Hoog aan de nachthemel, verscholen in het sterrenbeeld Waterman brandt een kleine rode ster met de naam TRAPPIST-1.',
      },
    ]);
  });

  it('allows a slightly longer ellipsis continuation gap for short emphatic openings', () => {
    const phrases: Phrase[] = [
      {
        id: 1,
        startSec: 1.24,
        endSec: 1.6,
        text: 'Maar...',
      },
      {
        id: 2,
        startSec: 2.36,
        endSec: 3,
        text: '...écht goed.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 1.24,
        endSec: 3,
        text: 'Maar écht goed.',
      },
    ]);
  });

  it('merges a short sentence tail after a cached split without ellipsis', () => {
    const phrases: Phrase[] = [
      {
        id: 22,
        startSec: 74.24,
        endSec: 79.717,
        text: "Dit is de planeet die ons idee over leven in het universum dit jaar op z'n kop",
      },
      {
        id: 23,
        startSec: 79.717,
        endSec: 80.56,
        text: 'gaat zetten.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 74.24,
        endSec: 80.56,
        text: "Dit is de planeet die ons idee over leven in het universum dit jaar op z'n kop gaat zetten.",
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

  it('preserves playback-only ASR start adjustment on single practice phrases', () => {
    const phrases: Phrase[] = [
      {
        id: 7,
        startSec: 36.91,
        endSec: 43.03,
        playbackStartSec: 40.81,
        timingFlags: ['asr-suspicious-leading-word-gap'],
        text: 'Het is al een paar dagen heel warm.',
      },
    ];

    expect(normalizePracticePhrases(phrases)).toEqual([
      {
        id: 0,
        startSec: 36.91,
        endSec: 43.03,
        playbackStartSec: 40.81,
        timingFlags: ['asr-suspicious-leading-word-gap'],
        text: 'Het is al een paar dagen heel warm.',
      },
    ]);
  });
});
