# AudioFilms Backend Deployment Runbook

This runbook is for the first 1-4 external testers. The target is one public backend facade that the Chrome extension can call without localhost assumptions, while keeping ASR split-ready for a heavier worker host and later Azure migration.

## Target Public Surface

Public DNS:

```text
audiofilms-api.dilum.io -> NUC or current API host
audiofilms.dilum.io     -> product/web host when needed
audiofilms-asr.dilum.io -> optional future private ASR host, not required by the extension
```

Public API facade routes:

```text
GET  /api/health
GET  /api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual
GET  /api/video-info?videoId=4EE7m94mJpk
GET  /api/dict?word=voorbeeld&language=nl
POST /api/dict/actions
POST /api/dict/translation
POST /api/asr/jobs
GET  /api/asr/jobs/{jobId}
GET  /api/asr/jobs/{jobId}/result
```

The extension should move service locations by changing `localStorage.afShadowingApiBase`, a tester package default in `extensions/youtube-shadowing/src/config.js`, or DNS. Do not bake NUC/Dell/local hostnames into content code.

## First Tester Deployment Recommendation

Use the Next.js API as the public facade for this MVP. It is already the place where subtitle provider selection, dictionary provider selection, and 2000NL token forwarding are implemented. Moving subtitle/dictionary routes into a separate service before dogfood would create more deployment surface without solving the current blocker.

For the current Dell-first dogfood deployment, run the API and ASR worker on
`dell-k3s` (`192.168.178.114`) and leave the NUC untouched:

```text
audiofilms-api container on host port 3010
audiofilms-asr-worker container
persistent Docker volume mounted at /data/audiofilms inside containers
Cloudflare Tunnel or reverse proxy/TLS in front of audiofilms-api.dilum.io
```

The earlier NUC-first shape is still valid for a lighter subtitle/dictionary-only
deployment:

```text
audiofilms-api container
reverse proxy / TLS
persistent /data/audiofilms volume
ASR disabled by default
```

Run ASR only after the job endpoint is enabled and protected:

```text
audiofilms-asr-worker process/container
concurrency 1 by default
same file-backed queue/artifact volume for first same-host smoke
```

For Dell-as-worker before Redis/object storage exists, use a shared mounted volume for `ASR_QUEUE_DIR` and `ASR_ARTIFACT_STORE`. If that is not acceptable, keep ASR disabled until Redis/Postgres/object storage is added behind the `asrJobs` store boundary.

## Environment

Minimum API env for subtitle/dictionary dogfood:

```bash
NODE_ENV=production
SUBTITLE_PROVIDER=yt-dlp
YT_DLP_PATH=/usr/local/bin/yt-dlp
DICTIONARY_PROVIDER=2000nl
DICTIONARY_2000NL_API_BASE=https://2000.dilum.io/api/platform/v1
DICTIONARY_2000NL_INCLUDE_USER_STATE=true
ALLOWED_EXTENSION_ORIGINS=chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc
ALLOWED_WEB_ORIGINS=https://www.youtube.com,https://youtube.com
AUDIOFILMS_DATA_DIR=/data/audiofilms
AUDIOFILMS_CACHE_DIR=/data/audiofilms/cache
AUDIOFILMS_ASR_CACHE_DIR=/data/audiofilms/asr-cache
AUDIOFILMS_PUBLIC_API_BASE=https://audiofilms-api.dilum.io
ASR_MODE=disabled
LOCAL_ASR_PRACTICE_ENABLED=false
```

If the dictionary provider is not `2000nl`, configure the matching key:

```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=...
```

Minimum ASR job env once enabled:

```bash
ASR_MODE=file-queue
ASR_AUTH_REQUIRED=true
ASR_TESTER_TOKENS=<random-long-token>
ASR_QUEUE_DIR=/data/audiofilms/asr-jobs
ASR_ARTIFACT_STORE=file:///data/audiofilms/asr-artifacts
ASR_MAX_DURATION_SEC=900
ASR_MAX_ACTIVE_JOBS=1
ASR_RATE_LIMIT_MAX=4
ASR_ALLOW_FULL_AUDIO=false
```

