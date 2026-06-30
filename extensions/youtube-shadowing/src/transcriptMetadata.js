(function audioFilmsTranscriptMetadata() {
  const phraseApi = window.__afShadowingPhrases;

  function normalizeTranscriptResult(result, track) {
    return {
      cues: Array.isArray(result?.cues) ? result.cues : [],
      sourceKind: result?.sourceKind || sourceKindFromTrack(track),
      retrievalPath: result?.retrievalPath || result?.cueSource || "backend-provider",
      fetchOrigin: result?.fetchOrigin || fetchOriginFromRetrievalPath(result?.retrievalPath || result?.cueSource || "backend-provider"),
      provider: result?.provider || result?.actualTrackId || "",
      selectedTrackId: result?.selectedTrackId || track?.vssId || track?.languageCode || "",
      actualTrackId: result?.actualTrackId || "",
      languageCode: result?.languageCode || track?.languageCode || "",
      timingExactness: result?.timingExactness || "approximate",
      qualityFlags: Array.isArray(result?.qualityFlags) ? result.qualityFlags : [],
      warnings: Array.isArray(result?.warnings) ? result.warnings : [],
      retrievalAttempts: Array.isArray(result?.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result?.cacheStatus || "",
      fallbackUsed: Boolean(result?.fallbackUsed),
      primaryProvider: result?.primaryProvider || "",
      failedProvider: result?.failedProvider || "",
      fallbackReason: result?.fallbackReason || "",
      practicePhraseSource: result?.practicePhraseSource || "",
      practiceSnapshot: result?.practiceSnapshot || null,
      practiceArtifact: result?.practiceArtifact || null,
    };
  }

  function sourceKindFromTrack(track) {
    return track?.kind === "asr" ? "auto" : "manual";
  }

  function summarizeTranscriptResult(result) {
    return {
      sourceKind: result.sourceKind,
      retrievalPath: result.retrievalPath,
      fetchOrigin: result.fetchOrigin || fetchOriginFromRetrievalPath(result.retrievalPath),
      provider: result.provider || result.actualTrackId || "",
      selectedTrackId: result.selectedTrackId || "",
      actualTrackId: result.actualTrackId || "",
      languageCode: result.languageCode || "",
      timingExactness: result.timingExactness,
      qualityFlags: [...(result.qualityFlags || [])],
      warnings: [...(result.warnings || [])],
      retrievalAttempts: Array.isArray(result.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result.cacheStatus || "",
      fallbackUsed: Boolean(result.fallbackUsed),
      primaryProvider: result.primaryProvider || "",
      failedProvider: result.failedProvider || "",
      fallbackReason: result.fallbackReason || "",
      practicePhraseSource: result.practicePhraseSource || "",
      practiceSnapshot: result.practiceSnapshot || null,
      practiceArtifact: result.practiceArtifact || null,
    };
  }

  function formatTranscriptBadge(result) {
    const sourceLabel = {
      manual: "Manual",
      auto: "Auto",
      "transcript-panel": "Transcript fallback",
      provider: "Provider",
      asr: "ASR",
      unknown: "Unknown",
    }[result.sourceKind] || "Unknown";
    const timingLabel = result.timingExactness === "exact"
      ? "exact"
      : result.timingExactness === "word-level" ? "word-level" : "rough timing";
    const originLabel = formatFetchOriginLabel(result);
    const cacheLabel = result.cacheStatus === "hit" ? " · cached" : "";
    const fallbackLabel = result.fallbackUsed ? " · fallback" : "";
    return `${sourceLabel} · ${timingLabel}${originLabel ? ` · via ${originLabel}` : ""}${cacheLabel}${fallbackLabel}`;
  }

  function fetchOriginFromRetrievalPath(retrievalPath) {
    if (!retrievalPath) return "";
    if (String(retrievalPath).startsWith("timedtext")) return "youtube-page";
    if (retrievalPath === "backend-provider" || retrievalPath === "local-asr-backend") return "backend";
    if (retrievalPath === "youtubei-transcript") return "youtube-transcript-api";
    if (retrievalPath === "transcript-dom") return "youtube-transcript-dom";
    return "";
  }

  function formatFetchOriginLabel(result) {
    const provider = String(result?.provider || "").trim();
    if (provider === "supadata") return "Supadata";
    if (provider === "yt-dlp") return "yt-dlp";
    if (provider === "local-asr-practice") return "local ASR";
    if (provider === "youtube-timedtext") return "YouTube page";
    if (provider === "youtubei-transcript") return "YouTube transcript API";
    if (provider === "youtube-transcript-panel") return "YouTube transcript DOM";

    const origin = String(result?.fetchOrigin || "").trim();
    if (origin === "youtube-page") return "YouTube page";
    if (origin === "backend") return provider || "backend";
    if (origin === "youtube-transcript-api") return "YouTube transcript API";
    if (origin === "youtube-transcript-dom") return "YouTube transcript DOM";
    return provider;
  }

  function transcriptResultFromPracticeTimingOperation(operation, options = {}) {
    const snapshot = operation?.result?.snapshot;
    if (operation?.kind !== "improve-timing" || operation.state !== "succeeded") {
      return null;
    }

    const applicability = operation.result?.applicability;
    const fingerprintDetails = timingFingerprintCompatibilityDetails(operation, options.currentResult);
    const fingerprintCompatible = fingerprintDetails.compatible;
    if (!applicability?.appliesToCurrentSnapshot && !fingerprintCompatible) {
      options.recordDebugEvent?.("timing-cache-skipped", {
        operationId: operation.id || "",
        staleReason: applicability?.staleReason || "missing-applicability",
        requestedSnapshotRevisionId: applicability?.requestedSnapshotRevisionId || "",
        resultSnapshotRevisionId: applicability?.resultSnapshotRevisionId || operation.result?.snapshotRevisionId || "",
        requestedTextSourceRevisionId: applicability?.requestedTextSourceRevisionId || "",
        resultTextSourceRevisionId: applicability?.resultTextSourceRevisionId || operation.result?.textSourceRevisionId || "",
        currentTextContentFingerprint: fingerprintDetails.currentFingerprint,
        resultTextContentFingerprint: fingerprintDetails.resultFingerprint,
        currentLanguage: fingerprintDetails.currentLanguage,
        resultLanguage: fingerprintDetails.resultLanguage,
        fingerprintSource: fingerprintDetails.currentFingerprintSource,
      });
      return null;
    }
    if (!applicability?.appliesToCurrentSnapshot && fingerprintCompatible) {
      options.recordDebugEvent?.("timing-cache-fingerprint-match", {
        operationId: operation.id || "",
        staleReason: applicability?.staleReason || "",
        textContentFingerprint: fingerprintDetails.resultFingerprint,
        fingerprintSource: fingerprintDetails.currentFingerprintSource,
      });
    }

    return transcriptResultFromPracticeSnapshot(snapshot, operation);
  }

  function timingResultMatchesCurrentTextFingerprint(operation, currentResult = null) {
    return timingFingerprintCompatibilityDetails(operation, currentResult).compatible;
  }

  function timingFingerprintCompatibilityDetails(operation, currentResult = null) {
    const staleReason = operation?.result?.applicability?.staleReason || "";
    if (staleReason !== "text-source-revision-mismatch") {
      return {
        compatible: false,
        currentFingerprint: "",
        resultFingerprint: "",
        currentLanguage: "",
        resultLanguage: "",
        currentFingerprintSource: "",
      };
    }
    const resultFingerprint = operation?.result?.snapshot?.textSource?.contentFingerprint || "";
    const artifactFingerprint = currentResult?.practiceArtifact?.textContentFingerprint || "";
    const snapshotFingerprint = currentResult?.practiceSnapshot?.textSource?.contentFingerprint || "";
    const currentFingerprint = artifactFingerprint || snapshotFingerprint || "";
    const currentFingerprintSource = artifactFingerprint
      ? "practiceArtifact.textContentFingerprint"
      : snapshotFingerprint ? "practiceSnapshot.textSource.contentFingerprint" : "";
    const resultLanguage = operation?.result?.snapshot?.textSource?.languageCode || "";
    const currentLanguage = currentResult?.languageCode || currentResult?.practiceSnapshot?.textSource?.languageCode || "";
    const languageCompatible = !resultLanguage || !currentLanguage || resultLanguage === currentLanguage;
    return {
      compatible: Boolean(resultFingerprint && currentFingerprint && resultFingerprint === currentFingerprint && languageCompatible),
      currentFingerprint,
      resultFingerprint,
      currentLanguage,
      resultLanguage,
      currentFingerprintSource,
    };
  }

  function transcriptResultFromPracticeSnapshot(snapshot, operation, options = {}) {
    const phrases = snapshot?.phraseSet?.phrases;
    if (!Array.isArray(phrases) || !phrases.length) {
      return null;
    }

    const cues = phrases.map((phrase, index) => ({
      startMs: Math.max(0, Number(phrase.startSec || 0) * 1000),
      endMs: Math.max(0, Number(phrase.endSec || 0) * 1000),
      playbackStartMs: phrase.playbackStartSec !== undefined
        ? Math.max(0, Number(phrase.playbackStartSec || 0) * 1000)
        : undefined,
      text: cleanPhraseText(phrase.text || ""),
      displayText: cleanPhraseText(phrase.displayText || ""),
      translationText: cleanPhraseText(phrase.translationText || ""),
      displayStartChar: finiteInteger(phrase.displayStartChar),
      displayEndChar: finiteInteger(phrase.displayEndChar),
      displaySegmentId: String(phrase.displaySegmentId || ""),
      segmentRole: String(phrase.segmentRole || ""),
      index,
      timingFlags: Array.isArray(phrase.timingFlags) ? phrase.timingFlags : [],
    })).filter((cue) => cue.text && cue.endMs >= cue.startMs);

    if (!cues.length) return null;

    const textSource = operation.input?.textSource || snapshot.textSource?.kind || "";
    const isAsrTextSource = snapshot.textSource?.kind === "asr" || textSource === "asr";
    const isManualTextSource = !isAsrTextSource && (textSource === "manual" || snapshot.textSource?.kind === "provided-captions");

    return {
      cues,
      sourceKind: isAsrTextSource ? "asr" : isManualTextSource ? "manual" : "auto",
      retrievalPath: "practice-timing-cache",
      fetchOrigin: "backend",
      provider: "audiofilms-practice-timing",
      selectedTrackId: "",
      actualTrackId: options.alternativeId || operation.result?.diagnostics?.asrJobId || "",
      languageCode: snapshot.textSource?.languageCode || operation.input?.language || "",
      timingExactness: "word-level",
      qualityFlags: [],
      warnings: [
        isAsrTextSource
          ? `ASR job completed: ${cues.length} ASR transcript phrases.`
          : isManualTextSource
          ? `ASR timing cache aligned ${cues.length} caption phrases.`
          : `ASR timing cache aligned ${cues.length} auto-caption phrases.`,
      ],
      retrievalAttempts: [{ path: "practice-timing-cache", status: "ok", cues: cues.length }],
      cacheStatus: "hit",
      fallbackUsed: false,
      primaryProvider: "asr-cache",
      failedProvider: "",
      fallbackReason: "",
      practicePhraseSource: "backend",
      practiceSnapshot: snapshot,
      practiceArtifact: practiceArtifactFromSnapshot(snapshot),
    };
  }

  function phrasesFromTranscriptResult(transcriptResult, options = {}) {
    const cues = Array.isArray(transcriptResult?.cues) ? transcriptResult.cues : [];
    if (usesBackendPhraseContract(transcriptResult)) {
      return cues.map((cue, index) => ({
        id: cue.phraseId ?? index,
        startMs: cue.startMs,
        endMs: cue.endMs,
        playbackStartMs: cue.playbackStartMs,
        text: cleanPhraseText(cue.text || ""),
        displayText: cleanPhraseText(cue.displayText || ""),
        translationText: cleanPhraseText(cue.translationText || ""),
        displayStartChar: finiteInteger(cue.displayStartChar),
        displayEndChar: finiteInteger(cue.displayEndChar),
        displaySegmentId: cue.displaySegmentId || "",
        segmentRole: cue.segmentRole || "",
        timingFlags: Array.isArray(cue.timingFlags) ? cue.timingFlags : [],
        cues: [cue],
        index,
      }));
    }
    if (typeof phraseApi?.buildPhrases !== "function") return [];
    return phraseApi.buildPhrases(cues, {
      maxPhraseDurationMs: options.maxPhraseDurationMs ?? 12000,
      longPauseMs: options.longPauseMs ?? 1000,
      maxWords: options.maxWords ?? 18,
      maxCharacters: options.maxCharacters ?? 140,
    });
  }

  function usesBackendPhraseContract(transcriptResult) {
    return transcriptResult?.practicePhraseSource === "backend" ||
      transcriptResult?.retrievalPath === "backend-provider" ||
      transcriptResult?.retrievalPath === "local-asr-backend" ||
      transcriptResult?.retrievalPath === "practice-timing-cache";
  }

  function summarizeTranscriptError(message) {
    const text = String(message || "");
    if (/Backend provider fallback is disabled/i.test(text)) {
      return "Caption retrieval failed: YouTube captions were empty and AudioFilms fallback is off.";
    }
    if (/Backend provider request timed out|Backend provider returned no response|Backend provider request failed/i.test(text)) {
      return "Caption retrieval failed: YouTube captions were empty and AudioFilms fallback failed.";
    }
    if (/Diagnostic YouTube transcript fallback is disabled/i.test(text) && /empty response/i.test(text)) {
      return "Caption retrieval failed: YouTube captions were empty and transcript fallback is off.";
    }
    const first = text.split("|")[0]?.split(";")[0]?.trim() || text;
    return first.length > 140 ? `${first.slice(0, 137)}...` : first;
  }

  function practiceArtifactFromSnapshot(snapshot) {
    if (!snapshot?.phraseSet?.revisionId) return null;
    return {
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_backend",
      snapshotRevisionId: snapshot.snapshotRevisionId || "",
      textSourceId: snapshot.textSource?.id || "",
      textSourceRevisionId: snapshot.textSource?.revisionId || "",
      textContentFingerprint: snapshot.textSource?.contentFingerprint || "",
      timingEvidenceRevisionId: snapshot.timingEvidence?.revisionId || "",
      phraseSetRevisionId: snapshot.phraseSet.revisionId || "",
      languageCode: snapshot.textSource?.languageCode || "",
      quality: snapshot.timingEvidence?.quality || "",
    };
  }

  function cleanPhraseText(text) {
    return phraseApi?.cleanPhraseText
      ? phraseApi.cleanPhraseText(text)
      : String(text || "").replace(/\s+([,.;:!?])/g, "$1").replace(/\s+/g, " ").trim();
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  window.__afShadowingTranscriptMetadata = {
    normalizeTranscriptResult,
    sourceKindFromTrack,
    summarizeTranscriptResult,
    formatTranscriptBadge,
    fetchOriginFromRetrievalPath,
    formatFetchOriginLabel,
    transcriptResultFromPracticeTimingOperation,
    timingResultMatchesCurrentTextFingerprint,
    timingFingerprintCompatibilityDetails,
    transcriptResultFromPracticeSnapshot,
    phrasesFromTranscriptResult,
    usesBackendPhraseContract,
    summarizeTranscriptError,
    practiceArtifactFromSnapshot,
  };
})();
