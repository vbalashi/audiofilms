import { Supadata } from '@supadata/js';
import {
  SubtitleProviderError,
  type SubtitleProvider,
  type SubtitleFetchOptions,
  type Phrase,
  type SubtitleFetchResult,
} from '@/types/subtitles';

type SupadataTranscriptChunk = {
  text: string;
  offset: number;
  duration: number;
};

type SupadataTranscriptResponse = {
  content: SupadataTranscriptChunk[] | string;
  lang: string;
  availableLangs?: string[];
};

function isSupadataTranscriptResponse(
  response: unknown,
): response is SupadataTranscriptResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'content' in response &&
    'lang' in response
  );
}

function classifySupadataError(error: unknown): SubtitleProviderError {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Supadata failed';
  const details =
    typeof error === 'object' && error !== null
      ? [
          'error' in error ? String((error as { error?: unknown }).error || '') : '',
          'details' in error ? String((error as { details?: unknown }).details || '') : '',
          message,
        ]
          .join(' ')
          .toLowerCase()
      : message.toLowerCase();

  if (
    details.includes('invalid-request') ||
    details.includes('video provider could not be detected') ||
    details.includes('incorrect url')
  ) {
    return new SubtitleProviderError(
      'Invalid YouTube video ID or unsupported video URL.',
      'INVALID_VIDEO',
    );
  }

  if (details.includes('limit-exceeded') || details.includes('rate limit')) {
    return new SubtitleProviderError(
      'Primary subtitle provider is temporarily rate-limited.',
      'RATE_LIMIT',
    );
  }

  return new SubtitleProviderError(
    'Primary subtitle provider failed.',
    'PROVIDER_ERROR',
  );
}

/**
 * Supadata subtitle provider implementation
 * Uses the Supadata API to retrieve video transcripts
 */
export class SupadataProvider implements SubtitleProvider {
  readonly name = 'supadata';
  private client: Supadata;

  constructor(apiKey: string) {
    this.client = new Supadata({ apiKey });
  }

  async fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<SubtitleFetchResult> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // If language is explicitly provided, use it
    if (options?.language && options.language !== 'auto') {
      console.log(`[SupadataProvider] Fetching subtitles for ${videoId} (explicit lang: ${options.language})`);
      const result = await this.fetchWithLanguage(videoUrl, videoId, options.language);
      return { phrases: result.phrases, language: result.actualLang };
    }
    
    // Otherwise, try auto-detection by omitting the lang parameter
    console.log(`[SupadataProvider] Fetching subtitles for ${videoId} (auto-detect language)`);
    
    try {
      // Try without specifying language - let Supadata auto-detect
      // Try native mode first
      let response = await this.client.transcript({
        url: videoUrl,
        text: false, // We want timestamped data, not just text
        mode: 'native', // Prefer native/manual captions
      });

      let phrases = this.transformResponse(response);
      if (phrases.length > 0) {
        const transcriptResponse = isSupadataTranscriptResponse(response) ? response : null;
        const detectedLang = transcriptResponse?.lang || 'en';
        console.log(`[SupadataProvider] Auto-detected native captions in ${detectedLang}`);
        return { phrases, language: detectedLang };
      }
      
      // Try auto-generated if native not available
      response = await this.client.transcript({
        url: videoUrl,
        text: false,
        mode: 'auto', // Auto-generated captions
      });

      phrases = this.transformResponse(response);
      if (phrases.length > 0) {
        const transcriptResponse = isSupadataTranscriptResponse(response) ? response : null;
        const detectedLang = transcriptResponse?.lang || 'en';
        console.log(`[SupadataProvider] Auto-detected generated captions in ${detectedLang}`);
        return { phrases, language: detectedLang };
      }
    } catch (error) {
      const providerError = classifySupadataError(error);
      if (providerError.code === 'INVALID_VIDEO') {
        throw providerError;
      }

      console.warn(
        `[SupadataProvider] Auto-detect failed for ${videoId}: ${providerError.code}`,
      );
    }
    
    // If auto-detect fails, try common languages in order
    const fallbackLanguages = ['nl', 'en', 'de', 'fr', 'es'];
    
    for (const lang of fallbackLanguages) {
      try {
        const result = await this.fetchWithLanguage(videoUrl, videoId, lang);
        if (result.phrases.length > 0) {
          console.log(
            `[SupadataProvider] Captions resolved via language fallback ${lang} -> ${result.actualLang}`,
          );
          return { phrases: result.phrases, language: result.actualLang };
        }
      } catch (error) {
        if (error instanceof SubtitleProviderError && error.code === 'INVALID_VIDEO') {
          throw error;
        }
        continue;
      }
    }

    throw new SubtitleProviderError('No subtitles found', 'NOT_FOUND');
  }
  
  /**
   * Fetch subtitles with a specific language
   * Returns phrases AND the actual language received (which may differ from requested)
   */
  private async fetchWithLanguage(videoUrl: string, videoId: string, lang: string): Promise<{ phrases: Phrase[]; actualLang: string }> {
    try {
      // Try native subtitles first
      let response = await this.client.transcript({
        url: videoUrl,
        lang,
        text: false,
        mode: 'native', // Get native/manual subtitles
      });
      
      let phrases = this.transformResponse(response);
      if (phrases.length > 0) {
        const actualLang = isSupadataTranscriptResponse(response) ? response.lang : lang;
        return { phrases, actualLang };
      }
      
      // Fallback to auto-generated
      console.log(`[SupadataProvider] No native captions, trying auto-generated for ${lang}`);
      response = await this.client.transcript({
        url: videoUrl,
        lang,
        text: false,
        mode: 'auto', // Get auto-generated subtitles
      });
      
      phrases = this.transformResponse(response);
      if (phrases.length > 0) {
        const actualLang = isSupadataTranscriptResponse(response) ? response.lang : lang;
        return { phrases, actualLang };
      }
      
      return { phrases, actualLang: lang };
    } catch (error) {
      throw classifySupadataError(error);
    }
  }

  /**
   * Transform Supadata API response to our internal Phrase format
   */
  private transformResponse(response: unknown): Phrase[] {
    const phrases: Phrase[] = [];
    if (!isSupadataTranscriptResponse(response)) {
      console.warn('[SupadataProvider] Transcript response did not include subtitle content');
      return phrases;
    }

    if (!response || !response.content || !Array.isArray(response.content)) {
      console.warn('[SupadataProvider] No content in response');
      return phrases;
    }

    response.content.forEach((item, index) => {
      const startSec = (item.offset || 0) / 1000; // Convert ms to seconds
      const durationSec = (item.duration || 0) / 1000; // Convert ms to seconds
      const endSec = startSec + durationSec;
      
      phrases.push({
        id: index,
        startSec,
        endSec,
        text: item.text || '',
      });
    });

    return phrases;
  }
}
