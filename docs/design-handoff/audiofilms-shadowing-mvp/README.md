# AudioFilms Shadowing MVP Design Handoff

This package contains context for redesigning the current AudioFilms listening-practice session into a focused desktop-first MVP.

## What AudioFilms Is

AudioFilms is a web app for practicing listening with YouTube videos. A learner loads a video, the app fetches subtitles, splits them into phrases, and lets the learner replay one phrase at a time. Text can be hidden or revealed, and clicked words can show dictionary-style definitions.

## Design Direction

The current app works as a prototype, but the session UI should become a stable training workspace:

- less landing-page-like,
- more focused on one phrase at a time,
- visible primary controls,
- stable video/audio surface,
- right-side panel for practice modes and dictionary results,
- support for a `Video` / `Waveform` display toggle.

## Files

- `DESIGNER_PROMPT.md`: the main task prompt for the designer.
- `context/shadowing-mvp-ui-todo.md`: detailed MVP notes, problems, layout direction, and todo list.
- `context/product-intent.md`: current product intent.
- `context/architecture.md`: technical/project boundaries.
- `screenshots/01-current-home.png`: current home screen.
- `screenshots/02-current-session-blind.png`: current blind phrase state.
- `screenshots/03-current-session-read.png`: current text-revealed state.
- `screenshots/04-current-session-read-large-video.png`: current text-revealed state with larger video.
- `screenshots/05-reference-play-modes.png`: external/reference mode selector idea.

## Expected Designer Output

Please propose a practical MVP redesign, not a broad product expansion. Ideally include:

- desktop session layout,
- key states for blind/listening, text revealed, dictionary result, and waveform mode,
- interaction model for buttons and shortcuts,
- right panel structure,
- visual hierarchy and spacing,
- notes for responsive behavior if obvious.

Mobile can be considered, but desktop MVP is the priority.
