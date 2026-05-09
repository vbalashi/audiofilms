import { Suspense } from 'react';
import { WatchClient } from './WatchClient';

type Props = {
  params: Promise<{ videoId: string }>;
};

export default async function WatchPage({ params }: Props) {
  const { videoId: rawVideoId } = await params;
  const videoId = decodeURIComponent(rawVideoId);

  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-4 text-white">
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
