(function audioFilmsPlaybackSession() {
  function clampPlaybackRate(value, options = {}) {
    return options.clampNumber(
      Number(value),
      options.min,
      options.max,
      options.fallback ?? 1,
    );
  }

  function nextPlaybackRate(currentRate, delta, options = {}) {
    return clampPlaybackRate(Number(currentRate) + Number(delta || 0), options);
  }

  function syncPlaybackRateFromVideo(state, video = null, options = {}) {
    const rate = clampPlaybackRate(video?.playbackRate || state.playbackRate || 1, options);
    state.playbackRate = rate;
    return rate;
  }

  function setVideoPlaybackRate(state, video, rate, options = {}) {
    const nextRate = clampPlaybackRate(rate, options);
    state.playbackRate = nextRate;
    if (video) {
      video.playbackRate = nextRate;
    }
    return nextRate;
  }

  function slowReplayPlaybackRate(state, options = {}) {
    return clampPlaybackRate(
      state.displayPreferences?.playback?.slowReplaySpeed,
      {
        ...options,
        fallback: options.slowReplayFallback,
      },
    );
  }

  function restorePlaybackRateAfterOverride(state, video = null, options = {}) {
    const restoreRate = state.activePlayback?.restorePlaybackRate || state.pendingPlaybackRateRestore;
    if (!restoreRate || !video) return null;
    const rate = setVideoPlaybackRate(state, video, restoreRate, options);
    state.pendingPlaybackRateRestore = null;
    return rate;
  }

  function formatPlaybackRate(value, options = {}) {
    return options.formatPlaybackRate(value, {
      min: options.min,
      max: options.max,
      fallback: options.fallback ?? 1,
    });
  }

  function isCurrentPhraseStillSelected({ phrases = [], currentIndex = 0, currentMs = 0, replayGraceMs = 0 } = {}) {
    const phrase = phrases[currentIndex];
    if (!phrase) return false;
    return currentMs >= phrase.startMs && currentMs <= phrase.endMs + replayGraceMs;
  }

  function activePlaybackSyncPatch(state) {
    if (!state.activePlayback) return null;
    const index = state.activePlayback.index;
    const phrase = state.phrases[index];
    if (!phrase || state.currentIndex === index) return null;
    return {
      index,
      phrase,
      statePatch: { currentIndex: index },
      progressReason: "active-playback",
    };
  }

  function guidedHoldPatch(state, currentMs, options = {}) {
    if (!state.guidedMode || !state.guidedHold) return { preserve: false };
    const phrase = state.phrases[state.guidedHold.index];
    if (!phrase) return { preserve: false };
    const holdMs = state.guidedHold.holdSeconds * 1000;
    const atHeldBoundary = Math.abs(currentMs - holdMs) <= (options.boundaryToleranceMs ?? 350);
    if (!atHeldBoundary) {
      return {
        preserve: false,
        statePatch: { guidedHold: null },
      };
    }
    if (state.currentIndex !== state.guidedHold.index) {
      return {
        preserve: true,
        phrase,
        statePatch: { currentIndex: state.guidedHold.index },
        progressReason: "guided-hold",
      };
    }
    return { preserve: true };
  }

  function passiveSyncPatch(state, { index = 0, phrase = null, videoPaused = false, currentMs = 0, playbackEndMs = 0 } = {}) {
    if (!phrase) return { action: "none" };
    if (index !== state.currentIndex) {
      return {
        action: "sync-index",
        index,
        phrase,
        statePatch: { currentIndex: index },
        progressReason: "passive-sync",
        shouldHoldRecallEntry: state.practiceMode === "recall" && state.guidedMode && state.autoPause && !videoPaused,
      };
    }
    if (!state.guidedMode || !state.autoPause || state.activePlayback || videoPaused || currentMs < playbackEndMs) {
      return { action: "none" };
    }
    const pauseKey = `${state.videoId || ""}:${state.selectedSourceId}:${index}`;
    if (state.passivePausedKey === pauseKey) return { action: "none" };
    return {
      action: "pause",
      phrase,
      statePatch: { passivePausedKey: pauseKey },
    };
  }

  function phraseEndHoldPatch(state, pausedAtSeconds) {
    if (!state.activePlayback) return null;
    const index = state.activePlayback.index;
    const phrase = state.phrases[index];
    return {
      index,
      phrase,
      statePatch: {
        currentIndex: index,
        guidedHold: {
          index,
          holdSeconds: pausedAtSeconds,
          createdAt: Date.now(),
        },
      },
      progressReason: "auto-pause-held",
      wordReplay: state.activePlayback.wordReplay || null,
    };
  }

  window.__afShadowingPlaybackSession = {
    clampPlaybackRate,
    nextPlaybackRate,
    syncPlaybackRateFromVideo,
    setVideoPlaybackRate,
    slowReplayPlaybackRate,
    restorePlaybackRateAfterOverride,
    formatPlaybackRate,
    isCurrentPhraseStillSelected,
    activePlaybackSyncPatch,
    guidedHoldPatch,
    passiveSyncPatch,
    phraseEndHoldPatch,
  };
})();
