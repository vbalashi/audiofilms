(function audioFilmsPhrases() {
  const DEFAULT_MAX_PHRASE_DURATION_MS = 12000;
  const DEFAULT_LONG_PAUSE_MS = 1000;
  const DEFAULT_MAX_WORDS = 18;
  const DEFAULT_MAX_CHARACTERS = 140;

  function buildPhrases(cues, options = {}) {
    const maxPhraseDurationMs = options.maxPhraseDurationMs ?? DEFAULT_MAX_PHRASE_DURATION_MS;
    const longPauseMs = options.longPauseMs ?? DEFAULT_LONG_PAUSE_MS;
    const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
    const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
    const phrases = [];
    let current = null;

    for (const cue of cues) {
      if (!current) {
        current = phraseFromCue(cue);
        continue;
      }

      const pause = cue.startMs - current.endMs;
      const nextDuration = cue.endMs - current.startMs;
      const nextText = cleanPhraseText(`${current.text} ${cue.text}`);
      const shouldBreak =
        hasSentenceEnding(current.text) ||
        pause > longPauseMs ||
        nextDuration > maxPhraseDurationMs ||
        wordCount(nextText) > maxWords ||
        nextText.length > maxCharacters;

      if (shouldBreak) {
        phrases.push(current);
        current = phraseFromCue(cue);
      } else {
        current.endMs = Math.max(current.endMs, cue.endMs);
        current.text = nextText;
        current.cues.push(cue);
      }
    }

    if (current) phrases.push(current);

    return phrases.map((phrase, index) => ({
      ...phrase,
      index,
    }));
  }

  function phraseFromCue(cue) {
    return {
      startMs: cue.startMs,
      endMs: cue.endMs,
      text: cleanPhraseText(cue.text),
      cues: [cue],
    };
  }

  function cleanPhraseText(text) {
    return text
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasSentenceEnding(text) {
    return /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
  }

  function wordCount(text) {
    const matches = String(text || "").match(/[\p{L}\p{N}]+/gu);
    return matches ? matches.length : 0;
  }

  window.__afShadowingPhrases = {
    buildPhrases,
    cleanPhraseText,
    hasSentenceEnding,
    wordCount,
  };
})();
