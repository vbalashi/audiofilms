# YouTube Extension Redesign Implementation Status

Date: 2026-06-18

This is a point-by-point status pass against the designer-review task after the
current UI implementation variation. The planned UI surfaces are now represented
in the extension. Remaining open items are backend/deploy validation blockers or
second-pass polish, not missing first-redesign UI elements.

## Backend / Environment Note

The extension default configuration points at the remote API:

- `https://audiofilms-api.dilum.io/api/get-subs`
- `https://audiofilms-api.dilum.io/api/asr/jobs`
- `https://audiofilms-api.dilum.io/api/dict`

The local `localhost:3000` path is local-regression smoke guidance only and
should not be treated as the default tester architecture.

Current external API finding:

- `https://audiofilms-api.dilum.io/api/health` works.
- `https://audiofilms-api.dilum.io/api/get-subs?...` works.
- After the June 19 redeploy, `https://audiofilms-api.dilum.io/api/dict/lookup`,
  `/api/practice/phrase-translations`, and `/api/practice/timing-jobs` are
  present on the public API and return JSON responses instead of Next.js HTML
  404 pages.
- Guest dictionary lookup is still not production-ready until the deployment has
  `DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN`; without it, `/api/dict/lookup`
  returns `guest_lookup_unavailable` unless the extension forwards a signed-in
  2000NL user Bearer token.

## Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Overall YouTube extension layout | Closed for first redesign | Ribbon and dictionary are separated into a bottom practice surface and right drawer. The ribbon now has top metadata, phrase area, grouped controls, shortcut hints, and responsive wrapping. Further visual refinement is still possible. |
| Primary phrase control grouping | Closed for first redesign | `Prev`, `Replay`, and `Next` are grouped as the primary phrase controls with shortcut tooltips. Icon-first controls remain a later polish choice. |
| Caption readiness/source chip | Closed for first redesign UI | Primary label uses learner-facing copy like `Dutch captions · Ready`; readiness states are `No captions`, `Rough`, `Ready`, `Precise`, and `Improving...`. The derivation is still UI-side heuristic until a backend `PracticeSnapshot` contract exists. |
| `Get Captions` action | Closed for first redesign UI | `Get Captions` is available inside the readiness/source popover and reuses the existing cache-refresh flow. A dedicated captions operation contract would be a backend refinement. |
| `Improve Timing` action | Closed for first redesign UI | `Improve Timing` is visible and enabled in the readiness/source popover. After the June 19 redeploy, the public timing route accepts tester-token requests and returns operation JSON; unauthenticated calls correctly return `asr_unauthorized`. |
| Utility/debug overflow | Closed for first redesign | `Mark Issue`, `Debug`, `Copy Debug`, and `Refresh Cache` live behind the utility overflow. Escape, click-away, mutual popover closing, `aria-haspopup`, and focus return are implemented. |
| Practice modes: `Shadow` / `Recall` | Closed for first redesign UI | Segmented controls and shortcuts `1` / `2` exist. Recall is selectable and shows a recall prompt; when phrase translation is unavailable it uses a clear unavailable state. |
| `Show Original` | Closed for first redesign UI | Renamed and wired to original visibility. In Recall it reveals/hides manually and resets on phrase navigation. In Shadow it remains the sticky display toggle. |
| `Show Translation` in Shadow | Closed for first redesign UI | Button is visible and interactive. It opens a phrase-translation lane; until phrase translation data exists the lane shows `Phrase translation unavailable`. |
| Stable phrase area dimensions | Closed for first redesign | Recall/translation lanes reserve space and the no-captions state hides controls, reducing layout jumps. Another density pass can still improve polish. |
| Clickable words | Closed for visible original text | Existing click behavior preserved. In Recall, translated-word reverse lookup is not implemented. |
| Right dictionary panel structure | Closed for first redesign UI | Drawer header, close action, account chip/menu, selected-word card, context, lookup states, and dictionary cards are separated. Dead selected-word `...` menu was removed. |
| Dictionary card anatomy | Closed for first redesign UI | Cards use clicked-form/headword relation, chips, summary, details, card translation action, personal chips, and separated progress actions when backend data exists. Real content quality still depends on the remote lookup route. |
| Progress actions by phase | Closed for UI contract | UI filters progress vs translation actions by `displayActions.group`. Hidden/frozen cards show no progress row when no progress actions are supplied. Correct phase labels depend on backend-projected `displayActions`. |
| Card-level `Translate` separation | Closed for first redesign UI | Card `Translate` is separated from progress actions. Remote dictionary route currently blocks end-to-end validation. |
| Account/sign-in/disconnect placement | Closed for first redesign | Large inline disconnect was removed from the selected-word card; account lives in a header chip popover with connect/disconnect action, click-away/Escape close, and focus return. |
| Signed-out state | Closed for first redesign UI | Guest lookup state and connect prompts are visible. Since remote lookup returns HTML 404, actual guest lookup data is currently blocked. |
| Lookup loading/no match/result/error | Closed for first redesign UI | Loading skeleton, no-match card, result card, retry action, and concise error state exist. Raw remote HTML/404 is suppressed. Successful result validation still needs a working remote route. |
| Card translation loading/ready/error | Closed for existing UI contract | Card translation renders inside the card with pending/ready/error text from the action result. Needs real remote route validation for content quality. |
| Responsive/narrow-width behavior | Closed for first redesign | Controls wrap by group, drawer remains visible in narrow geometry, and smoke geometry covers desktop/narrow viewports. Further visual polish is still useful. |
| Keyboard discoverability | Closed for first redesign | Shortcuts are wired, primary buttons have title hints, and the ribbon has a compact shortcut hint line. The header mode label now uses `Watching` / `Phrase navigation` instead of the less clear `Passive sync` / `Shortcuts active`. |
| Accessibility/focus behavior | Closed for first redesign | Buttons have labels where needed; popovers expose menu semantics; Escape/click-away close and focus return are implemented. Fuller arrow-key menu navigation can be a later enhancement. |

## Next Recommended Iteration

1. Configure `DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN` on the deployment, or rely
   only on signed-in forwarded-Bearer lookup during private dogfood.
2. Validate signed-in `/api/dict/lookup` from the extension against real 2000NL
   JSON responses.
3. Add or complete the phrase-level translation backend behavior so `Show Translation` and
   Recall can display real translation text instead of the unavailable state.
4. Tighten visual polish in a second pass: icon-first phrase controls, stronger
   density tuning, and fuller arrow-key menu navigation.
5. Run the original design checklist again after dictionary lookup works.
