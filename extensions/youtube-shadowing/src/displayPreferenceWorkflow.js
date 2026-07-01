(function audioFilmsDisplayPreferenceWorkflow() {
  function toggleExclusiveMenu(state, menuKey, event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    options.menuState.toggleExclusiveMenu(state, menuKey);
    options.render?.();
    return true;
  }

  function cycleThemePreference(state, event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const nextTheme = options.displayPreferences.nextThemePreference(state.themePreference);
    state.themePreference = nextTheme;
    options.updateDisplayPreferences((preferences) =>
      options.displayPreferences.withThemePreference(preferences, nextTheme));
    options.render?.();
    return nextTheme;
  }

  function adjustLearnerTextScale(delta, options = {}) {
    options.updateDisplayPreferences((preferences) =>
      options.displayPreferences.withLearnerTextScaleDelta(preferences, delta));
    options.render?.();
  }

  function resetLearnerTextScale(options = {}) {
    options.updateDisplayPreferences(options.displayPreferences.withLearnerTextScaleReset);
    options.render?.();
  }

  function adjustPanelBackgroundAlpha(delta, options = {}) {
    options.updateDisplayPreferences((preferences) =>
      options.displayPreferences.withPanelBackgroundAlphaDelta(preferences, delta));
    options.render?.();
  }

  function resetPanelBackgroundAlpha(options = {}) {
    options.updateDisplayPreferences(options.displayPreferences.withPanelBackgroundAlphaReset);
    options.render?.();
  }

  function adjustSlowReplaySpeed(delta, options = {}) {
    options.updateDisplayPreferences((preferences) =>
      options.displayPreferences.withSlowReplaySpeedDelta(preferences, delta));
    options.render?.();
  }

  function adjustVideoPlaybackRate(state, delta, options = {}) {
    const video = options.getVideoElement?.();
    const rateOptions = options.playbackRateOptions();
    const currentRate = options.playbackSession.clampPlaybackRate(
      video?.playbackRate || state.playbackRate || 1,
      rateOptions,
    );
    return setVideoPlaybackRate(state, options.playbackSession.nextPlaybackRate(currentRate, delta, rateOptions), {
      ...options,
      reason: "speed-control",
    });
  }

  function setVideoPlaybackRate(state, rate, options = {}) {
    const video = options.getVideoElement?.();
    const nextRate = options.playbackSession.setVideoPlaybackRate(
      state,
      video,
      rate,
      options.playbackRateOptions(),
    );
    options.recordDebugEvent?.("playback-rate-set", {
      reason: options.reason || "playback-rate",
      playbackRate: nextRate,
    });
    options.render?.();
    return nextRate;
  }

  window.__afShadowingDisplayPreferenceWorkflow = {
    toggleExclusiveMenu,
    cycleThemePreference,
    adjustLearnerTextScale,
    resetLearnerTextScale,
    adjustPanelBackgroundAlpha,
    resetPanelBackgroundAlpha,
    adjustSlowReplaySpeed,
    adjustVideoPlaybackRate,
    setVideoPlaybackRate,
  };
})();
