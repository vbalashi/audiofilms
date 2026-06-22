# Slice 3 Card Title And Metadata Evidence

Captured: June 22, 2026.

## Files

- `zware-card-metadata.png`: Chrome screenshot after reloading the extension and
  opening `zware`.
- `zware-card-metadata-dom.json`: DOM snapshot and browser assertions for
  current remote API data.

## Verification

Automated checks passed:

- `npm run test:dictionary -- --run tests/dictionary/overlayProjection.test.ts`
  passed from `app/`.
- `node --check extensions/youtube-shadowing/src/content.js` passed.
- Browser DOM smoke on `zware` passed:
  - header title is `zware`;
  - first sampled card titles no longer contain `->`;
  - `nl` is not rendered as a chip;
  - `de`/`het` are not rendered as ordinary chips;
  - source chip is rendered from backend-provided dictionary metadata;
  - chip radius is `4px`.

Projection contract coverage added:

- `article` is explicit overlay metadata from backend projection;
- `partOfSpeech` is explicit overlay metadata;
- `dictionary.name = "VanDale Dutch"` is projected to concise
  `dictionary.name = "VanDale"`;
- `chips[]` no longer contains language, dictionary, or article/form display
  chips.

## Notes

The live extension smoke still hits the remote `https://audiofilms-api.dilum.io`
API. At capture time, that remote response still exposed `VanDale Dutch` and did
not expose the new `article` overlay field. The browser smoke therefore proves
the UI filtering/title behavior against the current remote payload, while the
contract test proves the local backend projection that will supply `VanDale` and
explicit `article` after the backend code serving the extension includes this
slice.
