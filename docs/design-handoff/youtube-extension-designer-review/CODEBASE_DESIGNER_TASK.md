# Codebase Designer Task: YouTube Extension UI/UX

You are working directly inside the AudioFilms codebase:

```text
/Users/khrustal/dev/audiofilms
```

This is a UI/UX design pass for the Chrome extension that runs on YouTube. Do
not implement code yet unless explicitly asked after the design review. Your job
is to inspect the existing intent, current UI, and relevant code surfaces, then
return a practical redesign proposal that a follow-up implementation agent can
build.

## Read First

Start here:

1. `docs/design-handoff/youtube-extension-designer-review/DESIGNER_PROMPT.md`
2. `docs/design-handoff/youtube-extension-designer-review/screenshots/01-current-youtube-extension.png`
3. `docs/intent/youtube-extension-designer-brief.md`
4. `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
5. `docs/adr/0002-2000nl-dictionary-platform-boundary.md`
6. `extensions/youtube-shadowing/README.md`

Useful background after the first pass:

- `docs/design-handoff/youtube-extension-architect-review/review01.md`
- `docs/design-handoff/youtube-extension-architect-review/review02.md`
- `docs/exec-plans/completed/youtube-extension-architect-review-audiofilms-action-plan.md`
- `docs/design-handoff/youtube-extension-architect-review/2000NL_PLATFORM_API_EXCERPT.md`

## Code Surfaces To Inspect

Focus on visual and interaction surfaces:

- `extensions/youtube-shadowing/src/content.js`
- `extensions/youtube-shadowing/src/config.js`
- `extensions/youtube-shadowing/src/serviceWorker.js`

Relevant backend contract surfaces:

- `app/src/app/api/dict/lookup/route.ts`
- `app/src/app/api/dict/session/route.ts`
- `app/src/app/api/dict/actions/route.ts`
- `app/src/app/api/dict/translation/route.ts`

Do not redesign backend architecture. These files are included so you can see
what states and fields the UI can rely on.

## Design Scope

Produce a redesign proposal for:

- overall YouTube extension layout;
- primary phrase control grouping;
- caption readiness/source chip and related actions;
- practice mode controls for `Shadow` and `Recall`;
- `Show Original` and `Show Translation` placement;
- right dictionary panel structure;
- dictionary card anatomy;
- account/sign-in/disconnect placement;
- utility/debug overflow behavior.

## Important Product Decisions

Treat these as fixed:

- The first redesign has two practice modes: `Shadow` and `Recall`.
- `Show Original` is sticky only in Shadow.
- `Show Translation` in Shadow is phrase-level translation.
- Dictionary-card `Translate` is separate from phrase translation.
- Caption readiness states are `No captions`, `Rough`, `Ready`, `Precise`,
  and `Improving...`.
- Text source labels should be human-readable:
  - `Dutch captions`
  - `Dutch auto-captions`
  - `ASR transcript`
- Do not show technical provider terms in primary UI:
  - no `manual`
  - no `exact`
  - no `timedtext`
  - no `yt-dlp`
  - no `provider`
- `Get Captions` and `Improve Timing` are separate actions.
- Dictionary progress actions are phase-dependent:
  - not-started/encountered: `Learn`, `Known`;
  - learning/reviewing: `Again`, `Hard`, `Good`, `Easy`;
  - hidden/frozen: no first-redesign progress row.

## Expected Output

Return:

1. Findings first: what is currently visually confusing or overweighted.
2. Recommended extension layout.
3. Control grouping proposal.
4. Caption readiness/source display proposal.
5. Right dictionary panel structure.
6. Dictionary card anatomy.
7. Key states:
   - no captions;
   - rough/ready/precise;
   - improving;
   - Shadow;
   - Recall;
   - signed out;
   - lookup loading/no match/result/error;
   - card translation loading/ready/error.
8. Component inventory with priority:
   - always visible;
   - secondary;
   - overflow/debug.
9. Implementation-sensitive notes:
   - stable dimensions;
   - overflow menus;
   - tooltips;
   - keyboard discoverability;
   - responsive/narrow-width behavior.

Do not produce implementation code in this pass. The next step will be a
separate implementation-agent prompt based on your design output.
