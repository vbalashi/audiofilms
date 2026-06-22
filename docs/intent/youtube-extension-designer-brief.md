# YouTube Extension Designer Brief

Status: draft handoff for senior product/design review, June 18, 2026.

This brief describes the intended product behavior for the AudioFilms YouTube
shadowing extension. It is meant to be handed to a senior designer together with
the current screenshot and access to the repository.

## One-Line Intent

Help an intermediate language learner practice real YouTube speech phrase by
phrase without leaving YouTube: listen, replay, optionally hide text, click
words for contextual dictionary support, and save/review words through 2000NL.

## Current Surface To Review

The current UI has two visible layers:

- phrase ribbon over the YouTube player area;
- dictionary panel on the right after the user clicks a word.

The screenshot supplied with this brief shows a working dogfood state, not a
finished product design. The core problem is grouping and hierarchy: many
secondary, diagnostic, and account controls are always visible, while the
primary learning workflow competes with debug and setup affordances.

## Primary User Behavior

The frequent loop is:

1. Open a YouTube video.
2. See that usable captions or transcript data are available.
3. Start or continue playback normally.
4. Use phrase controls when needed:
   - replay the current phrase;
   - go to the next or previous phrase;
   - temporarily reveal/hide the original text;
   - toggle sticky `Show Original` in Shadow Mode;
   - optionally show inline whole-phrase translation.
5. Click a word in the current phrase when meaning is unclear.
6. Read the contextual dictionary card.
7. If signed in and the word is useful, start learning it or review it.

The less frequent loop is:

- switch caption source or language;
- switch Text Source;
- switch between Shadow and Recall modes;
- mark an issue for later debugging;
- refresh cache after provider changes;
- open debug details;
- copy debug state for an agent;
- connect or disconnect a 2000NL account;
- manually start ASR/transcription for a video.

Design should make the frequent loop visible and effortless, while moving the
less frequent loop into quieter menus, icon actions, details panels, or explicit
advanced/debug mode.

## Core Visual Hierarchy

### Visible When Practice Phrases Exist

- Current practice prompt: original phrase in Shadow, translated prompt in
  Recall, with original reveal handled by mode controls.
- Current phrase position, for example `98 / 145`.
- Replay, previous, and next phrase controls.
- A clear but compact mode signal:
  - passive YouTube sync;
  - guided/shortcut phrase mode;
  - current Practice Mode.
- Practice readiness signal, compressed enough not to dominate the UI.
- A visible way to reveal/hide the original text or toggle `Show Original`.

### Should Be Visible But Low-Weight

- Current Text Source, for example `Dutch captions`, `Dutch auto-captions`, or
  `ASR transcript`.
- Readiness/action state, for example `Ready`, `Precise`, `Rough`,
  `Improving...`, or `No captions`.
- Account identity when signed in.
- A compact overflow/menu for secondary actions.

### Should Not Be Always Prominent

- Debug.
- Copy debug.
- Refresh cache.
- Mark issue.
- Connect/disconnect account actions.
- Dictionary card translation action.
- Raw provider/retrieval details.
- Long diagnostic text.

These controls are useful for dogfood and agent validation, but they should not
read as core learning actions.

## Suggested Grouping Direction

### Phrase Control Group

Primary controls:

- previous phrase;
- replay phrase;
- next phrase;
- current practice mode or text-display mode;

These belong close to the current phrase and should feel like playback tools,
not generic rectangular form buttons. Icon buttons with tooltips are appropriate
for previous, replay, and next. Do not add an AudioFilms play/pause button in
the first redesign; native YouTube play/pause and the Space key remain
responsible for normal playback.

Do not treat auto-pause as a prominent standalone mode or primary toggle. Normal
Space playback should behave like ordinary YouTube playback without phrase
auto-pause. Guided phrase commands such as Replay, Previous, and Next define the
phrase-practice behavior. Recall Mode may pause before playing the next phrase so
the learner can attempt recall before hearing the original; replay then plays the
current phrase.

Practice-mode navigation intent:

- Shadow: Previous/Next select and play the adjacent phrase in guided phrase
  navigation; Replay plays the current phrase.
