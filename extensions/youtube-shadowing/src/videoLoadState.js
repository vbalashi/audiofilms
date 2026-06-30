(function audioFilmsVideoLoadState() {
  function currentVideoResetPatch({ videoId = "", loadToken = 0, bootDiagnostics = null } = {}) {
    return {
      videoId,
      loadToken,
      tracks: [],
      practiceSources: [],
      selectedSourceId: "",
      sourceMenuOpen: false,
      selectedTrack: null,
      cueSource: "",
      transcriptResult: null,
      cues: [],
      phrases: [],
      currentIndex: 0,
      textVisible: true,
      shadowTextVisible: true,
      phraseTranslationVisible: false,
      phraseTranslationStickyVisible: false,
      phraseTranslations: {},
      lastPhraseProgressRestore: null,
      timingOperation: null,
      timingOperationError: "",
      selectedWord: null,
      selectedSpan: null,
      guidedMode: false,
      error: "",
      loading: true,
      ...(bootDiagnostics ? { bootDiagnostics } : {}),
    };
  }

  function resetSourceForLoad(source) {
    if (!source) return;
    source.error = "";
    source.lastError = "";
    source.lastRetrievalAttempts = [];
  }

  function sourceLoadStartPatch() {
    return {
      loading: true,
      error: "",
      cueSource: "",
      transcriptResult: null,
    };
  }

  function sourceLoadFailureLog({ source, captionTracks, error }) {
    return {
      source: captionTracks.sourceDisplayName(source),
      languageCode: source?.languageCode || "",
      error,
    };
  }

  function sourceLoadSuccessLog({
    source,
    captionTracks,
    transcriptResult,
    cues = [],
    phrases = [],
    phraseProgressRestore = null,
  } = {}) {
    return {
      source: captionTracks.sourceDisplayName(source),
      sourceKind: transcriptResult?.sourceKind || "",
      retrievalPath: transcriptResult?.retrievalPath || "",
      timingExactness: transcriptResult?.timingExactness || "",
      qualityFlags: transcriptResult?.qualityFlags || [],
      warnings: transcriptResult?.warnings || [],
      cues: cues.length,
      phrases: phrases.length,
      phraseProgressRestore,
    };
  }

  window.__afShadowingVideoLoadState = {
    currentVideoResetPatch,
    resetSourceForLoad,
    sourceLoadStartPatch,
    sourceLoadFailureLog,
    sourceLoadSuccessLog,
  };
})();
