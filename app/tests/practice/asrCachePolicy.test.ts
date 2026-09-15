import { describe, expect, it } from 'vitest';
import { asrArtifactRefreshPlan } from '../../scripts/asr-cache-policy.mjs';

describe('ASR artifact refresh policy', () => {
  it('refreshes captions without invalidating cached audio or word timings', () => {
    expect(asrArtifactRefreshPlan({
      audioExists: true,
      captionsExist: true,
      asrExists: true,
      refreshSource: true,
    })).toEqual({
      refreshAudio: false,
      refreshCaptions: true,
      refreshAsr: false,
    });
  });

  it('refreshes ASR only when explicitly requested or missing', () => {
    expect(asrArtifactRefreshPlan({
      audioExists: true,
      captionsExist: true,
      asrExists: true,
      refreshAsr: true,
    }).refreshAsr).toBe(true);

    expect(asrArtifactRefreshPlan({
      audioExists: true,
      captionsExist: true,
      asrExists: false,
    }).refreshAsr).toBe(true);
  });
});
