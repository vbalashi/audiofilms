(function audioFilmsPhraseProgressStorage() {
  function createPhraseProgressStore({
    window,
    phraseProgress,
    state,
    sendMessage,
    recordDebugEvent,
    saveDelayMs = 250,
  } = {}) {
    let saveTimer = null;

    function key(sourceId = state.selectedSourceId) {
      return phraseProgress.progressKey({ videoId: state.videoId, sourceId });
    }

    async function read(sourceId, phrases) {
      const storageKey = key(sourceId);
      if (!storageKey) return null;
      try {
        const response = await sendMessage({ type: "af-get-phrase-progress", key: storageKey });
        if (!response?.ok || !response.progress) return null;
        return phraseProgress.restoreIndexFromProgress(response.progress, phrases);
      } catch (error) {
        recordDebugEvent("phrase-progress-read-failed", {
          key: storageKey,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    function schedule(reason) {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        save(reason);
      }, saveDelayMs);
    }

    function save(reason) {
      const storageKey = key();
      const progress = phraseProgress.buildProgress({
        phrases: state.phrases,
        currentIndex: state.currentIndex,
      });
      if (!storageKey || !progress) return;
      sendMessage({
        type: "af-set-phrase-progress",
        key: storageKey,
        progress,
      }).then((response) => {
        if (!response?.ok) {
          throw new Error(response?.error || "Phrase progress write failed.");
        }
        recordDebugEvent("phrase-progress-saved", {
          reason,
          key: storageKey,
          currentIndex: progress.currentIndex,
          phraseCount: progress.phraseCount,
        });
      }).catch((error) => {
        recordDebugEvent("phrase-progress-save-failed", {
          reason,
          key: storageKey,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    function cancel() {
      if (!saveTimer) return;
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }

    return {
      key,
      read,
      schedule,
      save,
      cancel,
    };
  }

  window.__afShadowingPhraseProgressStorage = {
    createPhraseProgressStore,
  };
})();
