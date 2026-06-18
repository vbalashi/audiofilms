# YouTube Extension Architect Review Package

This package is for a senior architect review of the AudioFilms YouTube extension together with the 2000NL platform boundary.

Start with:

1. `ARCHITECT_PROMPT.md`
2. `audiofilms/docs/intent/youtube-extension-designer-brief.md`
3. `audiofilms/docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
4. `audiofilms/docs/adr/0002-2000nl-dictionary-platform-boundary.md`
5. `audiofilms/docs/design-handoff/youtube-extension-architect-review/2000NL_PLATFORM_API_EXCERPT.md`
6. `2000nl/docs/reference/connect-api.md`

The package intentionally excludes old AudioFilms extension MVP/stabilization plans as primary review material. Those documents remain in the repository as historical context, but the current source of truth is the designer brief plus backend/UI contract.

The package also uses a focused 2000NL Platform API excerpt instead of the full
reference document as review guidance. The full 2000NL repository remains source
truth, but older request examples that ask for user state should not be read as
AudioFilms current `/api/dict` behavior.

The included 2000NL references reflect the latest platform alignment pass:
lookup echoes V2 request metadata, no-result lookup keeps the same request
shape, normalized dictionary content is exposed, and word-to-definition card
capabilities contain only card actions.

Primary review topics:

- Fail-closed write identity and Chrome service worker token ownership.
- AudioFilms / 2000NL auth and proxy boundary.
- Dictionary card V2 projection.
- `displayActions` versus 2000NL card capabilities/platform actions.
- `hidden` versus `known` progress-state normalization.
- Translation target language ownership.
- 2000NL generic text translation versus dictionary-card translation.
- `Get Captions`, `Improve Timing`, and Practice Readiness contracts.
- Current `/api/get-subs`, `/api/asr/jobs`, and 2000NL platform helper behavior.
- Current dictionary provider factory behavior, including 2000NL env-token and
  user-state handling.
