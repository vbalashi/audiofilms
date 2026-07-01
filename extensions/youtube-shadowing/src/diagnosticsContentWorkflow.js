(function audioFilmsDiagnosticsContentWorkflow() {
  function createDiagnosticsController(deps = {}) {
    function diagnosticsWorkflowOptions() {
      return {
        state: deps.getState(),
        document: deps.document,
        window: deps.window,
        navigator: deps.navigator,
        diagnosticsFormatWorkflow: deps.diagnosticsFormatWorkflow,
        diagnosticsReport: deps.diagnosticsReport,
        issueReports: deps.issueReports,
        captionTracks: deps.captionTracks,
        transcriptMetadata: deps.transcriptMetadata,
        getSelectedPracticeSource: deps.getSelectedPracticeSource,
        getVideoElement: deps.getVideoElement,
        describePhraseAtIndex: deps.describePhraseAtIndex,
        getPlaybackSnapshot,
        extensionBuildInfo: deps.extensionBuildInfo,
        publishDiagnosticsSnapshot: deps.publishDiagnosticsSnapshot,
        copyTextWithFallback: deps.copyTextWithFallback,
        roundTime: deps.roundTime,
        now: () => new Date().toISOString(),
        render: deps.render,
      };
    }

    function toggleDebug() {
      return deps.diagnosticsWorkflow.toggleDebug(deps.getState(), diagnosticsWorkflowOptions());
    }

    function closeDebug() {
      return deps.diagnosticsWorkflow.closeDebug(deps.getState(), diagnosticsWorkflowOptions());
    }

    function copyDebug() {
      return deps.diagnosticsWorkflow.copyDebug(deps.getState(), diagnosticsWorkflowOptions());
    }

    function clearDiagnostics() {
      return deps.diagnosticsWorkflow.clearDiagnostics(deps.getState(), diagnosticsWorkflowOptions());
    }

    function formatDebugState() {
      return deps.diagnosticsWorkflow.formatDebugState(diagnosticsWorkflowOptions());
    }

    function formatIssueReport(options = {}) {
      return deps.diagnosticsWorkflow.formatIssueReport(options, diagnosticsWorkflowOptions());
    }

    function getPlaybackSnapshot() {
      return deps.diagnosticsWorkflow.getPlaybackSnapshot(diagnosticsWorkflowOptions());
    }

    return {
      toggleDebug,
      closeDebug,
      copyDebug,
      clearDiagnostics,
      formatDebugState,
      formatIssueReport,
      getPlaybackSnapshot,
    };
  }

  window.__afShadowingDiagnosticsContentWorkflow = {
    createDiagnosticsController,
  };
})();
