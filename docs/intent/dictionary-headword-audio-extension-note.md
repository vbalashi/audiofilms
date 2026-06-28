# Dictionary Headword Audio In The YouTube Extension

## Status

Draft for architecture review.

## Context

The YouTube dictionary card should eventually show a small speaker button next
to the rendered headword. Pressing it should play the curated pronunciation for
that headword when 2000NL has audio for the entry.

2000NL is the dictionary and audio authority. AudioFilms owns the YouTube
extension and the shallow overlay projection used by the extension. The
extension should render a provided audio affordance; it should not parse 2000NL
raw dictionary structures.

## Current 2000NL Behavior

The main 2000NL app resolves word audio from entry raw data:

- `raw.audio_links.nl` is the primary Dutch pronunciation link.
- Relative links such as `/audio/nl/k/<hash>.mp3` are resolved against
  `NEXT_PUBLIC_AUDIO_BASE_URL` when configured.
- Without a configured base URL, the main app can use the relative `/audio/...`
  path because it is running on the 2000NL web origin.
- Headword clicks force word-audio playback in the training UI.

The platform lookup content already normalizes raw audio into
`entry.content.audioLinks`:

- 2000NL source data stores `audio_links`.
- `normalizeDictionaryContent` exposes this as `audioLinks`.
- The platform shared types include `audioLinks?: Record<string, string | null>`.

## Proposed Extension Contract

Prefer a resolved, display-oriented audio object in the AudioFilms overlay card:

```ts
type DictionaryOverlayCardAudio = {
  primaryUrl: string;
  variants?: Record<string, string>;
  source: "2000nl";
};
```

AudioFilms should derive this from the 2000NL platform response without changing
audio ownership:

1. Read `entry.content.audioLinks`.
2. Prefer `audioLinks.nl` for the default headword speaker button.
3. Preserve other variants such as `be` for future UI if needed.
4. Resolve relative `/audio/...` links using a configured 2000NL audio/web base.
5. Omit the audio object when no playable URL is available.

The extension should:

1. Render a small speaker icon button next to the headword only when
   `card.audio.primaryUrl` is present.
2. Play that URL with the browser audio API on click.
3. Keep the button visually lightweight and separate from dictionary actions.
4. Avoid making extra lookup calls for audio.

## Endpoint Decision

Do not add an AudioFilms audio endpoint by default. A separate
`/api/dict/audio` proxy is only justified if one of these is true:

- 2000NL audio is not public/static.
- CORS or extension restrictions block direct playback.
- Playback must be authorized, logged, rate-limited, or transformed.
- 2000NL wants to hide storage URLs behind a signed or short-lived URL.

If 2000NL audio remains a public static asset, the cleaner contract is for
2000NL/AudioFilms lookup projection to return a playable URL and for the
extension to play it directly.

## Open Questions For Review

- Should 2000NL platform lookup return absolute audio URLs, or should
  AudioFilms resolve relative `/audio/...` paths with a configured
  `DICTIONARY_2000NL_AUDIO_BASE_URL`?
- Should the overlay contract expose only `primaryUrl`, or also all variants
  (`nl`, `be`) for later pronunciation choices?
- Should generated/user dictionary entries ever expose TTS audio through the
  same shape, or is this curated-entry only for now?
- Does playback need analytics or learning-event capture, or is it a pure local
  UI action?

## Related Contract Check: Meaning IDs

While checking the same projection path, 2000NL source and platform code show
that meaning IDs are available at both `entry.meaningId` and
`entry.content.meaningId`. Current live AudioFilms `/api/dict/lookup` responses
for multi-meaning words such as `kop` do not include `meaningId`, which means
the field is lost in the AudioFilms projection/output contract rather than in
the 2000NL source model.
