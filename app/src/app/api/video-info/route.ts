import { NextResponse } from "next/server";
import { loadVideoInfo } from "@/lib/videoInfoService";

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
    const response = await loadVideoInfo(videoId);
    console.log(`[video-info] Found languages:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[video-info] Error fetching video info:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch video info";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
