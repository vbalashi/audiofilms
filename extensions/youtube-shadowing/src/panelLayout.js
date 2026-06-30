(function audioFilmsPanelLayout() {
  function panelHasGeometry(geometry) {
    return ["x", "y", "width", "height"].some((key) => geometry?.[key] !== null);
  }

  function hasCustomLayout(layout = {}) {
    return !layout.locked
      || panelHasGeometry(layout.phraseRibbon)
      || panelHasGeometry(layout.dictionaryPanel)
      || panelHasGeometry(layout.debugPanel)
      || layout.zOrder !== "phraseRibbon";
  }

  function panelGestureOrder(layout = {}) {
    return layout.zOrder === "dictionaryPanel"
      ? ["dictionaryPanel", "phraseRibbon"]
      : ["phraseRibbon", "dictionaryPanel"];
  }

  function resolvePanelGestureAt({
    x,
    y,
    layout = {},
    panelElement,
    HTMLElement: HTMLElementClass = window.HTMLElement,
  } = {}) {
    if (typeof panelElement !== "function") return null;
    for (const panelKey of panelGestureOrder(layout)) {
      const panel = panelElement(panelKey);
      if (!isElementLike(panel, HTMLElementClass) || !rectContainsPoint(panel.getBoundingClientRect(), x, y)) continue;

      const resizeHandle = panel.querySelector?.("[data-af-resize-handle]");
      if (isElementLike(resizeHandle, HTMLElementClass) && rectContainsPoint(resizeHandle.getBoundingClientRect(), x, y)) {
        return { kind: "resize", panelKey };
      }

      const dragHandle = panel.querySelector?.("[data-af-drag-handle]");
      if (isElementLike(dragHandle, HTMLElementClass) && rectContainsPoint(dragHandle.getBoundingClientRect(), x, y)) {
        return { kind: "drag", panelKey, fromSurface: false };
      }

      const dragSurface = panel.querySelector?.("[data-af-drag-surface]");
      if (isElementLike(dragSurface, HTMLElementClass) && rectContainsPoint(dragSurface.getBoundingClientRect(), x, y)) {
        const interactive = Array.from(dragSurface.querySelectorAll?.("button:not(.af-panel-drag-handle), a, input, select, textarea") || []);
        if (interactive.some((element) => rectContainsPoint(element.getBoundingClientRect(), x, y))) return null;
        return { kind: "drag", panelKey, fromSurface: true };
      }
    }

    return null;
  }

  function shadowLayerFocusAction({
    event,
    debugVisible,
    debugPanel,
    mainPanels = [],
    HTMLElement: HTMLElementClass = window.HTMLElement,
  } = {}) {
    if (!isPrimaryPointerEvent(event) || !debugVisible) return "";
    if (!isElementLike(debugPanel, HTMLElementClass)) return "";

    const x = event.clientX;
    const y = event.clientY;
    if (rectContainsPoint(debugPanel.getBoundingClientRect(), x, y)) {
      return "debug-front";
    }

    const clickedMainPanel = mainPanels.some((panel) => (
      isElementLike(panel, HTMLElementClass) && rectContainsPoint(panel.getBoundingClientRect(), x, y)
    ));
    return clickedMainPanel ? "debug-behind" : "";
  }

  function clampPanelGeometry(panelKey, geometry, viewport) {
    const bounds = viewportBounds(viewport);
    const margin = 8;
    const minWidth = panelKey === "phraseRibbon"
      ? Math.min(360, bounds.width - margin * 2)
      : Math.min(320, bounds.width - margin * 2);
    const minHeight = panelKey === "dictionaryPanel" ? 220 : null;
    const maxWidth = panelKey === "dictionaryPanel"
      ? Math.min(640, Math.max(minWidth, bounds.width - margin * 2))
      : Math.max(minWidth, bounds.width - margin * 2);
    const width = geometry?.width === null
      ? null
      : clampNumber(geometry?.width, minWidth, maxWidth, minWidth);
    const height = panelKey === "phraseRibbon" || geometry?.height === null
      ? null
      : clampNumber(geometry?.height, minHeight, Math.max(minHeight, bounds.height - margin * 2), minHeight);
    const maxX = bounds.width - (width || minWidth) - margin;
    const maxY = bounds.height - (height || minHeight || 80) - margin;

    return {
      x: geometry?.x === null ? null : clampNumber(geometry?.x, margin, Math.max(margin, maxX), margin),
      y: geometry?.y === null ? null : clampNumber(geometry?.y, margin, Math.max(margin, maxY), margin),
      width,
      height,
    };
  }

  function clampDebugPanelGeometry(geometry, viewport) {
    const bounds = viewportBounds(viewport);
    const margin = 8;
    const minWidth = Math.min(320, bounds.width - margin * 2);
    const minHeight = Math.min(220, bounds.height - margin * 2);
    const maxWidth = Math.max(minWidth, bounds.width - margin * 2);
    const maxHeight = Math.max(minHeight, bounds.height - margin * 2);
    const fallbackWidth = Math.min(560, maxWidth);
    const fallbackHeight = Math.min(460, maxHeight);
    const width = geometry?.width === null
      ? null
      : clampNumber(geometry?.width, minWidth, maxWidth, fallbackWidth);
    const height = geometry?.height === null
      ? null
      : clampNumber(geometry?.height, minHeight, maxHeight, fallbackHeight);
    const maxX = bounds.width - (width || fallbackWidth) - margin;
    const maxY = bounds.height - (height || fallbackHeight) - margin;

    return {
      x: geometry?.x === null ? null : clampNumber(geometry?.x, margin, Math.max(margin, maxX), margin),
      y: geometry?.y === null ? null : clampNumber(geometry?.y, margin, Math.max(margin, maxY), margin),
      width,
      height,
    };
  }

  function rectContainsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function pointerEventNames(eventType) {
    const mouse = eventType === "mousedown";
    return {
      move: mouse ? "mousemove" : "pointermove",
      up: mouse ? "mouseup" : "pointerup",
      cancel: mouse ? "mouseup" : "pointercancel",
    };
  }

  function isPrimaryPointerEvent(event = {}) {
    return event.type !== "mousedown" || event.button === 0;
  }

  function panelDragStartGeometry({ panelKey = "", rect = {}, layout = {} } = {}) {
    return {
      x: rect.left,
      y: rect.top,
      width: panelKey === "dictionaryPanel" && !panelHasGeometry(layout.dictionaryPanel)
        ? Math.min(rect.width, 520)
        : rect.width,
      height: panelKey === "phraseRibbon" ? null : rect.height,
    };
  }

  function panelResizeStartGeometry({ panelKey = "", rect = {} } = {}) {
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: panelKey === "phraseRibbon" ? null : rect.height,
    };
  }

  function nextDragGeometry(startGeometry, startPoint, currentPoint) {
    return {
      ...startGeometry,
      x: startGeometry.x + currentPoint.x - startPoint.x,
      y: startGeometry.y + currentPoint.y - startPoint.y,
    };
  }

  function nextResizeGeometry(panelKey, startGeometry, startPoint, currentPoint) {
    return {
      ...startGeometry,
      width: startGeometry.width + currentPoint.x - startPoint.x,
      height: panelKey === "phraseRibbon" ? null : startGeometry.height + currentPoint.y - startPoint.y,
    };
  }

  function panelGeometryState({
    panelKey = "",
    layout = {},
    overrideGeometry = null,
    viewport = {},
  } = {}) {
    const geometry = clampPanelGeometry(panelKey, overrideGeometry || layout[panelKey], viewport);
    const hasGeometry = panelHasGeometry(geometry);
    return {
      geometry,
      hasGeometry,
      classes: {
        layoutUnlocked: !layout.locked,
        floating: hasGeometry,
      },
      style: hasGeometry
        ? {
            left: geometry.x === null ? "" : `${geometry.x}px`,
            top: geometry.y === null ? "" : `${geometry.y}px`,
            width: geometry.width === null ? "" : `${geometry.width}px`,
            height: panelKey === "phraseRibbon" || geometry.height === null ? "" : `${geometry.height}px`,
            zIndex: layout.zOrder === panelKey ? "1002" : "1001",
          }
        : {
            left: "",
            top: "",
            width: "",
            height: "",
            zIndex: layout.zOrder === panelKey ? "1002" : "1001",
          },
    };
  }

  function debugPanelGeometryState({
    layout = {},
    overrideGeometry = null,
    viewport = {},
  } = {}) {
    const geometry = clampDebugPanelGeometry(overrideGeometry || layout.debugPanel, viewport);
    const hasGeometry = panelHasGeometry(geometry);
    return {
      geometry,
      hasGeometry,
      style: hasGeometry
        ? {
            left: `${geometry.x}px`,
            top: `${geometry.y}px`,
            right: "auto",
            bottom: "auto",
            width: `${geometry.width}px`,
            height: `${geometry.height}px`,
          }
        : {
            left: "",
            top: "",
            right: "",
            bottom: "",
            width: "",
            height: "",
          },
    };
  }

  function viewportBounds(viewport = {}) {
    return {
      width: Number.isFinite(viewport.width) ? viewport.width : 1024,
      height: Number.isFinite(viewport.height) ? viewport.height : 768,
    };
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function isElementLike(element, ElementClass) {
    return ElementClass ? element instanceof ElementClass : Boolean(element?.getBoundingClientRect);
  }

  window.__afShadowingPanelLayout = {
    panelHasGeometry,
    hasCustomLayout,
    panelGestureOrder,
    resolvePanelGestureAt,
    shadowLayerFocusAction,
    clampPanelGeometry,
    clampDebugPanelGeometry,
    rectContainsPoint,
    pointerEventNames,
    isPrimaryPointerEvent,
    panelDragStartGeometry,
    panelResizeStartGeometry,
    nextDragGeometry,
    nextResizeGeometry,
    panelGeometryState,
    debugPanelGeometryState,
  };
})();
