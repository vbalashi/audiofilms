(function audioFilmsAudioTracks() {
  function audioTrackEntries(playerResponse) {
    return playerResponse?.captions?.playerCaptionsTracklistRenderer?.audioTracks || [];
  }

  function captionTracks(playerResponse) {
    return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  }

  function buildAudioContext(playerResponse) {
    const captions = captionTracks(playerResponse);
    const entries = audioTrackEntries(playerResponse);
    const defaultIndex = Number.isInteger(playerResponse?.captions?.playerCaptionsTracklistRenderer?.defaultAudioTrackIndex)
      ? playerResponse.captions.playerCaptionsTracklistRenderer.defaultAudioTrackIndex
      : 0;
    const tracks = entries.map((entry, index) => buildAudioTrack(entry, index, captions));
    const selected = tracks[defaultIndex] || tracks[0] || null;

    return {
      tracks,
      trackCount: tracks.length,
      selectedTrackId: selected?.id || "",
      selectedTrack: selected,
      languageCode: selected?.languageCode || "",
      provenance: selected?.provenance || "unknown",
      evidence: selected?.evidence || "",
      confidence: selected?.languageCode ? "verified" : "unknown",
    };
  }

  function buildAudioTrack(entry, index, captions) {
    const captionIndices = Array.isArray(entry?.captionTrackIndices)
      ? entry.captionTrackIndices.filter((value) => Number.isInteger(value) && captions[value])
      : [];
    const defaultCaptionIndex = Number.isInteger(entry?.defaultCaptionTrackIndex)
      ? entry.defaultCaptionTrackIndex
      : captionIndices.length === 1 ? captionIndices[0] : null;
    const languageCandidates = unique(captionIndices.map((captionIndex) => captions[captionIndex]?.languageCode).filter(Boolean));
    const selectedLanguage = defaultCaptionIndex !== null
      ? captions[defaultCaptionIndex]?.languageCode || ""
      : languageCandidates.length === 1 ? languageCandidates[0] : "";
    const explicitAutoDubbed = entry?.isAutoDubbed === true || entry?.audioTrack?.isAutoDubbed === true || entry?.audioTrackType === "AUTO_DUBBED" || entry?.audioTrack?.type === "AUTO_DUBBED";
    const explicitDubbed = entry?.isDubbed === true || entry?.audioTrack?.isDubbed === true || entry?.audioTrackType === "DUBBED" || entry?.audioTrack?.type === "DUBBED";
    const provenance = explicitAutoDubbed
      ? "auto-dubbed"
      : explicitDubbed
        ? "dubbed"
        : "unknown";

    return {
      id: String(entry?.id || entry?.audioTrackId || `youtube-audio:${index}`),
      index,
      languageCode: selectedLanguage,
      languageCandidates,
      captionTrackIndices: captionIndices,
      provenance,
      evidence: selectedLanguage ? "youtube-audio-track-caption-association" : "",
      isDefault: Boolean(entry?.hasDefaultTrack || index === 0),
      label: entry?.displayName || entry?.audioTrack?.displayName || "",
    };
  }

  function sourceMatchesSelectedAudio(sourceLanguage, audioContext) {
    const language = String(audioContext?.languageCode || "").trim();
    if (!language || !sourceLanguage) return false;
    const identity = window.__afShadowingLanguageIdentity;
    return identity?.compareLanguageIdentity(sourceLanguage, language) !== "incompatible";
  }

  function canRunAsrForSource(sourceLanguage, audioContext) {
    return Boolean(
      audioContext?.selectedTrackId &&
      audioContext?.languageCode &&
      audioContext?.evidence &&
      sourceMatchesSelectedAudio(sourceLanguage, audioContext),
    );
  }

  function unique(values) {
    return [...new Set(values)];
  }

  window.__afShadowingAudioTracks = {
    buildAudioContext,
    sourceMatchesSelectedAudio,
    canRunAsrForSource,
  };
})();
