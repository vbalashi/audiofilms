(function audioFilmsPageBridge() {
  const COMMAND_DATASET_KEY = "afShadowingPageBridgeCommand";
  const RESULT_DATASET_KEY = "afShadowingPageBridgeResult";
  const ENABLED_DATASET_KEY = "afShadowingPageBridgeEnabled";
  const CLICK_EVENT = "af-shadowing-page-click";

  document.addEventListener(CLICK_EVENT, () => {
    if (document.documentElement.dataset[ENABLED_DATASET_KEY] !== "1") {
      return;
    }

    let command = null;
    try {
      command = JSON.parse(document.documentElement.dataset[COMMAND_DATASET_KEY] || "{}");
    } catch (error) {
      writeResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
      clearCommand();
      return;
    }

    if (!validCommand(command)) {
      writeResult({ ok: false, error: "Unsupported page bridge command." });
      clearCommand();
      return;
    }

    const button = findVisibleButtonByText(command.needles);
    if (!button) {
      writeResult({ ok: false, error: "No matching visible button.", needles: command.needles });
      clearCommand();
      return;
    }

    activateElement(button);
    writeResult({
      ok: true,
      id: command.id,
      text: visibleText(button).slice(0, 120),
    });
    clearCommand();
  });

  function validCommand(command) {
    return command?.source === "audiofilms-content-script" &&
      typeof command.id === "string" &&
      /^af_page_bridge_[a-z0-9_-]+$/i.test(command.id) &&
      command.type === "click-text" &&
      Array.isArray(command.needles) &&
      command.needles.length > 0 &&
      command.needles.length <= 5 &&
      command.needles.every((needle) => {
        const text = String(needle || "");
        return text.length > 0 && text.length <= 80;
      });
  }

  function findVisibleButtonByText(needles) {
    const normalizedNeedles = needles.map((needle) => String(needle || "").toLowerCase()).filter(Boolean);
    const buttons = Array.from(document.querySelectorAll("button, yt-button-shape button, tp-yt-paper-button"));

    return buttons.find((button) => {
      if (!isVisibleElement(button)) return false;
      const label = visibleText(button).toLowerCase();
      return normalizedNeedles.some((needle) => label.includes(needle));
    }) || null;
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.isConnected) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
  }

  function visibleText(element) {
    return `${element?.textContent || ""} ${element?.getAttribute?.("aria-label") || ""}`
      .replace(/\s+/g, " ")
      .trim();
  }

  function activateElement(element) {
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    }
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      element.dispatchEvent(new MouseEvent(type, eventOptions));
    }

    if (typeof element.click === "function") {
      element.click();
    }
  }

  function writeResult(result) {
    document.documentElement.dataset[RESULT_DATASET_KEY] = JSON.stringify({
      ...result,
      at: new Date().toISOString(),
    });
  }

  function clearCommand() {
    delete document.documentElement.dataset[COMMAND_DATASET_KEY];
    delete document.documentElement.dataset[ENABLED_DATASET_KEY];
  }
})();
