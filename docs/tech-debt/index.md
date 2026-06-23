# Tech Debt

## Active Debt

### Validation Warnings Still Need Cleanup

- `app/npm run lint` and `app/npm run build` now pass again.
- The repo still emits non-blocking warnings around `baseline-browser-mapping` freshness and Next.js workspace root detection.
- These warnings should be cleaned up so validation output stays high-signal.

### Documentation Drift

- README roles have now been separated, but the content can still be tightened further.
- Dictionary history has been archived, but the maintained dictionary docs may still need one more pass after future provider changes.

### Environment And Provider Complexity

- subtitle behavior depends on provider selection, credentials, and optional `yt-dlp` availability.
- dictionary behavior depends on provider selection and model defaults.
- this is manageable, but it should stay centralized and not leak into ad hoc docs.

### Practice Cache Lineage And Invalidation

- The practice flow now has several related caches: provider subtitles, ASR
  artifacts, manual-text alignment results, practice snapshots/phrase sets, and
  phrase translation associations.
- These caches are not all governed by one explicit lifecycle policy. When
  segmentation, normalization, alignment, or translation policy changes, old
  artifacts may remain useful as evidence but should not silently drive the
  current learner experience.
- Analyze cache keys and revision fields end to end, especially
  `textSourceRevisionId`, `timingEvidenceRevisionId`, `phraseSetRevisionId`,
  `snapshotRevisionId`, source text hashes, and translation IDs.
- Decide how to mark stale artifacts, when to keep them for diagnostics, when to
  regenerate them, and how to explain the current active artifact in issue
  reports.
- Pay special attention to mixed-source cases such as manual captions with ASR
  timing, where a pure ASR transcript cache must not replace the selected
  manual text source.

## Next Good Cleanup Steps

- clean up remaining non-blocking validation warnings so `npm run lint` and `npm run build` stay high-signal,
- tighten README content so repo overview, setup, and architecture stay concise and non-overlapping,
- keep archived dictionary notes out of active guidance unless they are intentionally promoted back into maintained docs.
- define a cache lineage and invalidation policy for practice phrases, ASR
  timing, manual alignment, and phrase translations.
