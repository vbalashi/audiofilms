export type Phrase = {
  id: number;
  startSec: number;
  endSec: number;
  text: string;
};

export type SubtitleResponse = {
  phrases: Phrase[];
  language?: string; // The actual language of the fetched subtitles
};

export type SubtitleLanguagePreference = string | 'auto';

/**
 * Result from fetching subtitles
 */
export type SubtitleFetchResult = {
  phrases: Phrase[];
  language: string; // The actual language code of the fetched subtitles
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
};

export type VideoInfoResponse = {
  videoId: string;
  originalLanguage: string | null;
  availableLanguages: string[];
  hasManualCaptions: boolean;
  hasAutoCaptions: boolean;
};
