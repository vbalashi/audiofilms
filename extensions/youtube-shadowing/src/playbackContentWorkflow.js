(function audioFilmsPlaybackContentWorkflow() {
  function createPlaybackController(deps = {}) {
    function playbackWorkflowOptions() {
      return {
        getState: deps.getState,
        applyStatePatch: (patch) => Object.assign(deps.getState(), patch),
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
        ensurePassivePlaybackWatcher: deps.ensurePassivePlaybackWatcher,
        syncPassivePlayback,
        isCurrentPhraseStillSelected: deps.isCurrentPhraseStillSelected,
        phraseProgressStore: deps.phraseProgressStore,
        applyPhraseEntryDisplayState: deps.applyPhraseEntryDisplayState,
        enterGuidedMode: deps.enterGuidedMode,
        holdPhraseAtStart,
        playPhrase,
        playWordReplay,
        resolveWordTiming: deps.resolveWordTiming,
        phraseDisplaySegmentRange: deps.phraseDisplaySegmentRange,
        playbackTimingConfig: deps.playbackTimingConfig,
        enforcePhraseEnd,
        scheduleNavigationObservation,
        requestAnimationFrame: deps.requestAnimationFrame,
        cancelAnimationFrame: deps.cancelAnimationFrame,
        setTimeout: deps.setTimeout,
        roundTime: deps.roundTime,
        preRollMs: deps.preRollMs,
        render: deps.render,
      };
    }

    function jumpToPhrase(targetIndex, reason) {
      return deps.playbackWorkflow.jumpToPhrase(targetIndex, reason, playbackWorkflowOptions());
    }

    function handleWordReplayGesture(event, word, phraseIndex, selection) {
      return deps.playbackWorkflow.handleWordReplayGesture(event, word, phraseIndex, selection, playbackWorkflowOptions());
    }

    function replayCurrentPhrase(options = {}) {
      const state = deps.getState();
      if (!state.phrases.length) return false;
      navigateToPhrase(options.slowReplay ? "slow-replay" : "replay", state.currentIndex, options);
      return true;
    }

    function pauseCurrentPlayback(command = "pause") {
      const state = deps.getState();
      const video = deps.getVideoElement();
      if (!video) return false;

      const before = deps.getPlaybackSnapshot();
      deps.stopPlaybackTimer();
      state.guidedHold = null;
      if (!video.paused) {
        video.pause();
      }
      deps.recordNavigationEvent(`${command}-pause`, {
        currentPhrase: deps.describePhraseAtIndex(state.currentIndex),
        playbackBefore: before,
        playbackAfter: deps.getPlaybackSnapshot(),
      });
      deps.render();
      return true;
    }

    function nextPhrase() {
      const state = deps.getState();
      if (!state.phrases.length) return false;
      navigateToPhrase("next", Math.min(state.currentIndex + 1, state.phrases.length - 1));
      return true;
    }

    function previousPhrase() {
      const state = deps.getState();
      if (!state.phrases.length) return false;
      navigateToPhrase("previous", Math.max(state.currentIndex - 1, 0));
      return true;
    }

    function navigateToPhrase(command, targetIndex, options = {}) {
      return deps.playbackWorkflow.navigateToPhrase(command, targetIndex, options, playbackWorkflowOptions());
    }

    function holdPhraseAtStart(index, options = {}) {
      return deps.playbackWorkflow.holdPhraseAtStart(index, options, playbackWorkflowOptions());
    }

    function toggleAutoPause() {
      return deps.playbackWorkflow.toggleAutoPause(playbackWorkflowOptions());
    }

    function syncIndexToCurrentTime(options = {}) {
      return deps.playbackWorkflow.syncIndexToCurrentTime(options, playbackWorkflowOptions());
    }

    function playWordReplay(index, selection, options = {}) {
      return deps.playbackWorkflow.playWordReplay(index, selection, options, playbackWorkflowOptions());
    }

    function playPhrase(index, options = {}) {
      return deps.playbackWorkflow.playPhrase(index, options, playbackWorkflowOptions());
    }

    function scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs) {
      deps.setTimeout(() => {
        const state = deps.getState();
        deps.recordNavigationEvent("command-observation", {
          command,
          navigationEventId,
          delayMs,
          targetPhrase: deps.describePhraseAtIndex(targetIndex),
          currentPhrase: deps.describePhraseAtIndex(state.currentIndex),
          playback: deps.getPlaybackSnapshot(),
        });
        if (state.debugVisible) {
          deps.render();
        }
      }, delayMs);
    }

    function startPassivePlaybackFrame(video) {
      return deps.playbackWorkflow.startPassivePlaybackFrame(video, playbackWorkflowOptions());
    }

    function syncPassivePlayback(video) {
      return deps.playbackWorkflow.syncPassivePlayback(video, playbackWorkflowOptions());
    }

    function enforcePhraseEnd(video) {
      return deps.playbackWorkflow.enforcePhraseEnd(video, playbackWorkflowOptions());
    }

    function preserveGuidedHold(currentMs) {
      return deps.playbackWorkflow.preserveGuidedHold(currentMs, playbackWorkflowOptions());
    }

    function toggleContinuousPlayback() {
      return deps.playbackWorkflow.toggleContinuousPlayback(playbackWorkflowOptions());
    }

    return {
      jumpToPhrase,
      handleWordReplayGesture,
      replayCurrentPhrase,
      pauseCurrentPlayback,
      nextPhrase,
      previousPhrase,
      navigateToPhrase,
      holdPhraseAtStart,
      toggleAutoPause,
      syncIndexToCurrentTime,
      playWordReplay,
      playPhrase,
      scheduleNavigationObservation,
      startPassivePlaybackFrame,
      syncPassivePlayback,
      enforcePhraseEnd,
      preserveGuidedHold,
      toggleContinuousPlayback,
    };
  }

  window.__afShadowingPlaybackContentWorkflow = {
    createPlaybackController,
  };
})();
