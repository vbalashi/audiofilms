(function audioFilmsDictionaryDomModule() {
  const dictionaryPresentationApi = window.__afShadowingDictionaryPresentation;

  function renderDictionaryPanelShell(panel, options = {}) {
    const title = panel.querySelector("[data-af-dictionary-title]");
    const subtitle = panel.querySelector("[data-af-dictionary-subtitle]");
    const examplesToggle = panel.querySelector("[data-af-examples-toggle]");
    const body = panel.querySelector("[data-af-dictionary-body]");
    const panelState = options.panelState || {};
    const headerCopy = options.headerCopy || {};

    panel.classList.toggle("is-span-selected", Boolean(panelState.spanSelected));
    title.textContent = headerCopy.title || "";
    subtitle.textContent = headerCopy.subtitle || "";
    subtitle.hidden = !headerCopy.subtitle;
    examplesToggle.hidden = Boolean(panelState.examplesToggle?.hidden);
    if (!panelState.examplesToggle?.hidden) {
      examplesToggle.innerHTML = `${options.iconSvg(panelState.examplesToggle.icon)}<span class="af-sr-only">${panelState.examplesToggle.label}</span>`;
      examplesToggle.setAttribute("aria-label", panelState.examplesToggle.label);
      examplesToggle.setAttribute("aria-pressed", panelState.examplesToggle.pressed ? "true" : "false");
      examplesToggle.title = panelState.examplesToggle.title;
    }

    options.clearElement(body);
    body.dataset.afLookupWord = panelState.lookupWord || "";
    return body;
  }

  function renderTranslationField(parent, field = {}) {
    const element = appendElement(parent, "div", "af-translation-field");
    if (field.tone) element.classList.add(field.tone);
    const caption = appendElement(element, "div", "af-translation-label");
    appendElement(caption, "span", "af-translation-dot");
    const labelText = appendElement(caption, "span", "af-translation-label-text");
    labelText.textContent = field.label || "";
    const text = appendElement(element, "p", field.className || "");
    text.textContent = field.value || "";
    return element;
  }

  function renderHighlightedText(parent, text, highlight) {
    parent.textContent = "";
    for (const part of dictionaryPresentationApi.highlightedTextParts(text, highlight)) {
      if (part.highlight) {
        const mark = appendElement(parent, "strong", "af-dictionary-search-highlight");
        mark.textContent = part.text;
      } else {
        parent.append(document.createTextNode(part.text));
      }
    }
  }

  function renderChipList(parent, chips, className = "af-chip-list") {
    if (!Array.isArray(chips) || !chips.length) return null;
    const list = appendElement(parent, "div", className);
    for (const chip of chips) {
      const item = appendElement(list, "span", `af-chip ${dictionaryPresentationApi.chipClassName(chip)}`);
      item.textContent = chip?.label || chip || "";
      if (chip?.title) item.title = chip.title;
    }
    return list;
  }

  function renderOverlaySections(parent, options = {}) {
    const sections = Array.isArray(options.sections) ? options.sections : [];
    const visibleSections = sections
      .filter((section) => section?.text)
      .filter((section, index) => index > 0 || section.kind !== "meaning");
    if (!visibleSections.length) return null;

    const expanded = Boolean(options.expanded);
    const collapsedSections = dictionaryPresentationApi.collapsedOverlaySections(visibleSections);
    const renderedSections = expanded ? visibleSections : collapsedSections;
    const hiddenCount = Math.max(0, visibleSections.length - renderedSections.length);
    const details = appendElement(parent, "div", "af-overlay-details");
    details.classList.toggle("is-open", expanded);
    details.classList.toggle("has-leading-context", renderedSections[0]?.kind === "context");
    const content = appendElement(details, "div", "af-overlay-details-content");
    for (const section of renderedSections) {
      renderOverlaySection(content, section, sections, options);
    }
    if (hiddenCount > 0 || expanded) {
      const toggle = appendElement(details, "button", "af-overlay-expand-toggle");
      toggle.type = "button";
      toggle.innerHTML = expanded
        ? `<span>Show less</span>${options.iconSvg?.("collapse") || ""}`
        : `<span>Show ${hiddenCount} ${hiddenCount === 1 ? "detail" : "details"}</span>${options.iconSvg?.("expand") || ""}`;
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.addEventListener("click", () => options.onToggleExpanded?.());
    }
    return details;
  }

  function renderCardHeaderActionButtons(parent, states = {}, actions = {}) {
    const headerActions = appendElement(parent, "div", "af-overlay-card-actions");
    if (states.translation) {
      const translateButton = appendButton(headerActions, "", states.translation.datasetKey);
      translateButton.className = "af-card-translate";
      translateButton.disabled = states.translation.disabled;
      translateButton.innerHTML = `${actions.iconSvg?.("translate") || ""}<span class="af-sr-only">${states.translation.srText}</span>`;
      translateButton.classList.toggle("is-pending", states.translation.pending);
      translateButton.title = states.translation.title;
      translateButton.setAttribute("aria-label", states.translation.label);
      translateButton.setAttribute("aria-pressed", states.translation.pressed ? "true" : "false");
      translateButton.addEventListener("click", () => actions.onTranslation?.(states.translation.action));
    }
    if (states.menu) {
      const menuButton = appendButton(headerActions, "", states.menu.datasetKey);
      menuButton.className = "af-card-menu-button";
      menuButton.innerHTML = `${actions.iconSvg?.("more") || ""}<span class="af-sr-only">${states.menu.label}</span>`;
      menuButton.title = states.menu.title;
      menuButton.setAttribute("aria-label", states.menu.label);
      menuButton.setAttribute("aria-expanded", states.menu.expanded ? "true" : "false");
      menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        actions.onMenu?.(states.menu.cardId);
      });
    }
    if (states.collapse) {
      const collapseButton = appendButton(headerActions, "", states.collapse.datasetKey);
      collapseButton.className = "af-card-collapse";
      collapseButton.innerHTML = `${actions.iconSvg?.("collapse") || ""}<span class="af-sr-only">${states.collapse.label}</span>`;
      collapseButton.title = states.collapse.title;
      collapseButton.setAttribute("aria-label", states.collapse.label);
      collapseButton.addEventListener("click", () => actions.onCollapse?.());
    }
    if (!headerActions.childElementCount) {
      headerActions.remove();
    }
    return headerActions;
  }

  function renderOverlayCardTitle(parent, options = {}) {
    options.clearElement?.(parent);
    const card = options.card || {};
    const titleText = appendElement(parent, "span", "af-overlay-card-title-text");
    const titleLine = appendElement(titleText, "span", "af-overlay-card-title-line");
    if (card.article) {
      appendElement(titleLine, "span", "af-overlay-card-article").textContent = card.article;
    }
    appendElement(titleLine, "span", "af-overlay-card-headword").textContent = options.title || "";
    if (options.audioButtonState) {
      const audioButton = appendButton(titleLine, "", options.audioButtonState.datasetKey);
      audioButton.className = "af-headword-audio";
      audioButton.classList.toggle("is-pending", options.audioButtonState.pending);
      audioButton.innerHTML = `${options.iconSvg?.("audio") || ""}<span class="af-sr-only">${options.audioButtonState.srText}</span>`;
      audioButton.disabled = options.audioButtonState.disabled;
      audioButton.title = options.audioButtonState.title;
      audioButton.setAttribute("aria-label", options.audioButtonState.label);
      audioButton.addEventListener("click", (event) => {
        event.stopPropagation();
        options.onAudio?.();
      });
    }
    return titleLine;
  }

  function renderOverlayCard(parent, options = {}) {
    const card = options.card || {};
    const entry = appendElement(parent, "div", "af-overlay-card");
    entry.classList.add(`is-phase-${card?.progress?.phase || "guest"}`);
    if (options.generated) {
      entry.classList.add("is-generated-draft");
    }
    if (options.feedbackStatus) {
      entry.classList.add(`is-action-${options.feedbackStatus}`);
    }

    const header = appendElement(entry, "div", "af-overlay-card-header");
    const titleWrap = appendElement(header, "div", "af-overlay-title-wrap");
    const title = appendElement(titleWrap, "div", "af-overlay-card-title");
    options.renderTitle?.(title, card);
    renderChipList(titleWrap, options.chips);
    if (options.headwordTranslation) {
      appendElement(titleWrap, "div", "af-overlay-headword-translation").textContent = options.headwordTranslation;
    }
    renderCardHeaderActionButtons(header, options.headerActions, options.headerActionHandlers);
    options.renderMenu?.(entry, card);

    if (options.summaryDefinition) {
      renderTranslatedLine(
        entry,
        "p",
        "af-dictionary-copy af-overlay-definition",
        options.summaryDefinition,
        options.definitionTranslation || "",
      );
    }
    options.renderSections?.(entry, card);
    renderChipList(entry, options.personalChips, "af-personal-chips");
    options.renderReviewActions?.(entry, card);
    return entry;
  }

  function createLookupPlaceholder(parent) {
    const lookup = appendElement(parent, "div", "af-lookup-placeholder");
    return {
      lookup,
      title: appendElement(lookup, "div", "af-lookup-placeholder-title"),
      copy: appendElement(lookup, "p", "af-dictionary-copy"),
    };
  }

  function renderLookupStatus(lookupElements, lookupState = {}) {
    lookupElements.title.textContent = lookupState.title || "";
    lookupElements.copy.textContent = lookupState.copy || "";
  }

  function renderLookupLoading(lookupElements, lookupState = {}) {
    lookupElements.lookup.classList.add("is-loading");
    renderLookupStatus(lookupElements, lookupState);
    appendElement(lookupElements.lookup, "div", "af-lookup-skeleton");
  }

  function renderLookupError(lookupElements, lookupState = {}, options = {}) {
    lookupElements.lookup.classList.add("is-error");
    renderLookupStatus(lookupElements, lookupState);
    const retry = appendButton(lookupElements.lookup, "Retry lookup", "afLookupRetry");
    retry.className = "af-lookup-retry";
    retry.addEventListener("click", () => options.onRetry?.());
    if (options.translateUrl) {
      const link = appendElement(lookupElements.lookup, "a", "af-dictionary-link");
      link.href = options.translateUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open translation fallback";
    }
  }

  function renderLookupDefinitions(lookupElements, lookupState = {}, options = {}) {
    renderLookupStatus(lookupElements, lookupState);
    const definitions = lookupState.definitions?.length
      ? lookupState.definitions
      : [lookupState.result?.definition].filter(Boolean);
    for (const definition of definitions) {
      appendElement(lookupElements.lookup, "p", "af-dictionary-copy").textContent = definition;
    }
    renderLookupMessages(lookupElements.lookup, options);
  }

  function renderDictionaryLookup(parent, options = {}) {
    const lookupElements = createLookupPlaceholder(parent);
    const selectedWord = options.selectedWord || {};
    const lookupState = options.lookupState || {};

    if (lookupState.state === "idle") {
      renderLookupStatus(lookupElements, lookupState);
      return lookupElements.lookup;
    }

    if (lookupState.state === "loading") {
      renderLookupLoading(lookupElements, lookupState);
      return lookupElements.lookup;
    }

    if (lookupState.state === "error") {
      renderLookupError(lookupElements, lookupState, {
        translateUrl: selectedWord.translateUrl,
        onRetry: options.onRetry,
      });
      return lookupElements.lookup;
    }

    if (lookupState.state === "cards") {
      renderLookupStatus(lookupElements, lookupState);
      for (const card of lookupState.cards) {
        options.renderCard?.(lookupElements.lookup, card);
      }
      renderLookupMessages(lookupElements.lookup, {
        status: selectedWord.cardActionStatus,
        error: selectedWord.cardActionError,
        warning: selectedWord.lookupResult?.meta?.warning,
      });
      options.renderGroupedSearchPreviews?.(lookupElements.lookup, selectedWord);
      return lookupElements.lookup;
    }

    if (lookupState.state === "generated-fallback") {
      lookupElements.lookup.classList.add("is-empty", "is-card-only");
      lookupElements.title.remove();
      lookupElements.copy.remove();
      options.renderGeneratedFallback?.(lookupElements.lookup, selectedWord);
      options.renderGroupedSearchPreviews?.(lookupElements.lookup, selectedWord);
      return lookupElements.lookup;
    }

    renderLookupDefinitions(lookupElements, lookupState, {
      warning: selectedWord.lookupResult?.meta?.warning,
    });
    options.renderGroupedSearchPreviews?.(lookupElements.lookup, selectedWord);
    return lookupElements.lookup;
  }

  function renderLookupMessages(parent, options = {}) {
    if (options.status) {
      appendElement(parent, "p", "af-dictionary-copy af-card-action-status").textContent = options.status;
    }
    if (options.error) {
      appendElement(parent, "p", "af-source-option-error").textContent = options.error;
    }
    if (options.warning) {
      appendElement(parent, "p", "af-source-option-error").textContent = options.warning;
    }
  }

  function renderGeneratedFallback(parent, fallbackState = {}, options = {}) {
    if (fallbackState.state === "card") {
      options.renderCard?.(parent, fallbackState.draftCard);
      renderLookupMessages(parent, {
        status: fallbackState.saving ? "Saving..." : "",
        error: fallbackState.error || "",
      });
      return null;
    }

    const fallback = appendElement(parent, "div", "af-generated-fallback-card");
    if (fallbackState.state === "connect") {
      appendElement(fallback, "p", "af-dictionary-copy").textContent = fallbackState.copy || "";
      options.renderConnectPrompt?.(fallback);
      return fallback;
    }
    if (fallbackState.state === "loading") {
      appendElement(fallback, "p", "af-dictionary-copy").textContent = fallbackState.copy || "";
      appendElement(fallback, "div", "af-lookup-skeleton");
      return fallback;
    }
    if (fallbackState.state === "unrenderable") {
      appendElement(fallback, "p", "af-dictionary-copy").textContent = fallbackState.copy || "";
    } else if (fallbackState.state === "generate") {
      const generate = appendButton(fallback, "Generate learner card", "afGeneratedDraft");
      generate.className = "af-lookup-retry";
      generate.addEventListener("click", () => options.onGenerate?.());
    }
    if (fallbackState.error) {
      appendElement(fallback, "p", "af-source-option-error").textContent = fallbackState.error;
    }
    return fallback;
  }

  function renderCardActionMenu(parent, options = {}) {
    const menu = appendElement(parent, "div", "af-card-action-menu");
    menu.setAttribute("role", "menu");
    const wrongTranslation = appendButton(menu, "Inaccurate translation", "afCardReportWrongTranslation");
    wrongTranslation.setAttribute("role", "menuitem");
    wrongTranslation.addEventListener("click", () => options.onWrongTranslation?.());
    const translationOk = appendButton(menu, "Translation looks right", "afCardTranslationOk");
    translationOk.setAttribute("role", "menuitem");
    translationOk.addEventListener("click", () => options.onTranslationOk?.());
    const dictionaryIssue = appendButton(menu, "Report dictionary issue", "afCardReportDictionaryIssue");
    dictionaryIssue.setAttribute("role", "menuitem");
    dictionaryIssue.addEventListener("click", () => options.onDictionaryIssue?.());
    if (options.feedback) {
      appendElement(menu, "p", "af-card-menu-feedback").textContent = options.feedback;
    }
    return menu;
  }

  function renderReviewActions(parent, actions = [], options = {}) {
    if (!Array.isArray(actions) || !actions.length) return null;
    const section = appendElement(parent, "div", "af-card-review");
    const actionWrap = appendElement(section, "div", "af-review-actions");

    for (const actionState of actions) {
      const button = appendButton(actionWrap, actionState.label, actionState.datasetKey);
      button.disabled = Boolean(actionState.disabled);
      button.setAttribute("aria-pressed", actionState.active ? "true" : "false");
      button.classList.toggle("is-action-pending", Boolean(actionState.pending));
      button.classList.toggle("is-action-saved", Boolean(actionState.saved));
      button.classList.toggle("is-action-error", Boolean(actionState.error));
      if (actionState.message) {
        button.textContent = actionState.message;
        button.title = actionState.message;
      }
      button.addEventListener("click", () => options.onAction?.(actionState.action));
    }
    return section;
  }

  function renderOverlaySection(parent, section, allSections, options = {}) {
    const block = appendElement(parent, "div", `af-overlay-section is-${section.kind || "meaning"}`);
    const translationText = typeof options.translationForSection === "function"
      ? options.translationForSection(section, allSections)
      : "";
    if (section.kind === "idiom") {
      renderTranslatedLine(block, "p", "af-dictionary-copy af-overlay-idiom-expression", section.text, translationText);
      const explanation = dictionaryPresentationApi.sectionMicroLabel(section);
      if (explanation) {
        appendElement(block, "p", "af-dictionary-copy af-overlay-idiom-explanation").textContent = explanation;
      }
      return block;
    }
    if (section.kind === "context") {
      renderTranslatedLine(block, "p", "af-dictionary-copy af-overlay-context", section.text, translationText);
      return block;
    }
    if (dictionaryPresentationApi.shouldRenderSectionMicroLabel(section)) {
      appendElement(block, "p", "af-dictionary-copy af-overlay-section-label").textContent =
        dictionaryPresentationApi.sectionMicroLabel(section);
    }
    renderTranslatedLine(block, "p", "af-dictionary-copy", section.text, translationText);
    return block;
  }

  function renderTranslatedLine(parent, tagName, className, text, translationText = "") {
    const line = appendElement(parent, tagName, className);
    line.textContent = text;
    renderInlineTranslation(line, translationText);
    return line;
  }

  function renderInlineTranslation(parent, text) {
    const value = dictionaryPresentationApi.cleanTranslationText(text);
    if (!value) return null;
    const translation = appendElement(parent, "span", "af-inline-translation");
    translation.textContent = `\n${value}`;
    return translation;
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

  window.__afShadowingDictionaryDom = {
    renderDictionaryPanelShell,
    renderTranslationField,
    renderHighlightedText,
    renderChipList,
    renderOverlaySections,
    renderCardHeaderActionButtons,
    renderOverlayCard,
    createLookupPlaceholder,
    renderLookupStatus,
    renderLookupLoading,
    renderLookupError,
    renderLookupDefinitions,
    renderDictionaryLookup,
    renderLookupMessages,
    renderGeneratedFallback,
    renderOverlayCardTitle,
    renderCardActionMenu,
    renderReviewActions,
    renderTranslatedLine,
    renderInlineTranslation,
  };
})();
