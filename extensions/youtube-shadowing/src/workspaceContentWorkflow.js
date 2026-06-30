(function audioFilmsWorkspaceContentWorkflow() {
  function createWorkspaceController(deps = {}) {
    function workspaceWorkflowOptions() {
      return {
        document: deps.document,
        window: deps.window,
        HTMLElement: deps.HTMLElement,
        rootId: deps.rootId,
        toggleId: deps.toggleId,
        ribbonPanelId: deps.ribbonPanelId,
        dictionaryPanelId: deps.dictionaryPanelId,
        shadowContainerId: deps.shadowContainerId,
        displayPreferences: deps.displayPreferences,
        scrollContainment: deps.scrollContainment,
        getShadowLayerFocusInstalled: deps.getShadowLayerFocusInstalled,
        setShadowLayerFocusInstalled: deps.setShadowLayerFocusInstalled,
        getShadowScrollGuardInstalled: deps.getShadowScrollGuardInstalled,
        setShadowScrollGuardInstalled: deps.setShadowScrollGuardInstalled,
        toggleLearningMode,
        updateDisplayPreferences: deps.updateDisplayPreferences,
        stopPlaybackTimer: deps.stopPlaybackTimer,
        detachPassivePlaybackWatcher: deps.detachPassivePlaybackWatcher,
        handleCurrentLocation: deps.handleCurrentLocation,
        applyThemeAttributes: deps.applyThemeAttributes,
        handleShadowLayerFocus: deps.handleShadowLayerFocus,
        installPanelGestureFallback: deps.installPanelGestureFallback,
        createRibbonPanel: deps.createRibbonPanel,
        createDictionaryPanel: deps.createDictionaryPanel,
        createDebugPanel: deps.createDebugPanel,
        loadShadowStyles: deps.loadShadowStyles,
      };
    }

    function ensureToggle() {
      return deps.workspaceWorkflow.ensureToggle(workspaceWorkflowOptions());
    }

    function renderToggle() {
      return deps.workspaceWorkflow.renderToggle(deps.getState(), workspaceWorkflowOptions());
    }

    function toggleLearningMode() {
      return deps.workspaceWorkflow.toggleLearningMode(deps.getState(), workspaceWorkflowOptions());
    }

    function ensureWorkspace() {
      return deps.workspaceWorkflow.ensureWorkspace(deps.getState(), workspaceWorkflowOptions());
    }

    function ensureAudioFilmsRoot() {
      return deps.workspaceWorkflow.ensureAudioFilmsRoot(workspaceWorkflowOptions());
    }

    function installShadowLayerFocus(root) {
      return deps.workspaceWorkflow.installShadowLayerFocus(root, workspaceWorkflowOptions());
    }

    function installShadowScrollGuard(root) {
      return deps.workspaceWorkflow.installShadowScrollGuard(root, workspaceWorkflowOptions());
    }

    function ensureShadowContainer(root) {
      return deps.workspaceWorkflow.ensureShadowContainer(root, workspaceWorkflowOptions());
    }

    function ensureShadowStyles(root) {
      return deps.workspaceWorkflow.ensureShadowStyles(root, workspaceWorkflowOptions());
    }

    function mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel) {
      return deps.workspaceWorkflow.mountWorkspace(deps.getState(), container, dictionaryPanel, ribbonPanel, debugPanel);
    }

    function removeWorkspace() {
      return deps.workspaceWorkflow.removeWorkspace(workspaceWorkflowOptions());
    }

    return {
      ensureToggle,
      renderToggle,
      toggleLearningMode,
      ensureWorkspace,
      ensureAudioFilmsRoot,
      installShadowLayerFocus,
      installShadowScrollGuard,
      ensureShadowContainer,
      ensureShadowStyles,
      mountWorkspace,
      removeWorkspace,
    };
  }

  window.__afShadowingWorkspaceContentWorkflow = {
    createWorkspaceController,
  };
})();
