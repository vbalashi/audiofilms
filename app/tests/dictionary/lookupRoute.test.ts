import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/dict/lookup/route';

const platformItem = {
  entry: {
    id: 'entry:huis',
    languageCode: 'nl',
    headword: 'huis',
    content: {
      sections: [
        {
          id: 'meaning-main',
          kind: 'meaning',
          text: 'house',
          sourcePath: 'content.sections.0',
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
    queriedForm: 'huis',
    matchedForm: 'huis',
    relation: 'exact',
  },
  cardCapabilitiesByType: {
    'word-to-definition': {
      phase: 'encountered',
      actions: ['start-learning', 'mark-known'],
      reviewResults: [],
    },
  },
  userStateByCardType: {
    'word-to-definition': {
      seenCount: 1,
    },
  },
};

function lookupRequest() {
  return new Request('https://audiofilms-api.dilum.io/api/dict/lookup', {
    method: 'POST',
    headers: {
      authorization: 'Bearer user-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      clickedForm: 'huis',
      sourceLanguageCode: 'nl',
      contextText: 'het huis',
    }),
  });
}

describe('/api/dict/lookup', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to untranslated authenticated lookup when inline translations fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'translation_cache_failed',
            detail: 'relation "word_entry_translations" temporarily unavailable',
          }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ query: 'huis', items: [platformItem] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(lookupRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      query: 'huis',
      includeUserState: true,
      includeTranslations: true,
      intent: 'external-click',
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      query: 'huis',
      includeUserState: true,
      includeTranslations: false,
      intent: 'external-click',
    });
    expect(payload.cards[0].headword).toBe('huis');
    expect(payload.cards[0].progress).toMatchObject({
      phase: 'encountered',
      seenCount: 1,
    });
    expect(payload.cards[0].displayActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'learn', label: 'Start Learning', group: 'progress' }),
        expect.objectContaining({ id: 'known', label: 'Known', group: 'progress' }),
        expect.objectContaining({ id: 'translate', label: 'Translate', group: 'translation' }),
      ]),
    );
    expect(payload.meta).toMatchObject({
      provider: '2000nl',
      responseVersion: 'overlay-v2',
      translationFallbackUsed: true,
      translationFallbackReason: 'translation_cache_failed',
    });
  });
});
