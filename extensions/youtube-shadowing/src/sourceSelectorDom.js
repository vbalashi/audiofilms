(function audioFilmsSourceSelectorDomModule() {
  function renderSourceToggle(track, sourceToggle, sourceMenu, toggleState = {}, options = {}) {
    options.clearElement(sourceToggle);
    const dot = appendElement(sourceToggle, "span", "af-source-status-dot");
    dot.setAttribute("aria-hidden", "true");
    const text = appendElement(sourceToggle, "span", "af-source-toggle-label");
    text.textContent = toggleState.label;
    sourceToggle.disabled = toggleState.disabled;
    sourceToggle.setAttribute("aria-expanded", toggleState.expanded ? "true" : "false");
    sourceToggle.dataset.afReadiness = toggleState.readinessState;
    track.classList.toggle("is-open", toggleState.open);

    options.clearElement(sourceMenu);
    return Boolean(toggleState.open);
  }

  function renderReadinessPopover(sourceMenu, input = {}) {
    const readiness = input.readiness || {};
    const popoverState = input.popoverState || {};
    const summary = appendElement(sourceMenu, "div", "af-readiness-summary");
    appendElement(summary, "div", "af-readiness-title").textContent = readiness.label || "";
    appendElement(summary, "div", "af-readiness-copy").textContent = input.readinessCopy || "";

    const actions = appendElement(sourceMenu, "div", "af-readiness-actions");
    const getCaptions = appendButton(actions, popoverState.actions?.getCaptions?.text || "Get Captions", "afReadinessGetCaptions");
    getCaptions.disabled = Boolean(popoverState.actions?.getCaptions?.disabled);
    addActionListener(getCaptions, input.onGetCaptions);
    const improveTiming = appendButton(actions, popoverState.actions?.improveTiming?.text || "Improve Timing", "afReadinessImproveTiming");
    improveTiming.disabled = Boolean(popoverState.actions?.improveTiming?.disabled);
    improveTiming.title = popoverState.actions?.improveTiming?.title || "";
    addActionListener(improveTiming, input.onImproveTiming);
    appendElement(sourceMenu, "div", "af-readiness-action-help").textContent = popoverState.actionHelp || "";
    if (popoverState.operation?.visible) {
      const status = appendElement(sourceMenu, "div", "af-readiness-operation");
      status.dataset.afTimingOperationStatus = popoverState.operation.status || "";
      status.textContent = popoverState.operation.copy || "";
    }

    if (popoverState.showSourceSelector) {
      appendElement(sourceMenu, "div", "af-source-group").textContent = "Text Source";
      renderSourceOptions(sourceMenu, input.sourceOptionGroups || [], input.onSelectSource);
    }

    const diagnostics = appendElement(sourceMenu, "details", "af-readiness-details");
    diagnostics.open = Boolean(popoverState.details?.open);
    appendElement(diagnostics, "summary", "af-readiness-details-summary").textContent = popoverState.details?.summary || "Details";
    const details = appendElement(diagnostics, "div", "af-readiness-detail-grid");
    for (const detail of popoverState.details?.rows || []) {
      appendReadinessDetail(details, detail.label, detail.value);
    }
  }

  function renderSourceOptions(sourceMenu, groups = [], onSelectSource) {
    for (const group of groups) {
      appendElement(sourceMenu, "div", "af-source-group").textContent = group.label;

      for (const optionState of group.options || []) {
        const option = appendElement(sourceMenu, "button", "af-source-option");
        option.type = "button";
        option.dataset.afSourceId = optionState.sourceId;
        option.classList.toggle("is-selected", optionState.selected);
        option.textContent = optionState.label;
        option.addEventListener("click", () => onSelectSource(optionState.sourceId));

        if (optionState.warningText) {
          appendElement(sourceMenu, "div", optionState.warningClass).textContent = optionState.warningText;
        }
      }
    }
  }

  function appendReadinessDetail(parent, label, value) {
    const row = appendElement(parent, "div", "af-readiness-detail");
    appendElement(row, "span", "af-readiness-detail-key").textContent = label;
    appendElement(row, "span", "af-readiness-detail-value").textContent = value;
  }

  function appendElement(parent, tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function appendButton(parent, text, datasetKey) {
    const button = appendElement(parent, "button");
    button.type = "button";
    button.textContent = text;
    setDataFlag(button, datasetKey);
    return button;
  }

  function setDataFlag(element, datasetKey) {
    if (/^[a-z][a-zA-Z0-9]*$/.test(datasetKey)) {
      element.dataset[datasetKey] = "";
      return;
    }
    const attributeName = datasetKey
      .replace(/([A-Z])/g, "-$1")
      .replace(/^-/, "")
      .toLowerCase();
    element.setAttribute(`data-${attributeName}`, "");
  }

  function addActionListener(button, action) {
    if (typeof action !== "function") return;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      action(event);
    });
  }

  window.__afShadowingSourceSelectorDom = {
    renderSourceToggle,
    renderReadinessPopover,
    renderSourceOptions,
  };
})();
