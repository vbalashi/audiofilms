(function audioFilmsSourceTranscriptContentWorkflow() {
  function createSourceTranscriptController(deps = {}) {
    function sourceTranscriptWorkflowOptions() {
      return {
        getState: deps.getState,
        transcriptRetrieval: deps.transcriptRetrieval,
        transcriptMetadata: deps.transcriptMetadata,
        updateBootDiagnostics: deps.updateBootDiagnostics,
        recordDebugEvent: deps.recordDebugEvent,
        maxPhraseDurationMs: deps.maxPhraseDurationMs,
        longPauseMs: deps.longPauseMs,
        maxWords: deps.maxWords,
        maxCharacters: deps.maxCharacters,
      };
    }

    function getSelectedPracticeSource() {
      return deps.sourceTranscriptWorkflow.getSelectedPracticeSource(deps.getState());
    }

    function phrasesFromTranscriptResult(transcriptResult) {
      return deps.sourceTranscriptWorkflow.phrasesFromTranscriptResult(transcriptResult, sourceTranscriptWorkflowOptions());
    }

    function fetchBestAvailableCues(track, options = {}) {
      return deps.sourceTranscriptWorkflow.fetchBestAvailableCues(track, options, sourceTranscriptWorkflowOptions());
    }

    function normalizeTranscriptResult(result, track) {
      return deps.sourceTranscriptWorkflow.normalizeTranscriptResult(result, track, sourceTranscriptWorkflowOptions());
    }

    return {
      getSelectedPracticeSource,
      phrasesFromTranscriptResult,
      fetchBestAvailableCues,
      normalizeTranscriptResult,
    };
  }

  window.__afShadowingSourceTranscriptContentWorkflow = {
    createSourceTranscriptController,
  };
})();
