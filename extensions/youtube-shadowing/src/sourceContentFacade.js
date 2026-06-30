(function audioFilmsSourceContentFacade() {
  function createSourceController(deps = {}) {
    const sourceTranscriptController = deps.sourceTranscriptContentWorkflow.createSourceTranscriptController({
      getState: deps.getState,
      sourceTranscriptWorkflow: deps.sourceTranscriptWorkflow,
      transcriptRetrieval: deps.transcriptRetrieval,
      transcriptMetadata: deps.transcriptMetadata,
      updateBootDiagnostics: deps.updateBootDiagnostics,
      recordDebugEvent: deps.recordDebugEvent,
      maxPhraseDurationMs: deps.maxPhraseDurationMs,
      longPauseMs: deps.longPauseMs,
      maxWords: deps.maxWords,
      maxCharacters: deps.maxCharacters,
    });

    const sourceTimingController = deps.sourceTimingContentWorkflow.createSourceTimingController({
      getState: deps.getState,
      getSelectedPracticeSource,
      practiceReadiness: deps.practiceReadiness,
      timingOperationState: deps.timingOperationState,
      apiBaseForBackendCommands: deps.apiBaseForBackendCommands,
      postBackendJson: deps.postBackendJson,
      getBackendJson: deps.getBackendJson,
      sourceReadiness: deps.sourceReadiness,
      sourceSelection: deps.sourceSelection,
      sourceTimingWorkflow: deps.sourceTimingWorkflow,
      transcriptMetadata: deps.transcriptMetadata,
      phrasesFromTranscriptResult,
      findPhraseIndexForTime: deps.findPhraseIndexForTime,
      getVideoElement: deps.getVideoElement,
      updateBootDiagnostics: deps.updateBootDiagnostics,
      ensurePassivePlaybackWatcher: deps.ensurePassivePlaybackWatcher,
      syncPassivePlayback: deps.syncPassivePlayback,
      phraseProgressStore: deps.phraseProgressStore,
      captionTracks: deps.captionTracks,
      recordDebugEvent: deps.recordDebugEvent,
      render: deps.render,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
    });

    const sourceLoadController = deps.sourceLoadContentWorkflow.createSourceLoadController({
      getState: deps.getState,
      sourceLoadWorkflow: deps.sourceLoadWorkflow,
      getSelectedPracticeSource,
      getVideoElement: deps.getVideoElement,
      render: deps.render,
      videoLoadState: deps.videoLoadState,
      sourceSelection: deps.sourceSelection,
      transcriptMetadata: deps.transcriptMetadata,
      playbackTiming: deps.playbackTiming,
      captionTracks: deps.captionTracks,
      phraseProgressStore: deps.phraseProgressStore,
      sourceSelectionStore: deps.sourceSelectionStore,
      transcriptResultFromLoadedSource,
      fetchReusableTimingTranscriptResult,
      fetchBestAvailableCues,
      phrasesFromTranscriptResult,
      updateBootDiagnostics: deps.updateBootDiagnostics,
      ensurePassivePlaybackWatcher: deps.ensurePassivePlaybackWatcher,
      syncPassivePlayback: deps.syncPassivePlayback,
      findPlaybackPhraseIndex: deps.findPlaybackPhraseIndex,
      markCurrentTranscriptSegment: deps.markCurrentTranscriptSegment,
      describePhraseAtIndex: deps.describePhraseAtIndex,
      getPlaybackSnapshot: deps.getPlaybackSnapshot,
      recordNavigationEvent: deps.recordNavigationEvent,
      recordDebugEvent: deps.recordDebugEvent,
    });

    function refreshSelectedSourceCache() {
      return sourceLoadController.refreshSelectedSourceCache();
    }

    function startImproveTiming(textSourceOverride) {
      return sourceTimingController.startImproveTiming(textSourceOverride);
    }

    function applyTimingOperation(operation) {
      return sourceTimingController.applyTimingOperation(operation);
    }

    function applyTimingOperationResultToActiveSource(operation) {
      return sourceTimingController.applyTimingOperationResultToActiveSource(operation);
    }

    function scheduleTimingOperationPoll(operation) {
      return sourceTimingController.scheduleTimingOperationPoll(operation);
    }

    function pollTimingOperation(operationId) {
      return sourceTimingController.pollTimingOperation(operationId);
    }

    function clearTimingOperationPoll() {
      return sourceTimingController.clearTimingOperationPoll();
    }

    function getSelectedPracticeSource() {
      return sourceTranscriptController.getSelectedPracticeSource();
    }

    function selectPracticeSource(sourceId) {
      return sourceLoadController.selectPracticeSource(sourceId);
    }

    function loadPracticeSource(source, options) {
      return sourceLoadController.loadPracticeSource(source, options);
    }

    function phrasesFromTranscriptResult(transcriptResult) {
      return sourceTranscriptController.phrasesFromTranscriptResult(transcriptResult);
    }

    function maybeSwitchToPreferredSource(options = {}) {
      return sourceLoadController.maybeSwitchToPreferredSource(options);
    }

    function holdInitialAutoPauseAfterSourceLoad() {
      return sourceLoadController.holdInitialAutoPauseAfterSourceLoad();
    }

    function transcriptResultFromLoadedSource(source) {
      return sourceTimingController.transcriptResultFromLoadedSource(source);
    }

    function fetchReusableTimingTranscriptResult(source, resultOverride = null) {
      return sourceTimingController.fetchReusableTimingTranscriptResult(source, resultOverride);
    }

    function registerTimingOperationResultSources(operation, options = {}) {
      return sourceTimingController.registerTimingOperationResultSources(operation, options);
    }

    function fetchBestAvailableCues(track, options = {}) {
      return sourceTranscriptController.fetchBestAvailableCues(track, options);
    }

    function normalizeTranscriptResult(result, track) {
      return sourceTranscriptController.normalizeTranscriptResult(result, track);
    }

    return {
      refreshSelectedSourceCache,
      startImproveTiming,
      applyTimingOperation,
      applyTimingOperationResultToActiveSource,
      scheduleTimingOperationPoll,
      pollTimingOperation,
      clearTimingOperationPoll,
      getSelectedPracticeSource,
      selectPracticeSource,
      loadPracticeSource,
      phrasesFromTranscriptResult,
      maybeSwitchToPreferredSource,
      holdInitialAutoPauseAfterSourceLoad,
      transcriptResultFromLoadedSource,
      fetchReusableTimingTranscriptResult,
      registerTimingOperationResultSources,
      fetchBestAvailableCues,
      normalizeTranscriptResult,
    };
  }

  window.__afShadowingSourceContentFacade = {
    createSourceController,
  };
})();
