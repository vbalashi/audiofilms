(function audioFilmsKeyboardShortcuts() {
  function isSpaceKey(event) {
    return event.code === "Space" || event.key === " " || event.key === "Spacebar";
  }

  function isSpeedDecreaseKey(event) {
    return event.code === "Comma" || event.code === "Minus" || event.code === "NumpadSubtract";
  }

  function isSpeedIncreaseKey(event) {
    return event.code === "Period" || event.code === "Equal" || event.code === "NumpadAdd";
  }

  function isTranslationKey(event) {
    return event.code === "KeyT" || event.code === "Digit0" || event.code === "Numpad0";
  }

  function isShortcutHelpKey(event) {
    return event.code === "Slash" && event.shiftKey;
  }

  function allowsShiftShortcut(event) {
    return event.code === "KeyS"
      || event.code === "KeyT"
      || event.code === "ArrowDown"
      || isSpeedDecreaseKey(event)
      || isSpeedIncreaseKey(event);
  }

  function blockYouTubeShortcut(event, options = {}) {
    event.preventDefault();
    event.stopPropagation();
    if (options.immediate) {
      event.stopImmediatePropagation();
    }
  }

  function shouldIgnoreKeyEvent(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return true;
    if (event.shiftKey && !allowsShiftShortcut(event) && !isShortcutHelpKey(event)) return true;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.some((element) => isKeyboardInputElement(element))) return true;
    return isKeyboardInputElement(event.target);
  }

  function isKeyboardInputElement(target) {
    if (!target || typeof target !== "object") return false;
    const tagName = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
    return tagName === "input" || tagName === "textarea" || target.isContentEditable === true;
  }

  window.__afShadowingKeyboardShortcuts = {
    isSpaceKey,
    isSpeedDecreaseKey,
    isSpeedIncreaseKey,
    isTranslationKey,
    isShortcutHelpKey,
    allowsShiftShortcut,
    blockYouTubeShortcut,
    shouldIgnoreKeyEvent,
    isKeyboardInputElement,
  };
})();
