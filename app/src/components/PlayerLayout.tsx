"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Ear,
  Eye,
  EyeOff,
  Film,
  History,
  Headphones,
  Link2,
  Pause,
  Repeat2,
  Settings2,
  Waves,
  X,
} from "lucide-react";
import { useDictionaryLookup } from "@/hooks/useDictionaryLookup";
import { usePlayerKeyboardControls } from "@/hooks/usePlayerKeyboardControls";
import { usePlayerStore } from "@/store/playerStore";
import { YouTubePlayer } from "./YouTubePlayer";

type MediaDisplay = "waveform" | "video";
type RecentVideo = {
  videoId: string;
  url: string;
  watchedAt: number;
};

const phraseSamples = Array.from({ length: 26 }, (_, index) => index);
const recentVideosStorageKey = "audiofilms.recentVideos";

function extractVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const rawMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (rawMatch) return rawMatch[0];

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace("www.", "");

    if (host === "youtu.be") {
      const segments = url.pathname.split("/").filter(Boolean);
      return segments[0] || null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.searchParams.has("v")) return url.searchParams.get("v");

      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] === "embed" || segments[0] === "shorts") {
        return segments[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function cleanLookupWord(part: string) {
  return part.replace(/[^a-zA-ZÀ-ž'-]/g, "").toLowerCase();
}

function WaveformBars({ progress, active }: { progress: number; active: boolean }) {
  return (
    <div className="flex h-20 w-full items-center gap-1.5">
      {phraseSamples.map((item) => {
        const isPastProgress = item / phraseSamples.length <= Math.max(progress, 0.08);
        const height = 18 + ((item * 17) % 42);

        return (
          <span
            key={item}
            className={`min-w-0 flex-1 rounded-full ${
              isPastProgress ? "bg-amber-300/75" : "bg-stone-500/25"
            } ${active ? "animate-[wave-pulse_1.1s_ease-in-out_infinite]" : ""}`}
            style={{
              height,
              animationDelay: `${item * 36}ms`,
              transformOrigin: "50% 50%",
            }}
          />
        );
      })}
    </div>
  );
}

export function PlayerLayout() {
  const router = useRouter();
  const {
    videoId,
    phrases,
    currentIndex,
    mode,
    stopPhrasePlayback,
    replayPhrase,
    nextPhrase,
    prevPhrase,
    isPlayingPhrase,
    setMode,
    subtitleLanguage,
  } = usePlayerStore();
  const {
    status: dictionaryStatus,
    selectedWord,
    definitions,
    error: dictionaryError,
    translateUrl,
    warning: dictionaryWarning,
    provider: dictionaryProvider,
    recoverable: dictionaryRecoverable,
    lookup,
    reset: resetDictionaryLookup,
  } = useDictionaryLookup();
  const [mediaDisplay, setMediaDisplay] = useState<MediaDisplay>("waveform");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(recentVideosStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as RecentVideo[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => typeof item?.videoId === "string" && item.videoId.length > 0)
        .slice(0, 10);
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  const current = phrases[currentIndex];
  const previousPhrase = currentIndex > 0 ? phrases[currentIndex - 1] : null;
  const previousPreviousPhrase = currentIndex > 1 ? phrases[currentIndex - 2] : null;
  const nextPhraseText = currentIndex < phrases.length - 1 ? phrases[currentIndex + 1] : null;
  const nextNextPhrase = currentIndex < phrases.length - 2 ? phrases[currentIndex + 2] : null;
  const isReadMode = mode === "read";
  const phraseDuration = current ? current.endSec - current.startSec : 0;

  usePlayerKeyboardControls({
    isPlayingPhrase,
    replayPhrase,
    stopPhrasePlayback,
    nextPhrase,
    prevPhrase,
    setMode,
  });

  useEffect(() => {
    resetDictionaryLookup();
  }, [currentIndex, resetDictionaryLookup]);

  useEffect(() => {
    if (!videoId) return;

    queueMicrotask(() => {
      setRecentVideos((currentRecent) => {
        const next = [
          {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            watchedAt: Date.now(),
          },
          ...currentRecent.filter((item) => item.videoId !== videoId),
        ].slice(0, 10);

        window.localStorage.setItem(recentVideosStorageKey, JSON.stringify(next));
        return next;
      });
    });
  }, [videoId]);

  const openVideo = useCallback(
    (nextVideoId: string) => {
      setSourceError(null);
      setSourceUrl("");
      setShowHistory(false);
      router.push(`/watch/${nextVideoId}`);
    },
    [router],
  );

  const handleSourceSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextVideoId = extractVideoId(sourceUrl);
      if (!nextVideoId) {
        setSourceError("Paste a valid YouTube URL or video ID.");
        return;
      }

      openVideo(nextVideoId);
    },
    [openVideo, sourceUrl],
  );

  const handleWordClick = useCallback(
    async (word: string) => {
      if (mode !== "read" || !word) return;
      const context = current?.text || "";
      const language = subtitleLanguage || "en";

      console.log(`[PlayerLayout] Looking up word "${word}" in language: ${language}`);
      await lookup({ word, language, context });
    },
    [mode, current, subtitleLanguage, lookup],
  );

  const hiddenPhrase = useMemo(() => {
    if (!current) return null;

    return current.text.split(/\s+/).map((word, index) => (
      <span
        key={`${word}-${index}`}
        className="inline-block h-[0.42em] rounded-full bg-stone-300/20 align-middle"
        style={{ width: `${Math.max(1.6, word.length * 0.58)}ch` }}
      />
    ));
  }, [current]);

  const renderedText = useMemo(() => {
    if (!current) return null;
    if (!isReadMode) {
      return hiddenPhrase;
    }

    const parts = current.text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (/\s+/.test(part)) {
        return (
          <span key={`ws-${index}`} aria-hidden="true">
            {part}
          </span>
        );
      }

      const cleanWord = cleanLookupWord(part);
      if (!cleanWord) {
        return (
          <span key={`plain-${index}`} className="inline-block">
            {part}
          </span>
        );
      }

      const isActive = cleanWord === selectedWord;

      return (
        <button
          type="button"
          key={`word-${index}-${part}`}
          onClick={() => handleWordClick(cleanWord)}
          className={`inline rounded-md px-1.5 transition ${
            isActive
              ? "bg-amber-300/15 text-amber-200 shadow-[inset_0_-2px_0_rgba(245,158,11,0.85)]"
              : "hover:bg-white/10 hover:text-white"
          }`}
        >
          {part}
        </button>
      );
    });
  }, [current, handleWordClick, hiddenPhrase, isReadMode, selectedWord]);

  if (!current) {
    return <div className="text-center text-sm text-zinc-500">Loading phrases...</div>;
  }

  const progress = phrases.length > 1 ? currentIndex / (phrases.length - 1) : 0;
  const modeLabel = isReadMode ? "reading" : "shadowing";

  return (
    <section className="relative min-h-[760px] overflow-hidden bg-[#090a0d] text-stone-100 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_0%,rgba(200,169,106,0.14),transparent_62%)]" />

      <div className="relative flex min-h-[760px] flex-col">
        <header className="flex flex-col gap-3 px-5 py-4 text-xs text-stone-400 md:px-8">
          <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-amber-300/12 font-serif text-lg italic text-amber-200">
              a
            </span>
            <span className="font-medium tracking-normal text-stone-100">AudioFilms</span>
            <span className="hidden opacity-40 sm:inline">·</span>
            <span className="font-mono uppercase tracking-[0.08em] text-amber-300">
              {modeLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] uppercase tracking-[0.08em]">
            <form
              onSubmit={handleSourceSubmit}
              className="hidden w-[360px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5 lg:flex"
            >
              <Link2 className="size-3.5 text-stone-500" aria-hidden="true" />
              <input
                type="text"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setSourceError(null);
                }}
                placeholder="New YouTube link"
                className="min-w-0 flex-1 bg-transparent text-xs normal-case tracking-normal text-stone-200 outline-none placeholder:text-stone-600"
              />
              <button
                type="submit"
                className="rounded-md bg-amber-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-950"
              >
                Load
              </button>
            </form>
            <button
              type="button"
              title="Recent videos"
              onClick={() => setShowHistory((value) => !value)}
              className={`grid size-8 place-items-center rounded-lg border transition ${
                showHistory
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                  : "border-white/10 text-stone-500 hover:text-stone-200"
              }`}
            >
              <History className="size-4" aria-hidden="true" />
            </button>
            <span>{subtitleLanguage ? subtitleLanguage.toUpperCase() : "AUTO"}</span>
            <X className="size-4 opacity-60" aria-hidden="true" />
          </div>
          </div>
          <form
            onSubmit={handleSourceSubmit}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-2 lg:hidden"
          >
            <Link2 className="size-4 text-stone-500" aria-hidden="true" />
            <input
              type="text"
              value={sourceUrl}
              onChange={(event) => {
                setSourceUrl(event.target.value);
                setSourceError(null);
              }}
              placeholder="Paste YouTube link"
              className="min-w-0 flex-1 bg-transparent text-sm text-stone-200 outline-none placeholder:text-stone-600"
            />
            <button
              type="submit"
              className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-stone-950"
            >
              Load
            </button>
          </form>
          {(showHistory || sourceError) && (
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              {sourceError && <p className="mb-3 text-xs text-amber-200">{sourceError}</p>}
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
                  Recent videos
                </span>
                <button
                  type="button"
                  onClick={() => openVideo("iDi5MhglYks")}
                  className="rounded-md border border-amber-300/25 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-amber-200"
                >
                  Dutch test video
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {recentVideos.length > 0 ? (
                  recentVideos.map((item) => (
                    <button
                      type="button"
                      key={item.videoId}
                      onClick={() => openVideo(item.videoId)}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition ${
                        item.videoId === videoId
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                          : "border-white/10 text-stone-400 hover:border-white/20 hover:text-stone-100"
                      }`}
                    >
                      <span className="block uppercase tracking-[0.08em]">
                        {item.videoId === videoId ? "Current" : "Video"}
                      </span>
                      <span className="mt-1 block text-stone-300">{item.videoId}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">No recent videos yet.</p>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="px-4 pt-1 md:px-16">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <div className="relative">
              <div className="absolute right-2 top-2 z-20 inline-flex gap-1 rounded-lg border border-white/10 bg-black/35 p-1 backdrop-blur">
                <button
                  type="button"
                  title="Video"
                  onClick={() => setMediaDisplay("video")}
                  className={`grid size-7 place-items-center rounded-md transition ${
                    mediaDisplay === "video" ? "bg-amber-300/15 text-amber-200" : "text-stone-400"
                  }`}
                >
                  <Film className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Waveform"
                  onClick={() => setMediaDisplay("waveform")}
                  className={`grid size-7 place-items-center rounded-md transition ${
                    mediaDisplay === "waveform"
                      ? "bg-amber-300/15 text-amber-200"
                      : "text-stone-400"
                  }`}
                >
                  <Waves className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div
                className={
                  mediaDisplay === "video"
                    ? `relative h-36 overflow-hidden rounded-xl bg-black md:h-52 ${
                        !isReadMode ? "grayscale" : ""
                      }`
                    : "pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
                }
                aria-hidden={mediaDisplay !== "video"}
              >
                {mediaDisplay === "video" && !isReadMode && (
                  <div className="absolute inset-0 z-10 backdrop-blur-md" />
                )}
                <YouTubePlayer />
              </div>

              {mediaDisplay === "waveform" && (
                <div className="flex h-28 items-center rounded-xl border border-white/5 bg-white/[0.025] px-6">
                  <WaveformBars progress={progress} active={isPlayingPhrase} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 items-center gap-5 px-4 py-7 md:grid-cols-[76px_1fr_76px] md:px-16">
          <nav className="order-2 flex justify-center md:order-none md:justify-start">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] p-2 md:flex-col md:gap-2 md:px-2.5 md:py-4">
              <button
                type="button"
                title="Previous phrase"
                onClick={prevPhrase}
                className="grid size-9 place-items-center rounded-full border border-white/10 text-stone-300 transition hover:border-white/20 hover:text-white"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title={isPlayingPhrase ? "Pause" : "Replay phrase"}
                onClick={isPlayingPhrase ? stopPhrasePlayback : replayPhrase}
                className="grid size-12 place-items-center rounded-full bg-amber-300 text-stone-950 transition hover:bg-amber-200"
              >
                {isPlayingPhrase ? (
                  <Pause className="size-5" aria-hidden="true" />
                ) : (
                  <Repeat2 className="size-5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                title="Next phrase"
                onClick={nextPhrase}
                className="grid size-9 place-items-center rounded-full border border-white/10 text-stone-300 transition hover:border-white/20 hover:text-white"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              <span className="hidden h-px w-7 bg-white/10 md:block" />
              <button
                type="button"
                title={isReadMode ? "Hide text" : "Reveal text"}
                onClick={() => setMode(isReadMode ? "blind" : "read")}
                className={`grid size-9 place-items-center rounded-lg border transition ${
                  isReadMode
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                    : "border-white/10 text-stone-500 hover:text-stone-200"
                }`}
              >
                {isReadMode ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </nav>

          <main className="text-center">
            {isReadMode && (
              <div className="mx-auto mb-5 flex max-w-3xl flex-col gap-2 font-serif leading-tight">
                {previousPreviousPhrase && (
                  <p className="text-lg text-stone-500/35 md:text-2xl">
                    {previousPreviousPhrase.text}
                  </p>
                )}
                {previousPhrase && (
                  <p className="text-xl text-stone-400/55 md:text-3xl">{previousPhrase.text}</p>
                )}
              </div>
            )}

            <div
              className={`mx-auto flex max-w-3xl flex-wrap justify-center gap-x-2.5 gap-y-2.5 font-serif text-[30px] leading-[1.08] text-stone-100 md:text-[46px] ${
                isReadMode ? "" : "min-h-[84px] items-center"
              }`}
            >
              {renderedText}
            </div>

            {isReadMode && (
              <div className="mx-auto mt-5 flex max-w-3xl flex-col gap-2 font-serif leading-tight">
                {nextPhraseText && (
                  <p className="text-xl text-stone-400/55 md:text-3xl">{nextPhraseText.text}</p>
                )}
                {nextNextPhrase && (
                  <p className="text-lg text-stone-500/35 md:text-2xl">{nextNextPhrase.text}</p>
                )}
              </div>
            )}
          </main>

          <aside className="order-3 flex justify-center md:order-none md:justify-end">
            <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.035] p-2 md:flex-col md:px-2.5 md:py-4">
              <span className="hidden px-1 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500 [writing-mode:vertical-rl] md:block">
                Mode
              </span>
              <button
                type="button"
                title="Shadowing"
                onClick={() => setMode("blind")}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  !isReadMode ? "bg-amber-300 text-stone-950" : "text-stone-500 hover:text-stone-200"
                }`}
              >
                <Headphones className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Listening"
                onClick={replayPhrase}
                className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:text-stone-200"
              >
                <Ear className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Reading"
                onClick={() => setMode("read")}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  isReadMode ? "bg-amber-300 text-stone-950" : "text-stone-500 hover:text-stone-200"
                }`}
              >
                <BookOpen className="size-4" aria-hidden="true" />
              </button>
              <span className="hidden h-px w-7 bg-white/10 md:block" />
              <button
                type="button"
                title={mediaDisplay === "video" ? "Show waveform" : "Show video"}
                onClick={() => setMediaDisplay(mediaDisplay === "video" ? "waveform" : "video")}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  mediaDisplay === "video"
                    ? "bg-amber-300 text-stone-950"
                    : "text-stone-500 hover:text-stone-200"
                }`}
              >
                <Film className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Settings"
                className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:text-stone-200"
              >
                <Settings2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </div>

        <footer className="space-y-3 px-4 pb-5 md:px-16">
          <div className="flex gap-1.5 overflow-hidden">
            {phraseSamples.map((item) => {
              const active = item <= Math.round(progress * (phraseSamples.length - 1));
              return (
                <span
                  key={item}
                  className={`h-1.5 min-w-0 flex-1 rounded-full ${
                    active ? "bg-amber-300/80" : "bg-white/10"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
            <span>
              {String(currentIndex + 1).padStart(2, "0")} / {phrases.length}
            </span>
            <span className="text-amber-300">{phraseDuration.toFixed(1)}s</span>
          </div>

          <DictionaryPanel
            currentText={current.text}
            dictionaryError={dictionaryError}
            dictionaryProvider={dictionaryProvider}
            dictionaryRecoverable={dictionaryRecoverable}
            dictionaryStatus={dictionaryStatus}
            dictionaryWarning={dictionaryWarning}
            definitions={definitions}
            isReadMode={isReadMode}
            selectedWord={selectedWord}
            translateUrl={translateUrl}
          />
        </footer>
      </div>
    </section>
  );
}

type DictionaryPanelProps = {
  currentText: string;
  dictionaryError: string | null;
  dictionaryProvider: string | null;
  dictionaryRecoverable: boolean;
  dictionaryStatus: "idle" | "loading" | "ready" | "error";
  dictionaryWarning: string | null;
  definitions: string[];
  isReadMode: boolean;
  selectedWord: string | null;
  translateUrl: string | null;
};

function DictionaryPanel({
  currentText,
  dictionaryError,
  dictionaryProvider,
  dictionaryRecoverable,
  dictionaryStatus,
  dictionaryWarning,
  definitions,
  isReadMode,
  selectedWord,
  translateUrl,
}: DictionaryPanelProps) {
  if (dictionaryStatus === "ready" && selectedWord) {
    return (
      <div className="grid overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] text-left md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-4 md:p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-serif text-2xl text-stone-50">{selectedWord}</span>
            <span className="text-xs italic text-stone-500">definition</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">
              {dictionaryProvider || "dictionary"}
            </span>
          </div>
          {dictionaryWarning && (
            <p className="mt-2 text-xs text-amber-200">{dictionaryWarning}</p>
          )}
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-300 md:grid-cols-2">
            {definitions.slice(0, 4).map((definition, index) => (
              <li key={`def-${index}`}>
                <span className="mr-2 font-mono text-xs text-stone-600">{index + 1}.</span>
                {definition}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-white/10 p-4 text-sm text-stone-400 md:border-l md:border-t-0 md:p-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">
            In context
          </div>
          <p className="border-l-2 border-amber-300/70 pl-3 italic leading-6">
            {currentText}
          </p>
          <div className="mt-4 flex gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
            <span>save</span>
            <span>more</span>
            <span className="ml-auto">close</span>
          </div>
        </div>
      </div>
    );
  }

  const message = (() => {
    if (!isReadMode) return "Reveal text first to look up words";
    if (dictionaryStatus === "loading" && selectedWord) return `Looking up ${selectedWord}...`;
    if (dictionaryStatus === "error") return dictionaryError || "Lookup failed";
    return "Click a word to look it up";
  })();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-stone-400 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone-500">
          Dictionary
        </span>
        <span className="hidden h-4 w-px bg-white/10 md:block" />
        <span>{message}</span>
        {dictionaryStatus === "error" && dictionaryRecoverable && (
          <span className="text-xs text-amber-200">Try another word or retry in a moment.</span>
        )}
        {dictionaryStatus === "error" && translateUrl && (
          <a
            className="text-xs text-amber-200 underline"
            href={translateUrl}
            target="_blank"
            rel="noreferrer"
          >
            Translate
          </a>
        )}
      </div>
    </div>
  );
}
