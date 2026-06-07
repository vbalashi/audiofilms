# Designer Feedback Round 3: YouTube Shadowing Extension

## Overall Assessment

This round is much closer to the desired product direction.

The concepts now show the important pieces:

- a real right-side workspace,
- custom transcript rows,
- source/translation visibility,
- expandable dictionary cards,
- multiple lookup results,
- explicit `Again / Hard / Good / Easy` actions,
- a stronger sense that this can become a learning tool rather than a debug overlay.

The direction is broadly acceptable, but needs refinement before implementation.

## What Is Working

### Right Workspace

The right-side workspace finally feels like the correct product area. It can own:

- transcript,
- lookup,
- phrase modes,
- dictionary cards,
- user progress actions.

This is the right direction. Keep it.

### Expandable Dictionary Cards

The dictionary-card direction is much better:

- one expanded card can show definition, translation, examples, source, and grading buttons;
- multiple results can appear as compact cards below;
- this handles real lookup ambiguity better than a popover.

This should become the lookup model.

### Review Actions

`Again / Hard / Good / Easy` are directionally right. They align with the learning system better than `Mark known` or `Start learning` as primary controls.

The design should treat these as explicit user actions after lookup, not automatic state changes.

### Transcript + Lookup Relationship

The split between transcript and lookup is now more understandable:

- transcript is the phrase navigation surface,
- lookup is the word/meaning inspection surface.

This is close to the desired IA.

## Main Problems To Fix

### 1. Too Much 2000NL App Shell

The mockups use a full `2000NL Learning` application shell with:

- left app navigation,
- top app nav,
- `Home / Deck / Dictionary`,
- `Dashboard / Flashcards`.

This is probably wrong for the Chrome extension on YouTube.

The extension can use 2000NL backend identity and dictionary data, but the UI should still feel like an AudioFilms/YouTube learning workspace, not like the user navigated away into the full 2000NL app.

Recommendation:

- Brand the workspace as `AudioFilms` or `AudioFilms · powered by 2000NL`.
- Do not show a full 2000NL app sidebar in the YouTube extension MVP.
- Keep 2000NL visible in lookup cards/source labels and sign-in/account state, not as the dominant page shell.

### 2. Video Area Should Remain YouTube-Like

Some concepts look more like a standalone learning app than a Chrome extension modifying YouTube.

This is useful as a future standalone direction, but for the extension MVP:

- keep the actual YouTube video and title/channel area recognizable,
- avoid replacing the entire page with a full 2000NL dashboard shell,
- do not add a large top app header that competes with YouTube.

If the designer wants to show a standalone app variant, label it clearly as future/non-MVP.

### 3. Controls Need Final Hierarchy

The large `Replay Phrase` button is good.

But controls should be more disciplined:

- primary: `Replay`
- secondary: `Next`
- tertiary: `Previous`
- optional: `Play phrase`
- utilities: source, translation, speed

Avoid:

- making all controls equally important,
- adding `Save Phrase` as a primary button in the video area,
- scattering controls between left rail, bottom rail, transcript, and lookup.

Suggested rail:

```text
Previous        Replay Phrase        Next
Space replay · ← previous · → next     Source · Translation · Speed
```

### 4. Add-To-List Should Not Be A Primary Button

The user may want to add a word or meaning to a list, but this should not be one of the main visible card buttons.

Recommendation:

- Keep `Again / Hard / Good / Easy` as the primary card actions.
- Put secondary actions under a three-dot menu:
  - add to list,
  - save entry,
  - copy to user dictionary,
  - report mismatch,
  - open in 2000NL.

This keeps grading/review decisions visually clear.

### 5. Lookup Card Needs Multi-Result Rules

The multi-result concept is good, but it needs stricter behavior:

- If there is one strong match: auto-expand it.
- If there are multiple matches: show compact candidate cards first.
- The selected candidate expands.
- Only the expanded card shows `Again / Hard / Good / Easy`.
- Compact cards should not all show grading buttons at once.

This avoids overwhelming the user with repeated action rows.

### 6. Transcript Rows Need More Learning-State Detail

The transcript rows are close but should show more of the learning modes:

- source hidden,
- translation visible,
- source + translation,
- current phrase,
- completed phrase,
- future phrase,
- clicked word highlight.

The current screenshots show some of this, but the next pass should show all major states explicitly.

### 7. Dark Theme Is Good, But Watch Contrast

The dark UI is appropriate, but some areas are very dark and low-contrast:

- inactive transcript rows,
- secondary text,
- timestamps,
- examples.

The designer should tune contrast for long reading sessions.

## Screen-By-Screen Notes

### Screen 1: Shadowing Workspace

