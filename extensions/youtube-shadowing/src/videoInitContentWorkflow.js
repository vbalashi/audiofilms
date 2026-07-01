(function audioFilmsVideoInitContentWorkflow() {
  function createVideoInitController(deps = {}) {
    function videoInitWorkflowOptions() {
      return {
        getState: deps.getState,
        applyStatePatch: (patch) => Object.assign(deps.getState(), patch),
        getVideoIdFromUrl: deps.getVideoIdFromUrl,
        updateBootDiagnostics: deps.updateBootDiagnostics,
        phraseProgressStore: deps.phraseProgressStore,
        videoLoadState: deps.videoLoadState,
        clearTimingOperationPoll: deps.clearTimingOperationPoll,
        stopPlaybackTimer: deps.stopPlaybackTimer,
        detachPassivePlaybackWatcher: deps.detachPassivePlaybackWatcher,
        resetTranscriptPanelState: deps.resetTranscriptPanelState,
        render: deps.render,
        waitForPlayerResponse: deps.waitForPlayerResponse,
        captionTracks: deps.captionTracks,
        sourceSelectionStore: deps.sourceSelectionStore,
        loadPracticeSource: deps.loadPracticeSource,
        renderToggle: deps.renderToggle,
        removeWorkspace: deps.removeWorkspace,
        removeToggle: deps.removeToggle,
        ensureWorkspace: deps.ensureWorkspace,
        initializeForCurrentVideo,
      };
    }

    function initializeForCurrentVideo() {
      return deps.videoInitWorkflow.initializeForCurrentVideo(videoInitWorkflowOptions());
    }

    function handleCurrentLocation() {
      return deps.videoInitWorkflow.handleCurrentLocation(videoInitWorkflowOptions());
    }

    return {
      initializeForCurrentVideo,
      handleCurrentLocation,
    };
  }

  window.__afShadowingVideoInitContentWorkflow = {
    createVideoInitController,
  };
})();
