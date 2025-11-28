import { Supadata } from '@supadata/js';
import type { SubtitleProvider, SubtitleFetchOptions, Phrase } from '@/types/subtitles';

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

  async fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<Phrase[]> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // If language is explicitly provided, use it
    if (options?.language && options.language !== 'auto') {
      console.log(`[SupadataProvider] Fetching subtitles for ${videoId} (explicit lang: ${options.language})`);
      return this.fetchWithLanguage(videoUrl, videoId, options.language);
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
        console.log(`[SupadataProvider] Auto-detected language with native captions`);
        return phrases;
      }
      
      // Try auto-generated if native not available
      response = await this.client.transcript({
        url: videoUrl,
        text: false,
        mode: 'auto', // Auto-generated captions
      });

      phrases = this.transformResponse(response);
      if (phrases.length > 0) {
        console.log(`[SupadataProvider] Auto-detected language with auto-generated captions`);
        return phrases;
      }
    } catch (autoError) {
      console.log(`[SupadataProvider] Auto-detect failed, trying fallback languages`);
    }
    
    // If auto-detect fails, try common languages in order
    const fallbackLanguages = ['nl', 'en', 'de', 'fr', 'es'];
    
    for (const lang of fallbackLanguages) {
      try {
        console.log(`[SupadataProvider] Trying language: ${lang}`);
        const phrases = await this.fetchWithLanguage(videoUrl, videoId, lang);
        if (phrases.length > 0) {
          console.log(`[SupadataProvider] Success with language: ${lang}`);
          return phrases;
        }
      } catch (langError) {
        console.log(`[SupadataProvider] Failed with ${lang}, continuing...`);
        continue;
      }
    }
    
    throw new Error('No subtitles found in any supported language');
  }
  
  /**
   * Fetch subtitles with a specific language
   */
  private async fetchWithLanguage(videoUrl: string, videoId: string, lang: string): Promise<Phrase[]> {
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
        console.log(`[SupadataProvider] Got ${phrases.length} phrases from native captions`);
        return phrases;
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
        console.log(`[SupadataProvider] Got ${phrases.length} phrases from auto-generated captions`);
        return phrases;
      }
      
      return phrases;
    } catch (error) {
      console.error(`[SupadataProvider] Error fetching subtitles for ${lang}:`, error);
      throw error;
    }
  }

  /**
   * Transform Supadata API response to our internal Phrase format
   */
  private transformResponse(response: any): Phrase[] {
    const phrases: Phrase[] = [];
    
    // Supadata API returns 'content' array with 'offset' and 'duration' in milliseconds
    if (!response || !response.content || !Array.isArray(response.content)) {
      console.warn('[SupadataProvider] No content in response:', response);
      return phrases;
    }

    response.content.forEach((item: any, index: number) => {
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