- Recall: Previous/Next select the adjacent phrase and show the translated prompt
  without automatically playing the original audio; Replay plays the current
  original phrase after the learner has attempted recall.
- Space always remains normal continuous YouTube play/pause.

Recall reveal behavior:

- The translated prompt is visible first.
- The original phrase text is hidden on phrase entry, regardless of the Shadow
  mode `Show Original` sticky setting.
- Replay plays the original audio.
- The learner can manually reveal/hide the original text with a small eye/reveal
  control or shortcut.
- A later optional "reveal on replay" behavior may show the original when Replay
  starts, but do not let Shadow's sticky `Show Original` setting make Recall show
  the answer immediately.
- Moving to another phrase resets the revealed original text.

`Hide/Show text` is too narrow as a product concept. Treat it as `Show Original`,
a sticky visibility setting inside practice modes:

- Shadow: learner listens to and repeats the original phrase. `Show Original`
  controls whether the original text is automatically visible or hidden during
  phrase navigation.
- Recall: translated prompt is visible; learner recalls or produces the original
  language phrase.

Practice modes may become compact chips, a segmented footer, or a dropdown with
keyboard shortcuts `1` and `2`. The active mode should be clear but secondary to
phrase playback. Additional modes are out of scope for the first redesign unless
they are deliberately reintroduced in a separate product decision.

Design target: show compact mode chips when the ribbon has enough width, and
collapse them into a dropdown on narrow layouts. Hotkeys should keep working
regardless of whether the mode selector is shown as chips or a dropdown.

Initial practice modes:

- `Shadow`: learner shadows/repeats the original phrase; original text
  visibility is controlled by `Show Original`.
- `Recall`: translated prompt visible; learner recalls or produces the original
  language phrase.

Recall Mode should show a translation of the whole current practice phrase or
sentence, not a dictionary-card translation and not word-by-word glosses. This
requires a backend phrase-translation layer that can translate a full practice
phrase in context, cache the result next to the phrase/caption artifacts, and
return it on later visits without re-translating. The translation provider may be
an LLM, DeepL, or another backend-selected provider; the extension should not own
provider policy.

Shadow Mode may also need optional whole-phrase translation as a comprehension
aid. This is `Show Translation`, not Recall Mode: the original phrase remains the
main surface, and the translation helps the learner understand the whole phrase
when word-level lookup is not enough.

UI intent for Show Translation:

- Use `T` or a small `Translate`/translation chip to toggle phrase translation.
- Show the translation inline in a second lane under the current phrase, not in a
  popover and not in the dictionary panel.
- Reserve stable vertical space for the optional translation lane so toggling it
  does not cause a jarring layout jump.
- If translation is not ready, show a compact `Translating...` state in that
  lane.
- Use the same backend phrase-translation artifact as Recall where possible.
- Use the learner's 2000NL translation target language by default, same as
  Recall.
- Open design question: should `T` reveal translation only for the current
  phrase, or become a sticky preference across phrase navigation? Current safe
  default is current phrase only.

Open backend/API gap:

- Phrase-level translation for Recall Mode does not appear to be the same as the
  current dictionary card translation API. Define an endpoint/contract for
  translating and caching practice phrase prompts before building full Recall UI
  or Shadow Mode Show Translation.
- In Recall Mode, clicking a translated word should eventually map back to an
  original-language token or span and open the normal dictionary card for that
  original-language candidate. Do not make "word click unavailable in Recall" the
  target behavior. The exact implementation is unresolved: likely candidates are
  precomputed phrase translation alignment or contextual reverse lookup using the
  clicked translated word, translated phrase, and original phrase. This needs a
  speed/accuracy experiment and probably caching.

### Source And Readiness Group

Show a compact status area in the ribbon header:

- current text source, usually without the literal label `Text`;
- phrase count;
- practice readiness chip.

The text-source menu can stay accessible through a dropdown. Normal learners do
not need to read provider names unless they are choosing a source or diagnosing
a problem. The internal product term is `Text Source`, but the default UI label
should stay simple, such as `Dutch captions`, `Dutch auto-captions`, or
`ASR transcript`, rather than printing `Text source:`.

