import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../src/app/api/dict/session/route';

function request() {
  return new Request('https://audiofilms-api.dilum.io/api/dict/session', {
    headers: { authorization: 'Bearer user-token' },
  });
}

describe('/api/dict/session', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('preserves the selected interface language independently of translation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              id: 'user:123',
              email: 'learner@example.com',
            },
            preferences: {
              translationTargetLanguageCode: null,
              interfaceLanguageCode: 'ru',
              source: 'user-setting',
              updatedAt: '2026-07-30T10:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      authenticated: true,
      preferences: {
        translationTargetLanguageCode: null,
        interfaceLanguageCode: 'ru',
        source: 'user-setting',
      },
    });
  });
});
