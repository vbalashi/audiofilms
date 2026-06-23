import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as draftPost } from '../../src/app/api/dict/generated-entry/draft/route';
import { POST as savePost } from '../../src/app/api/dict/generated-entry/route';

function request(path: string, body: unknown, token = 'user-token') {
  return new Request(`https://audiofilms-api.dilum.io${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/dict/generated-entry proxy routes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DICTIONARY_2000NL_API_BASE;
  });

  it('requires a forwarded 2000NL bearer token for draft generation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await draftPost(
      request(
        '/api/dict/generated-entry/draft',
        {
          clickedForm: 'gedoe',
          sourceLanguageCode: 'nl',
        },
        '',
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'missing_2000nl_user_token',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies draft generation to 2000NL with the user bearer token', async () => {
    process.env.DICTIONARY_2000NL_API_BASE = 'https://2000nl.example/api/platform/v1';
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          draft: {
            clickedForm: 'gedoe',
            languageCode: 'nl',
            generated: { definition: 'Een hoop gedoe.' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await draftPost(
      request('/api/dict/generated-entry/draft', {
        clickedForm: 'gedoe',
        sourceLanguageCode: 'nl',
        contextText: 'Wat een gedoe.',
        sourceContext: { contractVersion: 'source-context-v2' },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://2000nl.example/api/platform/v1/user-dictionary/generated-entry/draft',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer user-token',
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      clickedForm: 'gedoe',
      languageCode: 'nl',
      contextText: 'Wat een gedoe.',
      sourceContext: { contractVersion: 'source-context-v2' },
    });
  });

  it('proxies generated entry save without inventing platform actions', async () => {
    process.env.DICTIONARY_2000NL_API_BASE = 'https://2000nl.example/api/platform/v1';
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, entryId: 'entry-generated-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await savePost(
      request('/api/dict/generated-entry', {
        clickedForm: 'gedoe',
        sourceLanguageCode: 'nl',
        contextText: 'Wat een gedoe.',
        generated: {
          definition: 'Een hoop gedoe.',
          provider: 'openai',
          model: 'gpt-test',
          promptVersion: 'generated-user-entry-v1',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://2000nl.example/api/platform/v1/user-dictionary/generated-entry',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer user-token',
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      clickedForm: 'gedoe',
      languageCode: 'nl',
      contextText: 'Wat een gedoe.',
      generated: {
        definition: 'Een hoop gedoe.',
        provider: 'openai',
        model: 'gpt-test',
        promptVersion: 'generated-user-entry-v1',
      },
    });
  });
});
