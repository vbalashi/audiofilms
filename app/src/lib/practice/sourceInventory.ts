import {
  getAsrRuntimeConfig,
  type AsrRuntimeConfig,
} from '@/lib/asr/asrConfig';
import {
  listAsrJobs,
  readAsrJobResult,
} from '@/lib/asr/asrJobs';
import { practiceTextSourceFromSubtitleResponse } from '@/lib/practice/snapshot';
import { getCachedSubtitles } from '@/lib/subtitleCache';
import type { PracticeTextSource, PracticeTextSourceKind } from '@/types/practice';
import type {
  SubtitleLanguagePreference,
  SubtitleResponse,
  SubtitleSourceKind,
} from '@/types/subtitles';

type PracticeSourceInventoryOptions = {
  videoId: string;
  requestedLanguage: SubtitleLanguagePreference;
  activeResponse?: SubtitleResponse | null;
  config?: AsrRuntimeConfig;
};

export type PracticeSourceInventoryEntry = {
  source: PracticeTextSource;
  response: SubtitleResponse;
};

export async function buildPracticeSourceInventoryEntries(
  options: PracticeSourceInventoryOptions,
): Promise<PracticeSourceInventoryEntry[]> {
  const entries: PracticeSourceInventoryEntry[] = [];
  const addSource = (response: SubtitleResponse | null | undefined) => {
    if (!response?.language) return;
    entries.push({
      response,
      source: practiceTextSourceFromSubtitleResponse(
        response,
        options.videoId,
        response.language || options.requestedLanguage || 'auto',
      ),
    });
  };

  addSource(options.activeResponse);

  for (const sourceKind of ['manual', 'auto'] as const) {
    addSource(getCachedPracticeSubtitles(options.videoId, options.requestedLanguage, sourceKind));
  }

  for (const asrResponse of await readableAsrSubtitleResponses(options)) {
    addSource(asrResponse);
  }

  return dedupeEntries(entries);
}

export async function buildPracticeSourceInventory(
  options: PracticeSourceInventoryOptions,
): Promise<PracticeTextSource[]> {
  return (await buildPracticeSourceInventoryEntries(options)).map((entry) => entry.source);
}

export async function findPracticeSourceInventoryEntry(
  options: PracticeSourceInventoryOptions,
  requested: {
    id?: string;
    revisionId?: string;
    kind?: PracticeTextSourceKind;
  },
): Promise<PracticeSourceInventoryEntry | null> {
  const entries = await buildPracticeSourceInventoryEntries(options);
  return entries.find((entry) => {
    if (requested.id && requested.id !== entry.source.id) return false;
    if (requested.revisionId && requested.revisionId !== entry.source.revisionId) return false;
    if (requested.kind && requested.kind !== entry.source.kind) return false;
    return true;
  }) || null;
}

export function getCachedPracticeSubtitles(
  videoId: string,
  language: SubtitleLanguagePreference,
  sourceKind: Extract<SubtitleSourceKind, 'manual' | 'auto'>,
): SubtitleResponse | null {
  return getCachedSubtitles(subtitleCacheKey(videoId, language, sourceKind));
}

function subtitleCacheKey(
  videoId: string,
  language: SubtitleLanguagePreference,
  sourceKind: Extract<SubtitleSourceKind, 'manual' | 'auto'>,
): string {
  const languageKey = language === 'auto' ? 'auto' : language;
  return `${videoId}_${languageKey}_${sourceKind}`;
}

async function readableAsrSubtitleResponses(
  options: PracticeSourceInventoryOptions,
): Promise<SubtitleResponse[]> {
  const config = options.config || getAsrRuntimeConfig();
  const jobs = await listAsrJobs(config);
  const matchingJobs = jobs
    .filter((job) =>
      job.status === 'completed' &&
      job.request.videoId === options.videoId &&
      languageMatches(options.requestedLanguage, job.request.language),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const responses: SubtitleResponse[] = [];
  for (const job of matchingJobs) {
    const result = await readAsrJobResult(job).catch(() => null);
    if (result?.language) {
      responses.push(result);
    }
  }
  return responses;
}

function languageMatches(requestedLanguage: SubtitleLanguagePreference, actualLanguage: string): boolean {
  return requestedLanguage === 'auto' || requestedLanguage === actualLanguage;
}

function dedupeEntries(entries: PracticeSourceInventoryEntry[]): PracticeSourceInventoryEntry[] {
  const byRevision = new Map<string, PracticeSourceInventoryEntry>();
  for (const entry of entries) {
    byRevision.set(entry.source.revisionId, entry);
  }
  return Array.from(byRevision.values());
}
