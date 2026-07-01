(function audioFilmsDiagnosticsDomModule() {
  function renderDebugPanel(debugPanel, debugState = {}, options = {}) {
    if (!(debugPanel instanceof HTMLElement)) return;
    const debug = debugPanel.querySelector("[data-af-debug]");
    const debugPanelCopy = debugPanel.querySelector("[data-af-debug-panel-copy]");

    debugPanel.classList.toggle("is-open", Boolean(debugState.open));
    debugPanel.classList.toggle("is-front", Boolean(debugState.inFront));
    debugPanel.classList.toggle("is-behind", Boolean(debugState.behind));
    if (debugPanelCopy) {
      debugPanelCopy.textContent = debugState.copyText || "";
    }
    if (debug) {
      debug.textContent = debugState.showDebugText ? options.debugText || "" : "";
    }
  }

  window.__afShadowingDiagnosticsDom = {
    renderDebugPanel,
  };
})();
