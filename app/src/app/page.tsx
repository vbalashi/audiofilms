import { VideoUrlForm } from '@/components/VideoUrlForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-16 text-white">
      <section className="flex w-full max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Audio Films</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Train your listening with blind phrases from any YouTube video.
          </h1>
          <p className="text-lg text-white/70">
            Paste a link, fetch the English captions, and loop phrase-by-phrase. Reveal the text
            only when you are ready to check your understanding.
          </p>
        </div>
        <VideoUrlForm />
        <ul className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 md:grid-cols-3">
          <li>Space — Play/Pause</li>
          <li>Shift + Space — Replay phrase</li>
          <li>Arrows — Navigate / Reveal</li>
        </ul>
      </section>
    </main>
  );
}
