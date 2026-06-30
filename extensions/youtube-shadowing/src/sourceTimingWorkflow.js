(function audioFilmsSourceTimingWorkflow() {
  function transcriptResultFromLoadedSource({ source, transcriptMetadata }) {
    const result = source?.loadedTranscriptResult;
    const snapshot = result?.practiceSnapshot;
    if (!snapshot) return null;
    const operation = {
      id: source.id,
      kind: "improve-timing",
      state: "succeeded",
      input: {
        language: result.languageCode || source.languageCode || "",
        textSource: snapshot.textSource?.kind === "asr" ? "asr" : snapshot.textSource?.kind === "provided-captions" ? "manual" : "auto",
      },
      result: {
        snapshot,
        diagnostics: {
          asrJobId: result.actualTrackId || "",
        },
      },
    };
    return transcriptMetadata.transcriptResultFromPracticeSnapshot(snapshot, operation, {
      alternativeId: result.actualTrackId || "",
    });
  }

  async function fetchReusableTimingTranscriptResult({
    source,
    currentVideoId = "",
    resultOverride = null,
    apiBase = "",
    postBackendJson,
    buildPracticeTimingPayload,
    transcriptMetadata,
    captionTracks,
    recordDebugEvent = () => {},
    getCurrentTranscriptResult = () => null,
    registerTimingOperationResultSources,
  } = {}) {
    if (!currentVideoId) return null;

    try {
      const operation = await postBackendJson("practice-timing-create", {
        apiBase,
        payload: {
          ...buildPracticeTimingPayload(source, "", resultOverride),
          reuseOnly: true,
        },
      });
      const transcriptResult = transcriptMetadata.transcriptResultFromPracticeTimingOperation(operation, {
        currentResult: resultOverride || source?.loadedTranscriptResult || getCurrentTranscriptResult(),
        recordDebugEvent,
      });
      const registeredSources = registerTimingOperationResultSources(operation, {
        mainResult: transcriptResult,
      });
      if (registeredSources > 0) {
        recordDebugEvent("timing-cache-sources-registered", {
          operationId: operation.id || "",
          source: captionTracks.sourceDisplayName(source),
          registeredSources,
        });
      }
      return transcriptResult;
    } catch (error) {
      recordDebugEvent("timing-cache-miss", {
        source: captionTracks.sourceDisplayName(source),
        error: errorMessage(error),
      });
      return null;
    }
  }

  function registerTimingOperationResultSources({
    operation,
    mainResult,
    selectedSource = null,
    practiceSources = [],
    transcriptResult = null,
    transcriptMetadata,
    sourceSelection,
    recordDebugEvent = () => {},
  } = {}) {
    if (operation?.kind !== "improve-timing" || operation.state !== "succeeded") return 0;

    const resolvedMainResult = Object.prototype.hasOwnProperty.call(arguments[0] || {}, "mainResult")
      ? mainResult
      : transcriptMetadata.transcriptResultFromPracticeTimingOperation(operation, {
        currentResult: selectedSource?.loadedTranscriptResult || transcriptResult,
        recordDebugEvent,
      });
    if (selectedSource && resolvedMainResult) {
      selectedSource.loadedTranscriptResult = transcriptMetadata.summarizeTranscriptResult(resolvedMainResult);
      selectedSource.loadedCueSource = resolvedMainResult.retrievalPath;
      selectedSource.lastRetrievalAttempts = resolvedMainResult.retrievalAttempts || [];
      selectedSource.error = "";
      selectedSource.lastError = "";
    }

    let registeredSources = 0;
    for (const alternative of operation.result?.alternatives || []) {
      if (registerPracticeSnapshotSource({
        operation,
        alternative,
        practiceSources,
        transcriptMetadata,
        sourceSelection,
      })) {
        registeredSources += 1;
      }
    }
    return registeredSources;
  }

  function registerPracticeSnapshotSource({
    operation,
    alternative,
    practiceSources = [],
    transcriptMetadata,
    sourceSelection,
  } = {}) {
    const snapshot = alternative?.snapshot;
    const result = transcriptMetadata.transcriptResultFromPracticeSnapshot(snapshot, operation, {
      alternativeId: alternative?.id || "",
      label: alternative?.label || "",
    });
    if (!result) return false;

    const sourceId = `practice:${operation.id || "timing"}:${alternative?.id || snapshot.snapshotRevisionId || practiceSources.length}`;
    const existing = practiceSources.find((source) => source.id === sourceId);
    const source = sourceSelection.practiceSnapshotSource({
      operation,
      alternative,
      snapshot,
      result,
      existingSource: existing,
      nextIndex: practiceSources.length,
      summary: transcriptMetadata.summarizeTranscriptResult(result),
    });
    if (!source) return false;
    if (!existing) practiceSources.push(source);
    if (existing) Object.assign(existing, source);
    return true;
  }

  function activeSourceTimingApplyPatch({
    operation,
    source = null,
    currentTranscriptResult = null,
    currentPhrases = [],
    currentIndex = 0,
    autoPause = false,
    currentMs = 0,
    transcriptMetadata,
    phrasesFromTranscriptResult,
    findPhraseIndexForTime,
    now = () => new Date().toISOString(),
    recordDebugEvent = () => {},
  } = {}) {
    const transcriptResult = transcriptMetadata.transcriptResultFromPracticeTimingOperation(operation, {
      currentResult: source?.loadedTranscriptResult || currentTranscriptResult,
      recordDebugEvent,
    });
    if (!source || !transcriptResult) return { applied: false };

    const phrases = phrasesFromTranscriptResult(transcriptResult);
    if (!phrases.length) return { applied: false };

    const currentPhrase = currentPhrases[currentIndex] || null;
    const effectiveCurrentMs = Number.isFinite(currentMs)
      ? currentMs
      : Number.isFinite(currentPhrase?.startMs) ? currentPhrase.startMs : 0;
    const nextIndex = findPhraseIndexForTime(phrases, effectiveCurrentMs);
    const appliedAt = now();
    const resolvedIndex = Math.max(0, Math.min(nextIndex, phrases.length - 1));

    return {
      applied: true,
      transcriptResult,
      phrases,
      currentIndex: resolvedIndex,
      appliedAt,
      statePatch: {
        selectedSourceId: source.id,
        selectedTrack: source.track,
        cues: transcriptResult.cues,
        transcriptResult,
        phrases,
        currentIndex: resolvedIndex,
        selectedWord: null,
        selectedSpan: null,
        phraseTranslations: {},
        timingOperationError: "",
        timingOperationAppliedAt: appliedAt,
        guidedMode: Boolean(autoPause),
        passivePausedKey: "",
        error: "",
      },
      sourcePatch: {
        loadedCueSource: transcriptResult.retrievalPath,
        loadedTranscriptResult: transcriptMetadata.summarizeTranscriptResult(transcriptResult),
        lastRetrievalAttempts: transcriptResult.retrievalAttempts || [],
        error: "",
        lastError: "",
      },
    };
  }

  function applyTimingOperationResultToActiveSource(operation, deps = {}) {
    const state = deps.getState();
    const source = deps.getSelectedPracticeSource();
    const video = deps.getVideoElement?.() || null;
    const applyResult = activeSourceTimingApplyPatch({
      operation,
      source,
      currentTranscriptResult: state.transcriptResult,
      currentPhrases: state.phrases,
      currentIndex: state.currentIndex,
      autoPause: state.autoPause,
      currentMs: video ? video.currentTime * 1000 : Number.NaN,
      transcriptMetadata: deps.transcriptMetadata,
      phrasesFromTranscriptResult: deps.phrasesFromTranscriptResult,
      findPhraseIndexForTime: deps.findPhraseIndexForTime,
      recordDebugEvent: deps.recordDebugEvent,
    });
    if (!applyResult.applied) return false;

    Object.assign(state, applyResult.statePatch);
    Object.assign(source, applyResult.sourcePatch);

    deps.updateBootDiagnostics?.({
      selectedRetrievalPath: applyResult.transcriptResult.retrievalPath,
      lastError: "",
    });
    deps.ensurePassivePlaybackWatcher?.();
    if (video && state.autoPause) {
      deps.syncPassivePlayback?.(video);
    }
    deps.phraseProgressStore?.schedule("timing-improve-applied");
    deps.recordDebugEvent?.("timing-improve-applied", {
      operationId: operation.id || "",
      source: deps.captionTracks?.sourceDisplayName(source) || "",
      timingExactness: applyResult.transcriptResult.timingExactness,
      phrases: applyResult.phrases.length,
      currentIndex: state.currentIndex,
      appliedAt: state.timingOperationAppliedAt,
    });
    return true;
  }

  async function startImproveTiming(textSourceOverride = "", deps = {}) {
    const state = deps.getState();
    const source = deps.getSelectedPracticeSource();
    const readiness = deps.practiceReadiness();
    if (
      !source ||
      !state.videoId ||
      deps.timingOperationState(readiness).active ||
      readiness.state === "precise"
    ) {
      return false;
    }

    state.timingOperationError = "";
    state.timingOperationApiBase = deps.apiBaseForBackendCommands();
    state.timingOperation = {
      id: "",
      kind: "improve-timing",
      state: "queued",
    };
    deps.render?.();

    try {
      const operation = await deps.postBackendJson("practice-timing-create", {
        apiBase: state.timingOperationApiBase,
        payload: deps.buildPracticeTimingPayload(source, textSourceOverride),
      });
      deps.applyTimingOperation(operation);
      return true;
    } catch (error) {
      state.timingOperation = null;
      state.timingOperationError = deps.sourceReadiness.readableTimingError(error);
      deps.recordDebugEvent?.("timing-improve-failed", {
        error: state.timingOperationError,
      });
      return false;
    } finally {
      deps.render?.();
    }
  }

  function applyTimingOperation(operation, deps = {}) {
    const state = deps.getState();
    if (!operation || operation.kind !== "improve-timing") {
      throw new Error("Timing endpoint returned an unexpected response.");
    }
    state.timingOperation = operation;
    state.timingOperationError = operation.state === "failed"
      ? operation.error?.message || "Timing improvement failed."
      : "";
    deps.recordDebugEvent?.("timing-improve-operation", {
      operationId: operation.id || "",
      state: operation.state || "",
    });
    if (operation.state === "queued" || operation.state === "running") {
      deps.scheduleTimingOperationPoll(operation);
    } else {
      deps.clearTimingOperationPoll();
      operation.appliedToActiveSource = deps.applyTimingOperationResultToActiveSource(operation);
      deps.registerTimingOperationResultSources(operation);
    }
    return operation;
  }

  function scheduleTimingOperationPoll(operation, deps = {}) {
    const state = deps.getState();
    deps.clearTimingOperationPoll();
    if (!operation?.id) return false;
    const retryAfterMs = Number(operation.retryAfterMs || 3000);
    state.timingOperationPollTimer = deps.setTimeout(() => {
      deps.pollTimingOperation(operation.id);
    }, Math.max(1000, Math.min(retryAfterMs, 10000)));
    return true;
  }

  async function pollTimingOperation(operationId, deps = {}) {
    const state = deps.getState();
    try {
      const operation = await deps.getBackendJson("practice-operation", {
        apiBase: state.timingOperationApiBase,
        operationId,
      });
      deps.applyTimingOperation(operation);
      return true;
    } catch (error) {
      state.timingOperationError = deps.sourceReadiness.readableTimingError(error);
      deps.clearTimingOperationPoll();
      deps.recordDebugEvent?.("timing-improve-poll-failed", {
        operationId,
        error: state.timingOperationError,
      });
      return false;
    } finally {
      deps.render?.();
    }
  }

  function clearTimingOperationPoll(deps = {}) {
    const state = deps.getState();
    if (state.timingOperationPollTimer) {
      deps.clearTimeout(state.timingOperationPollTimer);
      state.timingOperationPollTimer = null;
      return true;
    }
    return false;
  }

  function errorMessage(error) {
    return error?.message || String(error);
  }

  window.__afShadowingSourceTimingWorkflow = {
    transcriptResultFromLoadedSource,
    fetchReusableTimingTranscriptResult,
    registerTimingOperationResultSources,
    registerPracticeSnapshotSource,
    activeSourceTimingApplyPatch,
    applyTimingOperationResultToActiveSource,
    startImproveTiming,
    applyTimingOperation,
    scheduleTimingOperationPoll,
    pollTimingOperation,
    clearTimingOperationPoll,
  };
})();
