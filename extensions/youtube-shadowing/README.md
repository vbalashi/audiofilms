# YouTube Shadowing Extension

Chrome extension spike for phrase-by-phrase YouTube listening practice.

## Purpose

This extension validates whether AudioFilms can run directly on YouTube pages, use the caption tracks already available to the YouTube player, and replace rough time seeking with phrase navigation.

## MVP Behavior

- Runs on YouTube watch pages.
- Finds available caption tracks for the current video.
- Prefers manual Dutch captions when available.
- Falls back to auto-generated captions.
- Tries caption retrieval in this order:
  - YouTube `timedtext` caption URL from the player track;
  - YouTube transcript panel endpoint;
  - opened transcript panel DOM segments.
- Builds phrase units from timed caption cues.
- Adds a small control panel to the page.
- Uses YouTube's own transcript panel as the primary transcript display instead of duplicating phrase text.
- Supports:
  - `Space`: replay current phrase;
  - `ArrowRight`: next phrase;
  - `ArrowLeft`: previous phrase;
  - `ArrowDown`: show transcript text;
  - `ArrowUp`: hide transcript text.

## Load Locally

1. Open Chrome extensions.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this folder:

```text
/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing
```

Then open:

```text
https://www.youtube.com/watch?v=ZNQWWW-vvfM
```

## Files

- `manifest.json`: Chrome extension manifest.
- `src/content.js`: YouTube page integration, caption parsing, playback controls.
- `src/content.css`: injected panel styles.

## Current Limits

- No build step.
- No backend.
- No translation or dictionary lookup.
- No word-level alignment.
- Uses YouTube web-player metadata, which can change.
