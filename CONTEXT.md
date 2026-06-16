# AudioFilms

AudioFilms is a listening-practice product centered on YouTube videos, caption-derived phrases, and deliberate shadowing practice.

## Language

**Selected Caption Track**:
The caption track the system intends to use for a YouTube video after applying language and manual-vs-auto preference rules. It is not necessarily the source that ultimately supplies timed practice text.
_Avoid_: Source of truth, active transcript

**Cue Source**:
The mechanism that actually supplies the timed cues used to build practice phrases. For the YouTube extension, this should be visible at MVP level as `timedtext` or `fallback` when it differs from the selected caption track path.
_Avoid_: Selected track, caption track

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

**Display Text**:
The learner-visible text for a practice phrase. Display text can come from manual captions, ASR captions, provider-cleaned text, or aligned text, and it does not by itself define practice phrase timing.
_Avoid_: Timing evidence, cue source, provider

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
A learner-facing dictionary candidate for one specific meaning/card identity returned by the dictionary authority. Learning actions such as remembered, forgot, known, or unknown apply to this card, not to the clicked word globally.
_Avoid_: Word card, lookup result, definition
