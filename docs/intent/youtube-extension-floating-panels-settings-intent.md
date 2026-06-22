# YouTube Extension Floating Panels And Settings Intent

Status: draft intent from June 22, 2026 product/implementation grilling.

This document records the current product decision shape for making the
AudioFilms YouTube extension panels movable, resizable, adjustable, and
controlled from the browser-extension surface. It is intentionally separate from
`youtube-extension-designer-brief.md` so the existing design handoff remains
stable.

## Decision Summary

The direction is feasible and coherent with the current extension architecture.
The phrase ribbon and dictionary panel already live in the AudioFilms extension
overlay rather than in YouTube-owned layout, so panel geometry, visual density,
and extension-level settings can be owned by the extension without changing the
subtitle, dictionary, or 2000NL platform contracts.

Recommended first implementation slice:

1. Persist the extension `on/off` state and let it restore on YouTube page load.
2. Add a settings menu for extension display preferences.
3. Add font-size and panel-background transparency controls.
4. Add a reset-display-layout action.
5. Add movable/resizable panel geometry after the settings state model is in
   place.

## Terminology

- `Phrase ribbon`: the compact AudioFilms practice panel that shows the current
  phrase, source/readiness, playback controls, mode controls, and phrase-level
  translation.
- `Dictionary panel`: the lookup panel shown after the learner clicks a word in
  the phrase ribbon.
- `Extension enabled state`: whether AudioFilms learning UI is active on YouTube
  pages.
- `Panel geometry`: a saved panel's viewport-relative position and size.
- `Panel appearance`: user-adjustable visual preferences such as font scale and
  background transparency.
- `Pass-through`: a special mode where a panel may be visible but does not catch
  pointer events, allowing interaction with YouTube underneath.

Avoid calling the phrase ribbon "subtitles panel" in implementation docs unless
the scope is specifically subtitle text. The product surface is broader than
subtitles: it includes phrase navigation, modes, source/readiness state, and
phrase translation.

## Grilled Questions And Recommended Answers

### Should the panels be movable?

Recommended answer: yes, but only after the default layout remains good without
configuration.

Movable panels fit the YouTube-overlay use case because videos, captions,
recommendations, comments, and theater/fullscreen-like layouts vary heavily.
The learner should be able to move the phrase ribbon and dictionary panel away
from important YouTube controls or visible video content.

Implementation should provide obvious drag handles, not make every part of the
panel draggable. Text selection, word clicking, scrolling, and dictionary action
buttons must keep behaving normally.

Resolved interaction rule: panels are draggable only through a dedicated header
drag affordance. Interactive controls, card content, word text, scrollable
areas, examples, and action buttons must never start dragging. Header empty
space may also act as a drag area if it does not conflict with controls.

### Should the panels be resizable?

Recommended answer: yes, with constrained min/max sizes and a reset action.

The dictionary panel benefits most from resize because card density and examples
vary. The phrase ribbon may need width and height constraints to avoid breaking
phrase navigation controls. Resizing should never allow a panel to become
unusable, smaller than its controls, or larger than the visible viewport.

Panel size should be saved separately from panel position. When the viewport
changes, saved geometry must be clamped into the visible area.

Resolved size rule: the dictionary panel is freely resizable within strict
min/max bounds. The phrase ribbon resize is more constrained: width resize is
allowed first, while height stays content-driven by default so the full current
phrase and phrase-level translation remain visible without internal text
scrolling. All saved geometry is clamped to the viewport on restore, on resize,
on drag, and when the viewport changes.

Resolved phrase-ribbon resize rule: the phrase ribbon supports manual width
resizing only in the first implementation. Its height is automatic and follows
the selected width, learner-text size, current phrase, phrase-level translation,
and controls. The user cannot manually shrink the phrase ribbon below the
content height.

Resolved dictionary-panel resize rule: the dictionary panel supports manual
width and height resizing. Its header remains fixed within the panel, and the
dictionary body scrolls when card content exceeds the selected height. Resizing
must not hide the close/settings/header controls.

Recommended bounds:

- phrase ribbon minimum width: about `360px` on desktop, or
  `calc(100vw - 32px)` on narrow viewports;
- phrase ribbon minimum height: content-driven, enough for header, full current
  phrase, optional phrase translation, and primary controls without clipping;
