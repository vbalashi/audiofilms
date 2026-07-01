(function audioFilmsPlaybackWorkflow() {
  function requestVideoPlay(video, deps = {}, shouldRetry = () => false) {
    video.play().catch(() => {});
    if (!deps.setTimeout) return;
    deps.setTimeout(() => {
      if (!shouldRetry() || !video.paused) return;
      video.play().catch(() => {});
    }, 80);
  }

  function holdPhraseAtStart(index, options = {}, deps = {}) {
    const state = deps.getState();
    const phrase = state.phrases[index];
    const video = deps.getVideoElement?.();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    deps.stopPlaybackTimer?.();
    const holdSeconds = Math.max(0, phrase.startMs / 1000);
    video.pause();
    video.currentTime = holdSeconds;
    state.currentIndex = index;
    state.guidedMode = true;
    state.guidedHold = {
      index,
      holdSeconds,
      createdAt: deps.nowMs?.() ?? Date.now(),
    };
    state.passivePausedKey = `${state.videoId || ""}:${state.selectedSourceId}:recall-entry:${index}`;
    deps.markCurrentTranscriptSegment?.(phrase);
    deps.recordNavigationEvent?.("recall-entry-hold", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: deps.describePhraseAtIndex(index),
      holdSeconds: deps.roundTime(holdSeconds),
      playback: deps.getPlaybackSnapshot(),
    });
    deps.render?.();
    return {
      ok: true,
      seekToSec: deps.roundTime(holdSeconds),
      expectedPauseAtSec: deps.roundTime(holdSeconds),
      autoPause: true,
      heldForRecall: true,
    };
  }

  function playPhrase(index, options = {}, deps = {}) {
    const state = deps.getState();
    const phrase = state.phrases[index];
    const video = deps.getVideoElement?.();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    deps.stopPlaybackTimer?.();
    const playbackStartMs = deps.playbackTiming.phrasePlaybackStartMs(phrase);
    const startSeconds = Math.max(0, playbackStartMs - deps.preRollMs) / 1000;
    const endSeconds = deps.playbackEndMsForPhrase(state.phrases, index) / 1000;
    const normalPlaybackRate = deps.syncPlaybackRateFromVideo(video);
    const requestedPlaybackRate = options.slowReplay ? deps.slowReplayPlaybackRate() : normalPlaybackRate;
    deps.markCurrentTranscriptSegment?.(phrase);
    video.currentTime = startSeconds;
    if (options.slowReplay) {
      state.pendingPlaybackRateRestore = normalPlaybackRate;
      video.playbackRate = requestedPlaybackRate;
    }
    requestVideoPlay(video, deps, () => state.activePlayback?.index === index);
    deps.recordNavigationEvent?.("seek-started", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: deps.describePhraseAtIndex(index),
      seekToSec: deps.roundTime(startSeconds),
      phraseStartSec: deps.roundTime(phrase.startMs / 1000),
      playbackStartSec: deps.roundTime(playbackStartMs / 1000),
      expectedPauseAtSec: deps.roundTime(endSeconds),
      playbackRate: requestedPlaybackRate,
      slowReplay: Boolean(options.slowReplay),
      playbackAfterSeek: deps.getPlaybackSnapshot(),
    });

    if (!state.autoPause && !options.slowReplay) {
      deps.render?.();
      return {
        ok: true,
        seekToSec: deps.roundTime(startSeconds),
        phraseStartSec: deps.roundTime(phrase.startMs / 1000),
        playbackStartSec: deps.roundTime(playbackStartMs / 1000),
        expectedPauseAtSec: null,
        autoPause: false,
        playbackRate: requestedPlaybackRate,
        slowReplay: false,
      };
    }

    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: endSeconds,
      playbackRate: requestedPlaybackRate,
      restorePlaybackRate: options.slowReplay ? normalPlaybackRate : null,
      slowReplay: Boolean(options.slowReplay),
    };
    state.playbackFrame = deps.requestAnimationFrame(function frame() {
      deps.enforcePhraseEnd(video);
      if (state.activePlayback) {
        state.playbackFrame = deps.requestAnimationFrame(frame);
      }
    });
    return {
      ok: true,
      seekToSec: deps.roundTime(startSeconds),
      expectedPauseAtSec: deps.roundTime(endSeconds),
      autoPause: true,
      playbackRate: requestedPlaybackRate,
      slowReplay: Boolean(options.slowReplay),
    };
  }

  function playWordReplay(index, selection, options = {}, deps = {}) {
    const state = deps.getState();
    const phrase = state.phrases[index];
    const video = deps.getVideoElement?.();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }
    const wordTiming = deps.resolveWordTiming(phrase, selection);
    if (options.mode === "word" && !wordTiming) {
      return deps.playbackTiming.wordReplayTiming({
        phrase,
        phrases: state.phrases,
        selection,
        wordTiming,
        displaySegmentRange: deps.phraseDisplaySegmentRange(phrase),
        mode: options.mode || "",
        options: deps.playbackTimingConfig(),
      });
    }

    const timing = deps.playbackTiming.wordReplayTiming({
      phrase,
      phrases: state.phrases,
      selection,
      wordTiming,
      displaySegmentRange: deps.phraseDisplaySegmentRange(phrase),
      mode: options.mode || "",
      options: deps.playbackTimingConfig(),
    });
    if (!timing.ok) return timing;

    deps.stopPlaybackTimer?.();
    state.currentIndex = index;
    state.guidedMode = true;
    deps.phraseProgressStore.schedule(`word-replay-${options.mode || "unknown"}`);
    deps.markCurrentTranscriptSegment?.(phrase);
    video.currentTime = timing.startSeconds;
    state.activePlayback = {
      index,
      endSeconds: timing.endSeconds,
      holdSeconds: timing.endSeconds,
      wordReplay: {
        mode: options.mode,
        tokenIndex: selection.tokenIndex,
        timingSource: timing.timingSource,
      },
    };
    state.playbackFrame = deps.requestAnimationFrame(function frame() {
      deps.enforcePhraseEnd(video);
      if (state.activePlayback) {
        state.playbackFrame = deps.requestAnimationFrame(frame);
      }
    });
    requestVideoPlay(video, deps, () => state.activePlayback?.index === index);
    return {
      ok: true,
      seekToSec: timing.seekToSec,
      expectedPauseAtSec: timing.expectedPauseAtSec,
      timingSource: timing.timingSource,
      autoPause: true,
    };
  }

  function handleWordReplayGesture(event, word, phraseIndex, selection, deps = {}) {
    const state = deps.getState();
    const mode = event?.ctrlKey || event?.metaKey ? "word" : "from-word";
    const result = deps.playWordReplay(phraseIndex, selection, { mode, word });
    state.lastWordReplay = {
      atMs: deps.nowMs?.() ?? Date.now(),
      mode,
      word,
      phraseIndex,
      tokenIndex: selection.tokenIndex,
      ok: result.ok,
      reason: result.reason || null,
      timingSource: result.timingSource || null,
      seekToSec: result.seekToSec ?? null,
      expectedPauseAtSec: result.expectedPauseAtSec ?? null,
    };
    deps.recordNavigationEvent?.("word-replay", state.lastWordReplay);
    deps.render?.();
    return state.lastWordReplay;
  }

  function navigateToPhrase(command, targetIndex, options = {}, deps = {}) {
    const state = deps.getState();
    const fromIndex = state.currentIndex;
    const before = deps.getPlaybackSnapshot();
    const navigationEvent = deps.recordNavigationEvent?.("command-start", {
      command,
      fromPhrase: deps.describePhraseAtIndex(fromIndex),
      targetPhrase: deps.describePhraseAtIndex(targetIndex),
      playbackBefore: before,
    });
    state.guidedHold = null;
    state.currentIndex = targetIndex;
    deps.phraseProgressStore.schedule(command);
    if (fromIndex !== targetIndex) {
      state.selectedSpan = null;
      deps.applyPhraseEntryDisplayState?.();
    }
    deps.enterGuidedMode?.();
    deps.render?.();

    const shouldHoldRecall = state.practiceMode === "recall" &&
      (command === "next" || command === "previous") &&
      fromIndex !== targetIndex;
    const playResult = shouldHoldRecall
      ? deps.holdPhraseAtStart(targetIndex, {
          command,
          navigationEventId: navigationEvent?.id,
        })
      : deps.playPhrase(state.currentIndex, {
          command,
          navigationEventId: navigationEvent?.id,
          slowReplay: Boolean(options.slowReplay),
        });
    deps.recordNavigationEvent?.("command-dispatched", {
      command,
      navigationEventId: navigationEvent?.id,
      fromIndex,
      targetIndex,
      playResult,
      playbackAfterDispatch: deps.getPlaybackSnapshot(),
    });
    deps.scheduleNavigationObservation?.(navigationEvent?.id, command, targetIndex, 250);
    deps.scheduleNavigationObservation?.(navigationEvent?.id, command, targetIndex, 750);
  }

  function jumpToPhrase(targetIndex, reason = "jump-number", deps = {}) {
    const state = deps.getState();
    const phrase = state.phrases[targetIndex];
    const video = deps.getVideoElement?.();
    if (!phrase || !video) return false;

    deps.stopPlaybackTimer?.();
    video.pause();
    video.currentTime = Math.max(0, phrase.startMs / 1000);
    state.currentIndex = targetIndex;
    state.guidedHold = {
      index: targetIndex,
      holdSeconds: video.currentTime,
      createdAt: deps.nowMs?.() ?? Date.now(),
    };
    state.passivePausedKey = "";
    state.phraseJumpMenuOpen = false;
    state.phraseJumpError = "";
    state.lastMenuTrigger = null;
    deps.markCurrentTranscriptSegment?.(phrase);
    deps.phraseProgressStore?.schedule(reason);
    deps.recordNavigationEvent?.("phrase-jump", {
      reason,
      targetPhrase: deps.describePhraseAtIndex(targetIndex),
      playback: deps.getPlaybackSnapshot(),
    });
    deps.render?.();
    return true;
  }

  function toggleContinuousPlayback(deps = {}) {
    const state = deps.getState();
    const video = deps.getVideoElement?.();
    if (!video) return false;

    const before = deps.getPlaybackSnapshot();
    deps.stopPlaybackTimer?.();
    state.guidedMode = false;
    state.passivePausedKey = "";

    const eventType = video.paused || video.ended ? "space-play" : "space-pause";
    const navigationEvent = deps.recordNavigationEvent?.(eventType, {
      currentPhrase: deps.describePhraseAtIndex(state.currentIndex),
      playbackBefore: before,
    });
    if (eventType === "space-play") {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    deps.scheduleNavigationObservation?.(
      navigationEvent?.id || state.navigationEvents?.[state.navigationEvents.length - 1]?.id || null,
      "space",
      state.currentIndex,
      250,
    );
    deps.render?.();
    return true;
  }

  function toggleAutoPause(deps = {}) {
    const state = deps.getState();
    const nextAutoPause = !state.autoPause;
    deps.updateDisplayPreferences?.((preferences) => ({
      ...preferences,
      autoPause: nextAutoPause,
    }));
    state.guidedMode = nextAutoPause;
    state.passivePausedKey = "";
    deps.recordNavigationEvent?.("auto-pause-toggle", {
      autoPause: nextAutoPause,
      guidedMode: state.guidedMode,
      playback: deps.getPlaybackSnapshot(),
      currentPhrase: deps.describePhraseAtIndex(state.currentIndex),
    });
    const video = deps.getVideoElement?.();
    if (video && nextAutoPause) {
      deps.ensurePassivePlaybackWatcher?.();
      deps.syncPassivePlayback?.(video);
    }
    deps.render?.();
    return nextAutoPause;
  }

  function syncIndexToCurrentTime(options = {}, deps = {}) {
    const state = deps.getState();
    const video = deps.getVideoElement?.();
    if (!video || !state.phrases.length) return false;

    const currentMs = video.currentTime * 1000;
    if (options.keepCurrentIfJustEnded && deps.isCurrentPhraseStillSelected?.(currentMs)) {
      return false;
    }

    const activeIndex = state.phrases.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex < 0) return false;

    const changed = activeIndex !== state.currentIndex;
    state.currentIndex = activeIndex;
    if (changed) {
      state.selectedSpan = null;
      deps.applyPhraseEntryDisplayState?.();
    }
    deps.render?.();
    return true;
  }

  function startPassivePlaybackFrame(video, deps = {}) {
    const state = deps.getState();
    if (state.passiveFrame) {
      deps.cancelAnimationFrame?.(state.passiveFrame);
    }

    state.passiveFrame = deps.requestAnimationFrame(function frame() {
      if (state.passiveVideo !== video) {
        state.passiveFrame = null;
        return;
      }

      deps.syncPassivePlayback?.(video);
      if (!video.paused) {
        state.passiveFrame = deps.requestAnimationFrame(frame);
      } else {
        state.passiveFrame = null;
      }
    });
    return state.passiveFrame;
  }

  function syncPassivePlayback(video, deps = {}) {
    const state = deps.getState();
    if (!video || !state.learningEnabled || state.loading || !state.phrases.length) return false;

    const activePatch = deps.playbackSession.activePlaybackSyncPatch(state);
    if (activePatch) {
      deps.applyStatePatch(activePatch.statePatch);
      deps.phraseProgressStore.schedule(activePatch.progressReason);
      deps.markCurrentTranscriptSegment?.(activePatch.phrase);
      deps.render?.();
      return true;
    }
    if (state.activePlayback) {
      return false;
    }

    const currentMs = video.currentTime * 1000;
    const holdPatch = preserveGuidedHold(currentMs, deps);
    if (holdPatch?.preserve) {
      return false;
    }

    const index = deps.findPlaybackPhraseIndex(state.phrases, currentMs);
    const phrase = state.phrases[index];
    if (!phrase) return false;

    const passivePatch = deps.playbackSession.passiveSyncPatch(state, {
      index,
      phrase,
      videoPaused: video.paused,
      currentMs,
      playbackEndMs: deps.playbackEndMsForPhrase(state.phrases, index),
    });

    if (passivePatch.action === "sync-index") {
      deps.applyStatePatch(passivePatch.statePatch);
      deps.phraseProgressStore.schedule(passivePatch.progressReason);
      deps.markCurrentTranscriptSegment?.(phrase);
      deps.render?.();
      if (passivePatch.shouldHoldRecallEntry) {
        deps.holdPhraseAtStart(index, { command: "passive-recall-entry" });
      }
      return true;
    }

    if (passivePatch.action === "pause") {
      deps.applyStatePatch(passivePatch.statePatch);
      video.pause();
      deps.markCurrentTranscriptSegment?.(passivePatch.phrase);
      deps.render?.();
      return true;
    }
    return false;
  }

  function enforcePhraseEnd(video, deps = {}) {
    const state = deps.getState();
    if (!state.activePlayback || !video) return false;
    if (video.currentTime < state.activePlayback.endSeconds) return false;

    video.pause();
    const pausedAtSeconds = video.currentTime;
    const holdPatch = deps.playbackSession.phraseEndHoldPatch(state, pausedAtSeconds);
    if (!holdPatch) return false;
    deps.applyStatePatch(holdPatch.statePatch);
    deps.phraseProgressStore.schedule(holdPatch.progressReason);
    deps.markCurrentTranscriptSegment?.(holdPatch.phrase);
    deps.recordNavigationEvent?.("auto-pause-held", {
      targetPhrase: deps.describePhraseAtIndex(holdPatch.index),
      holdSeconds: deps.roundTime(pausedAtSeconds),
      wordReplay: holdPatch.wordReplay,
      playback: deps.getPlaybackSnapshot(),
    });
    deps.stopPlaybackTimer?.();
    deps.render?.();
    return true;
  }

  function preserveGuidedHold(currentMs, deps = {}) {
    const patch = deps.playbackSession.guidedHoldPatch(deps.getState(), currentMs);
    if (patch.statePatch) {
      deps.applyStatePatch(patch.statePatch);
    }
    if (patch.progressReason) {
      deps.phraseProgressStore.schedule(patch.progressReason);
      deps.markCurrentTranscriptSegment?.(patch.phrase);
      deps.render?.();
    }
    return patch;
  }

  window.__afShadowingPlaybackWorkflow = {
    holdPhraseAtStart,
    playPhrase,
    playWordReplay,
    handleWordReplayGesture,
    navigateToPhrase,
    jumpToPhrase,
    toggleContinuousPlayback,
    toggleAutoPause,
    syncIndexToCurrentTime,
    startPassivePlaybackFrame,
    syncPassivePlayback,
    enforcePhraseEnd,
    preserveGuidedHold,
  };
})();
