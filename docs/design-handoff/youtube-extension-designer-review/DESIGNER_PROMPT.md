# AudioFilms YouTube Extension UI/UX Review Prompt

Date: 2026-06-18

You are reviewing the UI/UX of the AudioFilms Chrome extension for phrase-based
language practice directly on YouTube.

This is a design review, not an architecture review. The backend/API boundaries
have already been reviewed and tightened. Your task is to propose a clearer,
more compact, more usable interface that preserves the intended functionality.

## Product Intent

AudioFilms helps a learner practice a real YouTube video one phrase at a time:

1. Open a YouTube video.
2. Inspect caption/readiness state.
3. Decide whether to use existing captions, fetch better captions, or improve
   timing.
4. Practice phrase by phrase with keyboard-first controls.
5. Click words for 2000NL dictionary help.
6. Optionally review word progress or request translation.
7. Switch between practice modes without leaving the video.

The core loop is not browsing a dictionary. The core loop is listening,
replaying, shadowing/recalling, checking words only when needed, and moving on.

## Current Problems To Solve

The current extension is usable but visually noisy:

- too many equal-weight buttons are visible at once;
- debug/utility actions compete with primary practice controls;
- account/disconnect UI takes too much space in the dictionary panel;
- caption source/status labels expose technical terms such as `yt-dlp`,
  `timedtext`, `manual`, or `exact`;
- dictionary cards do not yet look like structured cards;
- metadata such as part of speech, dictionary source, language, and 2K status
  should be chips, not plain text;
- progress actions are shown as if every word supports every action;
- `Translate` is visually mixed with progress/review actions even though it is a
  separate action;
- right panel context can duplicate the main phrase area;
- utility actions such as `Debug`, `Copy Debug`, `Refresh Cache`, and
  `Mark Issue` should exist without being visually prominent.

Use the screenshot in `screenshots/01-current-youtube-extension.png` as the
current-state reference.

## Fixed Product Decisions

Please do not reopen these unless you find a severe UX contradiction:

- User-facing caption/source labels should not expose `manual`, `exact`,
  `timedtext`, `yt-dlp`, `provider`, or backend provider names.
- User-facing text source labels should be simple, for example:
  - `Dutch captions`
  - `Dutch auto-captions`
  - `ASR transcript`
- Practice readiness labels are:
  - `No captions`
  - `Rough`
  - `Ready`
  - `Precise`
  - `Improving...`
- `Get Captions` and `Improve Timing` are separate actions.
- `Get Captions` should apply the received captions automatically.
- `Improve Timing` is user-started and may show progress inside/near the status
  chip if practical.
- Practice modes for the first redesign are:
  - `Shadow`
  - `Recall`
- In Shadow, `Show Original` is sticky.
- In Recall, the learner sees phrase translation first; original text is
  revealed transiently/manual.
- `Show Translation` in Shadow means phrase-level translation of the current
  phrase, shown inline in the phrase area.
- `Translate` on a dictionary card means card/definition translation, not phrase
  translation.
- 2000NL is the source of truth for dictionary/progress/translation preference.
- Dictionary progress labels:
  - `Learn`
  - `Known`
  - `Again`
  - `Hard`
  - `Good`
  - `Easy`
- Not-started/encountered words show `Learn` and `Known`.
- Learning/reviewing words show `Again`, `Hard`, `Good`, `Easy`.
- Hidden/frozen words do not need a progress row in the first redesign.

## Interface Surfaces To Review

### Main Phrase Surface

The main phrase area should support:

- current phrase text or hidden/translated variant depending on mode;
- phrase-level translation when requested;
- stable dimensions so translation reveal does not cause an ugly layout jump;
- clickable words when original text is visible;
- timestamp/progress context without clutter.

Open design question:

- Should the phrase area reserve enough height for optional phrase translation,
  or should translation appear in a popover/overlay? Prefer the solution that
  preserves stability during repeated keyboard practice.

### Primary Controls

Most frequent actions:

- Replay current phrase.
- Previous phrase.
- Next phrase.
- Toggle/show original where relevant.
- Switch `Shadow` / `Recall`.

Less frequent but still important:

- Get captions.
- Improve timing.
- Open YouTube native transcript panel shortcut.
- Show phrase translation.

Rare/utility/debug:

- Debug.
- Copy Debug.
- Refresh Cache.
- Mark Issue.
- Disconnect account.

