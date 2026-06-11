# AudioFilms YouTube extension: brief for expert review

Дата подготовки: 2026-06-10.

## Зачем мы делаем расширение

AudioFilms - это продукт для тренировки аудирования на YouTube: learner смотрит реальное видео, двигается по фразам, останавливается на нужных местах, кликает по словам и получает словарную подсказку. Сейчас есть основной Next.js app, где YouTube-видео и субтитры грузятся через provider layer. Отдельно мы пробуем Chrome extension, чтобы работать прямо на странице YouTube.

Гипотеза расширения: если мы запускаемся прямо на `youtube.com/watch`, то можем использовать уже доступные YouTube caption tracks/transcript UI, точнее синхронизироваться с реальным player state и дать более естественный UX без отдельного video wrapper.

## Что сейчас реализовано

Код расширения лежит в `extensions/youtube-shadowing/`.

Текущая версия:

- Manifest V3 content script для YouTube watch pages.
- Пытается найти caption tracks из YouTube player metadata.
- Предпочитает non-auto caption track, если есть; иначе падает на auto-generated.
- Пытается получить cues через несколько путей:
  - YouTube `timedtext` URL из player track;
  - YouTube transcript endpoint;
  - DOM стандартной YouTube transcript panel как fallback.
- Строит фразы из timed cues.
- Добавляет свой learning workspace:
  - ribbon субтитров под player;
  - controls: prev/replay/hide/next/auto-pause/debug/copy-debug;
  - right-side dictionary/account panel вместо recommendations, если получилось;
  - floating `AudioFilms On/Off` toggle.
- Пока lookup работает как guest placeholder; настоящего backend dictionary payload в extension еще нет.

## Что не нравится и почему нужен review

Главная проблема: это выглядит хрупко.

Мы сейчас активно меняем DOM YouTube и завязаны на внутреннюю структуру страницы:

- selectors для `#secondary`, `#primary-inner`, `#player`, transcript panel;
- внутренний YouTube player metadata shape;
- `timedtext`/transcript endpoint, которые не являются стабильным public API;
- поведение YouTube SPA navigation;
- layout assumptions, которые могут ломаться от любого изменения YouTube UI, cookie/consent state, A/B experiments, login state, ширины окна или региона.

UI тоже пока не удовлетворяет:

- темная панель визуально тяжеловата и не выглядит как аккуратный learning layer;
- right dictionary panel слишком похож на отдельное приложение, а не на мягкое расширение YouTube;
- ribbon занимает много места и конфликтует с естественной YouTube компоновкой;
- пока нет ясной модели, где лучше показывать subtitle text: поверх видео, под видео, в transcript column, side panel или hybrid.

## Важная воспроизводимая находка при подготовке handoff

В текущем рабочем Chrome у пользователя AudioFilms UI виден на YouTube: ribbon под player и dictionary panel справа.

Но при запуске отдельного clean Chrome profile с этой unpacked extension папкой на том же URL DOM-проверка не нашла `#af-shadowing-ribbon-panel`, `#af-shadowing-dictionary-panel` или `#af-shadowing-toggle`. Это нужно расследовать отдельно: возможно, extension не подгрузился в clean profile, content script не инжектится, YouTube consent/login flow меняет timing, либо есть зависимость от текущего профиля/ручной загрузки extension.

В архиве есть два screenshot для визуальной критики:

- `screenshots/SCR-20260610-tmrk-2.png` - текущий YouTube extension UI.
- `screenshots/SCR-20260610-tnoq-2.png` - текущий основной AudioFilms web app UI.

Их стоит смотреть вместе: extension UI показывает проблему внедрения в YouTube, web app UI показывает более изолированный продуктовый вариант, который может быть архитектурно надежнее.

## Что хочется получить от эксперта

1. Архитектурная оценка: стоит ли вообще продолжать путь "content script меняет YouTube DOM", или лучше сделать более изолированный overlay/sidebar, который меньше зависит от YouTube layout.
2. Caption strategy: какой путь надежнее для MVP:
   - читать `captionTracks`/`timedtext` напрямую;
   - открывать/парсить YouTube transcript panel;
   - использовать внешний provider API в основном AudioFilms app;
   - использовать hybrid: extension только управляет player, а backend/app отвечает за transcript retrieval;
   - ASR fallback только для проблемных видео.
