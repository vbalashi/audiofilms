# AudioFilms

AudioFilms is a listening-practice product centered on YouTube videos, caption-derived phrases, and deliberate shadowing practice.

## Language

**Selected Caption Track**:
The caption track the system intends to use for a YouTube video after applying language and manual-vs-auto preference rules. It is not necessarily the source that ultimately supplies timed practice text.
_Avoid_: Source of truth, active transcript

**Cue Source**:
The mechanism that actually supplies the timed cues used to build practice phrases. Cue source is diagnostic provenance and should not be used as the default learner-facing source label.
_Avoid_: Selected track, caption track

**YouTube Timed Text**:
YouTube's browser-visible caption data path exposed through signed `api/timedtext` URLs on caption tracks. It can provide caption cues directly from the current YouTube page, but it is an unstable implementation path and can return empty data even when YouTube displays captions.
_Avoid_: User-facing captions label, source quality

**Subtitle Provider**:
A source system that can supply subtitle or transcript data as a product dependency. Examples include YouTube captions, Supadata, or a future paid transcript API; the AudioFilms backend is not itself a subtitle provider when it only orchestrates retrieval.
_Avoid_: Backend provider, extractor, API host

**Subtitle Extractor**:
A backend-side tool that extracts subtitle data from a source system. `yt-dlp` is a subtitle extractor, not a user-facing provider label.
_Avoid_: Provider, local extractor, backend provider

**AudioFilms Backend**:
The AudioFilms API layer that orchestrates subtitle providers, subtitle extractors, cache, normalization, practice phrase building, dictionary proxying, and ASR jobs. It is not a subtitle provider unless it is the actual source of authored subtitle content.
_Avoid_: Backend provider, source

**Retrieval Path**:
The diagnostic route by which AudioFilms obtained timed text or metadata, such as browser caption URL, AudioFilms backend through `yt-dlp`, Supadata through the backend, transcript-panel diagnostic, or an ASR job. Retrieval path is useful for details/debug surfaces, not as the default learner-facing source label.
_Avoid_: User source label, readiness, caption language

**Practice Source**:
A user-selectable source of timed text for a video practice session. Practice sources are grouped by caption language and shown with factual metadata such as display name, language code, caption type, and availability, without recommendation labels.
_Avoid_: Caption track, endpoint, provider

**Unavailable Practice Source**:
A discovered practice source whose timed text could not be loaded. It should remain visible for transparency and troubleshooting, but it is not an active practice choice unless a later retry succeeds.
_Avoid_: Failed provider, disabled caption

**Phrase Text**:
The visible or hidden text for the current practice phrase. It is what the learner reveals during practice and should not be called a source.
_Avoid_: Source, transcript

**Practice Phrase**:
The learner-facing replay and navigation unit in a practice session. Previous, Replay, Next, hide/reveal text, and word lookup operate on practice phrases. A practice phrase can be built from one provider subtitle phrase, part of one provider phrase, or multiple short provider phrases.
_Avoid_: Provider phrase, cue, source phrase

**Provider Phrase**:
A timed text unit returned by a subtitle provider or produced by basic provider parsing before learner-facing segmentation. Provider phrases are source material for practice phrase building; they are not automatically suitable replay/navigation units.
_Avoid_: Practice phrase, cue source, selected source

**Timing Evidence**:
The timing information used to place practice phrase boundaries. Timing evidence can come from provider phrase boundaries, caption cue boundaries, ASR word timings, projected ASR timings, proportional estimates, or later forced alignment. It is distinct from the display text shown to the learner.
_Avoid_: Display text, caption source, provider

**Cue Timing**:
Timing evidence that uses the start and end times already attached to caption cues. Cue timing can be usable when cues are short and phrase-sized, but it can be too coarse when a single cue contains a long sentence or paragraph.
_Avoid_: Exact timing, ASR timing

**Approximate Split Timing**:
Timing evidence created by splitting a longer caption cue into smaller practice phrases and estimating internal boundaries, usually by text length or phrase position. It is a degraded fallback because the internal timings are guessed rather than measured.
_Avoid_: ASR timing, exact timing

**Auto-Caption Timing**:
Timing evidence from YouTube auto-generated captions. It may be denser than uploaded caption cue timing and can include useful word or rolling-caption timing, but it can also include recognition errors, overlap, and rolling-caption artifacts.
_Avoid_: Manual timing, aligned timing

**Practice Readiness**:
A compact learner-facing status for how ready the current video is for phrase-by-phrase practice. It summarizes whether usable practice phrases exist, whether timing evidence is degraded or high confidence, whether relevant ASR/alignment data is available, and whether blocking warnings exist; it does not replace practice source, cue source, timing evidence, or display text metadata.
_Avoid_: Source quality, ASR status, caption quality

**Get Captions**:
A user-initiated action that asks AudioFilms to retrieve usable subtitle text through backend retrieval, extraction, provider fallback, or cache. It is distinct from improving phrase timing and should not start ASR by implication.
_Avoid_: Improve timing, refresh cache, run ASR

