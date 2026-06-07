# YouTube Shadowing Extension UI Brief

## Purpose

Design a desktop-first Chrome extension experience for phrase-by-phrase listening practice directly on YouTube.

The current spike proves that the extension can:

- read YouTube transcript segments,
- navigate phrase by phrase,
- replay the current phrase with keyboard shortcuts,
- pause after the phrase,
- use YouTube's native transcript panel as a temporary display.

The next design should move beyond the native YouTube transcript UI. YouTube remains the video host and playback surface, but the extension should own the learning workspace.

## Design Goal

Create a focused listening/shadowing workspace inside the YouTube watch page:

- video remains large and familiar,
- phrase controls are immediately reachable under the player,
- the transcript becomes a wide learning ribbon under the video,
- the right panel becomes a purpose-built account/dictionary/lookup surface,
- dictionary lookup from the 2000NL platform is available when clicking words,
- the interface supports hiding/revealing source text and translation independently.

Desktop is the priority. Mobile is not a primary target for the Chrome extension MVP.

## Product Loop

1. User opens a YouTube video.
2. Extension detects usable captions/transcript.
3. User sees a wide transcript ribbon under the video.
4. User listens to the current phrase.
5. User presses `Space` or `Replay` to repeat the same phrase.
6. User presses `Next` or `ArrowRight` to move forward.
7. User reveals source text, translation, or both depending on mode.
8. User clicks an unknown word and gets a 2000NL dictionary card.

## Integration Context

2000NL already describes platform endpoints for external clients:

- `POST /api/platform/v1/lookup`
- `POST /api/platform/v1/analyze-selection`
- explicit mutations through `POST /api/platform/v1/actions`

For the extension UI, ordinary word lookup should be read-only by default. Actions such as start-learning, mark-known, mark-unknown, add-to-list, or review-card can appear later as explicit buttons in the dictionary panel.

The extension must also expose 2000NL account state. Personalized lookup, progress, review actions, and saved lists require the user to be signed in with the same 2000NL identity.

Required account states:

- signed out:
  - clear `Sign in to 2000NL` action,
  - dictionary panel explains that lookup/progress requires sign-in,
  - phrase navigation still works locally.
- signed in:
  - compact user identity in the right panel header,
  - source label such as `2000NL dictionary`,
  - lookup requests include the user's access token.
- expired or disconnected:
  - visible reconnect action,
  - no silent failure when lookup cannot run.

## Recommended Direction

### Option A: Bottom Transcript Ribbon + Right Dictionary

Rank: 1

This is the current preferred direction for the next prototype.

Keep the normal YouTube video visible, but make the under-video area the main phrase-learning surface. The right vertical panel becomes primarily a 2000NL-powered dictionary, account, and lookup inspector.

Layout:

```text
┌──────────────────────────────────────────────┬──────────────────────────────┐
│ YouTube video player                         │ Dictionary / Lookup          │
│                                              │ 2000NL account state         │
│                                              │ selected word / phrase        │
├──────────────────────────────────────────────┤ expanded dictionary card      │
│ Smooth transcript ribbon                     │ examples / alternatives       │
│ previous phrases dimmed                      │ review actions                │
│ current phrase centered and highlighted      │                              │
│ next phrases dimmed                          │                              │
├──────────────────────────────────────────────┤                              │
│ Prev Phrase · Replay Active · Next Phrase    │ Auto-pause · Source · Translate│
└──────────────────────────────────────────────┴──────────────────────────────┘
```

Why this is best:

- The under-video area is often underused on YouTube watch pages.
- A wide transcript ribbon is better for longer Dutch sentences than a narrow side column.
- The current phrase can sit on a stable focus line, which fits shadowing practice.
- The right panel can focus on lookup, multiple candidate cards, examples, and progress actions.
- It makes the learning task central instead of treating the transcript as a sidebar.
- The video does not need to occupy the whole experience; the primary task is listening/shadowing.

Transcript behavior:

