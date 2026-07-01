(function audioFilmsRibbonPanelDom() {
  function renderRibbonPanel(panel, input = {}, options = {}) {
    const elements = queryRibbonElements(panel);
    if (!elements.panel) return elements;

    const { ribbonState, displayToggleState } = input;
    if (!ribbonState || !displayToggleState) return elements;

    options.renderSourceSelector?.(elements.track, elements.sourceToggle, elements.sourceMenu);
    elements.panel.classList.toggle("is-empty", ribbonState.panelClasses.empty);
    elements.panel.classList.toggle("is-recall", ribbonState.panelClasses.recall);
    elements.controls.classList.toggle("is-hidden", ribbonState.controlsHidden);
    renderCount(elements, ribbonState);
    renderJump(elements, ribbonState, options);
    renderMode(elements, ribbonState);
    options.renderAccountControl?.(elements.account, elements.accountMenu, elements.accountCopy, elements.accountAction);
    renderThemeToggle(elements.themeToggle, input.themePreference, options.iconSvg);
    renderMenus(elements, ribbonState, options);
    renderDisplayControls(elements, ribbonState, displayToggleState, options);
    options.renderDisplayPreferenceControls?.(displayPreferenceElements(elements));
    options.renderPlaybackRateControls?.(playbackRateElements(elements));
    renderUtility(elements, ribbonState);
    options.renderIssueReportDialog?.(elements.issueDialog);
    options.positionIssueReportDialog?.(elements.panel, elements.issueDialog);
    elements.error.textContent = input.errorText || "";
    renderSharedButtonState(elements, ribbonState);
    elements.sourceToggle.dataset.afReadiness = input.readinessState || "";
    return elements;
  }

  function queryRibbonElements(panel) {
    if (!panel?.querySelector) return { panel: null };
    const query = (selector) => panel.querySelector(selector);
    return {
      panel,
      track: query("[data-af-track]"),
      sourceToggle: query("[data-af-source-toggle]"),
      sourceMenu: query("[data-af-source-menu]"),
      count: query("[data-af-count]"),
      jumpMenu: query("[data-af-jump-menu]"),
      jumpInput: query("[data-af-jump-input]"),
      jumpStart: query("[data-af-jump-start]"),
      jumpError: query("[data-af-jump-error]"),
      mode: query("[data-af-mode]"),
      list: query("[data-af-ribbon-list]"),
      error: query("[data-af-error]"),
      controls: query(".af-ribbon-controls"),
      toggle: query("[data-af-toggle]"),
      modeShadow: query("[data-af-mode-shadow]"),
      modeRecall: query("[data-af-mode-recall]"),
      phraseTranslation: query("[data-af-phrase-translation]"),
      speedLower: query("[data-af-speed-lower]"),
      speedHigher: query("[data-af-speed-higher]"),
      speedLabel: query("[data-af-speed-label]"),
      account: query("[data-af-account]"),
      accountMenu: query("[data-af-account-menu]"),
      accountCopy: query("[data-af-account-copy]"),
      accountAction: query("[data-af-account-action]"),
      themeToggle: query("[data-af-theme-toggle]"),
      settingsToggle: query("[data-af-settings-toggle]"),
      settingsMenu: query("[data-af-settings-menu]"),
      helpToggle: query("[data-af-shortcut-help]"),
      helpPanel: query("[data-af-shortcut-help-panel]"),
      utilityToggle: query("[data-af-utility-toggle]"),
      utilityMenu: query("[data-af-utility-menu]"),
      learnerTextSmaller: query("[data-af-learner-text-smaller]"),
      learnerTextReset: query("[data-af-learner-text-reset]"),
      learnerTextLarger: query("[data-af-learner-text-larger]"),
      transparencyLower: query("[data-af-transparency-lower]"),
      transparencyReset: query("[data-af-transparency-reset]"),
      transparencyHigher: query("[data-af-transparency-higher]"),
      autoPauseToggle: query("[data-af-auto-pause-toggle]"),
      slowReplaySlower: query("[data-af-slow-replay-slower]"),
      slowReplaySpeed: query("[data-af-slow-replay-speed]"),
      slowReplayFaster: query("[data-af-slow-replay-faster]"),
      layoutLockToggle: query("[data-af-layout-lock-toggle]"),
      layoutReset: query("[data-af-layout-reset]"),
      debugToggle: query("[data-af-debug-toggle]"),
      debugCopy: query("[data-af-debug-copy]"),
      diagnosticsClear: query("[data-af-diagnostics-clear]"),
      refreshCache: query("[data-af-refresh-cache]"),
      markIssue: query("[data-af-mark-issue]"),
      issueDialog: query("[data-af-issue-dialog]"),
      playbackButtons: [
        query("[data-af-prev]"),
        query("[data-af-replay]"),
        query("[data-af-next]"),
      ].filter(Boolean),
    };
  }

  function renderCount(elements, ribbonState) {
    elements.count.textContent = ribbonState.count.text;
    elements.count.disabled = ribbonState.count.disabled;
    elements.count.setAttribute("aria-expanded", ribbonState.count.expanded ? "true" : "false");
    elements.count.title = ribbonState.count.title;
  }

  function renderJump(elements, ribbonState, options) {
    elements.jumpMenu.classList.toggle("is-open", ribbonState.jump.open);
    options.positionUtilityMenu?.(elements.panel, elements.jumpMenu, ribbonState.jump.open);
    elements.jumpInput.value = ribbonState.jump.inputValue;
    elements.jumpInput.max = ribbonState.jump.max;
    elements.jumpInput.disabled = ribbonState.jump.inputDisabled;
    elements.jumpStart.disabled = ribbonState.jump.startDisabled;
    elements.jumpError.textContent = ribbonState.jump.errorText;
    elements.jumpError.hidden = ribbonState.jump.errorHidden;
  }

  function renderMode(elements, ribbonState) {
    elements.mode.textContent = "";
    elements.mode.hidden = ribbonState.mode.hidden;
    elements.mode.classList.toggle("is-guided", ribbonState.mode.guided);
    elements.modeShadow.classList.toggle("is-active", ribbonState.mode.shadowActive);
    elements.modeRecall.classList.toggle("is-active", ribbonState.mode.recallActive);
    elements.modeRecall.disabled = ribbonState.mode.recallDisabled;
    elements.modeRecall.title = ribbonState.mode.recallTitle;
    elements.modeShadow.setAttribute("aria-pressed", ribbonState.mode.shadowActive ? "true" : "false");
    elements.modeRecall.setAttribute("aria-pressed", ribbonState.mode.recallActive ? "true" : "false");
  }

  function renderThemeToggle(themeToggle, themePreference, iconSvg) {
    const themeLabel = `Theme: ${themePreference}`;
    themeToggle.innerHTML = `${iconSvg("theme")}<span class="af-sr-only">${themeLabel}</span>`;
    themeToggle.setAttribute("aria-label", themeLabel);
    themeToggle.title = themeLabel;
  }

  function renderMenus(elements, ribbonState, options) {
    elements.settingsToggle.setAttribute("aria-expanded", ribbonState.menus.settings.expanded ? "true" : "false");
    elements.settingsToggle.classList.toggle("is-active", ribbonState.menus.settings.active);
    elements.settingsMenu.classList.toggle("is-open", ribbonState.menus.settings.open);
    options.positionUtilityMenu?.(elements.panel, elements.settingsMenu, ribbonState.menus.settings.open);

    elements.helpToggle.setAttribute("aria-expanded", ribbonState.menus.help.expanded ? "true" : "false");
    elements.helpToggle.classList.toggle("is-active", ribbonState.menus.help.active);
    elements.helpPanel.hidden = ribbonState.menus.help.hidden;
    options.positionUtilityMenu?.(elements.panel, elements.helpPanel, ribbonState.menus.help.open);

    elements.utilityToggle.setAttribute("aria-expanded", ribbonState.menus.utility.expanded ? "true" : "false");
    elements.utilityToggle.classList.toggle("is-active", ribbonState.menus.utility.active);
    elements.utilityMenu.classList.toggle("is-open", ribbonState.menus.utility.open);
    options.positionUtilityMenu?.(elements.panel, elements.utilityMenu, ribbonState.menus.utility.open);
  }

  function renderDisplayControls(elements, ribbonState, displayToggleState, options) {
    options.renderDisplayToggleButton?.(elements.toggle, displayToggleState.original);
    elements.toggle.classList.toggle("is-active", displayToggleState.original.active);
    elements.toggle.classList.toggle("is-sticky", displayToggleState.original.sticky);
    elements.toggle.setAttribute("aria-pressed", displayToggleState.original.pressed ? "true" : "false");
    elements.toggle.setAttribute("aria-label", displayToggleState.original.label);
    elements.toggle.title = displayToggleState.original.title;

    options.renderDisplayToggleButton?.(elements.phraseTranslation, displayToggleState.translation);
    elements.phraseTranslation.classList.toggle("is-active", displayToggleState.translation.active);
    elements.phraseTranslation.classList.toggle("is-sticky", displayToggleState.translation.sticky);
    elements.phraseTranslation.hidden = ribbonState.buttons.hidden;
    elements.phraseTranslation.disabled = ribbonState.buttons.disabled;
    elements.phraseTranslation.setAttribute("aria-pressed", displayToggleState.translation.pressed ? "true" : "false");
    elements.phraseTranslation.setAttribute("aria-label", displayToggleState.translation.label);
    elements.phraseTranslation.title = displayToggleState.translation.title;
  }

  function renderUtility(elements, ribbonState) {
    elements.debugToggle.textContent = ribbonState.utility.debugToggleText;
    elements.debugCopy.textContent = ribbonState.utility.debugCopyText;
    elements.diagnosticsClear.textContent = ribbonState.utility.diagnosticsClearText;
    elements.refreshCache.textContent = ribbonState.utility.refreshCacheText;
    elements.markIssue.textContent = ribbonState.utility.markIssueText;
    elements.markIssue.setAttribute("aria-expanded", ribbonState.utility.markIssueExpanded ? "true" : "false");
  }

  function renderSharedButtonState(elements, ribbonState) {
    elements.playbackButtons.forEach((button) => {
      button.hidden = ribbonState.buttons.hidden;
      button.disabled = ribbonState.buttons.disabled;
    });
    [elements.toggle, elements.phraseTranslation].filter(Boolean).forEach((button) => {
      button.hidden = ribbonState.buttons.hidden;
      button.disabled = ribbonState.buttons.disabled;
    });
    elements.refreshCache.disabled = ribbonState.utility.refreshDisabled;
    elements.diagnosticsClear.disabled = ribbonState.utility.diagnosticsClearDisabled;
    elements.markIssue.disabled = ribbonState.utility.markIssueDisabled;
  }

  function displayPreferenceElements(elements) {
    return {
      learnerTextSmaller: elements.learnerTextSmaller,
      learnerTextReset: elements.learnerTextReset,
      learnerTextLarger: elements.learnerTextLarger,
      transparencyLower: elements.transparencyLower,
      transparencyReset: elements.transparencyReset,
      transparencyHigher: elements.transparencyHigher,
      autoPauseToggle: elements.autoPauseToggle,
      slowReplaySlower: elements.slowReplaySlower,
      slowReplaySpeed: elements.slowReplaySpeed,
      slowReplayFaster: elements.slowReplayFaster,
      layoutLockToggle: elements.layoutLockToggle,
      layoutReset: elements.layoutReset,
    };
  }

  function playbackRateElements(elements) {
    return {
      speedLower: elements.speedLower,
      speedHigher: elements.speedHigher,
      speedLabel: elements.speedLabel,
    };
  }

  window.__afShadowingRibbonPanelDom = {
    renderRibbonPanel,
    queryRibbonElements,
  };
})();