**Improve Timing**:
A user-initiated action that asks AudioFilms to improve practice phrase boundaries using ASR, alignment, word timing, or a later timing-specific backend process. It is distinct from retrieving captions and may take minutes.
_Avoid_: Get captions, refresh cache, translate

**Display Text**:
The learner-visible text for a practice phrase. Display text can come from manual captions, ASR captions, provider-cleaned text, or aligned text, and it does not by itself define practice phrase timing.
_Avoid_: Timing evidence, cue source, provider

**Text Source**:
The source selected for learner-visible display text, such as uploaded captions, YouTube auto-captions, or an ASR transcript. The selected text source does not necessarily determine timing evidence after ASR/alignment is available.
_Avoid_: Timing source, source selector, practice readiness

**Practice Mode**:
The learner's active exercise mode for a practice phrase. Initial modes are Shadow and Recall; they change what prompt is shown and what the learner is trying to produce, without changing the underlying video.
_Avoid_: Scenario, caption source, playback mode

**Shadow Mode**:
A practice mode where the learner listens to and repeats the original phrase. The original text can be sticky-visible or sticky-hidden through Show Original, but the exercise remains shadowing.
_Avoid_: Default mode, subtitles mode

**Recall Mode**:
A practice mode where a translated prompt is shown and the learner recalls or produces the original-language phrase.
_Avoid_: Translate mode, translation action

**Phrase Translation**:
A translation of the whole current practice phrase into the learner's target language. It is a comprehension aid in Shadow Mode and the prompt source in Recall Mode; it is distinct from dictionary card translation.
_Avoid_: Word translation, dictionary translation, gloss

**Show Translation**:
A user action that reveals or hides Phrase Translation for the current practice phrase while staying in Shadow Mode. It does not switch to Recall Mode.
_Avoid_: Recall Mode, dictionary translate, word lookup

**Show Original**:
A sticky visibility setting for whether the original phrase text is shown automatically during phrase navigation. It can be toggled with a small reveal/eye control or shortcut and is distinct from switching practice modes.
_Avoid_: Auto Reveal, Listen mode, subtitles mode

**Guided Phrase Navigation**:
The deliberate practice mode where Replay, Previous, and Next operate on the currently selected visible practice phrase. In this mode button and shortcut navigation should advance from the visible phrase index, not from the YouTube playhead.
_Avoid_: Passive sync, normal YouTube playback

**Caption Language**:
The language of the timed text supplied by a practice source. It is selected through the practice source choice, either by accepting the default ranking or by choosing another available source.
_Avoid_: Learning language

**Original Caption Candidate**:
The practice source most likely to match the video's original spoken language when YouTube does not expose an explicit original-language marker. The first manual caption track in YouTube's order is the preferred candidate; if no manual track exists, the first auto-caption track is the candidate.
_Avoid_: Original caption, source of truth

**Learning Language**:
A normalized language hint sent with dictionary lookup when the selected caption language is not already suitable for the lookup API. It should not exist as a separate user-facing choice when the caption language can be used directly, and it should not be hard-coded to Dutch.
_Avoid_: Target language, definition language

**Dictionary Meaning Card**:
A learner-facing dictionary candidate for one specific meaning/card identity returned by the dictionary authority. Learning and review actions such as Learn, Known, Again, Hard, Good, and Easy apply to this card, not to the clicked word globally.
_Avoid_: Word card, lookup result, definition

**Generated Draft Card**:
A learner-facing Dictionary Meaning Card produced from the clicked form and phrase context before it has a durable dictionary entry identity. It may be rendered like a normal card with a temporary draft identity, but saving and learning are still explicit user actions.
_Avoid_: No-match fallback, generated text, unsaved entry

**Generated Draft Candidate**:
One alternative generated version of a Generated Draft Card for the same clicked form and phrase context. A learner may compare candidates and choose which one to save.
_Avoid_: Revision, regenerated field, final card

**Draft Edit Revision**:
A change to the content of one Generated Draft Candidate, such as regenerating a definition field, adding an example, or manually editing text. It is not a separate candidate unless the whole card is regenerated as an alternative.
_Avoid_: New card, candidate, saved entry

**Clicked Form**:
The exact word form the learner clicked in the phrase text. It can differ from the dictionary lemma or headword, for example an inflected verb form.
_Avoid_: Lemma, headword

**Lemma**:
The dictionary headword or base form used to render a Dictionary Meaning Card for a clicked form. Lemma detection may come from the dictionary authority or a backend NLP step, not from the extension UI.
_Avoid_: Clicked form, selected word

**Personal Encounter Signal**:
A quiet per-card signal showing the learner's prior active encounters with this dictionary card, such as seen count and last seen time. It is a lightweight memory cue, not a primary learning action or analytics dashboard.
_Avoid_: Progress dashboard, review grade, list membership
