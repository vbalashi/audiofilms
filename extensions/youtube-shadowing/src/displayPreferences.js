(function audioFilmsDisplayPreferences() {
  function normalizeDisplayPreferences(value) {
    const preferences = value && typeof value === "object" ? value : {};
    const appearance = preferences.appearance && typeof preferences.appearance === "object"
      ? preferences.appearance
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
  };
})();
