import { NextResponse } from "next/server";
import { loadSubtitles } from "@/lib/subtitleService";
import {
  SubtitleProviderError,
  type SubtitleLanguagePreference,
} from "@/types/subtitles";

function normalizeSubtitleFailure(error: unknown): {
  message: string;
  status: number;
  recoverable: boolean;
  suggestedAction: string;
} {
  const rawMessage =
    error instanceof Error ? error.message : "Failed to fetch subtitles";

  if (error instanceof SubtitleProviderError) {
    switch (error.code) {
      case "NOT_FOUND":
        return {
          message: "No subtitles found",
          status: 404,
          recoverable: true,
          suggestedAction: "Try another language or another video.",
        };
      case "INVALID_VIDEO":
        return {
          message: "Invalid YouTube video ID or unsupported video URL.",
          status: 400,
          recoverable: true,
          suggestedAction: "Check the video link and try again.",
        };
      case "RATE_LIMIT":
        return {
          message: "Subtitle providers are temporarily rate-limited.",
          status: 503,
          recoverable: true,
          suggestedAction: "Retry in a moment.",
        };
      case "PROVIDER_ERROR":
      default:
        return {
          message: "Failed to fetch subtitles",
          status: 500,
          recoverable: true,
          suggestedAction: "Check provider configuration or retry later.",
        };
    }
  }

  const noSubtitlesFound =
    rawMessage === "No subtitles found" ||
    rawMessage === "No subtitles found in any supported language" ||
    rawMessage.includes("No subtitles found");

  if (noSubtitlesFound) {
    return {
      message: "No subtitles found",
      status: 404,
      recoverable: true,
      suggestedAction: "Try another language or another video.",
    };
  }

  const invalidVideoId =
    rawMessage.includes("Incomplete YouTube ID") ||
    rawMessage.includes("video provider could not be detected") ||
    rawMessage.includes("invalid-request");

  if (invalidVideoId) {
    return {
      message: "Invalid YouTube video ID or unsupported video URL.",
      status: 400,
      recoverable: true,
      suggestedAction: "Check the video link and try again.",
    };
  }

  return {
    message: "Failed to fetch subtitles",
    status: 500,
    recoverable: true,
    suggestedAction: "Check provider configuration or retry later.",
  };
}

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
    if (error instanceof SubtitleProviderError) {
      console.warn(`[get-subs] Subtitle fetch failed for ${videoId}: ${error.code}`);
    } else {
      console.error("[get-subs] Error fetching subtitles:", error);
    }
    const failure = normalizeSubtitleFailure(error);

    return NextResponse.json(
      {
        error: failure.message,
        recoverable: failure.recoverable,
        suggestedAction: failure.suggestedAction,
      },
      { status: failure.status }
    );
  }
}
