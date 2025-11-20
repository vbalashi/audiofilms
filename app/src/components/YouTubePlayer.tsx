'use client';

import { useEffect, useRef } from 'react';
import YouTube, { YouTubePlayer as YTPlayerType } from 'react-youtube';
import { usePlayerStore } from '@/store/playerStore';

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayerType | null>(null);
  const animationRef = useRef<number | null>(null);

  const {
    videoId,
    phrases,
    currentIndex,
    isPlayingPhrase,
    paddingStart,
    paddingEnd,
    stopPhrasePlayback,
  } = usePlayerStore();

  const currentPhrase = phrases[currentIndex];

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !currentPhrase) return;

    if (isPlayingPhrase) {
      const start = Math.max(0, currentPhrase.startSec + paddingStart);
      player.seekTo(start, true);
      player.playVideo();

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
