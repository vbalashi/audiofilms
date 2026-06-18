# YouTube Shadowing Extension MVP

> Post-review note: this document describes the original extension spike. The stabilization/rebuild path after expert review is tracked in `docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md`.
>
> June 18, 2026 update: do not use the old shortcut map, no-translation/no-ASR
> scope, or source labels below as current product intent. For the current
> YouTube extension redesign, use
> `docs/intent/youtube-extension-designer-brief.md` and
> `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`.

## Goal

Build a Chrome extension spike that runs directly on YouTube watch pages, reads the available caption tracks, prefers manual/native captions when available, falls back to auto-generated captions, and lets the learner move phrase-by-phrase with keyboard shortcuts.

This is a hypothesis test, not a polished product.

## Product Hypotheses

1. A browser extension can reliably discover caption tracks exposed to the YouTube web player for the current video.
2. The extension can prefer manual captions over auto-generated captions when both exist.
3. The extension can convert timed captions into phrase-sized playback units.
4. Keyboard controls can replay, advance, and go back by phrase instead of YouTube's default time jumps.

## MVP Scope

### In Scope

- Manifest V3 Chrome extension.
- Content script on `youtube.com/watch`.
- Minimal injected panel on the YouTube page.
- Caption track extraction from the current page/player metadata.
- Caption source selection:
  - show YouTube-provided caption choices grouped by caption language;
  - load only the default or explicitly selected source;
  - prefer the first non-`asr` track by YouTube order for default selection;
  - keep the previous working source active when a user-selected source fails to load.
- Caption fetch with `fmt=json3`.
- Parsing JSON3 `events` into timed cues.
- Basic phrase builder:
  - clean cue text;
  - merge short cues until sentence punctuation, a long pause, or a duration limit;
  - preserve cue boundaries.
- Keyboard controls:
  - `Space`: replay current phrase;
  - `ArrowRight`: next phrase and play;
  - `ArrowLeft`: previous phrase and play;
  - `ArrowDown`: show text;
  - `ArrowUp`: hide text.
- Basic visible controls for the same actions.
- Testing on:
  - `https://www.youtube.com/watch?v=ZNQWWW-vvfM`;
  - one manual-caption video;
  - one auto-caption-only video;
  - one no-caption video.

### Out Of Scope

- Translation.
- Dictionary lookup.
- Accounts, sync, persistence, or backend services.
- Chrome Web Store packaging.
- Video/audio download.
- Whisper or other ASR.
- Word-level forced alignment.
- Full YouTube search or channel indexing.
- Beautiful UI.
- Reusing the existing Next.js app runtime.

## Current Implementation Boundary

Place the extension spike under:

```text
extensions/youtube-shadowing/
```

The existing Next.js app remains under `app/`. The extension may later share parsing code with the app, but for the MVP it should stay independent and easy to load into Chrome without a build step.

## Success Criteria

On the NOS op 3 test video, the extension should:

- detect at least one Dutch manual caption track;
- show the selected YouTube caption source name;
- build a non-empty phrase list;
- show current phrase text in the injected panel;
- replay the current phrase with `Space`;
- move forward with `ArrowRight`;
- move backward with `ArrowLeft`;
- stop playback close to the end of the selected phrase.

The MVP is also acceptable if some videos fall back to auto-generated captions, as long as the state is visible in the panel.

## Risks

- YouTube internal player metadata is not a stable public API.
- Content scripts run in an isolated world, so page metadata may need to be parsed from inline scripts rather than read from page globals.
- SPA navigation on YouTube can leave stale state unless URL/video changes are watched.
- Manual captions often have phrase-level timing only, not word-level timing.
- Auto captions can have better word-ish timing but worse text.

## Implementation Plan

1. Create extension scaffold.
2. Inject a minimal status/control panel on YouTube watch pages.
3. Detect current `videoId` and reset state when the YouTube SPA navigates.
4. Extract `ytInitialPlayerResponse` from inline page scripts.
5. Read `captionTracks` and choose the best track.
6. Fetch selected track as JSON3.
7. Parse caption events into cues.
8. Merge cues into phrase units.
9. Wire playback control against the page `<video>` element.
10. Add keyboard handlers.
11. Test the NOS op 3 video manually in Chrome.
12. Record observed failures and decide whether the next step is robustness, UI, or word-level alignment research.

## First Validation Notes

The target test video `ZNQWWW-vvfM` was checked before implementation. It exposes:

- a manual Dutch `nl` track;
- an auto/original Dutch track with more granular segment offsets.

For MVP, the first non-`asr` Dutch source should be selected on this video because it is first in YouTube's caption order.

## Validation Update: June 7, 2026

Manual testing in a temporary visible Chrome profile confirmed:

- the extension can detect the manual Dutch track;
- direct `timedtext` requests can return empty responses even when YouTube displays captions;
- `/youtubei/v1/get_transcript` can fail with precondition errors outside the exact player flow;
- opening the YouTube transcript panel and reading `ytd-transcript-segment-renderer` works on the NOS test video;
- the transcript panel exposes duplicate segment nodes, so the extension now deduplicates by `startMs + text`;
- after dedupe, the NOS test video produced 149 phrase units;
- `Show` reveals text;
- `Next` moves from `Aan het einde van de wereld...` to `...aan de rand van Antarctica...` and starts playback near the expected timestamp.
- The extension UI was reduced to a small control panel; YouTube's own transcript panel remains the primary text display.
- Space handling now captures `keydown`, `keypress`, and `keyup` to avoid falling through to YouTube's default pause/play shortcut.
- `Replay`, `Next`, and `Previous` sync their phrase index from the current video time first, so clicking a standard YouTube transcript row and then pressing `Replay` targets the visible/current row.
- `Hide text` now hides text inside the standard YouTube transcript panel with CSS instead of showing a duplicate hidden-text block in the extension panel.

Current MVP retrieval order:

1. `timedtext` caption track URL.
2. YouTube transcript API metadata.
3. YouTube transcript panel DOM fallback.
