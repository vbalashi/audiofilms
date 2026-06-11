# Research: Related YouTube Subtitle Extensions

Дата: 2026-06-11.

Цель: сравнить наш YouTube shadowing spike с похожими расширениями и вынести только практичные паттерны для стабилизации. Это не reverse engineering для копирования чужого продукта; это проверка того, какие подходы уже встречаются в open-source и коммерческих language-learning extensions.

## Short Answer

Наша текущая цель лучше совпадает не с полной заменой интерфейса YouTube, а с гибридом:

1. собственный компактный слой поверх/под player для текущей фразы;
2. отдельная правая панель/слой для словаря только после клика по слову;
3. caption retrieval как ladder с честной маркировкой источника;
4. минимум вмешательства в YouTube layout;
5. debug/validation surface, потому что YouTube subtitle paths нестабильны.

## Sources Checked

- SubtideX GitHub: https://github.com/yniijia/SubtideX
- EasySubs GitHub: https://github.com/Nitrino/easysubs
- multi-subs-yt GitHub: https://github.com/garywill/multi-subs-yt
- Language Reactor product / Chrome Web Store:
  - https://www.languagereactor.com/
  - https://chromewebstore.google.com/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm
- Migaku product / Chrome Web Store / tutorial:
  - https://www.migaku.com/
  - https://chromewebstore.google.com/detail/migaku-really-learn-langu/lkhiljgmbeecmljiogckofcalncmfnfo
  - https://migaku.com/blog/youtube/watching-and-reading-japanese-with-migaku-full-tutorial
- YouTube Data API captions docs: https://developers.google.com/youtube/v3/docs/captions

## Observations By Project

### SubtideX

What it does:

- Manifest V3 Chrome extension.
- Product goal is export/download: open YouTube transcript panel, read captions, save CSV.
- Uses a visible progress panel with explicit steps: open transcript panel, read captions, save/download.
- Has a large retrieval ladder: transcript panel, InnerTube `get_transcript`, player caption tracks, video text tracks, DOM scraping.
- Detects token-gated timedtext/caption URLs and treats empty/HTML responses as failures, not success.
- Uses many selectors and fallbacks for transcript panel variants.

What we should take:

- Treat transcript-panel extraction as an optional diagnostic/fallback path, not the primary user-facing architecture.
- Surface retrieval steps and failures clearly in debug mode.
- Never treat empty timedtext or HTML response as valid subtitles.
- Keep source labels explicit: transcript panel, timedtext, provider, auto/manual.

What we should not take blindly:

- The selector-heavy transcript panel scraper is inherently brittle. It is useful as evidence and fallback, not as the core of a polished daily-use shadowing UI.
- Export tooling can tolerate a visible multi-step operation; our playback UI needs less interruption.

### EasySubs

What it does:

- Open-source learning extension for YouTube, Netflix, Coursera, and other video services.
- Injects a settings control into the video player's controls.
- Renders its own subtitle layer inside the player area.
- Hides native captions when its own subtitle mode is enabled.
- Uses hover/click interaction: hover word to translate, click subtitle to translate phrase.
- Has auto-pause on subtitle hover and keyboard movement by subtitle.
- For YouTube, it injects a page script and listens for `/api/timedtext` XHR calls to capture active caption URLs, then fetches JSON subtitle events.

What we should take:

- Word lookup should happen in the subtitle layer itself; dictionary can be lazy and contextual.
- Auto-pause must be scoped to clear user intent, such as hover/click/guided mode, not passive playback sync.
- Keyboard navigation should be mode-scoped and disabled when the user is not actively using the learning controls.
- A subtitle progress/navigation control can be useful, but it should be optional after the core phrase loop is stable.

What we should not take blindly:

- Hiding native captions and injecting into YouTube controls increases coupling to YouTube DOM/CSS.
- Capturing timedtext XHR works only after YouTube itself requests captions; it is not enough as the only retrieval path.
- Font sizing tied directly to video width needs careful responsive checks.