Full-video ASR is intentionally blocked unless `ASR_ALLOW_FULL_AUDIO=true` is set.
For private Dell dogfood this can be enabled while measuring performance. For
remote testers, use bounded duration jobs until resource behavior is known.

Current Dell LAN override for private testing before Cloudflare is ready:

```bash
AUDIOFILMS_API_PORT=3010
AUDIOFILMS_PUBLIC_API_BASE=http://192.168.178.114:3010
ASR_MODE=file-queue
ASR_MAX_ACTIVE_JOBS=1
ASR_ALLOW_FULL_AUDIO=true
```

Keep the deployment `.env` on the target host. If syncing the repo with
`rsync --delete`, exclude both root `.env*` and `app/.env*`; otherwise the
server-side tester token and public base URL can be removed from the deployment.

## Build and Run

From the repo root:

```bash
docker compose build audiofilms-api
docker compose up -d audiofilms-api
```

Check health locally:

```bash
curl -fsS http://127.0.0.1:3000/api/health | jq .
curl -fsS 'http://127.0.0.1:3000/api/health?checks=1' | jq .
```

On the Dell LAN deployment with `AUDIOFILMS_API_PORT=3010`:

```bash
curl -fsS http://192.168.178.114:3010/api/health | jq .
curl -fsS 'http://192.168.178.114:3010/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual' | jq '.language, (.practicePhrases | length)'
```

Enable the optional same-host worker profile only after `ASR_MODE=file-queue` and `ASR_TESTER_TOKENS` are set:

```bash
docker compose --profile asr up -d audiofilms-asr-worker
```

The worker uses the same image and runs:

```bash
node scripts/asr-worker.mjs
```

## Reverse Proxy / TLS

Terminate TLS in Caddy, nginx, Traefik, or another reverse proxy and forward to the API container on port 3000.

Caddy example:

```text
audiofilms-api.dilum.io {
  reverse_proxy 127.0.0.1:3000
}
```

For a home-lab Dell behind NAT, prefer Cloudflare Tunnel over opening router
ports:

```bash
cloudflared tunnel create audiofilms-api
cloudflared tunnel route dns audiofilms-api audiofilms-api.dilum.io
cloudflared tunnel run --url http://127.0.0.1:3010 audiofilms-api
```

Run `cloudflared` on the same host that can reach `127.0.0.1:3010`. Once this
is active, change `AUDIOFILMS_PUBLIC_API_BASE` to
`https://audiofilms-api.dilum.io` and restart the API container so job links use
the public URL.

Current Dell tunnel:

```text
Tunnel name: audiofilms-api
Tunnel ID:   7a9853ba-45b1-4217-93c3-2b080d563eb5
Hostname:    audiofilms-api.dilum.io
Origin:      http://127.0.0.1:3010
```

The Dell connector currently runs as a restartable Docker container:

```bash
docker run -d --name audiofilms-cloudflared --restart unless-stopped \
  --network host \
  --user "$(id -u):$(id -g)" \
  -v /home/khrustal/cloudflared/audiofilms-api:/etc/cloudflared:ro \
  cloudflare/cloudflared:2026.6.0 \
  tunnel --config /etc/cloudflared/config.yml run
```

The credentials and config directory on Dell is
`/home/khrustal/cloudflared/audiofilms-api`. Keep it private and do not commit
the tunnel JSON credentials.

The extension manifest grants `https://audiofilms-api.dilum.io/*` specifically. Prefer this over `https://*.dilum.io/*` for the first tester build. If the public API hostname changes later, move it behind DNS or adjust the shared extension config before widening host permissions.

## Smoke Checks

Remote checks:

```bash
curl -fsS https://audiofilms-api.dilum.io/api/health | jq .
curl -fsS 'https://audiofilms-api.dilum.io/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual' | jq '.language, (.practicePhrases | length)'
curl -fsS 'https://audiofilms-api.dilum.io/api/dict?word=voorbeeld&language=nl' | jq .
```

