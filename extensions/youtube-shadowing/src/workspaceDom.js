(function audioFilmsWorkspaceDomModule() {
  function createDictionaryPanel(options = {}) {
    const panel = document.createElement("aside");
    panel.id = options.panelId || "";
    panel.setAttribute("aria-label", "AudioFilms dictionary lookup");
    addCaptureListener(panel, "pointerdown", options.onBringPanelBehind);
    addCaptureListener(panel, "mousedown", options.onBringPanelBehind);

    const header = appendElement(panel, "div", "af-dictionary-header");
    header.dataset.afDragSurface = "dictionaryPanel";
    const dragHandle = appendElement(header, "button", "af-panel-drag-handle");
    dragHandle.type = "button";
    dragHandle.dataset.afDragHandle = "dictionaryPanel";
    dragHandle.textContent = "Move";
    dragHandle.setAttribute("aria-label", "Move dictionary panel");
    const heading = appendElement(header, "div", "af-dictionary-heading");
    const title = appendElement(heading, "div", "af-dictionary-title");
    title.dataset.afDictionaryTitle = "";
    title.textContent = "Dictionary";
    const subtitle = appendElement(heading, "div", "af-dictionary-subtitle");
    subtitle.dataset.afDictionarySubtitle = "";
    subtitle.textContent = "Contextual Lookup";
    const examplesToggle = appendElement(header, "button", "af-dictionary-examples-toggle");
    examplesToggle.type = "button";
    examplesToggle.dataset.afExamplesToggle = "";
    examplesToggle.hidden = true;
    addListener(examplesToggle, "click", options.onToggleExamples);
    const close = appendElement(header, "button", "af-dictionary-close");
    close.type = "button";
    close.innerHTML = `${options.iconSvg?.("close") || ""}<span class="af-sr-only">Close</span>`;
    close.setAttribute("aria-label", "Close dictionary panel");
    addListener(close, "click", options.onClose);
    const body = appendElement(panel, "div", "af-dictionary-body");
    body.dataset.afDictionaryBody = "";
    const resizeHandle = appendElement(panel, "button", "af-panel-resize-handle");
    resizeHandle.type = "button";
    resizeHandle.dataset.afResizeHandle = "dictionaryPanel";
    resizeHandle.setAttribute("aria-label", "Resize dictionary panel");

    return panel;
  }

  function createRibbonPanel(options = {}) {
    const panel = document.createElement("section");
    panel.id = options.panelId || "";
    panel.setAttribute("aria-label", "AudioFilms phrase ribbon");
    addCaptureListener(panel, "pointerdown", options.onBringPanelBehind);
    addCaptureListener(panel, "mousedown", options.onBringPanelBehind);

    const meta = appendElement(panel, "div", "af-ribbon-meta");
    meta.dataset.afDragSurface = "phraseRibbon";
    const dragHandle = appendElement(meta, "button", "af-panel-drag-handle");
    dragHandle.type = "button";
    dragHandle.dataset.afDragHandle = "phraseRibbon";
    dragHandle.textContent = "Move";
    dragHandle.setAttribute("aria-label", "Move phrase ribbon");
    const track = appendElement(meta, "div", "af-source-selector");
    track.dataset.afTrack = "";
    const trackButton = appendButton(track, "Captions: -", "afSourceToggle");
    trackButton.className = "af-source-toggle";
    trackButton.setAttribute("aria-haspopup", "menu");
    const sourceMenu = appendElement(track, "div", "af-source-menu");
    sourceMenu.dataset.afSourceMenu = "";
    const metaRight = appendElement(meta, "div", "af-ribbon-meta-right");
    const jumpWrap = appendElement(metaRight, "div", "af-jump-wrap");
    const count = appendElement(jumpWrap, "button", "af-ribbon-count");
    count.type = "button";
    count.dataset.afCount = "";
    count.setAttribute("aria-haspopup", "dialog");
    count.setAttribute("aria-expanded", "false");
    count.textContent = "0 / 0";
    addListener(count, "click", options.onTogglePhraseJumpMenu);
    const jumpMenu = appendElement(jumpWrap, "div", "af-jump-popover");
    jumpMenu.dataset.afJumpMenu = "";
    const jumpStart = appendButton(jumpMenu, "Start", "afJumpStart");
    jumpStart.className = "af-jump-start";
    const jumpForm = appendElement(jumpMenu, "div", "af-jump-form");
    const jumpInput = appendElement(jumpForm, "input", "af-jump-input");
    jumpInput.type = "number";
    jumpInput.min = "1";
    jumpInput.inputMode = "numeric";
    jumpInput.dataset.afJumpInput = "";
    jumpInput.setAttribute("aria-label", "Phrase number");
    const jumpGo = appendButton(jumpForm, "Go", "afJumpGo");
    const jumpError = appendElement(jumpMenu, "div", "af-jump-error");
    jumpError.dataset.afJumpError = "";
    addListener(jumpStart, "click", options.onJumpStart);
    addListener(jumpGo, "click", options.onSubmitPhraseJump);
    addListener(jumpInput, "input", options.onJumpInput);
    addListener(jumpInput, "keydown", options.onJumpInputKeydown);
    const mode = appendElement(metaRight, "span", "af-ribbon-mode");
    mode.dataset.afMode = "";
    mode.textContent = "Passive";
    const speedControls = appendElement(metaRight, "div", "af-speed-controls");
    const speedLower = appendButton(speedControls, "-", "afSpeedLower");
    speedLower.className = "af-speed-step";
    speedLower.setAttribute("aria-label", "Decrease playback speed");
    speedLower.title = "Decrease playback speed (, or -)";
    const speedLabel = appendElement(speedControls, "span", "af-speed-label");
    speedLabel.dataset.afSpeedLabel = "";
    speedLabel.textContent = "1.00x";
    const speedHigher = appendButton(speedControls, "+", "afSpeedHigher");
    speedHigher.className = "af-speed-step";
    speedHigher.setAttribute("aria-label", "Increase playback speed");
    speedHigher.title = "Increase playback speed (. or +)";
    const themeButton = appendButton(metaRight, "", "afThemeToggle");
    themeButton.className = "af-icon-button af-theme-toggle";
    themeButton.setAttribute("aria-label", "Theme");
    const settings = appendElement(metaRight, "div", "af-utility-menu af-settings-menu");
    const settingsButton = appendButton(settings, "", "afSettingsToggle");
    settingsButton.className = "af-icon-button af-utility-toggle af-settings-toggle";
    settingsButton.innerHTML = `${options.iconSvg?.("settings") || ""}<span class="af-sr-only">Settings</span>`;
    settingsButton.setAttribute("aria-label", "Settings");
    settingsButton.setAttribute("aria-haspopup", "menu");
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.title = "Settings";
    const settingsMenu = appendElement(settings, "div", "af-utility-popover af-settings-popover");
    settingsMenu.dataset.afSettingsMenu = "";
    const help = appendElement(metaRight, "div", "af-help-wrap");
    const helpButton = appendButton(help, "", "afShortcutHelp");
    helpButton.className = "af-icon-button af-help-toggle";
    helpButton.innerHTML = `${options.iconSvg?.("help") || ""}<span class="af-sr-only">Keyboard shortcuts</span>`;
    helpButton.setAttribute("aria-label", "Keyboard shortcuts");
    helpButton.setAttribute("aria-haspopup", "dialog");
    helpButton.setAttribute("aria-expanded", "false");
    helpButton.title = "Keyboard shortcuts (?)";
    const helpPanel = appendElement(help, "section", "af-shortcut-help");
    helpPanel.dataset.afShortcutHelpPanel = "";
    helpPanel.setAttribute("aria-label", "AudioFilms keyboard shortcuts");
    helpPanel.hidden = true;
    appendElement(helpPanel, "div", "af-shortcut-help-title").textContent = "Shortcuts";
    const helpList = appendElement(helpPanel, "dl", "af-shortcut-help-list");
    options.ribbonControlsApi?.shortcutItems().forEach((shortcut) => {
      appendElement(helpList, "dt", "").textContent = shortcut.key;
      appendElement(helpList, "dd", "").textContent = shortcut.label;
    });
    const utility = appendElement(metaRight, "div", "af-utility-menu");
    const utilityButton = appendButton(utility, "", "afUtilityToggle");
    utilityButton.className = "af-icon-button af-utility-toggle";
    utilityButton.innerHTML = `${options.bugIconSvg?.() || ""}<span class="af-sr-only">Debug tools</span>`;
    utilityButton.setAttribute("aria-label", "Debug tools");
    utilityButton.setAttribute("aria-haspopup", "menu");
    utilityButton.setAttribute("aria-expanded", "false");
    utilityButton.title = "Debug tools";
    const utilityMenu = appendElement(utility, "div", "af-utility-popover");
    utilityMenu.dataset.afUtilityMenu = "";
    const displaySection = appendElement(settingsMenu, "div", "af-settings-section");
    for (const group of options.ribbonControlsApi?.settingsControlGroups() || []) {
      appendElement(displaySection, "div", "af-settings-label").textContent = group.label;
      const row = appendElement(displaySection, "div", "af-settings-button-row");
      group.buttons.forEach((button) => appendButton(row, button.label, button.datasetKey));
    }
    const debugSection = appendElement(utilityMenu, "div", "af-settings-section af-debug-actions");
    options.ribbonControlsApi?.debugActionButtons().forEach((button) => appendButton(debugSection, button.label, button.datasetKey));
    options.createAccountControl?.(metaRight);

    const list = appendElement(panel, "div", "af-ribbon-list");
    list.dataset.afRibbonList = "";

    const error = appendElement(panel, "div", "af-ribbon-error");
    error.dataset.afError = "";

    const controls = appendElement(panel, "div", "af-ribbon-controls");
    const modeControls = appendElement(controls, "div", "af-control-group af-mode-controls");
    const shadowButton = appendButton(modeControls, "Shadow", "afModeShadow");
    shadowButton.innerHTML = 'Shadow <span class="af-button-shortcut">1</span>';
    shadowButton.title = "Shadow mode (1)";
    const recallButton = appendButton(modeControls, "Recall", "afModeRecall");
    recallButton.innerHTML = 'Recall <span class="af-button-shortcut">2</span>';
    recallButton.title = "Recall mode (2)";

    const practiceControls = appendElement(controls, "div", "af-control-group af-practice-controls");
    const prevButton = appendButton(practiceControls, "", "afPrev");
    prevButton.classList.add("af-phrase-icon-button");
    prevButton.dataset.afCompactIcon = "←";
    prevButton.innerHTML = `${options.iconSvg?.("prev") || ""}<span class="af-button-label">Previous</span>`;
    prevButton.setAttribute("aria-label", "Previous phrase");
    prevButton.title = "Previous phrase (ArrowLeft)";
    const replayButton = appendButton(practiceControls, "", "afReplay");
    replayButton.classList.add("af-phrase-icon-button");
    replayButton.dataset.afCompactIcon = "↻";
    replayButton.innerHTML = `${options.iconSvg?.("replay") || ""}<span class="af-button-label">Repeat</span>`;
    replayButton.setAttribute("aria-label", "Replay current phrase");
    replayButton.title = "Replay current phrase (ArrowDown)";
    const nextButton = appendButton(practiceControls, "", "afNext");
    nextButton.classList.add("af-phrase-icon-button");
    nextButton.dataset.afCompactIcon = "→";
    nextButton.innerHTML = `${options.iconSvg?.("next") || ""}<span class="af-button-label">Next</span>`;
    nextButton.setAttribute("aria-label", "Next phrase");
    nextButton.title = "Next phrase (ArrowRight)";

    const displayControls = appendElement(controls, "div", "af-control-group af-display-controls");
    const originalButton = appendButton(displayControls, "", "afToggle");
    originalButton.classList.add("af-display-toggle");
    originalButton.title = "Show or hide original text (S)";
    const translationButton = appendButton(displayControls, "", "afPhraseTranslation");
    translationButton.classList.add("af-display-toggle");
    translationButton.title = "Show phrase translation (T or 0)";
    options.createIssueReportDialog?.(panel);
    const resizeHandle = appendElement(panel, "button", "af-panel-resize-handle");
    resizeHandle.type = "button";
    resizeHandle.dataset.afResizeHandle = "phraseRibbon";
    resizeHandle.setAttribute("aria-label", "Resize phrase ribbon width");

    addListener(panel.querySelector("[data-af-prev]"), "click", options.onPreviousPhrase);
    addListener(panel.querySelector("[data-af-replay]"), "click", options.onReplayCurrentPhrase);
    addListener(panel.querySelector("[data-af-toggle]"), "click", options.onToggleText);
    addListener(panel.querySelector("[data-af-next]"), "click", options.onNextPhrase);
    addListener(panel.querySelector("[data-af-mode-shadow]"), "click", options.onSetShadowMode);
    addListener(panel.querySelector("[data-af-mode-recall]"), "click", options.onSetRecallMode);
    addListener(panel.querySelector("[data-af-phrase-translation]"), "click", options.onTogglePhraseTranslation);
    addListener(panel.querySelector("[data-af-source-toggle]"), "click", options.onToggleSourceMenu);
    addListener(panel.querySelector("[data-af-theme-toggle]"), "click", options.onCycleThemePreference);
    addListener(panel.querySelector("[data-af-settings-toggle]"), "click", options.onToggleSettingsMenu);
    addListener(panel.querySelector("[data-af-shortcut-help]"), "click", options.onToggleShortcutHelp);
    addListener(panel.querySelector("[data-af-utility-toggle]"), "click", options.onToggleUtilityMenu);
    addListener(panel.querySelector("[data-af-learner-text-smaller]"), "click", options.onLearnerTextSmaller);
    addListener(panel.querySelector("[data-af-learner-text-reset]"), "click", options.onLearnerTextReset);
    addListener(panel.querySelector("[data-af-learner-text-larger]"), "click", options.onLearnerTextLarger);
    addListener(panel.querySelector("[data-af-transparency-lower]"), "click", options.onTransparencyLower);
    addListener(panel.querySelector("[data-af-transparency-reset]"), "click", options.onTransparencyReset);
    addListener(panel.querySelector("[data-af-transparency-higher]"), "click", options.onTransparencyHigher);
    addListener(panel.querySelector("[data-af-auto-pause-toggle]"), "click", options.onToggleAutoPause);
    addListener(panel.querySelector("[data-af-slow-replay-slower]"), "click", options.onSlowReplaySlower);
    addListener(panel.querySelector("[data-af-slow-replay-faster]"), "click", options.onSlowReplayFaster);
    addListener(panel.querySelector("[data-af-speed-lower]"), "click", options.onSpeedLower);
    addListener(panel.querySelector("[data-af-speed-higher]"), "click", options.onSpeedHigher);
    addListener(panel.querySelector("[data-af-layout-lock-toggle]"), "click", options.onToggleLayoutLock);
    addListener(panel.querySelector("[data-af-layout-reset]"), "click", options.onResetPanelLayout);
    panel.querySelectorAll("[data-af-drag-handle]").forEach((handle) => {
      addListener(handle, "pointerdown", options.onBeginPanelDrag);
      addListener(handle, "mousedown", options.onBeginPanelDrag);
    });
    panel.querySelectorAll("[data-af-drag-surface]").forEach((surface) => {
      addListener(surface, "pointerdown", options.onBeginPanelDrag);
      addListener(surface, "mousedown", options.onBeginPanelDrag);
    });
    panel.querySelectorAll("[data-af-resize-handle]").forEach((handle) => {
      addListener(handle, "pointerdown", options.onBeginPanelResize);
      addListener(handle, "mousedown", options.onBeginPanelResize);
    });
    addListener(panel.querySelector("[data-af-debug-toggle]"), "click", options.onToggleDebug);
    addListener(panel.querySelector("[data-af-debug-copy]"), "click", options.onCopyDebug);
    addListener(panel.querySelector("[data-af-diagnostics-clear]"), "click", options.onClearDiagnostics);
    addListener(panel.querySelector("[data-af-refresh-cache]"), "click", options.onRefreshSelectedSourceCache);
    addListener(panel.querySelector("[data-af-mark-issue]"), "click", options.onOpenIssueReportDialog);
    addListener(panel.querySelector("[data-af-mark-phrase-boundary]"), "click", options.onSubmitPhraseBoundaryIssue);

    return panel;
  }

  function createIssueReportDialog(panel, options = {}) {
    const dialog = appendElement(panel, "section", "af-issue-dialog");
    dialog.dataset.afIssueDialog = "";
    dialog.setAttribute("aria-label", "Report an issue");
    dialog.hidden = true;

    const header = appendElement(dialog, "div", "af-issue-dialog-header");
    appendElement(header, "div", "af-issue-dialog-title").textContent = "Report issue";
    const close = appendElement(header, "button", "af-icon-button af-issue-close");
    close.type = "button";
    close.dataset.afIssueClose = "";
    close.innerHTML = `${options.iconSvg?.("close") || ""}<span class="af-sr-only">Close</span>`;
    close.setAttribute("aria-label", "Close report dialog");

    const categoryLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(categoryLabel, "span", "af-issue-label").textContent = "Category";
    const category = appendElement(categoryLabel, "select", "af-issue-select");
    category.dataset.afIssueCategory = "";
    for (const item of options.categories || []) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      category.appendChild(option);
    }

    const descriptionLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(descriptionLabel, "span", "af-issue-label").textContent = "What went wrong";
    const description = appendElement(descriptionLabel, "textarea", "af-issue-textarea");
    description.dataset.afIssueDescription = "";
    description.rows = 3;
    description.maxLength = 4000;

    const expectedLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(expectedLabel, "span", "af-issue-label").textContent = "Expected behavior";
    const expected = appendElement(expectedLabel, "textarea", "af-issue-textarea");
    expected.dataset.afIssueExpected = "";
    expected.rows = 2;
    expected.maxLength = 4000;

    const consentLabel = appendElement(dialog, "label", "af-issue-consent");
    const consent = document.createElement("input");
    consent.type = "checkbox";
    consent.dataset.afIssueDiagnostics = "";
    consentLabel.appendChild(consent);
    appendElement(consentLabel, "span", "").textContent = "Include current diagnostics";

    const status = appendElement(dialog, "div", "af-issue-status");
    status.dataset.afIssueStatus = "";

    const actions = appendElement(dialog, "div", "af-issue-actions");
    const submit = appendElement(actions, "button", "af-primary-button");
    submit.type = "button";
    submit.dataset.afIssueSubmit = "";
    submit.textContent = "Submit";
    const copy = appendElement(actions, "button", "af-secondary-inline-button");
    copy.type = "button";
    copy.dataset.afIssueCopy = "";
    copy.textContent = "Copy report";

    addListener(close, "click", options.onClose);
    addListener(category, "change", options.onCategoryChange);
    addListener(description, "input", options.onDescriptionInput);
    addListener(expected, "input", options.onExpectedInput);
    addListener(consent, "change", options.onDiagnosticsChange);
    addListener(submit, "click", options.onSubmit);
    addListener(copy, "click", options.onCopy);

    return dialog;
  }

  function createDebugPanel(options = {}) {
    const debugPanel = document.createElement("section");
    debugPanel.className = "af-ribbon-debug-panel";
    debugPanel.dataset.afDebugPanel = "";
    debugPanel.setAttribute("aria-label", "Debug output");
    addCaptureListener(debugPanel, "pointerdown", options.onBringToFront);
    addCaptureListener(debugPanel, "mousedown", options.onBringToFront);

    const debugHeader = appendElement(debugPanel, "div", "af-ribbon-debug-header");
    debugHeader.dataset.afDebugDragSurface = "";
    appendElement(debugHeader, "div", "af-ribbon-debug-title").textContent = "Debug";
    const debugActions = appendElement(debugHeader, "div", "af-ribbon-debug-actions");
    const copy = appendButton(debugActions, "Copy", "afDebugPanelCopy");
    const close = appendButton(debugActions, "Close", "afDebugPanelClose");
    const debug = appendElement(debugPanel, "pre", "af-ribbon-debug");
    debug.dataset.afDebug = "";
    const debugResizeHandle = appendElement(debugPanel, "button", "af-ribbon-debug-resize-handle");
    debugResizeHandle.type = "button";
    debugResizeHandle.dataset.afDebugResizeHandle = "";
    debugResizeHandle.setAttribute("aria-label", "Resize debug panel");

    addListener(copy, "click", options.onCopy);
    addListener(close, "click", options.onClose);
    addListener(debugHeader, "pointerdown", options.onDrag);
    addListener(debugHeader, "mousedown", options.onDrag);
    addListener(debugResizeHandle, "pointerdown", options.onResize);
    addListener(debugResizeHandle, "mousedown", options.onResize);

    return debugPanel;
  }

  function createAccountControl(parent, options = {}) {
    const accountWrap = appendElement(parent, "div", "af-account-wrap");
    const account = appendElement(accountWrap, "button", "af-account-button");
    account.type = "button";
    account.dataset.afAccount = "";
    account.setAttribute("aria-label", "2000NL account");
    account.setAttribute("aria-haspopup", "menu");
    account.setAttribute("aria-expanded", "false");
    const accountMenu = appendElement(accountWrap, "div", "af-account-popover");
    accountMenu.dataset.afAccountMenu = "";
    const accountCopy = appendElement(accountMenu, "div", "af-account-popover-copy");
    accountCopy.dataset.afAccountCopy = "";
    const accountAction = appendButton(accountMenu, "Connect 2000NL", "afAccountAction");
    accountAction.className = "af-account-popover-action";
    addListener(account, "click", options.onToggle);
    addListener(accountAction, "click", options.onAction);
    return accountWrap;
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

  function addListener(element, eventName, listener) {
    if (typeof listener === "function") element.addEventListener(eventName, listener);
  }

  function addCaptureListener(element, eventName, listener) {
    if (typeof listener === "function") element.addEventListener(eventName, listener, true);
  }

  window.__afShadowingWorkspaceDom = {
    appendElement,
    appendButton,
    setDataFlag,
    createDictionaryPanel,
    createRibbonPanel,
    createIssueReportDialog,
    createDebugPanel,
    createAccountControl,
  };
})();
