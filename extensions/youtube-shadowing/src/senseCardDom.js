(function audioFilmsSenseCardDom() {
  function renderSenseCard(parent, view, options = {}) {
    if (!view) return null;
    const card = append(parent, "article", "af-sense-card");
    card.classList.add(`is-phase-${view.phase || "guest"}`);
    card.classList.toggle("is-known", Boolean(view.known));
    card.dataset.afContractVersion = view.contractVersion || "";
    card.dataset.afEntryId = view.entryId || "";

    const meta = append(card, "div", "af-sense-meta");
    const metaLeft = append(meta, "div", "af-sense-meta-left");
    if (view.partOfSpeechLabel) {
      append(metaLeft, "span", "af-sense-pos-dot");
      const partOfSpeech = append(metaLeft, "span", "af-sense-pos-label");
      partOfSpeech.dataset.afTermId = view.partOfSpeechTermId || "";
      partOfSpeech.textContent = view.partOfSpeechLabel;
    }
    for (const indicator of view.indicators || []) {
      append(metaLeft, "span", "af-sense-indicator").textContent = indicator.value || "";
    }

    const tools = append(meta, "div", "af-sense-tools");
    if (view.senseCountLabel) {
      append(tools, "span", "af-sense-count-label").textContent = view.senseCountLabel;
    }
    if (view.canToggleTranslation) {
      const translate = iconButton(
        tools,
        "translate",
        view.translationVisible ? view.labels.hideTranslation : view.labels.showTranslation,
        options.iconSvg,
      );
      translate.classList.add("af-sense-translate");
      translate.setAttribute("aria-pressed", String(view.translationVisible));
      translate.addEventListener("click", () => options.onTranslation?.());
    }
    if (view.audio) {
      const audio = iconButton(tools, "audio", view.labels.playAudio, options.iconSvg);
      audio.disabled = !options.onAudio;
      audio.addEventListener("click", () => options.onAudio?.());
    }

    const title = append(card, "div", "af-sense-title");
    if (view.article) append(title, "span", "af-sense-article").textContent = view.article;
    append(title, "span", "af-sense-headword").textContent = view.headword;
    if (view.headwordTranslation) {
      append(card, "div", "af-sense-headword-translation").textContent = view.headwordTranslation;
    }

    const meaningHeader = sectionHeader(card, view.labels.meanings);
    if (view.repeatLabel) {
      append(meaningHeader, "span", "af-sense-repeat").textContent = view.repeatLabel;
    }
    if (view.definition?.text) {
      const definition = append(card, "div", "af-sense-definition");
      append(definition, "p", "af-sense-copy").textContent = view.definition.text;
      if (view.definition.translation) {
        append(definition, "p", "af-sense-translation").textContent = view.definition.translation;
      }
    }

    if (view.usage?.length) {
      sectionHeader(card, view.labels.usage);
      const usageList = append(card, "div", "af-sense-usage-list");
      for (const usage of view.usage) {
        renderTextPair(usageList, usage, "af-sense-usage");
      }
    }

    if (view.examples?.length) {
      sectionHeader(card, view.labels.examples, String(view.examples.length));
      const examples = append(card, "div", "af-sense-examples");
      for (const example of view.examples) {
        renderTextPair(examples, example, "af-sense-example");
      }
    }

    renderProgress(card, view, options);
    renderSecondaryActions(card, view, options);
    return card;
  }

  function renderSenseCardGroup(parent, view, options = {}) {
    if (!view) return null;
    const group = append(parent, "article", "af-sense-card-group");
    group.dataset.afContractVersion = view.contractVersion || "";
    group.dataset.afHeadwordGroupId = view.groupId || "";

    const meta = append(group, "div", "af-sense-meta");
    const metaLeft = append(meta, "div", "af-sense-meta-left");
    if (view.partOfSpeechLabel) {
      append(metaLeft, "span", "af-sense-pos-dot");
      const partOfSpeech = append(metaLeft, "span", "af-sense-pos-label");
      partOfSpeech.dataset.afTermId = view.partOfSpeechTermId || "";
      partOfSpeech.textContent = view.partOfSpeechLabel;
    }
    for (const indicator of view.indicators || []) {
      append(metaLeft, "span", "af-sense-indicator").textContent = indicator.value || "";
    }

    const tools = append(meta, "div", "af-sense-tools");
    if (view.canToggleTranslation) {
      const translate = iconButton(
        tools,
        "translate",
        view.translationVisible ? view.labels.hideTranslation : view.labels.showTranslation,
        options.iconSvg,
      );
      translate.classList.add("af-sense-translate");
      translate.setAttribute("aria-pressed", String(view.translationVisible));
      translate.addEventListener("click", (event) => {
        event?.stopPropagation?.();
        options.onTranslation?.();
      });
    }
    if (view.audio) {
      const audio = iconButton(tools, "audio", view.labels.playAudio, options.iconSvg);
      audio.disabled = !options.onAudio;
      audio.addEventListener("click", (event) => {
        event?.stopPropagation?.();
        options.onAudio?.();
      });
    }

    const title = append(group, "div", "af-sense-title");
    if (view.article) append(title, "span", "af-sense-article").textContent = view.article;
    append(title, "span", "af-sense-headword").textContent = view.headword;

    const meaningHeader = sectionHeader(group, view.labels.meanings, String(view.senseCount));
    meaningHeader.classList.add("af-sense-group-header");
    const meanings = append(group, "div", "af-sense-meanings");
    for (const meaning of view.meanings || []) {
      renderGroupMeaning(meanings, meaning, options);
    }
    return group;
  }

  function renderGroupMeaning(parent, view, options) {
    const wrapper = append(parent, "section", "af-sense-meaning");
    wrapper.classList.toggle("is-expanded", Boolean(view.expanded));
    wrapper.classList.toggle("is-collapsed", !view.expanded);
    wrapper.classList.toggle("is-known", Boolean(view.known));
    wrapper.dataset.afSenseEntry = "";
    wrapper.dataset.afEntryId = view.entryId || "";
    wrapper.dataset.afExpanded = String(Boolean(view.expanded));
    wrapper.setAttribute("aria-expanded", String(Boolean(view.expanded)));
    wrapper.addEventListener("click", (event) => {
      if (event?.target?.closest?.("button")) return;
      options.onToggleExpanded?.(view.entryId);
    });

    const number = append(wrapper, "span", "af-sense-meaning-number");
    number.textContent = view.numberLabel || "";
    const surface = append(wrapper, "div", "af-sense-meaning-surface");
    const lead = append(surface, "div", "af-sense-meaning-lead");
    const copy = append(lead, "div", "af-sense-meaning-copy");
    if (view.headwordTranslation) {
      append(copy, "p", "af-sense-headword-translation").textContent = view.headwordTranslation;
    }
    if (view.definition?.text) {
      append(copy, "p", "af-sense-copy").textContent = view.definition.text;
    }
    if (view.definition?.translation) {
      append(copy, "p", "af-sense-translation").textContent = view.definition.translation;
    }
    if (view.repeatLabel) {
      append(lead, "span", "af-sense-repeat").textContent = view.repeatLabel;
    }
    const disclosure = iconButton(
      lead,
      view.expanded ? "collapse" : "expand",
      view.expanded ? view.labels.collapseMeaning : view.labels.expandMeaning,
      options.iconSvg,
    );
    disclosure.classList.add("af-sense-disclosure");
    disclosure.addEventListener("click", (event) => {
      event?.stopPropagation?.();
      options.onToggleExpanded?.(view.entryId);
    });

    if (!view.expanded) return wrapper;

    if (view.usage?.length) {
      sectionHeader(surface, view.labels.usage);
      const usageList = append(surface, "div", "af-sense-usage-list");
      for (const usage of view.usage) {
        renderTextPair(usageList, usage, "af-sense-usage");
      }
    }
    if (view.examples?.length) {
      sectionHeader(surface, view.labels.examples, String(view.examples.length));
      const examples = append(surface, "div", "af-sense-examples");
      for (const example of view.examples) {
        renderTextPair(examples, example, "af-sense-example");
      }
    }
    renderProgress(surface, view, {
      ...options,
      onAction: (action) => options.onAction?.(view.entryId, action),
    });
    renderSecondaryActions(surface, view, {
      ...options,
      onAction: (action) => options.onAction?.(view.entryId, action),
      onReport: (reportAction) => options.onReport?.(view.entryId, reportAction),
    });
    return wrapper;
  }

  function renderProgress(card, view, options) {
    const actions = append(card, "div", "af-sense-progress");
    if (view.known) {
      const known = append(actions, "div", "af-sense-known");
      append(known, "span", "af-sense-known-label").textContent = `✓ ${view.labels.markedKnown}`;
      if (view.undoKnownAction) {
        const undo = appendButton(known, view.labels.undo, "af-sense-undo");
        undo.addEventListener("click", () => options.onAction?.(view.undoKnownAction));
      }
      return;
    }

    if (view.reviewActions?.length) {
      sectionHeader(actions, view.labels.prompt);
      const review = append(actions, "div", "af-sense-review-grid");
      for (const action of view.reviewActions) {
        const button = appendButton(review, action.label, `af-sense-review is-${action.reviewResult}`);
        button.addEventListener("click", () => options.onAction?.(action));
      }
    } else if (view.startAction) {
      const learn = appendButton(actions, view.startAction.label, "af-sense-learn");
      learn.addEventListener("click", () => options.onAction?.(view.startAction));
    }

  }

  function renderSecondaryActions(card, view, options) {
    if (!view.reportAction && (!view.markKnownAction || view.known)) return null;
    const footer = append(card, "div", "af-sense-footer");
    if (view.reportAction) {
      const report = appendButton(footer, view.labels.report, "af-sense-report");
      report.addEventListener("click", (event) => {
        event?.stopPropagation?.();
        options.onReport?.(view.reportAction);
      });
    }
    if (view.markKnownAction && !view.known) {
      const known = appendButton(footer, `✓ ${view.markKnownAction.label}`, "af-sense-mark-known");
      known.addEventListener("click", () => options.onAction?.(view.markKnownAction));
    }
    return footer;
  }

  function sectionHeader(parent, label, count = "") {
    const header = append(parent, "div", "af-sense-section-header");
    append(header, "span", "af-sense-section-label").textContent = label;
    append(header, "span", "af-sense-section-line");
    if (count) append(header, "span", "af-sense-section-count").textContent = count;
    return header;
  }

  function renderTextPair(parent, item, className) {
    const block = append(parent, "div", className);
    append(block, "p", "af-sense-copy").textContent = item.text || "";
    if (item.translation) {
      append(block, "p", "af-sense-translation").textContent = item.translation;
    }
  }

  function iconButton(parent, icon, label, iconSvg) {
    const button = appendButton(parent, "", "af-sense-icon-button");
    button.innerHTML = `${iconSvg?.(icon) || ""}<span class="af-sr-only">${escapeHtml(label)}</span>`;
    button.title = label;
    button.setAttribute("aria-label", label);
    return button;
  }

  function append(parent, tagName, className = "") {
    const element = parent.ownerDocument.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function appendButton(parent, label, className) {
    const button = append(parent, "button", className);
    button.type = "button";
    button.textContent = label;
    return button;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  window.__afShadowingSenseCardDom = {
    renderSenseCard,
    renderSenseCardGroup,
  };
})();
