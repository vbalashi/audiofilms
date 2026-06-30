(function audioFilmsDisplayPreferenceStorage() {
  function readInitialDisplayPreferences({
    storageState,
    storage,
    keys = {},
    normalizeDisplayPreferences,
  } = {}) {
    return storageState.readInitialDisplayPreferences({
      storage,
      keys,
      normalizeDisplayPreferences,
    });
  }

  function createDisplayPreferenceController({
    chrome,
    storage,
    keys = {},
    state,
    normalizeDisplayPreferences,
    sendMessage,
    recordDebugEvent,
    render,
    onDisabled,
    onEnabled,
  } = {}) {
    let dirty = false;
    let mutationSeq = 0;

    function apply(preferences) {
      state.displayPreferences = normalizeDisplayPreferences(preferences);
      state.learningEnabled = state.displayPreferences.enabled;
      state.autoPause = state.displayPreferences.autoPause;
      state.examplesExpanded = state.displayPreferences.examplesExpanded;
      state.themePreference = state.displayPreferences.theme;
    }

    async function initialize() {
      const initMutationSeq = mutationSeq;
      const stored = await readStored();
      if (dirty || initMutationSeq !== mutationSeq) {
        try {
          await write(state.displayPreferences);
        } catch (error) {
          recordError("display-preferences-write-failed", error);
        }
        render();
        return;
      }
      const preferences = stored || state.displayPreferences;
      apply(preferences);
      if (!stored) {
        try {
          await write(preferences);
          clearMigratedLocalStorage();
        } catch (error) {
          recordError("display-preferences-migration-failed", error);
        }
      } else {
        clearMigratedLocalStorage();
      }
      render();
    }

    function subscribe() {
      if (!chrome?.storage?.onChanged) return;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes[keys.displayPreferences]) return;

        const wasEnabled = state.learningEnabled;
        const next = normalizeDisplayPreferences(changes[keys.displayPreferences].newValue);
        apply(next);

        if (wasEnabled && !state.learningEnabled) {
          onDisabled();
          return;
        }

        if (!wasEnabled && state.learningEnabled) {
          onEnabled();
          return;
        }

        render();
      });
    }

    function update(updater) {
      const next = normalizeDisplayPreferences(updater({ ...state.displayPreferences }));
      dirty = true;
      mutationSeq += 1;
      apply(next);
      return write(next).catch((error) => {
        recordError("display-preferences-write-failed", error);
      }).finally(() => {
        dirty = false;
      });
    }

    async function readStored() {
      try {
        const response = await sendMessage({ type: "af-get-display-preferences" });
        if (!response?.ok) {
          throw new Error(response?.error || "Display preferences read failed.");
        }
        return response.preferences ? normalizeDisplayPreferences(response.preferences) : null;
      } catch (error) {
        recordError("display-preferences-read-failed", error);
        return null;
      }
    }

    function write(preferences) {
      return sendMessage({
        type: "af-set-display-preferences",
        preferences: normalizeDisplayPreferences(preferences),
      }).then((response) => {
        if (!response?.ok) {
          throw new Error(response?.error || "Display preferences write failed.");
        }
        return normalizeDisplayPreferences(response.preferences);
      });
    }

    function clearMigratedLocalStorage() {
      [keys.learningEnabled, keys.examplesExpanded, keys.theme].forEach((key) => {
        try {
          storage?.removeItem(key);
        } catch (_error) {}
      });
    }

    function recordError(event, error) {
      recordDebugEvent(event, {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      initialize,
      subscribe,
      update,
      readStored,
      write,
      apply,
      clearMigratedLocalStorage,
    };
  }

  window.__afShadowingDisplayPreferenceStorage = {
    readInitialDisplayPreferences,
    createDisplayPreferenceController,
  };
})();
