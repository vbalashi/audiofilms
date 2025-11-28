import { NextResponse } from "next/server";
import { getConfiguredProvider } from "@/lib/providers";
import { getCachedSubtitles, setCachedSubtitles } from "@/lib/subtitleCache";
import type { Phrase } from "@/types/subtitles";

/**
 * Mock fallback data for demo video
 */
function getMockPhrases(): Phrase[] {
  return [
    { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
    { id: 1, startSec: 2, endSec: 4.5, text: "You know the rules and so do I" },
    { id: 2, startSec: 4.5, endSec: 8, text: "A full commitment's what I'm thinking of" },
    { id: 3, startSec: 8, endSec: 10, text: "You wouldn't get this from any other guy" },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const language = searchParams.get("lang") || "auto"; // Default to auto-detect

  console.log(`[get-subs] Fetching subtitles for videoId: ${videoId}, lang: ${language}`);

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  try {
    // Step 1: Check cache first (cache key includes language preference)
    const cacheKey = language === "auto" ? videoId : `${videoId}_${language}`;
    const cached = getCachedSubtitles(cacheKey);
    if (cached) {
      console.log(`[get-subs] Returning cached subtitles for ${videoId}`);
      return NextResponse.json(cached);
    }

    // Step 2: Fetch from configured provider
    console.log(`[get-subs] Cache miss, fetching from provider`);
    
    let phrases: Phrase[];
    
    try {
      const provider = getConfiguredProvider();
      
      // Pass language preference to provider
      // 'auto' means let the provider detect the original language
      phrases = await provider.fetchSubtitles(videoId, { 
        language: language === "auto" ? undefined : language 
      });
      
      if (!phrases || phrases.length === 0) {
        throw new Error('No subtitles returned from provider');
      }
    } catch (providerError) {
      console.error(`[get-subs] Provider error:`, providerError);
      
      // Fallback for MVP demo video
      if (videoId === "dQw4w9WgXcQ") {
        console.log("[get-subs] Using mock fallback for demo video");
        phrases = getMockPhrases();
      } else {
        throw providerError;
      }
    }

    // Step 3: Cache the result
    const response = { phrases };
    setCachedSubtitles(cacheKey, response);

    // Step 4: Return the result
    console.log(`[get-subs] Returning ${phrases.length} phrases for ${videoId}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error("[get-subs] Error fetching subtitles:", error);

    // Final fallback for MVP demo video (error case)
    if (videoId === "dQw4w9WgXcQ") {
      console.log("[get-subs] Using mock fallback for demo video (error case)");
      const phrases = getMockPhrases();
      return NextResponse.json({ phrases });
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch subtitles";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
