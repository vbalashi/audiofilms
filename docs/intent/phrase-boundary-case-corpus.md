# Phrase Boundary Case Corpus

## Purpose

Phrase-boundary reports capture cases where captions are split, merged, or grouped
incorrectly for learner practice. The goal is to turn real dogfood failures into
repeatable backend tests for `normalizePracticePhrases`.

This is the category-specific pipeline for `phrase-boundary`. The cross-category
report registry lives in `docs/intent/issue-report-taxonomy.md`.

## Pipeline

1. Raw capture
   - The YouTube extension quick action `Bad Split` submits an issue report with
     category `phrase-boundary`.
   - The report includes diagnostics plus `phraseBoundaryCase`.
   - `phraseBoundaryCase.status` is `raw`.
   - Raw reports are stored by the existing issue-report backend under the
     AudioFilms data directory.

2. Review and curation
   - A maintainer reviews raw cases in context.
   - The reviewer decides whether neighboring captions should be merged into one
     normal phrase, grouped as replay segments with one `displayText`, or left
     separate.
   - The reviewed shape becomes a curated fixture.
   - False positives are marked as ignored so they stop appearing in the raw
     work queue.

3. Regression tests
   - Curated fixtures become focused tests for `normalizePracticePhrases`.
   - Tests should preserve the raw phrase window in the fixture so future changes
     can explain why the expected behavior exists.

## Helper Script

Use `app/scripts/issue-report-cases.mjs` to turn collected issue reports into an
agent work queue.

List unreviewed phrase-boundary reports and show the captured phrase window:

```bash
node app/scripts/issue-report-cases.mjs list --kind bad-split --window
```

Show one report in detail:

```bash
node app/scripts/issue-report-cases.mjs show <report-id>
```

Confirm that a raw report is a real sentence-join scenario:

```bash
node app/scripts/issue-report-cases.mjs curate <report-id> \
  --scenario sentence-join \
  --note "Neighboring captions should share one display sentence."
```

Mark an accidental click or unrelated report as a false positive:

```bash
node app/scripts/issue-report-cases.mjs ignore <report-id> \
  --reason "False positive: caption split is acceptable."
```

The script writes reviewed records under:

- `app/test-fixtures/issue-reports/curated/<category>/`
- `app/test-fixtures/issue-reports/ignored/<category>/`

By default, `list` hides report ids that already have a curated or ignored
review file. Use `--all` to include them again.

For local filesystem access, the script reads
`AUDIOFILMS_DATA_DIR/issue-reports` or `app/.issue-reports`. For remote read-only
listing, use:

```bash
node app/scripts/issue-report-cases.mjs list \
  --api https://audiofilms-api.dilum.io \
  --token "$AUDIOFILMS_TESTER_TOKEN" \
  --kind bad-split \
  --window
```

## Raw Case Shape

`phraseBoundaryCase` should contain:

- `kind`: `audiofilms-phrase-boundary-raw-case`
- `schemaVersion`
- `status`: `raw`
- `reason`
- `video.id` and `video.url`
- selected source metadata
- transcript result summary
- `currentIndex`
- `currentPhrase`
- `phraseWindow`, normally current phrase plus two neighbors before and after
- `expectedReview.task`, explaining the curation decision needed

## Notes

- Raw reports are evidence, not tests. Do not assert against them directly.
- Curated fixtures should be small and intentional.
- Backend phrase grouping owns the final behavior; the extension only captures
  evidence and displays backend-provided grouping fields.
