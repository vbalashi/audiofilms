# Designer Feedback Round 2: YouTube Shadowing Extension

## High-Level Read

The revised concepts moved in the right direction, especially around:

- larger phrase controls,
- a dedicated right-side AudioFilms workspace,
- transcript and lookup as first-class surfaces,
- dictionary cards with review-style actions.

However, the concepts are still not quite the intended product. They still feel like UI floating over YouTube, rather than a docked learning workspace that takes over the right column while learning mode is active.

The next pass should be more decisive:

- Hide or cover recommendations while AudioFilms mode is active.
- Replace the right column with a full-height AudioFilms workspace.
- Keep phrase controls anchored below the video, not floating over page content.
- Treat dictionary lookup as a persistent inspector/list, not a one-off popover.
- Use real transcript text and realistic multi-result dictionary states.

## Critique: Revised Dark Concept

### What Improved

- The right-side `AudioFilms Workspace: Shadowing Mode` is directionally correct.
- The large controls feel much closer to the desired interaction model.
- Source and translation toggles are visible.
- The transcript area is clearly under extension control, not simply the native YouTube transcript.
- Current phrase highlighting is visible.

### What Still Does Not Work

- The workspace still feels like a floating modal card with a close button, not a docked replacement for the right YouTube column.
- Recommendations remain visible below/behind the panel. In learning mode, recommendations should disappear or move behind a secondary tab.
- The phrase controls float across the lower page and visually collide with the workspace. They should be anchored below the video, within the left video column.
- The control hierarchy is not quite right. `Replay` should be the primary control; `Previous` and `Next` should support it. `Play` can exist, but it should not compete with replay.
- The transcript rows still look too much like a styled transcript list without enough learning-specific structure. The design should show source/translation rows, hidden source states, future phrase visibility, and click-word affordances.
- The `Source` and `Translation` toggles are present, but the exact state is unclear. A hidden source row should look intentionally hidden, not like a broken blank/blurred line.
- The transcript text appears artificial/garbled. Use real Dutch examples from the NOS video.

### Keep

- Large, visible phrase controls.
- Dark-mode compatibility.
- Dedicated right workspace.
- Transcript/Lookup tab model.
- Current phrase highlight.

### Change

- Dock the workspace into the right column.
- Remove visible recommendations while learning mode is active.
- Put controls under the video, not floating over the page.
- Make `Replay` the strongest control.
- Show a real lookup result state, including multiple candidate cards.

## Critique: Revised Lookup Concept

### What Improved

- The dictionary card is closer to the desired content model.
- The card includes headword, part of speech, definition, translation, example, and source.
- The `Again / Hard / Good / Easy` buttons are closer to the desired review-card interaction.
- Showing alternative candidates below the expanded card is the right idea.

### What Still Does Not Work

- Lookup still behaves like a large popover over the transcript. This does not scale when several candidate meanings are returned.
- The lookup popover covers the transcript and creates scrolling/visibility conflicts.
- The old floating `AudioFilms Shadowing` control panel is still visible. That should be removed in the next design.
- The workspace mixes transcript and lookup content without a clear layout rule. If lookup is active, the designer must decide whether lookup takes a tab, a bottom inspector, or a split panel.
- Multiple cards need a clear compact state. The current secondary cards are too compressed and do not show enough decision context.
- The action buttons are very large and colorful. That may work for an expanded card, but compact candidate cards need quieter controls or an expand-first interaction.
- `Saved` appears as a tab, but it is not part of the MVP. It can be omitted unless the designer has a strong reason to include it.

### Keep

- Word highlight inside the phrase.
- Expanded dictionary card anatomy.
- Multiple candidate concept.
- `Again / Hard / Good / Easy` as explicit user actions.

### Change

- Replace popover with persistent lookup inspector/list.
- Show one-result and multi-result states separately.
- Auto-expand only a single strong match.
- For multiple candidates, show compact cards first; expand one on selection.
- Remove old floating debug controls entirely.

## Recommended Revised Layout

Use a docked two-column learning layout.

