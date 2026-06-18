# AudioFilms Backend Deployment Architecture Review

Дата: 17 июня 2026.

## Контекст

AudioFilms - MVP для phrase-by-phrase shadowing на YouTube. Сейчас есть:

- Next.js app/backend в `app/`.
- Chrome extension spike в `extensions/youtube-shadowing/`.
- Локальный backend для субтитров через `yt-dlp`/Supadata.
- Локальный ASR/alignment prototype через `/api/local-asr-practice`, который
  запускает Node/Python scripts, скачивает аудио, делает транскрибацию и
  строит `practicePhrases[]`.
- 2000NL dictionary/progress integration через backend proxy и Chrome extension
  Connect flow.

MVP уже достаточно полезен для локального dogfood, но сейчас он плохо
переносим: extension по умолчанию ходит в `localhost:3000`, ASR и `yt-dlp`
работают на локальном Mac, кэши лежат в локальных папках.

Цель следующей вехи: дать 1-4 внешним пользователям установить расширение и
тестировать без локальной установки backend. Сначала деплой возможен на старый
NUC, а тяжелая ASR-часть может быть вынесена на Dell. Позже систему нужно
перенести на Azure без переписывания клиентского расширения.

## Что Нужно От Ревью

Пожалуйста, сделайте senior architecture review текущего проекта и предложите
минимальный, но расширяемый deployment architecture.

Особенно нужны ответы:

1. Какая минимальная production-like архитектура подходит для 1-4 тестеров?
2. Можно ли оставить Next.js API как facade для subtitle/dictionary/ASR job API?
3. Что обязательно вынести из синхронного `/api/local-asr-practice` перед
   внешними тестерами?
4. Как лучше оформить ASR: отдельный worker, queue, job API, artifact storage?
5. Какой самый простой вариант очереди/status storage можно запустить на NUC и
   потом перенести в Azure?
6. Как разделить NUC и Dell: что держать на NUC, что на Dell?
7. Какие URL/env/config boundaries нужны, чтобы extension не был привязан к
   конкретному IP или `localhost`?
8. Какой минимальный auth/rate-limit нужен, чтобы не открыть публичный
   full-video ASR endpoint?
9. Какие Docker/container artifacts нужно добавить в первую очередь?
10. Какие текущие решения стоит считать technical debt перед масштабированием?

## Текущие Важные Файлы

- `ARCHITECTURE.md`
- `README.md`
- `app/README.md`
- `app/env.example`
- `app/package.json`
- `app/src/app/api/get-subs/route.ts`
- `app/src/app/api/local-asr-practice/route.ts`
- `app/src/app/api/dict/route.ts`
- `app/src/app/api/dict/actions/route.ts`
- `app/src/app/api/dict/translation/route.ts`
- `app/src/lib/subtitleService.ts`
- `app/src/lib/providers/index.ts`
- `app/src/lib/providers/YtDlpProvider.ts`
- `app/src/lib/providers/dictionary/index.ts`
- `app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts`
- `app/scripts/local-asr-alignment-smoke.mjs`
- `app/scripts/build-practice-preview.mjs`
- `app/scripts/transcribe-faster-whisper.py`
- `app/scripts/transcribe-stable-ts.py`
- `extensions/youtube-shadowing/manifest.json`
- `extensions/youtube-shadowing/src/transcriptRetrieval.js`
- `extensions/youtube-shadowing/src/serviceWorker.js`
- `extensions/youtube-shadowing/src/content.js`
- `extensions/youtube-shadowing/README.md`
- `docs/intent/youtube-extension-agent-runbook.md`
- `docs/exec-plans/active/subtitle-source-quality-shootout.md`
- `docs/exec-plans/active/backend-deployment-plan.md`

## Текущая Оценка Внутреннего Ревью

Сильные стороны:

- Есть нормализованные backend API routes.
- Provider selection уже в env, не в UI.
- Extension умеет fallback через backend provider.
- 2000NL auth/session boundary уже в целом правильный.
- `practicePhrases[]` теперь backend-owned contract, что подходит для удаленного
  backend.

Основные риски:

- Нет Dockerfile/compose/health endpoint/deployment runbook.
- Extension defaults и manifest host permissions не готовы к remote API.
- ASR endpoint синхронный, долгий, stateful и shell-based.
- Кэши локальные и не имеют lifecycle policy.
- Нет queue/status/artifact storage для ASR.
- Нет rate limiting/auth для дорогих операций.
- Нет clear split между API facade и ASR worker.

## Желаемый Формат Ответа

Пожалуйста, верните:

- краткое executive summary;
- proposed architecture diagram текстом;
- phased plan: now / next / Azure;
- concrete container/service list;
- recommended env var and DNS boundaries;
- ASR job API sketch;
- risks and mitigation;
- top 10 implementation tasks in order.

Не нужно делать код. Нужна архитектурная оценка и actionable plan.
