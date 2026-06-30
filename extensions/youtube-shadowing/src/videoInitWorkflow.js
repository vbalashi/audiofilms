(function audioFilmsVideoInitWorkflow() {
  async function initializeForCurrentVideo(deps = {}) {
    const state = deps.getState();
    const videoId = deps.getVideoIdFromUrl();
    deps.updateBootDiagnostics?.({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });
    if (!videoId || videoId === state.videoId || state.loading) return false;

    const previousVideoId = state.videoId;
    const loadToken = state.loadToken + 1;
    deps.phraseProgressStore.cancel();
    deps.applyStatePatch(deps.videoLoadState.currentVideoResetPatch({
      videoId,
      loadToken,
    }));
    deps.clearTimingOperationPoll?.();
    deps.stopPlaybackTimer?.();
    deps.detachPassivePlaybackWatcher?.();
    deps.resetTranscriptPanelState?.(previousVideoId);
    deps.render?.();

    try {
      const playerResponse = await deps.waitForPlayerResponse();
      const tracks = deps.captionTracks.getCaptionTracks(playerResponse);
      deps.applyStatePatch({ tracks });
      deps.updateBootDiagnostics?.({ captionTracksCount: tracks.length });
      const practiceSources = deps.captionTracks.buildPracticeSources(tracks);
      deps.applyStatePatch({ practiceSources });
      const preferredSource = deps.sourceSelectionStore.choosePreferred(practiceSources, videoId);
      const defaultSource = preferredSource?.source || deps.captionTracks.chooseDefaultPracticeSource(practiceSources);
      if (!defaultSource) {
        throw new Error("No caption tracks found for this video.");
      }
      await deps.loadPracticeSource(defaultSource, {
        keepExistingOnError: false,
        preserveVideoTime: false,
        loadToken,
        persistSelection: preferredSource?.reason === "stored-selection",
        sourceSelectionReason: preferredSource?.reason || "initial-default",
      });
      return true;
    } catch (error) {
      if (loadToken !== deps.getState().loadToken) return false;
      const message = errorMessage(error);
      deps.applyStatePatch({ error: message });
      deps.updateBootDiagnostics?.({ lastError: message });
      return false;
    } finally {
      if (loadToken === deps.getState().loadToken) {
        deps.applyStatePatch({ loading: false });
        deps.render?.();
      }
    }
  }

  function handleCurrentLocation(deps = {}) {
    const state = deps.getState();
    const videoId = deps.getVideoIdFromUrl();
    deps.updateBootDiagnostics?.({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });

    if (!videoId) {
      deps.stopPlaybackTimer?.();
      deps.detachPassivePlaybackWatcher?.();
      deps.removeWorkspace?.();
      deps.removeToggle?.();
      return "no-video";
    }
    deps.renderToggle?.();
    if (!state.learningEnabled) {
      deps.stopPlaybackTimer?.();
      deps.detachPassivePlaybackWatcher?.();
      deps.applyStatePatch({ guidedMode: false });
      deps.removeWorkspace?.();
      return "disabled";
    }
    deps.ensureWorkspace?.();
    deps.render?.();
    deps.initializeForCurrentVideo?.();
    return "watch";
  }

  function errorMessage(error) {
    return error?.message || String(error);
  }

  window.__afShadowingVideoInitWorkflow = {
    initializeForCurrentVideo,
    handleCurrentLocation,
  };
})();
