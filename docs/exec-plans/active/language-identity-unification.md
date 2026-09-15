# Language Identity Unification

Status: active

Owner: AudioFilms backend and YouTube shadowing extension

Architecture decision: [ADR-0005](../../adr/0005-language-identity-and-compatibility.md)

Owning issue: [AudioFilms #22](https://github.com/vbalashi/audiofilms/issues/22)

## Revised target: audio-track-bound practice (2026-09-15)

This section supersedes conflicting cache and completeness claims below and
defines the implementation target. ADR-0004 and ADR-0005 were amended to keep
their cache and language decisions consistent with this audio-bound model.

### Evidence and product requirement

For `i-UzXkjD_ew`, the user reports Dutch audio only. The supplied YouTube
Subtitles/CC screenshot lists Dutch (Netherlands) and English captions;
caption availability alone is not evidence of an English audio track.
The extension currently exposes English ASR-related rows and a separate
`ASR transcript (nl)` group. Audit their actual audio/text lineage before
assuming that their labels or stored language values are correct.

The practice selector must be scoped to the selected available audio track.
For the reported Dutch-only case, its conceptual contents are:

```text
Dutch (Netherlands) / nl-NL
├── YouTube transcript · YouTube timing
├── YouTube transcript · ASR timing
└── ASR transcript · ASR timing
```

The first two lines are states of the same caption source, not duplicate
selectable sources. Show its ASR timing enrichment when applicable. Keep the
literal ASR transcript as a separate text source within the Dutch group.
User-approved naming: each row explicitly shows text origin, then timing
origin, separated consistently by `·`. Language belongs in the parent group.
These labels supersede the earlier abbreviated `Dutch · ASR timing` and
standalone `ASR transcript` labels for this selector. YouTube transcript covers
YouTube-provided text; its manual/automatic provenance remains in source
metadata. Label timing by its verified origin, not simply by the presence of
an ASR job or cache entry.
English captions remain real provider inventory, but are excluded from this
audio-scoped practice selector when English audio is unavailable. Do not
delete those captions or fabricate an English audio/ASR option. Secondary
translation display is outside this change.

### Domain contract and authority

- AudioTrack: provider track locator, video identity, availability, language
  with evidence, and provenance `original | auto-dubbed | dubbed | unknown`.
  Provider-default and original are independent properties. Record metadata
  observation/completeness so missing information is not treated as confirmed
  absence of other tracks. Do not use expiring download URLs as stable IDs.
- TextSource: stable source identity, language, content fingerprint, and kind
  (provided captions, YouTube auto-captions, AudioFilms ASR). ASR text retains
  its parent audio artifact. A subtitle language never creates an audio track.
- AudioArtifact: selected track binding plus fingerprint of explicitly
  versioned normalized audio samples. Define normalization before hashing;
  video ID alone cannot distinguish dubbed tracks or changed audio.
- AsrArtifact: parent audio fingerprint, resolved recognition language,
  backend recognition profile, output language evidence, and provenance.
- AlignmentArtifact: exact ASR artifact revision, selected caption content
  and segmentation fingerprint, audio binding, algorithm/profile version,
  and measured applicability/quality.

The backend resolves and validates audio selection for all job entry points,
including direct worker/script calls. The extension sends a selected audio
track reference and optional caption reference, not a caption-derived ASR
language or a user-selected model. Download the resolved track explicitly;
never silently download a different default track on resolution failure.

### Defaults, unknown metadata, and language compatibility

- Honor an explicit available audio selection. Otherwise prefer a track with
  verified original metadata; absent that, use the provider's actual default
  audio without calling it original. Keep practice bound to audible playback;
  synchronize/verify a track switch or block incompatible practice.
- Show Original or Auto-dubbed only when supported by provider evidence.
  Missing provenance means omit the badge, not omit a usable audio track.
- An unknown audio language must never inherit the caption language. Resolve
  it from audio evidence/automatic detection and record uncertainty. If it
  remains unresolved, do not offer language-specific ASR/alignment claims.
- ASR language constraints come from verified audio metadata or detection.
  A requested English ASR job without an available English track fails before
  enqueueing. Never fall back to Dutch audio with an English recognition hint.
- UI grouping may associate bare `nl` with the single compatible `nl-NL`
  audio context. Preserve raw/canonical language evidence; do not invent an
  ASR region. Conflicting region/script variants remain distinct; ambiguous
  associations are not resolved by array order or label matching.
- Cross-language subtitles do not qualify for same-language forced alignment
  or a Precise badge. Cross-language alignment would need its own explicit
  algorithm and quality contract; it is out of scope here.

### Reuse and migration

- Shared reuse lookup uses normalized audio fingerprint, resolved recognition
  language, and backend-approved profile compatibility. User/account, host,
  CPU/GPU, and compute precision do not invalidate an accepted artifact.
- Record exact engine/model revision, device and compute type as provenance.
  Backend policy explicitly decides whether a newer profile requires new
  results or still accepts existing ones. Migration to GPU alone does not.
- Alignment changes can reuse ASR; subtitle choice, caption refresh, UI
  grouping and extension reload must not trigger another recognition pass.
- Concurrent equivalent requests share one job/artifact. New audio content
  or a genuinely different audio track must not reuse unrelated word timings.
- Audit existing suspect English jobs against downloaded audio and output
  evidence. Exclude unverifiable/mismatched artifacts from normal selection
  and reuse, retaining them for diagnosis. Rebind only with verified lineage;
  never blindly relabel all English results as Dutch or wipe the full cache.
- Migrate manifests and selection records versionedly. Reconstruct missing
  lineage where provable; do not promise reuse of unverifiable legacy output.

### Implementation order and acceptance gate

1. Capture the fixture's real audio/caption inventory and legacy result lineage.
2. Amend ADR-0004/0005 and define AudioTrack/TextSource/ASR/alignment contracts.
3. Implement backend audio resolution, explicit download selection, and job
   admission checks, including unknown metadata and direct-call coverage.
4. Implement machine-independent artifact reuse and conservative migration.
5. Bind the practice selector, grouping, saved selection and badges to audio;
   remove ambiguous source-kind labels and duplicate artifact rows.
6. Validate the following before declaring the unification complete:
   - Dutch-only audio plus Dutch/English captions: Dutch practice sources only;
     an English ASR request is rejected and queues zero recognition jobs.
   - Original Dutch plus verified English auto-dub: correct badges/default;
     explicit English selection downloads that track and binds its own ASR.
   - Missing original/dub metadata: no invented badge; actual available audio
     still works. Unknown language never inherits English from captions.
   - Audio switch, reload and YouTube SPA navigation cannot apply stale timing
     or restore a source bound to different audible audio.
   - `nl`/`nl-NL`, `pt-BR`/`pt-PT`, and `zh-Hans`/`zh-Hant` retain correct
     grouping, source identity and compatibility across frontend/backend.
   - Two users and a CPU-to-GPU migration reuse 100 verified existing artifacts
     without recognition; changed caption text reruns only alignment.
   - Changed audio, unapproved profile changes and mismatched legacy artifacts
     fail reuse; repeated simultaneous requests do not duplicate ASR work.

### Plan revision work record

- Work reference: #22; branch `codex/audio-track-plan`, based on `36b68d0`.
- Claimed scope: audio-track admission, grouping, labels, operation lineage,
  and worker download binding in the extension/backend vertical slice.
- Start: inspected clean source checkout, local worktrees, branch divergence,
  open issues/reviews and local claim references. Existing parallel worktrees
  concern SenseCards/review; no conflicting plan claim was found. Used an
  isolated worktree for this revision.
- Checkpoint: checked requirements against #22, ADR-0004/0005 and user evidence;
  explicitly separated target behavior from the earlier deployed baseline.
- Implementation checkpoint: extension now captures YouTube audio-track
  context, filters captions to the selected audible language, unifies `nl` /
  `nl-NL` under one parent, emits the approved text-origin/timing-origin
  labels, and sends audio evidence with timing jobs. Backend admission rejects
  missing evidence and incompatible ASR languages; the worker forwards the
  selected track identity and refuses ambiguous multi-track download when
  yt-dlp cannot resolve it.
- Validation checkpoint: extension unit smoke and the full Vitest suite pass;
  TypeScript no-emit still reports unrelated pre-existing errors in dictionary
  contract tests and `tests/practice/phrases.test.ts`.
- Deployment checkpoint: commit `a4ddff9` is live on Dell. Both Compose
  services are healthy/running, the public Cloudflare health endpoint reports
  the same commit, and the public timing route fails closed without audio
  evidence while accepting a verified Dutch track request.
- Handoff: implementation is deployed on this branch. Live multi-audio-track
  YouTube verification and legacy artifact migration remain explicit follow-up
  slices; do not mark #22 Done yet.
- Naming follow-up: applied the user's explicit text-origin/timing-origin
  labels to all three states; same plan-only scope and validation.

## Goal

Make language handling consistent across YouTube caption tracks, the Chrome
extension, AudioFilms API/ASR jobs, the local alignment script, and the Python
Whisper adapter. A new language or locale variant must not require a one-off
fix in a caller.

## Decisions

- `canonicalTag` is the source identity used for captions and UI metadata.
- `baseLanguage` is used only for cautious compatibility checks.
- `asrLanguage` is the normalized code accepted by Whisper and used in ASR
  identity.
- `pt-BR` and `pt-PT` remain distinct caption sources.
- A bare tag such as `nl` may match `nl-NL` during source restoration only
  when the candidate is unambiguous.
- `zh-Hans` and `zh-Hant`, and other conflicting scripts, never match through
  base-language fallback.
- ASR reuse requires compatible audio identity and ASR configuration; timing
  reuse additionally requires the selected text content fingerprint.

## Work slices

1. Add the language identity interface and conformance vectors.
2. Migrate backend ASR, alignment, and practice snapshot code.
3. Migrate extension source selection, binding, and timing compatibility.
4. Make the Python Whisper adapter consume the same supported-language data.
5. Replace source selection persistence with stable, versioned identity and
   migrate existing values.
6. Correct ASR artifact identity and add negative cache-reuse tests.
7. Run cross-runtime tests and a live reload smoke test on representative
   languages.

## Acceptance criteria

- No independent alias map or language normalizer remains outside the language
  module/adapters.
- Reload restores the selected caption source and compatible ASR timing.
- Regional and script variants are not silently mixed.
- Unknown language tags fail clearly at ASR boundaries while caption retrieval
  remains available where possible.
- Reusing ASR never depends on a display label alone.

## Current progress

- Existing locale normalization and source-selection regression are covered.
- The first backend language identity module and its conformance matrix are
  implemented in `app/src/lib/language/languageIdentity.ts`.
- `asrJobs.ts` now consumes that module.
- The extension has a matching language identity adapter, uses it for source
  restoration and compatibility checks, and rejects ambiguous regional/script
  fallbacks.
- Alias and Whisper support data now has one source under `app/scripts` and is
  synchronized into the no-build extension artifact.
- The alignment script and Python adapter consume that shared data.
- ASR artifact reuse now requires a manifest containing the audio fingerprint,
  normalized language, engine and model. Device and compute type are retained
  as provenance and do not invalidate an otherwise compatible artifact.
- Local smoke now rejects unsupported Whisper languages with the same contract
  data as backend/Python.
- Extension source persistence now writes version 2 identity with a stable
  track locator and canonical language tag while still reading version 1 data.
- Backend deployment verification completed on Dell at commit `5426f7c`.
  Both `audiofilms-api` and `audiofilms-asr-worker` are healthy; the public
  health endpoint confirms the same commit through the Cloudflare tunnel.
- Extension unit smoke passed. Full AppleScript-driven Chrome smoke remains
  blocked by the local harness' existing `osascript` syntax error; this is
  separate from the deployed application and should be fixed as follow-up
  test infrastructure work.
