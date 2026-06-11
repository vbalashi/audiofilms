(function audioFilmsPageBridge() {
  const COMMAND_DATASET_KEY = "afShadowingPageBridgeCommand";
  const RESULT_DATASET_KEY = "afShadowingPageBridgeResult";
  const CLICK_EVENT = "af-shadowing-page-click";

  document.addEventListener(CLICK_EVENT, () => {
    let command = null;
    try {
      command = JSON.parse(document.documentElement.dataset[COMMAND_DATASET_KEY] || "{}");
    } catch (error) {
      writeResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }

    if (command.type !== "click-text" || !Array.isArray(command.needles)) {
      writeResult({ ok: false, error: "Unsupported page bridge command." });
      return;
    }

    const button = findVisibleButtonByText(command.needles);
    if (!button) {
      writeResult({ ok: false, error: "No matching visible button.", needles: command.needles });
      return;
    }

    activateElement(button);
    writeResult({
      ok: true,
      text: visibleText(button).slice(0, 120),
    });
  });

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
})();
