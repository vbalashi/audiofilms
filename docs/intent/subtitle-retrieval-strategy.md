# Subtitle Retrieval Strategy Notes

Status: working note, May 9, 2026.

## Why This Exists

AudioFilms depends on phrase timing quality. For shadowing, a transcript that is textually correct but poorly aligned can be worse than no transcript because the user practices against the wrong audio window.

The app currently has two subtitle providers in code:

- `supadata`: primary API provider, configured by `SUPADATA_API_KEY`.
- `yt-dlp`: local fallback provider, configured by `YT_DLP_PATH`.

There are no other subtitle providers currently implemented. Other provider references in the repo are mostly dictionary providers.

## Observations From Current Testing

Test video:

- `https://www.youtube.com/watch?v=KrdVIUmBoE4`
- Title from YouTube oEmbed: `Is dit het meest politieke WK ooit?`

YouTube page metadata exposed two Dutch caption tracks:

- `Nederlands`
- `Nederlands (automatisch gegenereerd)`

This suggests a useful distinction for product behavior: manual/editorial captions can exist even when auto captions also exist. Manual captions should usually be preferred as the text source because they are often edited and more accurate than ASR output.

However, Supadata returned:

```text
Forbidden: This video is not available in your region due to geographical restrictions.
```

So an API provider can fail even when the browser-visible YouTube page shows caption tracks. This is probably due to the provider's fetch region, YouTube client identity, or access path, not necessarily because captions are absent.

Local `yt-dlp` testing also saw the tracks/formats but could not reliably download them without additional YouTube access machinery:

- subtitle listing warned that Dutch subtitles were missing because no PO token was provided,
- video download exposed only limited formats and failed with HTTP 403,
- browser cookie extraction from Chrome stalled on local keychain access and was not pursued further.

## Official YouTube API Boundary

The official YouTube Data API has a `captions.download` endpoint, but it is not a general-purpose way to download captions from arbitrary public videos.

As of the current official docs, `captions.download` requires OAuth scopes and the user must have permission to edit the video. The docs also list `403 forbidden` when the request permissions are not sufficient to download the caption track.

Implication: a normal API key or an OAuth token for our app does not give us a clean official route to download captions for videos we do not own or manage. Content-owner/partner flows are different and not part of this app's current assumptions.

## Current Product Conclusion

Do not assume "caption track exists on YouTube" means "our server can fetch it."

Treat subtitle retrieval as a quality- and availability-ranked pipeline:

1. Prefer manual/editorial captions when a provider can retrieve them.
2. Use auto captions only when their timing structure is usable.
3. Detect rolling/overlapping auto-caption chunks and mark them as degraded.
4. Consider local or worker-based ASR only for missing or degraded auto captions, not as a blanket replacement for good manual captions.
5. If audio download is blocked by YouTube access controls, do not pretend ASR fallback is available for that video.

## Third-Party Provider Candidates

The local comparison PDF in `/Users/khrustal/Downloads/Сравнение API-сервисов для получения субтитров с видео.pdf` is useful for provider discovery. It confirms that several services position themselves specifically around retrieving existing YouTube transcripts/captions, including manual/editorial and auto-generated tracks when available.

Candidates worth testing before building a larger ASR fallback:

| Provider | Why It Matters | Free/Test Path | Notes |
| --- | --- | --- | --- |
| Supadata | Already integrated; supports manual, auto, and `generate` mode. | 100 free requests advertised. | Failed on `KrdVIUmBoE4` with geo `Forbidden`; still useful as primary path. |
| SerpApi YouTube Transcript Engine | Mature API company; structured transcript endpoint; free tier useful for experiments. | 250 free searches/month advertised. | Good next candidate for provider shootout. Supports `language_code`; docs mention cached searches are free. |
| YouTube-Transcript.io | Transcript-specific product; API accepts batches up to 50 video IDs. | Free plan advertised, but API access may require paid Plus. | Need verify current free API access before implementation. |
| EasySubAPI | Cheap RapidAPI option for subtitle extraction. | 20 free requests/month advertised. | Could be a low-cost fallback if output quality is acceptable. |
| ScrapingDog YouTube Transcripts API | Scraping-oriented provider that may handle YouTube access churn better than local `yt-dlp`. | 1,000 free credits advertised, roughly 200 YouTube transcript requests in current pricing copy. | More scraping/compliance due diligence needed. |
| SocialKit | Multi-platform transcript/social data API. | 20 free credits advertised. | Candidate if multi-platform support becomes useful. |
| ScrapeCreators | Simple transcript endpoint with `startMs`/`endMs`. | Credit-based trial advertised in comparison notes. | Candidate for quick integration test. |
| TranscriptAPI | Transcript-focused provider advertising 100 free credits and cache-hit behavior. | 100 free credits advertised. | Newer candidate; worth testing alongside SerpApi. |

