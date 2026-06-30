(function audioFilmsPhraseProgress() {
  function progressKey({ videoId, sourceId } = {}) {
    return videoId && sourceId ? `${videoId}::${sourceId}` : "";
  }

  function phraseProgressId(phrase, index) {
    if (!phrase) return "";
    if (phrase.id !== undefined && phrase.id !== null) return String(phrase.id);
    return stableFingerprint({
      index: Number.isInteger(phrase.index) ? phrase.index : index,
      startMs: finiteInteger(phrase.startMs),
      endMs: finiteInteger(phrase.endMs),
      text: String(phrase.text || "").slice(0, 240),
    });
  }

  function restoreIndexFromProgress(progress, phrases) {
    if (!progress || !Array.isArray(phrases) || !phrases.length) return null;
    const phraseId = String(progress.phraseId || "");
    if (phraseId) {
      const exactIndex = phrases.findIndex((phrase, index) => phraseProgressId(phrase, index) === phraseId);
      if (exactIndex >= 0) {
        return {
          index: exactIndex,
          reason: "phrase-id",
          progress,
        };
      }
    }
    const fallbackIndex = clampNumber(progress.currentIndex, 0, phrases.length - 1, 0);
    return {
      index: Math.round(fallbackIndex),
      reason: "clamped-index",
      progress,
    };
  }

  function buildProgress({ phrases, currentIndex, now = new Date() } = {}) {
    const list = Array.isArray(phrases) ? phrases : [];
    const index = Number.isInteger(currentIndex) ? currentIndex : 0;
    const phrase = list[index];
    if (!phrase) return null;
    return {
      currentIndex: index,
      phraseId: phraseProgressId(phrase, index),
      phraseCount: list.length,
      updatedAt: now.toISOString(),
    };
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
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

  window.__afShadowingPhraseProgress = {
    progressKey,
    phraseProgressId,
    restoreIndexFromProgress,
    buildProgress,
  };
})();
