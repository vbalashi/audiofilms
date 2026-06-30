(function audioFilmsDiagnosticsFormatWorkflow() {
  function formatDebugState({
    state = {},
    selectedSource = null,
    extensionBuildInfo,
    diagnosticsReport,
    captionTracks,
    transcriptMetadata,
    describePhraseAtIndex,
  } = {}) {
    return JSON.stringify(diagnosticsReport.debugState({
      extensionBuild: extensionBuildInfo?.(),
      backendBuild: state.backendBuildInfo,
      backendBuildError: state.backendBuildError,
      boot: state.bootDiagnostics,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTracks.formatSourceDebug(selectedSource) : null,
      cueSource: state.cueSource,
      transcriptResult: state.transcriptResult ? transcriptMetadata.summarizeTranscriptResult(state.transcriptResult) : null,
      phrases: state.phrases,
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      currentIndex: state.currentIndex,
      phraseProgressRestore: state.lastPhraseProgressRestore,
      diagnosticsClearedAt: state.diagnosticsClearedAt,
      error: state.error,
      sources: (state.practiceSources || []).map(captionTracks.formatSourceDebug),
      navigationEvents: state.navigationEvents,
      lastWordReplay: state.lastWordReplay,
      lastIssueReport: state.lastIssueReport,
      debugEvents: state.debugEvents,
    }), null, 2);
  }

  function formatIssueReport({
    state = {},
    options = {},
    selectedSource = null,
    pageUrl = "",
    issueReports,
    diagnosticsReport,
    captionTracks,
    transcriptMetadata,
    describePhraseAtIndex,
    getPlaybackSnapshot,
    extensionBuildInfo,
  } = {}) {
    return issueReports.formatNavigationIssueReport({
      diagnosticsReportApi: diagnosticsReport,
      url: pageUrl,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTracks.formatSourceDebug(selectedSource) : null,
      guidedMode: state.guidedMode,
      autoPause: state.autoPause,
      textVisible: state.textVisible,
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      currentIndex: state.currentIndex,
      phrases: state.phrases,
      phraseBoundaryCase: phraseBoundaryCase({
        state,
        options,
        selectedSource,
        pageUrl,
        issueReports,
        captionTracks,
        transcriptMetadata,
        describePhraseAtIndex,
      }),
      lastWordReplay: state.lastWordReplay,
      visibleError: state.error,
      navigationEvents: state.navigationEvents,
      debugEvents: state.debugEvents,
      extensionBuildInfo: extensionBuildInfo?.(),
      backendBuildInfo: state.backendBuildInfo,
      backendBuildError: state.backendBuildError,
      extraDiagnostics: options.extraDiagnostics,
    });
  }

  function phraseBoundaryCase({
    state = {},
    options = {},
    selectedSource = null,
    pageUrl = "",
    issueReports,
    captionTracks,
    transcriptMetadata,
    describePhraseAtIndex,
  } = {}) {
    return issueReports.phraseBoundaryCase({
      currentIndex: state.currentIndex,
      phrases: state.phrases,
      describePhraseAtIndex,
      videoId: state.videoId || "",
      url: pageUrl,
      selectedSource: selectedSource ? captionTracks.formatSourceDebug(selectedSource) : null,
      transcriptResult: state.transcriptResult ? transcriptMetadata.summarizeTranscriptResult(state.transcriptResult) : null,
      boundaryCaseReason: options.boundaryCaseReason || "manual-report",
    });
  }

  window.__afShadowingDiagnosticsFormatWorkflow = {
    formatDebugState,
    formatIssueReport,
    phraseBoundaryCase,
  };
})();
