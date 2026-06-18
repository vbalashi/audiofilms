# YouTube Extension Designer Review Package

This package is for a senior UI/UX designer review of the AudioFilms YouTube
extension after the architecture review gaps were closed.

Start with:

1. `DESIGNER_PROMPT.md`
2. `audiofilms/docs/intent/youtube-extension-designer-brief.md`
3. `audiofilms/docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
4. `audiofilms/docs/adr/0002-2000nl-dictionary-platform-boundary.md`
5. `audiofilms/extensions/youtube-shadowing/README.md`
6. `screenshots/01-current-youtube-extension.png`

## Current Review Scope

The designer should focus on interaction and visual structure, not backend
architecture. The recent architecture pass established the main product
boundaries:

- Chrome service worker owns 2000NL tokens.
- AudioFilms proxies dictionary/session/action/translation requests.
- 2000NL owns dictionary, user progress, translation preference, and translation
  semantics.
- `Get Captions` and `Improve Timing` are separate user actions.
- Dictionary card progress actions are phase-dependent.
- Practice modes for the first redesign are `Shadow` and `Recall`.

## Primary Design Questions

- How should the always-visible phrase controls be grouped?
- Which utility/debug actions should move into overflow or diagnostics?
- Where should caption readiness and `Get Captions` / `Improve Timing` live?
- How should the right dictionary panel be structured across empty, loading,
  result, multi-card, translation, and signed-out states?
- How should word card metadata chips, progress actions, and translation action
  be visually separated?
- How should `Shadow`, `Recall`, `Show Original`, and `Show Translation` appear
  without creating a crowded toolbar?

## Expected Output

The requested output is a practical redesign proposal that a UI implementation
agent can later translate into code:

- desktop layout recommendation;
- control grouping;
- right panel structure;
- key states;
- visual hierarchy notes;
- compact component inventory;
- explicit tradeoffs and implementation-sensitive constraints.

Do not create implementation code in this design pass.
