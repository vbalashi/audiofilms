import { Supadata } from '@supadata/js';
import type { SubtitleProvider, SubtitleFetchOptions, Phrase, SubtitleFetchResult } from '@/types/subtitles';

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
        // Supadata returns 'lang' field with the detected/actual language
        const detectedLang = transcriptResponse?.lang || 'en';
        console.log(`[SupadataProvider] Auto-detected language with native captions: ${detectedLang}`);
        console.log(`[SupadataProvider] Available languages:`, transcriptResponse?.availableLangs);
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
        // Supadata returns 'lang' field with the detected/actual language
        const detectedLang = transcriptResponse?.lang || 'en';
        console.log(`[SupadataProvider] Auto-detected language with auto-generated captions: ${detectedLang}`);
        console.log(`[SupadataProvider] Available languages:`, transcriptResponse?.availableLangs);
        return { phrases, language: detectedLang };
      }
    } catch {
      console.log(`[SupadataProvider] Auto-detect failed, trying fallback languages`);
    }
    
    // If auto-detect fails, try common languages in order
    const fallbackLanguages = ['nl', 'en', 'de', 'fr', 'es'];
    
    for (const lang of fallbackLanguages) {
      try {
        console.log(`[SupadataProvider] Trying language: ${lang}`);
        const result = await this.fetchWithLanguage(videoUrl, videoId, lang);
        if (result.phrases.length > 0) {
          console.log(`[SupadataProvider] Success with fallback language: ${lang}, actual language received: ${result.actualLang}`);
          return { phrases: result.phrases, language: result.actualLang };
        }
      } catch {
        console.log(`[SupadataProvider] Failed with ${lang}, continuing...`);
        continue;
      }
    }
    
    throw new Error('No subtitles found in any supported language');
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
        console.log(`[SupadataProvider] Got ${phrases.length} phrases from native captions (requested: ${lang}, actual: ${actualLang})`);
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
        console.log(`[SupadataProvider] Got ${phrases.length} phrases from auto-generated captions (requested: ${lang}, actual: ${actualLang})`);
        return { phrases, actualLang };
      }
      
      return { phrases, actualLang: lang };
    } catch (error) {
      console.error(`[SupadataProvider] Error fetching subtitles for ${lang}:`, error);
      throw error;
    }
  }

  /**
   * Transform Supadata API response to our internal Phrase format
   */
  private transformResponse(response: unknown): Phrase[] {
    const phrases: Phrase[] = [];
    const responseRecord =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : null;

    if (!isSupadataTranscriptResponse(response)) {
      console.warn('[SupadataProvider] Transcript response did not include subtitle content:', response);
      return phrases;
    }
    
    console.log(`[SupadataProvider] ===== RAW RESPONSE DEBUG =====`);
    console.log(`[SupadataProvider] Response type:`, typeof response);
    console.log(`[SupadataProvider] Response keys:`, Object.keys(response || {}));
    console.log(`[SupadataProvider] Response.language:`, responseRecord?.language);
    console.log(`[SupadataProvider] Response.lang:`, response.lang);
    console.log(`[SupadataProvider] Response.detected_language:`, responseRecord?.detected_language);
    console.log(`[SupadataProvider] Response.source_language:`, responseRecord?.source_language);
    console.log(`[SupadataProvider] Response.content length:`, response?.content?.length);
    console.log(`[SupadataProvider] Full response (first 500 chars):`, JSON.stringify(response).substring(0, 500));
    console.log(`[SupadataProvider] ===========================`);
    
    // Supadata API returns 'content' array with 'offset' and 'duration' in milliseconds
    if (!response || !response.content || !Array.isArray(response.content)) {
      console.warn('[SupadataProvider] No content in response:', response);
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

    console.log(`[SupadataProvider] Transformed ${phrases.length} phrases`);
    return phrases;
  }
}
