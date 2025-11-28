import YTDlpWrap from "yt-dlp-wrap";
import type { SubtitleProvider, SubtitleFetchOptions, Phrase } from '@/types/subtitles';

/**
 * YT-DLP subtitle provider implementation (fallback/legacy provider)
 * Uses yt-dlp to retrieve video subtitles locally
 */
export class YtDlpProvider implements SubtitleProvider {
  readonly name = 'yt-dlp';
  private ytDlpPath: string;

  constructor(ytDlpPath = '/usr/bin/yt-dlp') {
    this.ytDlpPath = ytDlpPath;
  }

  async fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<Phrase[]> {
    try {
      console.log(`[YtDlpProvider] Fetching subtitles for ${videoId}`);
      
      const ytDlpWrap = new YTDlpWrap(this.ytDlpPath);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Get video info with subtitle URLs
      const info = await ytDlpWrap.getVideoInfo(videoUrl);

      // Try to get subtitles (prefer manual over auto-generated)
      const subtitles = info.subtitles || {};
      const autoCaptions = info.automatic_captions || {};

      // Language preference (from options or defaults)
      const preferredLangs = [options?.language || 'en', 'nl', 'en'];
      
      let subTrack = null;
      for (const lang of preferredLangs) {
        subTrack = subtitles[lang] || autoCaptions[lang];
        if (subTrack && Array.isArray(subTrack)) break;
      }

      // Fallback to any available
      if (!subTrack || !Array.isArray(subTrack)) {
        subTrack = Object.values(subtitles)[0] || Object.values(autoCaptions)[0];
      }

      if (!subTrack || !Array.isArray(subTrack)) {
        throw new Error('No subtitles found');
      }

      // Get VTT format subtitle
      const vttSub = subTrack.find((s: any) => s.ext === 'vtt');
      if (!vttSub || !vttSub.url) {
        throw new Error('VTT format not available');
      }

      // Fetch the VTT content
      const response = await fetch(vttSub.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch VTT: ${response.statusText}`);
      }

      const vttContent = await response.text();
      console.log(`[YtDlpProvider] Fetched ${vttContent.length} characters of VTT`);

      // Parse VTT to phrases
      const phrases = this.parseVTT(vttContent);
      console.log(`[YtDlpProvider] Parsed ${phrases.length} phrases`);

      return phrases;
    } catch (error) {
      console.error(`[YtDlpProvider] Error fetching subtitles:`, error);
      throw new Error(`Failed to fetch subtitles via yt-dlp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse VTT format to extract phrases
   */
  private parseVTT(vttContent: string): Phrase[] {
    const phrases: Phrase[] = [];
    const lines = vttContent.split("\n");
    let id = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match timestamp lines like "00:00:00.115 --> 00:00:02.423"
      const timestampMatch = line.match(
        /^(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})/
      );

      if (timestampMatch) {
        const startSec =
          parseInt(timestampMatch[1]) * 3600 +
          parseInt(timestampMatch[2]) * 60 +
          parseFloat(timestampMatch[3]);
        const endSec =
          parseInt(timestampMatch[4]) * 3600 +
          parseInt(timestampMatch[5]) * 60 +
          parseFloat(timestampMatch[6]);

        // Get the text from the next non-empty line(s)
        let text = "";
        for (let j = i + 1; j < lines.length; j++) {
          const textLine = lines[j].trim();
          if (textLine === "") break; // Empty line marks end of subtitle
          if (textLine.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/)) break; // Next timestamp
          if (text) text += " ";
          text += textLine;
        }

        if (text) {
          phrases.push({
            id: id++,
            startSec,
            endSec,
            text: text.replace(/<[^>]*>/g, ""), // Remove HTML tags
          });
        }
      }
    }

    return phrases;
  }
}

