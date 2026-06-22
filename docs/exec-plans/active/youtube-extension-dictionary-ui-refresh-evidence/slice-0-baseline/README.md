# Slice 0 Baseline Evidence

Captured: June 22, 2026.

## Files

- `youtube-opbouwen-ready-overlay.png`: Chrome screenshot with `opbouwen`
  lookup ready.
- `opbouwen-ready-dom-snapshot.json`: DOM snapshot for `opbouwen`.
- `youtube-opbouwen-overlay.png`: Chrome screenshot with `zware` lookup ready
  before returning to `opbouwen`.
- `youtube-dom-snapshot.json`: DOM snapshot for `zware`.

## Findings

`opbouwen` ready-state baseline:

- phrase count: `51 / 157`;
- current phrase: `In het gebruik van software en heroïsme kun je opbouwen en
  winnen tegen een Goliath.`;
- dictionary header still shows `Dictionary` / `Dutch`;
- account label is the full email `vbalashi@gmail.com`;
- body still shows selected-word recap, `Personal progress on`, context,
  `3 dictionary cards`, and `Dictionary match`;
- cards include `nl` and `VanDale Dutch` chips;
- second and third titles show `opbouwen -> constructief` and
  `opbouwen -> positief`;
- details summary is `Details`, with repeated `Example` labels;
- progress row label is `Progress`;
- action labels are current contract labels: `Learn`, `Known`.

`zware` ready-state baseline:

- phrase count: `53 / 157`;
- current phrase: `Met Palantir combineren ze grote hoeveelheden data om zware
  criminaliteit te bestrijden en aanslagen te voorkomen, zeggen ze.`;
- result has 10 cards;
- card titles use `zware -> ...`;
- noun cards show `de`/`het` as ordinary chips next to `zn`, `nl`, and
  `VanDale Dutch`;
- most cards show `Learn`/`Known`;
- the `zware -> dwingend` card shows `Again`, `Hard`, `Good`, `Easy`, plus
  quiet encounter chips `Seen 0x` and `Last 174d`.

The `zware` evidence proves the current extension can render review-grade
actions when the rendered card data exposes them. The suspicious `Learn`/`Known`
state is therefore per-card data/projection dependent, not a global UI inability
to render review actions.

## Limitation

An attempt to call `chrome.runtime.sendMessage` from the extension options page
through AppleScript did not expose `chrome.runtime` in that execution context.
Raw service-worker response capture is not available from this baseline without
adding temporary instrumentation or a dedicated debug helper. DOM snapshots are
sufficient for Slice 1 and Slice 2. Before Slice 3, use contract tests or add a
temporary read-only debug path if raw backend/projection payload evidence is
needed.
