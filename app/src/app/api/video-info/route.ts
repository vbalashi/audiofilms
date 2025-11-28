import { NextResponse } from "next/server";
import { detectVideoLanguage } from "@/lib/youtubeMetadata";
import { getCachedVideoInfo, setCachedVideoInfo } from "@/lib/videoInfoCache";

/**
 * API endpoint to get video metadata including available subtitle languages
 * This helps the UI show language selection options
 * Uses caching to avoid redundant API calls (saves money!)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  console.log(`[video-info] Fetching metadata for: ${videoId}`);

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  try {
    // Check cache first
    const cached = getCachedVideoInfo(videoId);
    if (cached) {
      console.log(`[video-info] Returning cached info for ${videoId}`);
      return NextResponse.json({
        videoId,
        originalLanguage: cached.originalLanguage,
        availableLanguages: cached.availableLanguages,
        hasManualCaptions: cached.hasManualCaptions,
        hasAutoCaptions: cached.hasAutoCaptions,
      });
    }

    // Cache miss - fetch from API
    console.log(`[video-info] Cache miss, fetching from yt-dlp`);
    const languageInfo = await detectVideoLanguage(videoId);
    
    // Cache the result
    setCachedVideoInfo(videoId, languageInfo);
    
    console.log(`[video-info] Found languages:`, languageInfo);

    return NextResponse.json({
      videoId,
      originalLanguage: languageInfo.originalLanguage,
      availableLanguages: languageInfo.availableLanguages,
      hasManualCaptions: languageInfo.hasManualCaptions,
      hasAutoCaptions: languageInfo.hasAutoCaptions,
    });
  } catch (error) {
    console.error("[video-info] Error fetching video info:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch video info";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