3. UI strategy: как сделать простой, красивый и устойчивый UX:
   - не ломать YouTube recommendations/layout;
   - дать click-to-lookup по словам;
   - иметь phrase navigation и auto-pause;
   - сохранить readable subtitles.
4. Reverse engineering: стоит ли смотреть Language Reactor, Migaku, EasySubs, multi-subs-yt, SubtideX и похожие extensions, или там в основном те же известные приемы.
5. Конкретные code review замечания по `content.js` и `content.css`: где мы уже создаем себе будущие поломки.

## Мое текущее техническое мнение

Для устойчивости лучше разделить две проблемы:

- Data plane: как получить transcript/cues с качественными таймингами.
- UI plane: как показать learning controls, не переписывая YouTube страницу.

Возможная более надежная схема:

1. Extension минимально взаимодействует с YouTube:
   - находит video element;
   - читает current video id/time;
   - управляет `currentTime`, play/pause;
   - рисует собственный overlay/side panel в shadow root или isolated container.
2. Transcript retrieval живет как pluggable pipeline:
   - сначала browser-visible YouTube tracks/timedtext, если доступно;
   - затем transcript-panel DOM fallback;
   - затем app/provider API fallback;
   - затем ASR только как отдельный дорогой fallback.
3. UI не заменяет целиком `#secondary`, а предлагает mode switch:
   - compact overlay under/over player для phrase;
   - optional right drawer для dictionary;
   - no destructive hiding of recommendations unless user explicitly opens learning layout.

## Интернет-ориентиры

Ниже не окончательный research report, а стартовые ссылки для эксперта:

- Official YouTube Data API captions docs: `captions.download` существует, но для чужих публичных видео это не простой public transcript API; требуются OAuth/permissions к видео.
  - https://developers.google.com/youtube/v3/docs/captions
- Language Reactor показывает, что market pattern существует: enhanced subtitles, click word translation, YouTube/Netflix integration.
  - https://www.languagereactor.com/
  - https://chromewebstore.google.com/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm
- Migaku - коммерческий language-learning extension/app с YouTube subtitle workflow, word lookup, saving/mining cards, review flow and visual overlay patterns.
  - https://www.migaku.com/
  - https://chromewebstore.google.com/detail/migaku-really-learn-langu/lkhiljgmbeecmljiogckofcalncmfnfo
- EasySubs is open source and relevant for word/phrase translation UX.
  - https://github.com/Nitrino/easysubs
- SubtideX is a recent open-source MV3 example that explicitly opens YouTube transcript panel and reads captions from the page.
  - https://github.com/yniijia/SubtideX
- multi-subs-yt is an open-source browser addon for multiple YouTube subtitles without a third-party server.
  - https://github.com/garywill/multi-subs-yt
- There are public discussions/posts around using `ytInitialPlayerResponse`, `captionTracks`, `timedtext`, JSON3, and transcript panel DOM. The common theme: useful, widely used, but not stable official API.

## Files to review first

- `extensions/youtube-shadowing/manifest.json`
- `extensions/youtube-shadowing/src/content.js`
- `extensions/youtube-shadowing/src/content.css`
- `extensions/youtube-shadowing/README.md`
- `docs/exec-plans/active/youtube-shadowing-extension-mvp.md`
- `docs/intent/subtitle-retrieval-strategy.md`

For comparison with the main AudioFilms app:

- `app/src/lib/subtitleService.ts`
- `app/src/lib/providers/`
- `app/src/app/api/get-subs/route.ts`
- `app/src/app/watch/[videoId]/WatchClient.tsx`
- `app/src/components/PlayerLayout.tsx`
- `app/src/components/YouTubePlayer.tsx`
- `app/src/hooks/useDictionaryLookup.ts`

## Suggested review questions

- What is the smallest viable extension architecture that will not break on every YouTube UI change?
- Should the extension use a Shadow DOM UI container?
- Should the UI avoid moving/replacing YouTube DOM nodes entirely?
- Which subtitle source should be treated as primary: YouTube page metadata, YouTube transcript panel, external API provider, or hybrid?
- How should we detect and expose degraded subtitle quality?
- Is word-level click lookup realistic from phrase-level/manual captions, or do we need tokenization without word timing for MVP?
- What existing open-source extension should we read first for implementation patterns?
- What should be deleted from the current spike before it grows into product code?
