export type Phrase = {
  id: number;
  startSec: number;
  endSec: number;
  text: string;
};

export type SubtitleSourceKind =
  | 'manual'
  | 'auto'
  | 'provider'
  | 'transcript-panel'
  | 'unknown';

export type SubtitleTimingExactness =
  | 'exact'
  | 'word-level'
  | 'inferred-end'
  | 'approximate';

export type SubtitleQualityFlag =
  | 'source-kind-unverified'
  | 'source-kind-mismatch'
  | 'source-unverified'
  | 'language-mismatch'
  | 'duplicate-cues'
  | 'overlap-cues'
  | 'inferred-end'
  | 'long-cues'
  | 'rolling-caption';

export type SubtitleRetrievalAttempt = {
  path: string;
  status: 'ok' | 'failed' | 'skipped';
  cues?: number;
  error?: string;
  reason?: string;
};

export type SubtitleQualityMeta = {
  sourceKind: SubtitleSourceKind;
  retrievalPath: string;
  selectedTrackId?: string;
  actualTrackId?: string;
  languageCode?: string;
  timingExactness: SubtitleTimingExactness;
  qualityFlags: SubtitleQualityFlag[];
  warnings: string[];
  retrievalAttempts?: SubtitleRetrievalAttempt[];
};

export type SubtitleResponse = {
  phrases: Phrase[];
  language?: string; // The actual language of the fetched subtitles
  meta?: {
    provider: string;
    fallbackUsed: boolean;
    warning?: string;
    sourceKind?: SubtitleSourceKind;
    retrievalPath?: string;
    timingExactness?: SubtitleTimingExactness;
    qualityFlags?: SubtitleQualityFlag[];
    warnings?: string[];
    retrievalAttempts?: SubtitleRetrievalAttempt[];
  };
};

export type SubtitleLanguagePreference = string | 'auto';

/**
 * Result from fetching subtitles
 */
export type SubtitleFetchResult = {
  phrases: Phrase[];
  language: string; // The actual language code of the fetched subtitles
  sourceKind?: SubtitleSourceKind;
  retrievalPath?: string;
  timingExactness?: SubtitleTimingExactness;
  qualityFlags?: SubtitleQualityFlag[];
  warnings?: string[];
  retrievalAttempts?: SubtitleRetrievalAttempt[];
};

/**
 * Vendor-agnostic subtitle provider interface
 */
export interface SubtitleProvider {
  /**
   * Retrieve subtitles for a given video
   * @param videoId - The video identifier (YouTube video ID, URL, etc.)
   * @param options - Provider-specific options (language, format, etc.)
   * @returns The phrases and the actual language that was fetched
   */
  fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<SubtitleFetchResult>;
  
  /**
   * Name of the provider (for logging/debugging)
   */
  readonly name: string;
}

export type SubtitleFetchOptions = {
  language?: string;
  format?: 'vtt' | 'srt' | 'text';
  sourceKind?: Extract<SubtitleSourceKind, 'manual' | 'auto'>;
};

export type VideoInfoResponse = {
  videoId: string;
  originalLanguage: string | null;
  availableLanguages: string[];
  hasManualCaptions: boolean;
  hasAutoCaptions: boolean;
};

export class SubtitleProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_VIDEO'
      | 'RATE_LIMIT'
      | 'PROVIDER_ERROR',
  ) {
    super(message);
    this.name = 'SubtitleProviderError';
  }
}
