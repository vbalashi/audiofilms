(function audioFilmsSourceTranscriptWorkflow() {
  function getSelectedPracticeSource(state) {
    return state.practiceSources.find((source) => source.id === state.selectedSourceId) || null;
  }

  function phrasesFromTranscriptResult(transcriptResult, options = {}) {
    return options.transcriptMetadata.phrasesFromTranscriptResult(transcriptResult, {
      maxPhraseDurationMs: options.maxPhraseDurationMs,
      longPauseMs: options.longPauseMs,
      maxWords: options.maxWords,
      maxCharacters: options.maxCharacters,
    });
  }

  async function fetchBestAvailableCues(track, fetchOptions = {}, options = {}) {
    if (!options.transcriptRetrieval?.fetchBestAvailableCues) {
      throw new Error("Transcript retrieval helper was not loaded.");
    }

    const result = await options.transcriptRetrieval.fetchBestAvailableCues(track, {
      videoId: options.getState().videoId,
      recordDebugEvent: options.recordDebugEvent,
      updateRetrievalPath: (path) => options.updateBootDiagnostics({ selectedRetrievalPath: path }),
      updateLastError: (message) => options.updateBootDiagnostics({ lastError: message }),
      refreshCache: Boolean(fetchOptions.refreshCache),
    });
    return normalizeTranscriptResult(result, track, options);
  }

  function normalizeTranscriptResult(result, track, options = {}) {
    const normalized = options.transcriptMetadata.normalizeTranscriptResult(result, track);
    options.getState().cueSource = normalized.retrievalPath;
    return normalized;
  }

  window.__afShadowingSourceTranscriptWorkflow = {
    getSelectedPracticeSource,
    phrasesFromTranscriptResult,
    fetchBestAvailableCues,
    normalizeTranscriptResult,
  };
})();
