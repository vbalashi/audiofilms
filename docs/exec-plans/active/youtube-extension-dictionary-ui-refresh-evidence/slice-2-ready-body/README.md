# Slice 2 Ready Body Evidence

Captured: June 22, 2026.

## Files

- `opbouwen-ready-body.png`: Chrome screenshot after reloading the extension and
  opening `opbouwen`.
- `opbouwen-ready-body-dom.json`: DOM snapshot and assertions for ready
  dictionary body structure.

## Verification

Passed checks:

- header still shows `opbouwen` and `3 cards found`;
- first dictionary body element is `.af-overlay-card`;
- `.af-dictionary-card-selected` is absent in ready card state;
- context block is absent in ready card state;
- lookup placeholder/preface is absent in ready card state;
- body no longer starts with `3 dictionary cards` or `Dictionary match`;
- all 3 `opbouwen` cards render.

## Notes

Loading, error, no-match, and legacy flat-result paths still use the explicit
lookup placeholder/wrapper. This slice only changes the ready `cards[]` path.
