import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/dict/actions/route';

function request(body: unknown) {
  return new Request('https://audiofilms-api.dilum.io/api/dict/actions', {
    method: 'POST',
    headers: {
      authorization: 'Bearer user-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/dict/actions semantic SenseCard bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards an exact undo-known capability target without reconstructing it', async () => {
    vi.stubEnv('DICTIONARY_2000NL_V2_API_BASE', 'https://2000.test/api/platform/v2');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          contractVersion: 'platform-action-v2',
          actionId: 'undo-known',
          clientEventId: 'event-1',
          accepted: true,
          card: {},
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const target = {
      kind: 'sense-card',
      entryId: 'entry:bank:1',
      cardTypeId: 'word-to-definition',
      stateRevision: 'state:2',
      activeKnownMarkId: 'known:1',
      knownMarkRevision: 'known-revision:1',
    };

    const response = await POST(
      request({
        contractVersion: 'dict-sense-card-action-v1',
        actionId: 'undo-known',
        clientEventId: 'event-1',
        target,
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://2000.test/api/platform/v2/actions',
      expect.objectContaining({
        body: JSON.stringify({
          actionId: 'undo-known',
          clientEventId: 'event-1',
          target,
        }),
      }),
    );
  });

  it('rejects a semantic mutation without the capability state revision', async () => {
    const response = await POST(
      request({
        contractVersion: 'dict-sense-card-action-v1',
        actionId: 'mark-known',
        clientEventId: 'event-2',
        target: {
          kind: 'sense-card',
          entryId: 'entry:bank:1',
          cardTypeId: 'word-to-definition',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_action_target' });
  });
});
