(function audioFilmsPanelLayoutContentWorkflow() {
  function createPanelLayoutController(deps = {}) {
    function panelLayoutWorkflowOptions() {
      return {
        panelLayout: deps.panelLayout,
        panelLayoutDom: deps.panelLayoutDom,
        displayPreferences: deps.displayPreferences,
        HTMLElement: deps.HTMLElement,
        Element: deps.Element,
        document: deps.document,
        window: deps.window,
        rootId: deps.rootId,
        getPanelGestureFallbackInstalled: deps.getPanelGestureFallbackInstalled,
        setPanelGestureFallbackInstalled: deps.setPanelGestureFallbackInstalled,
        getViewportLayoutFrame: deps.getViewportLayoutFrame,
        setViewportLayoutFrame: deps.setViewportLayoutFrame,
        requestAnimationFrame: deps.window.requestAnimationFrame.bind(deps.window),
        beginPanelGestureFromHost,
        scheduleViewportLayoutClamp,
        viewportBounds,
        panelElement,
        debugPanelElement,
        updateDisplayPreferences: deps.updateDisplayPreferences,
        render: deps.render,
      };
    }

    function hasCustomPanelLayout() {
      return deps.panelLayoutWorkflow.hasCustomPanelLayout(deps.getState(), panelLayoutWorkflowOptions());
    }

    function toggleLayoutLock(event) {
      return deps.panelLayoutWorkflow.toggleLayoutLock(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function resetPanelLayout(event) {
      return deps.panelLayoutWorkflow.resetPanelLayout(event, panelLayoutWorkflowOptions());
    }

    function applyPanelLayout(ribbonPanel, dictionaryPanel) {
      return deps.panelLayoutWorkflow.applyPanelLayout(deps.getState(), ribbonPanel, dictionaryPanel, panelLayoutWorkflowOptions());
    }

    function scheduleViewportLayoutClamp() {
      return deps.panelLayoutWorkflow.scheduleViewportLayoutClamp(deps.getState(), panelLayoutWorkflowOptions());
    }

    function applyPanelGeometry(panel, panelKey, overrideGeometry = null) {
      return deps.panelLayoutWorkflow.applyPanelGeometry(deps.getState(), panel, panelKey, overrideGeometry, panelLayoutWorkflowOptions());
    }

    function applyDebugPanelGeometry(panel, overrideGeometry = null) {
      return deps.panelLayoutWorkflow.applyDebugPanelGeometry(deps.getState(), panel, overrideGeometry, panelLayoutWorkflowOptions());
    }

    function applyDebugPanelLayer(panel = debugPanelElement()) {
      return deps.panelLayoutWorkflow.applyDebugPanelLayer(deps.getState(), panel, panelLayoutWorkflowOptions());
    }

    function bringDebugPanelToFrontFromEvent(event) {
      return deps.panelLayoutWorkflow.bringDebugPanelToFrontFromEvent(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function handleShadowLayerFocus(event) {
      return deps.panelLayoutWorkflow.handleShadowLayerFocus(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function bringDebugPanelBehindFromPanel(event) {
      return deps.panelLayoutWorkflow.bringDebugPanelBehindFromPanel(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function bringDebugPanelToFront() {
      return deps.panelLayoutWorkflow.bringDebugPanelToFront(deps.getState(), panelLayoutWorkflowOptions());
    }

    function bringDebugPanelBehind() {
      return deps.panelLayoutWorkflow.bringDebugPanelBehind(deps.getState(), panelLayoutWorkflowOptions());
    }

    function beginDebugPanelDrag(event) {
      return deps.panelLayoutWorkflow.beginDebugPanelDrag(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function beginDebugPanelResize(event) {
      return deps.panelLayoutWorkflow.beginDebugPanelResize(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function installPanelGestureFallback() {
      return deps.panelLayoutWorkflow.installPanelGestureFallback(deps.getState(), panelLayoutWorkflowOptions());
    }

    function beginPanelGestureFromHost(event) {
      return deps.panelLayoutWorkflow.beginPanelGestureFromHost(deps.getState(), event, panelLayoutWorkflowOptions());
    }

    function resolvePanelGestureAt(x, y) {
      return deps.panelLayoutWorkflow.resolvePanelGestureAt(deps.getState(), x, y, panelLayoutWorkflowOptions());
    }

    function beginPanelDrag(event, forcedPanelKey = "", options = {}) {
      return deps.panelLayoutWorkflow.beginPanelDrag(deps.getState(), event, forcedPanelKey, options, panelLayoutWorkflowOptions());
    }

    function isInteractiveDragTarget(target) {
      return deps.panelLayoutWorkflow.isInteractiveDragTarget(target, panelLayoutWorkflowOptions());
    }

    function beginPanelResize(event, forcedPanelKey = "") {
      return deps.panelLayoutWorkflow.beginPanelResize(deps.getState(), event, forcedPanelKey, panelLayoutWorkflowOptions());
    }

    function clampPanelGeometry(panelKey, geometry) {
      return deps.panelLayoutWorkflow.clampPanelGeometry(panelKey, geometry, panelLayoutWorkflowOptions());
    }

    function clampDebugPanelGeometry(geometry) {
      return deps.panelLayoutWorkflow.clampDebugPanelGeometry(geometry, panelLayoutWorkflowOptions());
    }

    function viewportBounds() {
      return { width: deps.window.innerWidth, height: deps.window.innerHeight };
    }

    function savePanelGeometry(panelKey, geometry) {
      return deps.panelLayoutWorkflow.savePanelGeometry(panelKey, geometry, panelLayoutWorkflowOptions());
    }

    function saveDebugPanelGeometry(geometry) {
      return deps.panelLayoutWorkflow.saveDebugPanelGeometry(geometry, panelLayoutWorkflowOptions());
    }

    function bringPanelToFront(panelKey, persist = true) {
      return deps.panelLayoutWorkflow.bringPanelToFront(deps.getState(), panelKey, persist, panelLayoutWorkflowOptions());
    }

    function panelElement(panelKey) {
      const root = deps.document.getElementById(deps.rootId)?.shadowRoot;
      const id = panelKey === "dictionaryPanel" ? deps.dictionaryPanelId : deps.ribbonPanelId;
      return root?.getElementById(id) || null;
    }

    function debugPanelElement() {
      const root = deps.document.getElementById(deps.rootId)?.shadowRoot;
      return root?.querySelector("[data-af-debug-panel]") || null;
    }

    return {
      hasCustomPanelLayout,
      toggleLayoutLock,
      resetPanelLayout,
      applyPanelLayout,
      scheduleViewportLayoutClamp,
      applyPanelGeometry,
      applyDebugPanelGeometry,
      applyDebugPanelLayer,
      bringDebugPanelToFrontFromEvent,
      handleShadowLayerFocus,
      bringDebugPanelBehindFromPanel,
      bringDebugPanelToFront,
      bringDebugPanelBehind,
      beginDebugPanelDrag,
      beginDebugPanelResize,
      installPanelGestureFallback,
      beginPanelGestureFromHost,
      resolvePanelGestureAt,
      beginPanelDrag,
      isInteractiveDragTarget,
      beginPanelResize,
      clampPanelGeometry,
      clampDebugPanelGeometry,
      viewportBounds,
      savePanelGeometry,
      saveDebugPanelGeometry,
      bringPanelToFront,
      panelElement,
      debugPanelElement,
    };
  }

  window.__afShadowingPanelLayoutContentWorkflow = {
    createPanelLayoutController,
  };
})();
