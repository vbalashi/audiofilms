(function audioFilmsDictionarySearchDom() {
  const dictionaryPresentationApi = window.__afShadowingDictionaryPresentation;
  const dictionaryDomApi = window.__afShadowingDictionaryDom;

  function renderGroupedSearchPreviews(parent, selectedWord, options = {}) {
    const preview = dictionaryPresentationApi.groupedSearchPreviewState(selectedWord);
    if (preview.state === "hidden") return;

    const container = appendElement(parent, "div", "af-dictionary-search-groups");
    if (renderPreviewMessage(container, preview)) return;

    for (const group of preview.groups) {
      renderDictionarySearchGroup(container, selectedWord, group, options);
    }
  }

  function renderPreviewMessage(container, preview) {
    const messageClass = preview.state === "error" ? "af-source-option-error" : "af-dictionary-copy";
    if (!["loading", "unavailable", "error", "empty"].includes(preview.state)) return false;
    const message = appendElement(container, "p", messageClass);
    message.textContent = preview.message;
    return true;
  }

  function renderDictionarySearchGroup(parent, selectedWord, group, options = {}) {
    const groupState = dictionaryPresentationApi.dictionarySearchGroupState({
      selectedWord,
      group,
      fallbackWord: options.fallbackWord || selectedWord?.word || "",
    });
    const section = appendElement(parent, "section", "af-dictionary-search-group");
    const header = appendElement(section, "div", "af-dictionary-search-group-header");
    const title = appendElement(header, "div", "af-dictionary-search-group-title");
    title.textContent = groupState.title;
    const count = appendElement(header, "div", "af-dictionary-search-count");
    count.textContent = groupState.count;

    const list = appendElement(section, "div", "af-dictionary-search-items");
    groupState.rows.forEach((rowState) => {
      renderDictionarySearchRow(list, selectedWord, group, rowState, options);
    });

    if (groupState.more.visible) {
      const more = appendButton(section, groupState.more.label, groupState.more.datasetKey);
      more.className = "af-dictionary-search-more";
      more.addEventListener("click", () => {
        options.onLoadMore?.(selectedWord, groupState);
      });
    }
  }

  function renderDictionarySearchRow(parent, selectedWord, group, rowState, options = {}) {
    const row = appendElement(parent, "div", "af-dictionary-search-item");
    row.className = "af-dictionary-search-item";
    row.classList.toggle("is-expanded", rowState.expanded);
    row.dataset.afSearchItemKey = rowState.itemKey;
    row.tabIndex = rowState.tabIndex;
    if (rowState.role) {
      row.setAttribute("role", rowState.role);
      row.setAttribute("aria-label", rowState.ariaLabel);
    }
    if (rowState.expanded) {
      renderDictionarySearchExpanded(row, rowState.loadedState, () => {
        options.onToggleItem?.(selectedWord, group, rowState.item, rowState.itemKey);
      }, options);
      return;
    }

    const itemHeader = appendElement(row, "div", "af-dictionary-search-item-header");
    const itemTitle = appendElement(itemHeader, "div", "af-dictionary-search-item-title");
    itemTitle.textContent = rowState.title;
    dictionaryDomApi.renderChipList(itemHeader, rowState.chips, "af-search-chip-list");
    const body = appendElement(row, "div", "af-dictionary-search-item-body");
    if (rowState.text) {
      const copy = appendElement(body, "p", "af-dictionary-search-item-text");
      dictionaryDomApi.renderHighlightedText(copy, rowState.text, rowState.highlight);
    }
    row.addEventListener("click", (event) => {
      if (event.target?.closest?.("button, a")) return;
      options.onToggleItem?.(selectedWord, group, rowState.item, rowState.itemKey);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      options.onToggleItem?.(selectedWord, group, rowState.item, rowState.itemKey);
    });
  }

  function renderDictionarySearchExpanded(parent, loadedState, onCollapse, options = {}) {
    const expanded = appendElement(parent, "div", "af-dictionary-search-expanded");
    if (!loadedState || loadedState.status === "loading") {
      appendElement(expanded, "p", "af-dictionary-copy").textContent = "Loading card...";
      return;
    }
    if (loadedState.status === "error") {
      appendElement(expanded, "p", "af-source-option-error").textContent = loadedState.error || "Card lookup failed.";
      return;
    }
    const cards = dictionaryPresentationApi.focusedDictionarySearchCards(loadedState);
    if (!cards.length) {
      appendElement(expanded, "p", "af-dictionary-copy").textContent = "No full card found.";
      return;
    }
    for (const card of cards) {
      options.renderOverlayCard?.(expanded, card, {
        collapseAction: {
          label: "Collapse card",
          onClick: onCollapse,
        },
      });
    }
  }

  function appendElement(parent, tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function appendButton(parent, text, datasetKey) {
    const button = appendElement(parent, "button", "");
    button.type = "button";
    button.textContent = text;
    if (datasetKey) button.dataset[datasetKey] = "";
    return button;
  }

  window.__afShadowingDictionarySearchDom = {
    renderGroupedSearchPreviews,
    renderDictionarySearchGroup,
    renderDictionarySearchExpanded,
  };
})();
