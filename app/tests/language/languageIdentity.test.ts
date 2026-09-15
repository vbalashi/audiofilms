import { describe, expect, it } from 'vitest';
import {
  compareLanguageIdentity,
  identifyLanguage,
  normalizeWhisperLanguage,
} from '../../src/lib/language/languageIdentity';

describe('language identity', () => {
  it.each([
    ['nl-NL', 'nl-NL', 'nl'],
    ['nl_NL', 'nl-NL', 'nl'],
    ['iw-IL', 'he-IL', 'he'],
    ['zh-Hans', 'zh-Hans', 'zh'],
  ])('normalizes %s into %s and Whisper %s', (input, canonicalTag, asrLanguage) => {
    const identity = identifyLanguage(input);
    expect(identity.canonicalTag).toBe(canonicalTag);
    expect(normalizeWhisperLanguage(input)).toBe(asrLanguage);
  });

  it.each([
    ['nl', 'nl-NL', 'compatible'],
    ['pt-BR', 'pt', 'compatible'],
    ['pt-BR', 'pt-PT', 'incompatible'],
    ['zh-Hans', 'zh-Hant', 'incompatible'],
    ['en-US', 'nl-NL', 'incompatible'],
  ])('compares %s and %s as %s', (left, right, expected) => {
    expect(compareLanguageIdentity(left, right)).toBe(expected);
  });

  it('keeps auto and unknown values out of the ASR language identity', () => {
    expect(identifyLanguage('auto').canonicalTag).toBe('');
    expect(() => normalizeWhisperLanguage('xx-YY')).toThrow('unsupported_language:xx');
  });
});