Preferred user-facing text-source labels:

- uploaded/provided YouTube captions: `{Language} captions`, for example
  `Dutch captions`;
- YouTube auto-generated captions: `{Language} auto-captions`, for example
  `Dutch auto-captions`;
- ASR-generated text: `ASR transcript`.

Proposed readiness vocabulary:

- `No captions`: practice is unavailable for the current video/source.
- `Rough`: text may be available, but timing or retrieval quality is degraded or has
  warnings.
- `Ready`: phrase practice is usable now, but better timing may be possible.
- `Precise`: best available practice state, with high-confidence timing from
  ASR/alignment/word timing or sufficiently good manual phrase boundaries.
- `Improving...`: an ASR/alignment job is running and normal caption practice can
  continue while waiting.

The chip should describe learner-facing usefulness, not the implementation
mechanism. Technical details such as ASR, selected source, cue source, backend
provider, cache state, and warnings should live in a hover/click details popover.
This is a product contract proposal, not yet fully backed by API fields. The
backend/extension should later expose enough structured metadata to drive it.

The chip is not meant to teach users the transcript pipeline. It should be a
quiet status/action signal:

- `Precise`: already in the best available mode; no action needed.
- `Ready`: usable now, but there may be an improvement action such as ASR timing.
- `Rough`: usable only as a degraded fallback.
- `Improving...`: improvement is running.
- `No captions`: phrase practice is unavailable.

Do not show normal users provenance warnings just because display text and timing
evidence differ. If the result is good, show `Precise`. Keep detailed warnings in
diagnostics/details.

The default visible label should avoid implementation words such as `manual`,
`exact`, `yt-dlp`, `timedtext`, and `provider`. A normal state should read more
like `Dutch captions` plus a readiness chip such as `Ready` or `Precise`. The
technical provenance can still appear in details/debug surfaces.

Avoid the phrase `backend provider`. In project language, `yt-dlp` is a subtitle
extractor, Supadata is a subtitle provider, and the AudioFilms backend is the API
orchestrator that may use either one. These details belong in details/debug, not
the default learner-facing label.

When display text and timing evidence differ, the default UI should still show a
single simple label such as `Dutch captions` plus the readiness chip. The
details popover should disclose both layers separately, for example:

- Text: Dutch captions.
- Timing: cue timing, approximate split timing, auto-caption timing, ASR word
  timing, or aligned timing.

### Dictionary Group

Dictionary should be a learning aid, not an account/setup panel.

Do not show the dictionary panel before a word is selected. The ordinary
watching/practice state should stay focused on the YouTube video and phrase
ribbon, without a persistent right-column "Click a word" or account setup card.

After a word is selected, the dictionary panel should be sticky: keep it open
while the learner replays, moves to another phrase, or resumes playback. Close
it only when the learner explicitly closes/collapses it, selects another word,
or navigates to another video. The context shown in the card should remain the
context of the selected word, not automatically jump with playback.

When a word is selected, show:

- selected clicked form as the lookup target;
- the dictionary lemma/headword when it differs from the clicked form, for
  example `gebouwd -> bouwen`;
- current phrase context only as a quiet one-line reference, not as a large block
  that duplicates the phrase ribbon;
- one or more dictionary cards;
- compact metadata chips:
  - part of speech;
  - language;
  - dictionary/source;
  - frequency/list markers such as `2K` when supplied by 2000NL;
  - gender/form hints when useful.

Avoid rendering metadata as plain text strings such as `ww · VanDale Dutch`.
These should read as small chips or tags.

Dictionary card anatomy:

- Header: lemma/headword, clicked-form relationship when relevant, compact chips.
- Summary: short dictionary-language definition, with at most one immediately
  visible example if useful.
- Expand/collapse: a small control should reveal the full rich card content,
  including additional meanings, examples, idioms, forms, and notes. Heavy cards
  should not force every detail into the default collapsed view.
- Rich content sections should be visually distinguishable: definitions,
  examples, idioms, forms, and notes should not run together as plain paragraphs.
