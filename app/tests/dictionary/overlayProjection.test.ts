import { describe, expect, it } from 'vitest';
import {
  DICTIONARY_OVERLAY_CARD_TYPE_ID,
  projectDictionaryLookupV2Response,
  projectOverlayCard,
  type PlatformLookupItem,
} from '../../src/lib/dictionary/overlayProjection';

const baseItem = (overrides: PlatformLookupItem = {}): PlatformLookupItem => ({
  entry: {
    id: 'entry:lopen',
    languageCode: 'nl',
    headword: 'lopen',
    partOfSpeech: 'verb',
    contentFingerprint: 'content:lopen:v1',
    content: {
      sections: [
        {
          id: 'meaning-main',
          kind: 'meaning',
          text: 'to walk; to run',
          sourcePath: 'content.sections.0',
        },
        {
          id: 'example-main',
          kind: 'example',
          text: 'Hij loopt naar huis.',
          sourcePath: 'content.sections.1',
        },
      ],
    },
  },
  dictionary: {
    id: 'dict:nl-core',
    slug: 'nl-core',
    name: '2000NL Core',
    kind: 'platform',
  },
  match: {
    queriedForm: 'loopt',
    matchedForm: 'loopt',
    relation: 'inflection',
  },
  ...overrides,
});

const actionIds = (item: PlatformLookupItem, allowProgressActions = true) =>
  projectOverlayCard(item, 'loopt', 'nl', 0, { allowProgressActions }).displayActions.map(
    (action) => action.id,
  );

