'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { YouTubePlayer } from './YouTubePlayer';

type DictionaryStatus = 'idle' | 'loading' | 'ready' | 'error';

type DictionaryEntry = {
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition?: string }[];
  }[];
};

export function PlayerLayout() {
  const {
    phrases,
    currentIndex,
    mode,
    startPhrasePlayback,
    stopPhrasePlayback,
    nextPhrase,
    prevPhrase,
    isPlayingPhrase,
    setMode,
  } = usePlayerStore();

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState<string[]>([]);
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>('idle');
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [translateUrl, setTranslateUrl] = useState<string | null>(null);

  const current = phrases[currentIndex];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) {
          stopPhrasePlayback();
          startPhrasePlayback();
        } else if (isPlayingPhrase) {
          stopPhrasePlayback();
        } else {
          startPhrasePlayback();
        }
      }
      if (e.code === 'ArrowRight') nextPhrase();
      if (e.code === 'ArrowLeft') prevPhrase();
      if (e.code === 'ArrowDown') setMode('read');
      if (e.code === 'ArrowUp') setMode('blind');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPhrase, prevPhrase, isPlayingPhrase, startPhrasePlayback, stopPhrasePlayback, setMode]);

  const handleWordClick = useCallback(
    async (word: string) => {
      if (mode !== 'read' || !word) return;
      setSelectedWord(word);
      setDictionaryStatus('loading');
      setDictionaryError(null);
      setTranslateUrl(null);
      setDefinitions([]);

      try {
        const response = await fetch(`/api/dict?word=${encodeURIComponent(word)}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (payload.translateUrl) {
            setTranslateUrl(payload.translateUrl);
          }
          throw new Error(
            typeof payload.error === 'string' && payload.error.length > 0
              ? payload.error
              : 'Lookup failed',
          );
        }

        const entries = Array.isArray(payload.result)
          ? (payload.result as DictionaryEntry[])
          : [];
        const collected = entries.flatMap((entry) =>
          Array.isArray(entry.meanings)
            ? entry.meanings.flatMap((meaning) =>
                Array.isArray(meaning.definitions)
                  ? meaning.definitions.map((def) => {
                      const part = meaning.partOfSpeech
                        ? `(${meaning.partOfSpeech}) `
                        : '';
                      return `${part}${def.definition ?? ''}`.trim();
                    })
                  : [],
              )
            : [],
        );

        setDefinitions(collected.filter(Boolean));
        setDictionaryStatus('ready');
      } catch (error) {
        console.error(error);
        setDictionaryError(
          error instanceof Error ? error.message : 'Unable to fetch definition right now.',
        );
        setDictionaryStatus('error');
      }
    },
    [mode],
  );

  const maskedText = useMemo(() => {
    if (!current) return '';
    return current.text.replace(/[a-zA-Z0-9]/g, '_');
  }, [current]);

  const renderedText = useMemo(() => {
    if (!current) return null;
    if (mode === 'blind') {
      return <span>{maskedText}</span>;
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

      const cleanWord = part.replace(/[^a-zA-Z']/g, '');
      if (!cleanWord) {
        return (
          <span key={`plain-${index}`} className="inline-block">
            {part}
          </span>
        );
      }

      const normalized = cleanWord.toLowerCase();
      const isActive = normalized === selectedWord;

      return (
        <button
          type="button"
          key={`word-${index}-${part}`}
          onClick={() => handleWordClick(normalized)}
          className={`inline-flex items-center rounded px-1 transition ${
            isActive ? 'bg-white text-black' : 'hover:bg-white/10'
          }`}
        >
          {part}
        </button>
      );
    });
  }, [current, mode, maskedText, selectedWord, handleWordClick]);

  if (!current) {
    return <div className="text-center text-sm text-zinc-500">Loading phrases…</div>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4">
      <div
        className={`relative aspect-video overflow-hidden rounded-xl bg-black transition-all duration-500 ${
          mode === 'blind' ? 'blur-xl grayscale opacity-80' : ''
        }`}
      >
        <div className="absolute inset-0 z-10 bg-transparent" />
        <YouTubePlayer />
      </div>

      <div className="space-y-4 text-center">
        <div className="text-sm uppercase tracking-widest text-gray-400">
          Phrase {currentIndex + 1} / {phrases.length} • {mode} Mode
        </div>
        <div className="min-h-[80px] text-2xl font-medium leading-relaxed md:text-4xl">
          {renderedText}
        </div>
        <p className="text-xs text-gray-400">Space (Play) • Arrows (Nav) • ↓ (Reveal)</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-white/80">
        {mode !== 'read' && <p>Reveal text (↓) to enable word lookups.</p>}
        {mode === 'read' && dictionaryStatus === 'idle' && (
          <p>Click any word to fetch its meaning.</p>
        )}
        {mode === 'read' && dictionaryStatus === 'loading' && selectedWord && (
          <p>
            Looking up <strong>{selectedWord}</strong>…
          </p>
        )}
        {mode === 'read' && dictionaryStatus === 'error' && (
          <div className="space-y-2">
            <p>
              Couldn&apos;t fetch definition: <strong>{dictionaryError}</strong>
            </p>
            {translateUrl && (
              <a
                className="inline-flex items-center gap-1 text-blue-200 underline"
                href={translateUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Translate
              </a>
            )}
          </div>
        )}
        {mode === 'read' && dictionaryStatus === 'ready' && selectedWord && (
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">{selectedWord}</p>
            {definitions.length > 0 ? (
              <ul className="space-y-1">
                {definitions.slice(0, 4).map((definition, index) => (
                  <li key={`def-${index}`} className="text-white/80">
                    {definition}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No definitions returned. Try another word.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
