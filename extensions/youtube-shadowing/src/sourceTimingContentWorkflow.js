(function audioFilmsSourceTimingContentWorkflow() {
  function createSourceTimingController(deps = {}) {
    function timingWorkflowOptions() {
      return {
        getState: deps.getState,
        getSelectedPracticeSource: deps.getSelectedPracticeSource,
        practiceReadiness: deps.practiceReadiness,
        timingOperationState: deps.timingOperationState,
        apiBaseForBackendCommands: deps.apiBaseForBackendCommands,
        postBackendJson: deps.postBackendJson,
        getBackendJson: deps.getBackendJson,
        buildPracticeTimingPayload,
        sourceReadiness: deps.sourceReadiness,
        transcriptMetadata: deps.transcriptMetadata,
        phrasesFromTranscriptResult: deps.phrasesFromTranscriptResult,
        findPhraseIndexForTime: deps.findPhraseIndexForTime,
        getVideoElement: deps.getVideoElement,
        updateBootDiagnostics: deps.updateBootDiagnostics,
        ensurePassivePlaybackWatcher: deps.ensurePassivePlaybackWatcher,
        syncPassivePlayback: deps.syncPassivePlayback,
        phraseProgressStore: deps.phraseProgressStore,
        captionTracks: deps.captionTracks,
        recordDebugEvent: deps.recordDebugEvent,
        render: deps.render,
        applyTimingOperation,
        applyTimingOperationResultToActiveSource,
        registerTimingOperationResultSources,
        scheduleTimingOperationPoll,
        clearTimingOperationPoll,
        pollTimingOperation,
        setTimeout: deps.setTimeout,
        clearTimeout: deps.clearTimeout,
      };
    }

    function startImproveTiming(textSourceOverride = "") {
      return deps.sourceTimingWorkflow.startImproveTiming(textSourceOverride, timingWorkflowOptions());
    }

    function buildPracticeTimingPayload(source, textSourceOverride = "", resultOverride = null) {
      const state = deps.getState();
      return deps.sourceReadiness.buildPracticeTimingPayload({
        source,
        videoId: state.videoId,
        textSourceOverride,
        resultOverride: resultOverride || source?.loadedTranscriptResult || state.transcriptResult || {},
      });
    }

    function applyTimingOperation(operation) {
      return deps.sourceTimingWorkflow.applyTimingOperation(operation, timingWorkflowOptions());
    }

    function applyTimingOperationResultToActiveSource(operation) {
      return deps.sourceTimingWorkflow.applyTimingOperationResultToActiveSource(operation, timingWorkflowOptions());
    }

    function scheduleTimingOperationPoll(operation) {
      return deps.sourceTimingWorkflow.scheduleTimingOperationPoll(operation, timingWorkflowOptions());
    }

    function pollTimingOperation(operationId) {
      return deps.sourceTimingWorkflow.pollTimingOperation(operationId, timingWorkflowOptions());
    }

    function clearTimingOperationPoll() {
      return deps.sourceTimingWorkflow.clearTimingOperationPoll(timingWorkflowOptions());
    }

    function transcriptResultFromLoadedSource(source) {
      return deps.sourceTimingWorkflow.transcriptResultFromLoadedSource({
        source,
        transcriptMetadata: deps.transcriptMetadata,
      });
    }

    function fetchReusableTimingTranscriptResult(source, resultOverride = null) {
      const state = deps.getState();
      return deps.sourceTimingWorkflow.fetchReusableTimingTranscriptResult({
        source,
        currentVideoId: state.videoId,
        resultOverride,
        apiBase: deps.apiBaseForBackendCommands(),
        postBackendJson: deps.postBackendJson,
        buildPracticeTimingPayload,
        transcriptMetadata: deps.transcriptMetadata,
        captionTracks: deps.captionTracks,
        recordDebugEvent: deps.recordDebugEvent,
        getCurrentTranscriptResult: () => deps.getState().transcriptResult,
        registerTimingOperationResultSources,
      });
    }

    function registerTimingOperationResultSources(operation, options = {}) {
      const state = deps.getState();
      return deps.sourceTimingWorkflow.registerTimingOperationResultSources({
        operation,
        ...(Object.prototype.hasOwnProperty.call(options, "mainResult") ? { mainResult: options.mainResult } : {}),
        selectedSource: deps.getSelectedPracticeSource(),
        practiceSources: state.practiceSources,
        transcriptResult: state.transcriptResult,
        transcriptMetadata: deps.transcriptMetadata,
        sourceSelection: deps.sourceSelection,
        recordDebugEvent: deps.recordDebugEvent,
      });
    }

    return {
      startImproveTiming,
      buildPracticeTimingPayload,
      applyTimingOperation,
      applyTimingOperationResultToActiveSource,
      scheduleTimingOperationPoll,
      pollTimingOperation,
      clearTimingOperationPoll,
      transcriptResultFromLoadedSource,
      fetchReusableTimingTranscriptResult,
      registerTimingOperationResultSources,
    };
  }

  window.__afShadowingSourceTimingContentWorkflow = {
    createSourceTimingController,
  };
})();
