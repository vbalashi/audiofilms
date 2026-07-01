import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  normalizePhraseTranslationRequest,
  platformTextTranslationBody,
  projectPhraseTranslation,
  publicPhraseTranslationFromStored,
  savePhraseTranslationAssociation,
  getPhraseTranslationAssociation,
} from '../../src/lib/practice/phraseTranslations';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

let dataRoot: string;

describe('phrase translation projection and association cache', () => {
  beforeEach(async () => {
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audiofilms-phrase-translations-'));
    process.env.AUDIOFILMS_DATA_DIR = dataRoot;
  });

  afterEach(async () => {
    delete process.env.AUDIOFILMS_DATA_DIR;
    await fs.rm(dataRoot, { recursive: true, force: true });
  });

  it('forwards context text to the 2000NL text-translation request', () => {
    const input = normalizePhraseTranslationRequest({
      phraseId: 'phrase-1',
      sourceText: 'Hij loopt naar huis.',
      sourceLanguageCode: 'nl',
      contextText: 'Hij is moe en loopt naar huis.',
      targetLanguageCode: 'ru',
    });

    expect(platformTextTranslationBody(input)).toEqual({
      text: 'Hij loopt naar huis.',
      sourceLanguageCode: 'nl',
      purpose: 'youtube-phrase-practice',
      contextText: 'Hij is moe en loopt naar huis.',
      targetLanguageCode: 'ru',
    });
  });

  it('projects separate source and context hashes from platform responses', () => {
    const input = normalizePhraseTranslationRequest({
      phraseId: 'phrase-1',
      sourceText: 'Hij loopt naar huis.',
      sourceLanguageCode: 'nl',
      contextText: 'Hij is moe en loopt naar huis.',
    });

    const projected = projectPhraseTranslation(input, {
      translationId: 'translation-id',
      status: 'ready',
      sourceTextHash: 'source-hash',
      contextTextHash: 'context-hash',
      sourceLanguageCode: 'nl',
      targetLanguageCode: 'en',
      translatedText: 'He walks home.',
      literalTranslatedText: 'He is walking to house.',
      translatorComment: 'Context makes this a normal motion phrase.',
      translationPolicyVersion: 'platform-text-translation-v1',
      cached: false,
    });

    expect(projected).toMatchObject({
      translationId: 'translation-id',
      sourceTextHash: 'source-hash',
      contextTextHash: 'context-hash',
      sourceLanguageCode: 'nl',
      targetLanguageCode: 'en',
      translatedText: 'He walks home.',
      literalTranslatedText: 'He is walking to house.',
      translatorComment: 'Context makes this a normal motion phrase.',
    });
  });

  it('stores and republishes context hash when the platform omits it', async () => {
    const input = normalizePhraseTranslationRequest({
      phraseId: 'phrase-1',
      sourceText: 'Hij loopt naar huis.',
      sourceLanguageCode: 'nl',
      contextText: 'Hij is moe en loopt naar huis.',
    });
    const projected = projectPhraseTranslation(input, {
      translationId: 'translation-id',
      status: 'ready',
      sourceTextHash: 'source-hash',
      sourceLanguageCode: 'nl',
      targetLanguageCode: 'en',
      translatedText: 'He walks home.',
      literalTranslatedText: 'He is walking to house.',
      translatorComment: 'Context makes this a normal motion phrase.',
      translationPolicyVersion: 'platform-text-translation-v1',
      cached: false,
    });

    await savePhraseTranslationAssociation(input, projected);

    const stored = await getPhraseTranslationAssociation('translation-id');
    expect(stored).toMatchObject({
      translationId: 'translation-id',
      sourceTextHash: 'source-hash',
      contextTextHash: sha256('Hij is moe en loopt naar huis.'),
      purpose: 'youtube-phrase-practice',
    });
    expect(publicPhraseTranslationFromStored(stored!)).toMatchObject({
      translationId: 'translation-id',
      sourceTextHash: 'source-hash',
      contextTextHash: sha256('Hij is moe en loopt naar huis.'),
      literalTranslatedText: 'He is walking to house.',
      translatorComment: 'Context makes this a normal motion phrase.',
    });
  });
});