- The transcript behaves like a moving tape under the video.
- The current phrase sits on a stable center/focus line.
- Previous and next phrases remain visible but visually quieter.
- Movement between phrases should feel smooth, not like the whole panel jumps.
- Source and translation can be shown as two stacked lines inside the active phrase.
- Individual words in the current or visible phrases are clickable for lookup.

Right panel structure:

- Header:
  - `Dictionary` or `AudioFilms Dictionary`,
  - caption/source context if useful,
  - compact account/sign-in state,
  - settings menu.
- Signed-out state:
  - sign-in action,
  - short account requirement,
  - no fake dictionary card.
- Lookup state:
  - selected headword,
  - audio pronunciation button if available,
  - part of speech / gender when available,
  - definition,
  - translation,
  - current phrase context,
  - corpus examples,
  - compact tags such as level/topic.
- Multi-result state:
  - one selected expanded card,
  - compact alternative cards,
  - only expanded card shows review buttons.
- Review area:
  - `Again / Hard / Good / Easy`,
  - visible only when the user is signed in and a card is selected.

Phrase controls:

- primary: `Replay`
- secondary: `Next Phrase`
- tertiary: `Prev Phrase`
- utility: `Auto-pause`, source visibility, translation visibility, speed

Keyboard behavior:

- `Space`: replay current phrase
- `ArrowRight`: next phrase
- `ArrowLeft`: previous phrase
- `ArrowDown`: reveal source text
- `ArrowUp`: hide source text
- later: `T`: toggle translation

Risks:

- The under-video area competes with YouTube title, channel, description, and comments.
- It needs careful height rules so the page does not feel vertically crowded.
- Long translations can make the ribbon too tall unless collapsed modes are designed well.
- The account/sign-in area must be present without stealing attention from the active word card.

### Option B: Right Workspace Transcript + Lookup

Rank: 2

This was the earlier recommended direction and remains a reasonable fallback.

Keep the normal YouTube page structure, but replace the right recommendation/transcript area with an AudioFilms learning panel. Add compact playback controls below the video.

Layout:

```text
┌──────────────────────────────────────────────┬──────────────────────────────┐
│ YouTube video player                         │ AudioFilms panel             │
│                                              │ ┌ Transcript / Lookup tabs ┐ │
│                                              │ │ Phrase list              │ │
│                                              │ │ current phrase highlighted│ │
│                                              │ │ source / translation rows │ │
│                                              │ └──────────────────────────┘ │
│ [Prev] [Replay] [Play/Pause] [Next] [Text]   │ Dictionary / word card       │
│ small phrase progress / mode toggles         │ selected word details        │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

Why it remains useful:

- It preserves the user's mental model of YouTube.
- It gives the extension enough space for custom transcript states.
- It avoids fighting YouTube's native transcript highlight behavior.
- It creates a clear place for 2000NL lookup cards.
- It can be implemented incrementally: first replace transcript UI, then add lookup, then translation modes.

Why it is no longer first:

- A narrow right-column transcript is worse for long Dutch phrases.
- It makes lookup compete with the phrase list.
- The bottom transcript ribbon uses otherwise underused space and better matches shadowing practice.

Right panel structure:

- Header:
  - video language and caption source: `Dutch · manual captions`
  - small status: `149 phrases`
  - compact settings menu
- Main tabs:
  - `Transcript`
  - `Lookup`
  - optional later: `Notes`
- Transcript tab:
  - vertical phrase list
  - current phrase highlighted
  - timestamp column
  - source text row
  - optional translation row
  - per-phrase reveal state
- Lookup tab / inspector:
  - selected word
  - dictionary source, for example `nl-vandale`
  - part of speech / gender when available
  - definition
  - translation
  - examples
  - progress status: new, seen, learning, reviewing
  - explicit actions: start learning, mark known, add to list

Below-video controls:

- larger touch-friendly buttons, similar in spirit to mobile/premium media controls:
  - previous phrase
  - replay phrase
  - play/pause current phrase
  - next phrase
- secondary compact controls:
  - hide/show source
  - hide/show translation
  - loop current phrase
  - slow playback speed
- keyboard hint can be subtle:
  - `Space replay`
  - `← previous`
  - `→ next`

Transcript row anatomy:

```text
8:38   Dit zijn de scenario's voor Nederland.
       These are the scenarios for the Netherlands.
