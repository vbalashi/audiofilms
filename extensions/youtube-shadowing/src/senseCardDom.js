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
    if (view.reportCapability) {
      const report = appendButton(card, view.labels.report, "af-sense-report");
      report.addEventListener("click", () => options.onReport?.(view.reportCapability));
    }
    return card;
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

    if (view.markKnownAction) {
      const known = appendButton(actions, `✓ ${view.markKnownAction.label}`, "af-sense-mark-known");
      known.addEventListener("click", () => options.onAction?.(view.markKnownAction));
    }
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
  };
})();
