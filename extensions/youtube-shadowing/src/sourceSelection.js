(function audioFilmsSourceSelection() {
  function sourceSelectionKind(source) {
    const snapshotKind = source?.loadedTranscriptResult?.practiceSnapshot?.textSource?.kind || "";
    if (source?.track?.afPracticeSnapshotSource && (snapshotKind === "asr" || source?.track?.kind === "asr")) {
      return "asr";
    }
    if (source?.track?.kind === "asr") return "auto";
    return "manual";
  }

  function sourceSelectionRank(source) {
    return {
      manual: 0,
      asr: 1,
      auto: 2,
    }[sourceSelectionKind(source)] ?? 3;
  }

  function choosePreferredPracticeSource(sources, options = {}) {
    const storedMatch = findStoredSourceSelectionMatch(sources, options.storedSelection);
    if (storedMatch) {
      return { source: storedMatch, reason: "stored-selection" };
    }

    const ranked = [...sources].sort((left, right) =>
      sourceSelectionRank(left) - sourceSelectionRank(right) ||
      sourceLanguageRank(left.languageCode, options) - sourceLanguageRank(right.languageCode, options) ||
      left.index - right.index
    )[0] || null;
    return ranked ? { source: ranked, reason: "default-priority" } : null;
  }

  function sourceLanguageRank(languageCode, options = {}) {
    if (typeof options.preferredLanguageRank === "function") {
      return options.preferredLanguageRank(languageCode);
    }
    const normalized = String(languageCode || "").trim().toLowerCase().replace("_", "-");
    const base = normalized.split("-")[0] || normalized;
    const preferred = typeof options.preferredLanguageCodes === "function"
      ? options.preferredLanguageCodes()
      : ["nl", "en"];
    const exactIndex = preferred.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex;
    const baseIndex = preferred.indexOf(base);
    return baseIndex >= 0 ? baseIndex : 100;
  }

  function findStoredSourceSelectionMatch(sources, selection) {
    if (!selection?.sourceKind) return null;
    const exact = selection.sourceId
      ? sources.find((source) => source.id === selection.sourceId)
      : null;
    if (exact) return exact;

    return sources.find((source) => {
      if (sourceSelectionKind(source) !== selection.sourceKind) return false;
      if (selection.languageCode && source.languageCode !== selection.languageCode) return false;
      return true;
    }) || null;
  }

  function practiceSnapshotSource({
    operation,
    alternative,
    snapshot,
    result,
    existingSource = null,
    nextIndex = 0,
    summary = null,
  } = {}) {
    if (!snapshot || !result) return null;
    const sourceId = `practice:${operation?.id || "timing"}:${alternative?.id || snapshot.snapshotRevisionId || nextIndex}`;
    const label = alternative?.label || snapshot.textSource?.label || existingSource?.name || "ASR transcript";
    const languageCode = snapshot.textSource?.languageCode || operation?.input?.language || "";
    const loadedTranscriptResult = summary || result;
    const source = existingSource || {
      id: sourceId,
      index: nextIndex,
      track: {
        kind: snapshot.textSource?.kind === "asr" ? "asr" : "manual",
        languageCode,
        vssId: sourceId,
        name: { simpleText: label },
        afPracticeSnapshotSource: true,
      },
    };

    return {
      ...source,
      id: source.id || sourceId,
      index: Number.isInteger(source.index) ? source.index : nextIndex,
      name: label,
      languageCode,
      track: {
        ...(source.track || {}),
        kind: snapshot.textSource?.kind === "asr" ? "asr" : "manual",
        languageCode,
        vssId: source.track?.vssId || sourceId,
        name: { simpleText: label },
        afPracticeSnapshotSource: true,
      },
      error: "",
      lastError: "",
      lastRetrievalAttempts: result.retrievalAttempts || [],
      loadedCueSource: result.retrievalPath,
      loadedTranscriptResult,
    };
  }

  function loadedPracticeSourcePatch({
    source,
    transcriptResult,
    phrases = [],
    restoredProgress = null,
    playbackIndex = 0,
    autoPause = false,
    transcriptSummary = null,
  } = {}) {
    const nextIndex = restoredProgress?.index ?? playbackIndex;
    return {
      statePatch: {
        selectedSourceId: source?.id || "",
        selectedTrack: source?.track || null,
        cues: transcriptResult?.cues || [],
        transcriptResult,
        phrases,
        currentIndex: nextIndex,
        lastPhraseProgressRestore: restoredProgress
          ? {
              sourceId: source?.id || "",
              reason: restoredProgress.reason,
              currentIndex: nextIndex,
              savedIndex: restoredProgress.progress?.currentIndex,
              phraseCount: phrases.length,
              savedPhraseCount: restoredProgress.progress?.phraseCount,
              updatedAt: restoredProgress.progress?.updatedAt,
            }
          : null,
        selectedWord: null,
        selectedSpan: null,
        phraseTranslations: {},
        timingOperationError: "",
        guidedMode: Boolean(autoPause),
        passivePausedKey: "",
        error: "",
      },
      sourcePatch: {
        loadedCueSource: transcriptResult?.retrievalPath || "",
        loadedTranscriptResult: transcriptSummary || transcriptResult || null,
        lastRetrievalAttempts: transcriptResult?.retrievalAttempts || [],
      },
      nextIndex,
    };
  }

  function failedPracticeSourcePatch({
    source,
    message = "",
    summarizedError = "",
    retrievalAttempts = [],
    keepExistingOnError = false,
    existingPhraseCount = 0,
    practiceSourceCount = 0,
  } = {}) {
    const visibleError = summarizedError || message;
    const statePatch = {
      error: keepExistingOnError && existingPhraseCount ? "" : visibleError,
    };
    if (!keepExistingOnError) {
      Object.assign(statePatch, {
        selectedSourceId: source?.id || "",
        selectedTrack: source?.track || null,
        cues: [],
        transcriptResult: null,
        phrases: [],
        currentIndex: 0,
        sourceMenuOpen: practiceSourceCount > 1,
      });
    }
    return {
      statePatch,
      sourcePatch: {
        lastError: message,
        error: visibleError,
        lastRetrievalAttempts: retrievalAttempts,
      },
    };
  }

  window.__afShadowingSourceSelection = {
    sourceSelectionKind,
    sourceSelectionRank,
    choosePreferredPracticeSource,
    sourceLanguageRank,
    findStoredSourceSelectionMatch,
    practiceSnapshotSource,
    loadedPracticeSourcePatch,
    failedPracticeSourcePatch,
  };
})();
