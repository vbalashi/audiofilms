import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from '@/lib/runtimePaths';

export type PhraseTranslationStatus = 'missing' | 'pending' | 'ready' | 'failed' | string;

export type PhraseTranslationRequest = {
  phraseId: string;
  sourceText: string;
  sourceLanguageCode: string;
  contextText?: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  targetLanguageCode?: string;
  purpose: string;
};

export type PlatformTextTranslationResponse = {
  translationId?: string;
  status?: string;
  sourceTextHash?: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: string | null;
  detail?: string | null;
};

export type PublicPhraseTranslation = {
  phraseId: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  translationId?: string;
  status: PhraseTranslationStatus;
  sourceTextHash?: string;
  sourceLanguageCode: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: {
    code: string;
    message?: string;
  };
};

export type StoredPhraseTranslationAssociation = PublicPhraseTranslation & {
  purpose: string;
  sourceTextHash?: string;
  contextTextHash?: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PURPOSE = 'youtube-phrase-practice';
const SAFE_PURPOSE_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;

function nowIso(): string {
  return new Date().toISOString();
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hashText(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 128) || 'translation';
}

function associationDir(): string {
  return dataDirectory('practice-phrase-translations', '.practice-phrase-translations');
}

function associationPath(translationId: string): string {
  return path.join(associationDir(), `${safeFilePart(translationId)}.json`);
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function normalizePhraseTranslationRequest(body: unknown): PhraseTranslationRequest {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const phraseId = cleanString(record.phraseId);
  const sourceText = cleanString(record.sourceText) || cleanString(record.text);
  const sourceLanguageCode = cleanString(record.sourceLanguageCode);
  const suppliedPurpose = cleanString(record.purpose);
  const purpose = suppliedPurpose || DEFAULT_PURPOSE;

  if (!phraseId) {
    throw new Error('missing_phrase_id');
  }
  if (!sourceText) {
    throw new Error('missing_source_text');
  }
  if (!sourceLanguageCode) {
    throw new Error('missing_source_language_code');
  }
  if (!SAFE_PURPOSE_PATTERN.test(purpose)) {
    throw new Error('invalid_purpose');
  }

  return {
    phraseId,
    sourceText,
    sourceLanguageCode,
    contextText: cleanString(record.contextText),
    phraseSetRevisionId: cleanString(record.phraseSetRevisionId),
    snapshotRevisionId: cleanString(record.snapshotRevisionId),
    targetLanguageCode: cleanString(record.targetLanguageCode),
    purpose,
  };
}

export function platformTextTranslationBody(input: PhraseTranslationRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    text: input.sourceText,
    sourceLanguageCode: input.sourceLanguageCode,
    purpose: input.purpose,
  };
  if (input.contextText) body.contextText = input.contextText;
  if (input.targetLanguageCode) body.targetLanguageCode = input.targetLanguageCode;
  return body;
}

export function projectPhraseTranslation(
  input: PhraseTranslationRequest,
  platform: PlatformTextTranslationResponse,
): PublicPhraseTranslation {
  const status = platform.status || (platform.error ? 'failed' : 'missing');
  const output: PublicPhraseTranslation = {
    phraseId: input.phraseId,
    phraseSetRevisionId: input.phraseSetRevisionId,
    snapshotRevisionId: input.snapshotRevisionId,
    translationId: platform.translationId,
    status,
    sourceTextHash: platform.sourceTextHash,
    sourceLanguageCode: platform.sourceLanguageCode || input.sourceLanguageCode,
    targetLanguageCode: platform.targetLanguageCode,
    translatedText: platform.translatedText,
    translationPolicyVersion: platform.translationPolicyVersion,
    cached: platform.cached,
  };

  const errorCode = cleanString(platform.error) || cleanString(platform.detail);
  if (errorCode) {
    output.error = {
      code: cleanString(platform.error) || 'text_translation_failed',
      message: cleanString(platform.detail) || cleanString(platform.error),
    };
  }

  return output;
}

export async function savePhraseTranslationAssociation(
  input: PhraseTranslationRequest,
  translation: PublicPhraseTranslation,
): Promise<void> {
  if (!translation.translationId) return;

  const existing = await getPhraseTranslationAssociation(translation.translationId);
  const timestamp = nowIso();
  const stored: StoredPhraseTranslationAssociation = {
    ...translation,
    sourceTextHash: translation.sourceTextHash || hashText(input.sourceText),
    contextTextHash: input.contextText ? hashText(input.contextText) : undefined,
    purpose: input.purpose,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await writeJson(associationPath(translation.translationId), stored);
}

export async function getPhraseTranslationAssociation(
  translationId: string,
): Promise<StoredPhraseTranslationAssociation | null> {
  const normalizedId = cleanString(translationId);
  if (!normalizedId) return null;
  return readJson<StoredPhraseTranslationAssociation>(associationPath(normalizedId));
}

export function publicPhraseTranslationFromStored(
  stored: StoredPhraseTranslationAssociation,
): PublicPhraseTranslation {
  return {
    phraseId: stored.phraseId,
    phraseSetRevisionId: stored.phraseSetRevisionId,
    snapshotRevisionId: stored.snapshotRevisionId,
    translationId: stored.translationId,
    status: stored.status,
    sourceTextHash: stored.sourceTextHash,
    sourceLanguageCode: stored.sourceLanguageCode,
    targetLanguageCode: stored.targetLanguageCode,
    translatedText: stored.translatedText,
    translationPolicyVersion: stored.translationPolicyVersion,
    cached: stored.cached,
    error: stored.error,
  };
}
