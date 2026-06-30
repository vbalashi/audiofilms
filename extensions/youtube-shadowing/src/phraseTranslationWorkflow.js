(function audioFilmsPhraseTranslationWorkflow() {
  function ensureCurrentPhraseTranslation(state, options = {}) {
    const phrase = state.phrases[state.currentIndex];
    if (!phrase) return false;
    const key = options.phraseTranslationKey(phrase, state.currentIndex);
    const existing = state.phraseTranslations[key];
    if (existing?.status === "ready" || existing?.status === "loading") return false;
    if (state.accountStatus !== "signed-in") {
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: {
          status: "failed",
          error: "Connect 2000NL to translate phrases.",
        },
      };
      return true;
    }
    options.requestPhraseTranslation?.(phrase, state.currentIndex, key);
    return true;
  }

  function applyPhraseEntryDisplayState(state, options = {}) {
    const displayState = options.phraseTranslations.phraseEntryDisplayState({
      practiceMode: state.practiceMode,
      shadowTextVisible: state.shadowTextVisible,
      phraseTranslationStickyVisible: state.phraseTranslationStickyVisible,
    });
    state.practiceMode = displayState.practiceMode;
    state.textVisible = displayState.textVisible;
    state.phraseTranslationVisible = displayState.phraseTranslationVisible;
    if (displayState.shouldEnsureTranslation) {
      options.ensureCurrentPhraseTranslation?.();
    }
    return displayState;
  }

  function togglePhraseTranslation(state, event, options = {}) {
    const toggleState = options.phraseTranslations.phraseTranslationToggleState({
      shiftKey: Boolean(event?.shiftKey),
      phraseTranslationVisible: state.phraseTranslationVisible,
      phraseTranslationStickyVisible: state.phraseTranslationStickyVisible,
    });
    state.phraseTranslationStickyVisible = toggleState.phraseTranslationStickyVisible;
    state.phraseTranslationVisible = toggleState.phraseTranslationVisible;
    if (toggleState.shouldEnsureTranslation) {
      options.ensureCurrentPhraseTranslation?.();
    }
    options.render?.();
    return toggleState;
  }

  function setPracticeMode(state, mode, options = {}) {
    state.practiceMode = options.phraseTranslations.normalizePracticeMode(mode);
    const displayState = applyPhraseEntryDisplayState(state, options);
    options.render?.();
    return displayState;
  }

  async function requestPhraseTranslation(state, { phrase, index, key, options = {} } = {}) {
    const requestSeq = state.phraseTranslationSeq + 1;
    state.phraseTranslationSeq = requestSeq;
    state.phraseTranslations = {
      ...state.phraseTranslations,
      [key]: { status: "loading" },
    };
    options.render?.();

    const source = options.getSelectedPracticeSource?.();
    const sourceLanguageCode = options.phraseTranslations.sourceLanguageCode({
      source,
      transcriptResult: state.transcriptResult,
    });
    const targetLanguageCode = state.accountPreferences?.translationTargetLanguageCode || "";

    try {
      const translation = await options.postDictionaryCommand("phrase-translation", options.phraseTranslations.phraseTranslationPayload({
        phrase,
        index,
        videoId: state.videoId,
        sourceId: state.selectedSourceId,
        sourceLanguageCode,
        targetLanguageCode,
      }));
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: options.phraseTranslations.phraseTranslationResultState(translation),
      };
      options.recordDebugEvent?.("phrase-translation-loaded", {
        phraseId: options.phraseTranslationId(phrase, index),
        status: state.phraseTranslations[key]?.status,
        requestSeq,
      });
    } catch (error) {
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      };
      options.recordDebugEvent?.("phrase-translation-failed", {
        phraseId: options.phraseTranslationId(phrase, index),
        error: state.phraseTranslations[key]?.error || "",
        requestSeq,
      });
    } finally {
      options.render?.();
    }
  }

  async function requestSelectedSpanTranslation(state, span, options = {}) {
    const phrase = state.phrases[span.phraseIndex];
    if (!phrase) return false;
    const source = options.getSelectedPracticeSource?.();
    const sourceLanguageCode = options.phraseTranslations.sourceLanguageCode({
      source,
      transcriptResult: state.transcriptResult,
    });
    const targetLanguageCode = state.accountPreferences?.translationTargetLanguageCode || "";

    if (state.accountStatus !== "signed-in") {
      state.selectedSpan = {
        ...span,
        status: "failed",
        error: "Connect 2000NL to translate selected phrases.",
      };
      options.render?.();
      return true;
    }

    try {
      const translation = await options.postDictionaryCommand("phrase-translation", options.phraseTranslations.spanTranslationPayload({
        phrase,
        span,
        phraseIndex: span.phraseIndex,
        videoId: state.videoId,
        sourceId: state.selectedSourceId,
        sourceLanguageCode,
        targetLanguageCode,
      }));
      if (state.selectedSpan !== span) return false;
      state.selectedSpan = options.phraseTranslations.spanTranslationResultState(span, translation);
      options.render?.();
      return true;
    } catch (error) {
      if (state.selectedSpan !== span) return false;
      state.selectedSpan = {
        ...span,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      options.render?.();
      return true;
    }
  }

  window.__afShadowingPhraseTranslationWorkflow = {
    ensureCurrentPhraseTranslation,
    applyPhraseEntryDisplayState,
    togglePhraseTranslation,
    setPracticeMode,
    requestPhraseTranslation,
    requestSelectedSpanTranslation,
  };
})();