- Translation overlay: card-level `Translate` can reveal translations alongside
  the relevant definition/example/idiom lines, similar to the 2000NL original
  plus translation rendering. This is separate from phrase-level `Show
  Translation`.
- Personal encounter footer: optional quiet chips such as `Seen 55x` and
  `Last 3d` may appear if the backend supplies them. Avoid making this a strong
  signal; it should be a lightweight memory cue, not the main card content.

Open dictionary-card data questions:

- Does 2000NL already return clicked-form to lemma/headword mapping, or does
  AudioFilms need a backend NLP/lemmatization step?
- What minimal personal encounter fields should 2000NL expose for the extension:
  seen count, clicked count, last seen, or only a combined active encounter
  signal?
- Should list membership/frequency rank beyond `2K` be shown in the YouTube
  panel, or reserved for the main 2000NL/app review surfaces?

The `Disconnect` button currently appears inside the selected-word area and is
too prominent. It should move behind the account chip/menu in the dictionary
header or an account/settings popover.

Account state belongs in a small header/overflow surface, not inside dictionary
meaning cards. Dictionary cards should not show large `Connect` or `Disconnect`
buttons. If an action requires a 2000NL session, open a compact connect prompt or
account popover and then retry or let the learner retry the original action.

### Dictionary Action Group

Card actions need state-aware hierarchy.

For a word/card that is not in the learner's active study flow, likely visible
actions are:

- Learn or Start learning;
- Mark known.

For a word/card already being reviewed, likely visible actions are:

- Again;
- Hard;
- Good;
- Easy.

The current UI displays Start, Known, Again, Good, and Translate together for
every card, with disabled buttons mixed into the primary row. That makes the
card look noisy and semantically wrong.

Translation is not the same kind of action as review grading. It should be
separate: a secondary link/button in the dictionary card, an overflow action, or
an expandable translation section.

The backend should project card progress and return `displayActions` as the
only UI action source. Raw platform capabilities belong in diagnostics, not in
the rendered action row. A not-started or encountered card should not show
review grades. A learning or reviewing card should show the four-grade row
(`Again`, `Hard`, `Good`, `Easy`) when the backend supports those outcomes.

`Translate` should not sit in the review row. It can be a small secondary chip or
icon near the headword/card header, used when the learner needs an additional
translation beyond the monolingual dictionary definition.

Open translation-language question:

- 2000NL should be the source of truth for the learner's translation target
  language. The extension should not introduce a competing primary translation
  language setting. AudioFilms should expose the connected 2000NL preference
  through session metadata and allow dictionary-card translation requests to omit
  `targetLang` during normal use.

### Diagnostics Group

Debug, Copy Debug, Refresh Cache, and Mark Issue are important during dogfood.
They should be discoverable but visually quiet:

- an overflow menu in the phrase ribbon;
- a debug/details drawer;
- a hidden-by-default advanced mode;
- or a small issue/debug icon group separated from learning controls.

Mark Issue is more user-facing than Copy Debug, but still secondary. It may
deserve a compact warning/flag icon with a label only when the ribbon is wide.
Debug, Copy Debug, Refresh Cache, and Mark Issue should not sit in the primary
playback control row. They can live behind a subtle bug/overflow control in the
ribbon header/footer.

`Get captions` and `Improve timing` are not playback controls and should be
visually separated from Previous/Replay/Next. They may live in the readiness
chip popover, near the right side of the ribbon, or as compact secondary chips.
The designer should propose the exact placement and hierarchy.

An optional `Open YouTube transcript` utility shortcut may be useful because the
native YouTube transcript panel is hard to reach. Treat it as a convenience
shortcut, not as a primary AudioFilms learning control and not as the product's
transcript data source. It should be visually secondary, such as a small icon
button near secondary controls or in overflow.

## ASR And Transcript Intent

ASR/transcription should not start automatically on every video open. It can
take minutes and consume resources. The UI should instead communicate current
availability and let the user trigger ASR manually for videos they actually want
to practice deeply.

Desired default behavior:

