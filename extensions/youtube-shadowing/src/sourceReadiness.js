(function audioFilmsSourceReadiness() {
  function practiceReadiness(input = {}) {
    if (input.timingState?.active) {
      return { state: "improving", label: "Improving..." };
    }
    if (input.loading || input.cacheRefreshRequested) {
      return { state: "improving", label: "Improving..." };
    }
    if (!input.phraseCount) {
      return { state: "no-captions", label: "No captions" };
    }
    const result = input.result;
    if (!result) {
      return { state: "ready", label: "Ready" };
    }
    if (result.timingExactness === "word-level" || result.sourceKind === "asr") {
      return { state: "precise", label: "Precise" };
    }
    if (result.timingExactness === "rough" || result.warnings?.length || result.fallbackUsed) {
      return { state: "rough", label: "Rough" };
    }
    return { state: "ready", label: "Ready" };
  }

  function timingOperationState(input = {}) {
    const operation = input.operation;
    if (operation?.state === "queued" || operation?.state === "running") {
      return {
        active: true,
        status: operation.state,
        copy: operation.state === "queued" ? "Timing improvement is queued." : "Timing improvement is running.",
      };
    }
    if (input.readiness?.state === "precise") {
      return { active: false, status: "", copy: "" };
    }
    if (operation?.state === "succeeded") {
      if (operation.appliedToActiveSource) {
        return {
          active: false,
          status: "succeeded",
          copy: "Timing improvement applied to current captions.",
        };
      }
      return {
        active: false,
        status: "succeeded",
        copy: "Timing improvement finished. Reload captions or reopen the video to use the latest timing.",
      };
    }
    if (input.timingOperationError) {
      return {
        active: false,
        status: "failed",
        copy: input.timingOperationError,
      };
    }
    if (operation?.state === "failed") {
      return {
        active: false,
        status: "failed",
        copy: operation.error?.message || "Timing improvement failed.",
      };
    }
    return { active: false, status: "", copy: "" };
  }

  function sourceWarningIsInformational(text) {
    return /^ASR job completed:/i.test(String(text || "").trim());
  }

  function readinessCopy(stateName) {
    return {
      "no-captions": "No usable phrase captions are loaded for this video.",
      rough: "Phrase practice is available, but timing or source quality may be rough.",
      ready: "Phrase practice is ready.",
      precise: "Phrase practice has the best available timing.",
      improving: "Caption or timing work is running; current practice can stay visible.",
    }[stateName] || "Caption state is available.";
  }

  function buildPracticeTimingPayload({
    source,
    videoId = "",
    textSourceOverride = "",
    resultOverride = null,
  } = {}) {
    const result = resultOverride || source?.loadedTranscriptResult || {};
    const sourceKind = timingPayloadSourceKind(source, result);
    const artifact = result.practiceArtifact || practiceArtifactFromSnapshot(result.practiceSnapshot);
    const textSource = textSourceOverride || (sourceKind === "manual" ? "manual" : "auto");
    const payload = {
      videoId,
      lang: result.languageCode || source?.languageCode || "auto",
      sourceKind,
      textSource,
      fullAudio: true,
    };
    if (artifact?.snapshotRevisionId) payload.snapshotRevisionId = artifact.snapshotRevisionId;
    if (artifact?.textSourceRevisionId) payload.textSourceRevisionId = artifact.textSourceRevisionId;
    if (artifact?.timingEvidenceRevisionId) payload.timingEvidenceRevisionId = artifact.timingEvidenceRevisionId;
    return payload;
  }

  function timingPayloadSourceKind(source, result = {}) {
    if (source?.track?.kind === "asr") return "auto";
    if (result.sourceKind === "auto") return "auto";
    return "manual";
  }

  function practiceArtifactFromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return snapshot.practiceArtifact || snapshot.artifact || null;
  }

  function readableTimingError(error) {
    const message = error?.message || String(error || "");
    if (/missing|unauthorized|401|auth/i.test(message)) {
      return "Timing improvement needs a tester token for this backend.";
    }
    return message || "Timing improvement failed.";
  }

  window.__afShadowingSourceReadiness = {
    practiceReadiness,
    timingOperationState,
    sourceWarningIsInformational,
    readinessCopy,
    buildPracticeTimingPayload,
    timingPayloadSourceKind,
    readableTimingError,
  };
})();
