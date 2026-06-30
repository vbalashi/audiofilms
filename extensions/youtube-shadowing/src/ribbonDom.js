(function audioFilmsRibbonDomModule() {
  function renderDisplayToggleButton(button, options = {}) {
    if (!(button instanceof HTMLElement)) return;
    button.innerHTML = options.html || "";
  }

  function renderDisplayPreferenceControls(controls = {}, controlState = {}, options = {}) {
    if (!controlState.learnerText || !controlState.panelBackground || !controlState.autoPause) return;
    controls.learnerTextSmaller.disabled = controlState.learnerText.smallerDisabled;
    controls.learnerTextLarger.disabled = controlState.learnerText.largerDisabled;
    controls.learnerTextReset.disabled = controlState.learnerText.resetDisabled;
    controls.learnerTextSmaller.title = controlState.learnerText.smallerTitle;
    controls.learnerTextLarger.title = controlState.learnerText.largerTitle;
    controls.learnerTextReset.title = controlState.learnerText.resetTitle;

    controls.transparencyLower.disabled = controlState.panelBackground.lowerDisabled;
    controls.transparencyHigher.disabled = controlState.panelBackground.higherDisabled;
    controls.transparencyReset.disabled = controlState.panelBackground.resetDisabled;
    controls.transparencyLower.title = controlState.panelBackground.lowerTitle;
    controls.transparencyHigher.title = controlState.panelBackground.higherTitle;
    controls.transparencyReset.title = controlState.panelBackground.resetTitle;

    controls.autoPauseToggle.textContent = controlState.autoPause.text;
    controls.autoPauseToggle.classList.toggle("is-active", controlState.autoPause.active);
    controls.autoPauseToggle.setAttribute("aria-pressed", controlState.autoPause.active ? "true" : "false");
    controls.autoPauseToggle.title = controlState.autoPause.title;

    controls.slowReplaySpeed.textContent = options.formatPlaybackRate(controlState.slowReplay.speed);
    controls.slowReplaySpeed.title = controlState.slowReplay.speedTitle;
    controls.slowReplaySlower.disabled = controlState.slowReplay.slowerDisabled;
    controls.slowReplayFaster.disabled = controlState.slowReplay.fasterDisabled;
    controls.slowReplaySlower.title = controlState.slowReplay.slowerTitle;
    controls.slowReplayFaster.title = controlState.slowReplay.fasterTitle;

    controls.layoutLockToggle.textContent = controlState.layout.lockText;
    controls.layoutLockToggle.title = controlState.layout.lockTitle;
    controls.layoutReset.disabled = controlState.layout.resetDisabled;
    controls.layoutReset.title = controlState.layout.resetTitle;
  }

  function renderPlaybackRateControls(controls = {}, controlState = {}) {
    controls.speedLabel.textContent = controlState.label;
    controls.speedLabel.title = controlState.title;
    controls.speedLower.disabled = controlState.lowerDisabled;
    controls.speedHigher.disabled = controlState.higherDisabled;
    controls.speedLower.title = controlState.lowerTitle;
    controls.speedHigher.title = controlState.higherTitle;
  }

  function positionUtilityMenu(panel, utilityMenu, isOpen, requestAnimationFrame = window.requestAnimationFrame) {
    if (!(utilityMenu instanceof HTMLElement)) return;
    if (!isOpen) {
      utilityMenu.classList.remove("is-below");
      utilityMenu.classList.remove("is-above");
      return;
    }

    requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const menuHeight = utilityMenu.getBoundingClientRect().height || utilityMenu.scrollHeight || 0;
      const shouldPlaceBelow = panelRect.top < menuHeight + 12;
      utilityMenu.classList.toggle("is-below", shouldPlaceBelow);
      utilityMenu.classList.toggle("is-above", !shouldPlaceBelow);
    });
  }

  function positionIssueReportDialog(panel, issueDialog, isOpen, requestAnimationFrame = window.requestAnimationFrame) {
    if (!(issueDialog instanceof HTMLElement) || !isOpen) return;
    requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const dialogHeight = issueDialog.getBoundingClientRect().height || issueDialog.scrollHeight || 0;
      issueDialog.classList.toggle("is-below", panelRect.top < dialogHeight + 12);
    });
  }

  function renderAccountControl(elements = {}, accountState = {}, options = {}) {
    const { account, accountMenu, accountCopy, accountAction } = elements;
    if (!account || !accountMenu || !accountCopy || !accountAction) return;
    options.clearElement(account);
    account.insertAdjacentHTML("beforeend", options.iconSvg(accountState.icon));
    const accountText = appendElement(account, "span", "af-sr-only");
    accountText.textContent = accountState.srText;
    account.classList.toggle("is-connected", accountState.connected);
    account.setAttribute("aria-label", accountState.ariaLabel);
    account.setAttribute("aria-expanded", accountState.expanded ? "true" : "false");
    account.title = accountState.title;
    accountMenu.classList.toggle("is-open", accountState.menuOpen);
    accountCopy.textContent = accountState.copy;
    accountAction.textContent = accountState.actionText;
    accountAction.disabled = accountState.actionDisabled;
  }

  function appendElement(parent, tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  window.__afShadowingRibbonDom = {
    renderDisplayToggleButton,
    renderDisplayPreferenceControls,
    renderPlaybackRateControls,
    positionUtilityMenu,
    positionIssueReportDialog,
    renderAccountControl,
  };
})();
