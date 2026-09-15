(function audioFilmsStorageState() {
  function readLocalStorageValue(storage, key) {
    try {
      return storage?.getItem(key) ?? null;
    } catch (_error) {
      return null;
    }
  }

  function readInitialDisplayPreferences({
    storage,
    keys = {},
    normalizeDisplayPreferences,
  } = {}) {
    const normalize = typeof normalizeDisplayPreferences === "function"
      ? normalizeDisplayPreferences
      : (value) => value;
    return normalize({
      enabled: readLocalStorageValue(storage, keys.learningEnabled) !== "false",
      examplesExpanded: readLocalStorageValue(storage, keys.examplesExpanded) === "true",
      theme: readLocalStorageValue(storage, keys.theme),
    });
  }

  function sourceSelectionKey({ storageKey = "", videoId = "" } = {}) {
    return storageKey && videoId ? `${storageKey}:${videoId}` : "";
  }

  function parseStoredSourceSelection(value, videoId = "") {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value || "null") : value;
      if (!parsed || parsed.videoId !== videoId) return null;
      return {
        version: Number(parsed.version || 1),
        sourceId: String(parsed.sourceId || ""),
        trackId: String(parsed.trackId || ""),
        sourceKind: String(parsed.sourceKind || ""),
        languageCode: String(parsed.languageCode || ""),
        canonicalTag: String(parsed.canonicalTag || ""),
        textSourceKind: String(parsed.textSourceKind || ""),
        updatedAt: String(parsed.updatedAt || ""),
      };
    } catch (_error) {
      return null;
    }
  }

  function readStoredSourceSelection({
    storage,
    storageKey = "",
    videoId = "",
  } = {}) {
    const key = sourceSelectionKey({ storageKey, videoId });
    if (!key) return null;
    return parseStoredSourceSelection(readLocalStorageValue(storage, key), videoId);
  }

  function sourceSelectionSnapshot({
    videoId = "",
    source = null,
    sourceKind = "",
    now = new Date(),
  } = {}) {
    if (!videoId || !source) return null;
    return {
      version: 2,
      videoId,
      sourceId: source.id,
      trackId: source.track?.vssId || source.track?.baseUrl || source.id,
      sourceKind,
      languageCode: source.languageCode || "",
      canonicalTag: window.__afShadowingLanguageIdentity?.normalizeLanguageCode(source.languageCode) || source.languageCode || "",
      textSourceKind: source.loadedTranscriptResult?.practiceSnapshot?.textSource?.kind || "",
      updatedAt: now.toISOString(),
    };
  }

  window.__afShadowingStorageState = {
    readLocalStorageValue,
    readInitialDisplayPreferences,
    sourceSelectionKey,
    parseStoredSourceSelection,
    readStoredSourceSelection,
    sourceSelectionSnapshot,
  };
})();
