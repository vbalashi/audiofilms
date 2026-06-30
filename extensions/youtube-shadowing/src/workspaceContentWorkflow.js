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

    function loadShadowStyles(root, style) {
      if (style.dataset.afLoaded === "1" || style.dataset.afLoading === "1") return;

      const existingLink = root?.querySelector?.("link[data-af-shadow-style-link]");
      if (existingLink?.dataset.afLoading === "1") return;
      style.dataset.afLoading = "1";
      existingLink?.remove?.();

      const link = deps.document.createElement("link");
      link.dataset.afShadowStyleLink = "";
      link.dataset.afLoading = "1";
      link.rel = "stylesheet";
      link.href = deps.chrome.runtime.getURL("src/shadow.css");
      link.onload = () => {
        delete link.dataset.afLoading;
        link.dataset.afLoaded = "1";
        style.dataset.afLoaded = "1";
        delete style.dataset.afLoading;
        delete style.dataset.afLoadFailed;
      };
      link.onerror = () => {
        delete link.dataset.afLoading;
        delete style.dataset.afLoading;
        style.dataset.afLoadFailed = "1";
        deps.recordDebugEvent?.("shadow-style-load-failed", {
          error: `Unable to load ${link.href}`,
        });
        if (style.dataset.afRetryScheduled !== "1") {
          style.dataset.afRetryScheduled = "1";
          deps.window?.setTimeout?.(() => {
            delete style.dataset.afRetryScheduled;
            loadShadowStyles(root, style);
          }, 1000);
        }
      };
      root?.appendChild?.(link);
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
