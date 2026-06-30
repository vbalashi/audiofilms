(function audioFilmsPhraseRowsModule() {
  const phraseTranslationApi = window.__afShadowingPhraseTranslations;
  const formatUtilsApi = window.__afShadowingFormatUtils;
  const phraseTokenApi = window.__afShadowingPhraseTokens;

  function phraseRowState({
    phrase,
    index = 0,
    phrases = [],
    currentIndex = 0,
    practiceMode = "shadow",
    textVisible = true,
    phraseTranslationVisible = false,
    translation = null,
    accountStatus = "guest",
    playbackEndMs = null,
  } = {}) {
    const segmentIndicator = phraseTranslationApi.phraseSegmentIndicator(phrases, phrase, index);
    const phraseTranslationText = phraseTranslationApi.phraseTranslationText(translation);
    const phraseTranslationCopy = phraseTranslationApi.phraseTranslationCopy({
      translation,
      accountStatus,
    });
    const showOriginal = index !== currentIndex || Boolean(textVisible);
    const replayRange = phraseTranslationApi.phraseDisplaySegmentRange(phrase);
    const isRecall = practiceMode === "recall";

    return {
      dataset: {
        startMs: String(Math.round(phrase?.startMs || 0)),
        endMs: String(Math.round(phrase?.endMs || 0)),
        playbackEndMs: String(Math.round(Number.isFinite(playbackEndMs) ? playbackEndMs : phrase?.endMs || 0)),
      },
      segmentIndicator,
      classes: {
        segmentedRail: segmentIndicator.count > 1,
        current: index === currentIndex,
        past: index < currentIndex,
        future: index > currentIndex,
        recallMode: isRecall,
        shadowMode: practiceMode === "shadow",
      },
      timeText: formatUtilsApi.formatTimestamp(phrase?.startMs || 0),
      prompt: {
        text: isRecall && index === currentIndex ? phraseTranslationCopy : "Phrase prompt placeholder",
        hidden: !(isRecall && index === currentIndex),
      },
      text: {
        displayText: phraseTranslationApi.phraseDisplayText(phrase),
        showOriginal,
        replayRange,
        hasReplaySegment: Boolean(replayRange),
      },
      translation: {
        hidden: isRecall || !phraseTranslationVisible,
        unavailable: phraseTranslationVisible && !phraseTranslationText,
        visibleText: phraseTranslationVisible ? phraseTranslationCopy : phraseTranslationText || "",
      },
    };
  }

  function clickableWordState({
    segment,
    phraseIndex = 0,
    replayRange = null,
    selectedWord = null,
    selectedSpan = null,
    spanDraft = null,
    lastWordReplay = null,
    nowMs = Date.now(),
  } = {}) {
    const selectedWordMatches = selectedWord?.phraseIndex === phraseIndex &&
      formatUtilsApi.wordsEqual(selectedWord.word, segment?.lookupWord);
    return {
      dataset: {
        lookupWord: segment?.lookupWord || "",
        phraseIndex: String(phraseIndex),
        tokenIndex: String(segment?.tokenIndex ?? ""),
        charStart: String(segment?.charStart ?? ""),
        charEnd: String(segment?.charEnd ?? ""),
      },
      classes: {
        replaySegment: phraseTranslationApi.segmentOverlapsRange(segment, replayRange),
        selected: selectedWordMatches,
        spanSelected: tokenInSpan(selectedSpan, phraseIndex, segment?.tokenIndex),
        spanDraft: tokenInSpanDraft(spanDraft, phraseIndex, segment?.tokenIndex),
        wordReplay: lastWordReplay?.phraseIndex === phraseIndex &&
          lastWordReplay?.tokenIndex === segment?.tokenIndex &&
          nowMs - lastWordReplay.atMs < 1600,
      },
    };
  }

  function clickablePhraseSegmentsState({
    text = "",
    phraseIndex = 0,
    replayRange = null,
    selectedWord = null,
    selectedSpan = null,
    spanDraft = null,
    lastWordReplay = null,
    nowMs = Date.now(),
  } = {}) {
    return phraseTokenApi.tokenizeClickablePhraseText(text).map((segment) => {
      if (segment.kind !== "word") {
        return { kind: "text", text: segment.text };
      }
      return {
        kind: "word",
        segment,
        text: segment.text,
        state: clickableWordState({
          segment,
          phraseIndex,
          replayRange,
          selectedWord,
          selectedSpan,
          spanDraft,
          lastWordReplay,
          nowMs,
        }),
      };
    });
  }

  function tokenInSpan(span, phraseIndex, tokenIndex) {
    if (!span || span.phraseIndex !== phraseIndex) return false;
    return tokenIndex >= span.startTokenIndex && tokenIndex <= span.endTokenIndex;
  }

  function tokenInSpanDraft(draft, phraseIndex, tokenIndex) {
    if (!draft || draft.phraseIndex !== phraseIndex) return false;
    const startTokenIndex = Math.min(draft.startTokenIndex, draft.endTokenIndex);
    const endTokenIndex = Math.max(draft.startTokenIndex, draft.endTokenIndex);
    return tokenIndex >= startTokenIndex && tokenIndex <= endTokenIndex;
  }

  window.__afShadowingPhraseRows = {
    phraseRowState,
    clickableWordState,
    clickablePhraseSegmentsState,
    tokenInSpan,
    tokenInSpanDraft,
  };
})();