```

States per row:

- future phrase:
  - source hidden or dimmed depending on mode
  - translation can be visible for reverse practice
- current phrase:
  - strong highlight
  - active play marker
  - clickable words
- completed phrase:
  - calmer styling
  - optional check/progress indicator

### Option C: Full Training Mode

Rank: 3

When activated, the extension turns the watch page into a training workspace by hiding most non-essential YouTube chrome: recommendations, description, comments, and some page actions.

Layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ compact top bar: title, caption source, mode, exit training mode           │
├──────────────────────────────────────────────┬─────────────────────────────┤
│ video player                                 │ transcript / lookup panel   │
│ controls below video                         │                             │
│ current phrase focus strip                   │                             │
└──────────────────────────────────────────────┴─────────────────────────────┘
```

Why it is attractive:

- Most focused learning experience.
- Fewer conflicts with YouTube page layout.
- Better for long sessions.

Why it is not first:

- More invasive.
- More likely to break when YouTube changes layout.
- May feel too different from YouTube for early MVP.

Use later as a `Focus mode` toggle.

### Option D: In-Video Clickable Captions

Rank: 4

This option keeps subtitles on top of the video, similar to YouTube CC captions, but makes words clickable and sends lookup results to the right panel.

Layout:

```text
YouTube video player
  + caption overlay on video
  + clickable words in the active caption

Right panel:
  Lookup cards for selected word or phrase
```

Why it is attractive:

- It is very close to the normal YouTube subtitle experience.
- The user can keep eyes on the video instead of scanning a separate transcript.
- It may work well for short phrases and quick word checks.
- Other subtitle/translation extensions use a similar mental model, so it will feel familiar.

Limitations:

- The user sees mostly the current caption, not previous and upcoming phrases.
- It is weaker for phrase navigation and reviewing context.
- Click targets over video must be large and stable enough.
- It may conflict with YouTube's own caption styling and player controls.
- It is harder to show source-hidden or translation-first practice modes cleanly.

This should be treated as a lightweight viewing mode or future mode, not the default MVP layout.

### Option E: Minimal Assistant

Rank: 5

Keep YouTube transcript panel and add only a floating control bar plus a dictionary popover.

Layout:

```text
YouTube native page
  + floating phrase controls
  + word lookup popover near clicked word
```

Why it is useful:

- Very cheap to implement.
- Good for debugging.
- Low visual footprint.

Why it is not enough:

- Native transcript is not flexible enough for translation-first, source-hidden, or multi-line learning modes.
- Native highlight can disagree with extension state.
- Dictionary card placement becomes awkward.
- Hard to support future phrase-level states.

Keep this as a fallback mode, not the main design.

### Option F: Split Transcript And Dictionary Drawers

Rank: 6

Use two collapsible side panels:

- left or right transcript drawer,
- separate dictionary drawer.

Why it might help:

- User can keep transcript wide and lookup separate.
- Useful on very wide screens.

Why it is lower priority:

- More UI management.
- More resize/collapse states.
- Too complex before the core workflow is stable.

## Recommended MVP Information Architecture

Use Option A first: bottom transcript ribbon plus right dictionary/account panel.

Primary regions:

1. Video region
2. Phrase control bar
3. Bottom transcript ribbon
4. Right dictionary/account panel

### Video Region

Keep the YouTube video itself. Do not rebuild the player for the MVP.

Do add:

- stable phrase control bar below the player,
- stable transcript ribbon below or directly above the control bar,
- playback speed selector if needed later.

