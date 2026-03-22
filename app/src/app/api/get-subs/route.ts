import { NextResponse } from "next/server";
import { loadSubtitles } from "@/lib/subtitleService";
import type { SubtitleLanguagePreference } from "@/types/subtitles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const language = (searchParams.get("lang") || "auto") as SubtitleLanguagePreference;

  console.log(`[get-subs] Fetching subtitles for videoId: ${videoId}, lang: ${language}`);

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  try {
    const response = await loadSubtitles(videoId, language);
    console.log(
      `[get-subs] Returning ${response.phrases.length} phrases in language ${response.language} for ${videoId}`,
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("[get-subs] Error fetching subtitles:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch subtitles";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
