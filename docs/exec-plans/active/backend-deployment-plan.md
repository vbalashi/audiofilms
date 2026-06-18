# Backend Deployment Plan

Status: active planning note, June 17, 2026.

## Goal

Make the AudioFilms backend usable by 1-4 external testers now, without locking
the project into local-only Mac assumptions, and keep the path open for later
Azure migration.

The target shape is not necessarily one monolith. The target is one deployable
backend surface with clear internal services, replaceable URLs, and explicit
runtime contracts:

- Chrome extension can call a remote AudioFilms API instead of `localhost`.
- Subtitle retrieval can run on a small always-on host.
- ASR/transcription/alignment can run on a heavier host when needed.
- Service locations can move by changing config or DNS, not extension code.

## Current State Review

### What Works

- The Next.js app already exposes backend API routes:
  - `/api/get-subs`
  - `/api/video-info`
  - `/api/local-asr-practice`
  - `/api/dict`
  - `/api/dict/actions`
  - `/api/dict/translation`
- Subtitle provider selection is environment-driven with `SUBTITLE_PROVIDER`,
  `YT_DLP_PATH`, and optional Supadata fallback.
- Dictionary provider selection is environment-driven and already supports
  2000NL, OpenRouter, OpenAI, Azure OpenAI-style config, and free-dictionary.
- The extension already has diagnostic endpoint overrides through
  `localStorage.afShadowingBackendSubtitlesUrl`,
  `localStorage.afShadowingLocalAsrUrl`, and `localStorage.afShadowingDictionaryUrl`.
- The app now separates source/provider subtitle units from backend-owned
  `practicePhrases[]`, which is the right contract for remote consumers.
- 2000NL Connect is already extension-aware and the extension can forward a
  Bearer token to AudioFilms dictionary routes.

### Main Gaps

- There is no Dockerfile, compose file, health endpoint, or deployment runbook.
- The Chrome extension defaults still point to `http://localhost:3000`.
- The extension manifest only permits YouTube, 2000NL, localhost, and
  `127.0.0.1`; it does not permit an AudioFilms API under `*.dilum.io`.
- `/api/local-asr-practice` is a synchronous web request that shells out to local
  scripts, downloads audio, installs/uses Python ASR dependencies, writes
  `.asr-cache`, and can run for minutes. This is acceptable for local dogfood,
  but not as the final tester-facing API.
- File-backed caches are local to one machine/container:
  - `app/.subtitle-cache`
  - `app/.video-info-cache`
  - `app/.asr-cache`
- There is no queue, concurrency limit, job status model, artifact storage
  contract, request authorization model, or cleanup policy for ASR jobs.
- Current ASR defaults are CPU-oriented and machine-local. NUC deployment may be
  fine for subtitle/dictionary APIs, but ASR should be treated as a separate
  worker/service candidate.
- `README.md` still contains stale provider-default text in its root section.

## Recommended Deployment Shape

### Phase 0: Stabilize Remote Backend Surface

Keep the current Next.js backend as the public API facade:

```text
Chrome extension
  -> https://audiofilms-api.dilum.io/api/get-subs
  -> https://audiofilms-api.dilum.io/api/dict
  -> https://audiofilms-api.dilum.io/api/asr/jobs
```

Initial implementation can still route `/api/local-asr-practice` internally for
dogfood, but external clients should be moved toward job endpoints before more
testers are invited.

Required changes:

- Add `NEXT_PUBLIC_AUDIOFILMS_API_BASE` or extension package config for the
  remote API base.
- Add `https://audiofilms-api.dilum.io/*` or `https://*.dilum.io/*` to extension
  host permissions.
- Replace localhost defaults with one config resolver shared by subtitle,
  dictionary, and ASR endpoint selection.
- Keep local overrides for development.
- Add `/api/health` returning build/version, provider readiness, and optional
  dependency checks.
- Add CORS policy for the extension origin and explicit allowed origins.

### Phase 1: Containerize The Web/API Service

Build a container for the Next.js app with:

- Node.js runtime.
- `yt-dlp` installed or mounted at `YT_DLP_PATH`.
- `ffmpeg` installed if local audio extraction remains in the web container.
- Persistent volume for short-term subtitle/video caches, or move caches to
  Redis/object storage later.
- Environment-driven provider URLs and secrets.

For 1-4 testers, run this on the NUC:

```text
audiofilms-api container
  - Next.js server
  - subtitle provider orchestration
  - dictionary proxy
  - lightweight metadata/cache
```

Do not put long ASR processing in the same request path for tester traffic.

### Phase 2: Split ASR Into Jobs

Introduce an ASR job contract:

```text
POST /api/asr/jobs
GET  /api/asr/jobs/{jobId}
GET  /api/asr/jobs/{jobId}/result
```

The facade can enqueue work and return quickly:

```json
{
  "jobId": "asr_...",
  "status": "queued",
  "pollAfterMs": 3000
}
```

Recommended internal model:

- `audiofilms-api`: validates request, deduplicates by video/language/model,
  checks existing artifacts, creates job, returns status.
- `audiofilms-asr-worker`: downloads audio, runs faster-whisper/stable-ts,
  aligns text, writes artifacts, marks job complete.
