(function audioFilmsSurfaceRuntimeContentFacade() {
  function createSurfaceRuntimeController() {
    let controllers = null;

    function bindControllers(nextControllers = {}) {
      controllers = nextControllers;
      return api;
    }

    function controller(name) {
      const value = controllers?.[name];
      if (!value) {
        throw new Error(`Surface runtime controller used before binding: ${name}`);
      }
      return value;
    }

    const api = {
      bindControllers,
      ensureToggle: () => controller("workspaceController").ensureToggle(),
      renderToggle: () => controller("workspaceController").renderToggle(),
      toggleLearningMode: () => controller("workspaceController").toggleLearningMode(),
      ensureWorkspace: () => controller("workspaceController").ensureWorkspace(),
      ensureAudioFilmsRoot: () => controller("workspaceController").ensureAudioFilmsRoot(),
      installShadowLayerFocus: (root) => controller("workspaceController").installShadowLayerFocus(root),
      installShadowScrollGuard: (root) => controller("workspaceController").installShadowScrollGuard(root),
      ensureShadowContainer: (root) => controller("workspaceController").ensureShadowContainer(root),
      ensureShadowStyles: (root) => controller("workspaceController").ensureShadowStyles(root),
      mountWorkspace: (container, dictionaryPanel, ribbonPanel, debugPanel) =>
        controller("workspaceController").mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel),
      removeWorkspace: () => controller("workspaceController").removeWorkspace(),

      createRibbonPanel: () => controller("ribbonPanelController").createRibbonPanel(),
      createIssueReportDialog: (panel) => controller("ribbonPanelController").createIssueReportDialog(panel),
      createAccountControl: (parent) => controller("ribbonPanelController").createAccountControl(parent),

      hasCustomPanelLayout: () => controller("panelLayoutController").hasCustomPanelLayout(),
      toggleLayoutLock: (event) => controller("panelLayoutController").toggleLayoutLock(event),
      resetPanelLayout: (event) => controller("panelLayoutController").resetPanelLayout(event),
      applyPanelLayout: (ribbonPanel, dictionaryPanel) =>
        controller("panelLayoutController").applyPanelLayout(ribbonPanel, dictionaryPanel),
      scheduleViewportLayoutClamp: () => controller("panelLayoutController").scheduleViewportLayoutClamp(),
      applyPanelGeometry: (panel, panelKey, overrideGeometry = null) =>
        controller("panelLayoutController").applyPanelGeometry(panel, panelKey, overrideGeometry),
      applyDebugPanelGeometry: (panel, overrideGeometry = null) =>
        controller("panelLayoutController").applyDebugPanelGeometry(panel, overrideGeometry),
      applyDebugPanelLayer: (panel = api.debugPanelElement()) =>
        controller("panelLayoutController").applyDebugPanelLayer(panel),
      bringDebugPanelToFrontFromEvent: (event) =>
        controller("panelLayoutController").bringDebugPanelToFrontFromEvent(event),
      handleShadowLayerFocus: (event) => controller("panelLayoutController").handleShadowLayerFocus(event),
      bringDebugPanelBehindFromPanel: (event) =>
        controller("panelLayoutController").bringDebugPanelBehindFromPanel(event),
      bringDebugPanelToFront: () => controller("panelLayoutController").bringDebugPanelToFront(),
      bringDebugPanelBehind: () => controller("panelLayoutController").bringDebugPanelBehind(),
      beginDebugPanelDrag: (event) => controller("panelLayoutController").beginDebugPanelDrag(event),
      beginDebugPanelResize: (event) => controller("panelLayoutController").beginDebugPanelResize(event),
      installPanelGestureFallback: () => controller("panelLayoutController").installPanelGestureFallback(),
      beginPanelGestureFromHost: (event) => controller("panelLayoutController").beginPanelGestureFromHost(event),
      resolvePanelGestureAt: (x, y) => controller("panelLayoutController").resolvePanelGestureAt(x, y),
      beginPanelDrag: (event, forcedPanelKey = "", options = {}) =>
        controller("panelLayoutController").beginPanelDrag(event, forcedPanelKey, options),
      isInteractiveDragTarget: (target) => controller("panelLayoutController").isInteractiveDragTarget(target),
      beginPanelResize: (event, forcedPanelKey = "") =>
        controller("panelLayoutController").beginPanelResize(event, forcedPanelKey),
      clampPanelGeometry: (panelKey, geometry) =>
        controller("panelLayoutController").clampPanelGeometry(panelKey, geometry),
      clampDebugPanelGeometry: (geometry) => controller("panelLayoutController").clampDebugPanelGeometry(geometry),
      viewportBounds: () => controller("panelLayoutController").viewportBounds(),
      savePanelGeometry: (panelKey, geometry) => controller("panelLayoutController").savePanelGeometry(panelKey, geometry),
      saveDebugPanelGeometry: (geometry) => controller("panelLayoutController").saveDebugPanelGeometry(geometry),
      bringPanelToFront: (panelKey, persist = true) =>
        controller("panelLayoutController").bringPanelToFront(panelKey, persist),
      panelElement: (panelKey) => controller("panelLayoutController").panelElement(panelKey),
      debugPanelElement: () => controller("panelLayoutController").debugPanelElement(),

      toggleUtilityMenu: (event) => controller("displayStateController").toggleUtilityMenu(event),
      toggleSettingsMenu: (event) => controller("displayStateController").toggleSettingsMenu(event),
      toggleShortcutHelp: (event) => controller("displayStateController").toggleShortcutHelp(event),
      toggleAccountMenu: (event) => controller("displayStateController").toggleAccountMenu(event),
      cycleThemePreference: (event) => controller("displayStateController").cycleThemePreference(event),
      adjustLearnerTextScale: (delta) => controller("displayStateController").adjustLearnerTextScale(delta),
      resetLearnerTextScale: () => controller("displayStateController").resetLearnerTextScale(),
      adjustPanelBackgroundAlpha: (delta) => controller("displayStateController").adjustPanelBackgroundAlpha(delta),
      resetPanelBackgroundAlpha: () => controller("displayStateController").resetPanelBackgroundAlpha(),
      adjustSlowReplaySpeed: (delta) => controller("displayStateController").adjustSlowReplaySpeed(delta),
      adjustVideoPlaybackRate: (delta) => controller("displayStateController").adjustVideoPlaybackRate(delta),
      setVideoPlaybackRate: (rate, reason = "playback-rate") =>
        controller("displayStateController").setVideoPlaybackRate(rate, reason),
      applyThemeAttributes: () => controller("displayStateController").applyThemeAttributes(),
      toggleAllExamples: (event) => controller("displayStateController").toggleAllExamples(event),
      toggleCardExpanded: (cardId) => controller("displayStateController").toggleCardExpanded(cardId),
      cardExpanded: (cardId) => controller("displayStateController").cardExpanded(cardId),
      closeOpenMenus: () => controller("displayStateController").closeOpenMenus(),
      focusMenuTrigger: (trigger) => controller("displayStateController").focusMenuTrigger(trigger),
      onDocumentPointerDown: (event) => controller("displayStateController").onDocumentPointerDown(event),

      toggleDebug: () => controller("diagnosticsController").toggleDebug(),
      closeDebug: () => controller("diagnosticsController").closeDebug(),
      copyDebug: () => controller("diagnosticsController").copyDebug(),
      clearDiagnostics: () => controller("diagnosticsController").clearDiagnostics(),
      formatDebugState: () => controller("diagnosticsController").formatDebugState(),
      getPlaybackSnapshot: () => controller("diagnosticsController").getPlaybackSnapshot(),
      formatIssueReport: (options = {}) => controller("diagnosticsController").formatIssueReport(options),

      renderSourceSelector: (track, sourceToggle, sourceMenu) =>
        controller("ribbonContentController").renderSourceSelector(track, sourceToggle, sourceMenu),
      appendPhraseRow: (parent, phrase, index) =>
        controller("ribbonContentController").appendPhraseRow(parent, phrase, index),
    };

    return api;
  }

  window.__afShadowingSurfaceRuntimeContentFacade = {
    createSurfaceRuntimeController,
  };
})();