- phrase ribbon maximum width: up to the visible viewport minus margin;
- phrase ribbon maximum height: should avoid viewport overflow, but the normal
  rule is to show the full phrase/translation and let height grow with content
  before considering any scroll behavior;
- dictionary panel minimum width: about `320px`, or `calc(100vw - 32px)` on
  narrow viewports;
- dictionary panel minimum height: about `220px`;
- dictionary panel maximum width: visible viewport minus margin;
- dictionary panel maximum height: visible viewport minus margin.

Resolved resize-affordance rule: initial resizing uses a dedicated bottom-right
resize handle only. The handle is always inside the panel, visually distinct,
and excluded from normal content scrolling/clicking. Edge and corner resizing
beyond bottom-right is deferred until dogfood proves it is needed.

### Should geometry be saved?

Recommended answer: yes, per extension user, not per video.

The normal mental model is "my AudioFilms overlay layout" rather than "this one
video has a special layout." Use a global extension preference as the default.
A later per-site or per-video override can be added only if dogfood shows that
global layout is insufficient.

Saved geometry should include a schema version so future layout changes can
migrate or ignore stale values cleanly.

Resolved persistence rule: store desired panel geometry globally per extension
profile. On every render, derive effective geometry by clamping desired geometry
to the current viewport. Viewport clamping must not overwrite desired geometry
unless the user actively drags/resizes in that viewport. Reset layout clears
desired geometry and returns to responsive defaults.

Resolved overlap rule: panel overlap is allowed. The focused, clicked, dragged,
or resized panel is brought to the front. The extension does not auto-reflow
panels to avoid overlap in the first implementation. Reset Layout restores the
non-overlapping default layout.

### Where should settings live?

Recommended answer: put display settings behind a compact settings menu in the
phrase ribbon, and later mirror core enable/disable state through the browser
extension action.

Do not add a row of permanent font, opacity, lock, and reset buttons to the
main phrase surface. These are important controls, but they are not part of the
frequent language-practice loop. They belong with the existing secondary
controls direction: visible entry point, quiet menu.

The settings menu should contain:

- font size smaller/larger;
- panel background transparency decrease/increase or a small slider;
- lock/unlock layout if movable panels are enabled;
- reset panel layout;
- theme if that remains in the same surface;
- optional diagnostics link if advanced/debug mode is enabled.

Resolved layout-editing rule: movable/resizable layout has an explicit unlocked
editing mode. Normal practice mode keeps layout locked: handles are hidden or
inactive, and panels behave as stable UI. The settings menu exposes Lock Layout,
Unlock Layout, and Reset Layout.

Resolved reset rule: Reset Layout clears saved panel geometry and lock/editing
state, returning panels to responsive defaults. It does not reset learner-text
scale, transparency, theme, enabled state, examples preference, or dictionary
state. Reset Appearance separately restores learner-text scale and panel
transparency defaults. A broader Reset Display Settings may call both, but must
not change dictionary/account/provider state.

### Should font size be adjustable?

Recommended answer: yes.

This is a learner-text readability control, not a global UI zoom. It should
affect only the current practice phrase text and phrase-level translation text
inside the phrase ribbon. It should not resize dictionary cards, metadata,
settings menus, playback controls, account controls, or debug/diagnostic text in
the first implementation.

Recommended controls:

- menu buttons: `A-`, `A+`, and reset/default;
- optional keyboard shortcut later, only if it does not conflict with YouTube,
  browser zoom, text entry, or existing phrase shortcuts.

Plain `+` and `-` are risky as first shortcuts because browser zoom and YouTube
shortcuts may already claim related key paths. Prefer explicit menu controls in
the first slice.

Resolved font scope: font size is not a global AudioFilms appearance preference
in the first implementation. It is a bounded learner-text scale for subtitle
phrase text and phrase-level translation only. The first range should preserve
line wrapping and viewport clamping; large learner text increases phrase ribbon
height as needed so the full phrase and phrase-level translation are visible by
default. Width does not grow automatically. If the learner manually increases
the ribbon width, wrapping may decrease and the content-driven height may shrink.
This scale must not resize controls or dictionary cards. The current phrase is
rendered as clickable word spans, so the learner-text scale applies to that
whole rendered phrase text, including all word spans and active-word
highlighting.

### Should panel transparency be adjustable?

