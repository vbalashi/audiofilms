(function audioFilmsDomUtils() {
  function clearElement(element) {
    while (element?.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function isVisibleElement(element, options = {}) {
    if (!element || typeof element !== "object") return false;
    if (element.isConnected === false) return false;
    if (element.hidden || element.getAttribute?.("aria-hidden") === "true") return false;
    const getComputedStyle = options.getComputedStyle || window.getComputedStyle.bind(window);
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return typeof element.getClientRects === "function" && element.getClientRects().length > 0;
  }

  function activateElement(element, options = {}) {
    if (!element || typeof element !== "object") return;
    element.scrollIntoView?.({ block: "center", inline: "nearest" });
    element.focus?.({ preventScroll: true });

    const createEvent = options.createEvent || ((type, eventOptions) => new MouseEvent(type, eventOptions));
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: options.view || window,
    };

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      element.dispatchEvent?.(createEvent(type, eventOptions));
    }

    element.click?.();
  }

  window.__afShadowingDomUtils = {
    clearElement,
    isVisibleElement,
    activateElement,
  };
})();
