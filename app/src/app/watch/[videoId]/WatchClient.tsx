'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlayerLayout } from '@/components/PlayerLayout';
import { usePlayerStore } from '@/store/playerStore';
import type { Phrase } from '@/types/subtitles';

type Props = {
  videoId: string;
};

export function WatchClient({ videoId }: Props) {
  // Select each field separately so Zustand returns stable references.
  // This avoids React 19's getServerSnapshot caching warnings and
  // prevents effects from re-running on every render.
  const setVideoId = usePlayerStore((state) => state.setVideoId);
  const setPhrases = usePlayerStore((state) => state.setPhrases);
  const phrases = usePlayerStore((state) => state.phrases);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    let active = true;

    setVideoId(videoId);
    setStatus('loading');
    setErrorMessage(null);

    const fetchPhrases = async () => {
      try {
        // Fetch subtitles with selected language
        const langParam = selectedLanguage !== 'auto' ? `&lang=${selectedLanguage}` : '';
        const response = await fetch(
          `/api/get-subs?videoId=${encodeURIComponent(videoId)}${langParam}`,
          { cache: 'no-store' }
        );

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof payload?.error === 'string' && payload.error.length > 0
              ? payload.error
              : 'Failed to fetch subtitles';

          // Treat "No subtitles found" as a non-fatal, expected case:
          // we just show the friendly empty-state UI.
          if (response.status === 404 && message === 'No subtitles found') {
            if (!active) return;
            setPhrases([]);
            setStatus('ready');
            return;
          }

          throw new Error(message);
        }

        const data = payload as { phrases: Phrase[] };
        if (!Array.isArray(data?.phrases)) {
          throw new Error('Could not parse subtitles');
        }

        if (!active) return;
        setPhrases(data.phrases);
        setStatus('ready');
      } catch (error) {
        if (!active) return;
        // Log as a warning so Next dev overlay doesn't treat it as a hard error.
        console.warn(error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Something went wrong fetching subtitles.',
        );
        setStatus('error');
      }
    };

    fetchPhrases();

    return () => {
      active = false;
    };
  }, [videoId, selectedLanguage, setVideoId, setPhrases]);

  // Fetch available languages when video loads
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch(`/api/video-info?videoId=${encodeURIComponent(videoId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.availableLanguages && data.availableLanguages.length > 0) {
            setAvailableLanguages(data.availableLanguages);
          }
        }
      } catch (error) {
        console.warn('Could not fetch available languages:', error);
      }
    };

    fetchLanguages();
  }, [videoId]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-10">
      <header className="space-y-2 text-center text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Audio Films</p>
        <h1 className="text-3xl font-semibold">Active Listening Session</h1>
        <p className="text-sm text-white/70">
          Loop one phrase at a time, reveal text when you&apos;re ready, and keep your ears sharp.
        </p>
      </header>

      {status === 'loading' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
          Fetching captions for <span className="font-semibold text-white">{videoId}</span>…
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-sm text-red-200">
          <p>{errorMessage}</p>
          <p className="text-xs text-red-100/80">
            Double-check the URL or{' '}
            <Link className="underline" href="/watch/dQw4w9WgXcQ">
              try our sample video
            </Link>
            .
          </p>
          {availableLanguages.length > 0 && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="text-xs text-white/80 underline hover:text-white"
              >
                {showLanguageSelector ? 'Hide language options' : 'Try a different language?'}
              </button>
              {showLanguageSelector && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setSelectedLanguage('auto')}
                    className={`rounded-lg px-3 py-1 text-xs ${
                      selectedLanguage === 'auto'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Auto
                  </button>
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`rounded-lg px-3 py-1 text-xs ${
                        selectedLanguage === lang
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'ready' && phrases.length === 0 && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-center text-sm text-yellow-100">
          No readable captions were returned for this video. Try a different one or{' '}
          <Link className="text-white underline" href="/watch/dQw4w9WgXcQ">
            load the sample session
          </Link>
          .
        </div>
      )}

      {status === 'ready' && phrases.length > 0 && <PlayerLayout />}
    </div>
  );
}