Recommended answer: yes, but adjust panel background opacity, not whole-panel
opacity.

Whole-panel opacity makes text, buttons, and feedback harder to read. The target
behavior is to see YouTube content beneath the panel while keeping AudioFilms
content legible. Implement this through CSS variables for panel background
alpha/blur/contrast rather than applying `opacity` to the panel root.

Transparency should have a minimum opacity floor that preserves readability.
If a pass-through mode is added later, it must be explicit because visual
transparency alone does not let clicks reach YouTube underneath.

Resolved transparency scope: panel transparency is a single global AudioFilms
appearance preference in the first implementation. It changes panel background
alpha through CSS variables, not root opacity. Text, buttons, focus rings, and
feedback states remain fully opaque. The control has a readability floor and a
reset/default value.

### Should users be able to click YouTube through a transparent panel?

Recommended answer: not by default.

Seeing through a panel and interacting through it are different modes. Default
panels should keep pointer interaction because the learner needs to click words,
buttons, examples, and review actions. A future explicit pass-through or
collapsed mode may be useful, but it should not be implied by transparency.

### Should the page-level `AudioFilms On/Off` button remain?

Recommended answer: keep enable/disable as an extension-owned state, but do not
depend solely on the page-level button long term.

The current floating page toggle is useful for dogfood because it proves the
content script booted and gives an escape hatch. It is also visually awkward:
when disabled it can become too quiet and easy to miss, and it adds another
AudioFilms control over YouTube.

Target direction:

- the browser extension action controls enabled/disabled state for YouTube;
- the last enabled/disabled state is restored on new YouTube pages;
- the page UI can keep a small recovery/status affordance during the transition;
- the page affordance should never become so transparent that the learner cannot
  find a way back on.

Resolved enable/disable transition: browser extension action becomes the
primary enable/disable control, but the first implementation keeps a small
page-level recovery affordance when AudioFilms is disabled. The disabled-state
affordance must remain visible enough to recover, not fade into the YouTube
background.

Before fully removing the page toggle, confirm that the extension action/popup
is discoverable in the user's normal Chrome profile and that a disabled state
can still be reversed without going into DevTools or extension storage.

### Should enabled/disabled state persist?

Recommended answer: yes.

If the user turned AudioFilms off, opening another YouTube video should not
surprise them by restoring the full overlay. If they left it on, YouTube should
load with the overlay active.

Persist this as extension state. The existing local page preference can remain
as a compatibility bridge, but the target should be extension-owned storage so
the browser action and content script agree.

Resolved storage rule: new extension display preferences use
`chrome.storage.local` as the source of truth. Existing page `localStorage` keys
may be read as a compatibility bridge/migration input, but browser action state,
enabled state, panel layout, transparency, lock state, and learner-text scale
should converge on extension-owned storage.

### Should the browser extension action replace the page toggle immediately?

Recommended answer: no.

Do it in phases:

1. Keep current page toggle behavior stable.
2. Add extension-action state control and persistence.
3. Make the page toggle a recovery/status affordance.
4. Remove or hide the page toggle only after validation shows the extension
   action is reliable and discoverable.

This avoids creating a state where AudioFilms is off and there is no visible way
for the learner to turn it back on.

### Should geometry and appearance settings apply to both panels together?

Recommended answer: appearance settings should apply globally; geometry should
be per panel.

Font scale and transparency are user comfort preferences and should apply to the
AudioFilms extension surfaces consistently. Position and size are layout
preferences and should be saved separately for the phrase ribbon and dictionary
panel.

### Should settings alter dictionary or learning contracts?

Recommended answer: no.

These are presentation controls only. They must not affect:

- subtitle retrieval/provider selection;
- `practicePhrases[]` ownership;
- dictionary lookup request shape;
- 2000NL session/auth boundaries;
- backend-projected `displayActions`;
- card action result ids.

The content script may render preferences, but it should not invent dictionary
state or progress state to support the settings UI.

## UX Risks

- A fully hidden or near-transparent disabled control can make recovery
  confusing.
- Movable panels can be dragged offscreen unless geometry is clamped.
- Resizable panels can break compact controls unless min sizes are enforced.
- Whole-panel opacity can make text unreadable.
- Keyboard shortcuts for font size can conflict with YouTube or browser zoom.
- Transparent panels can create a false expectation that YouTube underneath is
  clickable.
