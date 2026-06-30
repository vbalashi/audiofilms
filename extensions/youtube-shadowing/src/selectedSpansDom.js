(function audioFilmsSelectedSpansDomModule() {
  function renderSelectedSpanCard(parent, options = {}) {
    const cardState = options.cardState || null;
    const titleState = options.titleState || null;
    if (!cardState || !titleState) return null;
    const card = appendElement(parent, "div", "af-dictionary-card af-span-translation-card");
    renderSelectedSpanTitle(card, titleState, {
      onLookupWord: options.onLookupWord,
    });

    if (cardState.loading) {
      appendElement(card, "p", "af-dictionary-copy").textContent = "Translating selected words...";
      appendElement(card, "div", "af-lookup-skeleton");
    } else if (cardState.error) {
      appendElement(card, "p", "af-source-option-error").textContent = cardState.error;
    } else {
      for (const field of cardState.fields || []) {
        options.renderTranslationField?.(card, field);
      }
    }

    const actions = appendElement(card, "div", "af-span-actions");
    if (cardState.save) {
      const save = appendButton(actions, cardState.save.label, "afSpanSave");
      save.className = "af-primary-button af-span-save-button";
      save.disabled = Boolean(cardState.save.disabled);
      save.addEventListener("click", () => options.onSave?.());
    }
    const clear = appendButton(actions, cardState.clear?.label || "Clear selection", "afSpanClear");
    clear.className = "af-secondary-inline-button af-span-clear-button";
    clear.addEventListener("click", () => options.onClear?.());
    if (cardState.saveFeedback) {
      appendElement(card, "p", cardState.saveFeedback.className).textContent = cardState.saveFeedback.text;
    }
    return card;
  }

  function renderSelectedSpanTitle(parent, titleState = {}, options = {}) {
    const title = appendElement(parent, "div", "af-span-title");
    if (!titleState.tokens?.length) {
      title.textContent = titleState.fallbackText || "";
      return title;
    }
    for (const token of titleState.tokens) {
      const word = appendButton(title, token.text, token.datasetKey);
      word.className = "af-span-title-word af-span-word";
      word.dataset.afLookupWord = token.lookupWord;
      word.dataset.afTokenIndex = token.datasetTokenIndex;
      word.addEventListener("click", () => options.onLookupWord?.(token));
    }
    return title;
  }

  function renderSelectedSpanLookupPrompt(parent) {
    const lookup = appendElement(parent, "div", "af-lookup-placeholder af-span-word-lookup-prompt");
    appendElement(lookup, "div", "af-lookup-placeholder-title").textContent = "Dictionary result";
    appendElement(lookup, "p", "af-dictionary-copy").textContent = "Click a word in the selected phrase.";
    return lookup;
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

  window.__afShadowingSelectedSpansDom = {
    renderSelectedSpanCard,
    renderSelectedSpanTitle,
    renderSelectedSpanLookupPrompt,
  };
})();
