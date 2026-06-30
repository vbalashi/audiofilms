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

  function createPlaybackRuntimeController(deps = {}) {
    const environment = deps.environment || {};
    const constants = deps.constants || {};
    let playbackController = null;
    let passivePlaybackController = null;

    function getVideoElement() {
      const video = deps.youtubeAdapter.getVideoElement(environment.document);
      deps.updateBootDiagnostics({ videoElementDetected: Boolean(video) });
      return video;
    }

    function findPlaybackPhraseIndex(phrases, currentMs) {
      return deps.playbackTiming.findPlaybackPhraseIndex(phrases, currentMs, playbackTimingConfig());
    }

    function playbackEndMsForPhrase(phrases, index) {
      return deps.playbackTiming.playbackEndMsForPhrase(phrases, index, playbackTimingConfig());
    }

    function isCurrentPhraseStillSelected(currentMs) {
      const state = deps.getState();
      return deps.playbackSession.isCurrentPhraseStillSelected({
        phrases: state.phrases,
        currentIndex: state.currentIndex,
        currentMs,
        replayGraceMs: constants.postRollMs + 900,
      });
    }

    function resolveWordTiming(phrase, selection = {}) {
      const state = deps.getState();
      return deps.playbackTiming.resolveWordTiming({
        phrase,
        phrases: state.phrases,
        selection,
        transcriptTimingExactness: state.transcriptResult?.timingExactness || "",
      });
    }

    function estimateWordStartMs(phrase, selection = {}) {
      return deps.playbackTiming.estimateWordStartMs({
        phrase,
        selection,
        displaySegmentRange: deps.phraseDisplaySegmentRange(phrase),
      });
    }

    function phrasePlaybackStartMs(phrase) {
      return deps.playbackTiming.phrasePlaybackStartMs(phrase);
    }

    function playbackTimingConfig() {
      return {
        preRollMs: constants.preRollMs,
        postRollMs: constants.postRollMs,
        minAudibleEndTailMs: constants.minAudibleEndTailMs,
        contiguousBoundaryGuardMs: constants.contiguousBoundaryGuardMs,
      };
    }

    function stopPlaybackTimer() {
      const state = deps.getState();
      restorePlaybackRateAfterOverride();
      if (state.playbackFrame) {
        environment.window.cancelAnimationFrame(state.playbackFrame);
        state.playbackFrame = null;
      }
      state.activePlayback = null;
    }

    function restorePlaybackRateAfterOverride(video = getVideoElement()) {
      deps.playbackSession.restorePlaybackRateAfterOverride(deps.getState(), video, deps.playbackRateOptions());
    }

    function markCurrentTranscriptSegment(phrase) {
      deps.transcriptPanelDom.markCurrentTranscriptSegment({
        document: environment.document,
        phrase,
      });
    }

    function toggleText(event) {
      const state = deps.getState();
      if (event?.shiftKey) {
        state.shadowTextVisible = !state.shadowTextVisible;
        if (state.practiceMode === "shadow") {
          state.textVisible = state.shadowTextVisible;
        }
      } else {
        state.textVisible = !state.textVisible;
      }
      deps.render();
    }

    function enterGuidedMode() {
      deps.getState().guidedMode = true;
    }

    function showText() {
      deps.getState().textVisible = true;
      deps.render();
    }

    const controllers = createPlaybackControllers({
      ...deps,
      getVideoElement,
      stopPlaybackTimer,
      playbackEndMsForPhrase,
      findPlaybackPhraseIndex,
      markCurrentTranscriptSegment,
      isCurrentPhraseStillSelected,
      enterGuidedMode,
      resolveWordTiming,
      playbackTimingConfig,
      restorePlaybackRateAfterOverride,
      requestAnimationFrame: (callback) => environment.window.requestAnimationFrame(callback),
      cancelAnimationFrame: (frame) => environment.window.cancelAnimationFrame(frame),
      setTimeout: (callback, ms) => environment.window.setTimeout(callback, ms),
      preRollMs: constants.preRollMs,
    });
    playbackController = controllers.playbackController;
    passivePlaybackController = controllers.passivePlaybackController;

    return {
      playbackController,
      passivePlaybackController,
      jumpToPhrase: (targetIndex, reason) => playbackController.jumpToPhrase(targetIndex, reason),
      handleWordReplayGesture: (event, word, phraseIndex, selection) =>
        playbackController.handleWordReplayGesture(event, word, phraseIndex, selection),
      findPlaybackPhraseIndex,
      getVideoElement,
      replayCurrentPhrase: (options = {}) => playbackController.replayCurrentPhrase(options),
      pauseCurrentPlayback: (command = "pause") => playbackController.pauseCurrentPlayback(command),
      nextPhrase: () => playbackController.nextPhrase(),
      previousPhrase: () => playbackController.previousPhrase(),
      navigateToPhrase: (command, targetIndex, options = {}) => playbackController.navigateToPhrase(command, targetIndex, options),
      holdPhraseAtStart: (index, options = {}) => playbackController.holdPhraseAtStart(index, options),
      toggleText,
      toggleAutoPause: () => playbackController.toggleAutoPause(),
      enterGuidedMode,
      showText,
      syncIndexToCurrentTime: (options = {}) => playbackController.syncIndexToCurrentTime(options),
      isCurrentPhraseStillSelected,
      playbackEndMsForPhrase,
      playWordReplay: (index, selection, options = {}) => playbackController.playWordReplay(index, selection, options),
      resolveWordTiming,
      estimateWordStartMs,
      playPhrase: (index, options = {}) => playbackController.playPhrase(index, options),
      phrasePlaybackStartMs,
      playbackTimingConfig,
      scheduleNavigationObservation: (navigationEventId, command, targetIndex, delayMs) =>
        playbackController.scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs),
      stopPlaybackTimer,
      restorePlaybackRateAfterOverride,
      markCurrentTranscriptSegment,
      ensurePassivePlaybackWatcher: () => passivePlaybackController.ensurePassivePlaybackWatcher(),
      detachPassivePlaybackWatcher: () => passivePlaybackController.detachPassivePlaybackWatcher(),
      onPassiveVideoTimeUpdate: (event) => passivePlaybackController.onPassiveVideoTimeUpdate(event),
      onPassiveVideoPlay: (event) => passivePlaybackController.onPassiveVideoPlay(event),
      onPassiveVideoPause: () => passivePlaybackController.onPassiveVideoPause(),
      onPassiveVideoRateChange: (event) => passivePlaybackController.onPassiveVideoRateChange(event),
      startPassivePlaybackFrame: (video) => playbackController.startPassivePlaybackFrame(video),
      syncPassivePlayback: (video) => playbackController.syncPassivePlayback(video),
      enforcePhraseEnd: (video) => playbackController.enforcePhraseEnd(video),
      shouldPreserveGuidedHold: (currentMs) => playbackController.preserveGuidedHold(currentMs),
      toggleContinuousPlayback: () => playbackController.toggleContinuousPlayback(),
    };
  }

  window.__afShadowingPlaybackContentFacade = {
    createPlaybackControllers,
    createPlaybackRuntimeController,
  };
})();
