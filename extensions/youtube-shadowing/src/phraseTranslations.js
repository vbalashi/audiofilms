(function audioFilmsPhraseTranslationsModule() {
  function phraseDisplayText(phrase) {
    return String(phrase?.displayText || phrase?.text || "").trim();
  }

  function phraseTranslationSourceText(phrase) {
    return String(phrase?.translationText || phrase?.displayText || phrase?.text || "").trim();
  }

  function phraseSegmentIndicator(phrases, phrase, index) {
    const segmentId = String(phrase?.displaySegmentId || "");
    if (!segmentId || phrase?.segmentRole !== "sentence-segment") {
      return { count: 1, index: 0 };
    }

    const segments = (Array.isArray(phrases) ? phrases : [])
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidate }) => (
        candidate?.segmentRole === "sentence-segment" &&
        candidate?.displaySegmentId === segmentId
      ));
    const count = Math.max(1, segments.length);
    const segmentIndex = Math.max(0, segments.findIndex((segment) => segment.candidateIndex === index));
    return { count, index: segmentIndex >= 0 ? segmentIndex : 0 };
  }

  function phraseDisplaySegmentRange(phrase) {
    const displayText = phraseDisplayText(phrase);
    if (!displayText || displayText === String(phrase?.text || "").trim()) return null;
    const start = finiteInteger(phrase?.displayStartChar);
    const end = finiteInteger(phrase?.displayEndChar);
    if (start !== null && end !== null && end > start && start >= 0 && end <= displayText.length) {
      return { start, end };
    }
    const replayText = String(phrase?.text || "").trim();
    const found = replayText ? displayText.indexOf(replayText) : -1;
    return found >= 0 ? { start: found, end: found + replayText.length } : null;
  }

  function segmentOverlapsRange(segment, range) {
    if (!range) return false;
    return segment.charEnd > range.start && segment.charStart < range.end;
  }

  function phraseTranslationKey({ phrase, index = 0, videoId = "", sourceId = "" } = {}) {
    if (!phrase) return "";
    const sourceText = phraseTranslationSourceText(phrase);
    return [
      videoId || "video",
      sourceId || "source",
      phrase.displaySegmentId || String(phrase.index ?? index),
      String(sourceText || "").slice(0, 120),
    ].join("|");
  }

  function phraseTranslationId({ phrase, index = 0, videoId = "", sourceId = "" } = {}) {
    if (!phrase) return "";
    return [
      videoId || "video",
      sourceId || "source",
      phrase.displaySegmentId || String(phrase.index ?? index),
    ].join(":");
  }

  function sourceLanguageCode({ source, transcriptResult } = {}) {
    return source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      transcriptResult?.languageCode ||
      "auto";
  }

  function phraseTranslationPayload(options = {}) {
    const targetLanguageCode = options.targetLanguageCode || "";
    const payload = {
      phraseId: phraseTranslationId(options),
      sourceText: phraseTranslationSourceText(options.phrase),
      sourceLanguageCode: options.sourceLanguageCode || "auto",
      contextText: phraseDisplayText(options.phrase),
      purpose: "youtube-phrase-practice",
    };
    if (targetLanguageCode) payload.targetLanguageCode = targetLanguageCode;
    return payload;
  }

  function spanTranslationId({ phrase, span, phraseIndex = 0, videoId = "", sourceId = "" } = {}) {
    return `${phraseTranslationId({ phrase, index: phraseIndex, videoId, sourceId })}:span:${span?.startTokenIndex}-${span?.endTokenIndex}`;
  }

  function spanTranslationPayload(options = {}) {
    const targetLanguageCode = options.targetLanguageCode || "";
    const span = options.span || {};
    const payload = {
      phraseId: spanTranslationId(options),
      sourceText: span.text || "",
      sourceLanguageCode: options.sourceLanguageCode || "auto",
      contextText: span.contextText || options.phrase?.text || "",
      purpose: "youtube-span-translation",
    };
    if (targetLanguageCode) payload.targetLanguageCode = targetLanguageCode;
    return payload;
  }

  function phraseTranslationText(translation) {
    return translation?.status === "ready" ? translation.translatedText || "" : "";
  }

  function phraseTranslationCopy({ translation, accountStatus } = {}) {
    if (translation?.status === "ready" && translation.translatedText) {
      return translation.translatedText;
    }
    if (translation?.status === "loading") return "Translating phrase...";
    if (translation?.status === "failed") return translation.error || "Phrase translation failed.";
    if (accountStatus !== "signed-in") return "Connect 2000NL to translate phrases.";
    return "Translation not requested yet.";
  }

  function phraseTranslationResultState(translation) {
    const translatedText = translation?.translatedText || "";
    return translatedText
      ? { ...translation, status: "ready", translatedText }
      : {
          ...translation,
          status: "failed",
          error: translation?.error?.message || translation?.error?.code || "Phrase translation returned no text.",
        };
  }

  function spanTranslationResultState(span, translation) {
    const translatedText = translation?.translatedText || "";
    return translatedText
      ? { ...span, ...translation, status: "ready", translatedText, error: "" }
      : {
          ...span,
          ...translation,
          status: "failed",
          error: translation?.error?.message || translation?.error?.code || "Selected span translation returned no text.",
        };
  }

  function normalizePracticeMode(mode) {
    return mode === "recall" ? "recall" : "shadow";
  }

  function phraseEntryDisplayState(input = {}) {
    const practiceMode = normalizePracticeMode(input.practiceMode);
    const phraseTranslationVisible = practiceMode === "recall"
      ? true
      : Boolean(input.phraseTranslationStickyVisible);
    return {
      practiceMode,
      textVisible: practiceMode === "recall" ? false : Boolean(input.shadowTextVisible),
      phraseTranslationVisible,
      shouldEnsureTranslation: practiceMode === "recall" || phraseTranslationVisible,
    };
  }

  function phraseTranslationToggleState(input = {}) {
    if (input.shiftKey) {
      const sticky = !input.phraseTranslationStickyVisible;
      return {
        phraseTranslationStickyVisible: sticky,
        phraseTranslationVisible: sticky,
        shouldEnsureTranslation: sticky,
      };
    }
    const visible = !input.phraseTranslationVisible;
    return {
      phraseTranslationStickyVisible: Boolean(input.phraseTranslationStickyVisible),
      phraseTranslationVisible: visible,
      shouldEnsureTranslation: visible,
    };
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  window.__afShadowingPhraseTranslations = {
    phraseDisplayText,
    phraseTranslationSourceText,
    phraseSegmentIndicator,
    phraseDisplaySegmentRange,
    segmentOverlapsRange,
    phraseTranslationKey,
    phraseTranslationId,
    sourceLanguageCode,
    phraseTranslationPayload,
    spanTranslationId,
    spanTranslationPayload,
    phraseTranslationText,
    phraseTranslationCopy,
    phraseTranslationResultState,
    spanTranslationResultState,
    normalizePracticeMode,
    phraseEntryDisplayState,
    phraseTranslationToggleState,
  };
})();
