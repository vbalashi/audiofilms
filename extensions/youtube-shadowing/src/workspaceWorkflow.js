(function audioFilmsWorkspaceWorkflow() {
  function ensureToggle(options = {}) {
    let button = options.document.getElementById(options.toggleId);
    if (button) return button;

    button = options.document.createElement("button");
    button.id = options.toggleId;
    button.type = "button";
    button.addEventListener("click", options.toggleLearningMode);
    options.document.documentElement.appendChild(button);
    return button;
  }

  function renderToggle(state, options = {}) {
    const button = ensureToggle(options);
    const toggleState = options.displayPreferences.learningToggleState({
      enabled: state.learningEnabled,
    });
    options.applyThemeAttributes?.();
    button.textContent = toggleState.text;
    button.classList.toggle("is-enabled", toggleState.enabled);
    button.setAttribute("aria-label", toggleState.ariaLabel);
    return toggleState;
  }

  function toggleLearningMode(state, options = {}) {
    options.updateDisplayPreferences((preferences) => ({
      ...preferences,
      enabled: !state.learningEnabled,
    }));
    if (!state.learningEnabled) {
      options.stopPlaybackTimer?.();
      options.detachPassivePlaybackWatcher?.();
      state.guidedMode = false;
      removeWorkspace(options);
      renderToggle(state, options);
      return false;
    }
    options.handleCurrentLocation?.();
    return true;
  }

  function ensureWorkspace(state, options = {}) {
    options.document.documentElement.classList.add("af-shadowing-workspace", "af-shadowing-enabled");
    options.applyThemeAttributes?.();
    const root = ensureAudioFilmsRoot(options);
    options.applyThemeAttributes?.();
    const container = ensureShadowContainer(root, options);
    options.installPanelGestureFallback?.();

    let ribbonPanel = root.querySelector(`#${options.ribbonPanelId}`);
    if (!ribbonPanel) {
      ribbonPanel = options.createRibbonPanel();
    }

    let dictionaryPanel = root.querySelector(`#${options.dictionaryPanelId}`);
    if ((state.selectedWord || state.selectedSpan) && !dictionaryPanel) {
      dictionaryPanel = options.createDictionaryPanel();
    }

    let debugPanel = root.querySelector("[data-af-debug-panel]");
    if (!debugPanel) {
      debugPanel = options.createDebugPanel();
    }

    mountWorkspace(state, container, dictionaryPanel, ribbonPanel, debugPanel);
    return { dictionaryPanel, ribbonPanel, debugPanel };
  }

  function ensureAudioFilmsRoot(options = {}) {
    let host = options.document.getElementById(options.rootId);
    if (!(host instanceof options.HTMLElement)) {
      host = options.document.createElement("div");
      host.id = options.rootId;
      host.setAttribute("aria-label", "AudioFilms YouTube learning layer");
      options.document.documentElement.appendChild(host);
    }

    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    ensureShadowStyles(root, options);
    installShadowLayerFocus(root, options);
    installShadowScrollGuard(root, options);
    return root;
  }

  function installShadowLayerFocus(root, options = {}) {
    if (options.getShadowLayerFocusInstalled()) return false;
    options.setShadowLayerFocusInstalled(true);
    root.addEventListener("pointerdown", options.handleShadowLayerFocus, true);
    root.addEventListener("mousedown", options.handleShadowLayerFocus, true);
    options.document.addEventListener("pointerdown", options.handleShadowLayerFocus, true);
    options.document.addEventListener("mousedown", options.handleShadowLayerFocus, true);
    return true;
  }

  function installShadowScrollGuard(root, options = {}) {
    if (options.getShadowScrollGuardInstalled()) return false;
    options.setShadowScrollGuardInstalled(true);
    options.scrollContainment.installScrollGuard(root, {
      getComputedStyle: options.window.getComputedStyle.bind(options.window),
      surfaceSelectors: [
        `#${options.ribbonPanelId}`,
        `#${options.ribbonPanelId} *`,
        `#${options.dictionaryPanelId}`,
        `#${options.dictionaryPanelId} *`,
        "[data-af-debug-panel]",
        "[data-af-debug-panel] *",
        "[data-af-source-menu]",
        "[data-af-source-menu] *",
        "[data-af-utility-menu]",
        "[data-af-utility-menu] *",
        "[data-af-account-menu]",
        "[data-af-account-menu] *",
      ],
    });
    return true;
  }

  function ensureShadowContainer(root, options = {}) {
    let container = root.getElementById(options.shadowContainerId);
    if (container instanceof options.HTMLElement) return container;

    container = options.document.createElement("div");
    container.id = options.shadowContainerId;
    root.appendChild(container);
    return container;
  }

  function ensureShadowStyles(root, options = {}) {
    if (root.querySelector("style[data-af-shadow-style]")) return false;

    const style = options.document.createElement("style");
    style.dataset.afShadowStyle = "";
    style.textContent = ":host{all:initial;position:fixed;inset:auto 16px 16px 16px;z-index:2147483646;display:block;pointer-events:none}";
    root.prepend(style);
    options.loadShadowStyles?.(root, style);
    return true;
  }

  function mountWorkspace(state, container, dictionaryPanel, ribbonPanel, debugPanel) {
    if (debugPanel.parentElement !== container) {
      container.appendChild(debugPanel);
    }

    if (ribbonPanel.parentElement !== container) {
      container.appendChild(ribbonPanel);
    }

    if (!state.selectedWord && !state.selectedSpan) {
      dictionaryPanel?.remove();
      return;
    }

    if (dictionaryPanel && dictionaryPanel.parentElement !== container) {
      container.appendChild(dictionaryPanel);
    }
  }

  function removeWorkspace(options = {}) {
    options.document.documentElement.classList.remove(
      "af-shadowing-workspace",
      "af-shadowing-enabled",
      "af-shadowing-hide-transcript",
    );
    options.document.getElementById(options.rootId)?.remove();
  }

  window.__afShadowingWorkspaceWorkflow = {
    ensureToggle,
    renderToggle,
    toggleLearningMode,
    ensureWorkspace,
    ensureAudioFilmsRoot,
    installShadowLayerFocus,
    installShadowScrollGuard,
    ensureShadowContainer,
    ensureShadowStyles,
    mountWorkspace,
    removeWorkspace,
  };
})();
