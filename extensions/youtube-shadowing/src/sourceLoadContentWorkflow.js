(function audioFilmsSourceLoadContentWorkflow() {
  function createSourceLoadController(deps = {}) {
    function sourceLoadWorkflowOptions() {
      return {
        getState: deps.getState,
        applyStatePatch: (patch) => Object.assign(deps.getState(), patch),
        applySourcePatch: (source, patch) => Object.assign(source, patch),
        getVideoElement: deps.getVideoElement,
        render: deps.render,
        videoLoadState: deps.videoLoadState,
        sourceSelection: deps.sourceSelection,
        transcriptMetadata: deps.transcriptMetadata,
        playbackTiming: deps.playbackTiming,
        captionTracks: deps.captionTracks,
        phraseProgressStore: deps.phraseProgressStore,
        sourceSelectionStore: deps.sourceSelectionStore,
        transcriptResultFromLoadedSource: deps.transcriptResultFromLoadedSource,
        fetchReusableTimingTranscriptResult: deps.fetchReusableTimingTranscriptResult,
        fetchBestAvailableCues: deps.fetchBestAvailableCues,
        phrasesFromTranscriptResult: deps.phrasesFromTranscriptResult,
        updateBootDiagnostics: deps.updateBootDiagnostics,
        ensurePassivePlaybackWatcher: deps.ensurePassivePlaybackWatcher,
        syncPassivePlayback: deps.syncPassivePlayback,
        findPlaybackPhraseIndex: deps.findPlaybackPhraseIndex,
        markCurrentTranscriptSegment: deps.markCurrentTranscriptSegment,
        describePhraseAtIndex: deps.describePhraseAtIndex,
        getPlaybackSnapshot: deps.getPlaybackSnapshot,
        recordNavigationEvent: deps.recordNavigationEvent,
        recordDebugEvent: deps.recordDebugEvent,
        holdInitialAutoPauseAfterSourceLoad,
        maybeSwitchToPreferredSource,
        getSelectedPracticeSource: deps.getSelectedPracticeSource,
        loadPracticeSource,
      };
    }

    function refreshSelectedSourceCache() {
      return deps.sourceLoadWorkflow.refreshSelectedSourceCache(sourceLoadWorkflowOptions());
    }

    function selectPracticeSource(sourceId) {
      return deps.sourceLoadWorkflow.selectPracticeSource(sourceId, sourceLoadWorkflowOptions());
    }

    function loadPracticeSource(source, options) {
      return deps.sourceLoadWorkflow.loadPracticeSource(source, options, sourceLoadWorkflowOptions());
    }

    function maybeSwitchToPreferredSource(options = {}) {
      return deps.sourceLoadWorkflow.maybeSwitchToPreferredSource(options, sourceLoadWorkflowOptions());
    }

    function holdInitialAutoPauseAfterSourceLoad() {
      return deps.sourceLoadWorkflow.holdInitialAutoPauseAfterSourceLoad(sourceLoadWorkflowOptions());
    }

    return {
      refreshSelectedSourceCache,
      selectPracticeSource,
      loadPracticeSource,
      maybeSwitchToPreferredSource,
      holdInitialAutoPauseAfterSourceLoad,
    };
  }

  window.__afShadowingSourceLoadContentWorkflow = {
    createSourceLoadController,
  };
})();
