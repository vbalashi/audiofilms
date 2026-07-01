(function audioFilmsPassivePlaybackWatcher() {
  function ensurePassivePlaybackWatcher(state, options = {}) {
    const video = options.getVideoElement();
    if (!video || state.passiveVideo === video) return false;

    detachPassivePlaybackWatcher(state, options);
    state.passiveVideo = video;
    state.passivePausedKey = "";
    video.addEventListener("timeupdate", options.onPassiveVideoTimeUpdate, true);
    video.addEventListener("play", options.onPassiveVideoPlay, true);
    video.addEventListener("pause", options.onPassiveVideoPause, true);
    video.addEventListener("ratechange", options.onPassiveVideoRateChange, true);
    options.syncPlaybackRateFromVideo(video);
    options.syncPassivePlayback(video);
    if (!video.paused) {
      options.startPassivePlaybackFrame(video);
    }
    return true;
  }

  function detachPassivePlaybackWatcher(state, options = {}) {
    if (state.passiveFrame) {
      options.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }

    if (state.passiveVideo) {
      state.passiveVideo.removeEventListener("timeupdate", options.onPassiveVideoTimeUpdate, true);
      state.passiveVideo.removeEventListener("play", options.onPassiveVideoPlay, true);
      state.passiveVideo.removeEventListener("pause", options.onPassiveVideoPause, true);
      state.passiveVideo.removeEventListener("ratechange", options.onPassiveVideoRateChange, true);
      state.passiveVideo = null;
    }

    state.passivePausedKey = "";
  }

  function onPassiveVideoTimeUpdate(event, options = {}) {
    options.syncPassivePlayback(event.currentTarget);
  }

  function onPassiveVideoPlay(state, event, options = {}) {
    state.passivePausedKey = "";
    const video = event.currentTarget;
    options.syncPassivePlayback(video);
    options.startPassivePlaybackFrame(video);
  }

  function onPassiveVideoPause(state, options = {}) {
    if (state.passiveFrame) {
      options.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }
    options.restorePlaybackRateAfterOverride();
  }

  function onPassiveVideoRateChange(state, event, options = {}) {
    const video = event.currentTarget;
    const activeRestore = state.activePlayback?.restorePlaybackRate;
    if (!activeRestore || Math.abs(video.playbackRate - activeRestore) < 0.001) {
      options.playbackSession.syncPlaybackRateFromVideo(state, video, options.playbackRateOptions());
      options.render();
    }
  }

  window.__afShadowingPassivePlaybackWatcher = {
    ensurePassivePlaybackWatcher,
    detachPassivePlaybackWatcher,
    onPassiveVideoTimeUpdate,
    onPassiveVideoPlay,
    onPassiveVideoPause,
    onPassiveVideoRateChange,
  };
})();
