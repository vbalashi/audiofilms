import { NextResponse } from "next/server";
import YTDlpWrap from "yt-dlp-wrap";

// Parse VTT format to extract phrases
function parseVTT(vttContent: string) {
  const phrases = [];
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  console.log("Fetching subs for:", videoId);

  if (!videoId)
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

  try {
    // Initialize yt-dlp (use system binary if available)
    const ytDlpWrap = new YTDlpWrap("/usr/bin/yt-dlp");
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get video info with subtitle URLs
    const info = await ytDlpWrap.getVideoInfo(videoUrl);

    // Try to get subtitles (prefer manual over auto-generated)
    const subtitles = info.subtitles || {};
    const autoCaptions = info.automatic_captions || {};

    // Try Dutch first, then English, then any available language
    let subTrack =
      subtitles.nl ||
      subtitles.en ||
      Object.values(subtitles)[0] ||
      autoCaptions.nl ||
      autoCaptions.en ||
      Object.values(autoCaptions)[0];

    if (!subTrack || !Array.isArray(subTrack)) {
      console.log("No subtitles found");

      // Fallback for MVP demo video
      if (videoId === "dQw4w9WgXcQ") {
        console.log("Using mock fallback for dQw4w9WgXcQ");
        const mockPhrases = [
          { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
          {
            id: 1,
            startSec: 2,
            endSec: 4.5,
            text: "You know the rules and so do I",
          },
          {
            id: 2,
            startSec: 4.5,
            endSec: 8,
            text: "A full commitment's what I'm thinking of",
          },
          {
            id: 3,
            startSec: 8,
            endSec: 10,
            text: "You wouldn't get this from any other guy",
          },
        ];
        return NextResponse.json({ phrases: mockPhrases });
      }

      return NextResponse.json(
        { error: "No subtitles found" },
        { status: 404 }
      );
    }

    // Get VTT format subtitle
    const vttSub = subTrack.find((s: any) => s.ext === "vtt");
    if (!vttSub || !vttSub.url) {
      return NextResponse.json(
        { error: "VTT format not available" },
        { status: 404 }
      );
    }

    // Fetch the VTT content
    const response = await fetch(vttSub.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch VTT: ${response.statusText}`);
    }

    const vttContent = await response.text();
    console.log(`Fetched ${vttContent.length} characters of VTT`);

    // Parse VTT to phrases
    const phrases = parseVTT(vttContent);
    console.log(`Parsed ${phrases.length} phrases`);

    return NextResponse.json({ phrases });
  } catch (error) {
    console.error("Error fetching transcript:", error);

    // Fallback for MVP demo video (error case)
    if (videoId === "dQw4w9WgXcQ") {
      console.log("Using mock fallback for dQw4w9WgXcQ (error case)");
      const mockPhrases = [
        { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
        {
          id: 1,
          startSec: 2,
          endSec: 4.5,
          text: "You know the rules and so do I",
        },
      ];
      return NextResponse.json({ phrases: mockPhrases });
    }

    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
