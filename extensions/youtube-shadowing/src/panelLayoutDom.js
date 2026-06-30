(function audioFilmsPanelLayoutDom() {
  const panelLayoutApi = window.__afShadowingPanelLayout;
  const formatUtilsApi = window.__afShadowingFormatUtils;

  function applyPanelLayout(ribbonPanel, dictionaryPanel, options = {}) {
    applyPanelGeometry(ribbonPanel, "phraseRibbon", options);
    if (dictionaryPanel) {
      applyPanelGeometry(dictionaryPanel, "dictionaryPanel", options);
    }
  }

  function applyPanelGeometry(panel, panelKey, options = {}) {
    if (!isHtmlElement(panel)) return;
    const geometryState = panelLayoutApi.panelGeometryState({
      panelKey,
      layout: options.layout,
      overrideGeometry: options.overrideGeometry || null,
      viewport: options.viewport,
    });
    panel.classList.toggle("is-layout-unlocked", geometryState.classes.layoutUnlocked);
    panel.classList.toggle("is-floating", geometryState.classes.floating);
    Object.assign(panel.style, geometryState.style);
    if (geometryState.hasGeometry) {
      clampRenderedPanelToViewport(panel, options.viewport);
    }
  }

  function clampRenderedPanelToViewport(panel, viewport = {}) {
    if (!isHtmlElement(panel)) return;
    const margin = 8;
    const bounds = viewportBounds(viewport);
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nextLeft = formatUtilsApi.clampNumber(rect.left, margin, Math.max(margin, bounds.width - rect.width - margin), margin);
    const nextTop = formatUtilsApi.clampNumber(rect.top, margin, Math.max(margin, bounds.height - rect.height - margin), margin);
    if (Math.abs(nextLeft - rect.left) > 0.5) {
      panel.style.left = `${nextLeft}px`;
    }
    if (Math.abs(nextTop - rect.top) > 0.5) {
      panel.style.top = `${nextTop}px`;
    }
  }

  function applyDebugPanelGeometry(panel, options = {}) {
    if (!isHtmlElement(panel)) return;
    const geometryState = panelLayoutApi.debugPanelGeometryState({
      layout: options.layout,
      overrideGeometry: options.overrideGeometry || null,
      viewport: options.viewport,
    });
    Object.assign(panel.style, geometryState.style);
  }

  function applyDebugPanelLayer(panel, inFront = false) {
    if (!isHtmlElement(panel)) return;
    panel.style.zIndex = inFront ? "1003" : "1000";
  }

  function beginPointerGesture(event, panel, callbacks = {}) {
    if (!isHtmlElement(panel)) return false;
    event.preventDefault();
    event.stopPropagation();
    const ownerDocument = panel.ownerDocument || document;
    const eventNames = panelLayoutApi.pointerEventNames(event.type);
    const onMove = (moveEvent) => {
      callbacks.onMove?.(moveEvent);
    };
    const onUp = () => {
      ownerDocument.removeEventListener(eventNames.move, onMove, true);
      ownerDocument.removeEventListener(eventNames.up, onUp, true);
      ownerDocument.removeEventListener(eventNames.cancel, onUp, true);
      callbacks.onEnd?.();
    };

    ownerDocument.addEventListener(eventNames.move, onMove, true);
    ownerDocument.addEventListener(eventNames.up, onUp, true);
    ownerDocument.addEventListener(eventNames.cancel, onUp, true);
    return true;
  }

  function beginPanelDragGesture(event, panel, options = {}) {
    if (!isHtmlElement(panel)) return false;
    const panelKey = options.panelKey || "";
    const rect = panel.getBoundingClientRect();
    const startGeometry = panelLayoutApi.panelDragStartGeometry({
      panelKey,
      rect,
      layout: options.layout,
    });
    return beginDragGesture(event, panel, {
      ...options,
      startGeometry,
      nextGeometry: (geometry, startPoint, currentPoint) => panelLayoutApi.nextDragGeometry(geometry, startPoint, currentPoint),
    });
  }

  function beginPanelResizeGesture(event, panel, options = {}) {
    if (!isHtmlElement(panel)) return false;
    const panelKey = options.panelKey || "";
    const rect = panel.getBoundingClientRect();
    const startGeometry = panelLayoutApi.panelResizeStartGeometry({ panelKey, rect });
    return beginDragGesture(event, panel, {
      ...options,
      startGeometry,
      nextGeometry: (geometry, startPoint, currentPoint) => panelLayoutApi.nextResizeGeometry(panelKey, geometry, startPoint, currentPoint),
    });
  }

  function beginDebugPanelDragGesture(event, panel, options = {}) {
    if (!isHtmlElement(panel)) return false;
    const rect = panel.getBoundingClientRect();
    const startGeometry = options.clampGeometry?.({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
    return beginDragGesture(event, panel, {
      ...options,
      startGeometry,
      nextGeometry: (geometry, startPoint, currentPoint) => panelLayoutApi.nextDragGeometry(geometry, startPoint, currentPoint),
    });
  }

  function beginDebugPanelResizeGesture(event, panel, options = {}) {
    if (!isHtmlElement(panel)) return false;
    const rect = panel.getBoundingClientRect();
    const startGeometry = options.clampGeometry?.({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
    return beginDragGesture(event, panel, {
      ...options,
      startGeometry,
      nextGeometry: (geometry, startPoint, currentPoint) =>
        panelLayoutApi.nextResizeGeometry("debugPanel", geometry, startPoint, currentPoint),
    });
  }

  function beginDragGesture(event, panel, options = {}) {
    if (!options.startGeometry || typeof options.nextGeometry !== "function") return false;
    const startPoint = { x: event.clientX, y: event.clientY };
    let currentGeometry = options.startGeometry;
    return beginPointerGesture(event, panel, {
      onMove: (moveEvent) => {
        const rawGeometry = options.nextGeometry(
          options.startGeometry,
          startPoint,
          { x: moveEvent.clientX, y: moveEvent.clientY },
        );
        currentGeometry = options.clampGeometry ? options.clampGeometry(rawGeometry) : rawGeometry;
        options.applyGeometry?.(panel, currentGeometry);
      },
      onEnd: () => options.saveGeometry?.(currentGeometry),
    });
  }

  function viewportBounds(viewport = {}) {
    return {
      width: Number.isFinite(viewport.width) ? viewport.width : window.innerWidth,
      height: Number.isFinite(viewport.height) ? viewport.height : window.innerHeight,
    };
  }

  function isHtmlElement(element) {
    if (typeof HTMLElement === "function") return element instanceof HTMLElement;
    return Boolean(element?.classList && element?.style && typeof element.getBoundingClientRect === "function");
  }

  window.__afShadowingPanelLayoutDom = {
    applyPanelLayout,
    applyPanelGeometry,
    clampRenderedPanelToViewport,
    applyDebugPanelGeometry,
    applyDebugPanelLayer,
    beginPointerGesture,
    beginPanelDragGesture,
    beginPanelResizeGesture,
    beginDebugPanelDragGesture,
    beginDebugPanelResizeGesture,
  };
})();
