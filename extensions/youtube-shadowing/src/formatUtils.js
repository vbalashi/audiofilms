(function audioFilmsFormatUtilsModule() {
  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function formatPlaybackRate(value, options = {}) {
    const min = Number.isFinite(options.min) ? options.min : 0.25;
    const max = Number.isFinite(options.max) ? options.max : 2;
    const fallback = Number.isFinite(options.fallback) ? options.fallback : 1;
    return `${clampNumber(Number(value), min, max, fallback).toFixed(2)}x`;
  }

  function wordsEqual(left, right) {
    return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "accent" }) === 0;
  }

  function formatTimestamp(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  window.__afShadowingFormatUtils = {
    clampNumber,
    formatPlaybackRate,
    wordsEqual,
    formatTimestamp,
  };
})();