Open design question:

- Propose grouping rules: primary practice controls, caption quality actions,
  mode/display controls, utility/debug overflow.

### Caption Readiness And Source

The user should understand caption quality without seeing provider internals.

Suggested direction:

- A compact chip near the phrase controls or header, for example:
  - `Dutch captions · Ready`
  - `Dutch auto-captions · Rough`
  - `ASR transcript · Precise`
  - `Improving...` with subtle progress
- The chip can use color, but should not rely on color alone.
- Details/provider diagnostics can live behind hover/details/debug.

Open design question:

- Where should `Get Captions` and `Improve Timing` live relative to the chip and
  the primary phrase controls?

### Right Dictionary Panel

The right panel should not distract before a word is selected. After word click,
it should become useful quickly.

Required states:

- signed out / connect required;
- no word selected;
- loading;
- no match;
- one dictionary card;
- multiple dictionary cards;
- card translation loading/ready/error;
- action saving/refreshing/error.

Recommended card content:

- clicked form and normalized headword, e.g. `gebouwd -> bouwen` when they
  differ;
- concise definition;
- examples/idioms as visually distinct sections;
- metadata chips:
  - part of speech;
  - dictionary/source;
  - language;
  - 2K/common-word membership if present;
  - optional personal signal such as `seen 7x` or `last 3d`, but only if it does
    not overload the card;
- progress actions separated from translation;
- expandable full-card details for dense dictionary entries.

Open design questions:

- Should personal signals be shown by default, hidden in details, or omitted for
  the first redesign?
- How should multiple cards be separated so they scan clearly without turning
  the panel into stacked heavy cards?
- Where should the account identity and `Disconnect` action live? The current
  large `Disconnect` button is too prominent.

### Practice Modes

The first redesign has two modes:

- `Shadow`
- `Recall`

Shadow:

- learner listens/replays and may show original text;
- `Show Original` is sticky.

Recall:

- learner sees translation of the current phrase and tries to produce the
  original;
- original reveal is manual/transient;
- phrase translation should come from the backend later, but the UI can design
  the state now.

Open design question:

- Should modes be visible as segmented controls/chips in the footer, compact
  header, or another location? Include keyboard hints `1` and `2` if useful but
  do not make shortcuts visually dominant.

## Keyboard Behavior To Preserve

- `Space`: ordinary play/pause behavior, no special auto-pause.
- `ArrowLeft`: previous phrase.
- `ArrowRight`: next phrase.
- `ArrowDown`: replay current phrase.
- `S`: sticky Show Original in Shadow.
- `T`: Show Translation / phrase translation toggle.
- `1`, `2`: switch practice modes.

The UI should make keyboard-first practice feel natural, but buttons must remain
discoverable.

## Visual Direction

The extension should feel:

- compact;
- calm;
- readable;
- tool-like rather than marketing-like;
- stable under repeated keyboard use;
- integrated with YouTube without imitating YouTube too closely.

Avoid:

- oversized hero-style panels;
- nested cards;
- too many same-weight buttons;
- debug controls in the primary row;
- technical provider terms in the primary UI;
- large layout jumps when translation/dictionary content appears.

## Useful Code Pointers

The designer may inspect these only as needed to understand existing UI
surfaces:

- `audiofilms/extensions/youtube-shadowing/src/content.js`
- `audiofilms/extensions/youtube-shadowing/src/serviceWorker.js`
- `audiofilms/extensions/youtube-shadowing/README.md`
- `audiofilms/app/src/app/api/dict/lookup/route.ts`
- `audiofilms/docs/intent/youtube-extension-designer-brief.md`
- `audiofilms/docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`

## Deliverables Requested

Please return:

1. Findings first: what is confusing or visually over-weighted today.
2. Recommended layout for the YouTube extension.
3. Control grouping proposal.
4. Caption readiness/source display proposal.
5. Right dictionary panel structure and card anatomy.
6. Key states for Shadow/Recall, no captions, rough/ready/precise, improving,
   word lookup, and signed-out account.
7. Compact component inventory with names and priorities.
8. Any implementation-sensitive notes for stable dimensions, overflow menus,
   tooltips, and responsive behavior.

Do not implement code. Do not redesign backend contracts. Focus on a practical
UI direction that a follow-up implementation agent can build.
