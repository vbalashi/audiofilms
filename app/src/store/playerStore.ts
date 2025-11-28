import { create } from "zustand";
import type { Phrase } from "@/types/subtitles";

type Mode = "blind" | "read";

type PlayerState = {
  videoId: string | null;
  phrases: Phrase[];
  currentIndex: number;
  mode: Mode;
  isPlayingPhrase: boolean;

  paddingStart: number;
  paddingEnd: number;

  setVideoId: (id: string) => void;
  setPhrases: (phrases: Phrase[]) => void;
  setMode: (mode: Mode) => void;
  startPhrasePlayback: () => void;
  stopPhrasePlayback: () => void;
  replayPhrase: () => void;
  nextPhrase: () => void;
  prevPhrase: () => void;
  toggleMode: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  videoId: null,
  phrases: [],
  currentIndex: 0,
  mode: "blind",
  isPlayingPhrase: false,
  paddingStart: -0.2,
  paddingEnd: 0.2,

  setVideoId: (videoId) => set({ videoId }),
  setPhrases: (phrases) => set({ phrases, currentIndex: 0 }),
  setMode: (mode) => set({ mode }),

  startPhrasePlayback: () => set({ isPlayingPhrase: true }),
  stopPhrasePlayback: () => set({ isPlayingPhrase: false }),

  replayPhrase: () => {
    set({ isPlayingPhrase: false });
    // Use setTimeout to ensure the state change is processed in a separate render cycle
    setTimeout(() => {
      set({ isPlayingPhrase: true });
    }, 0);
  },

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
    set({ mode: mode === "blind" ? "read" : "blind" });
  },
}));
