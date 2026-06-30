(function audioFilmsSourceLoadWorkflow() {
  async function refreshSelectedSourceCache(options = {}) {
    const state = options.getState();
    const source = options.getSelectedPracticeSource?.();
    if (!source || state.loading) return false;
    state.cacheRefreshRequested = true;
    options.recordDebugEvent?.("cache-refresh-start", {
      source: options.captionTracks.sourceDisplayName(source),
      videoId: state.videoId,
    });
    options.render?.();
    try {
      await options.loadPracticeSource(source, {
        keepExistingOnError: true,
        preserveVideoTime: true,
        refreshCache: true,
        allowPreferredSourceSwitch: false,
      });
      return true;
    } finally {
      state.cacheRefreshRequested = false;
      options.render?.();
    }
  }

  async function selectPracticeSource(sourceId, options = {}) {
    const state = options.getState();
    const source = state.practiceSources.find((candidate) => candidate.id === sourceId);
    if (!source || source.id === state.selectedSourceId || state.loading) return false;

    state.sourceMenuOpen = false;
    await options.loadPracticeSource(source, {
      keepExistingOnError: true,
      preserveVideoTime: true,
      persistSelection: true,
      allowPreferredSourceSwitch: false,
      sourceSelectionReason: "manual-select",
    });
    return true;
  }

  async function loadPracticeSource(source, loadOptions = {}, options = {}) {
    const state = options.getState();
    const loadToken = loadOptions.loadToken ?? state.loadToken;
    if (loadToken !== state.loadToken) return false;

    const video = options.getVideoElement?.();
    const currentMs = loadOptions.preserveVideoTime && video ? video.currentTime * 1000 : 0;

    options.applyStatePatch(options.videoLoadState.sourceLoadStartPatch());
    options.videoLoadState.resetSourceForLoad(source);
    options.render?.();

    try {
      const reusableTimingResult = source.track?.afPracticeSnapshotSource && source.loadedTranscriptResult?.practiceSnapshot
        ? options.transcriptResultFromLoadedSource(source)
        : await options.fetchReusableTimingTranscriptResult(source);
      const cachedTimingResult = loadOptions.refreshCache ? null : reusableTimingResult;
      let transcriptResult = cachedTimingResult || await options.fetchBestAvailableCues(source.track, {
        refreshCache: Boolean(loadOptions.refreshCache),
        preferBackendProvider: true,
      });
      if (!cachedTimingResult && transcriptResult?.timingExactness !== "word-level" && transcriptResult?.practiceArtifact) {
        transcriptResult = await options.fetchReusableTimingTranscriptResult(source, transcriptResult) || transcriptResult;
      }
      const cues = transcriptResult.cues;
      const phrases = options.phrasesFromTranscriptResult(transcriptResult);
      if (loadToken !== options.getState().loadToken) return false;
      if (!phrases.length) {
        throw new Error("Caption track loaded, but no timed phrases were parsed.");
      }
      const restoredProgress = await options.phraseProgressStore.read(source.id, phrases);
      if (loadToken !== options.getState().loadToken) return false;
      const playbackIndex = options.playbackTiming.findPhraseIndexForTime(phrases, currentMs);
      const loadedPatch = options.sourceSelection.loadedPracticeSourcePatch({
        source,
        transcriptResult,
        phrases,
        restoredProgress,
        playbackIndex,
        autoPause: options.getState().autoPause,
        transcriptSummary: options.transcriptMetadata.summarizeTranscriptResult(transcriptResult),
      });
      options.applyStatePatch(loadedPatch.statePatch);
      options.applySourcePatch(source, loadedPatch.sourcePatch);
      if (restoredProgress && video && phrases[loadedPatch.nextIndex]) {
        video.currentTime = Math.max(0, phrases[loadedPatch.nextIndex].startMs / 1000);
      }
      if (loadOptions.persistSelection) {
        options.sourceSelectionStore.write(source, loadOptions.sourceSelectionReason || "source-loaded");
      }
      options.updateBootDiagnostics?.({
        selectedRetrievalPath: transcriptResult.retrievalPath,
        lastError: "",
      });
      options.ensurePassivePlaybackWatcher?.();
      const playbackVideo = options.getVideoElement?.();
      if (playbackVideo && options.getState().autoPause) {
        options.syncPassivePlayback?.(playbackVideo);
      }
      options.recordDebugEvent?.("source-loaded", options.videoLoadState.sourceLoadSuccessLog({
        source,
        captionTracks: options.captionTracks,
        transcriptResult,
        cues,
        phrases,
        phraseProgressRestore: options.getState().lastPhraseProgressRestore,
      }));
      return true;
    } catch (error) {
      if (loadToken !== options.getState().loadToken) return false;
      const message = errorMessage(error);
      const failedPatch = options.sourceSelection.failedPracticeSourcePatch({
        source,
        message,
        summarizedError: options.transcriptMetadata.summarizeTranscriptError(message),
        retrievalAttempts: Array.isArray(error?.retrievalAttempts) ? error.retrievalAttempts : [],
        keepExistingOnError: Boolean(loadOptions.keepExistingOnError),
        existingPhraseCount: options.getState().phrases.length,
        practiceSourceCount: options.getState().practiceSources.length,
      });
      options.applySourcePatch(source, failedPatch.sourcePatch);
      options.applyStatePatch(failedPatch.statePatch);
      options.updateBootDiagnostics?.({ lastError: message });
      options.recordDebugEvent?.("source-failed", options.videoLoadState.sourceLoadFailureLog({
        source,
        captionTracks: options.captionTracks,
        error: message,
      }));
      return false;
    } finally {
      if (loadToken === options.getState().loadToken) {
        options.applyStatePatch({ loading: false });
        options.holdInitialAutoPauseAfterSourceLoad?.();
        options.render?.();
        if (loadOptions.allowPreferredSourceSwitch !== false) {
          try {
            await options.maybeSwitchToPreferredSource?.({
              loadToken,
              preserveVideoTime: Boolean(loadOptions.preserveVideoTime),
              reason: "post-load",
            });
          } catch (error) {
            options.recordDebugEvent?.("source-auto-switch-failed", {
              error: errorMessage(error),
            });
          }
        }
      }
    }
  }

  async function maybeSwitchToPreferredSource(switchOptions = {}, options = {}) {
    const state = options.getState();
    const loadToken = switchOptions.loadToken ?? state.loadToken;
    if (loadToken !== state.loadToken || state.loading || !state.practiceSources.length) return false;

    const preferred = options.sourceSelectionStore.choosePreferred(state.practiceSources);
    const target = preferred?.source;
    if (!target || target.id === state.selectedSourceId) return false;

    const current = options.getSelectedPracticeSource();
    if (
      preferred.reason !== "stored-selection" &&
      current &&
      options.sourceSelection.sourceSelectionRank(current) <= options.sourceSelection.sourceSelectionRank(target)
    ) {
      return false;
    }

    options.recordDebugEvent?.("source-auto-switch", {
      reason: switchOptions.reason || preferred.reason,
      selectionReason: preferred.reason,
      from: current ? options.captionTracks.sourceDisplayName(current) : "",
      to: options.captionTracks.sourceDisplayName(target),
      targetKind: options.sourceSelection.sourceSelectionKind(target),
    });
    await options.loadPracticeSource(target, {
      keepExistingOnError: true,
      preserveVideoTime: Boolean(switchOptions.preserveVideoTime),
      loadToken,
      persistSelection: preferred.reason === "stored-selection",
      allowPreferredSourceSwitch: false,
      sourceSelectionReason: preferred.reason,
    });
    return true;
  }

  function holdInitialAutoPauseAfterSourceLoad(options = {}) {
    const state = options.getState();
    if (!state.learningEnabled || !state.autoPause || !state.phrases.length) return false;

    const video = options.getVideoElement?.();
    if (!video) return false;

    state.guidedMode = true;
    if (!state.lastPhraseProgressRestore) {
      options.syncPassivePlayback?.(video);
    }

    if (video.paused) return false;

    const currentMs = video.currentTime * 1000;
    const index = options.findPlaybackPhraseIndex(state.phrases, currentMs);
    const phrase = state.lastPhraseProgressRestore
      ? state.phrases[state.currentIndex]
      : state.phrases[index] || state.phrases[state.currentIndex];
    if (!state.lastPhraseProgressRestore && phrase && index !== state.currentIndex) {
      state.currentIndex = index;
      options.phraseProgressStore?.schedule("auto-pause-load-sync");
    }

    video.pause();
    state.guidedHold = {
      index: state.currentIndex,
      holdSeconds: video.currentTime,
      createdAt: options.nowMs?.() ?? Date.now(),
    };
    state.passivePausedKey = `${state.videoId || ""}:${state.selectedSourceId}:load`;
    if (phrase) {
      options.markCurrentTranscriptSegment?.(phrase);
    }
    options.recordNavigationEvent?.("auto-pause-load", {
      currentPhrase: options.describePhraseAtIndex?.(state.currentIndex),
      playback: options.getPlaybackSnapshot?.(),
    });
    return true;
  }

  function errorMessage(error) {
    return error?.message || String(error);
  }

  window.__afShadowingSourceLoadWorkflow = {
    refreshSelectedSourceCache,
    selectPracticeSource,
    loadPracticeSource,
    maybeSwitchToPreferredSource,
    holdInitialAutoPauseAfterSourceLoad,
  };
})();
