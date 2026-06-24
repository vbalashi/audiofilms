import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/dict/search/route';

const platformSearchPayload = {
  contractVersion: 'dictionary-search-v1',
  query: 'oog',
  request: { languageCode: 'nl', scope: 'authenticated' },
  groups: [
    {
      id: 'examples',
      total: 1,
      items: [
        {
          kind: 'field-match',
          entry: { id: 'entry-1', headword: 'onder vier ogen' },
          field: { kind: 'example', text: 'onder vier ogen' },
          match: { matchedText: 'oog' },
        },
      ],
      page: { limit: 6, nextCursor: null, hasMore: false },
    },
  ],
};

function searchRequest(body: unknown, token?: string) {
  return new Request('https://audiofilms-api.dilum.io/api/dict/search', {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/dict/search', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('proxies authenticated grouped search to 2000NL search', async () => {
    vi.stubEnv('DICTIONARY_2000NL_API_BASE', 'https://2000.example/api/platform/v1');
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(platformSearchPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(searchRequest({
      clickedForm: 'oog',
      sourceLanguageCode: 'nl',
      group: 'examples',
      cursor: 'cursor-1',
      limit: 50,
    }, 'user-token'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://2000.example/api/platform/v1/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer user-token',
        }),
        body: JSON.stringify({
          query: 'oog',
          languageCode: 'nl',
          group: 'examples',
          limit: 50,
          cursor: 'cursor-1',
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual(platformSearchPayload);
  });

  it('uses catalog search for guest requests', async () => {
    vi.stubEnv('DICTIONARY_2000NL_API_BASE', 'https://2000.example/api/platform/v1');
    vi.stubEnv('DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN', 'catalog-token');
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        ...platformSearchPayload,
        request: { languageCode: 'nl', scope: 'public-catalog' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(searchRequest({
      clickedForm: 'oog',
      sourceLanguageCode: 'nl',
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://2000.example/api/platform/v1/catalog/search',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer catalog-token',
        }),
      }),
    );
  });

  it('passes search index readiness failures through as 503', async () => {
    vi.stubEnv('DICTIONARY_2000NL_API_BASE', 'https://2000.example/api/platform/v1');
    vi.stubEnv('DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN', 'catalog-token');
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: 'search_index_not_ready',
        detail: 'Grouped dictionary search index is not ready.',
      }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(searchRequest({
      clickedForm: 'oog',
      sourceLanguageCode: 'nl',
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'search_index_not_ready',
      detail: 'Grouped dictionary search index is not ready.',
    });
  });

  it('rejects invalid limits before proxying', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(searchRequest({
      clickedForm: 'oog',
      sourceLanguageCode: 'nl',
      limit: 'many',
    }, 'user-token'));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: 'invalid_limit' });
  });
});
