"use client";

import { useEffect } from "react";

type UsePlayerKeyboardControlsParams = {
  isPlayingPhrase: boolean;
  replayPhrase: () => void;
  stopPhrasePlayback: () => void;
  nextPhrase: () => void;
  prevPhrase: () => void;
  setMode: (mode: "blind" | "read") => void;
};

export function usePlayerKeyboardControls({
  isPlayingPhrase,
  replayPhrase,
  stopPhrasePlayback,
  nextPhrase,
  prevPhrase,
  setMode,
}: UsePlayerKeyboardControlsParams) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();

        if (event.shiftKey) {
          replayPhrase();
          return;
        }

        if (isPlayingPhrase) {
          stopPhrasePlayback();
        } else {
          replayPhrase();
        }

        return;
      }

      if (event.code === "ArrowRight") {
        nextPhrase();
        return;
      }

      if (event.code === "ArrowLeft") {
        prevPhrase();
        return;
      }

      if (event.code === "ArrowDown") {
        setMode("read");
        return;
      }

      if (event.code === "ArrowUp") {
        setMode("blind");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    isPlayingPhrase,
    nextPhrase,
    prevPhrase,
    replayPhrase,
    setMode,
    stopPhrasePlayback,
  ]);
}
