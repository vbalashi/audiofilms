(function audioFilmsDiagnosticsReport() {
  function diagnosticsSnapshot(input = {}) {
    return {
      capturedAt: input.capturedAt || new Date().toISOString(),
      diagnosticsClearedAt: input.diagnosticsClearedAt || "",
      videoId: input.videoId || "",
      selectedSourceId: input.selectedSourceId || "",
      contentScriptRevision: input.contentScriptRevision || "",
      phraseProgressRestore: input.phraseProgressRestore || null,
      loading: Boolean(input.loading),
      visibleError: input.visibleError || "",
      bootLastError: input.bootLastError || "",
      debugEventCount: count(input.debugEvents),
      navigationEventCount: count(input.navigationEvents),
      recentDebugEvents: tail(input.debugEvents, 8),
      recentNavigationEvents: tail(input.navigationEvents, 8),
      lastIssueReportPresent: Boolean(input.lastIssueReport),
    };
  }

  function debugState(input = {}) {
    const phrases = Array.isArray(input.phrases) ? input.phrases : [];
    return {
      extensionBuild: input.extensionBuild || null,
      backendBuild: input.backendBuild || null,
      backendBuildError: input.backendBuildError || "",
      boot: input.boot || null,
      videoId: input.videoId || "",
      selectedSource: input.selectedSource || null,
      cueSource: input.cueSource || "",
      transcriptResult: input.transcriptResult || null,
      phrases: phrases.length,
      currentPhrase: input.currentPhrase || describePhraseAtIndex(phrases, input.currentIndex),
      phraseProgressRestore: input.phraseProgressRestore || null,
      diagnosticsClearedAt: input.diagnosticsClearedAt || "",
      error: input.error || "",
      sources: Array.isArray(input.sources) ? input.sources : [],
      navigationEvents: tail(input.navigationEvents, 12),
      lastWordReplay: input.lastWordReplay || null,
      lastIssueReport: input.lastIssueReport || null,
      events: tail(input.debugEvents, 8),
    };
  }

  function debugPanelState(input = {}) {
    const inFront = Boolean(input.debugPanelInFront);
    return {
      open: Boolean(input.debugVisible),
      inFront,
      behind: !inFront,
      copyText: input.debugCopied ? "Copied" : "Copy",
      showDebugText: Boolean(input.debugVisible),
    };
  }

  function appendCappedEvent(events, event, maxSize) {
    const next = Array.isArray(events) ? [...events, event] : [event];
    const size = Number.isInteger(maxSize) && maxSize > 0 ? maxSize : 30;
    return next.length > size ? next.slice(next.length - size) : next;
  }

  function issueReport(input = {}) {
    const phrases = Array.isArray(input.phrases) ? input.phrases : [];
    return {
      kind: "audiofilms-youtube-navigation-issue",
      capturedAt: input.capturedAt || new Date().toISOString(),
      page: {
        url: input.url || "",
        videoId: input.videoId || "",
      },
      selectedSource: input.selectedSource || null,
      mode: {
        guidedMode: Boolean(input.guidedMode),
        autoPause: Boolean(input.autoPause),
        textVisible: Boolean(input.textVisible),
      },
      playback: input.playback || { videoPresent: false },
      currentPhrase: input.currentPhrase || describePhraseAtIndex(phrases, input.currentIndex),
      phraseBoundaryCase: input.phraseBoundaryCase || null,
      lastWordReplay: input.lastWordReplay || null,
      visibleState: {
        count: phrases.length ? `${input.currentIndex + 1} / ${phrases.length}` : "0 / 0",
        error: input.visibleError || "",
      },
      navigationEvents: tail(input.navigationEvents, 20),
      debugEvents: tail(input.debugEvents, 12),
    };
  }

  function describePhraseAtIndex(phrases, index) {
    const phrase = phrases[index];
    if (!phrase) {
      return {
        index,
        count: phrases.length,
        present: false,
      };
    }

    return {
      index,
      ordinal: index + 1,
      count: phrases.length,
      startSec: roundTime(phrase.startMs / 1000),
      endSec: roundTime(phrase.endMs / 1000),
      text: phrase.text,
      displayText: phrase.displayText || phrase.text || "",
      translationText: phrase.translationText || phrase.displayText || phrase.text || "",
      displayStartChar: finiteInteger(phrase.displayStartChar),
      displayEndChar: finiteInteger(phrase.displayEndChar),
      displaySegmentId: phrase.displaySegmentId || "",
      segmentRole: phrase.segmentRole || "",
    };
  }

  function tail(value, size) {
    return Array.isArray(value) ? value.slice(-size) : [];
  }

  function count(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  window.__afShadowingDiagnosticsReport = {
    diagnosticsSnapshot,
    debugState,
    debugPanelState,
    appendCappedEvent,
    issueReport,
    describePhraseAtIndex,
  };
})();
