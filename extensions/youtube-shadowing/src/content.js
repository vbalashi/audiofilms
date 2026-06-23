(function audioFilmsYouTubeShadowing() {
  const bootDiagnosticsApi = window.__afShadowingBootDiagnostics || createBootDiagnosticsFallback();
  const phraseApi = window.__afShadowingPhrases || createPhraseFallback();
  const captionTrackApi = window.__afShadowingCaptionTracks || createCaptionTracksFallback();
  const youtubeAdapterApi = window.__afShadowingYouTubeAdapter || createYouTubeAdapterFallback();
  const transcriptRetrievalApi = window.__afShadowingTranscriptRetrieval;

  try {
    bootAudioFilmsYouTubeShadowing();
  } catch (error) {
    bootDiagnosticsApi.recordBootFailure(error);
    bootDiagnosticsApi.renderBootFailureBadge(error);
  }

  function bootAudioFilmsYouTubeShadowing() {
  const bootDiagnostics = bootDiagnosticsApi.markBootStarted();
  const DICTIONARY_PANEL_ID = "af-shadowing-dictionary-panel";
  const RIBBON_PANEL_ID = "af-shadowing-ribbon-panel";
  const ROOT_ID = "audiofilms-root";
  const SHADOW_CONTAINER_ID = "audiofilms-shadow-container";
  const TOGGLE_ID = "af-shadowing-toggle";
  const DISPLAY_PREFERENCES_STORAGE_KEY = "afShadowingDisplayPreferences";
  const LEARNING_ENABLED_STORAGE_KEY = "afShadowingLearningEnabled";
  const EXAMPLES_EXPANDED_STORAGE_KEY = "afDictionaryExamplesExpanded";
  const THEME_STORAGE_KEY = "afShadowingTheme";
  const MAX_PHRASE_DURATION_MS = 12000;
  const LONG_PAUSE_MS = 1000;
  const PRE_ROLL_MS = 150;
  const POST_ROLL_MS = 250;
  const CONTIGUOUS_BOUNDARY_GUARD_MS = 120;
  const DICTIONARY_BINDING_VERSION = "youtube-dictionary-source-v2";
  const EXTENSION_FALLBACK_BUILDER_VERSION = "audiofilms-extension-fallback-phrases-v1";
  const initialDisplayPreferences = readInitialDisplayPreferences();

  let panelGestureFallbackInstalled = false;
  let shadowLayerFocusInstalled = false;
  let shadowScrollGuardInstalled = false;
  let displayPreferencesDirty = false;
  let displayPreferencesMutationSeq = 0;

  const state = {
    videoId: null,
    tracks: [],
    practiceSources: [],
    selectedSourceId: "",
    sourceMenuOpen: false,
    selectedTrack: null,
    cueSource: "",
    transcriptResult: null,
    debugVisible: false,
    debugCopied: false,
    debugPanelInFront: false,
    diagnosticsClearedAt: "",
    cacheRefreshRequested: false,
    issueCopied: false,
    debugEvents: [],
    navigationEvents: [],
    lastIssueReport: null,
    navigationEventSeq: 0,
    cues: [],
    phrases: [],
    currentIndex: 0,
    displayPreferences: initialDisplayPreferences,
    learningEnabled: initialDisplayPreferences.enabled,
    textVisible: true,
    shadowTextVisible: true,
    autoPause: initialDisplayPreferences.autoPause,
    practiceMode: "shadow",
    phraseTranslationVisible: false,
    phraseTranslations: {},
    phraseTranslationSeq: 0,
    timingOperation: null,
    timingOperationError: "",
    timingOperationApiBase: "",
    timingOperationPollTimer: null,
    utilityMenuOpen: false,
    lastMenuTrigger: null,
    guidedMode: false,
    selectedWord: null,
    dictionaryLookupSeq: 0,
    examplesExpanded: initialDisplayPreferences.examplesExpanded,
    exampleExpansionOverrides: {},
    visibleTranslationsByCardId: {},
    cardActionFeedbackByCardId: {},
    themePreference: initialDisplayPreferences.theme,
    accountStatus: "guest",
    accountUser: null,
    accountPreferences: null,
    accountError: "",
    accountLoading: false,
    accountMenuOpen: false,
    playbackFrame: null,
    activePlayback: null,
    guidedHold: null,
    passiveVideo: null,
    passiveFrame: null,
    passivePausedKey: "",
    loading: false,
    loadToken: 0,
    error: "",
    bootDiagnostics,
  };
  window.__afShadowingDebug = state;
  initializeDisplayPreferences();
  subscribeToDisplayPreferenceChanges();
  syncTwoThousandNlAccount();

  function updateBootDiagnostics(updates) {
    Object.assign(state.bootDiagnostics, updates, {
      updatedAt: new Date().toISOString(),
      url: window.location.href,
    });
    bootDiagnosticsApi.publish(state.bootDiagnostics);
    if (updates.lastError) {
      document.documentElement.dataset.afShadowingLastError = String(updates.lastError).slice(0, 180);
    }
    publishDiagnosticsSnapshot();
  }

  function readInitialDisplayPreferences() {
    return normalizeDisplayPreferences({
      enabled: readLocalStorageValue(LEARNING_ENABLED_STORAGE_KEY) !== "false",
      examplesExpanded: readLocalStorageValue(EXAMPLES_EXPANDED_STORAGE_KEY) === "true",
      theme: normalizeTheme(readLocalStorageValue(THEME_STORAGE_KEY)),
    });
  }

  function normalizeDisplayPreferences(value) {
    const preferences = value && typeof value === "object" ? value : {};
    const appearance = preferences.appearance && typeof preferences.appearance === "object"
      ? preferences.appearance
      : {};
    const layout = preferences.layout && typeof preferences.layout === "object" ? preferences.layout : {};

    return {
      version: 1,
      enabled: preferences.enabled !== false,
      autoPause: preferences.autoPause !== false,
      examplesExpanded: preferences.examplesExpanded === true,
      theme: normalizeTheme(preferences.theme),
      appearance: {
        learnerTextScale: clampNumber(appearance.learnerTextScale, 0.85, 1.35, 1),
        panelBackgroundAlpha: clampNumber(appearance.panelBackgroundAlpha, 0.65, 1, 0.92),
      },
      layout: {
        locked: layout.locked !== false,
        phraseRibbon: normalizePanelGeometry(layout.phraseRibbon),
        dictionaryPanel: normalizePanelGeometry(layout.dictionaryPanel),
        debugPanel: normalizePanelGeometry(layout.debugPanel),
        zOrder: layout.zOrder === "dictionaryPanel" ? "dictionaryPanel" : "phraseRibbon",
      },
    };
  }

  function normalizePanelGeometry(value) {
    const geometry = value && typeof value === "object" ? value : {};
    return {
      x: nullableFiniteNumber(geometry.x),
      y: nullableFiniteNumber(geometry.y),
      width: nullableFiniteNumber(geometry.width),
      height: nullableFiniteNumber(geometry.height),
    };
  }

  function nullableFiniteNumber(value) {
    return Number.isFinite(value) ? value : null;
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : "system";
  }

  function readLocalStorageValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  async function initializeDisplayPreferences() {
    const initMutationSeq = displayPreferencesMutationSeq;
    const stored = await readStoredDisplayPreferences();
    if (displayPreferencesDirty || initMutationSeq !== displayPreferencesMutationSeq) {
      try {
        await writeDisplayPreferences(state.displayPreferences);
      } catch (error) {
        recordDebugEvent("display-preferences-write-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      render();
      return;
    }
    const preferences = stored || state.displayPreferences;
    applyDisplayPreferences(preferences);
    if (!stored) {
      try {
        await writeDisplayPreferences(preferences);
        clearMigratedDisplayLocalStorage();
      } catch (error) {
        recordDebugEvent("display-preferences-migration-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      clearMigratedDisplayLocalStorage();
    }
    render();
  }

  function subscribeToDisplayPreferenceChanges() {
    if (!chrome.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[DISPLAY_PREFERENCES_STORAGE_KEY]) return;

      const wasEnabled = state.learningEnabled;
      const next = normalizeDisplayPreferences(changes[DISPLAY_PREFERENCES_STORAGE_KEY].newValue);
      applyDisplayPreferences(next);

      if (wasEnabled && !state.learningEnabled) {
        stopPlaybackTimer();
        detachPassivePlaybackWatcher();
        state.guidedMode = false;
        removeWorkspace();
        renderToggle();
        return;
      }

      if (!wasEnabled && state.learningEnabled) {
        handleCurrentLocation();
        return;
      }

      render();
    });
  }

  async function readStoredDisplayPreferences() {
    try {
      const response = await sendExtensionMessage({ type: "af-get-display-preferences" });
      if (!response?.ok) {
        throw new Error(response?.error || "Display preferences read failed.");
      }
      return response.preferences ? normalizeDisplayPreferences(response.preferences) : null;
    } catch (error) {
      recordDebugEvent("display-preferences-read-failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  function applyDisplayPreferences(preferences) {
    state.displayPreferences = normalizeDisplayPreferences(preferences);
    state.learningEnabled = state.displayPreferences.enabled;
    state.autoPause = state.displayPreferences.autoPause;
    state.examplesExpanded = state.displayPreferences.examplesExpanded;
    state.themePreference = state.displayPreferences.theme;
  }

  function updateDisplayPreferences(updater) {
    const next = normalizeDisplayPreferences(updater({ ...state.displayPreferences }));
    displayPreferencesDirty = true;
    displayPreferencesMutationSeq += 1;
    applyDisplayPreferences(next);
    return writeDisplayPreferences(next).catch((error) => {
      recordDebugEvent("display-preferences-write-failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }).finally(() => {
      displayPreferencesDirty = false;
    });
  }

  function writeDisplayPreferences(preferences) {
    return sendExtensionMessage({
      type: "af-set-display-preferences",
      preferences: normalizeDisplayPreferences(preferences),
    }).then((response) => {
      if (!response?.ok) {
        throw new Error(response?.error || "Display preferences write failed.");
      }
      return normalizeDisplayPreferences(response.preferences);
    });
  }

  function clearMigratedDisplayLocalStorage() {
    [LEARNING_ENABLED_STORAGE_KEY, EXAMPLES_EXPANDED_STORAGE_KEY, THEME_STORAGE_KEY].forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (_error) {}
    });
  }

  function sendExtensionMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function ensureToggle() {
    let button = document.getElementById(TOGGLE_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = TOGGLE_ID;
    button.type = "button";
    button.addEventListener("click", toggleLearningMode);
    document.documentElement.appendChild(button);
    return button;
  }

  function renderToggle() {
    const button = ensureToggle();
    applyThemeAttributes();
    button.textContent = state.learningEnabled ? "AudioFilms On" : "AudioFilms Off";
    button.classList.toggle("is-enabled", state.learningEnabled);
    button.setAttribute(
      "aria-label",
      state.learningEnabled ? "Disable AudioFilms shadowing workspace" : "Enable AudioFilms shadowing workspace",
    );
  }

  function toggleLearningMode() {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      enabled: !state.learningEnabled,
    }));
    if (!state.learningEnabled) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      state.guidedMode = false;
      removeWorkspace();
      renderToggle();
      return;
    }
    handleCurrentLocation();
  }

  function ensureWorkspace() {
    document.documentElement.classList.add("af-shadowing-workspace", "af-shadowing-enabled");
    applyThemeAttributes();
    const root = ensureAudioFilmsRoot();
    applyThemeAttributes();
    const container = ensureShadowContainer(root);
    installPanelGestureFallback();

    let ribbonPanel = root.querySelector(`#${RIBBON_PANEL_ID}`);
    if (!ribbonPanel) {
      ribbonPanel = createRibbonPanel();
    }

    let dictionaryPanel = root.querySelector(`#${DICTIONARY_PANEL_ID}`);
    if (state.selectedWord && !dictionaryPanel) {
      dictionaryPanel = createDictionaryPanel();
    }

    let debugPanel = root.querySelector("[data-af-debug-panel]");
    if (!debugPanel) {
      debugPanel = createDebugPanel();
    }

    mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel);
    return { dictionaryPanel, ribbonPanel, debugPanel };
  }

  function ensureAudioFilmsRoot() {
    let host = document.getElementById(ROOT_ID);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.id = ROOT_ID;
      host.setAttribute("aria-label", "AudioFilms YouTube learning layer");
      document.documentElement.appendChild(host);
    }

    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    ensureShadowStyles(root);
    installShadowLayerFocus(root);
    installShadowScrollGuard(root);
    return root;
  }

  function installShadowLayerFocus(root) {
    if (shadowLayerFocusInstalled) return;
    shadowLayerFocusInstalled = true;
    root.addEventListener("pointerdown", handleShadowLayerFocus, true);
    root.addEventListener("mousedown", handleShadowLayerFocus, true);
    document.addEventListener("pointerdown", handleShadowLayerFocus, true);
    document.addEventListener("mousedown", handleShadowLayerFocus, true);
  }

  function installShadowScrollGuard(root) {
    if (shadowScrollGuardInstalled) return;
    shadowScrollGuardInstalled = true;
    root.addEventListener("wheel", containAudioFilmsScroll, { capture: true, passive: false });
    root.addEventListener("touchmove", containAudioFilmsTouchScroll, { capture: true, passive: false });
  }

  function containAudioFilmsScroll(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (!pathContainsAudioFilmsSurface(path)) return;

    event.stopPropagation();
    const scrollable = firstScrollableElement(path, event.deltaX, event.deltaY);
    if (!scrollable || !canScrollElement(scrollable, event.deltaX, event.deltaY)) {
      event.preventDefault();
    }
  }

  function containAudioFilmsTouchScroll(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (!pathContainsAudioFilmsSurface(path)) return;
    event.stopPropagation();
  }

  function pathContainsAudioFilmsSurface(path) {
    return path.some((element) => (
      element instanceof Element
      && element.matches?.([
        `#${RIBBON_PANEL_ID}`,
        `#${RIBBON_PANEL_ID} *`,
        `#${DICTIONARY_PANEL_ID}`,
        `#${DICTIONARY_PANEL_ID} *`,
        "[data-af-debug-panel]",
        "[data-af-debug-panel] *",
        "[data-af-source-menu]",
        "[data-af-source-menu] *",
        "[data-af-utility-menu]",
        "[data-af-utility-menu] *",
        "[data-af-account-menu]",
        "[data-af-account-menu] *",
      ].join(", "))
    ));
  }

  function firstScrollableElement(path, deltaX, deltaY) {
    return path.find((element) => (
      element instanceof HTMLElement
      && isScrollableInWheelDirection(element, deltaX, deltaY)
    )) || null;
  }

  function isScrollableInWheelDirection(element, deltaX, deltaY) {
    const style = window.getComputedStyle(element);
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal) {
      return /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    }
    return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
  }

  function canScrollElement(element, deltaX, deltaY) {
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal) {
      if (deltaX < 0) return element.scrollLeft > 0;
      if (deltaX > 0) return element.scrollLeft + element.clientWidth < element.scrollWidth;
      return false;
    }
    if (deltaY < 0) return element.scrollTop > 0;
    if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight;
    return false;
  }

  function ensureShadowContainer(root) {
    let container = root.getElementById(SHADOW_CONTAINER_ID);
    if (container instanceof HTMLElement) return container;

    container = document.createElement("div");
    container.id = SHADOW_CONTAINER_ID;
    root.appendChild(container);
    return container;
  }

  function ensureShadowStyles(root) {
    if (root.querySelector("style[data-af-shadow-style]")) return;

    const style = document.createElement("style");
    style.dataset.afShadowStyle = "";
    style.textContent = ":host{all:initial;position:fixed;inset:auto 16px 16px 16px;z-index:2147483646;display:block;pointer-events:none}";
    root.prepend(style);

    loadShadowStyles(root, style);
  }

  async function loadShadowStyles(root, style) {
    if (style.dataset.afLoaded === "1") return;
    style.dataset.afLoaded = "1";

    try {
      const response = await fetch(chrome.runtime.getURL("src/shadow.css"));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const css = await response.text();
      style.textContent = css
        .replace(/html\.af-shadowing-workspace/g, ":host")
        .replace(/#audiofilms-root/g, ":host");
    } catch (error) {
      recordDebugEvent("shadow-style-load-failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function createDictionaryPanel() {
    const panel = document.createElement("aside");
    panel.id = DICTIONARY_PANEL_ID;
    panel.setAttribute("aria-label", "AudioFilms dictionary lookup");
    panel.addEventListener("pointerdown", bringDebugPanelBehindFromPanel, true);
    panel.addEventListener("mousedown", bringDebugPanelBehindFromPanel, true);

    const header = appendElement(panel, "div", "af-dictionary-header");
    header.dataset.afDragSurface = "dictionaryPanel";
    const dragHandle = appendElement(header, "button", "af-panel-drag-handle");
    dragHandle.type = "button";
    dragHandle.dataset.afDragHandle = "dictionaryPanel";
    dragHandle.textContent = "Move";
    dragHandle.setAttribute("aria-label", "Move dictionary panel");
    const heading = appendElement(header, "div", "af-dictionary-heading");
    const title = appendElement(heading, "div", "af-dictionary-title");
    title.dataset.afDictionaryTitle = "";
    title.textContent = "Dictionary";
    const subtitle = appendElement(heading, "div", "af-dictionary-subtitle");
    subtitle.dataset.afDictionarySubtitle = "";
    subtitle.textContent = "Contextual Lookup";
    const examplesToggle = appendElement(header, "button", "af-dictionary-examples-toggle");
    examplesToggle.type = "button";
    examplesToggle.dataset.afExamplesToggle = "";
    examplesToggle.hidden = true;
    examplesToggle.addEventListener("click", toggleAllExamples);
    const close = appendElement(header, "button", "af-dictionary-close");
    close.type = "button";
    close.innerHTML = `${iconSvg("close")}<span class="af-sr-only">Close</span>`;
    close.setAttribute("aria-label", "Close dictionary panel");
    close.addEventListener("click", () => {
      state.selectedWord = null;
      render();
    });
    const body = appendElement(panel, "div", "af-dictionary-body");
    body.dataset.afDictionaryBody = "";
    const resizeHandle = appendElement(panel, "button", "af-panel-resize-handle");
    resizeHandle.type = "button";
    resizeHandle.dataset.afResizeHandle = "dictionaryPanel";
    resizeHandle.setAttribute("aria-label", "Resize dictionary panel");

    return panel;
  }

  function createRibbonPanel() {
    const panel = document.createElement("section");
    panel.id = RIBBON_PANEL_ID;
    panel.setAttribute("aria-label", "AudioFilms phrase ribbon");
    panel.addEventListener("pointerdown", bringDebugPanelBehindFromPanel, true);
    panel.addEventListener("mousedown", bringDebugPanelBehindFromPanel, true);

    const meta = appendElement(panel, "div", "af-ribbon-meta");
    meta.dataset.afDragSurface = "phraseRibbon";
    const dragHandle = appendElement(meta, "button", "af-panel-drag-handle");
    dragHandle.type = "button";
    dragHandle.dataset.afDragHandle = "phraseRibbon";
    dragHandle.textContent = "Move";
    dragHandle.setAttribute("aria-label", "Move phrase ribbon");
    const track = appendElement(meta, "div", "af-source-selector");
    track.dataset.afTrack = "";
    const trackButton = appendButton(track, "Captions: -", "afSourceToggle");
    trackButton.className = "af-source-toggle";
    trackButton.setAttribute("aria-haspopup", "menu");
    const sourceMenu = appendElement(track, "div", "af-source-menu");
    sourceMenu.dataset.afSourceMenu = "";
    const metaRight = appendElement(meta, "div", "af-ribbon-meta-right");
    const count = appendElement(metaRight, "span", "af-ribbon-count");
    count.dataset.afCount = "";
    count.textContent = "0 / 0";
    const mode = appendElement(metaRight, "span", "af-ribbon-mode");
    mode.dataset.afMode = "";
    mode.textContent = "Passive";
    createAccountControl(metaRight);
    const themeButton = appendButton(metaRight, "", "afThemeToggle");
    themeButton.className = "af-icon-button af-theme-toggle";
    themeButton.setAttribute("aria-label", "Theme");
    const utility = appendElement(metaRight, "div", "af-utility-menu");
    const utilityButton = appendButton(utility, "", "afUtilityToggle");
    utilityButton.className = "af-icon-button af-utility-toggle";
    utilityButton.innerHTML = `${bugIconSvg()}<span class="af-sr-only">Debug tools</span>`;
    utilityButton.setAttribute("aria-label", "Debug tools");
    utilityButton.setAttribute("aria-haspopup", "menu");
    utilityButton.setAttribute("aria-expanded", "false");
    utilityButton.title = "Debug tools";
    const utilityMenu = appendElement(utility, "div", "af-utility-popover");
    utilityMenu.dataset.afUtilityMenu = "";
    const displaySection = appendElement(utilityMenu, "div", "af-settings-section");
    const textLabel = appendElement(displaySection, "div", "af-settings-label");
    textLabel.textContent = "Subtitle text";
    const textControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(textControls, "A-", "afLearnerTextSmaller");
    appendButton(textControls, "Reset", "afLearnerTextReset");
    appendButton(textControls, "A+", "afLearnerTextLarger");
    const transparencyLabel = appendElement(displaySection, "div", "af-settings-label");
    transparencyLabel.textContent = "Panel transparency";
    const transparencyControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(transparencyControls, "-", "afTransparencyLower");
    appendButton(transparencyControls, "Reset", "afTransparencyReset");
    appendButton(transparencyControls, "+", "afTransparencyHigher");
    const playbackLabel = appendElement(displaySection, "div", "af-settings-label");
    playbackLabel.textContent = "Playback";
    const playbackControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(playbackControls, "Auto-pause On", "afAutoPauseToggle");
    const layoutLabel = appendElement(displaySection, "div", "af-settings-label");
    layoutLabel.textContent = "Panel layout";
    const layoutControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(layoutControls, "Unlock", "afLayoutLockToggle");
    appendButton(layoutControls, "Reset", "afLayoutReset");
    const debugSection = appendElement(utilityMenu, "div", "af-settings-section af-debug-actions");
    appendButton(debugSection, "Mark Issue", "afMarkIssue");
    appendButton(debugSection, "Debug", "afDebugToggle");
    appendButton(debugSection, "Copy Debug", "afDebugCopy");
    appendButton(debugSection, "Clear Diagnostics", "afDiagnosticsClear");
    appendButton(debugSection, "Refresh Cache", "afRefreshCache");

    const list = appendElement(panel, "div", "af-ribbon-list");
    list.dataset.afRibbonList = "";

    const error = appendElement(panel, "div", "af-ribbon-error");
    error.dataset.afError = "";

    const controls = appendElement(panel, "div", "af-ribbon-controls");
    const practiceControls = appendElement(controls, "div", "af-control-group af-practice-controls");
    const prevButton = appendButton(practiceControls, "", "afPrev");
    prevButton.classList.add("af-phrase-icon-button");
    prevButton.innerHTML = `${iconSvg("prev")}<span class="af-sr-only">Prev</span>`;
    prevButton.setAttribute("aria-label", "Previous phrase");
    prevButton.title = "Previous phrase (ArrowLeft)";
    const replayButton = appendButton(practiceControls, "", "afReplay");
    replayButton.classList.add("af-phrase-icon-button");
    replayButton.innerHTML = `${iconSvg("replay")}<span class="af-sr-only">Replay</span>`;
    replayButton.setAttribute("aria-label", "Replay current phrase");
    replayButton.title = "Replay current phrase (ArrowDown)";
    const nextButton = appendButton(practiceControls, "", "afNext");
    nextButton.classList.add("af-phrase-icon-button");
    nextButton.innerHTML = `${iconSvg("next")}<span class="af-sr-only">Next</span>`;
    nextButton.setAttribute("aria-label", "Next phrase");
    nextButton.title = "Next phrase (ArrowRight)";

    const modeControls = appendElement(controls, "div", "af-control-group af-mode-controls");
    const shadowButton = appendButton(modeControls, "Shadow", "afModeShadow");
    shadowButton.title = "Shadow mode (1)";
    const recallButton = appendButton(modeControls, "Recall", "afModeRecall");
    recallButton.title = "Recall mode (2)";

    const displayControls = appendElement(controls, "div", "af-control-group af-display-controls");
    const originalButton = appendButton(displayControls, "Show Original", "afToggle");
    originalButton.title = "Show or hide original text (S)";
    const translationButton = appendButton(displayControls, "Show Translation", "afPhraseTranslation");
    translationButton.title = "Show phrase translation (T)";
    const hints = appendElement(panel, "div", "af-shortcut-hints");
    hints.textContent = "Shortcuts: Arrow keys phrase navigation · S original · T translation · 1/2 modes";
    const resizeHandle = appendElement(panel, "button", "af-panel-resize-handle");
    resizeHandle.type = "button";
    resizeHandle.dataset.afResizeHandle = "phraseRibbon";
    resizeHandle.setAttribute("aria-label", "Resize phrase ribbon width");

    panel.querySelector("[data-af-prev]").addEventListener("click", previousPhrase);
    panel.querySelector("[data-af-replay]").addEventListener("click", replayCurrentPhrase);
    panel.querySelector("[data-af-toggle]").addEventListener("click", toggleText);
    panel.querySelector("[data-af-next]").addEventListener("click", nextPhrase);
    panel.querySelector("[data-af-mode-shadow]").addEventListener("click", () => setPracticeMode("shadow"));
    panel.querySelector("[data-af-mode-recall]").addEventListener("click", () => setPracticeMode("recall"));
    panel.querySelector("[data-af-phrase-translation]").addEventListener("click", togglePhraseTranslation);
    panel.querySelector("[data-af-source-toggle]").addEventListener("click", toggleSourceMenu);
    panel.querySelector("[data-af-theme-toggle]").addEventListener("click", cycleThemePreference);
    panel.querySelector("[data-af-utility-toggle]").addEventListener("click", toggleUtilityMenu);
    panel.querySelector("[data-af-learner-text-smaller]").addEventListener("click", () => adjustLearnerTextScale(-0.1));
    panel.querySelector("[data-af-learner-text-reset]").addEventListener("click", resetLearnerTextScale);
    panel.querySelector("[data-af-learner-text-larger]").addEventListener("click", () => adjustLearnerTextScale(0.1));
    panel.querySelector("[data-af-transparency-lower]").addEventListener("click", () => adjustPanelBackgroundAlpha(-0.1));
    panel.querySelector("[data-af-transparency-reset]").addEventListener("click", resetPanelBackgroundAlpha);
    panel.querySelector("[data-af-transparency-higher]").addEventListener("click", () => adjustPanelBackgroundAlpha(0.1));
    panel.querySelector("[data-af-auto-pause-toggle]").addEventListener("click", toggleAutoPause);
    panel.querySelector("[data-af-layout-lock-toggle]").addEventListener("click", toggleLayoutLock);
    panel.querySelector("[data-af-layout-reset]").addEventListener("click", resetPanelLayout);
    panel.querySelectorAll("[data-af-drag-handle]").forEach((handle) => {
      handle.addEventListener("pointerdown", beginPanelDrag);
      handle.addEventListener("mousedown", beginPanelDrag);
    });
    panel.querySelectorAll("[data-af-drag-surface]").forEach((surface) => {
      surface.addEventListener("pointerdown", beginPanelDrag);
      surface.addEventListener("mousedown", beginPanelDrag);
    });
    panel.querySelectorAll("[data-af-resize-handle]").forEach((handle) => {
      handle.addEventListener("pointerdown", beginPanelResize);
      handle.addEventListener("mousedown", beginPanelResize);
    });
    panel.querySelector("[data-af-debug-toggle]").addEventListener("click", toggleDebug);
    panel.querySelector("[data-af-debug-copy]").addEventListener("click", copyDebug);
    panel.querySelector("[data-af-diagnostics-clear]").addEventListener("click", clearDiagnostics);
    panel.querySelector("[data-af-refresh-cache]").addEventListener("click", refreshSelectedSourceCache);
    panel.querySelector("[data-af-mark-issue]").addEventListener("click", markIssue);
    return panel;
  }

  function createDebugPanel() {
    const debugPanel = document.createElement("section");
    debugPanel.className = "af-ribbon-debug-panel";
    debugPanel.dataset.afDebugPanel = "";
    debugPanel.setAttribute("aria-label", "Debug output");
    debugPanel.addEventListener("pointerdown", bringDebugPanelToFrontFromEvent, true);
    debugPanel.addEventListener("mousedown", bringDebugPanelToFrontFromEvent, true);

    const debugHeader = appendElement(debugPanel, "div", "af-ribbon-debug-header");
    debugHeader.dataset.afDebugDragSurface = "";
    const debugTitle = appendElement(debugHeader, "div", "af-ribbon-debug-title");
    debugTitle.textContent = "Debug";
    const debugActions = appendElement(debugHeader, "div", "af-ribbon-debug-actions");
    appendButton(debugActions, "Copy", "afDebugPanelCopy");
    appendButton(debugActions, "Close", "afDebugPanelClose");
    const debug = appendElement(debugPanel, "pre", "af-ribbon-debug");
    debug.dataset.afDebug = "";
    const debugResizeHandle = appendElement(debugPanel, "button", "af-ribbon-debug-resize-handle");
    debugResizeHandle.type = "button";
    debugResizeHandle.dataset.afDebugResizeHandle = "";
    debugResizeHandle.setAttribute("aria-label", "Resize debug panel");

    debugPanel.querySelector("[data-af-debug-panel-copy]").addEventListener("click", copyDebug);
    debugPanel.querySelector("[data-af-debug-panel-close]").addEventListener("click", closeDebug);
    debugPanel.querySelector("[data-af-debug-drag-surface]").addEventListener("pointerdown", beginDebugPanelDrag);
    debugPanel.querySelector("[data-af-debug-drag-surface]").addEventListener("mousedown", beginDebugPanelDrag);
    debugPanel.querySelector("[data-af-debug-resize-handle]").addEventListener("pointerdown", beginDebugPanelResize);
    debugPanel.querySelector("[data-af-debug-resize-handle]").addEventListener("mousedown", beginDebugPanelResize);

    return debugPanel;
  }

  function createAccountControl(parent) {
    const accountWrap = appendElement(parent, "div", "af-account-wrap");
    const account = appendElement(accountWrap, "button", "af-account-button");
    account.type = "button";
    account.dataset.afAccount = "";
    account.setAttribute("aria-label", "2000NL account");
    account.setAttribute("aria-haspopup", "menu");
    account.setAttribute("aria-expanded", "false");
    const accountMenu = appendElement(accountWrap, "div", "af-account-popover");
    accountMenu.dataset.afAccountMenu = "";
    const accountCopy = appendElement(accountMenu, "div", "af-account-popover-copy");
    accountCopy.dataset.afAccountCopy = "";
    const accountAction = appendButton(accountMenu, "Connect 2000NL", "afAccountAction");
    accountAction.className = "af-account-popover-action";
    account.addEventListener("click", toggleAccountMenu);
    accountAction.addEventListener("click", () => {
      state.accountMenuOpen = false;
      if (state.accountStatus === "signed-in") {
        disconnectTwoThousandNlAccount();
      } else {
        connectTwoThousandNlAccount();
      }
    });
    return accountWrap;
  }

  function mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel) {
    if (debugPanel.parentElement !== container) {
      container.appendChild(debugPanel);
    }

    if (ribbonPanel.parentElement !== container) {
      container.appendChild(ribbonPanel);
    }

    if (!state.selectedWord) {
      dictionaryPanel?.remove();
      return;
    }

    if (dictionaryPanel && dictionaryPanel.parentElement !== container) {
      container.appendChild(dictionaryPanel);
    }
  }

  function removeWorkspace() {
    document.documentElement.classList.remove(
      "af-shadowing-workspace",
      "af-shadowing-enabled",
      "af-shadowing-hide-transcript",
    );
    document.getElementById(ROOT_ID)?.remove();
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

  function bugIconSvg() {
    return [
      '<svg class="af-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '<path d="M8 2l2 2"/>',
      '<path d="M16 2l-2 2"/>',
      '<path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
      '<path d="M12 21a6 6 0 0 1-6-6v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4a6 6 0 0 1-6 6Z"/>',
      '<path d="M12 11v10"/>',
      '<path d="M6 13H3"/>',
      '<path d="M21 13h-3"/>',
      '<path d="M6.7 17.2 4.4 19.5"/>',
      '<path d="m17.3 17.2 2.3 2.3"/>',
      '</svg>',
    ].join("");
  }

  function iconSvg(kind) {
    const paths = {
      prev: [
        '<path d="m15 18-6-6 6-6"/>',
        '<path d="M20 12H9"/>',
      ],
      next: [
        '<path d="m9 18 6-6-6-6"/>',
        '<path d="M4 12h11"/>',
      ],
      replay: [
        '<path d="M3 12a9 9 0 1 0 3-6.7"/>',
        '<path d="M3 3v6h6"/>',
        '<path d="M12 8v4l3 2"/>',
      ],
      account: [
        '<path d="M20 21a8 8 0 0 0-16 0"/>',
        '<circle cx="12" cy="7" r="4"/>',
      ],
      "account-connected": [
        '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>',
        '<circle cx="9.5" cy="7" r="4"/>',
        '<path d="m16 11 2 2 4-4"/>',
      ],
      close: [
        '<path d="M18 6 6 18"/>',
        '<path d="m6 6 12 12"/>',
      ],
      expand: [
        '<path d="m6 9 6 6 6-6"/>',
      ],
      collapse: [
        '<path d="m18 15-6-6-6 6"/>',
      ],
      translate: [
        '<path d="m5 8 6 6"/>',
        '<path d="m4 14 6-6 2-3"/>',
        '<path d="M2 5h12"/>',
        '<path d="M7 2h1"/>',
        '<path d="m22 22-5-10-5 10"/>',
        '<path d="M14 18h6"/>',
      ],
      theme: [
        '<circle cx="12" cy="12" r="4"/>',
        '<path d="M12 2v2"/>',
        '<path d="M12 20v2"/>',
        '<path d="m4.93 4.93 1.41 1.41"/>',
        '<path d="m17.66 17.66 1.41 1.41"/>',
        '<path d="M2 12h2"/>',
        '<path d="M20 12h2"/>',
        '<path d="m6.34 17.66-1.41 1.41"/>',
        '<path d="m19.07 4.93-1.41 1.41"/>',
      ],
    }[kind] || [];
    return [
      '<svg class="af-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      ...paths,
      '</svg>',
    ].join("");
  }

  function render() {
    renderToggle();
    if (!state.learningEnabled) {
      clearTimingOperationPoll();
      removeWorkspace();
      return;
    }

    const { dictionaryPanel, ribbonPanel, debugPanel } = ensureWorkspace();
    applyPanelLayout(ribbonPanel, dictionaryPanel);
    renderRibbon(ribbonPanel);
    renderDebugPanel(debugPanel);
    if (dictionaryPanel) {
      renderDictionary(dictionaryPanel);
    }
    document.documentElement.classList.toggle("af-shadowing-hide-transcript", !state.textVisible);
  }

  function renderDebugPanel(debugPanel) {
    if (!(debugPanel instanceof HTMLElement)) return;
    const debug = debugPanel.querySelector("[data-af-debug]");
    const debugPanelCopy = debugPanel.querySelector("[data-af-debug-panel-copy]");

    debugPanel.classList.toggle("is-open", state.debugVisible);
    debugPanel.classList.toggle("is-front", state.debugPanelInFront);
    debugPanel.classList.toggle("is-behind", !state.debugPanelInFront);
    if (debugPanelCopy) {
      debugPanelCopy.textContent = state.debugCopied ? "Copied" : "Copy";
    }
    if (debug) {
      debug.textContent = state.debugVisible ? formatDebugState() : "";
    }
    applyDebugPanelGeometry(debugPanel);
    applyDebugPanelLayer(debugPanel);
  }

  function renderRibbon(panel) {
    const track = panel.querySelector("[data-af-track]");
    const sourceToggle = panel.querySelector("[data-af-source-toggle]");
    const sourceMenu = panel.querySelector("[data-af-source-menu]");
    const count = panel.querySelector("[data-af-count]");
    const mode = panel.querySelector("[data-af-mode]");
    const list = panel.querySelector("[data-af-ribbon-list]");
    const error = panel.querySelector("[data-af-error]");
    const controls = panel.querySelector(".af-ribbon-controls");
    const hints = panel.querySelector(".af-shortcut-hints");
    const toggle = panel.querySelector("[data-af-toggle]");
    const modeShadow = panel.querySelector("[data-af-mode-shadow]");
    const modeRecall = panel.querySelector("[data-af-mode-recall]");
    const phraseTranslation = panel.querySelector("[data-af-phrase-translation]");
    const account = panel.querySelector("[data-af-account]");
    const accountMenu = panel.querySelector("[data-af-account-menu]");
    const accountCopy = panel.querySelector("[data-af-account-copy]");
    const accountAction = panel.querySelector("[data-af-account-action]");
    const themeToggle = panel.querySelector("[data-af-theme-toggle]");
    const utilityToggle = panel.querySelector("[data-af-utility-toggle]");
    const utilityMenu = panel.querySelector("[data-af-utility-menu]");
    const learnerTextSmaller = panel.querySelector("[data-af-learner-text-smaller]");
    const learnerTextReset = panel.querySelector("[data-af-learner-text-reset]");
    const learnerTextLarger = panel.querySelector("[data-af-learner-text-larger]");
    const transparencyLower = panel.querySelector("[data-af-transparency-lower]");
    const transparencyReset = panel.querySelector("[data-af-transparency-reset]");
    const transparencyHigher = panel.querySelector("[data-af-transparency-higher]");
    const autoPauseToggle = panel.querySelector("[data-af-auto-pause-toggle]");
    const layoutLockToggle = panel.querySelector("[data-af-layout-lock-toggle]");
    const layoutReset = panel.querySelector("[data-af-layout-reset]");
    const debugToggle = panel.querySelector("[data-af-debug-toggle]");
    const debugCopy = panel.querySelector("[data-af-debug-copy]");
    const diagnosticsClear = panel.querySelector("[data-af-diagnostics-clear]");
    const refreshCache = panel.querySelector("[data-af-refresh-cache]");
    const markIssue = panel.querySelector("[data-af-mark-issue]");
    const playbackButtons = [
      panel.querySelector("[data-af-prev]"),
      panel.querySelector("[data-af-replay]"),
      panel.querySelector("[data-af-next]"),
    ].filter(Boolean);
    const displayButtons = [toggle, phraseTranslation].filter(Boolean);
    const hasPhrases = state.phrases.length > 0;
    const isEmpty = !state.loading && !hasPhrases;
    const readiness = practiceReadiness();
    const currentPhraseTranslation = phraseTranslationState(state.phrases[state.currentIndex], state.currentIndex);

    renderSourceSelector(track, sourceToggle, sourceMenu);
    panel.classList.toggle("is-empty", isEmpty);
    panel.classList.toggle("is-recall", state.practiceMode === "recall");
    controls.classList.toggle("is-hidden", isEmpty);
    hints.classList.toggle("is-hidden", isEmpty);
    count.textContent = hasPhrases
      ? `${state.currentIndex + 1} / ${state.phrases.length}`
      : state.loading ? "Loading" : "0 / 0";
    mode.textContent = "";
    mode.hidden = true;
    mode.classList.toggle("is-guided", state.guidedMode);
    renderAccountControl(account, accountMenu, accountCopy, accountAction);
    const themeLabel = `Theme: ${state.themePreference}`;
    themeToggle.innerHTML = `${iconSvg("theme")}<span class="af-sr-only">${themeLabel}</span>`;
    themeToggle.setAttribute("aria-label", themeLabel);
    themeToggle.title = themeLabel;
    toggle.textContent = state.practiceMode === "recall"
      ? state.textVisible ? "Hide Original" : "Reveal Original"
      : state.textVisible ? "Hide Original" : "Show Original";
    toggle.classList.toggle("is-active", state.textVisible);
    modeShadow.classList.toggle("is-active", state.practiceMode === "shadow");
    modeRecall.classList.toggle("is-active", state.practiceMode === "recall");
    modeRecall.disabled = false;
    modeRecall.title = phraseTranslationControlTitle(currentPhraseTranslation);
    modeShadow.setAttribute("aria-pressed", state.practiceMode === "shadow" ? "true" : "false");
    modeRecall.setAttribute("aria-pressed", state.practiceMode === "recall" ? "true" : "false");
    phraseTranslation.textContent = state.phraseTranslationVisible ? "Hide Translation" : "Show Translation";
    phraseTranslation.classList.toggle("is-active", state.phraseTranslationVisible);
    phraseTranslation.hidden = isEmpty;
    phraseTranslation.disabled = state.loading || !hasPhrases;
    phraseTranslation.title = phraseTranslationControlTitle(currentPhraseTranslation);
    utilityToggle.setAttribute("aria-expanded", state.utilityMenuOpen ? "true" : "false");
    utilityToggle.classList.toggle("is-active", state.utilityMenuOpen);
    utilityMenu.classList.toggle("is-open", state.utilityMenuOpen);
    positionUtilityMenu(panel, utilityMenu);
    renderDisplayPreferenceControls({
      learnerTextSmaller,
      learnerTextReset,
      learnerTextLarger,
      transparencyLower,
      transparencyReset,
      transparencyHigher,
      autoPauseToggle,
      layoutLockToggle,
      layoutReset,
    });
    debugToggle.textContent = state.debugVisible ? "Hide Debug" : "Debug";
    debugCopy.textContent = state.debugCopied ? "Copied" : "Copy Debug";
    diagnosticsClear.textContent = state.diagnosticsClearedAt ? "Diagnostics Cleared" : "Clear Diagnostics";
    refreshCache.textContent = state.cacheRefreshRequested ? "Refreshing" : "Refresh Cache";
    markIssue.textContent = state.issueCopied ? "Issue Copied" : "Mark Issue";
    error.textContent = state.error;

    playbackButtons.forEach((button) => {
      button.hidden = isEmpty;
      button.disabled = state.loading || !hasPhrases;
    });
    displayButtons.forEach((button) => {
      button.hidden = isEmpty;
      button.disabled = state.loading || !hasPhrases;
    });
    refreshCache.disabled = state.loading || !getSelectedPracticeSource();
    diagnosticsClear.disabled = state.loading;
    markIssue.disabled = state.loading;
    sourceToggle.dataset.afReadiness = readiness.state;

    clearElement(list);
    if (state.loading) {
      appendRibbonMessage(list, "Loading captions...");
      return;
    }
    if (!hasPhrases) {
      appendRibbonMessage(
        list,
        state.tracks.length
          ? "No timed phrases available for this caption source."
          : "This video has no captions, so phrase practice cannot start.",
      );
      return;
    }

    list.classList.add("is-compact");
    appendPhraseRow(list, state.phrases[state.currentIndex], state.currentIndex);
  }

  function setPracticeMode(mode) {
    if (state.practiceMode === "shadow") {
      state.shadowTextVisible = state.textVisible;
    }
    state.practiceMode = mode === "recall" ? "recall" : "shadow";
    if (state.practiceMode === "recall") {
      state.textVisible = false;
      state.phraseTranslationVisible = true;
      ensureCurrentPhraseTranslation();
    } else {
      state.textVisible = state.shadowTextVisible;
    }
    render();
  }

  function togglePhraseTranslation() {
    state.phraseTranslationVisible = !state.phraseTranslationVisible;
    if (state.phraseTranslationVisible) {
      ensureCurrentPhraseTranslation();
    }
    render();
  }

  function phraseTranslationControlTitle(translation) {
    if (translation?.status === "ready") return "Show phrase translation";
    if (translation?.status === "loading") return "Phrase translation is loading";
    if (state.accountStatus !== "signed-in") return "Connect 2000NL to translate phrases";
    if (translation?.status === "failed") return translation.error || "Phrase translation failed";
    return "Show phrase translation";
  }

  function renderDisplayPreferenceControls(controls) {
    const learnerTextScale = state.displayPreferences.appearance.learnerTextScale;
    const panelAlpha = state.displayPreferences.appearance.panelBackgroundAlpha;
    const learnerPercent = Math.round(learnerTextScale * 100);
    const alphaPercent = Math.round(panelAlpha * 100);

    controls.learnerTextSmaller.disabled = learnerTextScale <= 0.85;
    controls.learnerTextLarger.disabled = learnerTextScale >= 1.35;
    controls.learnerTextReset.disabled = learnerTextScale === 1;
    controls.learnerTextSmaller.title = `Subtitle text size: ${learnerPercent}%`;
    controls.learnerTextLarger.title = `Subtitle text size: ${learnerPercent}%`;
    controls.learnerTextReset.title = `Reset subtitle text size (${learnerPercent}%)`;

    controls.transparencyLower.disabled = panelAlpha <= 0.65;
    controls.transparencyHigher.disabled = panelAlpha >= 1;
    controls.transparencyReset.disabled = panelAlpha === 0.92;
    controls.transparencyLower.title = `Panel background opacity: ${alphaPercent}%`;
    controls.transparencyHigher.title = `Panel background opacity: ${alphaPercent}%`;
    controls.transparencyReset.title = `Reset panel background opacity (${alphaPercent}%)`;

    controls.autoPauseToggle.textContent = state.autoPause ? "Auto-pause On" : "Auto-pause Off";
    controls.autoPauseToggle.classList.toggle("is-active", state.autoPause);
    controls.autoPauseToggle.setAttribute("aria-pressed", state.autoPause ? "true" : "false");
    controls.autoPauseToggle.title = state.autoPause
      ? "Pause automatically at phrase boundaries"
      : "Let YouTube continue playing after captions load";

    controls.layoutLockToggle.textContent = state.displayPreferences.layout.locked ? "Unlock" : "Lock";
    controls.layoutLockToggle.title = state.displayPreferences.layout.locked
      ? "Unlock panel layout editing"
      : "Lock panel layout editing";
    controls.layoutReset.disabled = !hasCustomPanelLayout();
    controls.layoutReset.title = "Reset panel positions and sizes";
  }

  function positionUtilityMenu(panel, utilityMenu) {
    if (!state.utilityMenuOpen) {
      utilityMenu.classList.remove("is-below");
      return;
    }

    window.requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const menuHeight = utilityMenu.getBoundingClientRect().height || utilityMenu.scrollHeight || 0;
      utilityMenu.classList.toggle("is-below", panelRect.top < menuHeight + 12);
    });
  }

  function hasCustomPanelLayout() {
    const layout = state.displayPreferences.layout;
    return !layout.locked
      || panelHasGeometry(layout.phraseRibbon)
      || panelHasGeometry(layout.dictionaryPanel)
      || panelHasGeometry(layout.debugPanel)
      || layout.zOrder !== "phraseRibbon";
  }

  function panelHasGeometry(geometry) {
    return ["x", "y", "width", "height"].some((key) => geometry?.[key] !== null);
  }

  function toggleLayoutLock(event) {
    event.preventDefault();
    event.stopPropagation();
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        locked: !preferences.layout.locked,
      },
    }));
    render();
  }

  function resetPanelLayout(event) {
    event.preventDefault();
    event.stopPropagation();
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: defaultPanelLayout(),
    }));
    render();
  }

  function defaultPanelLayout() {
    return {
      locked: true,
      phraseRibbon: { x: null, y: null, width: null, height: null },
      dictionaryPanel: { x: null, y: null, width: null, height: null },
      debugPanel: { x: null, y: null, width: null, height: null },
      zOrder: "phraseRibbon",
    };
  }

  function applyPanelLayout(ribbonPanel, dictionaryPanel) {
    applyPanelGeometry(ribbonPanel, "phraseRibbon");
    if (dictionaryPanel) {
      applyPanelGeometry(dictionaryPanel, "dictionaryPanel");
    }
  }

  function applyPanelGeometry(panel, panelKey, overrideGeometry = null) {
    if (!(panel instanceof HTMLElement)) return;
    const layout = state.displayPreferences.layout;
    const geometry = clampPanelGeometry(panelKey, overrideGeometry || layout[panelKey]);
    const hasGeometry = panelHasGeometry(geometry);
    panel.classList.toggle("is-layout-unlocked", !layout.locked);
    panel.classList.toggle("is-floating", hasGeometry);
    panel.style.zIndex = layout.zOrder === panelKey ? "1002" : "1001";

    if (!hasGeometry) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.width = "";
      panel.style.height = "";
      return;
    }

    panel.style.left = geometry.x === null ? "" : `${geometry.x}px`;
    panel.style.top = geometry.y === null ? "" : `${geometry.y}px`;
    panel.style.width = geometry.width === null ? "" : `${geometry.width}px`;
    panel.style.height = panelKey === "phraseRibbon" || geometry.height === null ? "" : `${geometry.height}px`;
  }

  function applyDebugPanelGeometry(panel, overrideGeometry = null) {
    if (!(panel instanceof HTMLElement)) return;
    const geometry = clampDebugPanelGeometry(overrideGeometry || state.displayPreferences.layout.debugPanel);
    if (!panelHasGeometry(geometry)) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      panel.style.bottom = "";
      panel.style.width = "";
      panel.style.height = "";
      return;
    }

    panel.style.left = `${geometry.x}px`;
    panel.style.top = `${geometry.y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${geometry.width}px`;
    panel.style.height = `${geometry.height}px`;
  }

  function applyDebugPanelLayer(panel = debugPanelElement()) {
    if (!(panel instanceof HTMLElement)) return;
    panel.style.zIndex = state.debugPanelInFront ? "1003" : "1000";
  }

  function bringDebugPanelToFrontFromEvent(event) {
    if (event.type === "mousedown" && event.button !== 0) return;
    bringDebugPanelToFront();
  }

  function handleShadowLayerFocus(event) {
    if (event.type === "mousedown" && event.button !== 0) return;
    if (!state.debugVisible) return;

    const debugPanel = debugPanelElement();
    if (!(debugPanel instanceof HTMLElement)) return;

    const x = event.clientX;
    const y = event.clientY;
    if (rectContainsPoint(debugPanel.getBoundingClientRect(), x, y)) {
      bringDebugPanelToFront();
      return;
    }

    const ribbonPanel = panelElement("phraseRibbon");
    const dictionaryPanel = panelElement("dictionaryPanel");
    const clickedMainPanel = [ribbonPanel, dictionaryPanel].some((panel) => (
      panel instanceof HTMLElement && rectContainsPoint(panel.getBoundingClientRect(), x, y)
    ));
    if (clickedMainPanel) {
      bringDebugPanelBehind();
    }
  }

  function bringDebugPanelBehindFromPanel(event) {
    if (event.type === "mousedown" && event.button !== 0) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.some((element) => element instanceof Element && element.matches?.("[data-af-debug-panel], [data-af-debug-panel] *"))) {
      return;
    }
    bringDebugPanelBehind();
  }

  function bringDebugPanelToFront() {
    if (state.debugPanelInFront) return;
    state.debugPanelInFront = true;
    const panel = debugPanelElement();
    panel?.classList.add("is-front");
    panel?.classList.remove("is-behind");
    applyDebugPanelLayer(panel);
  }

  function bringDebugPanelBehind() {
    if (!state.debugPanelInFront) return;
    state.debugPanelInFront = false;
    const panel = debugPanelElement();
    panel?.classList.remove("is-front");
    panel?.classList.add("is-behind");
    applyDebugPanelLayer(panel);
  }

  function beginDebugPanelDrag(event) {
    if (event.type === "mousedown" && event.button !== 0) return;
    if (isInteractiveDragTarget(event.target)) return;
    const panel = debugPanelElement();
    if (!(panel instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation();
    bringDebugPanelToFront();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startGeometry = clampDebugPanelGeometry({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
    let nextGeometry = startGeometry;
    const ownerDocument = panel.ownerDocument || document;
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";
    const cancelEventName = event.type === "mousedown" ? "mouseup" : "pointercancel";

    const onMove = (moveEvent) => {
      nextGeometry = clampDebugPanelGeometry({
        ...startGeometry,
        x: startGeometry.x + moveEvent.clientX - startX,
        y: startGeometry.y + moveEvent.clientY - startY,
      });
      applyDebugPanelGeometry(panel, nextGeometry);
    };
    const onUp = () => {
      ownerDocument.removeEventListener(moveEventName, onMove, true);
      ownerDocument.removeEventListener(upEventName, onUp, true);
      ownerDocument.removeEventListener(cancelEventName, onUp, true);
      saveDebugPanelGeometry(nextGeometry);
    };

    ownerDocument.addEventListener(moveEventName, onMove, true);
    ownerDocument.addEventListener(upEventName, onUp, true);
    ownerDocument.addEventListener(cancelEventName, onUp, true);
  }

  function beginDebugPanelResize(event) {
    if (event.type === "mousedown" && event.button !== 0) return;
    const panel = debugPanelElement();
    if (!(panel instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation();
    bringDebugPanelToFront();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startGeometry = clampDebugPanelGeometry({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
    let nextGeometry = startGeometry;
    const ownerDocument = panel.ownerDocument || document;
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";
    const cancelEventName = event.type === "mousedown" ? "mouseup" : "pointercancel";

    const onMove = (moveEvent) => {
      nextGeometry = clampDebugPanelGeometry({
        ...startGeometry,
        width: startGeometry.width + moveEvent.clientX - startX,
        height: startGeometry.height + moveEvent.clientY - startY,
      });
      applyDebugPanelGeometry(panel, nextGeometry);
    };
    const onUp = () => {
      ownerDocument.removeEventListener(moveEventName, onMove, true);
      ownerDocument.removeEventListener(upEventName, onUp, true);
      ownerDocument.removeEventListener(cancelEventName, onUp, true);
      saveDebugPanelGeometry(nextGeometry);
    };

    ownerDocument.addEventListener(moveEventName, onMove, true);
    ownerDocument.addEventListener(upEventName, onUp, true);
    ownerDocument.addEventListener(cancelEventName, onUp, true);
  }

  function installPanelGestureFallback() {
    if (panelGestureFallbackInstalled) return;
    panelGestureFallbackInstalled = true;
    document.addEventListener("pointerdown", beginPanelGestureFromHost, true);
    document.addEventListener("mousedown", beginPanelGestureFromHost, true);
  }

  function beginPanelGestureFromHost(event) {
    if (state.displayPreferences.layout.locked) return;
    if (event.type === "mousedown" && event.button !== 0) return;
    if (event.target !== document.getElementById(ROOT_ID)) return;

    const gesture = resolvePanelGestureAt(event.clientX, event.clientY);
    if (!gesture) return;
    if (gesture.kind === "resize") {
      beginPanelResize(event, gesture.panelKey);
    } else {
      beginPanelDrag(event, gesture.panelKey, { fromSurface: gesture.fromSurface });
    }
  }

  function resolvePanelGestureAt(x, y) {
    const layout = state.displayPreferences.layout;
    const panelKeys = layout.zOrder === "dictionaryPanel"
      ? ["dictionaryPanel", "phraseRibbon"]
      : ["phraseRibbon", "dictionaryPanel"];

    for (const panelKey of panelKeys) {
      const panel = panelElement(panelKey);
      if (!(panel instanceof HTMLElement) || !rectContainsPoint(panel.getBoundingClientRect(), x, y)) continue;

      const resizeHandle = panel.querySelector("[data-af-resize-handle]");
      if (resizeHandle instanceof HTMLElement && rectContainsPoint(resizeHandle.getBoundingClientRect(), x, y)) {
        return { kind: "resize", panelKey };
      }

      const dragHandle = panel.querySelector("[data-af-drag-handle]");
      if (dragHandle instanceof HTMLElement && rectContainsPoint(dragHandle.getBoundingClientRect(), x, y)) {
        return { kind: "drag", panelKey, fromSurface: false };
      }

      const dragSurface = panel.querySelector("[data-af-drag-surface]");
      if (dragSurface instanceof HTMLElement && rectContainsPoint(dragSurface.getBoundingClientRect(), x, y)) {
        const interactive = Array.from(dragSurface.querySelectorAll("button:not(.af-panel-drag-handle), a, input, select, textarea"));
        if (interactive.some((element) => rectContainsPoint(element.getBoundingClientRect(), x, y))) return null;
        return { kind: "drag", panelKey, fromSurface: true };
      }
    }

    return null;
  }

  function rectContainsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function beginPanelDrag(event, forcedPanelKey = "", options = {}) {
    const panelKey = forcedPanelKey || event.currentTarget?.dataset?.afDragHandle || event.currentTarget?.dataset?.afDragSurface;
    if (!panelKey || state.displayPreferences.layout.locked) return;
    if (event.type === "mousedown" && event.button !== 0) return;
    if ((options.fromSurface || event.currentTarget?.dataset?.afDragSurface) && isInteractiveDragTarget(event.target)) return;
    const panel = panelElement(panelKey);
    if (!(panel instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startGeometry = {
      x: rect.left,
      y: rect.top,
      width: panelKey === "dictionaryPanel" && !panelHasGeometry(state.displayPreferences.layout.dictionaryPanel)
        ? Math.min(rect.width, 520)
        : rect.width,
      height: panelKey === "phraseRibbon" ? null : rect.height,
    };
    let nextGeometry = startGeometry;
    bringPanelToFront(panelKey, false);
    const ownerDocument = panel.ownerDocument || document;
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";
    const cancelEventName = event.type === "mousedown" ? "mouseup" : "pointercancel";

    const onMove = (moveEvent) => {
      const x = startGeometry.x + moveEvent.clientX - startX;
      const y = startGeometry.y + moveEvent.clientY - startY;
      nextGeometry = clampPanelGeometry(panelKey, {
        ...startGeometry,
        x,
        y,
      });
      applyPanelGeometry(panel, panelKey, nextGeometry);
    };
    const onUp = () => {
      ownerDocument.removeEventListener(moveEventName, onMove, true);
      ownerDocument.removeEventListener(upEventName, onUp, true);
      ownerDocument.removeEventListener(cancelEventName, onUp, true);
      savePanelGeometry(panelKey, nextGeometry);
    };

    ownerDocument.addEventListener(moveEventName, onMove, true);
    ownerDocument.addEventListener(upEventName, onUp, true);
    ownerDocument.addEventListener(cancelEventName, onUp, true);
  }

  function isInteractiveDragTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button:not(.af-panel-drag-handle), a, input, select, textarea"));
  }

  function beginPanelResize(event, forcedPanelKey = "") {
    const panelKey = forcedPanelKey || event.currentTarget?.dataset?.afResizeHandle;
    if (!panelKey || state.displayPreferences.layout.locked) return;
    if (event.type === "mousedown" && event.button !== 0) return;
    const panel = panelElement(panelKey);
    if (!(panel instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startGeometry = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: panelKey === "phraseRibbon" ? null : rect.height,
    };
    let nextGeometry = startGeometry;
    bringPanelToFront(panelKey, false);
    const ownerDocument = panel.ownerDocument || document;
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";
    const cancelEventName = event.type === "mousedown" ? "mouseup" : "pointercancel";

    const onMove = (moveEvent) => {
      nextGeometry = clampPanelGeometry(panelKey, {
        ...startGeometry,
        width: startGeometry.width + moveEvent.clientX - startX,
        height: panelKey === "phraseRibbon" ? null : startGeometry.height + moveEvent.clientY - startY,
      });
      applyPanelGeometry(panel, panelKey, nextGeometry);
    };
    const onUp = () => {
      ownerDocument.removeEventListener(moveEventName, onMove, true);
      ownerDocument.removeEventListener(upEventName, onUp, true);
      ownerDocument.removeEventListener(cancelEventName, onUp, true);
      savePanelGeometry(panelKey, nextGeometry);
    };

    ownerDocument.addEventListener(moveEventName, onMove, true);
    ownerDocument.addEventListener(upEventName, onUp, true);
    ownerDocument.addEventListener(cancelEventName, onUp, true);
  }

  function clampPanelGeometry(panelKey, geometry) {
    const margin = 8;
    const minWidth = panelKey === "phraseRibbon" ? Math.min(360, window.innerWidth - margin * 2) : Math.min(320, window.innerWidth - margin * 2);
    const minHeight = panelKey === "dictionaryPanel" ? 220 : null;
    const maxWidth = panelKey === "dictionaryPanel"
      ? Math.min(640, Math.max(minWidth, window.innerWidth - margin * 2))
      : Math.max(minWidth, window.innerWidth - margin * 2);
    const width = geometry?.width === null
      ? null
      : clampNumber(geometry?.width, minWidth, maxWidth, minWidth);
    const height = panelKey === "phraseRibbon" || geometry?.height === null
      ? null
      : clampNumber(geometry?.height, minHeight, Math.max(minHeight, window.innerHeight - margin * 2), minHeight);
    const maxX = window.innerWidth - (width || minWidth) - margin;
    const maxY = window.innerHeight - (height || minHeight || 80) - margin;

    return {
      x: geometry?.x === null ? null : clampNumber(geometry?.x, margin, Math.max(margin, maxX), margin),
      y: geometry?.y === null ? null : clampNumber(geometry?.y, margin, Math.max(margin, maxY), margin),
      width,
      height,
    };
  }

  function clampDebugPanelGeometry(geometry) {
    const margin = 8;
    const minWidth = Math.min(320, window.innerWidth - margin * 2);
    const minHeight = Math.min(220, window.innerHeight - margin * 2);
    const maxWidth = Math.max(minWidth, window.innerWidth - margin * 2);
    const maxHeight = Math.max(minHeight, window.innerHeight - margin * 2);
    const fallbackWidth = Math.min(560, maxWidth);
    const fallbackHeight = Math.min(460, maxHeight);
    const width = geometry?.width === null
      ? null
      : clampNumber(geometry?.width, minWidth, maxWidth, fallbackWidth);
    const height = geometry?.height === null
      ? null
      : clampNumber(geometry?.height, minHeight, maxHeight, fallbackHeight);
    const maxX = window.innerWidth - (width || fallbackWidth) - margin;
    const maxY = window.innerHeight - (height || fallbackHeight) - margin;

    return {
      x: geometry?.x === null ? null : clampNumber(geometry?.x, margin, Math.max(margin, maxX), margin),
      y: geometry?.y === null ? null : clampNumber(geometry?.y, margin, Math.max(margin, maxY), margin),
      width,
      height,
    };
  }

  function savePanelGeometry(panelKey, geometry) {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        [panelKey]: clampPanelGeometry(panelKey, geometry),
        zOrder: panelKey,
      },
    }));
    render();
  }

  function saveDebugPanelGeometry(geometry) {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      layout: {
        ...preferences.layout,
        debugPanel: clampDebugPanelGeometry(geometry),
      },
    }));
    render();
  }

  function bringPanelToFront(panelKey, persist = true) {
    state.displayPreferences.layout.zOrder = panelKey;
    if (persist) {
      updateDisplayPreferences((preferences) => ({
        ...preferences,
        layout: {
          ...preferences.layout,
          zOrder: panelKey,
        },
      }));
    }
  }

  function panelElement(panelKey) {
    const root = document.getElementById(ROOT_ID)?.shadowRoot;
    const id = panelKey === "dictionaryPanel" ? DICTIONARY_PANEL_ID : RIBBON_PANEL_ID;
    return root?.getElementById(id) || null;
  }

  function debugPanelElement() {
    const root = document.getElementById(ROOT_ID)?.shadowRoot;
    return root?.querySelector("[data-af-debug-panel]") || null;
  }

  function toggleUtilityMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    state.utilityMenuOpen = !state.utilityMenuOpen;
    state.lastMenuTrigger = state.utilityMenuOpen ? "utility" : null;
    if (state.utilityMenuOpen) {
      state.accountMenuOpen = false;
      state.sourceMenuOpen = false;
    }
    render();
  }

  function toggleAccountMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    state.accountMenuOpen = !state.accountMenuOpen;
    state.lastMenuTrigger = state.accountMenuOpen ? "account" : null;
    if (state.accountMenuOpen) {
      state.utilityMenuOpen = false;
      state.sourceMenuOpen = false;
    }
    render();
  }

  function cycleThemePreference(event) {
    event.preventDefault();
    event.stopPropagation();
    state.themePreference = {
      system: "light",
      light: "dark",
      dark: "system",
    }[state.themePreference] || "system";
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      theme: state.themePreference,
    }));
    render();
  }

  function adjustLearnerTextScale(delta) {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      appearance: {
        ...preferences.appearance,
        learnerTextScale: clampNumber(preferences.appearance.learnerTextScale + delta, 0.85, 1.35, 1),
      },
    }));
    render();
  }

  function resetLearnerTextScale() {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      appearance: {
        ...preferences.appearance,
        learnerTextScale: 1,
      },
    }));
    render();
  }

  function adjustPanelBackgroundAlpha(delta) {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      appearance: {
        ...preferences.appearance,
        panelBackgroundAlpha: clampNumber(preferences.appearance.panelBackgroundAlpha + delta, 0.65, 1, 0.92),
      },
    }));
    render();
  }

  function resetPanelBackgroundAlpha() {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      appearance: {
        ...preferences.appearance,
        panelBackgroundAlpha: 0.92,
      },
    }));
    render();
  }

  function applyThemeAttributes() {
    const preference = state.themePreference || "system";
    document.documentElement.dataset.afTheme = preference;
    const root = document.getElementById(ROOT_ID);
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

  function toggleAllExamples(event) {
    event.preventDefault();
    event.stopPropagation();
    state.examplesExpanded = !state.examplesExpanded;
    state.exampleExpansionOverrides = {};
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      examplesExpanded: state.examplesExpanded,
    }));
    render();
  }

  function toggleCardExamples(cardId) {
    if (!cardId) return;
    state.exampleExpansionOverrides = {
      ...state.exampleExpansionOverrides,
      [cardId]: !exampleSectionExpanded(cardId),
    };
    render();
  }

  function exampleSectionExpanded(cardId) {
    if (
      cardId
      && Object.prototype.hasOwnProperty.call(state.exampleExpansionOverrides, cardId)
    ) {
      return state.exampleExpansionOverrides[cardId] === true;
    }
    return state.examplesExpanded;
  }

  function toggleCardTranslation(card) {
    if (!card?.id || !state.selectedWord) return;
    const currentlyVisible = state.visibleTranslationsByCardId[card.id] === true;
    state.visibleTranslationsByCardId = {
      ...state.visibleTranslationsByCardId,
      [card.id]: !currentlyVisible,
    };
    if (currentlyVisible) {
      render();
      return;
    }

    if (cardHasLookupTranslations(card)) {
      render();
      return;
    }

    const cached = state.selectedWord.translationsByCardId?.[card.id];
    if (cached) {
      render();
      return;
    }

    requestDictionaryCardTranslation(card);
  }

  function closeOpenMenus() {
    if (!state.utilityMenuOpen && !state.accountMenuOpen && !state.sourceMenuOpen) return false;
    const trigger = state.lastMenuTrigger || (state.sourceMenuOpen ? "source" : state.utilityMenuOpen ? "utility" : "account");
    state.utilityMenuOpen = false;
    state.accountMenuOpen = false;
    state.sourceMenuOpen = false;
    state.lastMenuTrigger = null;
    render();
    requestAnimationFrame(() => focusMenuTrigger(trigger));
    return true;
  }

  function focusMenuTrigger(trigger) {
    const host = document.getElementById(ROOT_ID);
    const root = host?.shadowRoot;
    const selector = {
      source: "[data-af-source-toggle]",
      utility: "[data-af-utility-toggle]",
      account: "[data-af-account]",
    }[trigger];
    if (!root || !selector) return;
    root.querySelector(selector)?.focus?.();
  }

  function onDocumentPointerDown(event) {
    if (!state.learningEnabled) return;
    if (isMenuInteractionEvent(event)) return;
    closeOpenMenus();
  }

  function isMenuInteractionEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    return path.some((element) => (
      element instanceof Element
      && element.matches?.([
        "[data-af-source-toggle]",
        "[data-af-source-menu]",
        "[data-af-source-menu] *",
        "[data-af-utility-toggle]",
        "[data-af-utility-menu]",
        "[data-af-utility-menu] *",
        "[data-af-account]",
        "[data-af-account-menu]",
        "[data-af-account-menu] *",
      ].join(", "))
    ));
  }

  function toggleDebug() {
    const nextVisible = !state.debugVisible;
    state.debugVisible = nextVisible;
    if (nextVisible) {
      state.debugPanelInFront = true;
    }
    render();
  }

  function closeDebug() {
    state.debugVisible = false;
    render();
  }

  async function copyDebug() {
    const text = formatDebugState();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      copyTextWithFallback(text);
    }
    state.debugCopied = true;
    render();
    window.setTimeout(() => {
      state.debugCopied = false;
      render();
    }, 1200);
  }

  function clearDiagnostics() {
    const clearedAt = new Date().toISOString();
    state.debugEvents = [];
    state.navigationEvents = [];
    state.lastIssueReport = null;
    state.navigationEventSeq = 0;
    state.debugCopied = false;
    state.issueCopied = false;
    state.diagnosticsClearedAt = clearedAt;
    state.bootDiagnostics.lastError = "";
    state.bootDiagnostics.updatedAt = clearedAt;
    delete document.documentElement.dataset.afShadowingLastError;
    delete document.documentElement.dataset.afShadowingBootError;
    publishDiagnosticsSnapshot();
    render();
  }

  async function refreshSelectedSourceCache() {
    const source = getSelectedPracticeSource();
    if (!source || state.loading) return;
    state.cacheRefreshRequested = true;
    recordDebugEvent("cache-refresh-start", {
      source: captionTrackApi.sourceDisplayName(source),
      videoId: state.videoId,
    });
    render();
    try {
      await loadPracticeSource(source, {
        keepExistingOnError: true,
        preserveVideoTime: true,
        refreshCache: true,
      });
    } finally {
      state.cacheRefreshRequested = false;
      render();
    }
  }

  async function startImproveTiming() {
    const source = getSelectedPracticeSource();
    const readiness = practiceReadiness();
    if (!source || !state.videoId || timingOperationState(readiness).active || readiness.state === "precise") return;

    state.timingOperationError = "";
    state.timingOperationApiBase = apiBaseForBackendCommands();
    state.timingOperation = {
      id: "",
      kind: "improve-timing",
      state: "queued",
    };
    render();

    try {
      const operation = await postBackendJson("practice-timing-create", {
        apiBase: state.timingOperationApiBase,
        payload: buildPracticeTimingPayload(source),
      });
      applyTimingOperation(operation);
    } catch (error) {
      state.timingOperation = null;
      state.timingOperationError = readableTimingError(error);
      recordDebugEvent("timing-improve-failed", {
        error: state.timingOperationError,
      });
    } finally {
      render();
    }
  }

  function buildPracticeTimingPayload(source) {
    const result = source?.loadedTranscriptResult || state.transcriptResult || {};
    const sourceKind = timingPayloadSourceKind(source, result);
    const artifact = result.practiceArtifact || practiceArtifactFromSnapshot(result.practiceSnapshot);
    const payload = {
      videoId: state.videoId,
      lang: result.languageCode || source?.languageCode || "auto",
      sourceKind,
      textSource: sourceKind === "manual" ? "manual" : "asr",
      fullAudio: true,
    };
    if (artifact?.snapshotRevisionId) payload.snapshotRevisionId = artifact.snapshotRevisionId;
    if (artifact?.textSourceRevisionId) payload.textSourceRevisionId = artifact.textSourceRevisionId;
    if (artifact?.timingEvidenceRevisionId) payload.timingEvidenceRevisionId = artifact.timingEvidenceRevisionId;
    return payload;
  }

  function timingPayloadSourceKind(source, result = {}) {
    if (source?.track?.kind === "asr") return "auto";
    if (result.sourceKind === "auto") return "auto";
    return "manual";
  }

  function applyTimingOperation(operation) {
    if (!operation || operation.kind !== "improve-timing") {
      throw new Error("Timing endpoint returned an unexpected response.");
    }
    state.timingOperation = operation;
    state.timingOperationError = operation.state === "failed"
      ? operation.error?.message || "Timing improvement failed."
      : "";
    recordDebugEvent("timing-improve-operation", {
      operationId: operation.id || "",
      state: operation.state || "",
    });
    if (operation.state === "queued" || operation.state === "running") {
      scheduleTimingOperationPoll(operation);
    } else {
      clearTimingOperationPoll();
    }
  }

  function scheduleTimingOperationPoll(operation) {
    clearTimingOperationPoll();
    if (!operation?.id) return;
    const retryAfterMs = Number(operation.retryAfterMs || 3000);
    state.timingOperationPollTimer = window.setTimeout(() => {
      pollTimingOperation(operation.id);
    }, Math.max(1000, Math.min(retryAfterMs, 10000)));
  }

  async function pollTimingOperation(operationId) {
    try {
      const operation = await getBackendJson("practice-operation", {
        apiBase: state.timingOperationApiBase,
        operationId,
      });
      applyTimingOperation(operation);
    } catch (error) {
      state.timingOperationError = readableTimingError(error);
      clearTimingOperationPoll();
      recordDebugEvent("timing-improve-poll-failed", {
        operationId,
        error: state.timingOperationError,
      });
    } finally {
      render();
    }
  }

  function clearTimingOperationPoll() {
    if (state.timingOperationPollTimer) {
      window.clearTimeout(state.timingOperationPollTimer);
      state.timingOperationPollTimer = null;
    }
  }

  function readableTimingError(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/missing|unauthorized|401|auth/i.test(message)) {
      return "Timing improvement needs a tester token for this backend.";
    }
    return message || "Timing improvement failed.";
  }

  function markIssue() {
    const report = formatIssueReport();
    recordDebugEvent("issue-marked", {
      navigationEventId: state.navigationEvents.at(-1)?.id || null,
      currentIndex: state.currentIndex,
    });
    state.lastIssueReport = report;
    state.issueCopied = true;
    render();
    copyIssueReport(report);
    window.setTimeout(() => {
      state.issueCopied = false;
      render();
    }, 1500);
  }

  function copyIssueReport(report) {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(report))
      .catch(() => {
        copyTextWithFallback(report);
      });
  }

  function copyTextWithFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.documentElement.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function formatDebugState() {
    const selectedSource = getSelectedPracticeSource();
    return JSON.stringify({
      boot: state.bootDiagnostics,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      cueSource: state.cueSource,
      transcriptResult: state.transcriptResult ? summarizeTranscriptResult(state.transcriptResult) : null,
      phrases: state.phrases.length,
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      diagnosticsClearedAt: state.diagnosticsClearedAt,
      error: state.error,
      sources: state.practiceSources.map(captionTrackApi.formatSourceDebug),
      navigationEvents: state.navigationEvents.slice(-12),
      lastIssueReport: state.lastIssueReport,
      events: state.debugEvents.slice(-8),
    }, null, 2);
  }

  function recordDebugEvent(type, detail) {
    state.debugEvents.push({
      at: new Date().toISOString(),
      type,
      ...detail,
    });
    if (state.debugEvents.length > 30) {
      state.debugEvents.splice(0, state.debugEvents.length - 30);
    }
    publishDiagnosticsSnapshot();
  }

  function recordNavigationEvent(type, detail = {}) {
    const event = {
      id: `nav-${state.navigationEventSeq += 1}`,
      at: new Date().toISOString(),
      type,
      ...detail,
    };
    state.navigationEvents.push(event);
    if (state.navigationEvents.length > 40) {
      state.navigationEvents.splice(0, state.navigationEvents.length - 40);
    }
    publishDiagnosticsSnapshot();
    return event;
  }

  function publishDiagnosticsSnapshot() {
    const snapshot = {
      capturedAt: new Date().toISOString(),
      diagnosticsClearedAt: state.diagnosticsClearedAt || "",
      videoId: state.videoId || "",
      selectedSourceId: state.selectedSourceId || "",
      loading: Boolean(state.loading),
      visibleError: state.error || "",
      bootLastError: state.bootDiagnostics?.lastError || "",
      debugEventCount: state.debugEvents.length,
      navigationEventCount: state.navigationEvents.length,
      recentDebugEvents: state.debugEvents.slice(-8),
      recentNavigationEvents: state.navigationEvents.slice(-8),
      lastIssueReportPresent: Boolean(state.lastIssueReport),
    };
    document.documentElement.dataset.afShadowingDiagnosticsState = JSON.stringify(snapshot);
  }

  function formatIssueReport() {
    const selectedSource = getSelectedPracticeSource();
    return JSON.stringify({
      kind: "audiofilms-youtube-navigation-issue",
      capturedAt: new Date().toISOString(),
      page: {
        url: window.location.href,
        videoId: state.videoId,
      },
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      mode: {
        guidedMode: state.guidedMode,
        autoPause: state.autoPause,
        textVisible: state.textVisible,
      },
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      visibleState: {
        count: state.phrases.length ? `${state.currentIndex + 1} / ${state.phrases.length}` : "0 / 0",
        error: state.error,
      },
      navigationEvents: state.navigationEvents.slice(-20),
      debugEvents: state.debugEvents.slice(-12),
    }, null, 2);
  }

  function practiceReadiness() {
    if (timingOperationState().active) {
      return { state: "improving", label: "Improving..." };
    }
    if (state.loading || state.cacheRefreshRequested) {
      return { state: "improving", label: "Improving..." };
    }
    if (!state.phrases.length) {
      return { state: "no-captions", label: "No captions" };
    }
    const result = getSelectedPracticeSource()?.loadedTranscriptResult || state.transcriptResult;
    if (!result) {
      return { state: "ready", label: "Ready" };
    }
    if (result.timingExactness === "word-level" || result.sourceKind === "asr") {
      return { state: "precise", label: "Precise" };
    }
    if (result.timingExactness === "rough" || result.warnings?.length || result.fallbackUsed) {
      return { state: "rough", label: "Rough" };
    }
    return { state: "ready", label: "Ready" };
  }

  function timingOperationState(readiness = null) {
    const operation = state.timingOperation;
    if (operation?.state === "queued" || operation?.state === "running") {
      return {
        active: true,
        status: operation.state,
        copy: operation.state === "queued" ? "Timing improvement is queued." : "Timing improvement is running.",
      };
    }
    if (readiness?.state === "precise") {
      return { active: false, status: "", copy: "" };
    }
    if (operation?.state === "succeeded") {
      return {
        active: false,
        status: "succeeded",
        copy: "Timing improvement finished. Reload captions when you want to apply the latest timing.",
      };
    }
    if (state.timingOperationError) {
      return {
        active: false,
        status: "failed",
        copy: state.timingOperationError,
      };
    }
    if (operation?.state === "failed") {
      return {
        active: false,
        status: "failed",
        copy: operation.error?.message || "Timing improvement failed.",
      };
    }
    return { active: false, status: "", copy: "" };
  }

  function userFacingSourceLabel(source) {
    if (!source) return state.tracks.length ? "Captions" : "No captions";
    const result = source.loadedTranscriptResult || state.transcriptResult;
    const language = captionTrackApi.languageLabelFromSource?.(source) || source.name || source.languageCode || "Dutch";
    if (result?.sourceKind === "asr") return "ASR transcript";
    if (source.track?.kind === "asr" || result?.sourceKind === "auto") return `${language} auto-captions`;
    if (result?.sourceKind === "transcript-panel") return `${language} captions`;
    return `${language} captions`;
  }

  function getPlaybackSnapshot() {
    const video = getVideoElement();
    if (!video) {
      return { videoPresent: false };
    }

    return {
      videoPresent: true,
      currentTime: roundTime(video.currentTime),
      duration: roundTime(video.duration),
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      playbackRate: video.playbackRate,
    };
  }

  function describePhraseAtIndex(index) {
    const phrase = state.phrases[index];
    if (!phrase) {
      return {
        index,
        count: state.phrases.length,
        present: false,
      };
    }

    return {
      index,
      ordinal: index + 1,
      count: state.phrases.length,
      startSec: roundTime(phrase.startMs / 1000),
      endSec: roundTime(phrase.endMs / 1000),
      text: phrase.text,
    };
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function renderSourceSelector(track, sourceToggle, sourceMenu) {
    const selectedSource = getSelectedPracticeSource();
    const readiness = practiceReadiness();
    const label = selectedSource
      ? `${userFacingSourceLabel(selectedSource)} · ${readiness.label}`
      : state.tracks.length ? "Captions: -" : "No captions";
    clearElement(sourceToggle);
    const dot = appendElement(sourceToggle, "span", "af-source-status-dot");
    dot.setAttribute("aria-hidden", "true");
    const text = appendElement(sourceToggle, "span", "af-source-toggle-label");
    text.textContent = label;
    sourceToggle.disabled = state.loading;
    sourceToggle.setAttribute("aria-expanded", state.sourceMenuOpen ? "true" : "false");
    sourceToggle.dataset.afReadiness = readiness.state;
    track.classList.toggle("is-open", state.sourceMenuOpen);

    clearElement(sourceMenu);
    if (!state.sourceMenuOpen) return;

    renderReadinessPopover(sourceMenu, selectedSource, readiness);
  }

  function renderReadinessPopover(sourceMenu, selectedSource, readiness) {
    const summary = appendElement(sourceMenu, "div", "af-readiness-summary");
    const title = appendElement(summary, "div", "af-readiness-title");
    title.textContent = readiness.label;
    const copy = appendElement(summary, "div", "af-readiness-copy");
    copy.textContent = readinessCopy(readiness.state);

    const actions = appendElement(sourceMenu, "div", "af-readiness-actions");
    const getCaptions = appendButton(actions, state.cacheRefreshRequested ? "Getting Captions" : "Get Captions", "afReadinessGetCaptions");
    getCaptions.disabled = state.loading || !selectedSource;
    getCaptions.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.sourceMenuOpen = false;
      refreshSelectedSourceCache();
    });
    const timingState = timingOperationState(readiness);
    const timingAlreadyPrecise = readiness.state === "precise";
    const improveTiming = appendButton(actions, timingState.active ? "Improving Timing" : "Improve Timing", "afReadinessImproveTiming");
    improveTiming.disabled = state.loading || !selectedSource || timingState.active || timingAlreadyPrecise;
    improveTiming.title = timingState.active
      ? "Timing improvement is running."
      : timingAlreadyPrecise
        ? "This source already has the best available timing."
        : selectedSource
        ? "Improve phrase timing with backend timing evidence."
        : "Load captions before improving timing.";
    improveTiming.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startImproveTiming();
    });
    const actionHelp = appendElement(sourceMenu, "div", "af-readiness-action-help");
    actionHelp.textContent = "Get Captions retrieves subtitle text. Improve Timing starts ASR alignment for tighter phrase boundaries.";
    if (timingState.copy) {
      const status = appendElement(sourceMenu, "div", "af-readiness-operation");
      status.dataset.afTimingOperationStatus = timingState.status || "";
      status.textContent = timingState.copy;
    }

    if (state.practiceSources.length > 1) {
      const selectorLabel = appendElement(sourceMenu, "div", "af-source-group");
      selectorLabel.textContent = "Text Source";
      renderSourceOptions(sourceMenu);
    }

    const diagnostics = appendElement(sourceMenu, "details", "af-readiness-details");
    const diagnosticsSummary = appendElement(diagnostics, "summary", "af-readiness-details-summary");
    diagnosticsSummary.textContent = "Details";
    const details = appendElement(diagnostics, "div", "af-readiness-detail-grid");
    appendReadinessDetail(details, "Source", selectedSource ? userFacingSourceLabel(selectedSource) : "No captions");
    appendReadinessDetail(details, "Readiness", readiness.label);
    appendReadinessDetail(details, "Phrases", state.phrases.length ? String(state.phrases.length) : "0");
    if (timingState.status) {
      appendReadinessDetail(details, "Timing", timingState.status);
    }
  }

  function renderSourceOptions(sourceMenu) {

    for (const group of captionTrackApi.groupPracticeSources(state.practiceSources)) {
      const header = appendElement(sourceMenu, "div", "af-source-group");
      header.textContent = group.label;

      for (const source of group.sources) {
        const option = appendElement(sourceMenu, "button", "af-source-option");
        option.type = "button";
        option.dataset.afSourceId = source.id;
        option.classList.toggle("is-selected", source.id === state.selectedSourceId);
        option.textContent = captionTrackApi.sourceDisplayName(source);
        option.addEventListener("click", () => selectPracticeSource(source.id));

        if (source.error) {
          const error = appendElement(sourceMenu, "div", "af-source-option-error");
          error.textContent = source.error;
        } else if (source.loadedTranscriptResult?.warnings?.length) {
          const warningText = source.loadedTranscriptResult.warnings[0];
          const warning = appendElement(
            sourceMenu,
            "div",
            sourceWarningIsInformational(warningText) ? "af-source-option-note" : "af-source-option-error",
          );
          warning.textContent = warningText;
        }
      }
    }
  }

  function sourceWarningIsInformational(text) {
    return /^ASR job completed:/i.test(String(text || "").trim());
  }

  function readinessCopy(stateName) {
    return {
      "no-captions": "No usable phrase captions are loaded for this video.",
      rough: "Phrase practice is available, but timing or source quality may be rough.",
      ready: "Phrase practice is ready.",
      precise: "Phrase practice has the best available timing.",
      improving: "Caption or timing work is running; current practice can stay visible.",
    }[stateName] || "Caption state is available.";
  }

  function appendReadinessDetail(parent, label, value) {
    const row = appendElement(parent, "div", "af-readiness-detail");
    const key = appendElement(row, "span", "af-readiness-detail-key");
    key.textContent = label;
    const text = appendElement(row, "span", "af-readiness-detail-value");
    text.textContent = value;
  }

  function toggleSourceMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    state.sourceMenuOpen = !state.sourceMenuOpen;
    state.lastMenuTrigger = state.sourceMenuOpen ? "source" : null;
    if (state.sourceMenuOpen) {
      state.utilityMenuOpen = false;
      state.accountMenuOpen = false;
    }
    render();
  }

  function appendRibbonMessage(parent, text) {
    const message = appendElement(parent, "div", "af-ribbon-message");
    message.textContent = text;
  }

  function appendPhraseRow(parent, phrase, index) {
    const row = appendElement(parent, "div", "af-ribbon-row");
    row.dataset.afPhraseStartMs = String(Math.round(phrase.startMs));
    row.dataset.afPhraseEndMs = String(Math.round(phrase.endMs));
    row.dataset.afPhrasePlaybackEndMs = String(Math.round(playbackEndMsForPhrase(state.phrases, index)));
    row.classList.toggle("is-current", index === state.currentIndex);
    row.classList.toggle("is-past", index < state.currentIndex);
    row.classList.toggle("is-future", index > state.currentIndex);
    row.classList.toggle("is-recall-mode", state.practiceMode === "recall");
    row.classList.toggle("is-shadow-mode", state.practiceMode === "shadow");

    const time = appendElement(row, "div", "af-ribbon-time");
    time.textContent = formatTimestamp(phrase.startMs);

    const prompt = appendElement(row, "div", "af-recall-prompt");
    if (state.practiceMode === "recall" && index === state.currentIndex) {
      prompt.textContent = phraseTranslationCopy(phrase, index);
    } else {
      prompt.textContent = "Phrase prompt placeholder";
      prompt.setAttribute("aria-hidden", "true");
    }

    const text = appendElement(row, "div", "af-ribbon-text");
    if (!shouldShowOriginalText(index)) {
      appendElement(text, "span", "af-ribbon-mask");
    } else {
      renderClickablePhraseText(text, phrase.text, index);
    }

    const translation = appendElement(row, "div", "af-phrase-translation");
    if (state.practiceMode === "recall") {
      translation.classList.toggle("is-unavailable", !phraseTranslationText(phrase, index));
      translation.textContent = state.textVisible ? "Original revealed" : "Reveal original when ready.";
    } else if (state.phraseTranslationVisible) {
      translation.classList.toggle("is-unavailable", !phraseTranslationText(phrase, index));
      translation.textContent = phraseTranslationCopy(phrase, index);
    } else {
      translation.textContent = phraseTranslationText(phrase, index) || "";
      translation.setAttribute("aria-hidden", "true");
    }
  }

  function phraseTranslationText(phrase, index = state.currentIndex) {
    const translation = phraseTranslationState(phrase, index);
    return translation?.status === "ready" ? translation.translatedText || "" : "";
  }

  function phraseTranslationCopy(phrase, index = state.currentIndex) {
    const translation = phraseTranslationState(phrase, index);
    if (translation?.status === "ready" && translation.translatedText) {
      return translation.translatedText;
    }
    if (translation?.status === "loading") {
      return "Translating phrase...";
    }
    if (translation?.status === "failed") {
      return translation.error || "Phrase translation failed.";
    }
    if (state.accountStatus !== "signed-in") {
      return "Connect 2000NL to translate phrases.";
    }
    return "Translation not requested yet.";
  }

  function phraseTranslationState(phrase, index = state.currentIndex) {
    const key = phraseTranslationKey(phrase, index);
    return key ? state.phraseTranslations[key] || null : null;
  }

  function phraseTranslationKey(phrase, index = state.currentIndex) {
    if (!phrase) return "";
    return [
      state.videoId || "video",
      state.selectedSourceId || "source",
      phrase.index ?? index,
      phrase.startMs ?? "",
      phrase.endMs ?? "",
      String(phrase.text || "").slice(0, 80),
    ].join("|");
  }

  function phraseTranslationId(phrase, index = state.currentIndex) {
    return [
      state.videoId || "video",
      state.selectedSourceId || "source",
      phrase.index ?? index,
      phrase.startMs ?? 0,
      phrase.endMs ?? 0,
    ].join(":");
  }

  function ensureCurrentPhraseTranslation() {
    const phrase = state.phrases[state.currentIndex];
    if (!phrase) return;
    const key = phraseTranslationKey(phrase, state.currentIndex);
    const existing = state.phraseTranslations[key];
    if (existing?.status === "ready" || existing?.status === "loading") return;
    if (state.accountStatus !== "signed-in") {
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: {
          status: "failed",
          error: "Connect 2000NL to translate phrases.",
        },
      };
      return;
    }
    requestPhraseTranslation(phrase, state.currentIndex, key);
  }

  async function requestPhraseTranslation(phrase, index, key) {
    const requestSeq = state.phraseTranslationSeq + 1;
    state.phraseTranslationSeq = requestSeq;
    state.phraseTranslations = {
      ...state.phraseTranslations,
      [key]: { status: "loading" },
    };
    render();

    const source = getSelectedPracticeSource();
    const sourceLanguageCode =
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      state.transcriptResult?.languageCode ||
      "auto";
    const targetLanguageCode = state.accountPreferences?.translationTargetLanguageCode || "";

    try {
      const translation = await postDictionaryCommand("phrase-translation", {
        phraseId: phraseTranslationId(phrase, index),
        sourceText: phrase.text || "",
        sourceLanguageCode,
        contextText: phrase.text || "",
        ...(targetLanguageCode ? { targetLanguageCode } : {}),
        purpose: "youtube-phrase-practice",
      });
      const translatedText = translation?.translatedText || "";
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: translatedText
          ? { ...translation, status: "ready", translatedText }
          : {
              ...translation,
              status: "failed",
              error: translation?.error?.message || translation?.error?.code || "Phrase translation returned no text.",
            },
      };
      recordDebugEvent("phrase-translation-loaded", {
        phraseId: phraseTranslationId(phrase, index),
        status: state.phraseTranslations[key]?.status,
        requestSeq,
      });
    } catch (error) {
      state.phraseTranslations = {
        ...state.phraseTranslations,
        [key]: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      };
      recordDebugEvent("phrase-translation-failed", {
        phraseId: phraseTranslationId(phrase, index),
        error: state.phraseTranslations[key]?.error || "",
        requestSeq,
      });
    } finally {
      render();
    }
  }

  function shouldShowOriginalText(index) {
    if (index !== state.currentIndex) return true;
    return state.textVisible;
  }

  function renderClickablePhraseText(parent, text, phraseIndex) {
    const tokens = Array.from(String(text || "").matchAll(/\s+|\S+/gu));
    let lookupTokenIndex = 0;
    for (const match of tokens) {
      const token = match[0];
      const charStart = match.index || 0;
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        parent.appendChild(document.createTextNode(token));
        continue;
      }

      const lookupWord = normalizeLookupWord(token);
      if (!lookupWord) {
        parent.appendChild(document.createTextNode(token));
        continue;
      }

      const word = appendElement(parent, "button", "af-ribbon-word");
      word.type = "button";
      word.textContent = token;
      word.dataset.afLookupWord = lookupWord;
      const tokenIndex = lookupTokenIndex;
      word.classList.toggle(
        "is-selected",
        state.selectedWord?.phraseIndex === phraseIndex && wordsEqual(state.selectedWord.word, lookupWord),
      );
      word.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectLookupWord(lookupWord, phraseIndex, {
          tokenIndex,
          charStart,
          charEnd: charStart + token.length,
          originalToken: token,
        });
      });
      lookupTokenIndex += 1;
    }
  }

  function renderDictionary(panel) {
    const title = panel.querySelector("[data-af-dictionary-title]");
    const subtitle = panel.querySelector("[data-af-dictionary-subtitle]");
    const examplesToggle = panel.querySelector("[data-af-examples-toggle]");
    const body = panel.querySelector("[data-af-dictionary-body]");

    const headerCopy = dictionaryHeaderCopy();
    title.textContent = headerCopy.title;
    subtitle.textContent = headerCopy.subtitle;
    const canToggleExamples = Boolean(state.selectedWord?.lookupResult?.cards?.length);
    examplesToggle.hidden = !canToggleExamples;
    if (canToggleExamples) {
      const toggleLabel = state.examplesExpanded ? "Collapse all examples" : "Expand all examples";
      examplesToggle.innerHTML = `${iconSvg(state.examplesExpanded ? "collapse" : "expand")}<span class="af-sr-only">${toggleLabel}</span>`;
      examplesToggle.setAttribute("aria-label", toggleLabel);
      examplesToggle.setAttribute("aria-pressed", state.examplesExpanded ? "true" : "false");
      examplesToggle.title = toggleLabel;
    }

    clearElement(body);
    if (state.selectedWord) {
      renderSelectedWordCard(body);
    } else {
      renderAccountCard(body);
    }
  }

  function renderAccountControl(account, accountMenu, accountCopy, accountAction) {
    if (!account || !accountMenu || !accountCopy || !accountAction) return;
    clearElement(account);
    account.insertAdjacentHTML(
      "beforeend",
      iconSvg(state.accountStatus === "signed-in" ? "account-connected" : "account"),
    );
    const accountText = appendElement(account, "span", "af-sr-only");
    accountText.textContent = accountStatusLabel();
    account.classList.toggle("is-connected", state.accountStatus === "signed-in");
    account.setAttribute("aria-label", accountStatusAriaLabel());
    account.setAttribute("aria-expanded", state.accountMenuOpen ? "true" : "false");
    account.title = accountStatusLabel();
    accountMenu.classList.toggle("is-open", state.accountMenuOpen);
    accountCopy.textContent = accountStatusCopy();
    accountAction.textContent = accountConnectLabel();
    accountAction.disabled = state.accountLoading;
  }

  function dictionaryHeaderCopy() {
    const selectedWord = state.selectedWord;
    if (!selectedWord) {
      return {
        title: "Dictionary",
        subtitle: state.selectedTrack ? captionTrackApi.describeTrack(state.selectedTrack) : "Click a word",
      };
    }
    if (selectedWord.lookupStatus === "loading") {
      return { title: selectedWord.word, subtitle: "Looking up..." };
    }
    if (selectedWord.lookupStatus === "error") {
      return { title: selectedWord.word, subtitle: "Lookup failed" };
    }
    const cards = selectedWord.lookupResult?.cards || [];
    if (cards.length) {
      return {
        title: selectedWord.word,
        subtitle: `${cards.length} ${cards.length === 1 ? "card" : "cards"} found`,
      };
    }
    return { title: selectedWord.word, subtitle: "No cards found" };
  }

  function renderAccountCard(parent) {
    const card = appendElement(parent, "div", "af-dictionary-card");
    const eyebrow = appendElement(card, "div", "af-dictionary-eyebrow");
    eyebrow.textContent = "Lookup";
    const title = appendElement(card, "div", "af-dictionary-card-title");
    title.textContent = "Click a word";
    const copy = appendElement(card, "p", "af-dictionary-copy");
    copy.textContent = "Basic lookup should work in guest mode. Sign in later to sync saved words, review grades, and progress with 2000NL.";

    const accountCard = appendElement(parent, "div", "af-dictionary-card af-account-mini-card");
    const accountTitle = appendElement(accountCard, "div", "af-account-mini-title");
    accountTitle.textContent = "2000NL account";
    const accountCopy = appendElement(accountCard, "p", "af-dictionary-copy");
    accountCopy.textContent = accountStatusCopy();
    if (state.accountError) {
      const accountError = appendElement(accountCard, "p", "af-source-option-error");
      accountError.textContent = state.accountError;
    }
    const action = appendButton(accountCard, "Connect 2000NL", "afSignIn");
    action.className = "af-secondary-button";
    action.textContent = state.accountStatus === "signed-in" ? "Disconnect" : accountConnectLabel();
    action.disabled = state.accountLoading;
    action.addEventListener("click", () => {
      if (state.accountStatus === "signed-in") {
        disconnectTwoThousandNlAccount();
      } else {
        connectTwoThousandNlAccount();
      }
    });
  }

  function renderSelectedWordCard(parent) {
    if (state.selectedWord?.lookupStatus === "ready" && state.selectedWord.lookupResult?.cards?.length) {
      renderReadyDictionaryCards(parent, state.selectedWord);
      return;
    }
    renderDictionaryLookup(parent);
  }

  function renderReadyDictionaryCards(parent, selectedWord) {
    for (const card of selectedWord.lookupResult.cards) {
      renderOverlayCard(parent, card);
    }

    if (selectedWord.cardActionStatus) {
      const status = appendElement(parent, "p", "af-dictionary-copy af-card-action-status");
      status.textContent = selectedWord.cardActionStatus;
    }
    if (selectedWord.cardActionError) {
      const error = appendElement(parent, "p", "af-source-option-error");
      error.textContent = selectedWord.cardActionError;
    }
    if (selectedWord.lookupResult?.meta?.warning) {
      const warning = appendElement(parent, "p", "af-source-option-error");
      warning.textContent = selectedWord.lookupResult.meta.warning;
    }
  }

  function renderDictionaryLookup(parent) {
    const lookup = appendElement(parent, "div", "af-lookup-placeholder");
    const lookupTitle = appendElement(lookup, "div", "af-lookup-placeholder-title");
    const lookupCopy = appendElement(lookup, "p", "af-dictionary-copy");
    const selectedWord = state.selectedWord;

    if (!selectedWord) {
      lookupTitle.textContent = "Dictionary result";
      lookupCopy.textContent = "Click a word to look it up.";
      return;
    }

    if (selectedWord.lookupStatus === "loading") {
      lookup.classList.add("is-loading");
      lookupTitle.textContent = "Looking up...";
      lookupCopy.textContent = "Loading dictionary matches.";
      appendElement(lookup, "div", "af-lookup-skeleton");
      return;
    }

    if (selectedWord.lookupStatus === "error") {
      lookup.classList.add("is-error");
      lookupTitle.textContent = "Lookup failed";
      lookupCopy.textContent = selectedWord.lookupError || "Dictionary lookup failed.";
      const retry = appendButton(lookup, "Retry lookup", "afLookupRetry");
      retry.className = "af-lookup-retry";
      retry.addEventListener("click", () => {
        selectLookupWord(selectedWord.word, selectedWord.phraseIndex, selectedWord.selection);
      });
      if (selectedWord.translateUrl) {
        const link = appendElement(lookup, "a", "af-dictionary-link");
        link.href = selectedWord.translateUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "Open translation fallback";
      }
      return;
    }

    const cards = selectedWord.lookupResult?.cards || [];
    if (cards.length) {
      lookupTitle.textContent = `${cards.length} dictionary ${cards.length === 1 ? "card" : "cards"}`;
      lookupCopy.textContent = "Dictionary match";

      for (const card of cards) {
        renderOverlayCard(lookup, card);
      }

      if (selectedWord.cardActionStatus) {
        const status = appendElement(lookup, "p", "af-dictionary-copy af-card-action-status");
        status.textContent = selectedWord.cardActionStatus;
      }
      if (selectedWord.cardActionError) {
        const error = appendElement(lookup, "p", "af-source-option-error");
        error.textContent = selectedWord.cardActionError;
      }
      if (selectedWord.lookupResult?.meta?.warning) {
        const warning = appendElement(lookup, "p", "af-source-option-error");
        warning.textContent = selectedWord.lookupResult.meta.warning;
      }
      return;
    }

    const result = selectedWord.lookupResult?.result;
    const definitions = selectedWord.lookupResult?.definitions || [];
    if (!result) {
      lookup.classList.add("is-empty");
      lookupTitle.textContent = "No match";
      lookupCopy.textContent = "No dictionary match was returned for this word.";
      return;
    }

    lookupTitle.textContent = result.word || selectedWord.word;
    lookupCopy.textContent = result.language || "Dictionary match";

    for (const definition of definitions.length ? definitions : [result.definition]) {
      const item = appendElement(lookup, "p", "af-dictionary-copy");
      item.textContent = definition;
    }

    if (selectedWord.lookupResult?.meta?.warning) {
      const warning = appendElement(lookup, "p", "af-source-option-error");
      warning.textContent = selectedWord.lookupResult.meta.warning;
    }
  }

  function renderOverlayCard(parent, card) {
    const entry = appendElement(parent, "div", "af-overlay-card");
    const feedback = state.cardActionFeedbackByCardId[card.id];
    if (feedback?.status) {
      entry.classList.add(`is-action-${feedback.status}`);
    }
    const header = appendElement(entry, "div", "af-overlay-card-header");
    const titleWrap = appendElement(header, "div", "af-overlay-title-wrap");
    const cardTranslation = visibleCardTranslation(card);
    const title = appendElement(titleWrap, "div", "af-overlay-card-title");
    renderOverlayCardTitle(title, card, cardTranslation);
    renderChipList(titleWrap, overlayChips(card));
    const translationActions = displayActionsByGroup(card, "translation");
    if (translationActions.length) {
      const translationVisible = state.visibleTranslationsByCardId[card.id] === true;
      const translateButton = appendButton(header, "", `afAction-${translationActions[0].id}`);
      translateButton.className = "af-card-translate";
      translateButton.disabled = !card?.entryId;
      translateButton.innerHTML = `${iconSvg("translate")}<span class="af-sr-only">${translationVisible ? "Hide translation" : "Show translation"}</span>`;
      translateButton.title = translationVisible ? "Hide translation" : "Show translation";
      translateButton.setAttribute("aria-label", translationVisible ? "Hide translation" : "Show translation");
      translateButton.setAttribute("aria-pressed", translationVisible ? "true" : "false");
      translateButton.addEventListener("click", () => performDisplayAction(card, translationActions[0]));
    }

    const summary = card.summary || {};
    if (summary.definition) {
      renderTranslatedLine(
        entry,
        "p",
        "af-dictionary-copy af-overlay-definition",
        summary.definition,
        lookupOrOverlayDefinition(card, cardTranslation, 0),
      );
    }

    renderOverlaySections(entry, card.sections || [], card, cardTranslation);

    const personal = progressSignal(card.progress);
    if (personal.length) {
      renderChipList(entry, personal, "af-personal-chips");
    }

    renderReviewActions(entry, card);

    if (feedback?.message) {
      const status = appendElement(entry, "p", "af-dictionary-copy af-card-inline-feedback");
      status.textContent = feedback.message;
    }
  }

  function overlayTitle(card) {
    return card.headword || card.clickedForm || state.selectedWord?.word || "Dictionary card";
  }

  function renderOverlayCardTitle(parent, card, translation = null) {
    clearElement(parent);
    const titleText = appendElement(parent, "span", "af-overlay-card-title-text");
    const titleLine = appendElement(titleText, "span", "af-overlay-card-title-line");
    if (card.article) {
      const article = appendElement(titleLine, "span", "af-overlay-card-article");
      article.textContent = card.article;
    }
    const headword = appendElement(titleLine, "span", "af-overlay-card-headword");
    headword.textContent = overlayTitle(card);
    renderInlineTranslation(titleText, lookupOrOverlayHeadword(card, translation));
  }

  function overlayChips(card) {
    const projected = Array.isArray(card.chips) ? card.chips : [];
    return [
      card.partOfSpeech ? { kind: "part-of-speech", label: card.partOfSpeech } : null,
      ...projected.filter((chip) => chip.kind === "part-of-speech" && chip.label !== card.partOfSpeech),
      ...projected.filter((chip) => chip.kind === "list"),
      card.dictionary?.name || card.dictionary?.slug
        ? { kind: "dictionary", label: card.dictionary.name || card.dictionary.slug }
        : null,
    ].filter(Boolean);
  }

  function renderChipList(parent, chips, className = "af-chip-list") {
    if (!chips.length) return;
    const list = appendElement(parent, "div", className);
    for (const chip of chips) {
      const item = appendElement(list, "span", "af-chip");
      item.textContent = chip.label || chip;
    }
  }

  function renderOverlaySections(parent, sections, card, translation = null) {
    const visibleSections = sections
      .filter((section) => section?.text)
      .filter((section, index) => index > 0 || section.kind !== "meaning");
    if (!visibleSections.length) return;

    const cardId = card?.id || "";
    const expanded = exampleSectionExpanded(cardId);
    const details = appendElement(parent, "div", "af-overlay-details");
    details.classList.toggle("is-open", expanded);
    const summary = appendElement(details, "button", "af-overlay-details-summary");
    summary.type = "button";
    summary.innerHTML = `${iconSvg(expanded ? "collapse" : "expand")}<span>Examples</span>`;
    summary.setAttribute("aria-expanded", expanded ? "true" : "false");
    summary.addEventListener("click", () => toggleCardExamples(cardId));
    const content = appendElement(details, "div", "af-overlay-details-content");
    content.hidden = !expanded;
    for (const section of visibleSections) {
      const block = appendElement(content, "div", `af-overlay-section is-${section.kind || "meaning"}`);
      renderTranslatedLine(
        block,
        "p",
        "af-dictionary-copy",
        section.text,
        lookupOrOverlaySection(card, section, sections, translation),
      );
      if (section.label) {
        const label = appendElement(block, "p", "af-dictionary-copy af-overlay-section-label");
        label.textContent = section.label;
      }
    }
  }

  function sectionLabel(kind) {
    return {
      meaning: "Meaning",
      example: "Example",
      idiom: "Idiom",
      form: "Form",
      note: "Note",
    }[kind] || "Detail";
  }

  function progressSignal(progress) {
    if (!progress) return [];
    return [
      typeof progress.seenCount === "number" ? { label: `Seen ${progress.seenCount}x` } : null,
      progress.lastSeenAt ? { label: `Last ${formatRelativeDate(progress.lastSeenAt)}` } : null,
    ].filter(Boolean);
  }

  function formatRelativeDate(value) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return "seen";
    const days = Math.max(0, Math.round((Date.now() - timestamp) / 86400000));
    if (days <= 0) return "today";
    if (days === 1) return "1d";
    return `${days}d`;
  }

  function renderTranslatedLine(parent, tagName, className, text, translationText = "") {
    const line = appendElement(parent, tagName, className);
    line.textContent = text;
    renderInlineTranslation(line, translationText);
    return line;
  }

  function renderInlineTranslation(parent, text) {
    const value = cleanTranslationText(text);
    if (!value) return null;
    const translation = appendElement(parent, "span", "af-inline-translation");
    translation.textContent = `\n${value}`;
    return translation;
  }

  function visibleCardTranslation(card) {
    if (!card?.id || state.visibleTranslationsByCardId[card.id] !== true) return null;
    const translation = state.selectedWord?.translationsByCardId?.[card.id];
    if (!translation || translation.error) return null;
    return translation;
  }

  function cardTranslationsVisible(card) {
    return Boolean(card?.id && state.visibleTranslationsByCardId[card.id] === true);
  }

  function cardHasLookupTranslations(card) {
    if (!card) return false;
    const summary = card.summary || {};
    return Boolean(
      cleanTranslationText(card.headwordTranslation) ||
      cleanTranslationText(summary.definitionTranslation) ||
      cleanTranslationText(summary.exampleTranslation) ||
      (Array.isArray(card.sections) && card.sections.some((section) => cleanTranslationText(section?.translation)))
    );
  }

  function lookupOrOverlayHeadword(card, translation) {
    if (!cardTranslationsVisible(card)) return "";
    return cleanTranslationText(card?.headwordTranslation) || translatedHeadword(translation);
  }

  function lookupOrOverlayDefinition(card, translation, meaningIndex = 0) {
    if (!cardTranslationsVisible(card)) return "";
    return cleanTranslationText(card?.summary?.definitionTranslation) ||
      translatedDefinition(translation, meaningIndex);
  }

  function lookupOrOverlaySection(card, section, allSections, translation) {
    if (!section) return "";
    if (!cardTranslationsVisible(card)) return "";
    return cleanTranslationText(section.translation) ||
      translatedSection(section, allSections, translation);
  }

  function translatedHeadword(translation) {
    const overlay = translationOverlay(translation);
    return cleanTranslationText(overlay?.headword);
  }

  function translatedDefinition(translation, meaningIndex = 0) {
    const meaning = translationMeaning(translation, meaningIndex);
    return cleanTranslationText(meaning?.definition);
  }

  function translatedExample(translation, exampleIndex = 0) {
    const examples = translationMeanings(translation).flatMap((meaning) =>
      Array.isArray(meaning?.examples) ? meaning.examples : [],
    );
    return cleanTranslationText(examples[exampleIndex]);
  }

  function translatedSection(section, allSections, translation) {
    if (!section || !translation) return "";
    const peers = Array.isArray(allSections) ? allSections : [];
    if (section.kind === "meaning") {
      const meaningIndex = sectionKindIndex(section, peers, "meaning");
      return meaningIndex >= 0 ? translatedDefinition(translation, meaningIndex) : "";
    }
    if (section.kind === "example") {
      const exampleIndex = sectionKindIndex(section, peers, "example");
      return exampleIndex >= 0 ? translatedExample(translation, exampleIndex) : "";
    }
    if (section.kind === "idiom") {
      const idiomIndex = sectionKindIndex(section, peers, "idiom");
      return idiomIndex >= 0 ? translatedIdiom(translation, idiomIndex) : "";
    }
    return "";
  }

  function translatedIdiom(translation, idiomIndex = 0) {
    const idioms = translationMeanings(translation).flatMap((meaning) =>
      Array.isArray(meaning?.idioms) ? meaning.idioms : [],
    );
    const idiom = idioms[idiomIndex];
    if (typeof idiom === "string") return cleanTranslationText(idiom);
    if (!idiom || typeof idiom !== "object") return "";
    return [
      idiom.translatedExpression,
      idiom.translatedExplanation,
      idiom.expression,
      idiom.explanation,
    ].map(cleanTranslationText).find(Boolean) || "";
  }

  function sectionKindIndex(section, allSections, kind) {
    return allSections.filter((candidate) => candidate?.kind === kind).findIndex((candidate) =>
      candidate === section || (candidate.id && candidate.id === section.id) || (candidate.sourcePath && candidate.sourcePath === section.sourcePath)
    );
  }

  function translationMeaning(translation, meaningIndex = 0) {
    return translationMeanings(translation)[Math.max(0, meaningIndex)] || null;
  }

  function translationMeanings(translation) {
    const overlay = translationOverlay(translation);
    return Array.isArray(overlay?.meanings) ? overlay.meanings : [];
  }

  function translationOverlay(translation) {
    return translation?.overlay && typeof translation.overlay === "object" ? translation.overlay : null;
  }

  function cleanTranslationText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function renderReviewActions(parent, card = null) {
    const displayActions = displayActionsByGroup(card, "progress");
    if (!displayActions.length) {
      if (state.accountStatus !== "signed-in") {
        renderConnectPrompt(parent);
      }
      return;
    }
    const section = appendElement(parent, "div", "af-card-review");
    const actions = appendElement(section, "div", "af-review-actions");
    const feedback = state.cardActionFeedbackByCardId[card?.id];

    for (const displayAction of displayActions) {
      const button = appendButton(actions, displayAction.label || displayAction.id, `afAction-${displayAction.id}`);
      const isActive = feedback?.actionId === displayAction.id && feedback.status !== "error";
      button.disabled = !card?.entryId || feedback?.status === "pending";
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-action-pending", feedback?.actionId === displayAction.id && feedback.status === "pending");
      button.classList.toggle("is-action-saved", feedback?.actionId === displayAction.id && feedback.status === "saved");
      button.addEventListener("click", () => performDisplayAction(card, displayAction));
    }
  }

  function displayActionsByGroup(card, group) {
    return (Array.isArray(card?.displayActions) ? card.displayActions : [])
      .filter((displayAction) => (displayAction.group || "progress") === group);
  }

  function renderConnectPrompt(parent) {
    const prompt = appendElement(parent, "div", "af-connect-prompt");
    const text = appendElement(prompt, "span");
    text.textContent = accountStatusCopy();
    const action = appendButton(prompt, accountConnectLabel(), "afSignIn");
    action.disabled = state.accountLoading;
    action.addEventListener("click", () => {
      if (state.accountStatus === "signed-in") {
        disconnectTwoThousandNlAccount();
      } else {
        connectTwoThousandNlAccount();
      }
    });
  }

  function performDisplayAction(card, displayAction) {
    const command = displayAction?.command;
    if (command?.kind === "card-translation") {
      toggleCardTranslation(card);
      return;
    }
    if (command?.kind === "platform-action") {
      performDictionaryCardAction(card, displayAction, {
        action: command.action,
        ...(command.result ? { result: command.result } : {}),
      });
    }
  }

  function selectLookupWord(word, phraseIndex, selection = {}) {
    const lookupSeq = state.dictionaryLookupSeq + 1;
    const sourceBinding = createDictionarySourceBinding(word, phraseIndex, selection);
    state.dictionaryLookupSeq = lookupSeq;
    state.exampleExpansionOverrides = {};
    state.visibleTranslationsByCardId = {};
    state.cardActionFeedbackByCardId = {};
    state.selectedWord = {
      word,
      phraseIndex,
      selection,
      sourceBinding,
      lookupSeq,
      lookupStatus: "loading",
      lookupResult: null,
      lookupError: "",
      translateUrl: "",
      cardActionStatus: "",
      cardActionError: "",
      translationsByCardId: {},
    };
    state.currentIndex = phraseIndex;
    render();
    lookupSelectedWord(state.selectedWord);
  }

  async function lookupSelectedWord(selectedWord) {
    const phrase = selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || state.phrases[state.currentIndex];
    const source = getSelectedPracticeSource();
    const language = selectedWord.sourceBinding?.captionSource?.languageCode || source?.loadedTranscriptResult?.languageCode || source?.languageCode || "auto";

    try {
      const result = await fetchDictionaryResult({
        word: selectedWord.word,
        language,
        context: phrase?.text || "",
      });
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        lookupStatus: "ready",
        lookupResult: result,
        lookupError: "",
        translateUrl: "",
        cardActionStatus: "",
        cardActionError: "",
      };
      recordDebugEvent("dictionary-lookup-loaded", {
        word: selectedWord.word,
        language,
        provider: result?.meta?.provider || "",
      });
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      const payload = error?.payload || {};
      state.selectedWord = {
        ...state.selectedWord,
        lookupStatus: "error",
        lookupResult: null,
        lookupError: payload.error || (error instanceof Error ? error.message : String(error)),
        translateUrl: payload.translateUrl || "",
      };
      recordDebugEvent("dictionary-lookup-failed", {
        word: selectedWord.word,
        language,
        error: state.selectedWord.lookupError,
      });
    } finally {
      if (isCurrentLookup(selectedWord)) {
        render();
      }
    }
  }

  async function performDictionaryCardAction(card, displayAction, actionPayload) {
    if (!card?.entryId || !state.selectedWord) return;

    const selectedWord = state.selectedWord;
    const action = actionPayload?.action || "";
    const payload = frozenDictionaryActionPayload(selectedWord, card, actionPayload);
    if (!payload.ok) {
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: payload.error,
      };
      render();
      return;
    }
    const pendingMessage = `${displayAction?.label || "Action"}...`;
    state.selectedWord = {
      ...state.selectedWord,
      cardActionError: "",
    };
    state.cardActionFeedbackByCardId = {
      ...state.cardActionFeedbackByCardId,
      [card.id]: {
        status: "pending",
        actionId: displayAction?.id || action,
        message: pendingMessage,
      },
    };
    render();

    try {
      await postDictionaryCommand("dict-action", payload.value);
      if (!isCurrentLookup(selectedWord)) return;
      state.cardActionFeedbackByCardId = {
        ...state.cardActionFeedbackByCardId,
        [card.id]: {
          status: "saved",
          actionId: displayAction?.id || action,
          message: dictionaryActionSuccessMessage(displayAction, action),
        },
      };
      state.selectedWord = {
        ...state.selectedWord,
        cardActionError: "",
      };
      render();
      await lookupSelectedWord(state.selectedWord);
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      state.cardActionFeedbackByCardId = {
        ...state.cardActionFeedbackByCardId,
        [card.id]: {
          status: "error",
          actionId: displayAction?.id || action,
          message: error instanceof Error ? error.message : String(error),
        },
      };
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function dictionaryActionSuccessMessage(displayAction, action) {
    if (action === "start-learning") return "Started learning";
    if (action === "mark-known") return "Marked known";
    const label = displayAction?.label || "Progress";
    return `${label} recorded`;
  }

  function createDictionarySourceBinding(word, phraseIndex, selection = {}) {
    const phrase = state.phrases[phraseIndex] || state.phrases[state.currentIndex] || null;
    const source = getSelectedPracticeSource();
    const transcript = source?.loadedTranscriptResult || state.transcriptResult || {};
    const languageCode =
      normalizeLanguageCode(transcript.languageCode) ||
      normalizeLanguageCode(source?.languageCode) ||
      normalizeLanguageCode(state.selectedTrack?.languageCode);
    const artifact = transcript.practiceArtifact
      ? normalizeBackendPracticeArtifact(transcript.practiceArtifact, languageCode)
      : buildExtensionFallbackArtifact(transcript, phrase, languageCode);

    return {
      bindingVersion: DICTIONARY_BINDING_VERSION,
      videoId: state.videoId || "",
      captionSource: {
        languageCode,
        trackExternalId: stableCaptionTrackId(source, transcript),
        trackKind: captionTrackKind(source, transcript),
      },
      artifact,
      phrase: {
        id: phrase?.id ?? phrase?.index ?? phraseIndex,
        index: Number.isInteger(phrase?.index) ? phrase.index : phraseIndex,
        startMs: finiteInteger(phrase?.startMs),
        endMs: finiteInteger(phrase?.endMs),
        timingQuality: timingQualityFromTranscript(transcript),
        locatorConfidence: locatorConfidenceFromTranscript(transcript),
        text: boundedText(phrase?.text || "", 1000),
        textHash: stableFingerprint(phrase?.text || ""),
      },
      selection: {
        clickedForm: boundedText(word || selection.originalToken || "", 160),
        tokenIndex: finiteInteger(selection.tokenIndex),
        charStart: finiteInteger(selection.charStart),
        charEnd: finiteInteger(selection.charEnd),
      },
      capturedAt: new Date().toISOString(),
    };
  }

  function normalizeBackendPracticeArtifact(artifact, languageCode) {
    return stripEmpty({
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_backend",
      snapshotRevisionId: artifact.snapshotRevisionId,
      textSourceId: artifact.textSourceId,
      textSourceRevisionId: artifact.textSourceRevisionId,
      textContentFingerprint: artifact.textContentFingerprint,
      timingEvidenceRevisionId: artifact.timingEvidenceRevisionId,
      phraseSetRevisionId: artifact.phraseSetRevisionId,
      builderVersion: artifact.builderVersion,
      languageCode: normalizeLanguageCode(artifact.languageCode) || languageCode,
      quality: artifact.quality,
    });
  }

  function buildExtensionFallbackArtifact(transcript, phrase, languageCode) {
    const phraseSetFingerprint = stableFingerprint({
      builderVersion: EXTENSION_FALLBACK_BUILDER_VERSION,
      videoId: state.videoId || "",
      selectedSourceId: state.selectedSourceId || "",
      languageCode,
      sourceKind: transcript.sourceKind || "",
      retrievalPath: transcript.retrievalPath || "",
      timingExactness: transcript.timingExactness || "",
      qualityFlags: transcript.qualityFlags || [],
      cues: Array.isArray(phrase?.cues)
        ? phrase.cues.map((cue) => ({
          startMs: finiteInteger(cue.startMs),
          endMs: finiteInteger(cue.endMs),
          textHash: stableFingerprint(cue.text || ""),
        }))
        : [],
      phrase: {
        index: phrase?.index,
        startMs: finiteInteger(phrase?.startMs),
        endMs: finiteInteger(phrase?.endMs),
        textHash: stableFingerprint(phrase?.text || ""),
      },
    });
    return stripEmpty({
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_extension_fallback",
      textContentFingerprint: phraseSetFingerprint,
      builderVersion: EXTENSION_FALLBACK_BUILDER_VERSION,
      languageCode,
      quality: transcript.fallbackReason || transcript.timingExactness || "extension-fallback",
    });
  }

  function stableCaptionTrackId(source, transcript) {
    return source?.track?.vssId ||
      transcript.selectedTrackId ||
      transcript.actualTrackId ||
      stableFingerprint({
        languageCode: source?.languageCode || transcript.languageCode || "",
        name: source?.name || "",
        kind: source?.track?.kind || transcript.sourceKind || "",
      });
  }

  function captionTrackKind(source, transcript) {
    const kind = source?.track?.kind === "asr" ? "auto" : transcript.sourceKind || sourceKindFromTrack(source?.track);
    if (kind === "manual" || kind === "auto" || kind === "provider") return kind;
    return "unknown";
  }

  function timingQualityFromTranscript(transcript) {
    if (transcript.timingExactness === "word-level") return "word";
    if (transcript.timingExactness === "exact") return "cue";
    if (transcript.timingExactness === "inferred-end") return "approximate";
    return transcript.timingExactness || "approximate";
  }

  function locatorConfidenceFromTranscript(transcript) {
    if (transcript.practiceArtifact?.producer === "audiofilms_backend") return "canonical";
    if (transcript.timingExactness === "exact" || transcript.timingExactness === "word-level") return "derived";
    return "approximate";
  }

  function frozenDictionaryActionPayload(selectedWord, card, actionPayload = {}) {
    const action = actionPayload?.action || "";
    const binding = selectedWord.sourceBinding;
    if (!binding?.videoId) {
      return { ok: false, error: "Cannot save progress: the YouTube video identity is unavailable." };
    }
    if (state.videoId && binding.videoId !== state.videoId) {
      return { ok: false, error: "This dictionary card belongs to a previous YouTube video. Click the word again on the current video." };
    }
    const clientEventId = actionPayload?.clientEventId || createMutationTurnId();
    const turnId = actionPayload?.turnId || (
      (action === "review-card" || action === "mark-known" || action === "mark-unknown") && isUuid(clientEventId)
        ? clientEventId
        : undefined
    );
    const payload = {
      ...actionPayload,
      clientEventId,
      ...(turnId ? { turnId } : {}),
      sourceContext: buildDictionaryActionSourceContext(binding, card, action),
      entryId: card.entryId,
    };
    return { ok: true, value: payload };
  }

  function buildDictionaryActionSourceContext(binding, card, action) {
    const video = getVideoElement();

    return {
      contractVersion: "source-context-v2",
      source: {
        kind: "youtube_video",
        provider: "youtube",
        externalId: binding.videoId,
        languageCode: binding.captionSource?.languageCode || undefined,
      },
      artifact: binding.artifact,
      location: {
        kind: "caption_phrase",
        phraseIndex: finiteInteger(binding.phrase?.index),
        startMs: finiteInteger(binding.phrase?.startMs),
        endMs: finiteInteger(binding.phrase?.endMs),
        locatorConfidence: binding.phrase?.locatorConfidence,
        phraseTextHash: binding.phrase?.textHash,
        timingQuality: binding.phrase?.timingQuality,
      },
      selection: {
        clickedForm: binding.selection?.clickedForm || card?.clickedForm || card?.headword || "",
        tokenIndex: finiteInteger(binding.selection?.tokenIndex),
        charStart: finiteInteger(binding.selection?.charStart),
        charEnd: finiteInteger(binding.selection?.charEnd),
        contextText: binding.phrase?.text || "",
      },
      observation: {
        currentPlaybackTimeMs: video ? finiteInteger(video.currentTime * 1000) : null,
        title: youtubeVideoTitle(),
        capturedAt: new Date().toISOString(),
      },
      diagnostics: {
        action,
        cardId: card?.id || "",
        bindingVersion: binding.bindingVersion,
        clientVersion: extensionVersion(),
        captionSource: binding.captionSource,
        fallbackReason: binding.artifact?.producer === "audiofilms_extension_fallback"
          ? binding.artifact?.quality || ""
          : "",
      },
    };
  }

  function youtubeVideoTitle() {
    const title = document.title || "";
    return title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function normalizeLanguageCode(languageCode) {
    const normalized = String(languageCode || "").trim().toLowerCase().replace("_", "-");
    return normalized === "auto" ? "" : normalized;
  }

  function boundedText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  function stripEmpty(value) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
    );
  }

  function stableFingerprint(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `af-fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function extensionVersion() {
    try {
      return chrome?.runtime?.getManifest?.()?.version || "";
    } catch (_error) {
      return "";
    }
  }

  function isUuid(value) {
    return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async function requestDictionaryCardTranslation(card) {
    if (!card?.entryId || !state.selectedWord) return;

    const selectedWord = state.selectedWord;
    state.selectedWord = {
      ...state.selectedWord,
      cardActionStatus: "Loading translation...",
      cardActionError: "",
    };
    render();

    try {
      const translation = await postDictionaryCommand("dict-translation", {
        entryId: card.entryId,
      });
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: "",
        translationsByCardId: {
          ...(state.selectedWord.translationsByCardId || {}),
          [card.id]: translation,
        },
      };
      render();
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function isCurrentLookup(selectedWord) {
    return state.selectedWord?.lookupSeq === selectedWord.lookupSeq &&
      state.selectedWord?.word === selectedWord.word;
  }

  async function fetchDictionaryResult({ word, language, context }) {
    const endpoint = dictionaryLookupEndpoint();
    if (!endpoint) {
      throw new Error("Dictionary lookup is disabled.");
    }

    const response = await requestDictionaryCommand("dict-lookup", {
      clickedForm: word,
      sourceLanguageCode: language || "auto",
      ...(context ? { contextText: context } : {}),
    });
    const text = response.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const message = safeLookupErrorMessage(response, payload, text);
      const error = new Error(`Dictionary lookup failed: HTTP ${response.status} ${message}`);
      error.payload = payload || { error: message };
      throw error;
    }

    return payload;
  }

  function safeLookupErrorMessage(response, payload, text) {
    if (response.error) return response.error;
    if (payload?.error || payload?.detail) return payload.error || payload.detail;
    const body = String(text || "").trim();
    if (/^<!doctype\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
      if (response.status === 404) {
        return "Dictionary endpoint is unavailable on the remote AudioFilms API.";
      }
      return "Dictionary endpoint returned HTML instead of JSON.";
    }
    return body.slice(0, 180) || `HTTP ${response.status}`;
  }

  function dictionaryLookupEndpoint() {
    if (window.__afShadowingConfig?.dictionaryEndpoint) {
      return window.__afShadowingConfig.dictionaryEndpoint();
    }

    const configured = window.localStorage.getItem("afShadowingDictionaryUrl") || "";
    if (configured === "off") return "";
    if (configured) return configured;
    return "https://audiofilms-api.dilum.io/api/dict";
  }

  async function postDictionaryCommand(operation, payload) {
    const response = await requestDictionaryCommand(operation, payload);
    const text = response.text || "";
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_error) {
      body = null;
    }
    if (!response.ok) {
      throw new Error(body?.error || body?.detail || response.error || `HTTP ${response.status}`);
    }
    return body;
  }

  async function syncTwoThousandNlAccount() {
    try {
      const session = await getFreshTwoThousandNlSession();
      setTwoThousandNlSessionState(session, "");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordDebugEvent("connect-session-sync-failed", { error: message });
      setTwoThousandNlSessionState(null, message);
    }
    render();
  }

  async function connectTwoThousandNlAccount() {
    state.accountLoading = true;
    state.accountError = "";
    render();

    try {
      const response = await sendRuntimeMessage({
        type: "af-connect-2000nl",
      });
      if (!response?.ok) {
        throw new Error(response?.error || "2000NL authorization failed.");
      }
      setTwoThousandNlSessionState(response.session, "");
      if (state.selectedWord) {
        selectLookupWord(state.selectedWord.word, state.selectedWord.phraseIndex);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordDebugEvent("connect-session-connect-failed", { error: message });
      setTwoThousandNlSessionState(null, message);
    } finally {
      state.accountLoading = false;
      render();
    }
  }

  async function disconnectTwoThousandNlAccount() {
    state.accountLoading = true;
    state.accountError = "";
    render();

    try {
      await sendRuntimeMessage({
        type: "af-disconnect-2000nl",
      });
      setTwoThousandNlSessionState(null, "");
      if (state.selectedWord) {
        selectLookupWord(state.selectedWord.word, state.selectedWord.phraseIndex);
        return;
      }
    } catch (error) {
      state.accountError = error instanceof Error ? error.message : String(error);
    } finally {
      state.accountLoading = false;
      render();
    }
  }

  async function getFreshTwoThousandNlSession() {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      return null;
    }
    const response = await sendRuntimeMessage({
      type: "af-get-2000nl-session",
    });
    if (!response?.ok) {
      const message = response?.error || "2000NL session is unavailable.";
      recordDebugEvent("connect-session-refresh-failed", { error: message });
      setTwoThousandNlSessionState(null, message);
      return null;
    }
    const session = response.session || null;
    const backendSession = session?.user ? await fetchDictionarySession().catch(() => null) : null;
    const mergedSession = backendSession
      ? {
          ...session,
          authenticated: backendSession.authenticated === true,
          user: backendSession.user || session.user || null,
          preferences: backendSession.preferences || null,
        }
      : session;
    setTwoThousandNlSessionState(mergedSession, "");
    return mergedSession || null;
  }

  function setTwoThousandNlSessionState(session, error) {
    state.accountUser = session?.user || null;
    state.accountPreferences = session?.preferences || null;
    state.accountError = error || "";
    if (session?.user) {
      state.accountStatus = "signed-in";
    } else if (error) {
      state.accountStatus = "expired";
    } else {
      state.accountStatus = "guest";
    }
  }

  function createMutationTurnId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `af-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function fetchDictionarySession() {
    const response = await requestDictionaryCommand("dict-session");
    const text = response.text || "";
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_error) {
      body = null;
    }
    if (!response.ok) {
      throw new Error(body?.error || body?.detail || response.error || `HTTP ${response.status}`);
    }
    return body;
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function requestDictionaryCommand(operation, body = null) {
    const mockResponse = dictionaryMockResponse(operation, body);
    if (mockResponse) return Promise.resolve(mockResponse);

    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      const endpoint = dictionaryLookupEndpoint();
      if (!endpoint) {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: JSON.stringify({ error: "Dictionary backend is disabled." }),
        });
      }
      const url = new URL(endpoint);
      if (operation === "dict-lookup") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/lookup");
      } else if (operation === "dict-action") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/actions");
      } else if (operation === "dict-translation") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/translation");
      } else if (operation === "phrase-translation") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/practice/phrase-translations");
      } else if (operation === "dict-session") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/session");
        return fetch(url.toString(), {
          credentials: "omit",
          method: "GET",
          headers: { accept: "application/json" },
        }).then(async (response) => ({
          ok: response.ok,
          status: response.status,
          text: await response.text(),
        }));
      }
      return fetch(url.toString(), {
        credentials: "omit",
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(body || {}),
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      }));
    }

    return sendRuntimeMessage({
      type: "af-dictionary-command",
      operation,
      body,
    });
  }

  function dictionaryMockResponse(operation, body = null) {
    if (window.localStorage.getItem("afShadowingDictionaryMock") !== "cards") return null;
    if (operation === "dict-lookup") {
      return jsonCommandResponse(mockDictionaryLookup(body));
    }
    if (operation === "dict-translation") {
      if (body?.entryId === "entry-translate-error") {
        return jsonCommandResponse({ error: "Card translation failed." }, false, 500);
      }
      return jsonCommandResponse({
        status: "ready",
        overlay: {
          headword: "apple",
          meanings: [
            {
              definition: "круглый фрукт для учебных примеров",
              examples: ["яблоко от яблони недалеко падает"],
            },
          ],
        },
      });
    }
    if (operation === "dict-action") {
      return jsonCommandResponse({ ok: true });
    }
    return null;
  }

  function jsonCommandResponse(body, ok = true, status = 200) {
    return {
      ok,
      status,
      text: JSON.stringify(body),
    };
  }

  function mockDictionaryLookup(body = {}) {
    const clickedForm = body?.clickedForm || "appel";
    return {
      request: {
        clickedForm,
        sourceLanguageCode: body?.sourceLanguageCode || "nl",
        contextText: body?.contextText || "",
      },
      cards: [
        mockDictionaryCard({
          id: "mock-learn",
          entryId: "entry-learn",
          clickedForm,
          headword: "appel",
          phase: "encountered",
          progressActions: [
            progressDisplayAction("learn", "Learn", "start-learning"),
            progressDisplayAction("known", "Known", "mark-known", undefined, true),
          ],
        }),
        mockDictionaryCard({
          id: "mock-review",
          entryId: "entry-review",
          clickedForm,
          headword: "appel",
          phase: "reviewing",
          progressActions: [
            progressDisplayAction("again", "Again", "review-card", "fail", true),
            progressDisplayAction("hard", "Hard", "review-card", "hard", true),
            progressDisplayAction("good", "Good", "review-card", "success", true),
            progressDisplayAction("easy", "Easy", "review-card", "easy", true),
          ],
        }),
        mockDictionaryCard({
          id: "mock-frozen",
          entryId: "entry-translate-error",
          clickedForm,
          headword: "appel",
          phase: "frozen",
          progressActions: [],
        }),
      ],
      meta: {
        provider: "mock",
        version: "dictionary-card-ui-smoke",
      },
    };
  }

  function mockDictionaryCard({ id, entryId, clickedForm, headword, phase, progressActions }) {
    const includeLookupTranslations = entryId !== "entry-translate-error";
    return {
      id,
      entryId,
      clickedForm,
      headword,
      language: "Dutch",
      partOfSpeech: "noun",
      match: { relation: "exact", confidence: 1 },
      summary: {
        definition: "A round fruit used in learner examples.",
        ...(includeLookupTranslations ? { definitionTranslation: "круглый фрукт для учебных примеров" } : {}),
        example: `${clickedForm} valt niet ver van de boom.`,
        ...(includeLookupTranslations ? { exampleTranslation: "яблоко от яблони недалеко падает" } : {}),
      },
      ...(includeLookupTranslations ? { headwordTranslation: "apple" } : {}),
      chips: [
        { kind: "part-of-speech", label: "noun" },
        { kind: "language", label: "Dutch" },
      ],
      sections: [
        { kind: "meaning", label: "Definition", text: "A round fruit used in learner examples." },
        {
          kind: "example",
          label: "Example",
          text: `${clickedForm} valt niet ver van de boom.`,
          ...(includeLookupTranslations ? { translation: "The apple does not fall far from the tree." } : {}),
        },
      ],
      ...(includeLookupTranslations
        ? {
            translation: {
              status: "ready",
              targetLanguageCode: "ru",
              translationId: `mock-translation-${id}`,
              translationPolicyVersion: "mock-v1",
            },
          }
        : {}),
      progress: {
        phase,
        seenCount: phase === "encountered" ? 1 : 4,
        lastSeenAt: new Date().toISOString(),
      },
      displayActions: [
        ...progressActions,
        {
          id: "translate",
          label: "Translate",
          group: "translation",
          enabled: true,
          command: { kind: "card-translation" },
        },
      ],
    };
  }

  function progressDisplayAction(id, label, action, result, requiresTurnId = false) {
    return {
      id,
      label,
      group: "progress",
      enabled: true,
      command: {
        kind: "platform-action",
        action,
        ...(result ? { result } : {}),
        ...(requiresTurnId ? { requiresTurnId: true } : {}),
      },
    };
  }

  async function postBackendJson(operation, body = {}) {
    return backendJson(operation, body);
  }

  async function getBackendJson(operation, body = {}) {
    return backendJson(operation, body);
  }

  async function backendJson(operation, body = {}) {
    const response = await requestBackendCommand(operation, body);
    const text = response.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        payload?.detail ||
        backendErrorFromText(response, text) ||
        response.error ||
        `HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function backendErrorFromText(response, text) {
    const body = String(text || "").trim();
    if (/^<!doctype\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
      if (response.status === 404) {
        return "Timing endpoint is unavailable on this AudioFilms API.";
      }
      return "Timing endpoint returned HTML instead of JSON.";
    }
    return "";
  }

  function requestBackendCommand(operation, body = {}) {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      return requestBackendCommandDirect(operation, body);
    }
    return sendRuntimeMessage({
      type: "af-backend-command",
      operation,
      body,
    });
  }

  function requestBackendCommandDirect(operation, body = {}) {
    const apiBase = apiBaseForBackendCommands();
    if (!apiBase) {
      return Promise.resolve({
        ok: false,
        status: 400,
        text: JSON.stringify({ error: "AudioFilms backend is disabled." }),
      });
    }
    const fetchOptions = { credentials: "omit", method: "GET", headers: { accept: "application/json" } };
    let url;
    if (operation === "practice-timing-create") {
      url = new URL("/api/practice/timing-jobs", `${apiBase}/`);
      fetchOptions.method = "POST";
      fetchOptions.headers["content-type"] = "application/json";
      fetchOptions.body = JSON.stringify(body.payload || {});
    } else if (operation === "practice-operation") {
      url = new URL(`/api/practice/operations/${encodeURIComponent(body.operationId || "")}`, `${apiBase}/`);
    } else {
      return Promise.resolve({
        ok: false,
        status: 400,
        text: JSON.stringify({ error: "Unsupported backend command." }),
      });
    }
    return fetch(url.toString(), fetchOptions).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    }));
  }

  function apiBaseForBackendCommands() {
    if (window.__afShadowingConfig?.apiBase) {
      return window.__afShadowingConfig.apiBase();
    }
    return "https://audiofilms-api.dilum.io";
  }

  function accountStatusLabel() {
    if (state.accountStatus === "signed-in") return state.accountUser?.email || "2000NL connected";
    if (state.accountStatus === "expired") return "Reconnect 2000NL";
    return "Guest lookup";
  }

  function accountStatusAriaLabel() {
    if (state.accountStatus === "signed-in") {
      return `2000NL account connected${state.accountUser?.email ? ` as ${state.accountUser.email}` : ""}`;
    }
    if (state.accountStatus === "expired") return "Reconnect 2000NL account";
    return "Connect 2000NL account";
  }

  function accountStatusCopy() {
    if (state.accountLoading) return "Connecting to 2000NL...";
    if (state.accountStatus === "signed-in") {
      return state.accountUser?.email
        ? `Connected as ${state.accountUser.email}.`
        : "Connected to 2000NL.";
    }
    if (state.accountStatus === "expired") {
      return state.accountError
        ? `Session expired: ${state.accountError}`
        : "Session expired. Reconnect to restore lookup and progress.";
    }
    return "Not connected. Personal progress is off.";
  }

  function accountConnectLabel() {
    if (state.accountLoading) return "Connecting...";
    if (state.accountStatus === "signed-in") return "Disconnect";
    if (state.accountStatus === "expired") return "Reconnect 2000NL";
    return "Connect 2000NL";
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function normalizeLookupWord(token) {
    return token
      .replace(/^[^\p{L}\p{N}]+/gu, "")
      .replace(/[^\p{L}\p{N}]+$/gu, "");
  }

  function wordsEqual(left, right) {
    return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
  }

  function formatTimestamp(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  async function initializeForCurrentVideo() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    updateBootDiagnostics({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });
    if (!videoId || videoId === state.videoId || state.loading) return;

    const previousVideoId = state.videoId;
    const loadToken = state.loadToken + 1;
    state.videoId = videoId;
    state.loadToken = loadToken;
    state.tracks = [];
    state.practiceSources = [];
    state.selectedSourceId = "";
    state.sourceMenuOpen = false;
    state.selectedTrack = null;
    state.cueSource = "";
    state.transcriptResult = null;
    state.cues = [];
    state.phrases = [];
    state.currentIndex = 0;
    state.textVisible = true;
    state.shadowTextVisible = true;
    state.phraseTranslationVisible = false;
    state.phraseTranslations = {};
    state.timingOperation = null;
    state.timingOperationError = "";
    clearTimingOperationPoll();
    state.selectedWord = null;
    state.guidedMode = false;
    state.error = "";
    state.loading = true;
    stopPlaybackTimer();
    detachPassivePlaybackWatcher();
    resetTranscriptPanelState(previousVideoId);
    render();

    try {
      const playerResponse = await waitForPlayerResponse();
      state.tracks = captionTrackApi.getCaptionTracks(playerResponse);
      updateBootDiagnostics({ captionTracksCount: state.tracks.length });
      state.practiceSources = captionTrackApi.buildPracticeSources(state.tracks);
      const defaultSource = captionTrackApi.chooseDefaultPracticeSource(state.practiceSources);
      if (!defaultSource) {
        throw new Error("No caption tracks found for this video.");
      }
      await loadPracticeSource(defaultSource, { keepExistingOnError: false, preserveVideoTime: false, loadToken });
    } catch (error) {
      if (loadToken !== state.loadToken) return;
      state.error = error instanceof Error ? error.message : String(error);
      updateBootDiagnostics({ lastError: state.error });
    } finally {
      if (loadToken === state.loadToken) {
        state.loading = false;
        render();
      }
    }
  }

  async function waitForPlayerResponse() {
    const startedAt = Date.now();
    let fetchedFreshPage = false;
    let lastError = "";

    while (Date.now() - startedAt < 10000) {
      const response = extractPlayerResponse();
      if (response) return response;

      if (!fetchedFreshPage && Date.now() - startedAt > 1000) {
        fetchedFreshPage = true;
        try {
          const freshResponse = await fetchFreshPlayerResponse();
          if (freshResponse) return freshResponse;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          recordDebugEvent("player-metadata-fetch-failed", {
            videoId: youtubeAdapterApi.getVideoIdFromUrl(),
            error: lastError,
          });
        }
      }

      await delay(250);
    }
    throw new Error(lastError ? `Could not read YouTube player metadata. ${lastError}` : "Could not read YouTube player metadata.");
  }

  function extractPlayerResponse() {
    return youtubeAdapterApi.extractPlayerResponseFromDocument(document, youtubeAdapterApi.getVideoIdFromUrl());
  }

  async function fetchFreshPlayerResponse() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    if (!videoId) return null;

    recordDebugEvent("player-metadata-fetch-start", { videoId });
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const html = await response.text();

    if (!response.ok) {
      throw new Error(`Fresh watch page request failed: HTTP ${response.status}`);
    }

    const playerResponse = youtubeAdapterApi.extractPlayerResponseFromText(html, videoId);
    if (!playerResponse) {
      throw new Error("Fresh watch page did not contain current player metadata.");
    }

    recordDebugEvent("player-metadata-fetch-loaded", {
      videoId,
      tracks: captionTrackApi.getCaptionTracks(playerResponse).length,
    });
    return playerResponse;
  }

  function resetTranscriptPanelState(previousVideoId) {
    document.documentElement.dataset.afTranscriptVideoId = "";
    Array.from(document.querySelectorAll("[data-af-current]")).forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (previousVideoId && previousVideoId !== state.videoId) {
      closeOpenTranscriptPanels();
    }
  }

  function closeOpenTranscriptPanels() {
    const closeButtons = Array.from(document.querySelectorAll("button[aria-label*='Close transcript'], button[aria-label*='Sluiten']"));
    const button = closeButtons.find((candidate) => isVisibleElement(candidate));
    if (button instanceof HTMLElement) {
      activateElement(button);
    }
  }

  function getSelectedPracticeSource() {
    return state.practiceSources.find((source) => source.id === state.selectedSourceId) || null;
  }

  async function selectPracticeSource(sourceId) {
    const source = state.practiceSources.find((candidate) => candidate.id === sourceId);
    if (!source || source.id === state.selectedSourceId || state.loading) return;

    state.sourceMenuOpen = false;
    await loadPracticeSource(source, { keepExistingOnError: true, preserveVideoTime: true });
  }

  async function loadPracticeSource(source, options) {
    const loadToken = options.loadToken ?? state.loadToken;
    if (loadToken !== state.loadToken) return;

    const video = getVideoElement();
    const currentMs = options.preserveVideoTime && video ? video.currentTime * 1000 : 0;

    state.loading = true;
    state.error = "";
    source.error = "";
    source.lastError = "";
    source.lastRetrievalAttempts = [];
    render();

    try {
      state.cueSource = "";
      state.transcriptResult = null;
      const cachedTimingResult = options.refreshCache
        ? null
        : await fetchReusableTimingTranscriptResult(source);
      const transcriptResult = cachedTimingResult || await fetchBestAvailableCues(source.track, {
        refreshCache: Boolean(options.refreshCache),
      });
      const cues = transcriptResult.cues;
      const phrases = transcriptResult.practicePhraseSource === "backend"
        ? cues.map((cue, index) => ({
          id: cue.phraseId ?? index,
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: phraseApi.cleanPhraseText(cue.text),
          cues: [cue],
          index,
        }))
        : phraseApi.buildPhrases(cues, {
          maxPhraseDurationMs: MAX_PHRASE_DURATION_MS,
          longPauseMs: LONG_PAUSE_MS,
          maxWords: 18,
          maxCharacters: 140,
        });
      if (loadToken !== state.loadToken) return;
      if (!phrases.length) {
        throw new Error("Caption track loaded, but no timed phrases were parsed.");
      }

      state.selectedSourceId = source.id;
      state.selectedTrack = source.track;
      state.cues = cues;
      state.transcriptResult = transcriptResult;
      state.phrases = phrases;
      state.currentIndex = findPhraseIndexForTime(phrases, currentMs);
      state.selectedWord = null;
      state.phraseTranslations = {};
      state.timingOperationError = "";
      source.loadedCueSource = transcriptResult.retrievalPath;
      source.loadedTranscriptResult = summarizeTranscriptResult(transcriptResult);
      source.lastRetrievalAttempts = transcriptResult.retrievalAttempts || [];
      state.guidedMode = state.autoPause;
      state.passivePausedKey = "";
      state.error = "";
      updateBootDiagnostics({
        selectedRetrievalPath: transcriptResult.retrievalPath,
        lastError: "",
      });
      ensurePassivePlaybackWatcher();
      const video = getVideoElement();
      if (video && state.autoPause) {
        syncPassivePlayback(video);
      }
      recordDebugEvent("source-loaded", {
        source: captionTrackApi.sourceDisplayName(source),
        sourceKind: transcriptResult.sourceKind,
        retrievalPath: transcriptResult.retrievalPath,
        timingExactness: transcriptResult.timingExactness,
        qualityFlags: transcriptResult.qualityFlags,
        warnings: transcriptResult.warnings,
        cues: cues.length,
        phrases: phrases.length,
      });
    } catch (error) {
      if (loadToken !== state.loadToken) return;
      const message = error instanceof Error ? error.message : String(error);
      source.lastError = message;
      source.error = summarizeError(message);
      source.lastRetrievalAttempts = Array.isArray(error?.retrievalAttempts) ? error.retrievalAttempts : [];
      state.error = options.keepExistingOnError && state.phrases.length ? "" : source.error;
      updateBootDiagnostics({ lastError: message });
      recordDebugEvent("source-failed", {
        source: captionTrackApi.sourceDisplayName(source),
        languageCode: source.languageCode,
        error: message,
      });
      if (!options.keepExistingOnError) {
        state.selectedSourceId = source.id;
        state.selectedTrack = source.track;
        state.cues = [];
        state.transcriptResult = null;
        state.phrases = [];
        state.currentIndex = 0;
        state.sourceMenuOpen = state.practiceSources.length > 1;
      }
    } finally {
      if (loadToken === state.loadToken) {
        state.loading = false;
        render();
      }
    }
  }

  async function fetchReusableTimingTranscriptResult(source) {
    if (!state.videoId) return null;

    try {
      const operation = await postBackendJson("practice-timing-create", {
        apiBase: apiBaseForBackendCommands(),
        payload: {
          ...buildPracticeTimingPayload(source),
          reuseOnly: true,
        },
      });
      return transcriptResultFromPracticeTimingOperation(operation);
    } catch (error) {
      recordDebugEvent("timing-cache-miss", {
        source: captionTrackApi.sourceDisplayName(source),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  function transcriptResultFromPracticeTimingOperation(operation) {
    const snapshot = operation?.result?.snapshot;
    const phrases = snapshot?.phraseSet?.phrases;
    if (operation?.kind !== "improve-timing" || operation.state !== "succeeded" || !Array.isArray(phrases) || !phrases.length) {
      return null;
    }

    const applicability = operation.result?.applicability;
    if (!applicability?.appliesToCurrentSnapshot) {
      recordDebugEvent("timing-cache-skipped", {
        operationId: operation.id || "",
        staleReason: applicability?.staleReason || "missing-applicability",
        requestedSnapshotRevisionId: applicability?.requestedSnapshotRevisionId || "",
        resultSnapshotRevisionId: applicability?.resultSnapshotRevisionId || operation.result?.snapshotRevisionId || "",
        requestedTextSourceRevisionId: applicability?.requestedTextSourceRevisionId || "",
        resultTextSourceRevisionId: applicability?.resultTextSourceRevisionId || operation.result?.textSourceRevisionId || "",
      });
      return null;
    }

    const cues = phrases.map((phrase, index) => ({
      startMs: Math.max(0, Number(phrase.startSec || 0) * 1000),
      endMs: Math.max(0, Number(phrase.endSec || 0) * 1000),
      text: phraseApi.cleanPhraseText(phrase.text || ""),
      index,
    })).filter((cue) => cue.text && cue.endMs >= cue.startMs);

    if (!cues.length) return null;

    const textSource = operation.input?.textSource || snapshot.textSource?.kind || "";
    const isManualTextSource = textSource === "manual" || snapshot.textSource?.kind === "provided-captions";

    return {
      cues,
      sourceKind: isManualTextSource ? "manual" : "asr",
      retrievalPath: "practice-timing-cache",
      fetchOrigin: "backend",
      provider: "audiofilms-practice-timing",
      selectedTrackId: "",
      actualTrackId: operation.result?.diagnostics?.asrJobId || "",
      languageCode: snapshot.textSource?.languageCode || operation.input?.language || "",
      timingExactness: "word-level",
      qualityFlags: [],
      warnings: [
        isManualTextSource
          ? `ASR timing cache aligned ${cues.length} caption phrases.`
          : `ASR job completed: ${cues.length} ASR transcript phrases.`,
      ],
      retrievalAttempts: [{ path: "practice-timing-cache", status: "ok", cues: cues.length }],
      cacheStatus: "hit",
      fallbackUsed: false,
      primaryProvider: "asr-cache",
      failedProvider: "",
      fallbackReason: "",
      practicePhraseSource: "backend",
      practiceSnapshot: snapshot,
      practiceArtifact: practiceArtifactFromSnapshot(snapshot),
    };
  }

  function practiceArtifactFromSnapshot(snapshot) {
    if (!snapshot?.phraseSet?.revisionId) return null;
    return {
      artifactKind: "caption_phrase_set",
      producer: "audiofilms_backend",
      snapshotRevisionId: snapshot.snapshotRevisionId || "",
      textSourceId: snapshot.textSource?.id || "",
      textSourceRevisionId: snapshot.textSource?.revisionId || "",
      textContentFingerprint: snapshot.textSource?.contentFingerprint || "",
      timingEvidenceRevisionId: snapshot.timingEvidence?.revisionId || "",
      phraseSetRevisionId: snapshot.phraseSet.revisionId || "",
      languageCode: snapshot.textSource?.languageCode || "",
      quality: snapshot.timingEvidence?.quality || "",
    };
  }

  function summarizeError(message) {
    if (/Backend provider fallback is disabled/i.test(message)) {
      return "Caption retrieval failed: YouTube captions were empty and AudioFilms fallback is off.";
    }
    if (/Backend provider request timed out|Backend provider returned no response|Backend provider request failed/i.test(message)) {
      return "Caption retrieval failed: YouTube captions were empty and AudioFilms fallback failed.";
    }
    if (/Diagnostic YouTube transcript fallback is disabled/i.test(message) && /empty response/i.test(message)) {
      return "Caption retrieval failed: YouTube captions were empty and transcript fallback is off.";
    }
    const first = message.split("|")[0]?.split(";")[0]?.trim() || message;
    return first.length > 140 ? `${first.slice(0, 137)}...` : first;
  }

  function findPhraseIndexForTime(phrases, currentMs) {
    if (!phrases.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    const activeIndex = phrases.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex >= 0) return activeIndex;

    for (let index = phrases.length - 1; index >= 0; index -= 1) {
      if (phrases[index].startMs <= currentMs) return index;
    }

    return 0;
  }

  function findPlaybackPhraseIndex(phrases, currentMs) {
    if (!phrases.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    for (let index = 0; index < phrases.length; index += 1) {
      const phrase = phrases[index];
      if (
        currentMs >= phrase.startMs - PRE_ROLL_MS &&
        currentMs <= playbackEndMsForPhrase(phrases, index)
      ) {
        return index;
      }
    }

    return findPhraseIndexForTime(phrases, currentMs);
  }

  async function fetchBestAvailableCues(track, options = {}) {
    if (!transcriptRetrievalApi?.fetchBestAvailableCues) {
      throw new Error("Transcript retrieval helper was not loaded.");
    }

    const result = await transcriptRetrievalApi.fetchBestAvailableCues(track, {
      videoId: state.videoId,
      recordDebugEvent,
      updateRetrievalPath: (path) => updateBootDiagnostics({ selectedRetrievalPath: path }),
      updateLastError: (message) => updateBootDiagnostics({ lastError: message }),
      refreshCache: Boolean(options.refreshCache),
    });
    return normalizeTranscriptResult(result, track);
  }

  function normalizeTranscriptResult(result, track) {
    const normalized = {
      cues: Array.isArray(result?.cues) ? result.cues : [],
      sourceKind: result?.sourceKind || sourceKindFromTrack(track),
      retrievalPath: result?.retrievalPath || result?.cueSource || "backend-provider",
      fetchOrigin: result?.fetchOrigin || fetchOriginFromRetrievalPath(result?.retrievalPath || result?.cueSource || "backend-provider"),
      provider: result?.provider || result?.actualTrackId || "",
      selectedTrackId: result?.selectedTrackId || track?.vssId || track?.languageCode || "",
      actualTrackId: result?.actualTrackId || "",
      languageCode: result?.languageCode || track?.languageCode || "",
      timingExactness: result?.timingExactness || "approximate",
      qualityFlags: Array.isArray(result?.qualityFlags) ? result.qualityFlags : [],
      warnings: Array.isArray(result?.warnings) ? result.warnings : [],
      retrievalAttempts: Array.isArray(result?.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result?.cacheStatus || "",
      fallbackUsed: Boolean(result?.fallbackUsed),
      primaryProvider: result?.primaryProvider || "",
      failedProvider: result?.failedProvider || "",
      fallbackReason: result?.fallbackReason || "",
      practicePhraseSource: result?.practicePhraseSource || "",
      practiceSnapshot: result?.practiceSnapshot || null,
      practiceArtifact: result?.practiceArtifact || null,
    };
    state.cueSource = normalized.retrievalPath;
    return normalized;
  }

  function sourceKindFromTrack(track) {
    return track?.kind === "asr" ? "auto" : "manual";
  }

  function summarizeTranscriptResult(result) {
    return {
      sourceKind: result.sourceKind,
      retrievalPath: result.retrievalPath,
      fetchOrigin: result.fetchOrigin || fetchOriginFromRetrievalPath(result.retrievalPath),
      provider: result.provider || result.actualTrackId || "",
      selectedTrackId: result.selectedTrackId || "",
      actualTrackId: result.actualTrackId || "",
      languageCode: result.languageCode || "",
      timingExactness: result.timingExactness,
      qualityFlags: [...(result.qualityFlags || [])],
      warnings: [...(result.warnings || [])],
      retrievalAttempts: Array.isArray(result.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result.cacheStatus || "",
      fallbackUsed: Boolean(result.fallbackUsed),
      primaryProvider: result.primaryProvider || "",
      failedProvider: result.failedProvider || "",
      fallbackReason: result.fallbackReason || "",
      practicePhraseSource: result.practicePhraseSource || "",
      practiceSnapshot: result.practiceSnapshot || null,
      practiceArtifact: result.practiceArtifact || null,
    };
  }

  function formatTranscriptBadge(result) {
    const sourceLabel = {
      manual: "Manual",
      auto: "Auto",
      "transcript-panel": "Transcript fallback",
      provider: "Provider",
      asr: "ASR",
      unknown: "Unknown",
    }[result.sourceKind] || "Unknown";
    const timingLabel = result.timingExactness === "exact"
      ? "exact"
      : result.timingExactness === "word-level" ? "word-level" : "rough timing";
    const originLabel = formatFetchOriginLabel(result);
    const cacheLabel = result.cacheStatus === "hit" ? " · cached" : "";
    const fallbackLabel = result.fallbackUsed ? " · fallback" : "";
    return `${sourceLabel} · ${timingLabel}${originLabel ? ` · via ${originLabel}` : ""}${cacheLabel}${fallbackLabel}`;
  }

  function fetchOriginFromRetrievalPath(retrievalPath) {
    if (!retrievalPath) return "";
    if (String(retrievalPath).startsWith("timedtext")) return "youtube-page";
    if (retrievalPath === "backend-provider" || retrievalPath === "local-asr-backend") return "backend";
    if (retrievalPath === "youtubei-transcript") return "youtube-transcript-api";
    if (retrievalPath === "transcript-dom") return "youtube-transcript-dom";
    return "";
  }

  function formatFetchOriginLabel(result) {
    const provider = String(result?.provider || "").trim();
    if (provider === "supadata") return "Supadata";
    if (provider === "yt-dlp") return "yt-dlp";
    if (provider === "local-asr-practice") return "local ASR";
    if (provider === "youtube-timedtext") return "YouTube page";
    if (provider === "youtubei-transcript") return "YouTube transcript API";
    if (provider === "youtube-transcript-panel") return "YouTube transcript DOM";

    const origin = String(result?.fetchOrigin || "").trim();
    if (origin === "youtube-page") return "YouTube page";
    if (origin === "backend") return provider || "backend";
    if (origin === "youtube-transcript-api") return "YouTube transcript API";
    if (origin === "youtube-transcript-dom") return "YouTube transcript DOM";
    return provider;
  }

  function getVideoElement() {
    const video = youtubeAdapterApi.getVideoElement(document);
    updateBootDiagnostics({ videoElementDetected: Boolean(video) });
    return video;
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.isConnected) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
  }

  function activateElement(element) {
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    }
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      element.dispatchEvent(new MouseEvent(type, eventOptions));
    }

    if (typeof element.click === "function") {
      element.click();
    }
  }

  function replayCurrentPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("replay", state.currentIndex);
  }

  function pauseCurrentPlayback(command = "pause") {
    const video = getVideoElement();
    if (!video) return;

    const before = getPlaybackSnapshot();
    stopPlaybackTimer();
    state.guidedHold = null;
    if (!video.paused) {
      video.pause();
    }
    recordNavigationEvent(`${command}-pause`, {
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      playbackBefore: before,
      playbackAfter: getPlaybackSnapshot(),
    });
    render();
  }

  function nextPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("next", Math.min(state.currentIndex + 1, state.phrases.length - 1));
  }

  function previousPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("previous", Math.max(state.currentIndex - 1, 0));
  }

  function navigateToPhrase(command, targetIndex) {
    const fromIndex = state.currentIndex;
    const before = getPlaybackSnapshot();
    const navigationEvent = recordNavigationEvent("command-start", {
      command,
      fromPhrase: describePhraseAtIndex(fromIndex),
      targetPhrase: describePhraseAtIndex(targetIndex),
      playbackBefore: before,
    });
    state.guidedHold = null;
    state.currentIndex = targetIndex;
    if (state.practiceMode === "recall") {
      state.textVisible = false;
      state.phraseTranslationVisible = true;
    }
    if (state.practiceMode === "recall" || state.phraseTranslationVisible) {
      ensureCurrentPhraseTranslation();
    }
    enterGuidedMode();
    render();
    const playResult = playPhrase(state.currentIndex, { command, navigationEventId: navigationEvent.id });
    recordNavigationEvent("command-dispatched", {
      command,
      navigationEventId: navigationEvent.id,
      fromIndex,
      targetIndex,
      playResult,
      playbackAfterDispatch: getPlaybackSnapshot(),
    });
    scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 250);
    scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 750);
  }

  function toggleText() {
    state.textVisible = !state.textVisible;
    if (state.practiceMode === "shadow") {
      state.shadowTextVisible = state.textVisible;
    }
    render();
  }

  function toggleAutoPause() {
    const nextAutoPause = !state.autoPause;
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      autoPause: nextAutoPause,
    }));
    state.guidedMode = nextAutoPause;
    state.passivePausedKey = "";
    recordNavigationEvent("auto-pause-toggle", {
      autoPause: nextAutoPause,
      guidedMode: state.guidedMode,
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
    });
    const video = getVideoElement();
    if (video && nextAutoPause) {
      ensurePassivePlaybackWatcher();
      syncPassivePlayback(video);
    }
    render();
  }

  function enterGuidedMode() {
    state.guidedMode = true;
  }

  function showText() {
    state.textVisible = true;
    if (state.practiceMode === "shadow") {
      state.shadowTextVisible = true;
    }
    render();
  }

  function syncIndexToCurrentTime(options = {}) {
    const video = getVideoElement();
    if (!video || !state.phrases.length) return;

    const currentMs = video.currentTime * 1000;
    if (options.keepCurrentIfJustEnded && isCurrentPhraseStillSelected(currentMs)) {
      return;
    }

    const activeIndex = state.phrases.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex >= 0) {
      state.currentIndex = activeIndex;
      render();
    }
  }

  function isCurrentPhraseStillSelected(currentMs) {
    const phrase = state.phrases[state.currentIndex];
    if (!phrase) return false;

    const replayGraceMs = POST_ROLL_MS + 900;
    return currentMs >= phrase.startMs && currentMs <= phrase.endMs + replayGraceMs;
  }

  function playbackEndMsForPhrase(phrases, index) {
    const phrase = phrases[index];
    if (!phrase) return 0;
    const nextPhrase = phrases[index + 1];
    const postRollEndMs = phrase.endMs + POST_ROLL_MS;
    if (nextPhrase && nextPhrase.startMs < postRollEndMs) {
      return Math.max(phrase.startMs, nextPhrase.startMs - CONTIGUOUS_BOUNDARY_GUARD_MS);
    }
    return postRollEndMs;
  }

  function playPhrase(index, options = {}) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    stopPlaybackTimer();
    const startSeconds = Math.max(0, phrase.startMs - PRE_ROLL_MS) / 1000;
    const endSeconds = playbackEndMsForPhrase(state.phrases, index) / 1000;
    markCurrentTranscriptSegment(phrase);
    video.currentTime = startSeconds;
    video.play().catch(() => {});
    recordNavigationEvent("seek-started", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: describePhraseAtIndex(index),
      seekToSec: roundTime(startSeconds),
      expectedPauseAtSec: roundTime(endSeconds),
      playbackAfterSeek: getPlaybackSnapshot(),
    });

    if (!state.autoPause) {
      render();
      return {
        ok: true,
        seekToSec: roundTime(startSeconds),
        expectedPauseAtSec: null,
        autoPause: false,
      };
    }

    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: endSeconds,
    };

    state.playbackFrame = window.requestAnimationFrame(function frame() {
      enforcePhraseEnd(video);
      if (state.activePlayback) {
        state.playbackFrame = window.requestAnimationFrame(frame);
      }
    });
    return {
      ok: true,
      seekToSec: roundTime(startSeconds),
      expectedPauseAtSec: roundTime(endSeconds),
      autoPause: true,
    };
  }

  function scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs) {
    window.setTimeout(() => {
      recordNavigationEvent("command-observation", {
        command,
        navigationEventId,
        delayMs,
        targetPhrase: describePhraseAtIndex(targetIndex),
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playback: getPlaybackSnapshot(),
      });
      if (state.debugVisible) {
        render();
      }
    }, delayMs);
  }

  function stopPlaybackTimer() {
    if (state.playbackFrame) {
      window.cancelAnimationFrame(state.playbackFrame);
      state.playbackFrame = null;
    }
    state.activePlayback = null;
  }

  function ensurePassivePlaybackWatcher() {
    const video = getVideoElement();
    if (!video || state.passiveVideo === video) return;

    detachPassivePlaybackWatcher();
    state.passiveVideo = video;
    state.passivePausedKey = "";
    video.addEventListener("timeupdate", onPassiveVideoTimeUpdate, true);
    video.addEventListener("play", onPassiveVideoPlay, true);
    video.addEventListener("pause", onPassiveVideoPause, true);
    syncPassivePlayback(video);
    if (!video.paused) {
      startPassivePlaybackFrame(video);
    }
  }

  function detachPassivePlaybackWatcher() {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }

    if (state.passiveVideo) {
      state.passiveVideo.removeEventListener("timeupdate", onPassiveVideoTimeUpdate, true);
      state.passiveVideo.removeEventListener("play", onPassiveVideoPlay, true);
      state.passiveVideo.removeEventListener("pause", onPassiveVideoPause, true);
      state.passiveVideo = null;
    }

    state.passivePausedKey = "";
  }

  function onPassiveVideoTimeUpdate(event) {
    syncPassivePlayback(event.currentTarget);
  }

  function onPassiveVideoPlay(event) {
    state.passivePausedKey = "";
    const video = event.currentTarget;
    syncPassivePlayback(video);
    startPassivePlaybackFrame(video);
  }

  function onPassiveVideoPause() {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }
  }

  function startPassivePlaybackFrame(video) {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
    }

    state.passiveFrame = window.requestAnimationFrame(function frame() {
      if (state.passiveVideo !== video) {
        state.passiveFrame = null;
        return;
      }

      syncPassivePlayback(video);
      if (!video.paused) {
        state.passiveFrame = window.requestAnimationFrame(frame);
      } else {
        state.passiveFrame = null;
      }
    });
  }

  function syncPassivePlayback(video) {
    if (!video || !state.learningEnabled || state.loading || !state.phrases.length) return;

    if (state.activePlayback) {
      const phrase = state.phrases[state.activePlayback.index];
      if (phrase && state.currentIndex !== state.activePlayback.index) {
        state.currentIndex = state.activePlayback.index;
        markCurrentTranscriptSegment(phrase);
        render();
      }
      return;
    }

    const currentMs = video.currentTime * 1000;
    if (shouldPreserveGuidedHold(currentMs)) {
      return;
    }

    const index = findPlaybackPhraseIndex(state.phrases, currentMs);
    const phrase = state.phrases[index];
    if (!phrase) return;

    if (index !== state.currentIndex) {
      state.currentIndex = index;
      markCurrentTranscriptSegment(phrase);
      render();
    }

    if (!state.guidedMode || !state.autoPause || state.activePlayback || video.paused) return;

    const endMs = playbackEndMsForPhrase(state.phrases, index);
    if (currentMs < endMs) return;

    const pauseKey = `${state.videoId || ""}:${state.selectedSourceId}:${index}`;
    if (state.passivePausedKey === pauseKey) return;

    state.passivePausedKey = pauseKey;
    video.pause();
    markCurrentTranscriptSegment(phrase);
    render();
  }

  function enforcePhraseEnd(video) {
    if (!state.activePlayback || !video) return;

    if (video.currentTime >= state.activePlayback.endSeconds) {
      const index = state.activePlayback.index;
      const phrase = state.phrases[state.activePlayback.index];
      video.pause();
      const pausedAtSeconds = video.currentTime;
      state.currentIndex = index;
      state.guidedHold = {
        index,
        holdSeconds: pausedAtSeconds,
        createdAt: Date.now(),
      };
      markCurrentTranscriptSegment(phrase);
      recordNavigationEvent("auto-pause-held", {
        targetPhrase: describePhraseAtIndex(index),
        holdSeconds: roundTime(pausedAtSeconds),
        playback: getPlaybackSnapshot(),
      });
      stopPlaybackTimer();
      render();
    }
  }

  function shouldPreserveGuidedHold(currentMs) {
    if (!state.guidedMode || !state.guidedHold) return false;
    const phrase = state.phrases[state.guidedHold.index];
    if (!phrase) return false;
    const holdMs = state.guidedHold.holdSeconds * 1000;
    const atHeldBoundary = Math.abs(currentMs - holdMs) <= 350;
    if (!atHeldBoundary) {
      state.guidedHold = null;
      return false;
    }
    if (state.currentIndex !== state.guidedHold.index) {
      state.currentIndex = state.guidedHold.index;
      markCurrentTranscriptSegment(phrase);
      render();
    }
    return true;
  }

  function markCurrentTranscriptSegment(phrase) {
    const segmentIndex = phrase?.cues?.[0]?.segmentIndex;
    const segmentSelector = phrase?.cues?.[0]?.segmentSelector;
    const selector = segmentSelector === "modern"
      ? "transcript-segment-view-model"
      : "ytd-transcript-segment-renderer";
    const segments = Array.from(document.querySelectorAll(selector));

    segments.forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (typeof segmentIndex !== "number") return;

    const segment = segments[segmentIndex];
    if (!segment) return;

    segment.dataset.afCurrent = "true";
    segment.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKeyboardEvent(event) {
    if (!youtubeAdapterApi.isWatchPage()) return;
    if (!state.learningEnabled) return;
    if (shouldIgnoreKeyEvent(event)) return;

    if (isSpaceKey(event)) {
      blockYouTubeShortcut(event);
      if (event.type === "keydown" && !event.repeat) {
        toggleContinuousPlayback();
      }
      return;
    }

    if (event.type !== "keydown") return;

    if (event.code === "Escape") {
      if (closeOpenMenus()) {
        blockYouTubeShortcutWithOptions(event);
      }
      return;
    }

    if (event.code === "ArrowRight") {
      blockYouTubeShortcutWithOptions(event);
      nextPhrase();
    } else if (event.code === "ArrowLeft") {
      blockYouTubeShortcutWithOptions(event);
      previousPhrase();
    } else if (event.code === "ArrowDown") {
      blockYouTubeShortcutWithOptions(event);
      replayCurrentPhrase();
    } else if (event.code === "ArrowUp") {
      blockYouTubeShortcutWithOptions(event);
      toggleText();
    } else if (event.code === "KeyS") {
      blockYouTubeShortcutWithOptions(event);
      if (state.practiceMode !== "shadow") {
        setPracticeMode("shadow");
      } else {
        toggleText();
      }
    } else if (event.code === "KeyT") {
      blockYouTubeShortcutWithOptions(event);
      togglePhraseTranslation();
    } else if (event.code === "Digit1") {
      blockYouTubeShortcutWithOptions(event);
      setPracticeMode("shadow");
    } else if (event.code === "Digit2") {
      blockYouTubeShortcutWithOptions(event);
      setPracticeMode("recall");
    }
  }

  function toggleContinuousPlayback() {
    const video = getVideoElement();
    if (!video) return;

    const before = getPlaybackSnapshot();
    stopPlaybackTimer();
    state.guidedMode = false;
    state.passivePausedKey = "";

    if (video.paused || video.ended) {
      recordNavigationEvent("space-play", {
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playbackBefore: before,
      });
      video.play().catch(() => {});
    } else {
      recordNavigationEvent("space-pause", {
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playbackBefore: before,
      });
      video.pause();
    }

    scheduleNavigationObservation(
      state.navigationEvents[state.navigationEvents.length - 1]?.id || null,
      "space",
      state.currentIndex,
      250,
    );
    render();
  }

  function isSpaceKey(event) {
    return event.code === "Space" || event.key === " " || event.key === "Spacebar";
  }

  function blockYouTubeShortcut(event) {
    blockYouTubeShortcutWithOptions(event, { immediate: true });
  }

  function blockYouTubeShortcutWithOptions(event, options = {}) {
    event.preventDefault();
    event.stopPropagation();
    if (options.immediate) {
      event.stopImmediatePropagation();
    }
  }

  function shouldIgnoreKeyEvent(event) {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || target.isContentEditable;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function watchYouTubeNavigation() {
    let lastUrl = window.location.href;
    window.setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        state.loadToken += 1;
        state.loading = false;
        state.videoId = null;
        handleCurrentLocation();
      }
    }, 500);
  }

  function watchWorkspaceMount() {
    window.setInterval(() => {
      if (youtubeAdapterApi.isWatchPage() && state.learningEnabled) {
        ensureWorkspace();
        initializeForCurrentVideo();
        if (state.phrases.length) {
          ensurePassivePlaybackWatcher();
        }
      }
    }, 2000);
  }

  function handleCurrentLocation() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    updateBootDiagnostics({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });

    if (!videoId) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      removeWorkspace();
      document.getElementById(TOGGLE_ID)?.remove();
      return;
    }
    renderToggle();
    if (!state.learningEnabled) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      state.guidedMode = false;
      removeWorkspace();
      return;
    }
    ensureWorkspace();
    render();
    initializeForCurrentVideo();
  }

  document.addEventListener("keydown", onKeyboardEvent, true);
  document.addEventListener("keypress", onKeyboardEvent, true);
  document.addEventListener("keyup", onKeyboardEvent, true);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  window.addEventListener("keydown", onKeyboardEvent, true);
  window.addEventListener("keypress", onKeyboardEvent, true);
  window.addEventListener("keyup", onKeyboardEvent, true);
  watchYouTubeNavigation();
  watchWorkspaceMount();
  handleCurrentLocation();
  }

  function createBootDiagnosticsFallback() {
    const version = "missing-boot-diagnostics-helper";
    const publish = (diagnostics) => {
      document.documentElement.dataset.afShadowingBootState = JSON.stringify(diagnostics);
    };

    return {
      markBootStarted() {
        const diagnostics = {
          contentScriptLoaded: true,
          bootFailed: false,
          version,
          loadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url: window.location.href,
          extensionId: "",
          watchPageDetected: false,
          videoIdDetected: "",
          videoElementDetected: false,
          captionTracksCount: null,
          selectedRetrievalPath: "",
          lastError: "",
        };
        document.documentElement.dataset.afShadowingBoot = "1";
        document.documentElement.dataset.afShadowingBootVersion = version;
        publish(diagnostics);
        return diagnostics;
      },
      recordBootFailure(error) {
        console.error("[AudioFilms] content script boot failed", error);
      },
      renderBootFailureBadge() {},
      publish,
    };
  }

  function createPhraseFallback() {
    const cleanPhraseText = (text) => text
      .replace(/\s*(?:\.{3}|…)\s*(?=\p{Ll})/gu, " ")
      .replace(/^(?:\.{3}|…)\s*/, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const hasSentenceEnding = (text) => /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
    const wordCount = (text) => {
      const matches = String(text || "").match(/[\p{L}\p{N}]+/gu);
      return matches ? matches.length : 0;
    };

    return {
      buildPhrases(cues, options = {}) {
        const maxPhraseDurationMs = options.maxPhraseDurationMs ?? 12000;
        const longPauseMs = options.longPauseMs ?? 1000;
        const maxWords = options.maxWords ?? 18;
        const maxCharacters = options.maxCharacters ?? 140;
        const phrases = [];
        let current = null;

        for (const cue of cues) {
          if (!current) {
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
            continue;
          }

          const pause = cue.startMs - current.endMs;
          const nextDuration = cue.endMs - current.startMs;
          const nextText = cleanPhraseText(`${current.text} ${cue.text}`);
          const shouldBreak =
            hasSentenceEnding(current.text) ||
            pause > longPauseMs ||
            nextDuration > maxPhraseDurationMs ||
            wordCount(nextText) > maxWords ||
            nextText.length > maxCharacters;

          if (shouldBreak) {
            phrases.push(current);
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
          } else {
            current.endMs = Math.max(current.endMs, cue.endMs);
            current.text = nextText;
            current.cues.push(cue);
          }
        }

        if (current) phrases.push(current);
        return phrases.map((phrase, index) => ({ ...phrase, index }));
      },
      cleanPhraseText,
      hasSentenceEnding,
      wordCount,
    };
  }

  function createCaptionTracksFallback() {
    const trackName = (track) => (
      track.name?.simpleText ||
      track.name?.runs?.map((run) => run.text).join("") ||
      track.languageCode ||
      "unknown"
    );
    const sourceDisplayName = (source) => source.name || source.languageCode || "Captions";
    const languageLabelFromSource = (source) => {
      const name = source.name || source.languageCode || "Unknown";
      return name
        .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
        .trim() || name;
    };

    return {
      getCaptionTracks(playerResponse) {
        return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      },
      buildPracticeSources(tracks) {
        return tracks.map((track, index) => ({
          id: `${track.languageCode || "unknown"}:${track.vssId || index}:${index}`,
          index,
          name: trackName(track),
          languageCode: track.languageCode || "",
          track,
          error: "",
          lastError: "",
          lastRetrievalAttempts: [],
          loadedCueSource: "",
          loadedTranscriptResult: null,
        }));
      },
      chooseDefaultPracticeSource(sources) {
        return sources.find((source) => source.track.kind !== "asr") || sources[0] || null;
      },
      describeTrack: trackName,
      trackName,
      sourceDisplayName,
      cueSourceLabel(value) {
        if (!value) return "";
        if (String(value).startsWith("timedtext")) return "timedtext";
        if (value === "youtubei-transcript") return "transcript API";
        if (value === "transcript-dom") return "transcript fallback";
        return "fallback";
      },
      groupPracticeSources(sources) {
        const groups = [];
        const byLanguage = new Map();

        for (const source of sources) {
          const key = source.languageCode || source.name || "unknown";
          if (!byLanguage.has(key)) {
            const label = source.languageCode
              ? `${languageLabelFromSource(source)} (${source.languageCode})`
              : languageLabelFromSource(source);
            const group = { key, label, sources: [] };
            byLanguage.set(key, group);
            groups.push(group);
          }
          byLanguage.get(key).sources.push(source);
        }

        groups.forEach((group) => {
          group.sources.sort((left, right) => {
            const leftAuto = left.track.kind === "asr" ? 1 : 0;
            const rightAuto = right.track.kind === "asr" ? 1 : 0;
            return leftAuto - rightAuto || left.index - right.index;
          });
        });

        return groups;
      },
      languageLabelFromSource,
      formatSourceDebug(source) {
        return {
          id: source.id,
          name: source.name,
          languageCode: source.languageCode,
          kind: source.track.kind || "manual",
          vssId: source.track.vssId || "",
          loadedCueSource: source.loadedCueSource,
          loadedTranscriptResult: source.loadedTranscriptResult,
          lastRetrievalAttempts: source.lastRetrievalAttempts || [],
          error: source.error,
          lastError: source.lastError,
        };
      },
    };
  }

  function createYouTubeAdapterFallback() {
    const getVideoIdFromUrl = (href = window.location.href) => {
      const url = new URL(href);
      return url.searchParams.get("v");
    };

    const extractBalancedJson = (text, startIndex) => {
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let index = startIndex; index < text.length; index += 1) {
        const char = text[index];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === "\"") {
            inString = false;
          }
          continue;
        }

        if (char === "\"") {
          inString = true;
        } else if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            return text.slice(startIndex, index + 1);
          }
        }
      }

      return "";
    };

    const extractPlayerResponseFromText = (text, currentVideoId) => {
      let searchFrom = 0;

      while (searchFrom < text.length) {
        const markerIndex = text.indexOf("ytInitialPlayerResponse", searchFrom);
        if (markerIndex === -1) return null;
        searchFrom = markerIndex + "ytInitialPlayerResponse".length;

        const assignmentIndex = text.indexOf("=", markerIndex);
        if (assignmentIndex === -1) continue;

        const jsonStart = text.indexOf("{", assignmentIndex);
        if (jsonStart === -1) continue;

        const jsonText = extractBalancedJson(text, jsonStart);
        if (!jsonText) continue;

        try {
          const response = JSON.parse(jsonText);
          const responseVideoId = response?.videoDetails?.videoId;
          if (!currentVideoId || !responseVideoId || responseVideoId === currentVideoId) {
            return response;
          }
        } catch (_error) {
          continue;
        }
      }

      return null;
    };

    const isVisibleVideoElement = (video) => {
      if (!(video instanceof HTMLVideoElement)) return false;
      if (!video.isConnected) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(video);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      return true;
    };

    const isUsableYouTubeVideo = (video) => {
      if (!isVisibleVideoElement(video)) return false;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 100) return false;
      if (video.closest(".ytp-ad-player-overlay, .ytp-ad-module")) return false;
      return true;
    };

    return {
      getVideoIdFromUrl,
      isWatchPage(href = window.location.href) {
        return Boolean(getVideoIdFromUrl(href));
      },
      extractPlayerResponseFromDocument(doc = document, currentVideoId = getVideoIdFromUrl()) {
        const scripts = Array.from(doc.scripts);
        for (const script of scripts) {
          const response = extractPlayerResponseFromText(script.textContent || "", currentVideoId);
          if (response) return response;
        }
        return null;
      },
      extractPlayerResponseFromText,
      extractBalancedJson,
      getVideoElement(doc = document) {
        const videos = Array.from(doc.querySelectorAll("video"));
        return videos.find(isUsableYouTubeVideo) || videos.find(isVisibleVideoElement) || videos[0] || null;
      },
      isUsableYouTubeVideo,
      isVisibleVideoElement,
    };
  }
})();