Do not add:

- large explanatory text,
- marketing-style headers,
- duplicate transcript text over the video in the default mode,
- decorative panels around the player.

### Phrase Control Bar

Controls should be obvious and ergonomic:

```text
← Previous    Replay    Play phrase    Next →      Source  Translation  Speed
```

Button hierarchy:

- `Replay` should be primary.
- `Next` should be secondary but prominent.
- `Previous` should be present but quieter.
- Text/translation toggles should be compact segmented controls.

Keyboard behavior:

- `Space`: replay current phrase
- `ArrowRight`: next phrase
- `ArrowLeft`: previous phrase
- `ArrowDown`: reveal source text
- `ArrowUp`: hide source text
- later: `T`: toggle translation

### Bottom Transcript Ribbon

Replace YouTube's native `In this video` transcript as the main phrase surface. The extension should show a custom transcript ribbon under the video when learning mode is active.

Ribbon layout:

```text
01:18  previous phrase, dimmed
01:21  previous phrase, dimmed
01:24  current phrase, centered, highlighted
       optional translation line
01:28  next phrase, dimmed
01:32  future phrase, dimmed
```

Ribbon requirements:

- current phrase is visually anchored and does not jump when playback pauses,
- previous and next phrases remain visible for context,
- current phrase words are clickable,
- source and translation can be hidden independently,
- timestamps remain visible but secondary,
- active line must be readable during long listening sessions.

### Right Dictionary / Account Panel

Replace YouTube recommendations with a custom right panel when learning mode is active.

Panel header should include:

- surface label: `Dictionary` or `AudioFilms Dictionary`,
- context label: `Contextual Lookup`,
- signed-in 2000NL user state or `Sign in to 2000NL`,
- settings menu.

The right panel should not show a full 2000NL app shell. It is an AudioFilms panel powered by 2000NL.

### Phrase List Modes

#### Shadow

Default.

- current phrase source hidden until reveal,
- translation hidden,
- future phrases hidden or heavily dimmed in the ribbon,
- replay does not advance,
- next is manual.

#### Listen

- source hidden initially,
- translation hidden,
- user reveals source when ready,
- ribbon can show timestamps and progress.

#### Translate

Reverse practice.

- translation visible before listening,
- source hidden,
- user guesses source meaning,
- after replay/reveal source appears.

#### Read

- source visible,
- translation optional,
- word lookup is fully enabled,
- best mode for dictionary inspection.

## Dictionary Lookup UX

Clickable words should be part of the custom transcript, not an overlay on YouTube's native transcript.

Interaction:

1. User clicks a word in the current or visible phrase.
2. Right panel switches or splits to show lookup result.
3. The clicked word is highlighted in the phrase.
4. Lookup card shows dictionary entries from 2000NL.

Lookup card anatomy:

```text
word
part of speech · gender
definition
translation
examples
dictionary source
learning status
[Again] [Hard] [Good] [Easy]
```

MVP lookup behavior:

- call read-only lookup first,
- show loading and empty states,
- do not mutate learning state unless user clicks an explicit action,
- cache recent word lookups inside the extension session.
- show multiple candidate cards when lookup returns multiple meanings,
- auto-expand the card only when there is a single strong match,
- keep multiple matches compact first, with an explicit expand action per card,
- lookup does not mean unknown; it can mean checking or confirming a known word.

Important UI states:

- no word selected
- loading
- one exact match
- multiple dictionary matches
- no match
- API/auth unavailable

## Account / Sign-In UX

The right panel must include 2000NL account state because dictionary lookup, progress, and future review actions are user-specific.

Signed out state:

```text
Dictionary
Contextual Lookup

Sign in to 2000NL
Use your 2000NL account for dictionary lookup, saved words, and review progress.
```

Signed in state:

```text
Dictionary
Contextual Lookup
Signed in as user@example.com
```

Expired/disconnected state:

```text
Reconnect 2000NL
Lookup is unavailable until the session is restored.
```