- On video open, use cheap/browser-visible caption data when it is available.
- Avoid automatically triggering expensive or block-prone backend retrieval for
  casual video opens during dogfood/testing.
- Show a compact quality/status signal.
- If ASR/alignment data already exists in cache, show the final state directly.
- If better captions or ASR are possible but require backend work, show quiet
  user-initiated actions such as "Get captions" or "Improve timing" rather than
  starting them automatically.
- If ASR is running, show progress without blocking normal caption practice.
- If ASR fails, degrade back to normal captions and make failure inspectable in
  diagnostics.
- If ASR/alignment progress is available from the backend, the `Improving...`
  chip may show progress inline, such as a subtle fill state or percentage. If
  progress/ETA is not reliable, keep the state simple rather than inventing fake
  precision.

Current resource policy:

- Browser-visible YouTube captions are cheap enough to attempt automatically.
- Backend subtitle extraction can be user-initiated for now, because repeated
  `yt-dlp`/provider requests during rapid testing may trigger rate limits or
  blocks.
- ASR/alignment is user-initiated because it can take minutes and consumes
  compute.
- User-initiated backend actions should be confirmed or started from a popover,
  not by accidental single-click on the main learning controls.
- Keep `Get captions` and `Improve timing` as separate user actions for now:
  `Get captions` retrieves usable subtitle text through the backend, while
  `Improve timing` starts ASR/alignment work for better phrase boundaries.
- After a successful `Get captions`, automatically apply the returned captions
  to the current video if the user is still on that video. The user already
  expressed intent by starting the action; do not require a second "apply" step.
- User-facing readiness copy should avoid technical phrases such as "timing text
  degraded." Prefer simpler wording such as "Captions found, but phrase timing is
  not precise" in hover/popover text, with full technical details reserved for
  diagnostics.
- When good uploaded captions are available, prefer them as display text over
  ASR or auto-generated text by default. ASR is primarily valuable as timing
  evidence. If uploaded captions are not available, prefer ASR text plus ASR
  timing over YouTube auto-captions by default, while still allowing the learner
  to choose auto-captions when they happen to be better.
- Alignment is tied to a display-text/timing-evidence pair. If the user switches
  display text from uploaded captions to auto-captions or ASR text, the system
  may need a separate alignment result for that pair rather than assuming one ASR
  timing artifact fits every text source. If this pairwise alignment is cheap and
  fast, run it automatically in the background after the text-source switch,
  temporarily show `Improving...` or a subtle transitional state, then return to
  `Precise` when the alignment is ready.
- ASR transcription and pairwise alignment results should be cached by the
  backend so returning to the same video and source combination is fast for the
  same user and, where allowed, for other users.

Open product/API question:

- What exact metadata should the backend return so the UI can distinguish raw
  captions, normalized phrases, ASR timing, clean text aligned to ASR timing,
  cached ASR result, pending ASR job, and failed ASR job?
- How should ASR/alignment jobs be keyed: by video only, by ASR audio/timing
  artifact, or by a specific display-text source plus timing evidence pair?
- Should backend subtitle extraction remain user-initiated in production, or is
  this only a dogfood/testing throttle until caching and quota controls are
  stronger?

## Interaction Contracts

Keyboard behavior:

- Space toggles normal YouTube play/pause and exits guided phrase playback.
- ArrowRight moves to the next phrase.
- ArrowLeft moves to the previous phrase.
- ArrowDown replays the current phrase.
- ArrowUp temporarily reveals or hides the original text for the current phrase.
- `S` toggles sticky `Show Original` for Shadow Mode.
- `T` toggles inline `Show Translation` for the current phrase.
- `1` switches to Shadow Mode.
- `2` switches to Recall Mode.

Mouse behavior:

- Clicking a word in the phrase opens the dictionary panel for that word.
- In translation recall mode, clicking a translated word may need a reverse
  lookup flow that maps the translated word or phrase back to the original
  language candidate before opening the normal dictionary card.
- Clicking replay/previous/next enters guided phrase mode.
- Text Source selection should keep the last working text source if the selected
  source fails.
- Account connect/disconnect should not interrupt lookup unless the action is
  explicitly chosen.