```text
┌───────────────────────────────────────────────┬──────────────────────────────┐
│ YouTube video player                          │ AudioFilms Workspace         │
│                                               │ Dutch · Manual · 149 phrases │
│                                               │ [Transcript] [Lookup]        │
│                                               │ [Shadow] [Translate] [Read]  │
│                                               │                              │
│                                               │ 8:27  source/translation row │
│                                               │ 8:32  CURRENT PHRASE         │
│                                               │       source text or mask    │
│                                               │       translation if enabled │
│                                               │ 8:34  next phrase            │
├───────────────────────────────────────────────┤                              │
│ Phrase control rail                           │ Lookup inspector / cards     │
│ [Previous] [ Replay ] [Next]                  │ selected word or empty state │
│ Source: on/off · Translation: on/off · Speed  │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

### Left Column

Keep:

- YouTube video player.
- Title/channel/action area can remain below video if space allows.

Add:

- A phrase control rail directly under the video.
- Controls should not float over comments, recommendations, or the right workspace.

Control hierarchy:

1. `Replay` is primary.
2. `Next` is secondary.
3. `Previous` is tertiary.
4. Optional `Play phrase` can be smaller or merged with replay behavior.
5. Source/translation/speed controls are compact utilities.

Suggested control rail:

```text
← Previous      Replay current phrase      Next →
Space replay · ← previous · → next     Source [on/off] Translation [on/off] Speed 1.0x
```

Avoid making every control equally prominent.

### Right Column

The AudioFilms workspace should occupy the right column from near the top of the video area down through the recommendation area.

Recommendations should not remain visible as primary content. Options:

- hide recommendations entirely while workspace is active,
- or move recommendations behind a small secondary tab,
- or restore recommendations only when AudioFilms workspace is closed.

Panel header:

```text
AudioFilms
Dutch · Manual captions · 149 phrases
Shadowing mode
```

Tabs:

- `Transcript`
- `Lookup`

Do not include `Saved` in the MVP unless there is a clear saved-items workflow.

## Transcript Panel Requirements

The transcript must be custom, not just a YouTube transcript clone.

Each phrase row can include:

```text
8:32
Source:        ...het smelten van die gletsjers...
Translation:   ...the melting of those glaciers...
```

But display depends on mode.

### Shadowing Mode

- current source phrase hidden or masked,
- timestamp remains visible,
- translation hidden by default,
- future phrases hidden or dimmed,
- completed phrases can be muted.

### Reading Mode

- source visible,
- words clickable,
- current row highlighted,
- translation optional.

### Translation-First Mode

- translation visible,
- source hidden,
- user listens and guesses source,
- source can be revealed manually.

### Future Segmentation

For the MVP, phrase rows may use YouTube transcript segments.

But the UI should not visually depend on YouTube's exact segmentation. Later we may:

- split long segments,
- merge short fragments,
- correct bad boundaries,
- use custom sentence segmentation,
- align manual captions with generated timing.

Design rows as app-owned phrase units, not YouTube-owned transcript rows.

## Lookup Panel Requirements

Clicking a word in a visible source phrase should call 2000NL lookup.

Lookup is read-only until the user explicitly chooses an action.

### One Strong Match

If lookup returns one strong match, show an expanded card immediately:

```text
gletsjer
noun · de/het if available · nl-vandale

Definition
Grote ijsmassa die langzaam van een berg of door een dal schuift.

Translation
Glacier

Examples
De gletsjers in de Alpen smelten snel.

[Again] [Hard] [Good] [Easy]
```

### Multiple Matches

If lookup returns several candidates, do not use a popover.

Use compact cards:

```text
gletsjer        noun     Glacier
gletsjerijs     noun     Glacial ice
...
```

On click/expand, show the full card for the selected candidate.

Each card should still have explicit actions, but compact cards can show actions only after expansion.

### No Match

Show:

- selected word,
- no dictionary match,
- optional action later: request translation / create user entry.

Do not design creation/editing as MVP unless explicitly requested.

### Auth Required

If user is not logged in to 2000NL:

- show a compact sign-in state,
- explain that lookup/progress uses the same 2000NL account,
- do not show fake progress.

## Backend/State Assumptions

Use these assumptions in the design:

- phrase translation is backend-provided, not local-only,
- dictionary lookup uses 2000NL platform endpoints,
- user identity is shared with 2000NL,
- lookup does not automatically mark a word as known, unknown, seen, or learned,
- `Again / Hard / Good / Easy` are explicit user choices,
- future actions can write progress only after explicit click.

## What To Show In The Next Mockup

Ask for four screens/states:

1. **Primary Shadowing Screen**
   - video left,
   - control rail below video,
   - right custom transcript,
   - source hidden,
   - translation toggle visible.

2. **Reading + Word Hover/Click**
   - source visible,
   - one word highlighted,
   - click target clear.

3. **Lookup Multiple Results**
   - lookup inspector with several compact candidate cards,
   - one expanded card,
   - `Again / Hard / Good / Easy` on expanded card.

4. **Translation-First**
   - translation visible,
   - source hidden,
   - current phrase active,
   - reveal source control visible.

## Final Direction

The desired product is:

- not a modal,
- not a popover dictionary,
- not a reskinned YouTube transcript,
- not a floating debug panel.

It is a docked YouTube learning workspace:

- YouTube video remains the media surface,
- AudioFilms owns the phrase controls,
- AudioFilms owns the right transcript/lookup panel,
- 2000NL powers dictionary cards and progress actions.
