import { getCachedVideoInfo, setCachedVideoInfo } from '@/lib/videoInfoCache';
import { detectVideoLanguage } from '@/lib/youtubeMetadata';
import type { VideoInfoResponse } from '@/types/subtitles';

export async function loadVideoInfo(videoId: string): Promise<VideoInfoResponse> {
  const cached = getCachedVideoInfo(videoId);

  if (cached) {
    console.log(`[VideoInfoService] Returning cached info for ${videoId}`);
    return {
      videoId,
      originalLanguage: cached.originalLanguage,
      availableLanguages: cached.availableLanguages,
      hasManualCaptions: cached.hasManualCaptions,
      hasAutoCaptions: cached.hasAutoCaptions,
    };
  }

  console.log(`[VideoInfoService] Cache miss for ${videoId}, fetching metadata`);
  const languageInfo = await detectVideoLanguage(videoId);
  setCachedVideoInfo(videoId, languageInfo);

  return {
    videoId,
    originalLanguage: languageInfo.originalLanguage,
    availableLanguages: languageInfo.availableLanguages,
    hasManualCaptions: languageInfo.hasManualCaptions,
    hasAutoCaptions: languageInfo.hasAutoCaptions,
  };
}
