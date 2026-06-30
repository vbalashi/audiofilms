(function audioFilmsPlaybackContentFacade() {
  function createPlaybackControllers(deps = {}) {
    const playbackController = deps.playbackContentWorkflow.createPlaybackController({
      getState: deps.getState,
      playbackWorkflow: deps.playbackWorkflow,
      getVideoElement: deps.getVideoElement,
      stopPlaybackTimer: deps.stopPlaybackTimer,
      playbackSession: deps.playbackSession,
      playbackTiming: deps.playbackTiming,
      playbackEndMsForPhrase: deps.playbackEndMsForPhrase,
      findPlaybackPhraseIndex: deps.findPlaybackPhraseIndex,
      syncPlaybackRateFromVideo: deps.syncPlaybackRateFromVideo,
      slowReplayPlaybackRate: deps.slowReplayPlaybackRate,
      markCurrentTranscriptSegment: deps.markCurrentTranscriptSegment,
      recordNavigationEvent: deps.recordNavigationEvent,
      describePhraseAtIndex: deps.describePhraseAtIndex,
      getPlaybackSnapshot: deps.getPlaybackSnapshot,
      updateDisplayPreferences: deps.updateDisplayPreferences,
      ensurePassivePlaybackWatcher,
      isCurrentPhraseStillSelected: deps.isCurrentPhraseStillSelected,
      phraseProgressStore: deps.phraseProgressStore,
      applyPhraseEntryDisplayState: deps.applyPhraseEntryDisplayState,
      enterGuidedMode: deps.enterGuidedMode,
      resolveWordTiming: deps.resolveWordTiming,
      phraseDisplaySegmentRange: deps.phraseDisplaySegmentRange,
      playbackTimingConfig: deps.playbackTimingConfig,
      requestAnimationFrame: deps.requestAnimationFrame,
      cancelAnimationFrame: deps.cancelAnimationFrame,
      setTimeout: deps.setTimeout,
      roundTime: deps.roundTime,
      preRollMs: deps.preRollMs,
      render: deps.render,
    });

    const passivePlaybackController = deps.passivePlaybackContentWorkflow.createPassivePlaybackController({
      getState: deps.getState,
      passivePlaybackWatcher: deps.passivePlaybackWatcher,
      playbackSession: deps.playbackSession,
      playbackRateOptions: deps.playbackRateOptions,
      getVideoElement: deps.getVideoElement,
      syncPlaybackRateFromVideo: deps.syncPlaybackRateFromVideo,
      syncPassivePlayback,
      startPassivePlaybackFrame,
      restorePlaybackRateAfterOverride: deps.restorePlaybackRateAfterOverride,
      cancelAnimationFrame: deps.cancelAnimationFrame,
      render: deps.render,
    });

    function ensurePassivePlaybackWatcher() {
      return passivePlaybackController.ensurePassivePlaybackWatcher();
    }

    function syncPassivePlayback(video) {
      return playbackController.syncPassivePlayback(video);
    }

    function startPassivePlaybackFrame(video) {
      return playbackController.startPassivePlaybackFrame(video);
    }

    return {
      playbackController,
      passivePlaybackController,
    };
  }

  window.__afShadowingPlaybackContentFacade = {
    createPlaybackControllers,
  };
})();
