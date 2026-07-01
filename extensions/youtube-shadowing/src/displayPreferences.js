(function audioFilmsDisplayPreferences() {
  function normalizeDisplayPreferences(value) {
    const preferences = value && typeof value === "object" ? value : {};
    const appearance = preferences.appearance && typeof preferences.appearance === "object"
      ? preferences.appearance
      : {};
    const playback = preferences.playback && typeof preferences.playback === "object"
      ? preferences.playback
      : {};
    const layout = preferences.layout && typeof preferences.layout === "object" ? preferences.layout : {};

    return {
      version: 1,
      enabled: preferences.enabled !== false,
      autoPause: preferences.autoPause !== false,
      examplesExpanded: preferences.examplesExpanded === true,
      theme: normalizeTheme(preferences.theme),
      appearance: {
        learnerTextScale: clampNumber(appearance.learnerTextScale, 0.85, 1.35, 1),
        panelBackgroundAlpha: clampNumber(appearance.panelBackgroundAlpha, 0.65, 1, 0.92),
      },
      playback: {
        slowReplaySpeed: clampNumber(playback.slowReplaySpeed, 0.25, 2, 0.75),
      },
      layout: {
        ...defaultPanelLayout(),
        locked: layout.locked !== false,
        phraseRibbon: normalizePanelGeometry(layout.phraseRibbon),
        dictionaryPanel: normalizePanelGeometry(layout.dictionaryPanel),
        debugPanel: normalizePanelGeometry(layout.debugPanel),
        zOrder: layout.zOrder === "dictionaryPanel" ? "dictionaryPanel" : "phraseRibbon",
      },
    };
  }

  function displayPreferenceControlState(input = {}) {
    const preferences = normalizeDisplayPreferences(input.preferences);
    const learnerTextScale = preferences.appearance.learnerTextScale;
    const panelBackgroundAlpha = preferences.appearance.panelBackgroundAlpha;
    const slowReplaySpeed = preferences.playback.slowReplaySpeed;
    const learnerPercent = Math.round(learnerTextScale * 100);
    const alphaPercent = Math.round(panelBackgroundAlpha * 100);

    return {
      learnerText: {
        percent: learnerPercent,
        smallerDisabled: learnerTextScale <= 0.85,
        largerDisabled: learnerTextScale >= 1.35,
        resetDisabled: learnerTextScale === 1,
        smallerTitle: `Subtitle text size: ${learnerPercent}%`,
        largerTitle: `Subtitle text size: ${learnerPercent}%`,
        resetTitle: `Reset subtitle text size (${learnerPercent}%)`,
      },
      panelBackground: {
        percent: alphaPercent,
        lowerDisabled: panelBackgroundAlpha <= 0.65,
        higherDisabled: panelBackgroundAlpha >= 1,
        resetDisabled: panelBackgroundAlpha === 0.92,
        lowerTitle: `Panel background opacity: ${alphaPercent}%`,
        higherTitle: `Panel background opacity: ${alphaPercent}%`,
        resetTitle: `Reset panel background opacity (${alphaPercent}%)`,
      },
      autoPause: {
        text: input.autoPause ? "Auto-pause On" : "Auto-pause Off",
        active: Boolean(input.autoPause),
        title: input.autoPause
          ? "Pause automatically at phrase boundaries"
          : "Let YouTube continue playing after captions load",
      },
      slowReplay: {
        speed: slowReplaySpeed,
        slowerDisabled: slowReplaySpeed <= 0.25,
        fasterDisabled: slowReplaySpeed >= 2,
        speedTitle: "Slow replay speed for Shift+ArrowDown",
        slowerTitle: "Decrease slow replay speed",
        fasterTitle: "Increase slow replay speed",
      },
      layout: {
        lockText: preferences.layout.locked ? "Unlock" : "Lock",
        lockTitle: preferences.layout.locked
          ? "Unlock panel layout editing"
          : "Lock panel layout editing",
        resetDisabled: !input.hasCustomPanelLayout,
        resetTitle: "Reset panel positions and sizes",
      },
    };
  }

  function learningToggleState(input = {}) {
    const enabled = input.enabled !== false;
    return {
      text: enabled ? "AudioFilms On" : "AudioFilms Off",
      enabled,
      ariaLabel: enabled
        ? "Disable AudioFilms shadowing workspace"
        : "Enable AudioFilms shadowing workspace",
    };
  }

  function nextThemePreference(value) {
    return {
      system: "light",
      light: "dark",
      dark: "system",
    }[value] || "system";
  }

  function withThemePreference(preferences, theme) {
    return {
      ...normalizeDisplayPreferences(preferences),
      theme: normalizeTheme(theme),
    };
  }

  function withLearnerTextScaleDelta(preferences, delta) {
    const normalized = normalizeDisplayPreferences(preferences);
    return {
      ...normalized,
      appearance: {
        ...normalized.appearance,
        learnerTextScale: clampNumber(normalized.appearance.learnerTextScale + delta, 0.85, 1.35, 1),
      },
    };
  }

  function withLearnerTextScaleReset(preferences) {
    const normalized = normalizeDisplayPreferences(preferences);
    return {
      ...normalized,
      appearance: {
        ...normalized.appearance,
        learnerTextScale: 1,
      },
    };
  }

  function withPanelBackgroundAlphaDelta(preferences, delta) {
    const normalized = normalizeDisplayPreferences(preferences);
    return {
      ...normalized,
      appearance: {
        ...normalized.appearance,
        panelBackgroundAlpha: clampNumber(normalized.appearance.panelBackgroundAlpha + delta, 0.65, 1, 0.92),
      },
    };
  }

  function withPanelBackgroundAlphaReset(preferences) {
    const normalized = normalizeDisplayPreferences(preferences);
    return {
      ...normalized,
      appearance: {
        ...normalized.appearance,
        panelBackgroundAlpha: 0.92,
      },
    };
  }

  function withSlowReplaySpeedDelta(preferences, delta) {
    const normalized = normalizeDisplayPreferences(preferences);
    return {
      ...normalized,
      playback: {
        ...normalized.playback,
        slowReplaySpeed: clampNumber(normalized.playback.slowReplaySpeed + delta, 0.25, 2, 0.75),
      },
    };
  }

  function withExamplesExpanded(preferences, expanded) {
    return {
      ...normalizeDisplayPreferences(preferences),
      examplesExpanded: Boolean(expanded),
    };
  }

  function defaultPanelLayout() {
    return {
      locked: true,
      phraseRibbon: emptyPanelGeometry(),
      dictionaryPanel: emptyPanelGeometry(),
      debugPanel: emptyPanelGeometry(),
      zOrder: "phraseRibbon",
    };
  }

  function normalizePanelGeometry(value) {
    const geometry = value && typeof value === "object" ? value : {};
    return {
      x: nullableFiniteNumber(geometry.x),
      y: nullableFiniteNumber(geometry.y),
      width: nullableFiniteNumber(geometry.width),
      height: nullableFiniteNumber(geometry.height),
    };
  }

  function emptyPanelGeometry() {
    return { x: null, y: null, width: null, height: null };
  }

  function nullableFiniteNumber(value) {
    return Number.isFinite(value) ? value : null;
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : "system";
  }

  window.__afShadowingDisplayPreferences = {
    normalizeDisplayPreferences,
    defaultPanelLayout,
    displayPreferenceControlState,
    learningToggleState,
    nextThemePreference,
    withThemePreference,
    withLearnerTextScaleDelta,
    withLearnerTextScaleReset,
    withPanelBackgroundAlphaDelta,
    withPanelBackgroundAlphaReset,
    withSlowReplaySpeedDelta,
    withExamplesExpanded,
  };
})();