- Too many visible adjustment buttons would undo the current design goal of
  moving secondary controls into quiet menus.

## Layout Scope

First implementation targets normal YouTube watch pages, theater-like layouts,
and narrow/wide viewport resizing through the same clamped overlay model.
Browser fullscreen is best-effort and should not overwrite normal saved geometry
unless explicitly validated later.

## Implementation Notes

Likely extension files:

- `extensions/youtube-shadowing/src/content.js` for panel creation, settings
  menu behavior, state rendering, drag/resize handling, and content-side storage
  synchronization.
- `extensions/youtube-shadowing/src/shadow.css` for panel geometry classes,
  CSS variables, readable transparency, resize handles, and settings menu
  layout.
- `extensions/youtube-shadowing/src/content.css` for transitional page-toggle
  styling if the current floating toggle remains visible.
- `extensions/youtube-shadowing/src/serviceWorker.js` if the browser extension
  action or `chrome.storage.local` becomes the source of truth for enabled state
  and preferences.
- `extensions/youtube-shadowing/manifest.json` if extension action behavior or
  popup wiring needs to change.

Prefer a small preference object with versioning over many unrelated storage
keys in `chrome.storage.local`. The current page `localStorage` keys such as
`afShadowingLearningEnabled`, `afDictionaryExamplesExpanded`, and
`afShadowingTheme` can be migrated as compatibility inputs, but new settings
should converge on extension-owned storage.

Suggested preference shape:

```json
{
  "version": 1,
  "enabled": true,
  "appearance": {
    "fontScale": 1,
    "panelBackgroundAlpha": 0.92
  },
  "layout": {
    "locked": false,
    "phraseRibbon": {
      "x": null,
      "y": null,
      "width": null,
      "height": null
    },
    "dictionaryPanel": {
      "x": null,
      "y": null,
      "width": null,
      "height": null
    }
  }
}
```

`null` geometry means "use the default responsive layout." This gives a simple
reset path and avoids forcing a stale saved layout onto every viewport.

## Validation Expectations

Minimum validation after implementation:

- verify `on/off` is stored in `chrome.storage.local`;
- reload the unpacked extension, reload a YouTube watch page, and verify the
  saved enabled/disabled state is restored;
- verify the learner can turn AudioFilms back on after disabling it through the
  browser extension action or page-level recovery affordance;
- verify learner-text size changes affect only the current phrase text and
  phrase-level translation, not controls, dictionary cards, metadata, menus, or
  debug text;
- verify transparency preserves readable text and buttons;
- verify transparency changes the panel background, not whole-panel opacity;
- verify layout is locked by default and drag/resize handles are inactive or
  hidden until Unlock Layout is used;
- verify drag starts only from the dedicated header affordance;
- verify resize starts only from the bottom-right handle;
- verify phrase ribbon manual resizing changes width only, while height remains
  content-driven and shows the full phrase plus phrase-level translation;
- verify dictionary panel manual resizing changes width and height, keeps the
  header controls visible, and scrolls body content when needed;
- verify moved/resized panels stay inside wide and narrow viewports;
- verify reset layout returns to the default responsive placement;
- verify Reset Layout does not reset enabled state, learner-text scale,
  transparency, theme, examples, account, provider, or dictionary state;
- verify Reset Appearance resets learner-text scale and transparency without
  changing layout, enabled state, account, provider, or dictionary state;
- verify dictionary word click, card actions, examples, and translation still
  work after moving/resizing the panel;
- verify keyboard phrase navigation still works and font controls do not steal
  active text-entry shortcuts;
- run the extension smoke flow from the runbook after UI changes.

First slice is complete only when persisted settings, constrained layout
editing, learner-text scaling, transparency, reset behavior, and recovery from
disabled state are all validated on a normal YouTube watch page and a narrow
viewport. Fullscreen remains best-effort.

## Open Questions Before Full Removal Of Page Toggle

- Is the extension action pinned/visible enough in the user's normal Chrome
  profile to be the main control?
- Should disabled AudioFilms show a small page recovery affordance forever, or
  only during dogfood?
- Should layout preferences sync across Chrome profiles through `chrome.storage`
  sync, or stay local to one profile through `chrome.storage.local`?
- Should pass-through mode exist in the first implementation, or is transparency
  plus collapse enough?