ASR unavailable should be explicit when disabled:

```bash
curl -i -X POST https://audiofilms-api.dilum.io/api/asr/jobs \
  -H 'content-type: application/json' \
  -d '{"videoId":"4EE7m94mJpk","lang":"nl","durationSec":60}'
```

Expected with `ASR_MODE=disabled`: HTTP 503 and `error=asr_unavailable`.

ASR enabled smoke:

```bash
curl -i -X POST https://audiofilms-api.dilum.io/api/asr/jobs \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <tester-token>' \
  -d '{"videoId":"4EE7m94mJpk","lang":"nl","sourceKind":"manual","textSource":"asr","durationSec":60}'
```

Poll `statusUrl` until `completed`, then request `resultUrl`.

## Extension Tester Defaults

`extensions/youtube-shadowing/src/config.js` is the single endpoint resolver. Defaults:

```text
AF_API_BASE=https://audiofilms-api.dilum.io
AF_BACKEND_SUBTITLES_URL=$AF_API_BASE/api/get-subs
AF_LOCAL_ASR_URL=$AF_API_BASE/api/asr/jobs
AF_DICTIONARY_URL=$AF_API_BASE/api/dict
AF_2000NL_CONNECT_BASE=https://2000.dilum.io
```

Useful tester console overrides:

```js
localStorage.afShadowingApiBase = "https://audiofilms-api.dilum.io";
localStorage.afShadowingApiBase = "http://localhost:3000"; // local dev
localStorage.afShadowingBackendSubtitlesUrl = "off";
localStorage.afShadowingDictionaryUrl = "off";
localStorage.afShadowingLocalAsr = "on";
localStorage.afShadowingLocalAsrDuration = "60";
localStorage.afShadowingTesterToken = "<tester-token>";
```

## Open Decision Answers

Next.js API as facade is acceptable for the MVP. Keep subtitle and dictionary in it now. Split only the ASR execution path because ASR is long-running, CPU/GPU-sensitive, and has abuse risk.

The simplest queue/storage setup now is file-backed job JSON plus file-backed artifacts behind the `asrJobs` store boundary. This is enough for one NUC worker or a shared-volume worker. For Azure, replace the store with Storage Queue plus Blob artifacts, Redis/Postgres status, or Postgres-only job/status without changing the extension contract.

ASR should be pull-based from a queue, not pushed synchronously from the API to a worker URL. Pull-based protects the API from worker outages, supports concurrency 1, and maps cleanly to Azure Container Apps jobs, Batch, or a GPU worker pool.

For 1-4 testers, ASR auth should be a random tester token in `ASR_TESTER_TOKENS`, sent as `Authorization: Bearer ...`. Keep 2000NL Connect token forwarding for dictionary and user state. Do not require every subtitle/dictionary request to have the temporary ASR token unless abuse appears.

For the first deployment, containerize the Next.js API, yt-dlp, ffmpeg, health route, CORS, subtitle cache, video-info cache, and dictionary proxy together. Split the ASR worker from day one conceptually and operationally; it may reuse the same image but should not run as a long web request.

Keep `/api/local-asr-practice` as a private compatibility endpoint only. It is disabled by default in production unless `LOCAL_ASR_PRACTICE_ENABLED=true` is set.

## Azure Migration Mapping

Keep `audiofilms-api.dilum.io` stable and move DNS when ready.

```text
API facade       -> Azure Container Apps or App Service for Containers
Queue/status     -> Azure Storage Queue + Table/Postgres, Azure Cache for Redis, or Postgres
Artifacts        -> Azure Blob Storage
ASR worker       -> Azure Container Apps jobs, Azure Batch, or GPU VM/container pool
Secrets          -> Container Apps secrets or Azure Key Vault
```

The extension should still call only `AF_API_BASE`. Internal worker locations, queue URLs, and artifact stores remain server-side env.
