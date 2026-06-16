# AudioFilms App

Interactive YouTube listening practice with phrase playback, subtitle retrieval, and inline dictionary lookups.

This is the canonical setup and local development document for the application.

## Runtime Defaults

- Subtitle provider default: `yt-dlp`
- Subtitle fallback provider: `supadata`
- Dictionary provider default: `openrouter`
- Supported dictionary providers: `2000nl`, `openrouter`, `openai`, `free-dictionary`
- 2000NL is the preferred Dutch lookup authority when user progress or curated dictionary cards are needed.

These defaults are defined in the provider factories and mirrored in [`env.example`](/Users/khrustal/dev/audiofilms/app/env.example).

## Prerequisites

- Node.js 20+ and npm
- `yt-dlp` for the default local subtitle path
- An OpenRouter API key for the default dictionary path

A Supadata API key is optional. Configure it only if you want the paid API fallback path.

For 2000NL-backed Dutch lookup, use a 2000NL user access token through the app environment or send a Bearer token from the extension Connect flow. The env token is a short-lived dogfood fallback, not a durable product session model.

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
DICTIONARY_2000NL_ACCESS_TOKEN=...
DICTIONARY_2000NL_INCLUDE_USER_STATE=true
```

The YouTube extension can also obtain a 2000NL Connect session and forward its current Bearer token to the AudioFilms `/api/dict*` backend routes.

## Current Behavior

- Uses embedded YouTube playback via `react-youtube`
- Fetches subtitles through the configured provider
- Preserves the actual subtitle language returned by the provider
- Supports blind/read playback modes
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
