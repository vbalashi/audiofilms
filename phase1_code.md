Below is the Phase 1 Starter Kit. If you run the create-next-app command and paste these 5 files, you will have a working backend and player loop immediately.

1. The Types

File: src/types/subtitles.ts
Defines the shape of your data.

code
TypeScript
download
content_copy
expand_less
export type Phrase = {
  id: number;
  startSec: number;
  endSec: number;
  text: string;
};
2. The "Brain" (Store)

File: src/store/playerStore.ts
Handles logic so components stay dumb. Note the padding defaults.

code
TypeScript
download
content_copy
expand_less
import { create } from 'zustand';
import type { Phrase } from '@/types/subtitles';

type Mode = 'blind' | 'read';

type PlayerState = {
  videoId: string | null;
  phrases: Phrase[];
  currentIndex: number;
  mode: Mode;
  isPlayingPhrase: boolean;
  
  // Settings
  paddingStart: number; // e.g. -0.2
  paddingEnd: number;   // e.g. +0.2

  // Actions
  setVideoId: (id: string) => void;
  setPhrases: (phrases: Phrase[]) => void;
  setMode: (mode: Mode) => void;
  
  startPhrasePlayback: () => void;
  stopPhrasePlayback: () => void;
  
  nextPhrase: () => void;
  prevPhrase: () => void;
  toggleMode: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  videoId: null,
  phrases: [],
  currentIndex: 0,
  mode: 'blind',
  isPlayingPhrase: false,
  paddingStart: -0.2,
  paddingEnd: 0.2,

  setVideoId: (videoId) => set({ videoId }),
  setPhrases: (phrases) => set({ phrases, currentIndex: 0 }),
  setMode: (mode) => set({ mode }),

  startPhrasePlayback: () => set({ isPlayingPhrase: true }),
  stopPhrasePlayback: () => set({ isPlayingPhrase: false }),

  nextPhrase: () => {
    const { currentIndex, phrases } = get();
    if (currentIndex < phrases.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevPhrase: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  toggleMode: () => {
    const { mode } = get();
    set({ mode: mode === 'blind' ? 'read' : 'blind' });
  }
}));
3. The Backend (Subtitle Fetcher)

File: src/app/api/get-subs/route.ts
Uses youtube-transcript to get real data.

code
TypeScript
download
content_copy
expand_less
import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    // Fetch config: en by default
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });

    if (!transcriptItems || transcriptItems.length === 0) {
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
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
4. The Player Component (The Loop)

File: src/components/YouTubePlayer.tsx
Handles the specific timing logic.

code
TypeScript
download
content_copy
expand_less
'use client';
import { useEffect, useRef } from 'react';
import YouTube, { YouTubePlayer as YTPlayerType } from 'react-youtube';
import { usePlayerStore } from '@/store/playerStore';

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayerType | null>(null);
  const animationRef = useRef<number | null>(null);

  const { 
    videoId, phrases, currentIndex, isPlayingPhrase, 
    paddingStart, paddingEnd, stopPhrasePlayback 
  } = usePlayerStore();

  const currentPhrase = phrases[currentIndex];

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !currentPhrase) return;

    if (isPlayingPhrase) {
      // 1. Seek to start (with padding)
      const start = Math.max(0, currentPhrase.startSec + paddingStart);
      player.seekTo(start, true);
      player.playVideo();

      // 2. Loop to check end time
      const checkTime = () => {
        const now = player.getCurrentTime();
        const end = currentPhrase.endSec + paddingEnd;
        
        if (now >= end) {
          player.pauseVideo();
          stopPhrasePlayback();
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
        } else {
          animationRef.current = requestAnimationFrame(checkTime);
        }
      };
      animationRef.current = requestAnimationFrame(checkTime);
    } else {
      player.pauseVideo();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isPlayingPhrase, currentPhrase, paddingStart, paddingEnd, stopPhrasePlayback]);

  if (!videoId) return null;

  return (
    <YouTube
      videoId={videoId}
      onReady={(e) => (playerRef.current = e.target)}
      opts={{ playerVars: { controls: 0, rel: 0 } }}
      className="h-full w-full"
    />
  );
}
5. The Layout (Blur & Text)

File: src/components/PlayerLayout.tsx
Connects the store to the visuals.

code
TypeScript
download
content_copy
expand_less
'use client';
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { YouTubePlayer } from './YouTubePlayer';

export function PlayerLayout() {
  const { 
    phrases, currentIndex, mode, 
    toggleMode, startPhrasePlayback, stopPhrasePlayback, 
    nextPhrase, prevPhrase, isPlayingPhrase 
  } = usePlayerStore();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) { stopPhrasePlayback(); startPhrasePlayback(); } // Shift+Space = Replay
        else isPlayingPhrase ? stopPhrasePlayback() : startPhrasePlayback(); // Space = Toggle
      }
      if (e.code === 'ArrowRight') nextPhrase();
      if (e.code === 'ArrowLeft') prevPhrase();
      if (e.code === 'ArrowDown') usePlayerStore.getState().setMode('read');
      if (e.code === 'ArrowUp') usePlayerStore.getState().setMode('blind');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPhrase, prevPhrase, isPlayingPhrase, startPhrasePlayback, stopPhrasePlayback]);

  const current = phrases[currentIndex];
  if (!current) return <div>Loading...</div>;

  // Simple Regex mask for Blind Mode
  const displayText = mode === 'blind' 
    ? current.text.replace(/[a-zA-Z0-9]/g, '_') 
    : current.text;

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6">
      {/* Video Area */}
      <div className={`relative aspect-video bg-black rounded-xl overflow-hidden transition-all duration-500 ${mode === 'blind' ? 'blur-xl grayscale opacity-80' : ''}`}>
        <div className="absolute inset-0 z-10 bg-transparent" /> {/* Blocks clicks on video */}
        <YouTubePlayer />
      </div>

      {/* Text Area */}
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-500 uppercase tracking-widest">
          Phrase {currentIndex + 1} / {phrases.length} • {mode} Mode
        </div>
        <div className="text-2xl md:text-4xl font-medium min-h-[80px] leading-relaxed">
          {displayText}
        </div>
        <div className="text-xs text-gray-400">
          Space (Play) • Arrows (Nav) • ↓ (Reveal)
        </div>
      </div>
    </div>
  );
}

