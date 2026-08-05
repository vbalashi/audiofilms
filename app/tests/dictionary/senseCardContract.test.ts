import { describe, expect, it } from 'vitest';
import {
  projectSenseCardLookup,
  type PlatformLookupV2Response,
} from '../../src/lib/dictionary/senseCardContract';

const response = {
  contractVersion: 'platform-lookup-v2',
  query: 'bank',
  request: {
    contentLanguageCode: 'nl',
    translationTargetLanguageCode: 'ru',
    cardTypeId: 'word-to-definition',
    intent: 'external-click',
  },
  groups: [
    {
      headwordGroupId: 'headword:bank',
      dictionary: {
        dictionaryId: 'vandale',
        sourceLanguageCode: 'nl',
        displayName: 'Van Dale',
        messageKey: 'dictionary.vandale',
      },
      header: {
        text: 'bank',
        article: 'de',
        displayPronunciation: 'bank',
        partOfSpeech: {
          termId: 'part-of-speech.zn',
          messageKey: 'partOfSpeech.zn',
          sourceValue: 'zn',
        },
      },
      senseCount: 1,
      entryCount: 1,
      indicators: [
        {
          indicatorId: 'nt2-2000',
          value: '2k',
          messageKey: 'indicator.nt2_2000',
        },
      ],
      entries: [
        {
          kind: 'sense-card',
          entryId: 'entry:bank:1',
          meaningOrdinal: 1,
          partOfSpeech: {
            termId: 'part-of-speech.zn',
            messageKey: 'partOfSpeech.zn',
            sourceValue: 'zn',
          },
          card: {
            cardTypeId: 'word-to-definition',
            scheduler: { phase: 'encountered', repeatCount: 3 },
            knownMark: null,
            stateRevision: 'state:1',
          },
          contentRevision: 'content:1',
          summaryContentNodeId: 'definition:1',
          contentNodes: [
            {
              contentNodeId: 'definition:1',
              parentContentNodeId: null,
              kind: 'definition',
              order: 0,
              text: 'een meubelstuk waarop je kunt zitten',
              sourceTextFingerprint: 'sha256:def',
              translations: [
                {
                  translationId: 'translation:def:ru',
                  targetLanguageCode: 'ru',
                  status: 'ready',
                  text: 'предмет мебели, на котором можно сидеть',
                  sourceTextFingerprint: 'sha256:def',
                  translationPolicyVersion: 'v1',
                },
              ],
            },
          ],
          translation: {
            translationId: 'translation:entry:ru',
            entryId: 'entry:bank:1',
            targetLanguageCode: 'ru',
            status: 'ready',
            text: 'скамья',
            sourceContentFingerprint: 'sha256:entry',
            translationPolicyVersion: 'v1',
            isFresh: true,
          },
          capabilities: [
            {
              actionId: 'mark-known',
              elementId: 'known',
              messageKey: 'action.markKnown',
              target: {
                kind: 'sense-card',
                entryId: 'entry:bank:1',
                cardTypeId: 'word-to-definition',
                stateRevision: 'state:1',
              },
            },
          ],
        },
      ],
    },
  ],
  page: {
    selectedTierComplete: true,
    nextGroupCursor: null,
  },
} satisfies PlatformLookupV2Response;

describe('AudioFilms semantic SenseCard projection', () => {
  it('preserves stable semantic IDs, translations, state and exact capability targets', () => {
    const projected = projectSenseCardLookup(response, 'bank');

    expect(projected.contractVersion).toBe('dict-sense-card-v1');
    expect(projected.clickedForm).toBe('bank');
    expect(projected.groups[0].header.partOfSpeech?.messageKey).toBe('partOfSpeech.zn');
    expect(projected.groups[0].entries[0].contentNodes[0].contentNodeId).toBe('definition:1');
    expect(projected.groups[0].entries[0].contentNodes[0].translations[0].text).toBe(
      'предмет мебели, на котором можно сидеть',
    );
    expect(projected.groups[0].entries[0].capabilities[0].target).toEqual({
      kind: 'sense-card',
      entryId: 'entry:bank:1',
      cardTypeId: 'word-to-definition',
      stateRevision: 'state:1',
    });
    expect(projected.cards[0]).toMatchObject({
      contractVersion: 'dict-sense-card-entry-v1',
      id: 'entry:bank:1',
      entryId: 'entry:bank:1',
    });
  });

  it('projects every meaning in a multi-sense group as an independent stable card', () => {
    const multiSenseResponse = structuredClone(response) as PlatformLookupV2Response;
    const group = multiSenseResponse.groups[0];
    const firstEntry = group.entries[0];
    if (firstEntry.kind !== 'sense-card') throw new Error('expected sense-card fixture');
    const secondEntry = structuredClone(firstEntry);
    secondEntry.entryId = 'entry:bank:2';
    secondEntry.meaningOrdinal = 2;
    secondEntry.card = {
      ...secondEntry.card!,
      scheduler: { phase: 'learning', repeatCount: 1 },
      stateRevision: 'state:2',
    };
    secondEntry.summaryContentNodeId = 'definition:2';
    secondEntry.contentNodes = secondEntry.contentNodes.map((node) => ({
      ...node,
      contentNodeId: 'definition:2',
      text: 'een bedrijf dat geld bewaart, leent en betalingen regelt',
    }));
    secondEntry.capabilities = secondEntry.capabilities.map((capability) => ({
      ...capability,
      target: {
        ...capability.target,
        entryId: 'entry:bank:2',
        stateRevision: 'state:2',
      },
    }));
    group.senseCount = 2;
    group.entryCount = 2;
    group.entries = [firstEntry, secondEntry];

    const projected = projectSenseCardLookup(multiSenseResponse, 'bank');

    expect(projected.cards.map((card) => card.entryId)).toEqual([
      'entry:bank:1',
      'entry:bank:2',
    ]);
    expect(projected.cards.map((card) => card.group.headwordGroupId)).toEqual([
      'headword:bank',
      'headword:bank',
    ]);
    expect(projected.cards[0].entry.card?.stateRevision).toBe('state:1');
    expect(projected.cards[1].entry.card?.stateRevision).toBe('state:2');
    expect(projected.cards[1].entry.capabilities[0].target).toMatchObject({
      entryId: 'entry:bank:2',
      stateRevision: 'state:2',
    });
  });

  it('does not manufacture a single-sense card when the platform has no groups', () => {
    const projected = projectSenseCardLookup(
      {
        ...response,
        groups: [],
      },
      'missing',
    );

    expect(projected.groups).toEqual([]);
    expect(projected.cards).toEqual([]);
    expect(projected.meta.tracerEligible).toBe(false);
  });
});
