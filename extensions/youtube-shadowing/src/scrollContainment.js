(function audioFilmsScrollContainment() {
  function installScrollGuard(root, options = {}) {
    const surfaceSelectors = options.surfaceSelectors || [];
    const getComputedStyle = options.getComputedStyle || (() => ({ overflowX: "", overflowY: "" }));
    root.addEventListener("wheel", (event) => containWheelScroll(event, surfaceSelectors, getComputedStyle), {
      capture: true,
      passive: false,
    });
    root.addEventListener("touchmove", (event) => containTouchScroll(event, surfaceSelectors), {
      capture: true,
      passive: false,
    });
  }

  function containWheelScroll(event, surfaceSelectors, getComputedStyle) {
    const path = eventPath(event);
    if (!pathContainsSurface(path, surfaceSelectors)) return false;

    event.stopPropagation();
    const scrollable = firstScrollableElement(path, event.deltaX, event.deltaY, getComputedStyle);
    if (!scrollable || !canScrollElement(scrollable, event.deltaX, event.deltaY)) {
      event.preventDefault();
    }
    return true;
  }

  function containTouchScroll(event, surfaceSelectors) {
    const path = eventPath(event);
    if (!pathContainsSurface(path, surfaceSelectors)) return false;
    event.stopPropagation();
    return true;
  }

  function eventPath(event) {
    return typeof event.composedPath === "function" ? event.composedPath() : [];
  }

  function pathContainsSurface(path, surfaceSelectors) {
    const selector = surfaceSelectors.join(", ");
    if (!selector) return false;
    return path.some((element) => elementMatches(element, selector));
  }

  function firstScrollableElement(path, deltaX, deltaY, getComputedStyle) {
    return path.find((element) => isScrollableInWheelDirection(element, deltaX, deltaY, getComputedStyle)) || null;
  }

  function isScrollableInWheelDirection(element, deltaX, deltaY, getComputedStyle) {
    if (!element || typeof element !== "object") return false;
    const style = getComputedStyle(element);
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal) {
      return /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    }
    return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
  }

  function canScrollElement(element, deltaX, deltaY) {
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal) {
      if (deltaX < 0) return element.scrollLeft > 0;
      if (deltaX > 0) return element.scrollLeft + element.clientWidth < element.scrollWidth;
      return false;
    }
    if (deltaY < 0) return element.scrollTop > 0;
    if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight;
    return false;
  }

  function elementMatches(element, selector) {
    return Boolean(element && typeof element.matches === "function" && element.matches(selector));
  }

  window.__afShadowingScrollContainment = {
    installScrollGuard,
    containWheelScroll,
    containTouchScroll,
    pathContainsSurface,
    firstScrollableElement,
    isScrollableInWheelDirection,
    canScrollElement,
  };
})();
