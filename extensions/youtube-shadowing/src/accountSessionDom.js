(function audioFilmsAccountSessionDomModule() {
  function renderAccountCard(parent, accountState = {}, options = {}) {
    const card = appendElement(parent, "div", "af-dictionary-card");
    appendElement(card, "div", "af-dictionary-eyebrow").textContent = "Lookup";
    appendElement(card, "div", "af-dictionary-card-title").textContent = "Click a word";
    appendElement(card, "p", "af-dictionary-copy").textContent =
      "Basic lookup should work in guest mode. Sign in later to sync saved words, review grades, and progress with 2000NL.";

    const accountCard = appendElement(parent, "div", "af-dictionary-card af-account-mini-card");
    appendElement(accountCard, "div", "af-account-mini-title").textContent = "2000NL account";
    appendElement(accountCard, "p", "af-dictionary-copy").textContent = accountState.copy || "";
    if (accountState.error) {
      appendElement(accountCard, "p", "af-source-option-error").textContent = accountState.error;
    }
    const action = appendButton(accountCard, "Connect 2000NL", "afSignIn");
    action.className = "af-secondary-button";
    action.textContent = accountState.actionText || "";
    action.disabled = Boolean(accountState.actionDisabled);
    action.addEventListener("click", () => options.onAccountAction?.());
    return accountCard;
  }

  function renderConnectPrompt(parent, promptState = {}, options = {}) {
    const prompt = appendElement(parent, "div", "af-connect-prompt");
    appendElement(prompt, "span").textContent = promptState.copy || "";
    const action = appendButton(prompt, promptState.actionText || "", "afSignIn");
    action.disabled = Boolean(promptState.actionDisabled);
    action.addEventListener("click", () => options.onAccountAction?.());
    return prompt;
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

  window.__afShadowingAccountSessionDom = {
    renderAccountCard,
    renderConnectPrompt,
  };
})();
