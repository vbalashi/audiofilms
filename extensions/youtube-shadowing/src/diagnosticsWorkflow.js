(function audioFilmsDiagnosticsWorkflow() {
  function toggleDebug(state, options = {}) {
    const nextVisible = !state.debugVisible;
    state.debugVisible = nextVisible;
    if (nextVisible) {
      state.debugPanelInFront = true;
    }
    options.render?.();
    return nextVisible;
  }

  function closeDebug(state, options = {}) {
    state.debugVisible = false;
    options.render?.();
  }

  async function copyDebug(state, options = {}) {
    const text = formatDebugState(options);
    try {
      await options.navigator.clipboard.writeText(text);
    } catch (_error) {
      options.copyTextWithFallback(text);
    }
    state.debugCopied = true;
    options.render?.();
    options.window.setTimeout(() => {
      state.debugCopied = false;
      options.render?.();
    }, 1200);
  }

  function clearDiagnostics(state, options = {}) {
    const clearedAt = options.now();
    state.debugEvents = [];
    state.navigationEvents = [];
    state.lastIssueReport = null;
    state.navigationEventSeq = 0;
    state.debugCopied = false;
    state.issueCopied = false;
    state.diagnosticsClearedAt = clearedAt;
    state.bootDiagnostics.lastError = "";
    state.bootDiagnostics.updatedAt = clearedAt;
    delete options.document.documentElement.dataset.afShadowingLastError;
    delete options.document.documentElement.dataset.afShadowingBootError;
    options.publishDiagnosticsSnapshot();
    options.render?.();
    return clearedAt;
  }

  function formatDebugState(options = {}) {
    const selectedSource = options.getSelectedPracticeSource();
    return options.diagnosticsFormatWorkflow.formatDebugState({
      state: options.state,
      selectedSource,
      extensionBuildInfo: options.extensionBuildInfo,
      diagnosticsReport: options.diagnosticsReport,
      captionTracks: options.captionTracks,
      transcriptMetadata: options.transcriptMetadata,
      describePhraseAtIndex: options.describePhraseAtIndex,
    });
  }

  function formatIssueReport(reportOptions = {}, options = {}) {
    const selectedSource = options.getSelectedPracticeSource();
    return options.diagnosticsFormatWorkflow.formatIssueReport({
      state: options.state,
      options: reportOptions,
      selectedSource,
      pageUrl: options.window.location.href,
      issueReports: options.issueReports,
      diagnosticsReport: options.diagnosticsReport,
      captionTracks: options.captionTracks,
      transcriptMetadata: options.transcriptMetadata,
      describePhraseAtIndex: options.describePhraseAtIndex,
      getPlaybackSnapshot: options.getPlaybackSnapshot,
      extensionBuildInfo: options.extensionBuildInfo,
    });
  }

  function getPlaybackSnapshot(options = {}) {
    const video = options.getVideoElement();
    if (!video) {
      return { videoPresent: false };
    }

    return {
      videoPresent: true,
      currentTime: options.roundTime(video.currentTime),
      duration: options.roundTime(video.duration),
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      playbackRate: video.playbackRate,
    };
  }

  window.__afShadowingDiagnosticsWorkflow = {
    toggleDebug,
    closeDebug,
    copyDebug,
    clearDiagnostics,
    formatDebugState,
    formatIssueReport,
    getPlaybackSnapshot,
  };
})();
