# Phrase Boundary Case Corpus

## Purpose

Phrase-boundary reports capture cases where captions are split, merged, or grouped
incorrectly for learner practice. The goal is to turn real dogfood failures into
repeatable backend tests for `normalizePracticePhrases`.

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

3. Regression tests
   - Curated fixtures become focused tests for `normalizePracticePhrases`.
   - Tests should preserve the raw phrase window in the fixture so future changes
     can explain why the expected behavior exists.

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
