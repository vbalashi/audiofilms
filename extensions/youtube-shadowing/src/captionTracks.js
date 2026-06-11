(function audioFilmsCaptionTracks() {
  function getCaptionTracks(playerResponse) {
    return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  }

  function buildPracticeSources(tracks) {
    return tracks.map((track, index) => ({
      id: `${track.languageCode || "unknown"}:${track.vssId || index}:${index}`,
      index,
      name: trackName(track),
      languageCode: track.languageCode || "",
      track,
      error: "",
      lastError: "",
      lastRetrievalAttempts: [],
      loadedCueSource: "",
      loadedTranscriptResult: null,
    }));
  }

  function chooseDefaultPracticeSource(sources) {
    return [...sources].sort(compareDefaultSources)[0] || null;
  }

  function compareDefaultSources(left, right) {
    return defaultSourceScore(left) - defaultSourceScore(right) || left.index - right.index;
  }

  function defaultSourceScore(source) {
    const languageRank = preferredLanguageRank(source.languageCode);
    const sourceKindRank = source.track.kind === "asr" ? 1 : 0;
    return languageRank * 10 + sourceKindRank;
  }

  function preferredLanguageRank(languageCode) {
    const normalized = normalizeLanguageCode(languageCode);
    const base = normalized.split("-")[0] || normalized;
    const preferred = preferredLanguageCodes();
    const exactIndex = preferred.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex;
    const baseIndex = preferred.indexOf(base);
    if (baseIndex >= 0) return baseIndex;
    return 100;
  }

  function preferredLanguageCodes() {
    const browserLanguages = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language].filter(Boolean);
    const codes = [...browserLanguages, "nl", "en"].map(normalizeLanguageCode).filter(Boolean);
    return [...new Set(codes.flatMap((code) => [code, code.split("-")[0]]))];
  }

  function normalizeLanguageCode(languageCode) {
    return String(languageCode || "").trim().toLowerCase().replace("_", "-");
  }

  function describeTrack(track) {
    return trackName(track);
  }

  function trackName(track) {
    return track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || track.languageCode || "unknown";
  }

  function sourceDisplayName(source) {
    return source.name || source.languageCode || "Captions";
  }

  function cueSourceLabel(value) {
    if (!value) return "";
    if (String(value).startsWith("timedtext")) return "timedtext";
    if (value === "youtubei-transcript") return "transcript API";
    if (value === "transcript-dom") return "transcript fallback";
    return "fallback";
  }

  function groupPracticeSources(sources) {
    const groups = [];
    const byLanguage = new Map();

    for (const source of sources) {
      const key = source.languageCode || source.name || "unknown";
      if (!byLanguage.has(key)) {
        const label = source.languageCode
          ? `${languageLabelFromSource(source)} (${source.languageCode})`
          : languageLabelFromSource(source);
        const group = { key, label, sources: [] };
        byLanguage.set(key, group);
        groups.push(group);
      }
      byLanguage.get(key).sources.push(source);
    }

    groups.forEach((group) => {
      group.sources.sort((left, right) => {
        const leftAuto = left.track.kind === "asr" ? 1 : 0;
        const rightAuto = right.track.kind === "asr" ? 1 : 0;
        return leftAuto - rightAuto || left.index - right.index;
      });
    });

    return groups;
  }

  function languageLabelFromSource(source) {
    const name = source.name || source.languageCode || "Unknown";
    return name
      .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
      .trim() || name;
  }

  function formatSourceDebug(source) {
    return {
      id: source.id,
      name: source.name,
      languageCode: source.languageCode,
      kind: source.track.kind || "manual",
      vssId: source.track.vssId || "",
      loadedCueSource: source.loadedCueSource,
      loadedTranscriptResult: source.loadedTranscriptResult,
      lastRetrievalAttempts: source.lastRetrievalAttempts || [],
      error: source.error,
      lastError: source.lastError,
    };
  }

  window.__afShadowingCaptionTracks = {
    getCaptionTracks,
    buildPracticeSources,
    chooseDefaultPracticeSource,
    preferredLanguageCodes,
    describeTrack,
    trackName,
    sourceDisplayName,
    cueSourceLabel,
    groupPracticeSources,
    languageLabelFromSource,
    formatSourceDebug,
  };
})();
