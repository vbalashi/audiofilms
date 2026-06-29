(function audioFilmsSourceBinding() {
  const DICTIONARY_BINDING_VERSION = "youtube-dictionary-source-v2";
  const EXTENSION_FALLBACK_BUILDER_VERSION = "audiofilms-extension-fallback-phrases-v1";

  function createDictionarySourceBinding(input = {}) {
    const phrases = Array.isArray(input.phrases) ? input.phrases : [];
    const phraseIndex = Number.isInteger(input.phraseIndex) ? input.phraseIndex : 0;
    const phrase = phrases[phraseIndex] || phrases[input.currentIndex] || null;
    const source = input.source || null;
    const transcript = source?.loadedTranscriptResult || input.transcriptResult || {};
    const languageCode =
      normalizeLanguageCode(transcript.languageCode) ||
      normalizeLanguageCode(source?.languageCode) ||
      normalizeLanguageCode(input.selectedTrack?.languageCode);
    const artifact = transcript.practiceArtifact
      ? normalizeBackendPracticeArtifact(transcript.practiceArtifact, languageCode)
      : buildExtensionFallbackArtifact({
        transcript,
        phrase,
        languageCode,
        videoId: input.videoId || "",
        selectedSourceId: input.selectedSourceId || "",
      });
    const selection = input.selection || {};

    return {
      bindingVersion: DICTIONARY_BINDING_VERSION,
      videoId: input.videoId || "",
      captionSource: {
        languageCode,
        trackExternalId: stableCaptionTrackId(source, transcript),
        trackKind: captionTrackKind(source, transcript),
      },
      artifact,
      phrase: {
        id: phrase?.id ?? phrase?.index ?? phraseIndex,
        index: Number.isInteger(phrase?.index) ? phrase.index : phraseIndex,
        startMs: finiteInteger(phrase?.startMs),
        endMs: finiteInteger(phrase?.endMs),
        timingQuality: timingQualityFromTranscript(transcript),
        locatorConfidence: locatorConfidenceFromTranscript(transcript),
        text: boundedText(phrase?.text || "", 1000),
        textHash: stableFingerprint(phrase?.text || ""),
        displayText: boundedText(phraseDisplayText(phrase), 1400),
        displayTextHash: stableFingerprint(phraseDisplayText(phrase)),
        displayStartChar: finiteInteger(phrase?.displayStartChar),
        displayEndChar: finiteInteger(phrase?.displayEndChar),
        displaySegmentId: boundedText(phrase?.displaySegmentId || "", 200),
        segmentRole: boundedText(phrase?.segmentRole || "", 80),
      },
      selection: {
        clickedForm: boundedText(input.word || selection.originalToken || "", 160),
        tokenIndex: finiteInteger(selection.tokenIndex),
        charStart: finiteInteger(selection.charStart),
        charEnd: finiteInteger(selection.charEnd),
      },
      capturedAt: input.capturedAt || new Date().toISOString(),
    };
  }

  function buildDictionaryActionSourceContext(input = {}) {
    const binding = input.binding || {};
    const card = input.card || {};
    const observation = input.observation || {};

    return {
      contractVersion: "source-context-v2",
      source: {
        kind: "youtube_video",
        provider: "youtube",
        externalId: binding.videoId,
        languageCode: binding.captionSource?.languageCode || undefined,
      },
      artifact: binding.artifact,
      location: {
        kind: "caption_phrase",
        phraseIndex: finiteInteger(binding.phrase?.index),
        startMs: finiteInteger(binding.phrase?.startMs),
        endMs: finiteInteger(binding.phrase?.endMs),
        locatorConfidence: binding.phrase?.locatorConfidence,
        phraseTextHash: binding.phrase?.textHash,
        timingQuality: binding.phrase?.timingQuality,
      },
      selection: {
        clickedForm: binding.selection?.clickedForm || card?.clickedForm || card?.headword || "",
        tokenIndex: finiteInteger(binding.selection?.tokenIndex),
        charStart: finiteInteger(binding.selection?.charStart),
        charEnd: finiteInteger(binding.selection?.charEnd),
        contextText: binding.phrase?.displayText || binding.phrase?.text || "",
      },
      observation: {
        currentPlaybackTimeMs: finiteInteger(observation.currentPlaybackTimeMs),
        title: observation.title || "",
        capturedAt: observation.capturedAt || new Date().toISOString(),
      },
      diagnostics: {
        action: input.action || "",
        cardId: card?.id || "",
        bindingVersion: binding.bindingVersion,
        clientVersion: input.clientVersion || "",
        captionSource: binding.captionSource,
        fallbackReason: binding.artifact?.producer === "audiofilms_extension_fallback"
          ? binding.artifact?.quality || ""
          : "",
      },
    };
  }

  function normalizeBackendPracticeArtifact(artifact, languageCode) {
    return stripEmpty({
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_backend",
      snapshotRevisionId: artifact.snapshotRevisionId,
      textSourceId: artifact.textSourceId,
      textSourceRevisionId: artifact.textSourceRevisionId,
      textContentFingerprint: artifact.textContentFingerprint,
      timingEvidenceRevisionId: artifact.timingEvidenceRevisionId,
      phraseSetRevisionId: artifact.phraseSetRevisionId,
      builderVersion: artifact.builderVersion,
      languageCode: normalizeLanguageCode(artifact.languageCode) || languageCode,
      quality: artifact.quality,
    });
  }

  function buildExtensionFallbackArtifact(input = {}) {
    const transcript = input.transcript || {};
    const phrase = input.phrase || null;
    const phraseSetFingerprint = stableFingerprint({
      builderVersion: EXTENSION_FALLBACK_BUILDER_VERSION,
      videoId: input.videoId || "",
      selectedSourceId: input.selectedSourceId || "",
      languageCode: input.languageCode || "",
      sourceKind: transcript.sourceKind || "",
      retrievalPath: transcript.retrievalPath || "",
      timingExactness: transcript.timingExactness || "",
      qualityFlags: transcript.qualityFlags || [],
      cues: Array.isArray(phrase?.cues)
        ? phrase.cues.map((cue) => ({
          startMs: finiteInteger(cue.startMs),
          endMs: finiteInteger(cue.endMs),
          textHash: stableFingerprint(cue.text || ""),
        }))
        : [],
      phrase: {
        index: phrase?.index,
        startMs: finiteInteger(phrase?.startMs),
        endMs: finiteInteger(phrase?.endMs),
        textHash: stableFingerprint(phrase?.text || ""),
      },
    });
    return stripEmpty({
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_extension_fallback",
      textContentFingerprint: phraseSetFingerprint,
      builderVersion: EXTENSION_FALLBACK_BUILDER_VERSION,
      languageCode: input.languageCode || "",
      quality: transcript.fallbackReason || transcript.timingExactness || "extension-fallback",
    });
  }

  function stableCaptionTrackId(source, transcript) {
    return source?.track?.vssId ||
      transcript.selectedTrackId ||
      transcript.actualTrackId ||
      stableFingerprint({
        languageCode: source?.languageCode || transcript.languageCode || "",
        name: source?.name || "",
        kind: source?.track?.kind || transcript.sourceKind || "",
      });
  }

  function captionTrackKind(source, transcript) {
    const kind = source?.track?.kind === "asr" ? "auto" : transcript.sourceKind || sourceKindFromTrack(source?.track);
    if (kind === "manual" || kind === "auto" || kind === "provider") return kind;
    return "unknown";
  }

  function timingQualityFromTranscript(transcript) {
    if (transcript.timingExactness === "word-level") return "word";
    if (transcript.timingExactness === "exact") return "cue";
    if (transcript.timingExactness === "inferred-end") return "approximate";
    return transcript.timingExactness || "approximate";
  }

  function locatorConfidenceFromTranscript(transcript) {
    if (transcript.practiceArtifact?.producer === "audiofilms_backend") return "canonical";
    if (transcript.timingExactness === "exact" || transcript.timingExactness === "word-level") return "derived";
    return "approximate";
  }

  function sourceKindFromTrack(track) {
    return track?.kind === "asr" ? "auto" : "manual";
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function normalizeLanguageCode(languageCode) {
    const normalized = String(languageCode || "").trim().toLowerCase().replace("_", "-");
    return normalized === "auto" ? "" : normalized;
  }

  function boundedText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  function phraseDisplayText(phrase) {
    return phrase?.displayText || phrase?.text || "";
  }

  function stripEmpty(value) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
    );
  }

  function stableFingerprint(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `af-fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  window.__afShadowingSourceBinding = {
    createDictionarySourceBinding,
    buildDictionaryActionSourceContext,
  };
})();