Good:

- right workspace and transcript are in the correct place,
- `Replay Phrase` is prominent,
- source/translation toggles exist.

Needs change:

- left sidebar and `2000NL Learning` shell are probably too much for a YouTube extension,
- `Deck` navigation does not belong in this MVP surface,
- current phrase hidden state is unclear: the blank/blur should look intentional,
- `Shadowing Active` toggle feels redundant if the whole workspace is already in shadowing mode.

### Screen 2: Transcript + Dictionary Inspector

Good:

- this is the strongest overall direction,
- right panel split into transcript and dictionary card works,
- selected word highlight is clear,
- dictionary card content is useful,
- review buttons are correctly present.

Needs change:

- `Save Phrase` should not be the main CTA near the video,
- use `AudioFilms` workspace branding more than `2000NL Learning`,
- action buttons can be slightly less loud while still clear,
- add a three-dot menu on the card for secondary actions like add-to-list.

### Screen 3: Lookup Results

Good:

- multiple results are represented,
- expanded result plus compact alternatives is the right model,
- `Esc to return to video` is useful if this is a focus/lookup mode.

Needs change:

- this looks more like a standalone app than a YouTube extension,
- video content is too abstract/fake,
- if lookup is the selected tab, transcript context should still be reachable,
- compact result cards should show enough metadata to choose between meanings.

## Proposed Final Direction

Proceed with this direction, but revise toward:

```text
YouTube page with AudioFilms learning mode active

Left:
  Actual YouTube video
  YouTube title/channel can remain
  AudioFilms phrase control rail directly under video

Right:
  Docked AudioFilms workspace replacing recommendations
  Header: AudioFilms · Dutch manual captions · Shadowing
  Tabs: Transcript / Lookup
  Transcript: custom phrase rows with source/translation states
  Lookup: expanded selected card + compact alternatives
```

Branding:

- primary UI brand: `AudioFilms`
- data/source brand: `2000NL`
- dictionary source labels: `nl-vandale`, user dictionary, etc.

## Additional Layout Variant To Explore

The current right-workspace direction is good, but there is one more layout worth exploring before locking the design.

The space under the video is currently underused. It could become the main transcript surface, while the right vertical panel becomes the dedicated lookup/dictionary area.

Proposed variant:

```text
Left:
  Actual YouTube video
  Phrase control rail under video
  Wide transcript ribbon under the controls
  Current phrase centered on a stable focus line
  Previous/next phrases visible but dimmed

Right:
  Lookup-first workspace
  Selected word or phrase
  Expanded dictionary card
  Compact alternative cards
  Explicit review actions
```

This may be better than a right-column transcript because:

- Dutch sentences can be long, and a wide transcript row is easier to read.
- The transcript can move like a smooth tape rather than a narrow scrolling list.
- The right panel can focus on lookup without competing with the transcript.
- The UI makes it clear that learning, not passive video watching, is the primary task.

The designer should show this as a serious alternative, not as a minor variation.

Also explore a lighter viewing mode where the active YouTube-style captions appear over the video, but words are clickable. In that mode the right panel still shows lookup cards. This is probably not the main MVP layout because it lacks previous/next context, but it may be useful as a compact mode later.

## Next Designer Request

Ask for one more pass with five concrete screens:

1. **YouTube Extension Shadowing Mode**
   - real YouTube-like page,
   - no 2000NL app sidebar,
   - right recommendations replaced by AudioFilms workspace,
   - large control rail under video.

2. **Reading Mode With Word Selected**
   - source visible,
   - selected word highlighted,
   - lookup inspector open in right panel.

3. **Lookup Multi-Match**
   - one expanded dictionary card,
   - compact alternative cards,
   - `Again / Hard / Good / Easy` on expanded card only,
   - add-to-list and secondary actions inside a three-dot menu.

4. **Bottom Transcript Ribbon Variant**
   - transcript under the video,
   - current phrase centered and highlighted,
   - previous and next phrases visible but dimmed,
   - right panel used mainly for lookup cards.

5. **In-Video Clickable Captions Variant**
   - caption overlay on the video,
   - clickable word highlight inside the active caption,
   - right panel showing lookup cards,
   - clear acknowledgement that previous/next transcript context is limited.

## Acceptance Level

This round is close enough to treat as the main design direction.

Current score:

- Information architecture: 8/10
- Interaction model: 7/10
- Lookup model: 8/10
- YouTube extension fit: 6/10
- Visual clarity: 7/10

Main remaining issue:

The design still leans too much toward a standalone `2000NL Learning` app. The next pass should make it feel like an `AudioFilms` learning workspace docked inside YouTube, powered by 2000NL dictionary/progress services.
