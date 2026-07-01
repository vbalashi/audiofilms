(function audioFilmsSourceSelectionStorage() {
  function createSourceSelectionStore({
    storage,
    storageState,
    sourceSelection,
    captionTracks,
    storageKey = "",
    state,
    recordDebugEvent,
  } = {}) {
    function key(videoId = state.videoId) {
      return storageState.sourceSelectionKey({ storageKey, videoId });
    }

    function read(videoId = state.videoId) {
      return storageState.readStoredSourceSelection({
        storage,
        storageKey,
        videoId,
      });
    }

    function write(source, reason = "source-selected") {
      const selectionKey = key();
      if (!selectionKey || !source) return;
      const selection = storageState.sourceSelectionSnapshot({
        videoId: state.videoId,
        source,
        sourceKind: sourceSelection.sourceSelectionKind(source),
      });
      if (!selection) return;
      try {
        storage.setItem(selectionKey, JSON.stringify(selection));
        recordDebugEvent("source-selection-saved", {
          reason,
          source: captionTracks.sourceDisplayName(source),
          sourceKind: selection.sourceKind,
        });
      } catch (error) {
        recordDebugEvent("source-selection-save-failed", {
          reason,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    function choosePreferred(sources, videoId = state.videoId) {
      return sourceSelection.choosePreferredPracticeSource(sources, {
        storedSelection: read(videoId),
        preferredLanguageRank: captionTracks.preferredLanguageRank,
        preferredLanguageCodes: captionTracks.preferredLanguageCodes,
      });
    }

    return {
      key,
      read,
      write,
      choosePreferred,
    };
  }

  window.__afShadowingSourceSelectionStorage = {
    createSourceSelectionStore,
  };
})();
