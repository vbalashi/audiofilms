import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  console.log('Fetching subs for:', videoId);

  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    // Fetch config: try without lang first
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('Transcript items count:', transcriptItems?.length);

    if (!transcriptItems || transcriptItems.length === 0) {
      console.log('No transcript items found');

      // Fallback for MVP demo video if blocked
      if (videoId === 'dQw4w9WgXcQ') {
        console.log('Using mock fallback for dQw4w9WgXcQ (empty result)');
        const mockPhrases = [
          { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
          { id: 1, startSec: 2, endSec: 4.5, text: "You know the rules and so do I" },
          { id: 2, startSec: 4.5, endSec: 8, text: "A full commitment's what I'm thinking of" },
          { id: 3, startSec: 8, endSec: 10, text: "You wouldn't get this from any other guy" },
          { id: 4, startSec: 10, endSec: 13, text: "I just wanna tell you how I'm feeling" },
          { id: 5, startSec: 13, endSec: 15, text: "Gotta make you understand" },
          { id: 6, startSec: 15, endSec: 17, text: "Never gonna give you up" },
          { id: 7, startSec: 17, endSec: 19, text: "Never gonna let you down" },
          { id: 8, startSec: 19, endSec: 23, text: "Never gonna run around and desert you" },
          { id: 9, startSec: 23, endSec: 25, text: "Never gonna make you cry" },
          { id: 10, startSec: 25, endSec: 27, text: "Never gonna say goodbye" },
          { id: 11, startSec: 27, endSec: 31, text: "Never gonna tell a lie and hurt you" }
        ];
        return NextResponse.json({ phrases: mockPhrases });
      }

      return NextResponse.json({ error: 'No subtitles found' }, { status: 404 });
    }

    // Convert to our Phrase format
    const phrases = transcriptItems.map((item, index) => ({
      id: index,
      startSec: item.offset / 1000,
      endSec: (item.offset + item.duration) / 1000,
      text: item.text,
    }));

    return NextResponse.json({ phrases });
  } catch (error) {
    console.error('Error fetching transcript:', error);

    // Fallback for MVP demo video if blocked (error case)
    if (videoId === 'dQw4w9WgXcQ') {
      console.log('Using mock fallback for dQw4w9WgXcQ (error case)');
      const mockPhrases = [
        { id: 0, startSec: 0, endSec: 2, text: "We're no strangers to love" },
        { id: 1, startSec: 2, endSec: 4.5, text: "You know the rules and so do I" },
        { id: 2, startSec: 4.5, endSec: 8, text: "A full commitment's what I'm thinking of" },
        { id: 3, startSec: 8, endSec: 10, text: "You wouldn't get this from any other guy" },
        { id: 4, startSec: 10, endSec: 13, text: "I just wanna tell you how I'm feeling" },
        { id: 5, startSec: 13, endSec: 15, text: "Gotta make you understand" },
        { id: 6, startSec: 15, endSec: 17, text: "Never gonna give you up" },
        { id: 7, startSec: 17, endSec: 19, text: "Never gonna let you down" },
        { id: 8, startSec: 19, endSec: 23, text: "Never gonna run around and desert you" },
        { id: 9, startSec: 23, endSec: 25, text: "Never gonna make you cry" },
        { id: 10, startSec: 25, endSec: 27, text: "Never gonna say goodbye" },
        { id: 11, startSec: 27, endSec: 31, text: "Never gonna tell a lie and hurt you" }
      ];
      return NextResponse.json({ phrases: mockPhrases });
    }

    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
