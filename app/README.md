# AudioFilms

An interactive web app for watching YouTube videos with synchronized subtitles and word-by-word highlighting.

## Features

- YouTube video playback with embedded player
- Automatic subtitle fetching for any YouTube video
- Real-time word highlighting synchronized with video playback
- Click on any word to jump to that timestamp
- Support for multiple languages (prioritizes Dutch → English → any available)

## Prerequisites

- Node.js 20+ and npm
- **yt-dlp** must be installed on your system

### Installing yt-dlp

**Arch Linux:**

```bash
sudo pacman -S yt-dlp
```

**macOS:**

```bash
brew install yt-dlp
```

**Ubuntu/Debian:**

```bash
sudo apt install yt-dlp
```

**Other systems:**
See [yt-dlp installation guide](https://github.com/yt-dlp/yt-dlp#installation)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Enter a YouTube video URL and start watching!

## What Works ✅

- ✅ YouTube video playback
- ✅ Subtitle fetching for videos with available captions
- ✅ Support for manual and auto-generated subtitles
- ✅ Word-by-word highlighting synchronized with video
- ✅ Click-to-seek functionality
- ✅ Multi-language support (Dutch, English, and 100+ other languages)

## What Doesn't Work ❌

- ❌ Videos without any subtitles/captions
- ❌ Private or age-restricted videos
- ❌ Live streams (may have limited subtitle support)

## Technical Notes

- Uses `yt-dlp-wrap` for reliable subtitle fetching
- YouTube's native caption API has authentication issues, so we use yt-dlp as a workaround
- Subtitles are fetched in VTT format and parsed server-side
- The app requires yt-dlp to be installed at `/usr/bin/yt-dlp`

## Deployment

For production deployment, ensure:

1. yt-dlp is installed in your production environment
2. The path to yt-dlp binary is correct in `src/app/api/get-subs/route.ts`
3. Consider caching subtitle responses to reduce API calls

## Built With

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [yt-dlp-wrap](https://github.com/foxesdocode/yt-dlp-wrap)
- [react-youtube](https://github.com/tjallingt/react-youtube)
- [Zustand](https://github.com/pmndrs/zustand) for state management
