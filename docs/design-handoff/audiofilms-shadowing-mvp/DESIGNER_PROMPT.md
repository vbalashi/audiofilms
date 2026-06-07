# Designer Prompt

You are designing the MVP session experience for **AudioFilms**, a web app for phrase-by-phrase listening practice with YouTube videos.

## Product Context

AudioFilms lets a learner paste a YouTube link, fetch subtitles, and practice one phrase at a time. The learner can replay the current phrase, hide/reveal the text, click words for dictionary help, and move to the next phrase.

The current prototype works, but it feels too much like a demo page and not enough like a focused training tool. We want a desktop-first redesign that can be implemented as an MVP.

## Core User Loop

The main loop is:

1. Listen to one phrase without text.
2. Replay it as needed.
3. Repeat/shadow it aloud.
4. Reveal the text when ready.
5. Optionally click words for dictionary help.
6. Move to the next phrase.

The product promise is:

> Paste a YouTube link. Listen one phrase blindly. Repeat aloud. Reveal text. Check words. Move on.

## What Needs To Change

The current session screen has several issues:

- The large `Active Listening Session` header and explanatory copy are unnecessary during practice.
- The video area appears to shift or subtly resize when changing phrases.
- Important actions are too hidden behind keyboard shortcuts.
- Dictionary results appear below the subtitle area and compete with the main training flow.
- The UI does not yet clearly distinguish practice modes, text visibility, and video/audio display.

## Target UX

Design a stable two-column desktop workspace:

- **Left/main area**: video or waveform, phrase progress, subtitle/hidden text, primary controls.
- **Right panel**: practice mode selector, display controls, text visibility, dictionary result.

The right panel should feel like an inspector/control panel and should not resize or push the main practice area.

## Practice Modes For MVP

Keep this small. Do not design an eight-mode system for MVP.

Suggested modes:

- **Shadowing**: default. Phrase text starts hidden, user replays and manually moves forward.
- **Listening**: similar to Shadowing, focused on checking comprehension by revealing text.
- **Reading**: text is visible, word lookup is available, phrase navigation still works.

It is okay to suggest renaming, merging, or simplifying these if the UX becomes clearer.

## Display Modes

Use only:

- **Video**
- **Waveform**

Do not include a dim-video mode.

The waveform mode should feel like an audio editor track: bars/lines/waveform-like marks, with a clear progressive color change showing where playback is inside the current phrase. It does not need to represent exact decoded audio amplitude in the first MVP, but it should clearly communicate phrase progress and pause position.

## Required Primary Controls

Make these visible and easy to use:

- `Replay`
- `Show text` / `Hide text`
- `Next`

Secondary controls may include:

- `Previous`
- compact keyboard shortcut hints.

Keyboard shortcuts should be treated as accelerators, not as the only way to use the product:

- `Space`: replay/play current phrase,
- `ArrowRight`: next phrase,
- `ArrowLeft`: previous phrase,
- `T`: toggle text,
- `V`: toggle video/waveform.

## Dictionary

Move dictionary lookup into the right panel.

States to design:

- empty/no word selected,
- loading,
- definition ready,
- recoverable error.

Dictionary should support the learning flow without becoming the main focus.

## Visual Tone

The UI should feel:

- calm,
- stable,
- focused,
- desktop-tool-like,
- premium but not decorative,
- optimized for repeated practice.

Avoid:

- marketing-style hero layout during the session,
- huge explanatory headings,
- too many equal-weight cards,
- layout shifts,
- an overloaded cockpit of controls.

## Deliverables Requested

Please propose:

1. A desktop session layout.
2. Key states:
   - blind/listening state,
   - text revealed state,
   - dictionary result state,
   - waveform/audio-only state.
3. The right panel structure.
4. Primary and secondary controls.
5. Recommended naming for modes and buttons.
6. Any implementation-sensitive notes, especially around stable dimensions and layout.

Use the included screenshots as current-state reference. The final design does not need to preserve the current visual style if a cleaner direction better serves the MVP.
