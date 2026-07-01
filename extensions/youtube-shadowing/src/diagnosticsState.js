(function audioFilmsDiagnosticsState() {
  function createDiagnosticsStateController({
    state,
    diagnosticsReport,
    document,
    now = () => new Date().toISOString(),
  } = {}) {
    function recordDebugEvent(type, detail) {
      state.debugEvents = diagnosticsReport.appendCappedEvent(state.debugEvents, {
        at: now(),
        type,
        ...detail,
      }, 30);
      publishSnapshot();
    }

    function recordNavigationEvent(type, detail = {}) {
      const event = {
        id: `nav-${state.navigationEventSeq += 1}`,
        at: now(),
        type,
        ...detail,
      };
      state.navigationEvents = diagnosticsReport.appendCappedEvent(state.navigationEvents, event, 40);
      publishSnapshot();
      return event;
    }

    function publishSnapshot() {
      const snapshot = diagnosticsReport.diagnosticsSnapshot({
        diagnosticsClearedAt: state.diagnosticsClearedAt || "",
        videoId: state.videoId || "",
        selectedSourceId: state.selectedSourceId || "",
        contentScriptRevision: state.contentScriptRevision || "",
        phraseProgressRestore: state.lastPhraseProgressRestore,
        loading: Boolean(state.loading),
        visibleError: state.error || "",
        bootLastError: state.bootDiagnostics?.lastError || "",
        debugEvents: state.debugEvents,
        navigationEvents: state.navigationEvents,
        lastIssueReport: state.lastIssueReport,
      });
      document.documentElement.dataset.afShadowingDiagnosticsState = JSON.stringify(snapshot);
      return snapshot;
    }

    return {
      recordDebugEvent,
      recordNavigationEvent,
      publishSnapshot,
    };
  }

  window.__afShadowingDiagnosticsState = {
    createDiagnosticsStateController,
  };
})();