Error/degraded behavior:

- No captions: hide phrase playback controls and show a clear empty state, but
  keep the compact readiness/action surface available when backend retrieval can
  offer `Get captions`.
- Backend retrieval/provider failure: show a compact degraded state, not stale phrases.
- Text Source switch failure: keep the previous working text source visible and
  annotate the failed source in the selector.
- Dictionary miss: keep phrase context visible and show a calm no-match state.

## Known Visual Problems In Current UI

- Too many equally weighted buttons in the phrase ribbon.
- Debug and cache controls compete with learning controls.
- `Disconnect` is shown as a large primary-looking button inside the dictionary
  word card.
- Dictionary metadata is rendered as plain text instead of chips/tags.
- Card actions are not state-aware enough; unavailable actions are visible as
  disabled buttons instead of being hidden or grouped.
- Translation is mixed with learning/review actions.
- The account state is split between a header chip and a large action button.
- Dictionary cards feel utilitarian and dense rather than elegant learner cards.
- Technical provenance details are useful but too verbose for default UI.

## Implementation Gaps Behind This UI

These are product/backend dependencies exposed by the desired UI. They should be
tracked separately from visual regrouping work.

- Practice readiness metadata: backend/extension must expose enough structured
  state to drive `No captions`, `Rough`, `Ready`, `Precise`, and `Improving...`.
- User-initiated `Get captions`: backend retrieval/extraction/provider fallback
  should be callable on demand and should apply returned captions to the current
  video when successful.
- User-initiated `Improve timing`: ASR/alignment should run as a job with status,
  optional progress, cached results, and no automatic start on casual video open.
- Pairwise alignment cache: when display text changes after ASR, the backend may
  need a cached alignment per video plus text-source/timing-evidence pair.
- Phrase translation cache: Shadow Mode `Show Translation` and Recall Mode can
  share the same whole-phrase translation artifact.
- Recall phrase translation: Recall Mode needs phrase-level translation of the
  current practice phrase, separate from dictionary card translation, with cache
  and backend-selected provider policy. Shadow Mode Show Translation can reuse
  the same artifact as an inline comprehension aid.
- Recall reverse lookup: clicking a translated word should map back to an
  original-language token/span; implementation needs an accuracy/speed experiment
  between precomputed alignment and contextual reverse lookup.
- 2000NL translation target: 2000NL should provide or imply the learner's
  translation target language so the extension does not own a competing setting.
- Dictionary action state: backend card data should clearly tell the extension
  whether to show Learn/Known or the four review grades.
- Dictionary card anatomy: backend should expose clicked form, lemma/headword,
  compact chips, rich sections, optional line-level translation overlays, and
  minimal personal encounter signals without requiring the extension to parse raw
  dictionary payloads.
- Encounter/action logging: backend/2000NL should decide how YouTube word clicks,
  card views, Learn/Known/review actions, and later review surfaces contribute to
  `Seen`/`Last` personal encounter signals.
- Optional YouTube transcript shortcut: opening the native transcript panel is a
  utility action and should not become the product's transcript retrieval policy.

## Dictionary Panel Refinement Intent

Status: draft refinement from June 22 dogfood feedback. This section narrows the
Dictionary V2 presentation target without changing the 2000NL platform boundary.

### Header And Account

The dictionary panel header should answer the current lookup first:

- first line: the clicked form, for example `opbouwen`;
- second line: match count, for example `3 cards found`;
- account identity is a compact icon control in the main panel header, not a
  prominent email pill or a separate mini-card;
- the icon opens the existing connect/account popover and may show connected
  state through color, tooltip, and accessible label.

The account email is useful in the popover/details state, but it should not
compete with the dictionary answer in the default panel header.

### Remove Introductory Blocks

Once lookup cards are available, the default body should start with the first
Dictionary Meaning Card. Do not show these introductory blocks above the cards:

- selected-word recap card;
- `Personal progress on`;
- default context block;
- `3 DICTIONARY CARDS`;
- `Dictionary match`.

