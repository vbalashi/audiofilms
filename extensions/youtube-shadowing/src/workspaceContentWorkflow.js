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
        createDictionaryPanel,
        createDebugPanel: deps.createDebugPanel,
        loadShadowStyles,
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

    async function loadShadowStyles(_root, style) {
      if (style.dataset.afLoaded === "1") return;
      style.dataset.afLoaded = "1";

      try {
        const response = await deps.fetch(deps.chrome.runtime.getURL("src/shadow.css"));
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const css = await response.text();
        style.textContent = css
          .replace(/html\.af-shadowing-workspace/g, ":host")
          .replace(/#audiofilms-root/g, ":host");
      } catch (error) {
        deps.recordDebugEvent?.("shadow-style-load-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    function createDictionaryPanel() {
      return deps.workspaceDom.createDictionaryPanel({
        panelId: deps.dictionaryPanelId,
        iconSvg: deps.iconSvg,
        onBringPanelBehind: deps.onBringDictionaryPanelBehind,
        onToggleExamples: deps.onToggleExamples,
        onClose: () => {
          const state = deps.getState();
          state.selectedWord = null;
          state.selectedSpan = null;
          deps.render?.();
        },
      });
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
