# Designer Feedback: YouTube Shadowing Extension

## Summary

The two proposed directions are useful, but neither should be accepted unchanged.

The next design should combine:

- the dark concept's strong phrase controls and dedicated right-side workspace,
- the light concept's readable dictionary card anatomy,
- a more realistic multi-result lookup flow,
- a custom transcript panel that fully replaces the YouTube recommendation/transcript area while learning mode is active.

## Critique: Dark Workspace Concept

Strengths:

- The large playback controls are the strongest part of the concept.
- The left video area feels like a real media-learning surface, not just a small debug overlay.
- The right-side `AudioFilms Shadowing Workspace` is directionally correct: it makes the extension feel like it owns a learning panel instead of borrowing YouTube's native transcript.
- Tabs for `Transcript` and `Lookup` are a good starting point.
- A dark theme may fit YouTube dark mode and video watching.

Problems:

- The right transcript content looks too much like a reskinned YouTube transcript. It needs to show why our custom panel exists: source/translation visibility states, current phrase controls, clickable words, lookup state, and later custom segmentation.
- The text in the mock transcript appears fake/garbled. For the next pass, use real Dutch transcript examples from the NOS video.
- Recommendations still appear below the workspace. In learning mode, recommendations are not the priority and should be hidden or pushed behind a separate tab.
- The panel lacks a clear dictionary-card area. `Lookup` is a tab, but the mock does not show what happens when the user clicks a word and multiple dictionary matches return.
- The control area under the video is promising, but it has too many equally weighted controls. `Replay` and `Next` need clearer hierarchy.
- Translation/source toggles are visible, but their state model is unclear. The design should show source-only, translation-only, source+translation, and hidden-source states.

Keep from this direction:

- full right-side learning workspace,
- large media controls under the video,
- dark-mode compatibility,
- transcript/lookup tab model,
- current phrase highlight.

Change:

- remove or hide recommendations while workspace is active,
- make the transcript rows our own learning rows, not a YouTube clone,
- add a real dictionary lookup state,
- show concrete mode and visibility states.

## Critique: Light Native-Looking Concept

Strengths:

- The dictionary card is readable and concrete.
- The selected word highlight inside a phrase is useful.
- The card shows the right kind of content: headword, pronunciation, definition, translation, example, and actions.
- It demonstrates the click-word-to-lookup interaction clearly.

Problems:

- The lookup card as a popover does not scale to multiple matches. 2000NL lookup can return several candidate entries/meanings, and the user needs to choose the relevant card.
- The popover covers transcript content and competes with scrolling. It may be acceptable for a single quick definition, but not as the primary dictionary workflow.
- The design still leaves the current floating `AudioFilms Shadowing` controls in the lower-right. Those were useful for the spike, but should not remain in the final design.
- The concept keeps too much of YouTube's native transcript structure. We need our own transcript/learning panel to support translation-first, source-hidden, future-hidden, and custom segmentation states.
- The right panel's `Lookup` tab is selected, but the transcript and lookup are visually mixed in a way that could become confusing when multiple entries appear.
- The action buttons are not aligned with the user's desired card-review model. The desired actions are closer to `Again`, `Hard`, `Good`, `Easy`, not only `Start learning`, `Mark known`, and `Add to list`.

Keep from this direction:

- word highlight in the phrase,
- readable dictionary card content,
- clear card actions,
- light-mode compatibility.

Change:

- replace popover with a persistent lookup inspector/list,
- support multiple compact cards,
- auto-expand only if there is a single strong match,
- remove the old floating control panel,
- use FSRS-style response buttons per card.

## Revised Design Task

Design a desktop-first Chrome extension learning workspace for YouTube.

The user is watching a YouTube video and practicing Dutch listening phrase by phrase. The extension should replace the right recommendation/transcript column with a custom `AudioFilms` panel. The YouTube video remains on the left. The area under the video should contain large phrase controls.

### Required Primary Screen

Show:

- YouTube video on the left.
- Large phrase controls below the video:
  - Previous
  - Replay
  - Play phrase
  - Next
  - Source toggle
  - Translation toggle
  - optional speed control
- A full-height right `AudioFilms` workspace replacing the recommendations column.
- Right workspace tabs:
  - `Transcript`
  - `Lookup`
- A custom transcript list with real phrase rows, timestamps, current phrase highlight, and clickable words.

### Required Transcript States

Show at least three transcript states:

1. **Shadowing**
   - current source phrase hidden or masked,
   - timestamp visible,
   - future phrases hidden or dimmed,
   - replay/next controls visible.

2. **Reading**
   - source text visible,
   - words are clickable,
   - current phrase highlighted.

3. **Translation-first**
   - translation visible,
   - source hidden,
   - user can reveal source after listening.

Translations are backend-provided. Do not imply that translation happens locally in the extension.

### Required Lookup State

Show what happens after clicking a word in a visible phrase.

The lookup panel should support:

- one result: automatically expanded card,
- multiple results: compact list of candidate cards with one expandable,
- no result,
- loading state.

Each dictionary card should include:

- headword,
- part of speech and gender when available,
- definition,
- translation,
- one or more examples,
- dictionary/source label, for example `nl-vandale`,
- user progress state if available,
- four explicit response buttons:
  - `Again`
  - `Hard`
  - `Good`
  - `Easy`

Important behavior:

- Clicking a word performs read-only lookup.
- Lookup does not automatically mark the word as seen, unknown, or learned.
- The user chooses the relevant meaning and action explicitly.

### Layout Guidance

Desktop first.

Preferred structure:

```text
┌────────────────────────────────────────────┬──────────────────────────────┐
│ YouTube video                              │ AudioFilms workspace          │
│                                            │ Transcript / Lookup tabs      │
│                                            │ Custom phrase list            │
├────────────────────────────────────────────┤ Dictionary inspector/cards    │
│ Phrase controls                            │                              │
└────────────────────────────────────────────┴──────────────────────────────┘
```

Recommendations should not remain visible as the primary content under the right panel while learning mode is active. If needed, they can be moved behind a small `Recommendations` tab or hidden entirely.

### Segmentation Constraint

For the MVP, phrase rows can be based on YouTube transcript timestamps.

However, the design should not assume YouTube segmentation is final. The system must be able to show custom phrase segmentation later:

- split long segments,
- merge short fragments,
- correct bad boundaries,
- align manual captions with generated timing if needed.

### Visual Direction

The UI should feel like a focused learning tool inside YouTube:

- quiet,
- compact,
- readable,
- not a marketing page,
- not decorative,
- not gamified.

It should work in both light and dark YouTube themes, but the designer can start with one primary theme and provide notes for the other.

## Decision

Ask for a revised Option A.

The final direction should not be:

- just a floating control panel,
- just a popover dictionary,
- just a reskinned native YouTube transcript.

It should be a custom right-side AudioFilms learning workspace with phrase controls below the video and a robust lookup inspector for 2000NL cards.