describe('dictionary overlay V2 projection', () => {
  it('projects exact and inflection matches into V2 cards', () => {
    const exactCard = projectOverlayCard(
      baseItem({
        entry: {
          ...baseItem().entry,
          id: 'entry:huis',
          headword: 'huis',
          contentFingerprint: 'content:huis:v1',
        },
        match: { queriedForm: 'huis', matchedForm: 'huis', relation: 'exact' },
      }),
      'huis',
      'nl',
      0,
      { allowProgressActions: true },
    );
    const inflectionCard = projectOverlayCard(baseItem(), 'loopt', 'nl', 0, {
      allowProgressActions: true,
    });

    expect(exactCard.match).toEqual({ matchedForm: 'huis', relation: 'exact' });
    expect(exactCard.headword).toBe('huis');
    expect(inflectionCard.match).toEqual({ matchedForm: 'loopt', relation: 'inflection' });
    expect(inflectionCard.headword).toBe('lopen');
  });

  it('projects learner-facing metadata without language or article chips', () => {
    const card = projectOverlayCard(
      baseItem({
        entry: {
          ...baseItem().entry,
          partOfSpeech: 'zn',
          gender: 'de',
          isNt22000: true,
        },
        dictionary: {
          id: 'dict:vandale',
          slug: 'vandale-nl',
          name: 'VanDale Dutch',
          kind: 'platform',
        },
      }),
      'zware',
      'nl',
      0,
      { allowProgressActions: true },
    );

    expect(card.partOfSpeech).toBe('zn');
    expect(card.article).toBe('de');
    expect(card.language).toBe('nl');
    expect(card.dictionary?.name).toBe('VanDale');
    expect(card.chips).toEqual([
      { kind: 'part-of-speech', label: 'zn' },
      { kind: 'list', label: '2k', value: 'nt2-2000' },
    ]);
  });

  it('projects noun articles from platform raw gender into the overlay contract', () => {
    const card = projectOverlayCard(
      baseItem({
        entry: {
          ...baseItem().entry,
          id: 'entry:oog',
          headword: 'oog',
          partOfSpeech: 'zn',
          gender: null,
          raw: {
            gender: 'het',
            part_of_speech: 'zn',
          },
          content: {
            sections: [
              {
                id: 'meaning-main',
                kind: 'meaning',
                text: 'elk van de twee ronde dingen in je gezicht waarmee je kijkt',
                sourcePath: 'content.sections.0',
              },
            ],
          },
        },
        dictionary: {
          id: 'dict:vandale',
          slug: 'vandale-nl',
          name: 'VanDale Dutch',
          kind: 'platform',
        },
        match: { queriedForm: 'oog', matchedForm: 'oog', relation: 'exact' },
      }),
      'oog',
      'nl',
      0,
      { allowProgressActions: true },
    );

    expect(card.headword).toBe('oog');
    expect(card.partOfSpeech).toBe('zn');
    expect(card.article).toBe('het');
    expect(card.chips).toEqual([{ kind: 'part-of-speech', label: 'zn' }]);
  });

  it('projects no-match payloads without fallback or legacy provider cards', () => {
    const response = projectDictionaryLookupV2Response(
      { query: 'zzzz', items: [] },
      'zzzz',
      'nl',
      undefined,
      { allowProgressActions: true },
    );

    expect(response).toEqual({
      contractVersion: 'dict-lookup-v2',
      clickedForm: 'zzzz',
      query: 'zzzz',
      cards: [],
      error: 'no_match',
      code: 'no_match',
      meta: { provider: '2000nl', responseVersion: 'overlay-v2' },
    });
    expect('result' in response).toBe(false);
    expect('definitions' in response).toBe(false);
    expect('fallbackUsed' in response.meta).toBe(false);
  });

  it('projects generated draft save capability as a card action', () => {
    const actionIdsForGeneratedDraft = actionIds(
      baseItem({
        cardCapabilitiesByType: {
          [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
            actions: ['save-and-start-learning'],
          },
        },
      }),
    );

    expect(actionIdsForGeneratedDraft).toEqual(['save-and-learn', 'translate']);
  });

  it('tolerates nullable platform fields and preserves source paths', () => {
    const card = projectOverlayCard(
      baseItem({
        entry: {
          id: 'entry:nulls',
          languageCode: null,
          headword: null,
          partOfSpeech: null,
          gender: null,
          contentFingerprint: null,
          content: {
            meanings: [{ definition: 'a fallback meaning', label: null }],
          },
        },
        dictionary: null,
        match: { matchedForm: 'vorm', relation: 'unknown' },
      }),
      'vorm',
      'nl',
      2,
      { allowProgressActions: true },
    );

    expect(card.id).toBe('entry:nulls');
    expect(card.headword).toBe('vorm');
    expect(card.language).toBe('nl');
    expect(card.contentFingerprint).toBeUndefined();
    expect(card.dictionary).toBeUndefined();
    expect(card.chips).toEqual([]);
    expect(card.sections).toEqual([
      {
        id: 'meaning-0',
        sourcePath: 'content.meanings.0',
        kind: 'meaning',
        label: undefined,
        text: 'a fallback meaning',
      },
    ]);
  });

  it('propagates contentFingerprint and section sourcePath in success responses', () => {
    const response = projectDictionaryLookupV2Response(
      { query: 'loopt', items: [baseItem()] },
      'loopt',
      'nl',
      'Hij loopt naar huis.',
      { allowProgressActions: true },
    );

    expect(response.contractVersion).toBe('dict-lookup-v2');
    expect('error' in response).toBe(false);
    if ('error' in response) throw new Error('expected success response');
    expect(response.meta).toEqual({
      provider: '2000nl',
      fallbackUsed: false,
      responseVersion: 'overlay-v2',
    });
    expect(response.result).toEqual({
      word: 'lopen',
      language: 'nl',
      definition: 'to walk; to run',
      context: 'Hij loopt naar huis.',
    });
    expect(response.cards[0].contentFingerprint).toBe('content:lopen:v1');
    expect(response.cards[0].sections.map((section) => section.sourcePath)).toEqual([
      'content.sections.0',
      'content.sections.1',
    ]);
    expect(response.cards[0]).not.toHaveProperty('availableActions');
    expect(response.cards[0]).not.toHaveProperty('progressSummary');
    expect(response.cards[0]).not.toHaveProperty('userState');
    expect(response.cards[0]).not.toHaveProperty('meanings');
  });

  it('projects translated lookup fields from 2000NL without line remapping', () => {
    const response = projectDictionaryLookupV2Response(
      {
        query: 'loopt',
        items: [
          baseItem({
            entry: {
              ...baseItem().entry,
              content: {
                headwordTranslation: 'идти',
                summary: {
                  definitionTranslation: 'идти; бежать',
                  exampleTranslation: 'Он идет домой.',
                },
                sections: [
                  {
                    id: 'meaning-main',
                    kind: 'meaning',
                    text: 'to walk; to run',
                    translation: 'идти; бежать',
                    sourcePath: 'content.sections.0',
                  },
                  {
                    id: 'example-main',
                    kind: 'example',
                    text: 'Hij loopt naar huis.',
                    translation: 'Он идет домой.',
                    sourcePath: 'content.sections.1',
                  },
                  {
                    id: 'example-second',
                    kind: 'example',
                    text: 'Zij loopt door het park.',
                    sourcePath: 'content.sections.2',
                  },
                ],
                translation: {
                  status: 'ready',
                  targetLanguageCode: 'ru',
                  translationId: 'translation:lopen:ru',
                  translationPolicyVersion: 'platform-card-translation-v1',
                },
              },
            },
          }),
        ],
      },
      'loopt',
      'nl',
      'Hij loopt naar huis.',
      { allowProgressActions: true },
    );

    expect('error' in response).toBe(false);
    if ('error' in response) throw new Error('expected success response');
    const card = response.cards[0];
    expect(card.headwordTranslation).toBe('идти');
    expect(card.summary).toEqual({
      definition: 'to walk; to run',
      definitionTranslation: 'идти; бежать',
      example: 'Hij loopt naar huis.',
      exampleTranslation: 'Он идет домой.',
    });
    expect(card.sections.map((section) => ({
      sourcePath: section.sourcePath,
      translation: section.translation,
    }))).toEqual([
      { sourcePath: 'content.sections.0', translation: 'идти; бежать' },
      { sourcePath: 'content.sections.1', translation: 'Он идет домой.' },
      { sourcePath: 'content.sections.2', translation: undefined },
    ]);
    expect(card.translation).toEqual({
      status: 'ready',
      targetLanguageCode: 'ru',
      translationId: 'translation:lopen:ru',
      translationPolicyVersion: 'platform-card-translation-v1',
    });
  });

  it('omits progress actions for hidden, frozen, and guest catalog cards', () => {
    const hidden = baseItem({
      cardCapabilitiesByType: {
        [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
          phase: 'hidden',
          actions: ['start-learning', 'mark-known', 'review-card'],
          reviewResults: ['fail', 'hard', 'success', 'easy'],
        },
      },
    });
    const frozen = baseItem({
      cardCapabilitiesByType: {
        [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
          phase: 'frozen',
          actions: ['start-learning', 'mark-known', 'review-card'],
          reviewResults: ['fail', 'hard', 'success', 'easy'],
          frozenUntil: '2026-06-20T08:30:00.000Z',
        },
      },
    });

    expect(actionIds(hidden)).toEqual(['translate']);
    expect(actionIds(frozen)).toEqual(['translate']);
    expect(actionIds(baseItem({
      cardCapabilitiesByType: {
        [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
          phase: 'not-started',
          actions: ['start-learning', 'mark-known'],
        },
      },
    }), false)).toEqual(['translate']);
  });

  it('projects learning and reviewing cards to four review-grade actions', () => {
    const capabilities = {
      [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
        actions: ['review-card'],
        reviewResults: ['fail', 'hard', 'success', 'easy'],
      },
    };

    for (const phase of ['learning', 'reviewing'] as const) {
      const card = projectOverlayCard(
        baseItem({
          cardCapabilitiesByType: {
            [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
              ...capabilities[DICTIONARY_OVERLAY_CARD_TYPE_ID],
              phase,
            },
          },
          userStateByCardType: {
            [DICTIONARY_OVERLAY_CARD_TYPE_ID]: {
              seenCount: 3,
              lastSeenAt: '2026-06-18T09:15:00.000Z',
            },
          },
        }),
        'loopt',
        'nl',
        0,
        { allowProgressActions: true },
      );

      expect(card.progress).toEqual({
        phase,
        seenCount: 3,
        lastSeenAt: '2026-06-18T09:15:00.000Z',
      });
      expect(card.displayActions).toEqual([
        {
          id: 'again',
          label: 'Again',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'fail',
            turnIdRequired: true,
          },
        },
        {
          id: 'hard',
          label: 'Hard',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'hard',
            turnIdRequired: true,
          },
        },
        {
          id: 'good',
          label: 'Good',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'success',
            turnIdRequired: true,
          },
        },
        {
          id: 'easy',
          label: 'Easy',
          group: 'progress',
          command: {
            kind: 'platform-action',
            action: 'review-card',
            result: 'easy',
            turnIdRequired: true,
          },
        },
        {
          id: 'translate',
          label: 'Translate',
          group: 'translation',
          command: { kind: 'card-translation' },
        },
      ]);
    }
  });
});