The clicked form and card count belong in the sticky header. The original phrase
context is already visible in the phrase ribbon, so it should not be repeated as
a default dictionary-card preface. A small context icon may exist only as a
quiet "why this lookup?" affordance for narrow layouts, scrolled panels, or
diagnostics where the lookup payload needs to be checked without relying on the
currently visible phrase.

### Card Anatomy

Each Dictionary Meaning Card should render the dictionary match as the card
title. If the clicked form and lemma differ, do not print `clicked -> lemma` in
the card title; the clicked form is already the panel title. For example:

- panel title: `zware`;
- card title: `bevalling`;
- no visible `zware -> bevalling` prefix.

Render metadata chips only when they add learner value:

- keep part-of-speech chips such as `zn`, `ww`, or `bn`;
- render `de`/`het` before a noun title as a subdued article marker with smaller
  type, following the 2000NL training-card convention;
- hide a generic `nl` language chip for a single-language Dutch lookup panel;
- avoid showing both `nl` and `de` as equal chips, because one is language
  metadata and the other is a Dutch article.

Article placement depends on explicit backend-projected article metadata. The UI
may decide where that metadata renders, but it must not infer `de`/`het` from
the headword or arbitrary chip labels. 2000NL already has this data; AudioFilms
should preserve it in the overlay contract.

Source metadata should stay as a quiet source chip if the panel later supports
multiple dictionary sources. The normal label should come directly from
`dictionary.name` and should already be concise, for example `VanDale` rather
than `VanDale Dutch`, because the panel language is already known from the lookup
context.

The extension should not own source-label cleanup rules and the backend should
not introduce a parallel chip-label source of truth just to repair source names.
If the payload currently exposes `dictionary.name = "VanDale Dutch"` but the
desired learner-facing source label is `VanDale`, fix `dictionary.name` in the
AudioFilms backend projection or 2000NL platform payload. `entry.languageCode`
is backend metadata and should not be rendered as a normal learner-facing chip in
this single-language dictionary panel.

### Examples And Expansion

The current `Details` section should become learner-facing examples:

- label the section `Examples` or `Show examples`;
- use an explicit expand/collapse icon button rather than the browser default
  disclosure arrow;
- remove per-example headings such as `Example`; each example block is enough;
- include a sticky panel-level expand/collapse-all button near the card header;
- remember the expand/collapse-all preference globally for the extension user.

Default recommendation: collapsed examples by default on narrow panels, with the
global extension-user preference taking precedence after the user changes it.

### Translation Behavior

Dictionary-card translation is a per-card, explicit reveal:

- replace long `Translate` text buttons with compact icon buttons;
- translated text appears directly under the translated word, definition,
  phrase, or example, matching the 2000NL training-card pattern;
- pressing the translation button again hides that card's translations;
- translation state is per card and should not be confused with phrase-level
  `Show Translation`.

The first implementation may use block-level card translation if line-level
section ids are not yet stable. The target remains line-level placement under
the translated text element.

### Progress Actions And Feedback

Do not render the word `Progress` above action buttons. The buttons themselves
are the progress controls.

New cards should show the backend-provided/current contract labels `Learn` and
`Known`. Learning/review cards should show the backend-provided/current contract
labels `Again`, `Hard`, `Good`, `Easy`. Do not localize these labels in the
YouTube overlay in this slice. The UI may support interface-language-dependent
labels later, but submitted platform action and result ids must remain the 2000NL
contract values.

Every action click must visibly register:

- pressed/loading state immediately on click;
- success feedback after the refreshed lookup returns, for example a subtle
  background change and `Started learning`;
- failure feedback without moving the card unexpectedly;
- no card jump caused by layout collapse, focus movement, or body rerender.

If an already-learning card still shows only `Learn`/`Known`, treat that as a
contract/debugging issue before inventing local state. The investigation should
verify whether 2000NL sent the wrong display actions, AudioFilms projected them
incorrectly, or the extension rendered the wrong group.

### Visual System

The phrase ribbon, dictionary panel, and floating AudioFilms On/Off toggle should
share one theme system. The target is automatic system light/dark mode with a
manual override in the extension UI. The override applies only to AudioFilms
extension surfaces, not to the underlying YouTube page.

