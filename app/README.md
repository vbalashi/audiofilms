# AudioFilms App

Interactive YouTube listening practice with phrase playback, subtitle retrieval, and inline dictionary lookups.

This is the canonical setup and local development document for the application.

## Runtime Defaults

- Subtitle provider default: `supadata`
- Subtitle fallback provider: `yt-dlp`
- Dictionary provider default: `openrouter`
- Dictionary fallback provider: `free-dictionary`

These defaults are defined in the provider factories and mirrored in [`env.example`](/home/khrustal/dev/audiofilms/app/env.example).

## Prerequisites

- Node.js 20+ and npm
- A Supadata API key for the default subtitle path
- An OpenRouter API key for the default dictionary path

`yt-dlp` is optional. Install it only if you want to run the subtitle fallback provider locally.

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
SUBTITLE_PROVIDER=supadata
SUPADATA_API_KEY=...
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

If you want subtitles without Supadata, switch to `yt-dlp`:

```bash
SUBTITLE_PROVIDER=yt-dlp
YT_DLP_PATH=/usr/bin/yt-dlp
```

If you want dictionary lookups without OpenRouter, switch to `free-dictionary`:

```bash
DICTIONARY_PROVIDER=free-dictionary
```

Note: `free-dictionary` is English-only and should be treated as a fallback, not the default learning path.

## Current Behavior

- Uses embedded YouTube playback via `react-youtube`
- Fetches subtitles through the configured provider
- Preserves the actual subtitle language returned by the provider
- Supports blind/read playback modes
- Looks up clicked words through the configured dictionary provider

## Validation

Run from `/home/khrustal/dev/audiofilms/app`:

```bash
npm run lint
npm run build
```

For architecture and module ownership, use [ARCHITECTURE.md](/home/khrustal/dev/audiofilms/ARCHITECTURE.md) instead of extending this file into a boundary document.

## Built With

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [@supadata/js](https://www.npmjs.com/package/@supadata/js)
- [yt-dlp-wrap](https://github.com/foxesdocode/yt-dlp-wrap)
- [react-youtube](https://github.com/tjallingt/react-youtube)
- [Zustand](https://github.com/pmndrs/zustand)
