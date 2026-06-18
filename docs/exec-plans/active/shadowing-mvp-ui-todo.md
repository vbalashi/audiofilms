# Shadowing MVP UI Todo

> Status note, June 18, 2026: this is an older main-app MVP UI note. For the
> YouTube extension redesign, use
> `docs/intent/youtube-extension-designer-brief.md` and
> `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md` as the
> current source of truth. In particular, the older `Shadowing` / `Listening` /
> `Reading`, `Show text`, and shortcut suggestions below are superseded for the
> extension by the two-mode model: `Shadow`, `Recall`, sticky `Show Original`,
> and inline `Show Translation`.

## Goal

Turn the current AudioFilms session screen into a usable desktop-first MVP for phrase-by-phrase listening and shadowing practice.

The MVP should feel like a focused training workspace, not a landing page or demo screen. A user should be able to load a YouTube video, listen to one phrase, repeat it, reveal the text, inspect words, and move to the next phrase with minimal friction.

## Core MVP Loop

1. User opens a YouTube video session.
2. App loads subtitles and splits them into phrases.
3. User listens to the current phrase without text.
4. User replays the same phrase as many times as needed.
5. User reveals the text when ready.
6. User optionally clicks words to see dictionary help.
7. User moves to the next phrase.

The product promise is:

> Paste a YouTube link. Listen one phrase blindly. Repeat aloud. Reveal text. Check words. Move on.

## Current Problems

### Session Header Is Too Prominent

The current session screen uses a centered header:

- `Audio Films`
- `Active Listening Session`
- explanatory helper copy

This takes attention away from the actual training task. For the MVP, `Audio Films` can remain as a small product label in the top-left or top bar, but the large session title and explanatory copy should be removed.

### Video Layout Is Unstable

When moving between phrases with the right arrow, the video appears to shift or subtly change size/position. This makes the interface feel fragile and distracting.

The video/audio area must have stable dimensions:

- fixed aspect ratio,
- stable max width,
- no layout shift when phrase text changes,
- no layout shift when dictionary content appears,
- no layout shift when switching between video and audio-only mode.

### Controls Are Too Hidden

Keyboard shortcuts exist, but the main actions are not visible enough.

For MVP, keyboard shortcuts should be accelerators, not the only interface. The user should see large, obvious controls for:

- replay current phrase,
- show/hide text,
- next phrase.

### Dictionary Placement Competes With Subtitles

The dictionary result currently appears below the phrase area. This competes with subtitles and can push the session layout around.

For a desktop-first MVP, dictionary lookup should live in a right-side panel. It should behave like an inspector: click a word on the left, see the explanation on the right.

### Too Many Possible Modes Could Dilute MVP

The reference mode grid includes many useful ideas, but implementing them all now would make the product harder to explain and design.

MVP should avoid an eight-mode selector. Start with a small set of practice modes plus simple display toggles.

## Proposed Desktop Layout

Use a two-column workspace.

```text
┌───────────────────────────────────────────────────────────────┐
│ Audio Films                                      video/session │
├───────────────────────────────────────────────┬───────────────┤
│                                               │ Practice mode │
│          video player OR audio waveform        │ Shadowing     │
│                                               │ Listening     │
│                                               │ Reading       │
│ Phrase 7 / 213                                │               │
│ current subtitle or hidden text               │ Display       │
│                                               │ Video         │
│ [Replay] [Show text / Hide text] [Next]       │ Waveform      │
│                                               │ Text on/off   │
│ phrase progress / small timeline              │               │
│                                               │ Dictionary    │
│                                               │ selected word │
└───────────────────────────────────────────────┴───────────────┘
```

### Left Column

Primary training surface:

- stable video/audio area,
- phrase progress,
- subtitle text or hidden-text state,
- main action buttons,
- small keyboard hints.

### Right Column

Control and inspection panel:

- practice mode selector,
- video/waveform toggle,
- text visibility toggle,
- dictionary result panel.

The right panel should not resize the left training surface.

## Practice Modes

Keep the first MVP mode set small.

### Shadowing

Default mode.

Purpose:

- listen to one phrase,
- repeat it aloud,
- manually replay or continue.

Behavior:

