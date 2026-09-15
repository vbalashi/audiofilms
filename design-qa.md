# AudioFilms Narrow SenseCard Design QA

Reference:
`/Users/khrustal/dev/2000nl/docs/architecture/evidence/sense-card-visual-spec-v1/20.10-single-sense-states.png`

Implementation fixture:
`extensions/youtube-shadowing/scripts/fixtures/sense-card-preview.html`

Final implementation screenshot:
`app/.extension-smoke-artifacts/sense-card-preview-v4.jpg`

Final combined comparison:
`app/.extension-smoke-artifacts/sense-card-reference-comparison-v4.jpg`

## Compared States

- translation off / learning;
- translation on / learning with review actions;
- translation on / known with undo.

## Iterations

### Iteration 1

Result: failed.

- learning border was neutral instead of accent;
- node translations were too bright and too heavy;
- sans typography and review labels were too heavy;
- progress dividers were too dense;
- card corners and inactive audio contrast needed refinement.

### Iteration 2

Result: failed.

- header controls needed circular outlines;
- example count needed a circular outline chip;
- definition weight remained slightly heavy.

### Iteration 3

Result: passed.

- no P0, P1, or P2 findings;
- one accepted P3 remains: inactive audio is slightly quieter than the approved
  reference because Platform V2 currently exposes an audio capability ID but
  AudioFilms does not yet have the matching playback bridge.

## Final Result

final result: passed
