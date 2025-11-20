import { Suspense } from 'react';
import { WatchClient } from './WatchClient';

type Props = {
  params: Promise<{ videoId: string }>;
};

export default async function WatchPage({ params }: Props) {
  const { videoId: rawVideoId } = await params;
  const videoId = decodeURIComponent(rawVideoId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 text-white">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white/70">
            Preparing player…
          </div>
        }
      >
        <WatchClient videoId={videoId} />
      </Suspense>
    </main>
  );
}
