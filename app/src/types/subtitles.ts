export type Phrase = {
  id: number;
  startSec: number;
  endSec: number;
  text: string;
};

export type SubtitleResponse = {
  phrases: Phrase[];
};

/**
 * Vendor-agnostic subtitle provider interface
 */
export interface SubtitleProvider {
  /**
   * Retrieve subtitles for a given video
   * @param videoId - The video identifier (YouTube video ID, URL, etc.)
   * @param options - Provider-specific options (language, format, etc.)
   */
  fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<Phrase[]>;
  
  /**
   * Name of the provider (for logging/debugging)
   */
  readonly name: string;
}

export type SubtitleFetchOptions = {
  language?: string;
  format?: 'vtt' | 'srt' | 'text';
};
