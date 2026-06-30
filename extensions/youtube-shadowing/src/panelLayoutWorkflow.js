(function audioFilmsPanelLayoutWorkflow() {
  function hasCustomPanelLayout(state, options = {}) {
    return options.panelLayout.hasCustomLayout(state.displayPreferences.layout);
  }

  function toggleLayoutLock(state, event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    options.updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        locked: !preferences.layout.locked,
      },
    }));
    options.render?.();
  }

  function resetPanelLayout(event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    options.updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: options.displayPreferences.defaultPanelLayout(),
    }));
    options.render?.();
  }

  function applyPanelLayout(state, ribbonPanel, dictionaryPanel, options = {}) {
    options.panelLayoutDom.applyPanelLayout(ribbonPanel, dictionaryPanel, {
      layout: state.displayPreferences.layout,
      viewport: options.viewportBounds(),
    });
  }

  function scheduleViewportLayoutClamp(state, options = {}) {
    if (options.getViewportLayoutFrame()) return false;
    const frame = options.requestAnimationFrame(() => {
      options.setViewportLayoutFrame(0);
      applyPanelLayout(state, options.panelElement("phraseRibbon"), options.panelElement("dictionaryPanel"), options);
      const debugPanel = options.debugPanelElement();
      if (debugPanel) {
        applyDebugPanelGeometry(state, debugPanel, null, options);
      }
    });
    options.setViewportLayoutFrame(frame);
    return true;
  }

  function applyPanelGeometry(state, panel, panelKey, overrideGeometry = null, options = {}) {
    options.panelLayoutDom.applyPanelGeometry(panel, panelKey, {
      layout: state.displayPreferences.layout,
      panelKey,
      overrideGeometry,
      viewport: options.viewportBounds(),
    });
  }

  function applyDebugPanelGeometry(state, panel, overrideGeometry = null, options = {}) {
    options.panelLayoutDom.applyDebugPanelGeometry(panel, {
      layout: state.displayPreferences.layout,
      overrideGeometry,
      viewport: options.viewportBounds(),
    });
  }

  function applyDebugPanelLayer(state, panel = null, options = {}) {
    options.panelLayoutDom.applyDebugPanelLayer(panel || options.debugPanelElement(), state.debugPanelInFront);
  }

  function bringDebugPanelToFrontFromEvent(state, event, options = {}) {
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return;
    bringDebugPanelToFront(state, options);
  }

  function handleShadowLayerFocus(state, event, options = {}) {
    const action = options.panelLayout.shadowLayerFocusAction({
      event,
      debugVisible: state.debugVisible,
      debugPanel: options.debugPanelElement(),
      mainPanels: [options.panelElement("phraseRibbon"), options.panelElement("dictionaryPanel")],
      HTMLElement: options.HTMLElement,
    });
    if (action === "debug-front") {
      bringDebugPanelToFront(state, options);
    } else if (action === "debug-behind") {
      bringDebugPanelBehind(state, options);
    }
    return action;
  }

  function bringDebugPanelBehindFromPanel(state, event, options = {}) {
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.some((element) => element instanceof options.Element && element.matches?.("[data-af-debug-panel], [data-af-debug-panel] *"))) {
      return;
    }
    bringDebugPanelBehind(state, options);
  }

  function bringDebugPanelToFront(state, options = {}) {
    if (state.debugPanelInFront) return false;
    state.debugPanelInFront = true;
    const panel = options.debugPanelElement();
    panel?.classList.add("is-front");
    panel?.classList.remove("is-behind");
    applyDebugPanelLayer(state, panel, options);
    return true;
  }

  function bringDebugPanelBehind(state, options = {}) {
    if (!state.debugPanelInFront) return false;
    state.debugPanelInFront = false;
    const panel = options.debugPanelElement();
    panel?.classList.remove("is-front");
    panel?.classList.add("is-behind");
    applyDebugPanelLayer(state, panel, options);
    return true;
  }

  function beginDebugPanelDrag(state, event, options = {}) {
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return false;
    if (isInteractiveDragTarget(event.target, options)) return false;
    const panel = options.debugPanelElement();
    if (!(panel instanceof options.HTMLElement)) return false;

    event.preventDefault();
    event.stopPropagation();
    bringDebugPanelToFront(state, options);
    return options.panelLayoutDom.beginDebugPanelDragGesture(event, panel, {
      clampGeometry: (geometry) => clampDebugPanelGeometry(geometry, options),
      applyGeometry: (_panel, geometry) => applyDebugPanelGeometry(state, panel, geometry, options),
      saveGeometry: (geometry) => saveDebugPanelGeometry(geometry, options),
    });
  }

  function beginDebugPanelResize(state, event, options = {}) {
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return false;
    const panel = options.debugPanelElement();
    if (!(panel instanceof options.HTMLElement)) return false;

    event.preventDefault();
    event.stopPropagation();
    bringDebugPanelToFront(state, options);
    return options.panelLayoutDom.beginDebugPanelResizeGesture(event, panel, {
      clampGeometry: (geometry) => clampDebugPanelGeometry(geometry, options),
      applyGeometry: (_panel, geometry) => applyDebugPanelGeometry(state, panel, geometry, options),
      saveGeometry: (geometry) => saveDebugPanelGeometry(geometry, options),
    });
  }

  function installPanelGestureFallback(state, options = {}) {
    if (options.getPanelGestureFallbackInstalled()) return false;
    options.setPanelGestureFallbackInstalled(true);
    options.document.addEventListener("pointerdown", options.beginPanelGestureFromHost, true);
    options.document.addEventListener("mousedown", options.beginPanelGestureFromHost, true);
    options.window.addEventListener("resize", options.scheduleViewportLayoutClamp);
    return true;
  }

  function beginPanelGestureFromHost(state, event, options = {}) {
    if (state.displayPreferences.layout.locked) return false;
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return false;
    if (event.target !== options.document.getElementById(options.rootId)) return false;

    const gesture = resolvePanelGestureAt(state, event.clientX, event.clientY, options);
    if (!gesture) return false;
    if (gesture.kind === "resize") {
      return beginPanelResize(state, event, gesture.panelKey, options);
    }
    return beginPanelDrag(state, event, gesture.panelKey, { fromSurface: gesture.fromSurface }, options);
  }

  function resolvePanelGestureAt(state, x, y, options = {}) {
    return options.panelLayout.resolvePanelGestureAt({
      x,
      y,
      layout: state.displayPreferences.layout,
      panelElement: options.panelElement,
      HTMLElement: options.HTMLElement,
    });
  }

  function beginPanelDrag(state, event, forcedPanelKey = "", dragOptions = {}, options = {}) {
    const panelKey = forcedPanelKey || event.currentTarget?.dataset?.afDragHandle || event.currentTarget?.dataset?.afDragSurface;
    if (!panelKey || state.displayPreferences.layout.locked) return false;
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return false;
    if ((dragOptions.fromSurface || event.currentTarget?.dataset?.afDragSurface) && isInteractiveDragTarget(event.target, options)) return false;
    const panel = options.panelElement(panelKey);
    if (!(panel instanceof options.HTMLElement)) return false;

    event.preventDefault();
    event.stopPropagation();
    bringPanelToFront(state, panelKey, false, options);
    return options.panelLayoutDom.beginPanelDragGesture(event, panel, {
      panelKey,
      layout: state.displayPreferences.layout,
      clampGeometry: (geometry) => clampPanelGeometry(panelKey, geometry, options),
      applyGeometry: (_panel, geometry) => applyPanelGeometry(state, panel, panelKey, geometry, options),
      saveGeometry: (geometry) => savePanelGeometry(panelKey, geometry, options),
    });
  }

  function isInteractiveDragTarget(target, options = {}) {
    if (!(target instanceof options.Element)) return false;
    return Boolean(target.closest("button:not(.af-panel-drag-handle), a, input, select, textarea"));
  }

  function beginPanelResize(state, event, forcedPanelKey = "", options = {}) {
    const panelKey = forcedPanelKey || event.currentTarget?.dataset?.afResizeHandle;
    if (!panelKey || state.displayPreferences.layout.locked) return false;
    if (!options.panelLayout.isPrimaryPointerEvent(event)) return false;
    const panel = options.panelElement(panelKey);
    if (!(panel instanceof options.HTMLElement)) return false;

    event.preventDefault();
    event.stopPropagation();
    bringPanelToFront(state, panelKey, false, options);
    return options.panelLayoutDom.beginPanelResizeGesture(event, panel, {
      panelKey,
      clampGeometry: (geometry) => clampPanelGeometry(panelKey, geometry, options),
      applyGeometry: (_panel, geometry) => applyPanelGeometry(state, panel, panelKey, geometry, options),
      saveGeometry: (geometry) => savePanelGeometry(panelKey, geometry, options),
    });
  }

  function clampPanelGeometry(panelKey, geometry, options = {}) {
    return options.panelLayout.clampPanelGeometry(panelKey, geometry, options.viewportBounds());
  }

  function clampDebugPanelGeometry(geometry, options = {}) {
    return options.panelLayout.clampDebugPanelGeometry(geometry, options.viewportBounds());
  }

  function savePanelGeometry(panelKey, geometry, options = {}) {
    options.updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        [panelKey]: clampPanelGeometry(panelKey, geometry, options),
        zOrder: panelKey,
      },
    }));
    options.render?.();
  }

  function saveDebugPanelGeometry(geometry, options = {}) {
    options.updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        debugPanel: clampDebugPanelGeometry(geometry, options),
      },
    }));
    options.render?.();
  }

  function bringPanelToFront(state, panelKey, persist = true, options = {}) {
    state.displayPreferences.layout.zOrder = panelKey;
    if (persist) {
      options.updateDisplayPreferences((preferences) => ({
        ...preferences,
        layout: {
          ...preferences.layout,
          zOrder: panelKey,
        },
      }));
    }
  }

  window.__afShadowingPanelLayoutWorkflow = {
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
    savePanelGeometry,
    saveDebugPanelGeometry,
    bringPanelToFront,
  };
})();