Rules:

- Phrase navigation and replay should still work without sign-in.
- Lookup should show a clear signed-out state instead of failing silently.
- Review buttons should be disabled or hidden until the user is signed in.
- Account UI should be compact and live in the right panel header or first empty state, not in a full top app bar.

## Translation UX

Translation should be phrase-level first, not word-level first.

Possible display modes:

```text
Source only
Translation only
Source + translation
Hidden source + visible translation
Hidden both
```

Designer should show at least these states:

1. Shadowing: source hidden, current phrase active.
2. Read: source visible, clickable words.
3. Translation-first: translation visible, source hidden.
4. Lookup: selected word with dictionary card.

## Desktop Layout Recommendation

Use a 12-column mental model:

- video area: about 8 columns,
- right panel: about 4 columns,
- below-video controls align with video width.

Minimum useful desktop width:

- about 1180px.

When width is smaller:

- keep video above,
- right panel can become a collapsible drawer,
- do not optimize heavily for mobile extension MVP.

## Visual Tone

This is not a marketing UI. It should feel like a quiet training tool inside YouTube.

Use:

- dense but readable rows,
- restrained borders,
- clear active state,
- compact controls,
- high contrast for current phrase,
- small metadata.

Avoid:

- large hero headers,
- decorative cards,
- too many mode tiles,
- large explanatory text,
- bright gamification.

## Designer Deliverables Requested

Ask the designer for:

1. Desktop Option A primary screen:
   - YouTube video left,
   - bottom transcript ribbon visible,
   - right dictionary/account panel,
   - phrase controls below video.
2. Transcript ribbon states:
   - shadowing hidden text,
   - source visible,
   - translation-first.
3. Signed-out account state:
   - `Sign in to 2000NL`,
   - phrase navigation still usable,
   - lookup/review unavailable but clearly explained.
4. Lookup state:
   - selected word,
   - 2000NL dictionary card,
   - multiple matches if possible.
5. Compact/focus state:
   - panel collapsed or focus mode.

Do not ask for mobile first. A narrow desktop/collapsed panel state is enough.

## Open Questions

Resolved for the next design pass:

- The extension should cover or replace the right recommendation column with a full-height learning workspace. Recommendations can be hidden while the workspace is active.
- Phrase translations should be backend-generated, not local-only. The extension extracts transcript data, sends it to the backend, and displays returned translations.
- The user should log in through the same 2000NL identity/backend so lookup, progress, and future actions share user state.
- Clicking a word should perform read-only lookup only. It must not automatically mark the word as seen, known, unknown, or learned.
- Each lookup result card should provide explicit FSRS-style response actions, matching the learning-card model: `Again`, `Hard`, `Good`, `Easy`.
- Transcript rows can initially use YouTube transcript segments, but the UI/data model must allow custom segmentation later for long, incorrect, or poorly timed segments.

Still open:

- Should the custom right panel preserve a small recommendations tab, or should recommendations disappear entirely while learning mode is active?
- Should the right dictionary panel keep a small transcript/context tab, or should transcript live only in the bottom ribbon?
- Should phrase translation be precomputed for the whole video or requested lazily around the current phrase window?

## Current Recommendation

Proceed with Option A.

Design the extension as a YouTube-native learning workspace:

- YouTube video stays untouched.
- Extension owns phrase controls below the video.
- Extension owns a bottom transcript ribbon for phrase context.
- Extension replaces the recommendation area with a right dictionary/account panel.
- 2000NL lookup appears as the primary right-panel inspector.
- 2000NL sign-in state is part of the panel, not an afterthought.
- Native YouTube transcript remains a fallback, not the final UI.

See `DESIGNER_FEEDBACK.md`, `DESIGNER_FEEDBACK_ROUND2.md`, `DESIGNER_FEEDBACK_ROUND3.md`, and `DESIGNER_FEEDBACK_ROUND4.md` for critiques of visual passes and the revised design task.
