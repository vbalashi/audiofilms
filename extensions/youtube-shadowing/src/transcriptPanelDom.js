(function audioFilmsTranscriptPanelDom() {
  function resetTranscriptPanelState({
    document,
    previousVideoId = "",
    currentVideoId = "",
    closeOpenTranscriptPanels,
  } = {}) {
    document.documentElement.dataset.afTranscriptVideoId = "";
    Array.from(document.querySelectorAll("[data-af-current]")).forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (previousVideoId && previousVideoId !== currentVideoId) {
      closeOpenTranscriptPanels();
    }
  }

  function closeOpenTranscriptPanels({ document, domUtils }) {
    const closeButtons = Array.from(document.querySelectorAll("button[aria-label*='Close transcript'], button[aria-label*='Sluiten']"));
    const button = closeButtons.find((candidate) => domUtils.isVisibleElement(candidate));
    if (button instanceof HTMLElement) {
      domUtils.activateElement(button);
      return true;
    }
    return false;
  }

  function markCurrentTranscriptSegment({ document, phrase } = {}) {
    const segmentIndex = phrase?.cues?.[0]?.segmentIndex;
    const segmentSelector = phrase?.cues?.[0]?.segmentSelector;
    const selector = segmentSelector === "modern"
      ? "transcript-segment-view-model"
      : "ytd-transcript-segment-renderer";
    const segments = Array.from(document.querySelectorAll(selector));

    segments.forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (typeof segmentIndex !== "number") return false;

    const segment = segments[segmentIndex];
    if (!segment) return false;

    segment.dataset.afCurrent = "true";
    segment.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  window.__afShadowingTranscriptPanelDom = {
    resetTranscriptPanelState,
    closeOpenTranscriptPanels,
    markCurrentTranscriptSegment,
  };
})();
