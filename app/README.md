# AudioFilms App

Interactive YouTube listening practice with phrase playback, subtitle retrieval, and inline dictionary lookups.

This is the canonical setup and local development document for the application.

## Runtime Defaults

- Subtitle extractor/default retrieval path: `yt-dlp`
- Subtitle provider fallback: `supadata`
- Dictionary provider default: `openrouter`
- Supported dictionary providers: `2000nl`, `openrouter`, `openai`, `free-dictionary`
- 2000NL is the preferred Dutch lookup authority when user progress or curated dictionary cards are needed.

These defaults are defined in the subtitle/dictionary factories and mirrored in [`env.example`](/Users/khrustal/dev/audiofilms/app/env.example).

## Prerequisites

- Node.js 20+ and npm
- `yt-dlp` for the default local subtitle path
- An OpenRouter API key for the default dictionary path

A Supadata API key is optional. Configure it only if you want the paid API fallback path.

For 2000NL-backed Dutch read lookup, use a 2000NL user access token through the
app environment or send a Bearer token from the extension Connect flow. The env
token is a short-lived dogfood fallback, not a durable product session model,
and must not be used for write routes such as `/api/dict/actions`.
Current `/api/dict` lookup does not request 2000NL user state; state-aware cards
are part of the planned V2 contract.

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment template.

```bash
cp env.example .env.local
```

3. Fill in at least these values in `.env.local`.

```bash
SUBTITLE_PROVIDER=yt-dlp
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=...
```

4. Start the dev server.

```bash
npm run dev
```

5. Validate before or after changes.

```bash
npm run lint
npm run build
```

## Optional Local Fallbacks

If you want the default local subtitle path, use `yt-dlp`:

```bash
SUBTITLE_PROVIDER=yt-dlp
YT_DLP_PATH=/usr/bin/yt-dlp
```

If you intentionally want the paid Supadata path, switch to `supadata` and provide `SUPADATA_API_KEY`.

If you want dictionary lookups without OpenRouter, switch to `free-dictionary`:

```bash
DICTIONARY_PROVIDER=free-dictionary
```

Note: `free-dictionary` is English-only and should be treated as a fallback, not the default learning path.

For 2000NL-backed Dutch lookup and progress-aware cards:

```bash
DICTIONARY_PROVIDER=2000nl
DICTIONARY_2000NL_API_BASE=https://2000.dilum.io/api/platform/v1
DICTIONARY_2000NL_AUDIO_BASE_URL=https://2000.dilum.io # optional, defaults to API origin
DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN=... # guest read-only catalog lookup
```

Use the 2000NL [Dictionary Platform Smoke](/Users/khrustal/dev/2000nl/docs/runbooks/dictionary-platform-smoke.md)
runbook for direct 2000NL and AudioFilms proxy timing checks. AudioFilms
`/api/dict/lookup` and `/api/dict/search` expect `clickedForm` and
`sourceLanguageCode`; the direct 2000NL Platform API expects `query` and
`languageCode`.

The YouTube extension obtains a 2000NL Connect session and forwards its current
Bearer token to the AudioFilms `/api/dict*` backend routes for user-state lookup,
actions, and translation. Do not configure a shared end-user token as production
guest lookup identity; `DICTIONARY_2000NL_ACCESS_TOKEN` is only a local dogfood
fallback when `DICTIONARY_2000NL_LOCAL_DOGFOOD_GUEST_LOOKUP=true` outside
production.

## Current Behavior

- Uses embedded YouTube playback via `react-youtube`
- Fetches subtitles through the configured subtitle extractor/provider path
- Preserves the actual subtitle language returned by the retrieval path
- Supports phrase playback modes; the YouTube extension redesign now uses Shadow/Recall terminology
- Looks up clicked words through the configured dictionary provider
- Returns rich `cards[]` for 2000NL dictionary results while keeping legacy flat definitions for older consumers
- Proxies explicit 2000NL card actions through `/api/dict/actions`
- Proxies per-card 2000NL translation requests through `/api/dict/translation`

## Validation

Run from `/Users/khrustal/dev/audiofilms/app`:

```bash
npm run lint
npm run build
```

For architecture and module ownership, use [ARCHITECTURE.md](/Users/khrustal/dev/audiofilms/ARCHITECTURE.md) instead of extending this file into a boundary document.

## Built With

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [@supadata/js](https://www.npmjs.com/package/@supadata/js)
- [yt-dlp-wrap](https://github.com/foxesdocode/yt-dlp-wrap)
- [react-youtube](https://github.com/tjallingt/react-youtube)
- [Zustand](https://github.com/pmndrs/zustand)

## Remote Dogfood Surface

The backend can be exposed as one public API facade while ASR remains disabled or worker-backed behind it.

Expected public base:

```bash
NEXT_PUBLIC_AUDIOFILMS_API_BASE=https://audiofilms-api.dilum.io
```

Stable tester-facing routes:

```text
GET  /api/health
GET  /api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual
GET  /api/dict?word=voorbeeld&language=nl
POST /api/asr/jobs
GET  /api/asr/jobs/{jobId}
GET  /api/asr/jobs/{jobId}/result
```

`/api/local-asr-practice` is now a private compatibility endpoint. It is enabled by default only for non-production localhost requests. Set `LOCAL_ASR_PRACTICE_ENABLED=true` only for private dogfood; external tester builds should use `/api/asr/jobs`.

For 1-4 remote testers, keep ASR disabled until a worker and tester token are configured:

```bash
ASR_MODE=disabled
LOCAL_ASR_PRACTICE_ENABLED=false
```

To enable the first file-backed worker mode on one host:

```bash
ASR_MODE=file-queue
ASR_AUTH_REQUIRED=true
ASR_TESTER_TOKENS=<random-long-token>
ASR_QUEUE_DIR=/data/audiofilms/asr-jobs
ASR_ARTIFACT_STORE=file:///data/audiofilms/asr-artifacts
ASR_MAX_DURATION_SEC=900
ASR_MAX_ACTIVE_JOBS=4
```

Run the worker separately:

```bash
npm run asr:worker
```

The Docker/Compose runbook is in [`../docs/runbooks/audiofilms-backend-deployment.md`](../docs/runbooks/audiofilms-backend-deployment.md).