Use the 2000NL training-card design guide as the primary visual reference:

- Lexend-like display treatment for learner-facing labels where feasible;
- translated text directly below source text, with the existing 2000NL
  translation tones;
- subdued part-of-speech and article metadata;
- restrained card surfaces and stable spacing.

For the YouTube overlay, prefer stricter controls than the main 2000NL card:

- square or rectangular controls with modest 6-8px corner radius;
- compact lucide-style icons for close, account, translate, expand/collapse,
  expand/collapse all, and theme;
- small, quiet, rectangular chips with dense but readable spacing;
- no oval/pill chips for system UI controls or metadata chips;
- no large explanatory UI text for actions that are clear from icon, tooltip,
  and accessible label.

The `Phrase navigation` chip is not useful as a default label. Phrase position
and playback controls already communicate the mode; keep any guided-navigation
diagnostic label inside details/debug unless a later design review gives it a
clear learner-facing role.

## Files For Design Review

Start here:

- `extensions/youtube-shadowing/src/content.js`
  - phrase ribbon creation: `createRibbonPanel`;
  - dictionary panel creation: `createDictionaryPanel`;
  - ribbon render state: `renderRibbon`;
  - dictionary render state: `renderDictionary`, `renderSelectedWordCard`,
    `renderDictionaryLookup`, `renderOverlayCard`, `renderReviewActions`;
  - dictionary action handlers: `performDictionaryCardAction`,
    `requestDictionaryCardTranslation`.
- `extensions/youtube-shadowing/src/shadow.css`
  - all Shadow DOM UI styling for the phrase ribbon and dictionary panel.
- `extensions/youtube-shadowing/src/content.css`
  - minimal global helper styling for the page toggle and transcript debug state.
- `extensions/youtube-shadowing/src/captionTracks.js`
  - source labels, language grouping, and source metadata formatting.
- `extensions/youtube-shadowing/src/transcriptRetrieval.js`
  - retrieval result metadata and warnings.
- `extensions/youtube-shadowing/src/serviceWorker.js`
  - backend fetch bridge and 2000NL connect/disconnect flow.

Backend contracts to inspect:

- `app/src/types/subtitles.ts`
  - subtitle/source metadata fields.
- `app/src/types/dictionary.ts`
  - dictionary overlay card shape and available actions.
- `app/src/app/api/dict/route.ts`
  - lookup endpoint.
- `app/src/app/api/dict/actions/route.ts`
  - card actions currently supported.
- `app/src/app/api/dict/translation/route.ts`
  - translation endpoint, separate from review actions.
- `app/src/app/api/asr/jobs/route.ts`
  - async ASR job endpoint.
- `app/src/app/api/local-asr-practice/route.ts`
  - older private local ASR dogfood path.

Product context:

- `extensions/youtube-shadowing/README.md`
- `docs/intent/youtube-extension-agent-runbook.md`
- `docs/intent/subtitle-practice-contract.md`
- `docs/exec-plans/active/subtitle-source-quality-shootout.md`
- `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`

## Prompt For The Senior Designer

Please review the attached screenshot and the files above. We are not asking for
a decorative restyle first; we need a clearer information architecture and
interaction model for the extension UI.

Focus on:

- regrouping always-visible learning controls versus occasional tools;
- making text-source and practice-readiness state compact but understandable;
- making the dictionary panel feel like a polished learner aid;
- moving account actions, debug actions, cache refresh, and diagnostics into
  lower-priority surfaces;
- defining state-aware dictionary card actions;
- proposing how `Improve timing` and ASR availability should appear without
  implying ASR starts automatically;
- distinguishing `Get captions` from `Improve timing` in the readiness popover;
- identifying which information is mandatory, optional, or diagnostic-only.

Deliverables requested:

- proposed layout hierarchy for the phrase ribbon and dictionary panel;
- recommended grouping for primary, secondary, and diagnostic controls;
- visual treatment for text-source, practice-readiness, and ASR/improvement states;
- dictionary card treatment, including metadata chips and action states;
- any API metadata gaps that block the desired UI state model.