### SerpApi Integration Notes

Docs checked on May 9, 2026:

- Transcript docs: https://serpapi.com/youtube-video-transcript
- Pricing docs: https://serpapi.com/pricing

Endpoint:

```text
GET https://serpapi.com/search.json?engine=youtube_video_transcript&v=VIDEO_ID&language_code=LANG&api_key=SERPAPI_API_KEY
```

Useful parameters:

- `engine=youtube_video_transcript` is required.
- `v` is the YouTube video id.
- `language_code` selects a requested caption language, for example `nl`.
- `type=asr` selects the auto-generated transcript when available.
- `title` can select a specific transcript by title when several non-ASR tracks exist.
- `no_cache=false` is the default; SerpApi docs say cache hits are free for identical queries while the cache is valid.

Response shape:

- `transcript[]` with `start_ms`, `end_ms`, `snippet`, and `start_time_text`.
- `available_transcripts[]` with `language_name`, `language_code`, optional `title`, optional `type`, `selected`, and a `serpapi_link`.
- `chapters[]` when available.
- `search_metadata.status` and `error` for failed searches.

Current local attempt:

```bash
curl 'https://serpapi.com/search.json?engine=youtube_video_transcript&v=KrdVIUmBoE4&language_code=nl'
```

Result without a key:

```json
{
  "error": "Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key"
}
```

No `SERPAPI_API_KEY` is currently configured in repo env files. To continue the provider shootout, create a free SerpApi key and run the same query with `api_key=...`.

Follow-up with a temporary test key:

- `KrdVIUmBoE4` with `language_code=nl`: `Success` status, but error text `YouTube Video Transcript hasn't returned any results for this query.`
- `KrdVIUmBoE4` with `language_code=nl&type=asr`: same empty result.
- `KrdVIUmBoE4` without language: defaults to `language_code=en` and also returns empty.
- SerpApi's docs example video returned data, confirming the key and endpoint work.
- Existing NOS fixture videos returned Dutch transcript chunks:
  - `iDi5MhglYks`: 77 chunks.
  - `iPz-xvTwHDY`: 61 chunks.
  - `lV9GJFnM5NE`: 61 chunks.

Important shape caveat: for the NOS videos, SerpApi returned `start_ms`, `snippet`, `start_time_text`, and `start_time_label`, but no `end_ms`. If implemented, the app should infer each chunk's `endSec` from the next chunk's `start_ms`, with a small fallback duration for the final chunk.

Quality observation: for `iDi5MhglYks`, Supadata cached 213 overlapping rolling-caption chunks, while SerpApi returned 77 larger sentence-like chunks. This suggests SerpApi can be a useful fallback or even a preferred provider for some videos, but it is not a universal solution because it still failed on the geoblocked/manual-caption test video.

Provider shootout should test the same small fixture set across all candidates:

1. `KrdVIUmBoE4`: browser-visible Dutch manual and auto tracks; Supadata/yt-dlp failed from current environment.
2. Existing NOS videos from `.subtitle-cache/`.
3. A video known to have high-quality manual captions.
4. A video with only auto captions.
5. A video with no captions.

Score each provider on:

- whether it returns manual/editorial vs auto captions,
- language metadata and language selection behavior,
- phrase timing quality and overlap rate,
- response shape and ease of normalization,
- latency,
- free-tier availability,
- cost after free tier,
- failure mode clarity for geo/private/blocked videos.

## ASR Notes

Local ASR smoke test:

- `faster-whisper` installed successfully in a temporary local environment.
- `large-v3-turbo` produced better Dutch text than a smaller model on a short sample and returned word timestamps.
- Word timestamps were usable but not perfect; very short words can have odd or zero-length timings.

Parakeet remains interesting for word-level ASR, but the NeMo-based local path is not a low-friction MVP on this Mac/Python setup. It should be evaluated as a separate Linux/GPU worker or hosted service rather than folded directly into the Next.js app runtime.

## Open Decisions

- Whether to add explicit `sourceType` metadata: `manual`, `auto`, `generated-asr`.
- Whether to add quality flags such as `overlapRate`, `rollingCaptions`, `longCueRate`, and `wordTimestampAvailable`.
- Whether to expose degraded subtitle state in the UI before playback starts.
- Whether to pursue a compliant third-party transcript provider that handles YouTube access and licensing on its side.
- Whether to build an ASR worker for cases where audio can be retrieved through an allowed path.

## References

- YouTube Data API `captions.download`: https://developers.google.com/youtube/v3/docs/captions/download
- Subtitle provider code: `app/src/lib/providers/`
- Subtitle service orchestration: `app/src/lib/subtitleService.ts`