### multi-subs-yt

What it does:

- Minimal browser addon for displaying multiple subtitles on YouTube.
- Explicitly says it has no third-party server dependency.
- Keeps main UI in browser toolbar/popup.
- Injects only after the toolbar button is used.
- Reads YouTube `playerResponse`/`captionTracks`.
- Appends HTML `<track>` elements to the existing `<video>` and removes them on navigation.

What we should take:

- Minimal injection posture is a strong stability pattern.
- Popup/toolbar activation is a useful safe mode for features that do not need to be always-on.
- The extension should clean up aggressively on YouTube SPA navigation.
- Reading `captionTracks` from player response is still a common practical path.

What we should not take blindly:

- `<track>` injection is good for displaying extra subtitles, but not enough for word-level click/lookup UI.
- Manifest V2 patterns need translation to MV3.
- No-server design is attractive, but our current provider fallback is valuable for reliability when browser-visible caption paths fail.

### Language Reactor

What it shows:

- Market validation for enhanced YouTube subtitles, dual subtitles, word interaction, saved items, and language-learning overlays.
- The important lesson is product shape: learning mode is layered on top of YouTube/Netflix rather than replacing the whole watch page.

What we should take:

- Product should feel like a learning mode, not a rebuilt YouTube page.
- Make controls discoverable but compact.
- Use visual states for known/new/saved words later, after subtitle stability is solved.

### Migaku

What it shows:

- Commercial language-learning flow around browser extension, YouTube/Netflix/web content, popup dictionary, word statuses, and flashcard creation.
- Their public tutorial explicitly frames the extension around toolbar/dashboard, subtitle display options, popup dictionary, word learning statuses, and flashcards.

What we should take:

- Dictionary and word state are product pillars, but can remain second-stage for us.
- A toolbar/dashboard surface is acceptable for setup/state; the YouTube page should stay focused on phrase practice.
- Subtitle display options matter because learners have different tolerance for native captions, dual captions, and custom overlays.

What we should not take blindly:

- Migaku is a broader paid learning system. AudioFilms should not inherit flashcard/review complexity before the subtitle loop is stable.

## YouTube API Reality Check

The official YouTube Data API has a `captions` resource with list/insert/update/download/delete methods, but it is built around authorized caption tracks. It does not give us a simple public transcript API for arbitrary YouTube videos. Therefore, a stable product cannot rely on “just use official YouTube captions API” for public third-party videos.

Practical implication: keep the provider/API fallback. Browser-only extraction can be a best-effort fast path; it should not be the only path for a polished learning product.

## Design Direction For AudioFilms

Recommended architecture:

1. Keep Shadow DOM / isolated container for our UI.
2. Do not move or replace YouTube `#secondary`, recommendations, comments, or metadata by default.
3. Default to compact phrase bar near the player.
4. Show dictionary as a contextual panel only after word click.
5. Keep native YouTube captions hidden only when our subtitle layer is explicitly on.
6. Keep source badge visible enough for debugging: `Manual`, `Auto`, `Provider`, `timedtext`, `fallback`, `warning`.
7. Keep backend/provider fallback as a first-class source, not an embarrassing workaround.
8. Treat transcript-panel/InnerTube scraping as diagnostic fallback behind a flag until it is proven stable.
9. Keep keyboard shortcuts active only in guided mode.
10. Keep clean-profile validation fixtures for manual captions, auto-only captions, no captions, SPA navigation, and narrow viewport.

## Open Questions For Expert Review

- Should transcript panel extraction remain disabled by default, or should it be offered as a manual “try page transcript” button?
- Should the extension default to backend provider when available, instead of attempting browser timedtext first?
- Should dictionary live as a YouTube-side panel, browser popup, or AudioFilms app bridge?
- Is it worth implementing `<track>` injection for subtitle display, or does word-level interaction make custom rendering unavoidable?
- What is the minimum UI that feels polished enough: one-line phrase bar, draggable caption overlay, or right-side learning panel?

