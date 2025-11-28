/**
 * YouTube metadata utilities for language detection and caption information
 */

export type YouTubeLanguageInfo = {
  originalLanguage: string | null;
  availableLanguages: string[];
  hasManualCaptions: boolean;
  hasAutoCaptions: boolean;
};

/**
 * Detect the original language of a YouTube video by fetching its metadata
 * Uses yt-dlp to extract language information without downloading the video
 */
export async function detectVideoLanguage(videoId: string): Promise<YouTubeLanguageInfo> {
  try {
    const YTDlpWrap = (await import('yt-dlp-wrap')).default;
    const ytDlpWrap = new YTDlpWrap('/usr/bin/yt-dlp');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[YouTubeMetadata] Detecting language for ${videoId}`);

    // Get video info to extract subtitle information
    const info = await ytDlpWrap.getVideoInfo(videoUrl);

    const subtitles = info.subtitles || {};
    const autoCaptions = info.automatic_captions || {};
    
    // Get available languages
    const manualLanguages = Object.keys(subtitles);
    const autoLanguages = Object.keys(autoCaptions);
    const allLanguages = [...new Set([...manualLanguages, ...autoLanguages])];

    // Try to determine original language
    // Priority: 1) Video language metadata, 2) First manual subtitle, 3) First auto-caption
    let originalLanguage: string | null = null;
    
    if (info.language) {
      originalLanguage = info.language;
    } else if (manualLanguages.length > 0) {
      originalLanguage = manualLanguages[0];
    } else if (autoLanguages.length > 0) {
      originalLanguage = autoLanguages[0];
    }

    const result: YouTubeLanguageInfo = {
      originalLanguage,
      availableLanguages: allLanguages,
      hasManualCaptions: manualLanguages.length > 0,
      hasAutoCaptions: autoLanguages.length > 0,
    };

    console.log(`[YouTubeMetadata] Detected:`, result);
    return result;
  } catch (error) {
    console.error('[YouTubeMetadata] Error detecting language:', error);
    
    // Return empty info on error
    return {
      originalLanguage: null,
      availableLanguages: [],
      hasManualCaptions: false,
      hasAutoCaptions: false,
    };
  }
}

/**
 * Get a prioritized list of languages to try
 * Priority: original > user preference > common languages
 */
export function getLanguagePriority(
  originalLanguage: string | null,
  userPreference?: string
): string[] {
  const languages: string[] = [];
  
  // Add user preference first if provided
  if (userPreference && userPreference !== 'auto') {
    languages.push(userPreference);
  }
  
  // Add original language
  if (originalLanguage) {
    languages.push(originalLanguage);
  }
  
  // Add common fallbacks
  const commonLanguages = ['en', 'nl', 'de', 'fr', 'es'];
  for (const lang of commonLanguages) {
    if (!languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  // Remove duplicates while preserving order
  return [...new Set(languages)];
}