- phrase text starts hidden,
- video or waveform is visible depending on display setting,
- phrase does not auto-advance,
- user controls replay and next.

### Listening

Purpose:

- understand the phrase by ear before checking text.

Behavior:

- phrase text starts hidden,
- reveal text when ready,
- no automatic text reveal required in MVP.

This may initially behave almost the same as Shadowing. The difference can be mostly labeling and future intent until there is a stronger need to separate them.

### Reading

Purpose:

- inspect the transcript and dictionary.

Behavior:

- text is always visible,
- word lookup is available,
- phrase navigation still works.

## Display Modes

Use a direct two-state visual toggle:

- `Video`
- `Waveform`

Do not include `Dim video` in MVP.

### Video

Shows the YouTube video normally.

### Waveform

Audio-only practice surface.

Desired feel:

- looks like an audio editor track,
- uses bars/lines/waveform-like marks,
- current playback position is visible,
- the already-played portion changes color progressively,
- gives the user a sense of where they paused inside the phrase.

Implementation can start with a generated visual waveform/progress surface rather than exact decoded audio waveform data, as long as it communicates phrase progress clearly and stays stable.

## Text Visibility

Keep explicit show/hide text controls.

Visible UI:

- button: `Show text`
- after reveal: `Hide text`

Keyboard shortcuts:

- `T` or `ArrowDown`: show/toggle text,
- `ArrowUp`: hide text if this remains useful.

Recommendation:

- keep keyboard shortcuts,
- but make the visible button the primary discoverable control.

## Main Controls

Primary buttons under the phrase:

- `Replay`
- `Show text` / `Hide text`
- `Next`

Secondary controls:

- `Previous`
- maybe compact icon buttons for back/forward phrase navigation.

Keyboard shortcuts:

- `Space`: replay/play current phrase,
- `ArrowRight`: next phrase,
- `ArrowLeft`: previous phrase,
- `T`: toggle text,
- `V`: toggle Video/Waveform.

## Dictionary Panel

Move dictionary output to the right panel.

States:

- empty: no word selected,
- loading: looking up selected word,
- ready: selected word plus short definitions,
- error: recoverable user-facing message and optional external translate link.

Guidelines:

- do not move or resize the main training area,
- keep definitions concise,
- show dictionary only after text is visible and a word is clicked,
- avoid making dictionary feel like the primary task.

## Visual Direction

The UI should feel like a focused desktop training tool:

- calm,
- stable,
- low-friction,
- not a marketing page,
- not overloaded with mode cards,
- strong hierarchy around the current phrase.

Avoid:

- large explanatory session headings,
- centered hero-like layout inside the session,
- layout shifts,
- too many equal-weight buttons,
- an eight-mode grid in the first MVP.

## MVP Todo

1. Remove the large session header from the watch screen.
2. Add a compact top bar with `Audio Films`, video/session metadata, and maybe language/progress.
3. Convert the watch screen to a two-column desktop layout.
4. Make the media area dimensionally stable across phrase changes.
5. Add `Video` / `Waveform` display toggle.
6. Build a stable MVP waveform surface for audio-only mode.
7. Add large primary buttons: `Replay`, `Show text` / `Hide text`, `Next`.
8. Keep keyboard shortcuts as accelerators and update the visible shortcut hints.
9. Add a small `Practice mode` selector with `Shadowing`, `Listening`, `Reading`.
10. Keep `Shadowing` as the default experience.
11. Move dictionary lookup UI into the right panel.
12. Prevent dictionary loading/results from shifting the main phrase/video layout.
13. Review mobile behavior after desktop MVP is stable.

## Non-Goals For This MVP

- user accounts,
- saved progress,
- spaced repetition,
- custom mode builder,
- eight separate play modes,
- exact decoded audio waveform extraction,
- statistics dashboards,
- video library,
- advanced pause timing controls.

## Open Design Questions

- Should `Shadowing` and `Listening` behave differently in MVP, or should one be removed until there is a real behavioral difference?
- Should `Show text` be a central primary button only, or also a right-panel toggle?
- Should the waveform be purely decorative/progress-based at first, or should it eventually represent real audio amplitude?
- Should the right panel be collapsible for smaller laptop screens?
- What is the minimum mobile experience: supported, simplified, or explicitly deferred?