- `redis` or lightweight Postgres table: queue/status.
- local disk or object storage: audio/transcript/alignment artifacts.

For the first version, a single worker with concurrency `1` is enough. This
protects the NUC/Dell from multiple full-video transcriptions at once.

### Phase 3: Host Placement

Recommended first deployment:

```text
NUC
  audiofilms-api
  reverse proxy / TLS
  Redis or SQLite/Postgres for small job/status state
  small persistent cache volume

Dell
  audiofilms-asr-worker
  ASR models/cache
  optional local artifact volume
```

The API should not care whether the worker is on the same machine. It should
communicate through queue/storage or a private worker URL configured by env.

If Dell is unavailable, the worker can be disabled and the API should return a
clear "ASR unavailable" status while subtitle/dictionary still works.

### Phase 4: Azure Migration Path

Keep the same public URLs and move infrastructure behind DNS:

```text
audiofilms-api.dilum.io -> NUC now -> Azure App Service/Container Apps later
audiofilms-asr.dilum.io -> Dell now -> Azure Container Apps GPU/batch later
```

Avoid baking hostnames into code. Use:

- DNS for public endpoint stability.
- environment variables for internal service locations.
- extension-managed config for API base.
- one config document for tester builds.

Azure target mapping:

- API facade: Azure Container Apps or App Service for Containers.
- Queue/status: Azure Cache for Redis, Storage Queue, or Postgres.
- Artifacts: Azure Blob Storage.
- ASR worker: Azure Container Apps jobs, Azure Batch, or a GPU VM/container
  pool depending on cost and model requirements.
- Secrets: Azure Key Vault or Container Apps secrets.

## Proposed URL/Config Contract

Public DNS:

```text
audiofilms-api.dilum.io
audiofilms-asr.dilum.io
audiofilms.dilum.io
```

Extension config:

```text
AF_API_BASE=https://audiofilms-api.dilum.io
AF_BACKEND_SUBTITLES_URL=$AF_API_BASE/api/get-subs
AF_LOCAL_ASR_URL=$AF_API_BASE/api/asr/jobs
AF_DICTIONARY_URL=$AF_API_BASE/api/dict
AF_2000NL_CONNECT_BASE=https://2000.dilum.io
```

Server config:

```text
SUBTITLE_PROVIDER=yt-dlp
YT_DLP_PATH=/usr/local/bin/yt-dlp
DICTIONARY_PROVIDER=2000nl
DICTIONARY_2000NL_API_BASE=https://2000.dilum.io/api/platform/v1
ASR_MODE=worker
ASR_QUEUE_URL=redis://audiofilms-redis:6379
ASR_ARTIFACT_STORE=file:///data/audiofilms-asr
ASR_WORKER_BASE_URL=http://audiofilms-asr-worker:8080
ALLOWED_EXTENSION_ORIGINS=chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc
```

## Security And Abuse Controls

Minimum before external testers:

- Do not expose unrestricted full-video ASR to the public internet.
- Require either a tester token, 2000NL Connect token, or a simple allowlisted
  shared secret for ASR job creation.
- Rate-limit ASR job creation per tester/account.
- Cap concurrent ASR jobs.
- Cap video duration until resource behavior is known, even if local dogfood can
  still run full-video intentionally.
- Keep dictionary auth forwarding explicit and do not store tester access tokens
  in backend logs.
- Avoid logging full Authorization headers or full query strings when they may
  contain secrets.

## Operational Checklist For First Remote Dogfood

1. Add container build for `app/`.
2. Add `/api/health`.
3. Add remote API base config in extension.
4. Add `*.dilum.io` or specific AudioFilms API host permissions.
5. Deploy API container on NUC with TLS behind `audiofilms-api.dilum.io`.
6. Verify:
   - `/api/health`
   - `/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual`
   - `/api/dict?word=...`
7. Package a tester extension build that defaults to the remote API.
8. Keep ASR disabled or admin-only until job endpoints exist.
9. Add ASR job API and one worker.
10. Move ASR worker to Dell or Azure-compatible container runner.

## Open Decisions

- Whether the first remote tester build should use `*.dilum.io` host permission
  or only `https://audiofilms-api.dilum.io/*`.
- Whether ASR job status should live in Redis, SQLite/Postgres, or file-backed
  JSON for the first NUC deployment.
- Whether ASR artifacts should be stored on NUC, Dell, or object storage from
  day one.
- Whether tester authorization should be tied to 2000NL Connect immediately or
  use a simpler temporary tester token for ASR.
- Whether the public API should keep `/api/local-asr-practice` as a private
  compatibility endpoint or hide it entirely once jobs are introduced.

## Senior Architect Review Questions

- Is Next.js API as the facade acceptable for this MVP, or should subtitle/ASR
  APIs move behind a separate service immediately?
- What is the simplest job queue/storage setup that can run on NUC now and
  migrate to Azure without a rewrite?
- Should ASR be pull-based from queue or pushed from API to a worker URL?
- What auth model is enough for 1-4 testers while avoiding an insecure public
  ASR endpoint?
- What should be containerized together for the first deployment, and what must
  be split from day one?
