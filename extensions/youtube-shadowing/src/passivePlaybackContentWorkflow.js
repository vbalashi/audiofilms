(function audioFilmsPassivePlaybackContentWorkflow() {
  function createPassivePlaybackController(deps = {}) {
    function passivePlaybackWatcherOptions() {
      return {
        playbackSession: deps.playbackSession,
        playbackRateOptions: deps.playbackRateOptions,
        getVideoElement: deps.getVideoElement,
        syncPlaybackRateFromVideo: deps.syncPlaybackRateFromVideo,
        syncPassivePlayback: deps.syncPassivePlayback,
        startPassivePlaybackFrame: deps.startPassivePlaybackFrame,
        restorePlaybackRateAfterOverride: deps.restorePlaybackRateAfterOverride,
        onPassiveVideoTimeUpdate,
        onPassiveVideoPlay,
        onPassiveVideoPause,
        onPassiveVideoRateChange,
        cancelAnimationFrame: deps.cancelAnimationFrame,
        render: deps.render,
      };
    }

    function ensurePassivePlaybackWatcher() {
      return deps.passivePlaybackWatcher.ensurePassivePlaybackWatcher(deps.getState(), passivePlaybackWatcherOptions());
    }

    function detachPassivePlaybackWatcher() {
      return deps.passivePlaybackWatcher.detachPassivePlaybackWatcher(deps.getState(), passivePlaybackWatcherOptions());
    }

    function onPassiveVideoTimeUpdate(event) {
      return deps.passivePlaybackWatcher.onPassiveVideoTimeUpdate(event, passivePlaybackWatcherOptions());
    }

    function onPassiveVideoPlay(event) {
      return deps.passivePlaybackWatcher.onPassiveVideoPlay(deps.getState(), event, passivePlaybackWatcherOptions());
    }

    function onPassiveVideoPause() {
      return deps.passivePlaybackWatcher.onPassiveVideoPause(deps.getState(), passivePlaybackWatcherOptions());
    }

    function onPassiveVideoRateChange(event) {
      return deps.passivePlaybackWatcher.onPassiveVideoRateChange(deps.getState(), event, passivePlaybackWatcherOptions());
    }

    return {
      ensurePassivePlaybackWatcher,
      detachPassivePlaybackWatcher,
      onPassiveVideoTimeUpdate,
      onPassiveVideoPlay,
      onPassiveVideoPause,
      onPassiveVideoRateChange,
    };
  }

  window.__afShadowingPassivePlaybackContentWorkflow = {
    createPassivePlaybackController,
  };
})();
