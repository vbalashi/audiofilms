# Issue Report Taxonomy

## Purpose

AudioFilms issue reports are raw dogfood evidence captured from the YouTube
shadowing extension. They are not all bugs and they are not tests by default.
Each report category must define:

- what user-visible problem it captures;
- what diagnostic payload is required;
- how agents filter the raw queue;
- how false positives are removed;
- where confirmed cases go next.

This document is the intent registry for report types. Add a section here before
adding a new quick action, specialized diagnostic payload, or regression corpus.

## Storage And Workflow

Raw reports are submitted to `POST /api/extension/issue-reports` and stored under
`AUDIOFILMS_DATA_DIR/issue-reports`, or `app/.issue-reports` during local runs.

Agent workflow:

1. List raw reports for one category.
2. Inspect the captured context.
3. Mark accidental or unrelated reports as ignored.
4. Curate confirmed reports into category-specific fixtures.
5. Turn curated fixtures into focused tests or manual validation checks.

Use the helper from `app/`:

```bash
npm run issue-reports -- list --category <category>
```

Reviewed records are written under:

- `app/test-fixtures/issue-reports/curated/<category>/`
- `app/test-fixtures/issue-reports/ignored/<category>/`

By default, the helper hides reports that already have a curated or ignored
review file. Use `--all` when auditing already processed reports.

## Categories

| Category | Current capture path | Required context | Downstream path |
| --- | --- | --- | --- |
| `phrase-boundary` | `Bad Split` quick action or `Mark Issue` | current phrase, +/- phrase window, selected source, transcript summary, video id/url | Curated fixtures for `normalizePracticePhrases` sentence grouping tests |
| `timing` | `Mark Issue` | current phrase, playback time, phrase start/end, recent replay/navigation events, selected source | Timing/replay regression fixture or playback smoke case |
| `navigation` | `Mark Issue` | current index, target command, previous/next/replay events, playback observations | Extension navigation smoke or playback regression log |
| `translation` | `Mark Issue` | source phrase, target language, translation text/error, translation id/policy when available | Phrase translation projection/backend contract tests |
| `dictionary` | `Mark Issue` or dictionary card report action | selected word/span, phrase context, source binding, card/action payload, lookup/translation state | Dictionary overlay/action contract tests or 2000NL platform issue |
| `ui-layout` | `Mark Issue` | viewport size, panel geometry/preferences, visible controls, theme/layout state | Extension geometry smoke fixture |
| `captions-source` | `Mark Issue` | selected source, available tracks, retrieval path/provider, warnings/errors, video id | Subtitle source selection/provider regression |
| `other` | `Mark Issue` | best available diagnostics plus user description | Triage manually; promote to a real category if repeated |

## Phrase Boundary

Intent: catch cases where captions are split, merged, or grouped incorrectly for
learning practice.

Filter:

```bash
npm run issue-reports -- list --kind bad-split --window
```

Curate:

```bash
npm run issue-reports -- curate <report-id> \
  --scenario sentence-join \
  --note "Neighboring captions should share one display sentence."
```

Ignore false positive:

```bash
npm run issue-reports -- ignore <report-id> \
  --reason "False positive: caption split is acceptable."
```

Confirmed fixtures should describe whether the expected behavior is:

- `merge-as-display-segment`: one full visible sentence, multiple replay
  segments;
- `merge-as-single-phrase`: one visible and replayed phrase;
- `keep-separate`: the raw split is acceptable.

Detailed corpus notes live in `docs/intent/phrase-boundary-case-corpus.md`.

## Timing

Intent: catch cases where audio starts, stops, pauses, or repeats at the wrong
moment even when phrase text is correct.

Filter:

```bash
npm run issue-reports -- list --category timing
```

Curated cases should preserve the expected replay start/end behavior and enough
recent playback observations to reproduce the miss. If the miss depends on a
specific browser interaction, link it to `docs/runbooks/youtube-shadowing-playback-regression-log.md`.

## Navigation

Intent: catch wrong `Replay`, `Previous`, `Next`, keyboard shortcut, or jump
behavior.

Filter:

```bash
npm run issue-reports -- list --category navigation
```

Curated cases should record the starting index, command, expected index, actual
index, and whether playback should have started or stopped.

## Translation

Intent: catch wrong phrase-level translation, missing translation, bad target
language, or translation display mismatch.

Filter:

```bash
npm run issue-reports -- list --category translation
```

Curated cases should separate:

- backend translation content problems;
- extension projection/display problems;
- recall-mode visibility or wrapping problems.

If the issue belongs to 2000NL platform translation, create or link a 2000NL
issue after preserving the AudioFilms evidence.

## Dictionary

Intent: catch wrong word lookup, wrong card projection, stale source binding,
broken card action, or card translation problems.

Filter:

```bash
npm run issue-reports -- list --category dictionary
```

Curated cases should preserve the clicked form, token offsets, phrase context,
source binding, card id/title when available, and the action or lookup result
that looked wrong.

If the problem is raw dictionary data or platform action state, keep the
AudioFilms report as evidence and create or link the owning 2000NL issue.

## UI Layout

Intent: catch overlap, clipping, unreadable text, wrong panel sizing, or bad
theme/layout behavior.

Filter:

```bash
npm run issue-reports -- list --category ui-layout
```

Curated cases should record viewport dimensions, panel geometry, active mode,
theme, font scale, and whether dictionary/debug panels were open. These cases
usually become extension geometry smoke checks, not backend tests.

## Captions Source

Intent: catch wrong caption source selection, stale source after navigation,
provider fallback surprises, missing track handling, or mismatched source badge.

Filter:

```bash
npm run issue-reports -- list --category captions-source
```

Curated cases should preserve video id, requested language, selected source,
available source list, retrieval path/provider, warnings, and visible source
label. These cases usually become subtitle source/provider fixtures.

## Adding A New Report Type

Before adding a new category or quick action:

1. Add the category to this document with capture intent and downstream path.
2. Add or confirm the backend category in `app/src/lib/extension/issueReports.ts`.
3. Add or confirm the extension label in
   `extensions/youtube-shadowing/src/content.js`.
4. Add helper aliases or specialized printing only when the generic category
   filter does not surface the right evidence.
5. Define where curated and ignored records should be written.

Do not add a quick action that only creates more raw data without a review path.
