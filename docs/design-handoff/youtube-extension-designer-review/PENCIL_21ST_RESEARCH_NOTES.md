# Pencil and 21st Magic Research Notes

Date: 2026-06-18

These notes capture the follow-up visual research after the first YouTube
extension UI implementation pass. The goal is not to copy either generated
mockup literally. The useful work is to identify which ideas are worth trying in
the real extension, then validate whether they survive the actual YouTube
overlay constraints.

## Sources Reviewed

- Pencil: `YouTube Extension Design Review`
- Pencil: `YouTube Extension Design Review - Inspired Variation`
- 21st Magic inspiration searches:
  - `debug button`
  - `popover menu`
  - `segmented control`
  - `dictionary card`
  - `command menu`
  - `tooltip actions`
  - `status badge`
  - `action buttons`

## Pencil Findings

### Strong Ideas From `YouTube Extension Design Review`

- The dictionary panel/card is the strongest part of this mockup.
- The useful card sequence is:
  - clicked form to headword mapping;
  - metadata chips;
  - definition;
  - example;
  - separate card translation callout;
  - progress actions.
- The card feels more dictionary-like than the current dark implementation:
  clearer white surface, stronger section labels, calmer hierarchy, and less
  visual weight.
- The compact translation callout is especially useful. It makes card-level
  translation feel separate from phrase translation without needing a large
  extra panel.
- The metadata chips are worth keeping, but only when backed by real data.
  Do not invent CEFR, frequency, or account state labels if the backend did not
  provide them.

### Weaknesses From `YouTube Extension Design Review`

- The panel width in the mockup is too narrow for realistic dictionary content.
  The real extension should keep the wider right drawer.
- Some copy is mock-data-like and should not become product copy.
- The mockup looks polished as a static image, but the real extension needs
  loading, no-match, error, signed-out, and remote-backend-failed states.

### Strong Ideas From `YouTube Extension Design Review - Inspired Variation`

- Geist Mono works well for utility/machine-readable microcopy:
  - timestamps;
  - phrase counts;
  - section labels;
  - shortcut hints;
  - debug/status details.
- The phrase well is clearer than the current implementation: selected word as a
  blue pill, translation as a quiet line below, and Replay as the dominant
  action.
- The overall console idea has better internal rhythm than the current first UI
  pass: session/source, phrase, and dictionary concerns are visually separated.

### Weaknesses From `Inspired Variation`

- The three-column console should not replace the real extension layout. It is
  too app-like and takes too much vertical space on a YouTube watch page.
- The transcript rail in the mockup is not the extension's current product
  shape.
- Some labels such as `A1+ Practice` imply data the current contract does not
  guarantee.

## 21st Magic Findings

### Debug Button

Best pattern: icon-only button with tooltip.

Recommended adaptation:

- Replace or complement the current utility `...` with a tiny `Bug` or `Wrench`
  icon button.
- Keep it visually secondary:
  - 28-30px square;
  - low-contrast border/background;
  - no label in the main ribbon;
  - tooltip such as `Debug tools`.
- On click, open a compact debug popover.

Reasoning:

- A bug/tool icon is more discoverable for testers than an anonymous `...`.
- It keeps learner-facing controls clean.
- It gives agents/testers a stable target for diagnostics without exposing debug
  text in the main UI.

### Debug Popover

Best pattern: compact quick-actions popover / dropdown menu.

Recommended items:

- `Debug panel`
- `Copy debug`
- `Mark issue`
- `Refresh cache`
- Later: `Backend status` or `Open diagnostics`

Do not use a command palette for this. The 21st command-menu examples are useful
as accessibility references, but they are too heavy for four or five extension
actions.

### Practice Mode Control

Best pattern: small segmented control.

Recommended adaptation:

- Keep `Shadow` and `Recall` as text labels, not icons.
- Active state should be a clear pill.
- Inactive state should be quiet and borderless or nearly borderless.
- Height target: 26-28px.
- Use ordinary sans for labels; save Geist Mono for timestamps and micro-labels.

### Caption Readiness Chip

Best pattern: status badge.

Recommended adaptation:

- Add a small status dot before `Dutch captions · Ready`.
- Use restrained state colors:
  - ready/precise: green tint;
  - rough/no captions: amber tint;
  - improving: blue tint.
- Keep the chip clickable; the popover remains the place for `Get Captions`,
  `Improve Timing`, source switching, and details.

### Dictionary Cards

Best pattern: simple/default card or inner card. Avoid animated, gradient,
lifted, or decorative card styles.

Recommended adaptation:

- Use a lighter card surface inside the dictionary drawer or make the dictionary
  drawer itself lighter.
- Maintain a compact section rhythm:
  - word mapping as the title;
  - chips row;
  - definition;
  - example;
  - translation callout;
  - progress row.
- Use uppercase micro-labels sparingly, likely in Geist Mono.
- Preserve current runtime contract: do not display progress actions when
  backend `displayActions` does not provide them.

### Progress Actions

Best pattern: small button group.

Recommended adaptation:

- For not-started/encountered: `Learn` primary, `Known` secondary.
- For learning/reviewing: `Again`, `Hard`, `Good`, `Easy` as compact equal-size
  buttons, with one visually preferred action only if the backend indicates it.
- Hidden/frozen cards should show no progress row.

## Recommended Next UI Experiment

Try a second UI variation with these changes, keeping the current product
architecture:

1. Keep the real layout: bottom practice ribbon plus right dictionary drawer.
2. Restyle the dictionary drawer/card using the stronger Pencil card anatomy.
3. Add Geist Mono only for timestamps, counts, section labels, shortcuts, and
   debug/status microcopy.
4. Replace the generic utility dots with a small bug/tool debug button and
   compact debug popover.
5. Tighten the phrase well:
   - clearer dark phrase container;
   - selected word as a blue pill;
   - quiet translation line below;
   - Replay as the most prominent phrase action.
6. Refine `Shadow` / `Recall` into a quieter 26-28px segmented control.
7. Add status-dot treatment to the readiness/source chip.

## Ideas To Avoid For Now

- Full command palette for debug actions.
- Large three-column console replacing the YouTube overlay architecture.
- Animated or decorative card variants.
- CEFR/frequency/status labels that are not backed by API data.
- Mixing learner-facing caption actions with debug actions in one menu.

## Open Validation Questions

- Does a lighter dictionary drawer look too detached from the dark practice
  ribbon on top of YouTube?
- Does the bug icon feel helpful for testers without being odd for normal
  learners?
- Does Geist Mono improve utility readability, or does it make the UI feel too
  technical?
- Does the wider real dictionary drawer preserve the nice Pencil card rhythm
  without becoming too spacious?
- Should `Refresh cache` remain in debug tools, while learner-facing
  `Get Captions` stays in the readiness popover?

