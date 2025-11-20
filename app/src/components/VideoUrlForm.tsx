'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

function extractVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const rawMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (rawMatch) return rawMatch[0];

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[0] || null;
    }

    if (host.endsWith('youtube.com')) {
      if (url.searchParams.has('v')) return url.searchParams.get('v');

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments[0] === 'embed' || segments[0] === 'shorts') {
        return segments[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function VideoUrlForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sampleVideoId = 'dQw4w9WgXcQ';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const videoId = extractVideoId(value);
    if (!videoId) {
      setError('Provide a valid YouTube URL or ID.');
      return;
    }

    setIsSubmitting(true);
    router.push(`/watch/${videoId}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
    >
      <label htmlFor="video-url" className="text-xs uppercase tracking-[0.3em] text-white/60">
        Paste YouTube URL
      </label>
      <input
        id="video-url"
        type="text"
        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        className="w-full rounded-xl border-0 bg-white/10 p-4 text-base text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-blue-400"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-200">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-white px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-blue-100 disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubmitting ? 'Loading…' : 'Start Session'}
      </button>
      <button
        type="button"
        className="text-xs uppercase tracking-[0.4em] text-white/60 underline decoration-dotted underline-offset-4"
        onClick={() => router.push(`/watch/${sampleVideoId}`)}
      >
        Try sample video
      </button>
    </form>
  );
}
