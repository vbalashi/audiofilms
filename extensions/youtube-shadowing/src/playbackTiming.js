(function audioFilmsPlaybackTiming() {
  const DEFAULTS = {
    preRollMs: 150,
    postRollMs: 500,
    minAudibleEndTailMs: 300,
    contiguousBoundaryGuardMs: 120,
  };

  function findPhraseIndexForTime(phrases, currentMs) {
    const list = Array.isArray(phrases) ? phrases : [];
    if (!list.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    const activeIndex = list.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex >= 0) return activeIndex;

    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index].startMs <= currentMs) return index;
    }

    return 0;
  }

  function findPlaybackPhraseIndex(phrases, currentMs, options = {}) {
    const list = Array.isArray(phrases) ? phrases : [];
    const config = timingConfig(options);
    if (!list.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    for (let index = 0; index < list.length; index += 1) {
      const phrase = list[index];
      if (
        currentMs >= phrase.startMs - config.preRollMs &&
        currentMs <= playbackEndMsForPhrase(list, index, config)
      ) {
        return index;
      }
    }

    return findPhraseIndexForTime(list, currentMs);
  }

  function playbackEndMsForPhrase(phrases, index, options = {}) {
    const list = Array.isArray(phrases) ? phrases : [];
    const config = timingConfig(options);
    const phrase = list[index];
    if (!phrase) return 0;
    const nextPhrase = list[index + 1];
    const postRollEndMs = phrase.endMs + config.postRollMs;
    const audibleEndMs = phrase.endMs + config.minAudibleEndTailMs;
    if (nextPhrase && nextPhrase.startMs < postRollEndMs) {
      return Math.min(
        postRollEndMs,
        Math.max(audibleEndMs, nextPhrase.startMs - config.contiguousBoundaryGuardMs),
      );
    }
    return postRollEndMs;
  }

  function phrasePlaybackStartMs(phrase) {
    const playbackStartMs = Number(phrase?.playbackStartMs);
    if (
      Number.isFinite(playbackStartMs) &&
      playbackStartMs >= phrase.startMs &&
      playbackStartMs < phrase.endMs
    ) {
      return playbackStartMs;
    }
    return phrase?.startMs || 0;
  }

  function resolveWordTiming({ phrase, phrases, selection = {}, transcriptTimingExactness = "" } = {}) {
    const list = Array.isArray(phrases) ? phrases : [];
    const candidates = Array.isArray(phrase?.wordTimings)
      ? phrase.wordTimings
      : Array.isArray(phrase?.words)
        ? phrase.words
        : Array.isArray(phrase?.tokens)
          ? phrase.tokens
          : [];
    const tokenIndex = finiteInteger(selection.tokenIndex);
    const item = candidates.find((candidate, index) => {
      const candidateIndex = finiteInteger(candidate?.tokenIndex ?? candidate?.index);
      return candidateIndex === tokenIndex || (candidateIndex === null && index === tokenIndex);
    });
    const startMs = finiteInteger(item?.startMs ?? item?.start);
    const endMs = finiteInteger(item?.endMs ?? item?.end);
    if (
      !phrase ||
      startMs === null ||
      endMs === null ||
      endMs <= startMs ||
      startMs < phrase.startMs - 250 ||
      endMs > playbackEndMsForPhrase(list, list.indexOf(phrase)) + 250
    ) {
      return null;
    }
    const exactness = item?.timingExactness || phrase.timingExactness || transcriptTimingExactness;
    const source = exactness === "word-level" || item?.source === "asr" || item?.source === "alignment"
      ? item?.source || "word-level"
      : null;
    return source ? { startMs, endMs, source } : null;
  }

  function estimateWordStartMs({ phrase, selection = {}, displaySegmentRange = null } = {}) {
    if (!phrase) return 0;
    const range = displaySegmentRange;
    const segmentStartChar = range?.start ?? 0;
    const segmentEndChar = range?.end ?? String(phrase.text || "").length;
    const textLength = Math.max(segmentEndChar - segmentStartChar, 1);
    const charStart = clampNumber(
      finiteInteger(selection.charStart) - segmentStartChar,
      0,
      textLength,
      0,
    );
    const ratio = charStart / textLength;
    const durationMs = Math.max(0, phrase.endMs - phrase.startMs);
    return phrase.startMs + durationMs * ratio;
  }

  function wordReplayTiming({
    phrase,
    phrases,
    selection = {},
    wordTiming = null,
    displaySegmentRange = null,
    mode = "",
    options = {},
  } = {}) {
    const list = Array.isArray(phrases) ? phrases : [];
    const config = timingConfig(options);
    if (!phrase) return { ok: false, reason: "missing-phrase" };
    if (mode === "word" && !wordTiming) {
      return {
        ok: false,
        reason: "word-timing-unavailable",
        timingSource: "unavailable",
      };
    }

    const phraseIndex = list.indexOf(phrase);
    const phraseEndMs = playbackEndMsForPhrase(list, phraseIndex, config);
    const startMs = wordTiming
      ? wordTiming.startMs
      : estimateWordStartMs({ phrase, selection, displaySegmentRange });
    const endMs = mode === "word" ? wordTiming.endMs : phraseEndMs;
    const clampedStartMs = clampNumber(
      startMs - (mode === "word" ? 40 : config.preRollMs),
      phrase.startMs,
      Math.max(phrase.startMs, phraseEndMs - 40),
      phrase.startMs,
    );
    const clampedEndMs = clampNumber(
      endMs,
      Math.max(clampedStartMs + 80, phrase.startMs),
      phraseEndMs,
      phraseEndMs,
    );
    const startSeconds = Math.max(0, clampedStartMs) / 1000;
    const endSeconds = Math.max(startSeconds + 0.08, clampedEndMs / 1000);
    return {
      ok: true,
      startSeconds,
      endSeconds,
      seekToSec: roundTime(startSeconds),
      expectedPauseAtSec: roundTime(endSeconds),
      timingSource: wordTiming ? wordTiming.source : "estimate-char-position",
      autoPause: true,
    };
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function timingConfig(options = {}) {
    return {
      preRollMs: finiteInteger(options.preRollMs) ?? DEFAULTS.preRollMs,
      postRollMs: finiteInteger(options.postRollMs) ?? DEFAULTS.postRollMs,
      minAudibleEndTailMs: finiteInteger(options.minAudibleEndTailMs) ?? DEFAULTS.minAudibleEndTailMs,
      contiguousBoundaryGuardMs: finiteInteger(options.contiguousBoundaryGuardMs) ?? DEFAULTS.contiguousBoundaryGuardMs,
    };
  }

  function roundTime(value) {
    return Math.round(value * 1000) / 1000;
  }

  window.__afShadowingPlaybackTiming = {
    findPhraseIndexForTime,
    findPlaybackPhraseIndex,
    playbackEndMsForPhrase,
    phrasePlaybackStartMs,
    resolveWordTiming,
    estimateWordStartMs,
    wordReplayTiming,
  };
})();
