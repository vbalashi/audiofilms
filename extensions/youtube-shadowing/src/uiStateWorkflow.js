(function audioFilmsUiStateWorkflow() {
  function applyThemeAttributes(state, options = {}) {
    const preference = state.themePreference || "system";
    options.document.documentElement.dataset.afTheme = preference;
    const root = options.document.getElementById(options.rootId);
    if (root) {
      root.dataset.afTheme = preference;
      root.style.setProperty(
        "--af-learner-text-scale",
        String(state.displayPreferences.appearance.learnerTextScale),
      );
      root.style.setProperty(
        "--af-panel-background-alpha",
        String(state.displayPreferences.appearance.panelBackgroundAlpha),
      );
    }
  }

  function toggleAllExamples(state, event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    state.examplesExpanded = !state.examplesExpanded;
    state.exampleExpansionOverrides = {};
    options.updateDisplayPreferences((preferences) =>
      options.displayPreferences.withExamplesExpanded(preferences, state.examplesExpanded));
    options.render?.();
    return state.examplesExpanded;
  }

  function toggleCardExpanded(state, cardId, options = {}) {
    if (!cardId) return false;
    state.exampleExpansionOverrides = {
      ...state.exampleExpansionOverrides,
      [cardId]: !cardExpanded(state, cardId),
    };
    options.render?.();
    return state.exampleExpansionOverrides[cardId];
  }

  function cardExpanded(state, cardId) {
    if (
      cardId
      && Object.prototype.hasOwnProperty.call(state.exampleExpansionOverrides, cardId)
    ) {
      return state.exampleExpansionOverrides[cardId] === true;
    }
    return false;
  }

  function closeOpenMenus(state, options = {}) {
    const result = options.menuState.closeMenus(state);
    if (!result.closed) return false;
    options.render?.();
    options.requestAnimationFrame(() => focusMenuTrigger(result.trigger, options));
    return true;
  }

  function focusMenuTrigger(trigger, options = {}) {
    const host = options.document.getElementById(options.rootId);
    const root = host?.shadowRoot;
    const selector = {
      source: "[data-af-source-toggle]",
      utility: "[data-af-utility-toggle]",
      settings: "[data-af-settings-toggle]",
      help: "[data-af-shortcut-help]",
      account: "[data-af-account]",
      jump: "[data-af-count]",
    }[trigger];
    if (!root || !selector) return false;
    root.querySelector(selector)?.focus?.();
    return true;
  }

  function onDocumentPointerDown(state, event, options = {}) {
    if (!state.learningEnabled) return false;
    if (options.menuState.isMenuInteractionEvent(event, { Element: options.Element })) return false;
    return closeOpenMenus(state, options);
  }

  window.__afShadowingUiStateWorkflow = {
    applyThemeAttributes,
    toggleAllExamples,
    toggleCardExpanded,
    cardExpanded,
    closeOpenMenus,
    focusMenuTrigger,
    onDocumentPointerDown,
  };
})();
