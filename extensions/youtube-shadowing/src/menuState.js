(function audioFilmsMenuState() {
  const MENU_KEYS = {
    source: "sourceMenuOpen",
    utility: "utilityMenuOpen",
    settings: "settingsMenuOpen",
    help: "shortcutHelpOpen",
    account: "accountMenuOpen",
    jump: "phraseJumpMenuOpen",
  };
  const MENU_ORDER = ["source", "utility", "settings", "help", "account", "jump"];
  const MENU_INTERACTION_SELECTOR = [
    "[data-af-source-toggle]",
    "[data-af-source-menu]",
    "[data-af-source-menu] *",
    "[data-af-utility-toggle]",
    "[data-af-utility-menu]",
    "[data-af-utility-menu] *",
    "[data-af-settings-toggle]",
    "[data-af-settings-menu]",
    "[data-af-settings-menu] *",
    "[data-af-shortcut-help]",
    "[data-af-shortcut-help-panel]",
    "[data-af-shortcut-help-panel] *",
    "[data-af-account]",
    "[data-af-account-menu]",
    "[data-af-account-menu] *",
    "[data-af-count]",
    "[data-af-jump-menu]",
    "[data-af-jump-menu] *",
  ].join(", ");

  function toggleExclusiveMenu(state, menu) {
    const key = MENU_KEYS[menu];
    if (!state || !key) return false;
    const nextOpen = !Boolean(state[key]);
    closeMenuFlags(state);
    state[key] = nextOpen;
    state.lastMenuTrigger = nextOpen ? menu : null;
    return nextOpen;
  }

  function closeMenus(state, options = {}) {
    if (!anyMenuOpen(state)) return { closed: false, trigger: null };
    const trigger = state.lastMenuTrigger || activeMenuTrigger(state);
    closeMenuFlags(state);
    if (options.clearPhraseJumpError !== false) {
      state.phraseJumpError = "";
    }
    state.lastMenuTrigger = null;
    return { closed: true, trigger };
  }

  function anyMenuOpen(state) {
    return Boolean(activeMenuTrigger(state));
  }

  function activeMenuTrigger(state) {
    if (!state) return null;
    for (const menu of MENU_ORDER) {
      if (state[MENU_KEYS[menu]]) return menu;
    }
    return null;
  }

  function isMenuInteractionEvent(event, options = {}) {
    const ElementClass = options.Element || window.Element;
    const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
    return path.some((element) => isElementLike(element, ElementClass) && element.matches?.(MENU_INTERACTION_SELECTOR));
  }

  function closeMenuFlags(state) {
    for (const key of Object.values(MENU_KEYS)) {
      state[key] = false;
    }
  }

  function isElementLike(element, ElementClass) {
    return ElementClass ? element instanceof ElementClass : Boolean(element?.matches);
  }

  window.__afShadowingMenuState = {
    toggleExclusiveMenu,
    closeMenus,
    anyMenuOpen,
    activeMenuTrigger,
    isMenuInteractionEvent,
  };
})();
