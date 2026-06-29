(function audioFilmsYouTubeShadowing() {
  const bootDiagnosticsApi = window.__afShadowingBootDiagnostics || createBootDiagnosticsFallback();
  const phraseApi = window.__afShadowingPhrases || createPhraseFallback();
  const captionTrackApi = window.__afShadowingCaptionTracks || createCaptionTracksFallback();
  const sourceLabelsApi = window.__afShadowingSourceLabels || createSourceLabelsFallback();
  const youtubeAdapterApi = window.__afShadowingYouTubeAdapter || createYouTubeAdapterFallback();
  const transcriptRetrievalApi = window.__afShadowingTranscriptRetrieval;
  const sourceBindingApi = window.__afShadowingSourceBinding;
  const dictionaryActionApi = window.__afShadowingDictionaryActions;
  const phraseTokenApi = window.__afShadowingPhraseTokens;
  const diagnosticsReportApi = window.__afShadowingDiagnosticsReport;
  const displayPreferencesApi = window.__afShadowingDisplayPreferences;
  const buildInfoApi = window.__afShadowingBuildInfo;
  const CONTENT_SCRIPT_REVISION = "source-labels-asr-fingerprint-2026-06-29";

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
  const SOURCE_SELECTION_STORAGE_KEY = "afShadowingSourceSelection";
  const MAX_PHRASE_DURATION_MS = 12000;
  const LONG_PAUSE_MS = 1000;
  const PRE_ROLL_MS = 150;
  const POST_ROLL_MS = 500;
  const MIN_AUDIBLE_END_TAIL_MS = 300;
  const CONTIGUOUS_BOUNDARY_GUARD_MS = 120;
  const PLAYBACK_RATE_MIN = 0.25;
  const PLAYBACK_RATE_MAX = 2;
  const PLAYBACK_RATE_STEP = 0.05;
  const DEFAULT_SLOW_REPLAY_SPEED = 0.75;
  const ISSUE_REPORT_CATEGORIES = [
    { value: "phrase-boundary", label: "Incorrect phrase split / merged sentences" },
    { value: "timing", label: "Wrong timing / pause point" },
    { value: "navigation", label: "Replay / Previous / Next behaved wrong" },
    { value: "translation", label: "Translation problem" },
    { value: "dictionary", label: "Dictionary lookup problem" },
    { value: "ui-layout", label: "UI/layout problem" },
    { value: "captions-source", label: "Captions/source problem" },
    { value: "other", label: "Other" },
  ];
  const initialDisplayPreferences = readInitialDisplayPreferences();

  let panelGestureFallbackInstalled = false;
  let shadowLayerFocusInstalled = false;
  let shadowScrollGuardInstalled = false;
  let displayPreferencesDirty = false;
  let displayPreferencesMutationSeq = 0;
  let phraseProgressSaveTimer = null;
  let viewportLayoutFrame = 0;

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
    issueDialogOpen: false,
    issueCategory: "navigation",
    issueDescription: "",
    issueExpectedBehavior: "",
    issueIncludeDiagnostics: true,
    issueSubmitting: false,
    issueSubmitStatus: "",
    issueSubmitError: "",
    issueSubmittedId: "",
    debugEvents: [],
    navigationEvents: [],
    lastIssueReport: null,
    backendBuildInfo: null,
    backendBuildError: "",
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
    phraseTranslationStickyVisible: false,
    phraseTranslations: {},
    phraseTranslationSeq: 0,
    timingOperation: null,
    timingOperationError: "",
    timingOperationApiBase: "",
    timingOperationPollTimer: null,
    timingOperationAppliedAt: "",
    utilityMenuOpen: false,
    settingsMenuOpen: false,
    shortcutHelpOpen: false,
    phraseJumpMenuOpen: false,
    phraseJumpInput: "",
    phraseJumpError: "",
    lastMenuTrigger: null,
    guidedMode: false,
    selectedWord: null,
    selectedSpan: null,
    spanSelectionDraft: null,
    suppressWordClickUntil: 0,
    dictionaryLookupSeq: 0,
    examplesExpanded: initialDisplayPreferences.examplesExpanded,
    exampleExpansionOverrides: {},
    visibleTranslationsByCardId: {},
    translationPendingByCardId: {},
    audioPendingByCardId: {},
    cardActionFeedbackByCardId: {},
    cardMenuOpenId: "",
    cardMenuFeedbackByCardId: {},
    themePreference: initialDisplayPreferences.theme,
    accountStatus: "guest",
    accountUser: null,
    accountPreferences: null,
    accountError: "",
    accountLoading: false,
    accountMenuOpen: false,
    playbackFrame: null,
    activePlayback: null,
    lastWordReplay: null,
    guidedHold: null,
    passiveVideo: null,
    passiveFrame: null,
    passivePausedKey: "",
    playbackRate: 1,
    pendingPlaybackRateRestore: null,
    lastPhraseProgressRestore: null,
    loading: false,
    loadToken: 0,
    error: "",
    bootDiagnostics,
    contentScriptRevision: CONTENT_SCRIPT_REVISION,
  };
  window.__afShadowingDebug = state;
  initializeDisplayPreferences();
  subscribeToDisplayPreferenceChanges();
  syncTwoThousandNlAccount();
  refreshBackendBuildInfo();

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
      theme: readLocalStorageValue(THEME_STORAGE_KEY),
    });
  }

  function normalizeDisplayPreferences(value) {
    return displayPreferencesApi.normalizeDisplayPreferences(value);
  }

  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
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

  function phraseProgressKey(sourceId = state.selectedSourceId) {
    if (!state.videoId || !sourceId) return "";
    return `${state.videoId}::${sourceId}`;
  }

  function sourceSelectionKey(videoId = state.videoId) {
    return videoId ? `${SOURCE_SELECTION_STORAGE_KEY}:${videoId}` : "";
  }

  function readStoredSourceSelection(videoId = state.videoId) {
    const key = sourceSelectionKey(videoId);
    if (!key) return null;
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!value || value.videoId !== videoId) return null;
      return {
        sourceId: String(value.sourceId || ""),
        sourceKind: String(value.sourceKind || ""),
        languageCode: String(value.languageCode || ""),
        textSourceKind: String(value.textSourceKind || ""),
        updatedAt: String(value.updatedAt || ""),
      };
    } catch (_error) {
      return null;
    }
  }

  function writeStoredSourceSelection(source, reason = "source-selected") {
    const key = sourceSelectionKey();
    if (!key || !source) return;
    const selection = {
      version: 1,
      videoId: state.videoId,
      sourceId: source.id,
      sourceKind: sourceSelectionKind(source),
      languageCode: source.languageCode || "",
      textSourceKind: source.loadedTranscriptResult?.practiceSnapshot?.textSource?.kind || "",
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(key, JSON.stringify(selection));
      recordDebugEvent("source-selection-saved", {
        reason,
        source: captionTrackApi.sourceDisplayName(source),
        sourceKind: selection.sourceKind,
      });
    } catch (error) {
      recordDebugEvent("source-selection-save-failed", {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function sourceSelectionKind(source) {
    const snapshotKind = source?.loadedTranscriptResult?.practiceSnapshot?.textSource?.kind || "";
    if (source?.track?.afPracticeSnapshotSource && (snapshotKind === "asr" || source?.track?.kind === "asr")) {
      return "asr";
    }
    if (source?.track?.kind === "asr") return "auto";
    return "manual";
  }

  function sourceSelectionRank(source) {
    return {
      manual: 0,
      asr: 1,
      auto: 2,
    }[sourceSelectionKind(source)] ?? 3;
  }

  function choosePreferredPracticeSource(sources, videoId = state.videoId) {
    const stored = readStoredSourceSelection(videoId);
    const storedMatch = findStoredSourceSelectionMatch(sources, stored);
    if (storedMatch) {
      return { source: storedMatch, reason: "stored-selection" };
    }

    const ranked = [...sources].sort((left, right) =>
      sourceSelectionRank(left) - sourceSelectionRank(right) ||
      sourceLanguageRank(left.languageCode) - sourceLanguageRank(right.languageCode) ||
      left.index - right.index
    )[0] || null;
    return ranked ? { source: ranked, reason: "default-priority" } : null;
  }

  function sourceLanguageRank(languageCode) {
    if (typeof captionTrackApi.preferredLanguageRank === "function") {
      return captionTrackApi.preferredLanguageRank(languageCode);
    }
    const normalized = String(languageCode || "").trim().toLowerCase().replace("_", "-");
    const base = normalized.split("-")[0] || normalized;
    const preferred = typeof captionTrackApi.preferredLanguageCodes === "function"
      ? captionTrackApi.preferredLanguageCodes()
      : ["nl", "en"];
    const exactIndex = preferred.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex;
    const baseIndex = preferred.indexOf(base);
    return baseIndex >= 0 ? baseIndex : 100;
  }

  function findStoredSourceSelectionMatch(sources, selection) {
    if (!selection?.sourceKind) return null;
    const exact = selection.sourceId
      ? sources.find((source) => source.id === selection.sourceId)
      : null;
    if (exact) return exact;

    return sources.find((source) => {
      if (sourceSelectionKind(source) !== selection.sourceKind) return false;
      if (selection.languageCode && source.languageCode !== selection.languageCode) return false;
      return true;
    }) || null;
  }

  function phraseProgressId(phrase, index) {
    if (!phrase) return "";
    if (phrase.id !== undefined && phrase.id !== null) return String(phrase.id);
    return stableFingerprint({
      index: Number.isInteger(phrase.index) ? phrase.index : index,
      startMs: finiteInteger(phrase.startMs),
      endMs: finiteInteger(phrase.endMs),
      text: String(phrase.text || "").slice(0, 240),
    });
  }

  async function readStoredPhraseProgress(sourceId, phrases) {
    const key = phraseProgressKey(sourceId);
    if (!key) return null;
    try {
      const response = await sendExtensionMessage({ type: "af-get-phrase-progress", key });
      if (!response?.ok || !response.progress) return null;
      return restoreIndexFromPhraseProgress(response.progress, phrases);
    } catch (error) {
      recordDebugEvent("phrase-progress-read-failed", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  function restoreIndexFromPhraseProgress(progress, phrases) {
    if (!progress || !phrases.length) return null;
    const phraseId = String(progress.phraseId || "");
    if (phraseId) {
      const exactIndex = phrases.findIndex((phrase, index) => phraseProgressId(phrase, index) === phraseId);
      if (exactIndex >= 0) {
        return {
          index: exactIndex,
          reason: "phrase-id",
          progress,
        };
      }
    }
    const fallbackIndex = clampNumber(progress.currentIndex, 0, phrases.length - 1, 0);
    return {
      index: Math.round(fallbackIndex),
      reason: "clamped-index",
      progress,
    };
  }

  function schedulePhraseProgressSave(reason) {
    if (phraseProgressSaveTimer) {
      window.clearTimeout(phraseProgressSaveTimer);
    }
    phraseProgressSaveTimer = window.setTimeout(() => {
      phraseProgressSaveTimer = null;
      saveCurrentPhraseProgress(reason);
    }, 250);
  }

  function saveCurrentPhraseProgress(reason) {
    const key = phraseProgressKey();
    const phrase = state.phrases[state.currentIndex];
    if (!key || !phrase) return;
    const progress = {
      currentIndex: state.currentIndex,
      phraseId: phraseProgressId(phrase, state.currentIndex),
      phraseCount: state.phrases.length,
      updatedAt: new Date().toISOString(),
    };
    sendExtensionMessage({
      type: "af-set-phrase-progress",
      key,
      progress,
    }).then((response) => {
      if (!response?.ok) {
        throw new Error(response?.error || "Phrase progress write failed.");
      }
      recordDebugEvent("phrase-progress-saved", {
        reason,
        key,
        currentIndex: progress.currentIndex,
        phraseCount: progress.phraseCount,
      });
    }).catch((error) => {
      recordDebugEvent("phrase-progress-save-failed", {
        reason,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
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
    if ((state.selectedWord || state.selectedSpan) && !dictionaryPanel) {
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
      state.selectedSpan = null;
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
    const jumpWrap = appendElement(metaRight, "div", "af-jump-wrap");
    const count = appendElement(jumpWrap, "button", "af-ribbon-count");
    count.type = "button";
    count.dataset.afCount = "";
    count.setAttribute("aria-haspopup", "dialog");
    count.setAttribute("aria-expanded", "false");
    count.textContent = "0 / 0";
    count.addEventListener("click", togglePhraseJumpMenu);
    const jumpMenu = appendElement(jumpWrap, "div", "af-jump-popover");
    jumpMenu.dataset.afJumpMenu = "";
    const jumpStart = appendButton(jumpMenu, "Start", "afJumpStart");
    jumpStart.className = "af-jump-start";
    const jumpForm = appendElement(jumpMenu, "div", "af-jump-form");
    const jumpInput = appendElement(jumpForm, "input", "af-jump-input");
    jumpInput.type = "number";
    jumpInput.min = "1";
    jumpInput.inputMode = "numeric";
    jumpInput.dataset.afJumpInput = "";
    jumpInput.setAttribute("aria-label", "Phrase number");
    const jumpGo = appendButton(jumpForm, "Go", "afJumpGo");
    const jumpError = appendElement(jumpMenu, "div", "af-jump-error");
    jumpError.dataset.afJumpError = "";
    jumpStart.addEventListener("click", () => jumpToPhrase(0, "jump-start"));
    jumpGo.addEventListener("click", submitPhraseJump);
    jumpInput.addEventListener("input", () => {
      state.phraseJumpInput = jumpInput.value;
      state.phraseJumpError = "";
      render();
    });
    jumpInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitPhraseJump();
      }
    });
    const mode = appendElement(metaRight, "span", "af-ribbon-mode");
    mode.dataset.afMode = "";
    mode.textContent = "Passive";
    const speedControls = appendElement(metaRight, "div", "af-speed-controls");
    const speedLower = appendButton(speedControls, "-", "afSpeedLower");
    speedLower.className = "af-speed-step";
    speedLower.setAttribute("aria-label", "Decrease playback speed");
    speedLower.title = "Decrease playback speed (, or -)";
    const speedLabel = appendElement(speedControls, "span", "af-speed-label");
    speedLabel.dataset.afSpeedLabel = "";
    speedLabel.textContent = "1.00x";
    const speedHigher = appendButton(speedControls, "+", "afSpeedHigher");
    speedHigher.className = "af-speed-step";
    speedHigher.setAttribute("aria-label", "Increase playback speed");
    speedHigher.title = "Increase playback speed (. or +)";
    const themeButton = appendButton(metaRight, "", "afThemeToggle");
    themeButton.className = "af-icon-button af-theme-toggle";
    themeButton.setAttribute("aria-label", "Theme");
    const settings = appendElement(metaRight, "div", "af-utility-menu af-settings-menu");
    const settingsButton = appendButton(settings, "", "afSettingsToggle");
    settingsButton.className = "af-icon-button af-utility-toggle af-settings-toggle";
    settingsButton.innerHTML = `${iconSvg("settings")}<span class="af-sr-only">Settings</span>`;
    settingsButton.setAttribute("aria-label", "Settings");
    settingsButton.setAttribute("aria-haspopup", "menu");
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.title = "Settings";
    const settingsMenu = appendElement(settings, "div", "af-utility-popover af-settings-popover");
    settingsMenu.dataset.afSettingsMenu = "";
    const help = appendElement(metaRight, "div", "af-help-wrap");
    const helpButton = appendButton(help, "", "afShortcutHelp");
    helpButton.className = "af-icon-button af-help-toggle";
    helpButton.innerHTML = `${iconSvg("help")}<span class="af-sr-only">Keyboard shortcuts</span>`;
    helpButton.setAttribute("aria-label", "Keyboard shortcuts");
    helpButton.setAttribute("aria-haspopup", "dialog");
    helpButton.setAttribute("aria-expanded", "false");
    helpButton.title = "Keyboard shortcuts (?)";
    const helpPanel = appendElement(help, "section", "af-shortcut-help");
    helpPanel.dataset.afShortcutHelpPanel = "";
    helpPanel.setAttribute("aria-label", "AudioFilms keyboard shortcuts");
    helpPanel.hidden = true;
    appendElement(helpPanel, "div", "af-shortcut-help-title").textContent = "Shortcuts";
    const helpList = appendElement(helpPanel, "dl", "af-shortcut-help-list");
    [
      ["Space", "YouTube play/pause"],
      ["Left / Right", "Previous / next phrase"],
      ["Down", "Repeat phrase"],
      ["Up or S", "Show original"],
      ["T or 0", "Show translation"],
      ["1 / 2", "Shadow / Recall mode"],
      ["?", "Open or close shortcuts"],
      ["Esc", "Close panels"],
    ].forEach(([key, label]) => {
      appendElement(helpList, "dt", "").textContent = key;
      appendElement(helpList, "dd", "").textContent = label;
    });
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
    const displaySection = appendElement(settingsMenu, "div", "af-settings-section");
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
    const slowReplayLabel = appendElement(displaySection, "div", "af-settings-label");
    slowReplayLabel.textContent = "Slow replay";
    const slowReplayControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(slowReplayControls, "-", "afSlowReplaySlower");
    appendButton(slowReplayControls, "0.75x", "afSlowReplaySpeed");
    appendButton(slowReplayControls, "+", "afSlowReplayFaster");
    const layoutLabel = appendElement(displaySection, "div", "af-settings-label");
    layoutLabel.textContent = "Panel layout";
    const layoutControls = appendElement(displaySection, "div", "af-settings-button-row");
    appendButton(layoutControls, "Unlock", "afLayoutLockToggle");
    appendButton(layoutControls, "Reset", "afLayoutReset");
    const debugSection = appendElement(utilityMenu, "div", "af-settings-section af-debug-actions");
    appendButton(debugSection, "Mark Issue", "afMarkIssue");
    appendButton(debugSection, "Bad Split", "afMarkPhraseBoundary");
    appendButton(debugSection, "Debug", "afDebugToggle");
    appendButton(debugSection, "Copy Debug", "afDebugCopy");
    appendButton(debugSection, "Clear Diagnostics", "afDiagnosticsClear");
    appendButton(debugSection, "Refresh Cache", "afRefreshCache");
    createAccountControl(metaRight);

    const list = appendElement(panel, "div", "af-ribbon-list");
    list.dataset.afRibbonList = "";

    const error = appendElement(panel, "div", "af-ribbon-error");
    error.dataset.afError = "";

    const controls = appendElement(panel, "div", "af-ribbon-controls");
    const modeControls = appendElement(controls, "div", "af-control-group af-mode-controls");
    const shadowButton = appendButton(modeControls, "Shadow", "afModeShadow");
    shadowButton.innerHTML = 'Shadow <span class="af-button-shortcut">1</span>';
    shadowButton.title = "Shadow mode (1)";
    const recallButton = appendButton(modeControls, "Recall", "afModeRecall");
    recallButton.innerHTML = 'Recall <span class="af-button-shortcut">2</span>';
    recallButton.title = "Recall mode (2)";

    const practiceControls = appendElement(controls, "div", "af-control-group af-practice-controls");
    const prevButton = appendButton(practiceControls, "", "afPrev");
    prevButton.classList.add("af-phrase-icon-button");
    prevButton.dataset.afCompactIcon = "←";
    prevButton.innerHTML = `${iconSvg("prev")}<span class="af-button-label">Previous</span>`;
    prevButton.setAttribute("aria-label", "Previous phrase");
    prevButton.title = "Previous phrase (ArrowLeft)";
    const replayButton = appendButton(practiceControls, "", "afReplay");
    replayButton.classList.add("af-phrase-icon-button");
    replayButton.dataset.afCompactIcon = "↻";
    replayButton.innerHTML = `${iconSvg("replay")}<span class="af-button-label">Repeat</span>`;
    replayButton.setAttribute("aria-label", "Replay current phrase");
    replayButton.title = "Replay current phrase (ArrowDown)";
    const nextButton = appendButton(practiceControls, "", "afNext");
    nextButton.classList.add("af-phrase-icon-button");
    nextButton.dataset.afCompactIcon = "→";
    nextButton.innerHTML = `${iconSvg("next")}<span class="af-button-label">Next</span>`;
    nextButton.setAttribute("aria-label", "Next phrase");
    nextButton.title = "Next phrase (ArrowRight)";

    const displayControls = appendElement(controls, "div", "af-control-group af-display-controls");
    const originalButton = appendButton(displayControls, "", "afToggle");
    originalButton.classList.add("af-display-toggle");
    originalButton.title = "Show or hide original text (S)";
    const translationButton = appendButton(displayControls, "", "afPhraseTranslation");
    translationButton.classList.add("af-display-toggle");
    translationButton.title = "Show phrase translation (T or 0)";
    createIssueReportDialog(panel);
    const resizeHandle = appendElement(panel, "button", "af-panel-resize-handle");
    resizeHandle.type = "button";
    resizeHandle.dataset.afResizeHandle = "phraseRibbon";
    resizeHandle.setAttribute("aria-label", "Resize phrase ribbon width");

    panel.querySelector("[data-af-prev]").addEventListener("click", previousPhrase);
    panel.querySelector("[data-af-replay]").addEventListener("click", (event) => replayCurrentPhrase({ slowReplay: event.shiftKey }));
    panel.querySelector("[data-af-toggle]").addEventListener("click", (event) => toggleText(event));
    panel.querySelector("[data-af-next]").addEventListener("click", nextPhrase);
    panel.querySelector("[data-af-mode-shadow]").addEventListener("click", () => setPracticeMode("shadow"));
    panel.querySelector("[data-af-mode-recall]").addEventListener("click", () => setPracticeMode("recall"));
    panel.querySelector("[data-af-phrase-translation]").addEventListener("click", (event) => togglePhraseTranslation(event));
    panel.querySelector("[data-af-source-toggle]").addEventListener("click", toggleSourceMenu);
    panel.querySelector("[data-af-theme-toggle]").addEventListener("click", cycleThemePreference);
    panel.querySelector("[data-af-settings-toggle]").addEventListener("click", toggleSettingsMenu);
    panel.querySelector("[data-af-shortcut-help]").addEventListener("click", toggleShortcutHelp);
    panel.querySelector("[data-af-utility-toggle]").addEventListener("click", toggleUtilityMenu);
    panel.querySelector("[data-af-learner-text-smaller]").addEventListener("click", () => adjustLearnerTextScale(-0.1));
    panel.querySelector("[data-af-learner-text-reset]").addEventListener("click", resetLearnerTextScale);
    panel.querySelector("[data-af-learner-text-larger]").addEventListener("click", () => adjustLearnerTextScale(0.1));
    panel.querySelector("[data-af-transparency-lower]").addEventListener("click", () => adjustPanelBackgroundAlpha(-0.1));
    panel.querySelector("[data-af-transparency-reset]").addEventListener("click", resetPanelBackgroundAlpha);
    panel.querySelector("[data-af-transparency-higher]").addEventListener("click", () => adjustPanelBackgroundAlpha(0.1));
    panel.querySelector("[data-af-auto-pause-toggle]").addEventListener("click", toggleAutoPause);
    panel.querySelector("[data-af-slow-replay-slower]").addEventListener("click", () => adjustSlowReplaySpeed(-PLAYBACK_RATE_STEP));
    panel.querySelector("[data-af-slow-replay-faster]").addEventListener("click", () => adjustSlowReplaySpeed(PLAYBACK_RATE_STEP));
    panel.querySelector("[data-af-speed-lower]").addEventListener("click", () => adjustVideoPlaybackRate(-PLAYBACK_RATE_STEP));
    panel.querySelector("[data-af-speed-higher]").addEventListener("click", () => adjustVideoPlaybackRate(PLAYBACK_RATE_STEP));
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
    panel.querySelector("[data-af-mark-issue]").addEventListener("click", openIssueReportDialog);
    panel.querySelector("[data-af-mark-phrase-boundary]").addEventListener("click", submitPhraseBoundaryIssue);
    return panel;
  }

  function createIssueReportDialog(panel) {
    const dialog = appendElement(panel, "section", "af-issue-dialog");
    dialog.dataset.afIssueDialog = "";
    dialog.setAttribute("aria-label", "Report an issue");
    dialog.hidden = true;

    const header = appendElement(dialog, "div", "af-issue-dialog-header");
    const title = appendElement(header, "div", "af-issue-dialog-title");
    title.textContent = "Report issue";
    const close = appendElement(header, "button", "af-icon-button af-issue-close");
    close.type = "button";
    close.dataset.afIssueClose = "";
    close.innerHTML = `${iconSvg("close")}<span class="af-sr-only">Close</span>`;
    close.setAttribute("aria-label", "Close report dialog");

    const categoryLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(categoryLabel, "span", "af-issue-label").textContent = "Category";
    const category = appendElement(categoryLabel, "select", "af-issue-select");
    category.dataset.afIssueCategory = "";
    for (const item of ISSUE_REPORT_CATEGORIES) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      category.appendChild(option);
    }

    const descriptionLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(descriptionLabel, "span", "af-issue-label").textContent = "What went wrong";
    const description = appendElement(descriptionLabel, "textarea", "af-issue-textarea");
    description.dataset.afIssueDescription = "";
    description.rows = 3;
    description.maxLength = 4000;

    const expectedLabel = appendElement(dialog, "label", "af-issue-field");
    appendElement(expectedLabel, "span", "af-issue-label").textContent = "Expected behavior";
    const expected = appendElement(expectedLabel, "textarea", "af-issue-textarea");
    expected.dataset.afIssueExpected = "";
    expected.rows = 2;
    expected.maxLength = 4000;

    const consentLabel = appendElement(dialog, "label", "af-issue-consent");
    const consent = document.createElement("input");
    consent.type = "checkbox";
    consent.dataset.afIssueDiagnostics = "";
    consentLabel.appendChild(consent);
    appendElement(consentLabel, "span", "").textContent = "Include current diagnostics";

    const status = appendElement(dialog, "div", "af-issue-status");
    status.dataset.afIssueStatus = "";

    const actions = appendElement(dialog, "div", "af-issue-actions");
    const submit = appendElement(actions, "button", "af-primary-button");
    submit.type = "button";
    submit.dataset.afIssueSubmit = "";
    submit.textContent = "Submit";
    const copy = appendElement(actions, "button", "af-secondary-inline-button");
    copy.type = "button";
    copy.dataset.afIssueCopy = "";
    copy.textContent = "Copy report";

    close.addEventListener("click", closeIssueReportDialog);
    category.addEventListener("change", (event) => {
      state.issueCategory = event.currentTarget.value;
      render();
    });
    description.addEventListener("input", (event) => {
      state.issueDescription = event.currentTarget.value;
      state.issueSubmitError = "";
      state.issueSubmitStatus = "";
      render();
    });
    expected.addEventListener("input", (event) => {
      state.issueExpectedBehavior = event.currentTarget.value;
      render();
    });
    consent.addEventListener("change", (event) => {
      state.issueIncludeDiagnostics = Boolean(event.currentTarget.checked);
      render();
    });
    submit.addEventListener("click", submitIssueReport);
    copy.addEventListener("click", copyCurrentIssueReport);

    return dialog;
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

    if (!state.selectedWord && !state.selectedSpan) {
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
      audio: [
        '<path d="M11 5 6 9H3v6h3l5 4V5z"/>',
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
      ],
      more: [
        '<circle cx="12" cy="12" r="1"/>',
        '<circle cx="19" cy="12" r="1"/>',
        '<circle cx="5" cy="12" r="1"/>',
      ],
      eye: [
        '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.52 7.34 7.6 4 12 4s8.48 3.34 9.94 7.65a1 1 0 0 1 0 .7C20.48 16.66 16.4 20 12 20s-8.48-3.34-9.94-7.65z"/>',
        '<circle cx="12" cy="12" r="3"/>',
      ],
      "eye-off": [
        '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.4 0 8.48 3.34 9.94 7.65a1 1 0 0 1-.08.86 12.08 12.08 0 0 1-2.04 2.7"/>',
        '<path d="M6.61 6.61A12.34 12.34 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.52 16.66 7.6 20 12 20a10.64 10.64 0 0 0 5.39-1.61"/>',
        '<path d="M2 2l20 20"/>',
        '<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>',
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
      settings: [
        '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.52a2 2 0 0 1-1 1.72l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.52a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>',
        '<circle cx="12" cy="12" r="3"/>',
      ],
      help: [
        '<circle cx="12" cy="12" r="10"/>',
        '<path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/>',
        '<path d="M12 17h.01"/>',
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
    const jumpMenu = panel.querySelector("[data-af-jump-menu]");
    const jumpInput = panel.querySelector("[data-af-jump-input]");
    const jumpStart = panel.querySelector("[data-af-jump-start]");
    const jumpError = panel.querySelector("[data-af-jump-error]");
    const mode = panel.querySelector("[data-af-mode]");
    const list = panel.querySelector("[data-af-ribbon-list]");
    const error = panel.querySelector("[data-af-error]");
    const controls = panel.querySelector(".af-ribbon-controls");
    const toggle = panel.querySelector("[data-af-toggle]");
    const modeShadow = panel.querySelector("[data-af-mode-shadow]");
    const modeRecall = panel.querySelector("[data-af-mode-recall]");
    const phraseTranslation = panel.querySelector("[data-af-phrase-translation]");
    const speedLower = panel.querySelector("[data-af-speed-lower]");
    const speedHigher = panel.querySelector("[data-af-speed-higher]");
    const speedLabel = panel.querySelector("[data-af-speed-label]");
    const account = panel.querySelector("[data-af-account]");
    const accountMenu = panel.querySelector("[data-af-account-menu]");
    const accountCopy = panel.querySelector("[data-af-account-copy]");
    const accountAction = panel.querySelector("[data-af-account-action]");
    const themeToggle = panel.querySelector("[data-af-theme-toggle]");
    const settingsToggle = panel.querySelector("[data-af-settings-toggle]");
    const settingsMenu = panel.querySelector("[data-af-settings-menu]");
    const helpToggle = panel.querySelector("[data-af-shortcut-help]");
    const helpPanel = panel.querySelector("[data-af-shortcut-help-panel]");
    const utilityToggle = panel.querySelector("[data-af-utility-toggle]");
    const utilityMenu = panel.querySelector("[data-af-utility-menu]");
    const learnerTextSmaller = panel.querySelector("[data-af-learner-text-smaller]");
    const learnerTextReset = panel.querySelector("[data-af-learner-text-reset]");
    const learnerTextLarger = panel.querySelector("[data-af-learner-text-larger]");
    const transparencyLower = panel.querySelector("[data-af-transparency-lower]");
    const transparencyReset = panel.querySelector("[data-af-transparency-reset]");
    const transparencyHigher = panel.querySelector("[data-af-transparency-higher]");
    const autoPauseToggle = panel.querySelector("[data-af-auto-pause-toggle]");
    const slowReplaySlower = panel.querySelector("[data-af-slow-replay-slower]");
    const slowReplaySpeed = panel.querySelector("[data-af-slow-replay-speed]");
    const slowReplayFaster = panel.querySelector("[data-af-slow-replay-faster]");
    const layoutLockToggle = panel.querySelector("[data-af-layout-lock-toggle]");
    const layoutReset = panel.querySelector("[data-af-layout-reset]");
    const debugToggle = panel.querySelector("[data-af-debug-toggle]");
    const debugCopy = panel.querySelector("[data-af-debug-copy]");
    const diagnosticsClear = panel.querySelector("[data-af-diagnostics-clear]");
    const refreshCache = panel.querySelector("[data-af-refresh-cache]");
    const markIssue = panel.querySelector("[data-af-mark-issue]");
    const issueDialog = panel.querySelector("[data-af-issue-dialog]");
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
    count.textContent = hasPhrases
      ? `${state.currentIndex + 1} / ${state.phrases.length}`
      : state.loading ? "Loading" : "0 / 0";
    count.disabled = state.loading || !hasPhrases;
    count.setAttribute("aria-expanded", state.phraseJumpMenuOpen ? "true" : "false");
    count.title = hasPhrases ? "Jump to phrase" : "No phrases to jump to";
    jumpMenu.classList.toggle("is-open", state.phraseJumpMenuOpen && hasPhrases);
    positionUtilityMenu(panel, jumpMenu, state.phraseJumpMenuOpen && hasPhrases);
    jumpInput.value = state.phraseJumpInput || (hasPhrases ? String(state.currentIndex + 1) : "");
    jumpInput.max = hasPhrases ? String(state.phrases.length) : "";
    jumpInput.disabled = state.loading || !hasPhrases;
    jumpStart.disabled = state.loading || !hasPhrases || state.currentIndex === 0;
    jumpError.textContent = state.phraseJumpError;
    jumpError.hidden = !state.phraseJumpError;
    mode.textContent = "";
    mode.hidden = true;
    mode.classList.toggle("is-guided", state.guidedMode);
    renderAccountControl(account, accountMenu, accountCopy, accountAction);
    const themeLabel = `Theme: ${state.themePreference}`;
    themeToggle.innerHTML = `${iconSvg("theme")}<span class="af-sr-only">${themeLabel}</span>`;
    themeToggle.setAttribute("aria-label", themeLabel);
    themeToggle.title = themeLabel;
    settingsToggle.setAttribute("aria-expanded", state.settingsMenuOpen ? "true" : "false");
    settingsToggle.classList.toggle("is-active", state.settingsMenuOpen);
    settingsMenu.classList.toggle("is-open", state.settingsMenuOpen);
    positionUtilityMenu(panel, settingsMenu, state.settingsMenuOpen);
    helpToggle.setAttribute("aria-expanded", state.shortcutHelpOpen ? "true" : "false");
    helpToggle.classList.toggle("is-active", state.shortcutHelpOpen);
    helpPanel.hidden = !state.shortcutHelpOpen;
    positionUtilityMenu(panel, helpPanel, state.shortcutHelpOpen);
    const originalSticky = state.practiceMode === "shadow" && state.shadowTextVisible;
    const translationSticky = state.practiceMode === "shadow" && state.phraseTranslationStickyVisible;
    renderDisplayToggleButton(toggle, {
      icon: state.textVisible ? "eye" : "eye-off",
      label: originalControlLabel(),
    });
    toggle.classList.toggle("is-active", state.textVisible);
    toggle.classList.toggle("is-sticky", originalSticky);
    toggle.setAttribute("aria-pressed", state.textVisible ? "true" : "false");
    toggle.setAttribute("aria-label", originalControlLabel());
    toggle.title = originalControlTitle();
    modeShadow.classList.toggle("is-active", state.practiceMode === "shadow");
    modeRecall.classList.toggle("is-active", state.practiceMode === "recall");
    modeRecall.disabled = false;
    modeRecall.title = "Recall mode (2)";
    modeShadow.setAttribute("aria-pressed", state.practiceMode === "shadow" ? "true" : "false");
    modeRecall.setAttribute("aria-pressed", state.practiceMode === "recall" ? "true" : "false");
    renderDisplayToggleButton(phraseTranslation, {
      icon: "translate",
      label: translationControlLabel(),
    });
    phraseTranslation.classList.toggle("is-active", state.phraseTranslationVisible);
    phraseTranslation.classList.toggle("is-sticky", translationSticky);
    phraseTranslation.hidden = isEmpty;
    phraseTranslation.disabled = state.loading || !hasPhrases;
    phraseTranslation.setAttribute("aria-pressed", state.phraseTranslationVisible ? "true" : "false");
    phraseTranslation.setAttribute("aria-label", translationControlLabel());
    phraseTranslation.title = phraseTranslationControlTitle(currentPhraseTranslation);
    utilityToggle.setAttribute("aria-expanded", state.utilityMenuOpen ? "true" : "false");
    utilityToggle.classList.toggle("is-active", state.utilityMenuOpen);
    utilityMenu.classList.toggle("is-open", state.utilityMenuOpen);
    positionUtilityMenu(panel, utilityMenu, state.utilityMenuOpen);
    renderDisplayPreferenceControls({
      learnerTextSmaller,
      learnerTextReset,
      learnerTextLarger,
      transparencyLower,
      transparencyReset,
      transparencyHigher,
      autoPauseToggle,
      slowReplaySlower,
      slowReplaySpeed,
      slowReplayFaster,
      layoutLockToggle,
      layoutReset,
    });
    renderPlaybackRateControls({ speedLower, speedHigher, speedLabel });
    debugToggle.textContent = state.debugVisible ? "Hide Debug" : "Debug";
    debugCopy.textContent = state.debugCopied ? "Copied" : "Copy Debug";
    diagnosticsClear.textContent = state.diagnosticsClearedAt ? "Diagnostics Cleared" : "Clear Diagnostics";
    refreshCache.textContent = state.cacheRefreshRequested ? "Refreshing" : "Refresh Cache";
    markIssue.textContent = state.issueDialogOpen ? "Reporting..." : "Mark Issue";
    markIssue.setAttribute("aria-expanded", state.issueDialogOpen ? "true" : "false");
    renderIssueReportDialog(issueDialog);
    positionIssueReportDialog(panel, issueDialog);
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
    state.practiceMode = mode === "recall" ? "recall" : "shadow";
    applyPhraseEntryDisplayState();
    render();
  }

  function togglePhraseTranslation(event) {
    if (event?.shiftKey) {
      state.phraseTranslationStickyVisible = !state.phraseTranslationStickyVisible;
      state.phraseTranslationVisible = state.phraseTranslationStickyVisible;
    } else {
      state.phraseTranslationVisible = !state.phraseTranslationVisible;
    }
    if (state.phraseTranslationVisible) {
      ensureCurrentPhraseTranslation();
    }
    render();
  }

  function phraseTranslationControlTitle(translation) {
    const mode = state.practiceMode === "shadow" && state.phraseTranslationStickyVisible
      ? "Translation: sticky. T or 0 toggles current phrase; Shift+T turns sticky mode off."
      : "Translation: current phrase. Press T or 0. Shift+T toggles sticky mode.";
    if (translation?.status === "ready") return mode;
    if (translation?.status === "loading") return `${mode} Phrase translation is loading.`;
    if (state.accountStatus !== "signed-in") return `${mode} Connect 2000NL to translate phrases.`;
    if (translation?.status === "failed") return `${mode} ${translation.error || "Phrase translation failed."}`;
    return mode;
  }

  function originalControlLabel() {
    return state.textVisible ? "Hide original" : "Show original";
  }

  function originalControlTitle() {
    if (state.practiceMode === "recall") {
      return state.textVisible
        ? "Original revealed for the current Recall phrase. Shift+S toggles Shadow sticky original."
        : "Reveal original for the current Recall phrase (S). Shift+S toggles Shadow sticky original.";
    }
    return state.shadowTextVisible
      ? "Original: sticky. Press S to hide only this phrase, or Shift+S to keep originals hidden."
      : "Original: hidden. Press S to reveal only this phrase, or Shift+S to keep originals visible.";
  }

  function translationControlLabel() {
    return state.phraseTranslationVisible ? "Hide translation" : "Show translation";
  }

  function renderDisplayToggleButton(button, options) {
    if (!(button instanceof HTMLElement)) return;
    button.innerHTML = [
      iconSvg(options.icon),
      `<span class="af-sr-only">${escapeHtml(options.label)}</span>`,
    ].join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

    const slowReplaySpeed = slowReplayPlaybackRate();
    controls.slowReplaySpeed.textContent = formatPlaybackRate(slowReplaySpeed);
    controls.slowReplaySpeed.title = "Slow replay speed for Shift+ArrowDown";
    controls.slowReplaySlower.disabled = slowReplaySpeed <= PLAYBACK_RATE_MIN;
    controls.slowReplayFaster.disabled = slowReplaySpeed >= PLAYBACK_RATE_MAX;
    controls.slowReplaySlower.title = "Decrease slow replay speed";
    controls.slowReplayFaster.title = "Increase slow replay speed";

    controls.layoutLockToggle.textContent = state.displayPreferences.layout.locked ? "Unlock" : "Lock";
    controls.layoutLockToggle.title = state.displayPreferences.layout.locked
      ? "Unlock panel layout editing"
      : "Lock panel layout editing";
    controls.layoutReset.disabled = !hasCustomPanelLayout();
    controls.layoutReset.title = "Reset panel positions and sizes";
  }

  function renderPlaybackRateControls(controls) {
    const rate = syncPlaybackRateFromVideo();
    controls.speedLabel.textContent = formatPlaybackRate(rate);
    controls.speedLabel.title = `Playback speed ${formatPlaybackRate(rate)}`;
    controls.speedLower.disabled = rate <= PLAYBACK_RATE_MIN;
    controls.speedHigher.disabled = rate >= PLAYBACK_RATE_MAX;
    controls.speedLower.title = "Decrease playback speed";
    controls.speedHigher.title = "Increase playback speed";
  }

  function positionUtilityMenu(panel, utilityMenu, isOpen = state.utilityMenuOpen) {
    if (!isOpen) {
      utilityMenu.classList.remove("is-below");
      utilityMenu.classList.remove("is-above");
      return;
    }

    window.requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const menuHeight = utilityMenu.getBoundingClientRect().height || utilityMenu.scrollHeight || 0;
      const shouldPlaceBelow = panelRect.top < menuHeight + 12;
      utilityMenu.classList.toggle("is-below", shouldPlaceBelow);
      utilityMenu.classList.toggle("is-above", !shouldPlaceBelow);
    });
  }

  function positionIssueReportDialog(panel, issueDialog) {
    if (!(issueDialog instanceof HTMLElement) || !state.issueDialogOpen) return;
    window.requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const dialogHeight = issueDialog.getBoundingClientRect().height || issueDialog.scrollHeight || 0;
      issueDialog.classList.toggle("is-below", panelRect.top < dialogHeight + 12);
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
    return displayPreferencesApi.defaultPanelLayout();
  }

  function applyPanelLayout(ribbonPanel, dictionaryPanel) {
    applyPanelGeometry(ribbonPanel, "phraseRibbon");
    if (dictionaryPanel) {
      applyPanelGeometry(dictionaryPanel, "dictionaryPanel");
    }
  }

  function scheduleViewportLayoutClamp() {
    if (viewportLayoutFrame) return;
    viewportLayoutFrame = window.requestAnimationFrame(() => {
      viewportLayoutFrame = 0;
      applyPanelLayout(panelElement("phraseRibbon"), panelElement("dictionaryPanel"));
      const debugPanel = debugPanelElement();
      if (debugPanel) {
        applyDebugPanelGeometry(debugPanel);
      }
    });
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
    clampRenderedPanelToViewport(panel);
  }

  function clampRenderedPanelToViewport(panel) {
    if (!(panel instanceof HTMLElement)) return;
    const margin = 8;
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nextLeft = clampNumber(rect.left, margin, Math.max(margin, window.innerWidth - rect.width - margin), margin);
    const nextTop = clampNumber(rect.top, margin, Math.max(margin, window.innerHeight - rect.height - margin), margin);
    if (Math.abs(nextLeft - rect.left) > 0.5) {
      panel.style.left = `${nextLeft}px`;
    }
    if (Math.abs(nextTop - rect.top) > 0.5) {
      panel.style.top = `${nextTop}px`;
    }
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
    window.addEventListener("resize", scheduleViewportLayoutClamp);
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
      state.settingsMenuOpen = false;
      state.shortcutHelpOpen = false;
      state.accountMenuOpen = false;
      state.sourceMenuOpen = false;
      state.phraseJumpMenuOpen = false;
    }
    render();
  }

  function toggleSettingsMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    state.settingsMenuOpen = !state.settingsMenuOpen;
    state.lastMenuTrigger = state.settingsMenuOpen ? "settings" : null;
    if (state.settingsMenuOpen) {
      state.utilityMenuOpen = false;
      state.shortcutHelpOpen = false;
      state.accountMenuOpen = false;
      state.sourceMenuOpen = false;
      state.phraseJumpMenuOpen = false;
    }
    render();
  }

  function toggleShortcutHelp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    state.shortcutHelpOpen = !state.shortcutHelpOpen;
    state.lastMenuTrigger = state.shortcutHelpOpen ? "help" : null;
    if (state.shortcutHelpOpen) {
      state.utilityMenuOpen = false;
      state.settingsMenuOpen = false;
      state.accountMenuOpen = false;
      state.sourceMenuOpen = false;
      state.phraseJumpMenuOpen = false;
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
      state.settingsMenuOpen = false;
      state.shortcutHelpOpen = false;
      state.sourceMenuOpen = false;
      state.phraseJumpMenuOpen = false;
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

  function adjustSlowReplaySpeed(delta) {
    updateDisplayPreferences((preferences) => ({
      ...preferences,
      playback: {
        ...(preferences.playback || {}),
        slowReplaySpeed: clampPlaybackRate((preferences.playback?.slowReplaySpeed ?? DEFAULT_SLOW_REPLAY_SPEED) + delta),
      },
    }));
    render();
  }

  function adjustVideoPlaybackRate(delta) {
    const video = getVideoElement();
    const currentRate = clampPlaybackRate(video?.playbackRate || state.playbackRate || 1);
    setVideoPlaybackRate(clampPlaybackRate(currentRate + delta), "speed-control");
  }

  function setVideoPlaybackRate(rate, reason = "playback-rate") {
    const video = getVideoElement();
    const nextRate = clampPlaybackRate(rate);
    state.playbackRate = nextRate;
    if (video) {
      video.playbackRate = nextRate;
    }
    recordDebugEvent("playback-rate-set", {
      reason,
      playbackRate: nextRate,
    });
    render();
  }

  function syncPlaybackRateFromVideo(video = getVideoElement()) {
    const rate = clampPlaybackRate(video?.playbackRate || state.playbackRate || 1);
    state.playbackRate = rate;
    return rate;
  }

  function clampPlaybackRate(value) {
    return clampNumber(Number(value), PLAYBACK_RATE_MIN, PLAYBACK_RATE_MAX, 1);
  }

  function slowReplayPlaybackRate() {
    return clampNumber(
      Number(state.displayPreferences.playback?.slowReplaySpeed),
      PLAYBACK_RATE_MIN,
      PLAYBACK_RATE_MAX,
      DEFAULT_SLOW_REPLAY_SPEED,
    );
  }

  function formatPlaybackRate(value) {
    return `${clampPlaybackRate(value).toFixed(2)}x`;
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
    toggleCardExpanded(cardId);
  }

  function toggleCardExpanded(cardId) {
    if (!cardId) return;
    state.exampleExpansionOverrides = {
      ...state.exampleExpansionOverrides,
      [cardId]: !cardExpanded(cardId),
    };
    render();
  }

  function exampleSectionExpanded(cardId) {
    return cardExpanded(cardId);
  }

  function cardExpanded(cardId) {
    if (
      cardId
      && Object.prototype.hasOwnProperty.call(state.exampleExpansionOverrides, cardId)
    ) {
      return state.exampleExpansionOverrides[cardId] === true;
    }
    return false;
  }

  function toggleCardTranslation(card) {
    if (!card?.id || !state.selectedWord || !cardCanRequestTranslation(card)) return;
    const currentlyVisible = cardTranslationsVisible(card);
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

  function setCardTranslationPending(cardId, pending) {
    if (!cardId) return;
    const next = { ...state.translationPendingByCardId };
    if (pending) {
      next[cardId] = true;
    } else {
      delete next[cardId];
    }
    state.translationPendingByCardId = next;
  }

  function closeOpenMenus() {
    if (!state.utilityMenuOpen && !state.settingsMenuOpen && !state.shortcutHelpOpen && !state.accountMenuOpen && !state.sourceMenuOpen && !state.phraseJumpMenuOpen) return false;
    const trigger = state.lastMenuTrigger || (state.sourceMenuOpen ? "source" : state.utilityMenuOpen ? "utility" : state.settingsMenuOpen ? "settings" : state.shortcutHelpOpen ? "help" : state.accountMenuOpen ? "account" : "jump");
    state.utilityMenuOpen = false;
    state.settingsMenuOpen = false;
    state.shortcutHelpOpen = false;
    state.accountMenuOpen = false;
    state.sourceMenuOpen = false;
    state.phraseJumpMenuOpen = false;
    state.phraseJumpError = "";
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
      settings: "[data-af-settings-toggle]",
      help: "[data-af-shortcut-help]",
      account: "[data-af-account]",
      jump: "[data-af-count]",
    }[trigger];
    if (!root || !selector) return;
    root.querySelector(selector)?.focus?.();
  }

  function onDocumentPointerDown(event) {
    if (!state.learningEnabled) return;
    if (isMenuInteractionEvent(event)) return;
    closeOpenMenus();
  }

  function onDocumentPointerUp(event) {
    if (!state.spanSelectionDraft) return;
    if (isSpanDraftWordEvent(event)) return;
    clearSpanSelectionDraft();
  }

  function isSpanDraftWordEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    return path.some((element) => (
      element instanceof Element
      && element.matches?.(".af-ribbon-word[data-af-phrase-index][data-af-token-index]")
    ));
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

  function togglePhraseJumpMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    state.phraseJumpMenuOpen = !state.phraseJumpMenuOpen;
    state.lastMenuTrigger = state.phraseJumpMenuOpen ? "jump" : null;
    state.phraseJumpError = "";
    state.phraseJumpInput = state.phrases.length ? String(state.currentIndex + 1) : "";
    if (state.phraseJumpMenuOpen) {
      state.sourceMenuOpen = false;
      state.utilityMenuOpen = false;
      state.settingsMenuOpen = false;
      state.shortcutHelpOpen = false;
      state.accountMenuOpen = false;
    }
    render();
    if (state.phraseJumpMenuOpen) {
      requestAnimationFrame(() => {
        document.getElementById(ROOT_ID)?.shadowRoot
          ?.querySelector("[data-af-jump-input]")
          ?.focus?.();
      });
    }
  }

  function submitPhraseJump() {
    const targetNumber = Number(state.phraseJumpInput);
    if (!Number.isInteger(targetNumber)) {
      state.phraseJumpError = "Enter a whole number.";
      render();
      return;
    }
    if (targetNumber < 1 || targetNumber > state.phrases.length) {
      state.phraseJumpError = `Choose 1-${state.phrases.length}.`;
      render();
      return;
    }
    jumpToPhrase(targetNumber - 1, "jump-number");
  }

  function jumpToPhrase(targetIndex, reason) {
    const phrase = state.phrases[targetIndex];
    const video = getVideoElement();
    if (!phrase || !video) return;

    stopPlaybackTimer();
    video.pause();
    video.currentTime = Math.max(0, phrase.startMs / 1000);
    state.currentIndex = targetIndex;
    state.guidedHold = {
      index: targetIndex,
      holdSeconds: video.currentTime,
      createdAt: Date.now(),
    };
    state.passivePausedKey = "";
    state.phraseJumpMenuOpen = false;
    state.phraseJumpError = "";
    state.lastMenuTrigger = null;
    markCurrentTranscriptSegment(phrase);
    schedulePhraseProgressSave(reason);
    recordNavigationEvent("phrase-jump", {
      reason,
      targetPhrase: describePhraseAtIndex(targetIndex),
      playback: getPlaybackSnapshot(),
    });
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
        allowPreferredSourceSwitch: false,
      });
    } finally {
      state.cacheRefreshRequested = false;
      render();
    }
  }

  async function startImproveTiming(textSourceOverride = "") {
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
        payload: buildPracticeTimingPayload(source, textSourceOverride),
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

  function buildPracticeTimingPayload(source, textSourceOverride = "", resultOverride = null) {
    const result = resultOverride || source?.loadedTranscriptResult || state.transcriptResult || {};
    const sourceKind = timingPayloadSourceKind(source, result);
    const artifact = result.practiceArtifact || practiceArtifactFromSnapshot(result.practiceSnapshot);
    const textSource = textSourceOverride || (sourceKind === "manual" ? "manual" : "auto");
    const payload = {
      videoId: state.videoId,
      lang: result.languageCode || source?.languageCode || "auto",
      sourceKind,
      textSource,
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
      operation.appliedToActiveSource = applyTimingOperationResultToActiveSource(operation);
      registerTimingOperationResultSources(operation);
    }
  }

  function applyTimingOperationResultToActiveSource(operation) {
    const source = getSelectedPracticeSource();
    const transcriptResult = transcriptResultFromPracticeTimingOperation(operation, {
      currentResult: source?.loadedTranscriptResult || state.transcriptResult,
    });
    if (!source || !transcriptResult) return false;

    const phrases = phrasesFromTranscriptResult(transcriptResult);
    if (!phrases.length) return false;

    const video = getVideoElement();
    const currentPhrase = state.phrases[state.currentIndex] || null;
    const currentMs = video
      ? video.currentTime * 1000
      : Number.isFinite(currentPhrase?.startMs)
      ? currentPhrase.startMs
      : 0;
    const nextIndex = findPhraseIndexForTime(phrases, currentMs);

    state.selectedSourceId = source.id;
    state.selectedTrack = source.track;
    state.cues = transcriptResult.cues;
    state.transcriptResult = transcriptResult;
    state.phrases = phrases;
    state.currentIndex = Math.max(0, Math.min(nextIndex, phrases.length - 1));
    state.selectedWord = null;
    state.selectedSpan = null;
    state.phraseTranslations = {};
    state.timingOperationError = "";
    state.timingOperationAppliedAt = new Date().toISOString();
    state.guidedMode = state.autoPause;
    state.passivePausedKey = "";
    state.error = "";

    source.loadedCueSource = transcriptResult.retrievalPath;
    source.loadedTranscriptResult = summarizeTranscriptResult(transcriptResult);
    source.lastRetrievalAttempts = transcriptResult.retrievalAttempts || [];
    source.error = "";
    source.lastError = "";

    updateBootDiagnostics({
      selectedRetrievalPath: transcriptResult.retrievalPath,
      lastError: "",
    });
    ensurePassivePlaybackWatcher();
    if (video && state.autoPause) {
      syncPassivePlayback(video);
    }
    schedulePhraseProgressSave("timing-improve-applied");
    recordDebugEvent("timing-improve-applied", {
      operationId: operation.id || "",
      source: captionTrackApi.sourceDisplayName(source),
      timingExactness: transcriptResult.timingExactness,
      phrases: phrases.length,
      currentIndex: state.currentIndex,
      appliedAt: state.timingOperationAppliedAt,
    });
    return true;
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

  function openIssueReportDialog(options = {}) {
    const report = formatIssueReport(options.reportOptions || {});
    recordDebugEvent("issue-marked", {
      navigationEventId: state.navigationEvents.at(-1)?.id || null,
      currentIndex: state.currentIndex,
      source: options.source || "manual",
    });
    state.lastIssueReport = report;
    if (options.category) state.issueCategory = options.category;
    if (options.description !== undefined) state.issueDescription = options.description;
    if (options.expectedBehavior !== undefined) state.issueExpectedBehavior = options.expectedBehavior;
    state.issueDialogOpen = true;
    state.issueSubmitStatus = "";
    state.issueSubmitError = "";
    state.issueSubmittedId = "";
    render();
  }

  function closeIssueReportDialog() {
    if (state.issueSubmitting) return;
    state.issueDialogOpen = false;
    state.issueSubmitStatus = "";
    state.issueSubmitError = "";
    render();
  }

  function copyCurrentIssueReport() {
    const report = state.lastIssueReport || formatIssueReport();
    state.lastIssueReport = report;
    state.issueCopied = true;
    state.issueSubmitStatus = "Report copied.";
    state.issueSubmitError = "";
    render();
    copyIssueReport(report);
    window.setTimeout(() => {
      state.issueCopied = false;
      if (state.issueSubmitStatus === "Report copied.") {
        state.issueSubmitStatus = "";
      }
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

  async function submitIssueReport() {
    const description = state.issueDescription.trim();
    if (!description) {
      state.issueSubmitError = "Describe what went wrong before submitting.";
      state.issueSubmitStatus = "";
      render();
      return;
    }

    const report = state.lastIssueReport || formatIssueReport();
    state.lastIssueReport = report;
    state.issueSubmitting = true;
    state.issueSubmitError = "";
    state.issueSubmitStatus = "Submitting...";
    render();

    try {
      const result = await sendIssueReportPayload({
        report,
        category: state.issueCategory,
        description,
        expectedBehavior: state.issueExpectedBehavior.trim(),
        includeDiagnostics: state.issueIncludeDiagnostics,
      });
      state.issueSubmittedId = result?.id || "";
      state.issueSubmitStatus = result?.id ? `Submitted: ${result.id}` : "Submitted.";
      state.issueSubmitError = "";
      state.issueDescription = "";
      state.issueExpectedBehavior = "";
      recordDebugEvent("issue-report-submitted", {
        reportId: result?.id || null,
        category: state.issueCategory,
      });
    } catch (error) {
      state.issueSubmitStatus = "";
      state.issueSubmitError = readableIssueSubmitError(error);
      recordDebugEvent("issue-report-submit-failed", {
        error: state.issueSubmitError,
        category: state.issueCategory,
      });
    } finally {
      state.issueSubmitting = false;
      render();
    }
  }

  async function submitPhraseBoundaryIssue() {
    if (!state.phrases.length || state.loading) return;

    const report = formatIssueReport({ boundaryCaseReason: "quick-bad-split" });
    state.lastIssueReport = report;
    state.issueCategory = "phrase-boundary";
    state.issueDescription = "Incorrect phrase split or merged sentence boundary.";
    state.issueExpectedBehavior = "Sentence parts should be grouped into the correct full display sentence while replay remains on the current short segment.";
    state.issueIncludeDiagnostics = true;
    state.issueSubmitStatus = "Submitting boundary case...";
    state.issueSubmitError = "";
    state.issueSubmitting = true;
    state.issueDialogOpen = false;
    render();

    try {
      const result = await sendIssueReportPayload({
        report,
        category: "phrase-boundary",
        description: state.issueDescription,
        expectedBehavior: state.issueExpectedBehavior,
        includeDiagnostics: true,
      });
      state.issueSubmittedId = result?.id || "";
      state.issueSubmitStatus = result?.id ? `Boundary case saved: ${result.id}` : "Boundary case saved.";
      recordDebugEvent("phrase-boundary-case-submitted", {
        reportId: result?.id || null,
        currentIndex: state.currentIndex,
      });
    } catch (error) {
      state.issueSubmitStatus = "";
      state.issueSubmitError = readableIssueSubmitError(error);
      recordDebugEvent("phrase-boundary-case-submit-failed", {
        error: state.issueSubmitError,
        currentIndex: state.currentIndex,
      });
    } finally {
      state.issueSubmitting = false;
      render();
    }
  }

  async function sendIssueReportPayload({
    report,
    category,
    description,
    expectedBehavior,
    includeDiagnostics,
  }) {
    const diagnostics = includeDiagnostics ? JSON.parse(report) : undefined;
    return postBackendJson("issue-report-submit", {
      payload: {
        reportVersion: 1,
        category,
        description,
        expectedBehavior,
        includeDiagnostics,
        diagnostics,
        extensionVersion: extensionVersion(),
        extensionBuildInfo: extensionBuildInfo(),
        backendBuildInfo: state.backendBuildInfo,
        browserUserAgent: navigator.userAgent,
      },
    });
  }

  function readableIssueSubmitError(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/rate/i.test(message)) return "Too many reports. Copy report and share it manually.";
    if (/missing_description/i.test(message)) return "Describe what went wrong before submitting.";
    return message || "Report submit failed. Copy report and share it manually.";
  }

  function extensionVersion() {
    try {
      return chrome.runtime.getManifest().version || "";
    } catch (_error) {
      return "";
    }
  }

  function extensionBuildInfo() {
    const info = typeof buildInfoApi?.buildInfo === "function"
      ? buildInfoApi.buildInfo()
      : {};
    return {
      manifestVersion: extensionVersion(),
      contentScriptRevision: CONTENT_SCRIPT_REVISION,
      manifestName: info.manifestName || "",
      extensionId: info.extensionId || "",
      channel: info.channel || "",
      buildId: info.buildId || "",
      sourceCommit: info.sourceCommit || "",
      builtAt: info.builtAt || "",
      loadedAt: info.loadedAt || "",
      apiBase: apiBaseForBackendCommands(),
    };
  }

  async function refreshBackendBuildInfo() {
    const apiBase = apiBaseForBackendCommands();
    if (!apiBase) return;
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(new URL("/api/health", `${apiBase}/`).toString(), {
        credentials: "omit",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      state.backendBuildInfo = {
        apiBase,
        checkedAt,
        service: body?.service || "",
        status: body?.status || "",
        version: body?.version || "",
        builtAt: body?.builtAt || "",
        commit: body?.commit || "",
      };
      state.backendBuildError = "";
      recordDebugEvent("backend-build-info", {
        apiBase,
        version: state.backendBuildInfo.version,
        builtAt: state.backendBuildInfo.builtAt,
        commit: state.backendBuildInfo.commit,
      });
    } catch (error) {
      state.backendBuildInfo = {
        apiBase,
        checkedAt,
      };
      state.backendBuildError = error instanceof Error ? error.message : String(error || "");
      recordDebugEvent("backend-build-info-failed", {
        apiBase,
        error: state.backendBuildError,
      });
    } finally {
      render();
    }
  }

  function renderIssueReportDialog(dialog) {
    if (!(dialog instanceof HTMLElement)) return;
    const category = dialog.querySelector("[data-af-issue-category]");
    const description = dialog.querySelector("[data-af-issue-description]");
    const expected = dialog.querySelector("[data-af-issue-expected]");
    const diagnostics = dialog.querySelector("[data-af-issue-diagnostics]");
    const status = dialog.querySelector("[data-af-issue-status]");
    const submit = dialog.querySelector("[data-af-issue-submit]");
    const copy = dialog.querySelector("[data-af-issue-copy]");

    dialog.hidden = !state.issueDialogOpen;
    dialog.classList.toggle("is-submitting", state.issueSubmitting);
    if (category) category.value = state.issueCategory;
    if (description && description.value !== state.issueDescription) {
      description.value = state.issueDescription;
    }
    if (expected && expected.value !== state.issueExpectedBehavior) {
      expected.value = state.issueExpectedBehavior;
    }
    if (diagnostics) diagnostics.checked = state.issueIncludeDiagnostics;
    if (status) {
      status.textContent = state.issueSubmitError || state.issueSubmitStatus;
      status.classList.toggle("is-error", Boolean(state.issueSubmitError));
      status.hidden = !state.issueSubmitError && !state.issueSubmitStatus;
    }
    if (submit) {
      submit.textContent = state.issueSubmitting ? "Submitting..." : "Submit";
      submit.disabled = state.issueSubmitting || !state.issueDescription.trim();
    }
    if (copy) {
      copy.textContent = state.issueCopied ? "Copied" : "Copy report";
      copy.disabled = state.issueSubmitting;
    }
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
      extensionBuild: extensionBuildInfo(),
      backendBuild: state.backendBuildInfo,
      backendBuildError: state.backendBuildError,
      boot: state.bootDiagnostics,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      cueSource: state.cueSource,
      transcriptResult: state.transcriptResult ? summarizeTranscriptResult(state.transcriptResult) : null,
      phrases: state.phrases.length,
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      phraseProgressRestore: state.lastPhraseProgressRestore,
      diagnosticsClearedAt: state.diagnosticsClearedAt,
      error: state.error,
      sources: state.practiceSources.map(captionTrackApi.formatSourceDebug),
      navigationEvents: state.navigationEvents.slice(-12),
      lastWordReplay: state.lastWordReplay,
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
    const snapshot = diagnosticsReportApi.diagnosticsSnapshot({
      diagnosticsClearedAt: state.diagnosticsClearedAt || "",
      videoId: state.videoId || "",
      selectedSourceId: state.selectedSourceId || "",
      contentScriptRevision: state.contentScriptRevision || "",
      phraseProgressRestore: state.lastPhraseProgressRestore,
      loading: Boolean(state.loading),
      visibleError: state.error || "",
      bootLastError: state.bootDiagnostics?.lastError || "",
      debugEvents: state.debugEvents,
      navigationEvents: state.navigationEvents,
      lastIssueReport: state.lastIssueReport,
    });
    document.documentElement.dataset.afShadowingDiagnosticsState = JSON.stringify(snapshot);
  }

  function formatIssueReport(options = {}) {
    const selectedSource = getSelectedPracticeSource();
    return JSON.stringify(diagnosticsReportApi.issueReport({
      url: window.location.href,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      guidedMode: state.guidedMode,
      autoPause: state.autoPause,
      textVisible: state.textVisible,
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      currentIndex: state.currentIndex,
      phrases: state.phrases,
      phraseBoundaryCase: buildPhraseBoundaryCase(selectedSource, options),
      lastWordReplay: state.lastWordReplay,
      visibleError: state.error,
      navigationEvents: state.navigationEvents,
      debugEvents: state.debugEvents,
      extensionBuildInfo: extensionBuildInfo(),
      backendBuildInfo: state.backendBuildInfo,
      backendBuildError: state.backendBuildError,
      ...(options.extraDiagnostics && typeof options.extraDiagnostics === "object"
        ? options.extraDiagnostics
        : {}),
    }), null, 2);
  }

  function buildPhraseBoundaryCase(selectedSource, options = {}) {
    const current = describePhraseAtIndex(state.currentIndex);
    const windowStart = Math.max(0, state.currentIndex - 2);
    const windowEnd = Math.min(state.phrases.length - 1, state.currentIndex + 2);
    const phraseWindow = [];
    for (let index = windowStart; index <= windowEnd; index += 1) {
      phraseWindow.push(describePhraseAtIndex(index));
    }

    return {
      kind: "audiofilms-phrase-boundary-raw-case",
      schemaVersion: 1,
      status: "raw",
      reason: options.boundaryCaseReason || "manual-report",
      capturedAt: new Date().toISOString(),
      video: {
        id: state.videoId || "",
        url: window.location.href,
      },
      source: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      transcriptResult: state.transcriptResult ? summarizeTranscriptResult(state.transcriptResult) : null,
      currentIndex: state.currentIndex,
      currentPhrase: current,
      phraseWindow,
      expectedReview: {
        task: "Decide whether neighboring caption phrases should be merged into one display sentence, split into replay segments, or left separate.",
        output: "Curated fixture for normalizePracticePhrases regression tests.",
      },
    };
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
      if (operation.appliedToActiveSource) {
        return {
          active: false,
          status: "succeeded",
          copy: "Timing improvement applied to current captions.",
        };
      }
      return {
        active: false,
        status: "succeeded",
        copy: "Timing improvement finished. Reload captions or reopen the video to use the latest timing.",
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
    return sourceLabelsApi.closedSourceLabel(source, result);
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
      displayText: phraseDisplayText(phrase),
      translationText: phraseTranslationSourceText(phrase),
      displayStartChar: finiteInteger(phrase.displayStartChar),
      displayEndChar: finiteInteger(phrase.displayEndChar),
      displaySegmentId: phrase.displaySegmentId || "",
      segmentRole: phrase.segmentRole || "",
    };
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function renderSourceSelector(track, sourceToggle, sourceMenu) {
    const selectedSource = getSelectedPracticeSource();
    const readiness = practiceReadiness();
    const label = selectedSource
      ? userFacingSourceLabel(selectedSource)
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
    diagnostics.open = shouldOpenReadinessDetails(selectedSource, readiness, timingState);
    const diagnosticsSummary = appendElement(diagnostics, "summary", "af-readiness-details-summary");
    diagnosticsSummary.textContent = "Details";
    const details = appendElement(diagnostics, "div", "af-readiness-detail-grid");
    appendReadinessDetail(details, "Source", selectedSource ? userFacingSourceLabel(selectedSource) : "No captions");
    const provider = sourceLabelsApi.sourceProviderLabel(selectedSource, selectedSource?.loadedTranscriptResult || state.transcriptResult);
    if (provider) appendReadinessDetail(details, "Provider", provider);
    const enrichment = sourceLabelsApi.timingEnrichmentLabel(selectedSource?.loadedTranscriptResult || state.transcriptResult);
    if (enrichment) appendReadinessDetail(details, "Timing enrichment", enrichment);
    appendReadinessDetail(details, "Readiness", readiness.label);
    appendReadinessDetail(details, "Phrases", state.phrases.length ? String(state.phrases.length) : "0");
    const result = selectedSource?.loadedTranscriptResult || state.transcriptResult;
    if (result?.retrievalPath) appendReadinessDetail(details, "Retrieval", result.retrievalPath);
    if (timingState.status) {
      appendReadinessDetail(details, "Timing", timingState.status);
    }
    const staleReason = state.timingOperation?.result?.applicability?.staleReason;
    if (staleReason && !state.timingOperation?.appliedToActiveSource) {
      appendReadinessDetail(details, "Timing apply", staleReason);
    }
  }

  function shouldOpenReadinessDetails(selectedSource, readiness, timingState) {
    if (!selectedSource) return readiness.state === "no-captions";
    const result = selectedSource.loadedTranscriptResult || state.transcriptResult;
    return Boolean(
      timingState?.status ||
      result?.warnings?.length ||
      result?.retrievalPath ||
      result?.cacheStatus ||
      result?.fallbackUsed ||
      sourceLabelsApi.timingEnrichmentLabel(result),
    );
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
        option.textContent = userFacingSourceLabel(source);
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
      state.settingsMenuOpen = false;
      state.shortcutHelpOpen = false;
      state.accountMenuOpen = false;
      state.phraseJumpMenuOpen = false;
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
    const segmentIndicator = phraseSegmentIndicator(phrase, index);
    row.style.setProperty("--af-segment-count", String(segmentIndicator.count));
    row.style.setProperty("--af-segment-index", String(segmentIndicator.index));
    row.classList.toggle("has-segmented-rail", segmentIndicator.count > 1);
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
    const replayRange = phraseDisplaySegmentRange(phrase);
    text.classList.toggle("has-replay-segment", Boolean(replayRange));
    if (!shouldShowOriginalText(index)) {
      appendElement(text, "span", "af-ribbon-mask");
    } else {
      renderClickablePhraseText(text, phraseDisplayText(phrase), index, replayRange);
    }

    const translation = appendElement(row, "div", "af-phrase-translation");
    if (state.practiceMode === "recall") {
      translation.setAttribute("aria-hidden", "true");
    } else if (state.phraseTranslationVisible) {
      translation.classList.toggle("is-unavailable", !phraseTranslationText(phrase, index));
      translation.textContent = phraseTranslationCopy(phrase, index);
    } else {
      translation.textContent = phraseTranslationText(phrase, index) || "";
      translation.setAttribute("aria-hidden", "true");
    }
  }

  function phraseSegmentIndicator(phrase, index) {
    const segmentId = String(phrase?.displaySegmentId || "");
    if (!segmentId || phrase?.segmentRole !== "sentence-segment") {
      return { count: 1, index: 0 };
    }

    const segments = state.phrases
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidate }) => (
        candidate?.segmentRole === "sentence-segment" &&
        candidate?.displaySegmentId === segmentId
      ));
    const count = Math.max(1, segments.length);
    const segmentIndex = Math.max(0, segments.findIndex((segment) => segment.candidateIndex === index));
    return { count, index: segmentIndex >= 0 ? segmentIndex : 0 };
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
    const sourceText = phraseTranslationSourceText(phrase);
    return [
      state.videoId || "video",
      state.selectedSourceId || "source",
      phrase.displaySegmentId || String(phrase.index ?? index),
      String(sourceText || "").slice(0, 120),
    ].join("|");
  }

  function phraseTranslationId(phrase, index = state.currentIndex) {
    return [
      state.videoId || "video",
      state.selectedSourceId || "source",
      phrase.displaySegmentId || String(phrase.index ?? index),
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
        sourceText: phraseTranslationSourceText(phrase),
        sourceLanguageCode,
        contextText: phraseDisplayText(phrase),
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

  async function requestSelectedSpanTranslation(span) {
    const phrase = state.phrases[span.phraseIndex];
    if (!phrase) return;
    const source = getSelectedPracticeSource();
    const sourceLanguageCode =
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      state.transcriptResult?.languageCode ||
      "auto";
    const targetLanguageCode = state.accountPreferences?.translationTargetLanguageCode || "";
    const phraseId = `${phraseTranslationId(phrase, span.phraseIndex)}:span:${span.startTokenIndex}-${span.endTokenIndex}`;

    if (state.accountStatus !== "signed-in") {
      state.selectedSpan = {
        ...span,
        status: "failed",
        error: "Connect 2000NL to translate selected phrases.",
      };
      render();
      return;
    }

    try {
      const translation = await postDictionaryCommand("phrase-translation", {
        phraseId,
        sourceText: span.text,
        sourceLanguageCode,
        contextText: span.contextText || phrase.text || "",
        ...(targetLanguageCode ? { targetLanguageCode } : {}),
        purpose: "youtube-span-translation",
      });
      const translatedText = translation?.translatedText || "";
      if (state.selectedSpan !== span) return;
      state.selectedSpan = translatedText
        ? { ...span, ...translation, status: "ready", translatedText, error: "" }
        : {
            ...span,
            ...translation,
            status: "failed",
            error: translation?.error?.message || translation?.error?.code || "Selected span translation returned no text.",
          };
      render();
    } catch (error) {
      if (state.selectedSpan !== span) return;
      state.selectedSpan = {
        ...span,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function shouldShowOriginalText(index) {
    if (index !== state.currentIndex) return true;
    return state.textVisible;
  }

  function phraseDisplayText(phrase) {
    return String(phrase?.displayText || phrase?.text || "").trim();
  }

  function phraseTranslationSourceText(phrase) {
    return String(phrase?.translationText || phrase?.displayText || phrase?.text || "").trim();
  }

  function phraseDisplaySegmentRange(phrase) {
    const displayText = phraseDisplayText(phrase);
    if (!displayText || displayText === String(phrase?.text || "").trim()) return null;
    const start = finiteInteger(phrase?.displayStartChar);
    const end = finiteInteger(phrase?.displayEndChar);
    if (start !== null && end !== null && end > start && start >= 0 && end <= displayText.length) {
      return { start, end };
    }
    const replayText = String(phrase?.text || "").trim();
    const found = replayText ? displayText.indexOf(replayText) : -1;
    return found >= 0 ? { start: found, end: found + replayText.length } : null;
  }

  function segmentOverlapsRange(segment, range) {
    if (!range) return false;
    return segment.charEnd > range.start && segment.charStart < range.end;
  }

  function renderClickablePhraseText(parent, text, phraseIndex, replayRange = null) {
    const segments = phraseTokenApi.tokenizeClickablePhraseText(text);
    for (const segment of segments) {
      if (segment.kind !== "word") {
        parent.appendChild(document.createTextNode(segment.text));
        continue;
      }

      const word = appendElement(parent, "button", "af-ribbon-word");
      word.type = "button";
      word.textContent = segment.text;
      word.dataset.afLookupWord = segment.lookupWord;
      word.dataset.afPhraseIndex = String(phraseIndex);
      word.dataset.afTokenIndex = String(segment.tokenIndex);
      word.dataset.afCharStart = String(segment.charStart);
      word.dataset.afCharEnd = String(segment.charEnd);
      word.classList.toggle("is-replay-segment", segmentOverlapsRange(segment, replayRange));
      word.classList.toggle(
        "is-selected",
        state.selectedWord?.phraseIndex === phraseIndex && wordsEqual(state.selectedWord.word, segment.lookupWord),
      );
      word.classList.toggle("is-span-selected", isTokenInSelectedSpan(phraseIndex, segment.tokenIndex));
      word.classList.toggle("is-span-draft", isTokenInSpanDraft(phraseIndex, segment.tokenIndex));
      word.classList.toggle(
        "is-word-replay",
        state.lastWordReplay?.phraseIndex === phraseIndex &&
          state.lastWordReplay?.tokenIndex === segment.tokenIndex &&
          Date.now() - state.lastWordReplay.atMs < 1600,
      );
      word.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (Date.now() < state.suppressWordClickUntil) {
          return;
        }
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          handleWordReplayGesture(event, segment.lookupWord, phraseIndex, {
            tokenIndex: segment.tokenIndex,
            charStart: segment.charStart,
            charEnd: segment.charEnd,
            originalToken: segment.originalToken,
          });
          return;
        }
        selectLookupWord(segment.lookupWord, phraseIndex, {
          tokenIndex: segment.tokenIndex,
          charStart: segment.charStart,
          charEnd: segment.charEnd,
          originalToken: segment.originalToken,
        });
      });
      word.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;
        state.spanSelectionDraft = {
          phraseIndex,
          startTokenIndex: segment.tokenIndex,
          endTokenIndex: segment.tokenIndex,
        };
        applySpanSelectionDraftPreview();
      });
      word.addEventListener("pointerenter", (event) => {
        const draft = state.spanSelectionDraft;
        if (!draft || draft.phraseIndex !== phraseIndex || event.buttons !== 1) return;
        draft.endTokenIndex = segment.tokenIndex;
        applySpanSelectionDraftPreview();
      });
      word.addEventListener("pointerup", (event) => {
        const draft = state.spanSelectionDraft;
        if (!draft || draft.phraseIndex !== phraseIndex) return;
        draft.endTokenIndex = segment.tokenIndex;
        state.spanSelectionDraft = null;
        const selected = selectPhraseSpan(draft);
        if (selected) {
          event.preventDefault();
          event.stopPropagation();
          state.suppressWordClickUntil = Date.now() + 500;
        }
      });
      word.addEventListener("pointercancel", clearSpanSelectionDraft);
    }
  }

  function isTokenInSelectedSpan(phraseIndex, tokenIndex) {
    const span = state.selectedSpan;
    if (!span || span.phraseIndex !== phraseIndex) return false;
    return tokenIndex >= span.startTokenIndex && tokenIndex <= span.endTokenIndex;
  }

  function isTokenInSpanDraft(phraseIndex, tokenIndex) {
    const draft = state.spanSelectionDraft;
    if (!draft || draft.phraseIndex !== phraseIndex) return false;
    const startTokenIndex = Math.min(draft.startTokenIndex, draft.endTokenIndex);
    const endTokenIndex = Math.max(draft.startTokenIndex, draft.endTokenIndex);
    return tokenIndex >= startTokenIndex && tokenIndex <= endTokenIndex;
  }

  function applySpanSelectionDraftPreview() {
    const root = document.getElementById(ROOT_ID)?.shadowRoot;
    const words = root?.querySelectorAll(".af-ribbon-word[data-af-phrase-index][data-af-token-index]") || [];
    for (const word of words) {
      const phraseIndex = Number(word.dataset.afPhraseIndex);
      const tokenIndex = Number(word.dataset.afTokenIndex);
      word.classList.toggle("is-span-draft", isTokenInSpanDraft(phraseIndex, tokenIndex));
    }
  }

  function clearSpanSelectionDraft() {
    if (!state.spanSelectionDraft) return;
    state.spanSelectionDraft = null;
    applySpanSelectionDraftPreview();
  }

  function clearSelectedSpan() {
    state.selectedSpan = null;
    render();
  }

  async function saveSelectedSpanCard(span) {
    if (!span || state.selectedSpan !== span) return;
    if (state.accountStatus !== "signed-in") {
      state.selectedSpan = {
        ...span,
        saveStatus: "idle",
        saveError: "Connect 2000NL to save selected phrases.",
      };
      render();
      return;
    }

    const basePayload = selectedSpanGeneratedEntryPayload(span);
    if (!basePayload.ok) {
      state.selectedSpan = {
        ...span,
        saveStatus: "idle",
        saveError: basePayload.error,
      };
      render();
      return;
    }

    state.selectedSpan = {
      ...span,
      saveStatus: "saving",
      saveError: "",
    };
    const savingSpan = state.selectedSpan;
    render();

    try {
      const draft = await postDictionaryCommand("dict-generated-draft", basePayload.value);
      if (state.selectedSpan !== savingSpan) return;
      const draftPayload = generatedDraftPayload(draft?.draft);
      if (!draftPayload) {
        throw new Error("Generated draft is missing candidate identity.");
      }
      const savePayload = selectedSpanGeneratedEntryPayload(savingSpan, draft?.draft, "generated-entry-save");
      if (!savePayload.ok) {
        throw new Error(savePayload.error);
      }
      const saved = await postDictionaryCommand("dict-generated-save", savePayload.value);
      const entryId = saved?.entryId;
      if (entryId) {
        await postDictionaryCommand("dict-action", {
          action: "start-learning",
          entryId,
          clientEventId: createMutationTurnId(),
          sourceContext: selectedSpanSourceContext(savingSpan, entryId, "start-learning"),
        });
      }
      if (state.selectedSpan !== savingSpan) return;
      state.selectedSpan = {
        ...savingSpan,
        saveStatus: "saved",
        saveError: "",
        savedEntryId: entryId || "",
      };
      render();
    } catch (error) {
      if (state.selectedSpan !== savingSpan) return;
      state.selectedSpan = {
        ...savingSpan,
        saveStatus: "idle",
        saveError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function selectedSpanGeneratedEntryPayload(span, draft = null, action = "generated-entry-draft") {
    const phrase = state.phrases[span.phraseIndex] || state.phrases[state.currentIndex];
    const source = getSelectedPracticeSource();
    const language =
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      state.transcriptResult?.languageCode ||
      "auto";
    if (!span.text) return { ok: false, error: "Missing selected phrase." };
    if (!language || language === "auto") return { ok: false, error: "Missing source language." };
    return {
      ok: true,
      value: {
        clickedForm: span.text,
        sourceLanguageCode: language,
        contextText: span.contextText || phraseDisplayText(phrase),
        sourceContext: selectedSpanSourceContext(span, "", action),
        ...(generatedDraftPayload(draft) || {}),
      },
    };
  }

  function selectedSpanSourceContext(span, entryId = "", action = "generated-entry-draft") {
    return buildDictionaryActionSourceContext(
      selectedSpanSourceBinding(span),
      {
        id: entryId || "generated-span-draft",
        entryId,
        clickedForm: span.text,
        headword: span.text,
      },
      action,
    );
  }

  function selectedSpanSourceBinding(span) {
    return createDictionarySourceBinding(span.text, span.phraseIndex, {
      tokenIndex: span.startTokenIndex,
      charStart: span.charStart,
      charEnd: span.charEnd,
      originalToken: span.text,
    });
  }

  function selectPhraseSpan(draft) {
    const phrase = state.phrases[draft.phraseIndex];
    if (!phrase) return false;
    const startTokenIndex = Math.min(draft.startTokenIndex, draft.endTokenIndex);
    const endTokenIndex = Math.max(draft.startTokenIndex, draft.endTokenIndex);
    if (endTokenIndex <= startTokenIndex) return false;

    const displayText = phraseDisplayText(phrase);
    const tokens = phraseTokenApi.tokenizeClickablePhraseText(displayText)
      .filter((segment) => segment.kind === "word" && segment.tokenIndex >= startTokenIndex && segment.tokenIndex <= endTokenIndex);
    if (tokens.length < 2) return false;

    const charStart = Math.min(...tokens.map((token) => token.charStart));
    const charEnd = Math.max(...tokens.map((token) => token.charEnd));
    const text = displayText.slice(charStart, charEnd).trim();
    if (!text || !text.includes(" ")) return false;

    const span = {
      phraseIndex: draft.phraseIndex,
      startTokenIndex,
      endTokenIndex,
      charStart,
      charEnd,
      text,
      contextText: displayText,
      tokens,
      status: "loading",
      translatedText: "",
      error: "",
    };
    state.selectedWord = null;
    state.selectedSpan = span;
    render();
    requestSelectedSpanTranslation(span);
    return true;
  }

  function handleWordReplayGesture(event, word, phraseIndex, selection) {
    const mode = event.ctrlKey || event.metaKey ? "word" : "from-word";
    const result = playWordReplay(phraseIndex, selection, { mode, word });
    state.lastWordReplay = {
      atMs: Date.now(),
      mode,
      word,
      phraseIndex,
      tokenIndex: selection.tokenIndex,
      ok: result.ok,
      reason: result.reason || null,
      timingSource: result.timingSource || null,
      seekToSec: result.seekToSec ?? null,
      expectedPauseAtSec: result.expectedPauseAtSec ?? null,
    };
    recordNavigationEvent("word-replay", state.lastWordReplay);
    render();
  }

  function renderDictionary(panel) {
    const title = panel.querySelector("[data-af-dictionary-title]");
    const subtitle = panel.querySelector("[data-af-dictionary-subtitle]");
    const examplesToggle = panel.querySelector("[data-af-examples-toggle]");
    const body = panel.querySelector("[data-af-dictionary-body]");

    const headerCopy = dictionaryHeaderCopy();
    panel.classList.toggle("is-span-selected", Boolean(state.selectedSpan));
    title.textContent = headerCopy.title;
    subtitle.textContent = headerCopy.subtitle;
    subtitle.hidden = !headerCopy.subtitle;
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
    body.dataset.afLookupWord = state.selectedWord?.word || "";
    if (state.selectedSpan) {
      renderSelectedSpanCard(body);
      if (state.selectedWord) {
        renderSelectedWordCard(body);
      } else {
        renderSelectedSpanLookupPrompt(body);
      }
    } else if (state.selectedWord) {
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
    const selectedSpan = state.selectedSpan;
    if (selectedSpan) {
      if (selectedSpan.status === "loading") {
        return { title: "Selected phrase", subtitle: "Translating..." };
      }
      if (selectedSpan.status === "failed") {
        return { title: "Selected phrase", subtitle: "Translation failed" };
      }
      return { title: "Selected phrase", subtitle: "" };
    }
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

  function renderSelectedSpanCard(parent) {
    const span = state.selectedSpan;
    if (!span) return;

    const card = appendElement(parent, "div", "af-dictionary-card af-span-translation-card");
    renderSelectedSpanTitle(card, span);

    if (span.status === "loading") {
      const loading = appendElement(card, "p", "af-dictionary-copy");
      loading.textContent = "Translating selected words...";
      appendElement(card, "div", "af-lookup-skeleton");
    } else if (span.status === "failed") {
      const error = appendElement(card, "p", "af-source-option-error");
      error.textContent = span.error || "Selected span translation failed.";
    } else {
      renderSpanTranslationResult(card, span);
    }

    const actions = appendElement(card, "div", "af-span-actions");
    if (span.status === "ready") {
      const save = appendButton(actions, selectedSpanSaveLabel(span), "afSpanSave");
      save.className = "af-primary-button af-span-save-button";
      save.disabled = span.saveStatus === "saving" || span.saveStatus === "saved";
      save.addEventListener("click", () => saveSelectedSpanCard(span));
    }
    const clear = appendButton(actions, "Clear selection", "afSpanClear");
    clear.className = "af-secondary-inline-button af-span-clear-button";
    clear.addEventListener("click", clearSelectedSpan);
    if (span.saveError) {
      const error = appendElement(card, "p", "af-source-option-error af-span-save-feedback");
      error.textContent = span.saveError;
    } else if (span.saveStatus === "saved") {
      const status = appendElement(card, "p", "af-dictionary-copy af-span-save-feedback");
      status.textContent = "Started learning.";
    }
  }

  function selectedSpanSaveLabel(span) {
    if (span?.saveStatus === "saving") return "Saving...";
    if (span?.saveStatus === "saved") return "Saved";
    return "Start Learning";
  }

  function renderSelectedSpanTitle(parent, span) {
    const tokens = Array.isArray(span.tokens) ? span.tokens : [];
    const title = appendElement(parent, "div", "af-span-title");
    if (!tokens.length) {
      title.textContent = span.text || "";
      return;
    }
    for (const token of span.tokens || []) {
      const word = appendButton(title, token.text, `afSpanTitleWord-${token.tokenIndex}`);
      word.className = "af-span-title-word af-span-word";
      word.dataset.afLookupWord = token.lookupWord || "";
      word.dataset.afTokenIndex = String(token.tokenIndex);
      word.addEventListener("click", () => {
        selectLookupWord(token.lookupWord, span.phraseIndex, {
          tokenIndex: token.tokenIndex,
          charStart: token.charStart,
          charEnd: token.charEnd,
          originalToken: token.originalToken,
        }, {
          preserveSelectedSpan: true,
        });
      });
    }
  }

  function renderSpanTranslationResult(parent, span) {
    const contextual = span.translatedText || "";
    const literal = span.literalTranslatedText || "";
    const comment = span.translatorComment || "";

    renderTranslationField(parent, "Context translation", contextual || "No translation returned.", "af-span-translation-text", "is-context");
    if (literal && literal !== contextual) {
      renderTranslationField(parent, "Without context", literal, "af-span-literal-text", "is-literal");
    }
    if (comment) {
      renderTranslationField(parent, "Translator note", comment, "af-span-comment-text", "is-note");
    }
  }

  function renderTranslationField(parent, label, value, className, tone = "") {
    const field = appendElement(parent, "div", "af-translation-field");
    if (tone) field.classList.add(tone);
    const caption = appendElement(field, "div", "af-translation-label");
    appendElement(caption, "span", "af-translation-dot");
    const labelText = appendElement(caption, "span", "af-translation-label-text");
    labelText.textContent = label;
    const text = appendElement(field, "p", className);
    text.textContent = value;
    return field;
  }

  function renderSelectedSpanLookupPrompt(parent) {
    const lookup = appendElement(parent, "div", "af-lookup-placeholder af-span-word-lookup-prompt");
    const lookupTitle = appendElement(lookup, "div", "af-lookup-placeholder-title");
    lookupTitle.textContent = "Dictionary result";
    const lookupCopy = appendElement(lookup, "p", "af-dictionary-copy");
    lookupCopy.textContent = "Click a word in the selected phrase.";
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
    renderGroupedSearchPreviews(parent, selectedWord);
  }

  function renderGroupedSearchPreviews(parent, selectedWord) {
    const status = selectedWord.groupedSearchStatus || "idle";
    if (status === "idle") return;

    const container = appendElement(parent, "div", "af-dictionary-search-groups");

    if (status === "loading" && !selectedWord.groupedSearchResult?.groups?.length) {
      const loading = appendElement(container, "p", "af-dictionary-copy");
      loading.textContent = "Loading examples and related dictionary text...";
      return;
    }

    if (status === "unavailable") {
      const unavailable = appendElement(container, "p", "af-dictionary-copy");
      unavailable.textContent = selectedWord.groupedSearchError || "Search previews are not ready yet.";
      return;
    }

    if (status === "error") {
      const error = appendElement(container, "p", "af-source-option-error");
      error.textContent = selectedWord.groupedSearchError || "Search previews failed.";
      return;
    }

    const groups = (selectedWord.groupedSearchResult?.groups || [])
      .filter((group) => group.id !== "headwords" && (group.total || group.items?.length));
    if (!groups.length) {
      const empty = appendElement(container, "p", "af-dictionary-copy");
      empty.textContent = "No extra examples or browse results.";
      return;
    }

    for (const group of groups) {
      renderDictionarySearchGroup(container, selectedWord, group);
    }
  }

  function renderDictionarySearchGroup(parent, selectedWord, group) {
    const section = appendElement(parent, "section", "af-dictionary-search-group");
    const header = appendElement(section, "div", "af-dictionary-search-group-header");
    const title = appendElement(header, "div", "af-dictionary-search-group-title");
    title.textContent = dictionarySearchGroupLabel(group.id);
    const count = appendElement(header, "div", "af-dictionary-search-count");
    count.textContent = String(group.total || group.items?.length || 0);

    const list = appendElement(section, "div", "af-dictionary-search-items");
    (group.items || []).forEach((item, index) => {
      const itemKey = dictionarySearchItemKey(group.id, item, index);
      const isExpanded = Boolean(selectedWord.groupedSearchExpandedByKey?.[itemKey]);
      const loadedState = selectedWord.groupedSearchCardsByKey?.[itemKey] || null;
      const row = appendElement(list, "div", "af-dictionary-search-item");
      row.className = "af-dictionary-search-item";
      row.classList.toggle("is-expanded", isExpanded);
      row.dataset.afSearchItemKey = itemKey;
      row.tabIndex = isExpanded ? -1 : 0;
      if (!isExpanded) {
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `Open card: ${dictionarySearchItemTitle(item)}`);
      }
      if (isExpanded) {
        renderDictionarySearchExpanded(row, loadedState, () => toggleDictionarySearchItem(selectedWord, group, item, itemKey));
      } else {
        const itemHeader = appendElement(row, "div", "af-dictionary-search-item-header");
        const itemTitle = appendElement(itemHeader, "div", "af-dictionary-search-item-title");
        itemTitle.textContent = dictionarySearchItemTitle(item);
        renderChipList(itemHeader, dictionarySearchItemChips(item), "af-search-chip-list");
        const text = dictionarySearchItemText(item);
        const body = appendElement(row, "div", "af-dictionary-search-item-body");
        if (text) {
          const copy = appendElement(body, "p", "af-dictionary-search-item-text");
          renderHighlightedText(copy, text, item?.match?.matchedText);
        }
      }
      if (!isExpanded) {
        row.addEventListener("click", (event) => {
          if (event.target?.closest?.("button, a")) return;
          toggleDictionarySearchItem(selectedWord, group, item, itemKey);
        });
        row.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleDictionarySearchItem(selectedWord, group, item, itemKey);
        });
      }
    });

    if (group.page?.hasMore && group.page.nextCursor) {
      const more = appendButton(section, "More results", `afSearchMore-${group.id}`);
      more.className = "af-dictionary-search-more";
      more.addEventListener("click", () => {
        const phrase = selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || {};
        const source = getSelectedPracticeSource();
        const language = selectedWord.sourceBinding?.captionSource?.languageCode ||
          source?.loadedTranscriptResult?.languageCode ||
          source?.languageCode ||
          "auto";
        state.selectedWord = {
          ...state.selectedWord,
          groupedSearchStatus: "ready",
          groupedSearchLoadingGroup: group.id,
          groupedSearchError: "",
        };
        render();
        loadGroupedDictionarySearch(selectedWord, language, phrase.text || "", {
          group: group.id,
          cursor: group.page.nextCursor,
        });
      });
    }
  }

  function dictionarySearchGroupLabel(groupId) {
    if (groupId === "examples") return "Within examples";
    if (groupId === "definitions") return "Within definitions";
    if (groupId === "alphabetical") return "Alphabetical";
    if (groupId === "generated") return "Generated";
    return "Headwords";
  }

  function dictionarySearchItemKey(groupId, item, index) {
    return [
      groupId || "group",
      item?.resultKey || item?.entry?.id || dictionarySearchItemTitle(item) || "item",
      index,
    ].join("::");
  }

  function dictionarySearchItemTitle(item) {
    const headword = item?.entry?.headword || "";
    return headword || state.selectedWord?.word || "Dictionary card";
  }

  function dictionarySearchItemChips(item) {
    const chips = [];
    const partOfSpeech = item?.entry?.partOfSpeech || item?.entry?.part_of_speech || "";
    if (partOfSpeech) chips.push({ kind: "part-of-speech", label: partOfSpeech });
    const kind = item?.field?.kind || item?.kind || item?.match?.relation || "";
    if (kind && ["idiom", "generated", "draft"].includes(kind)) {
      chips.push({ kind: kind === "idiom" ? "part-of-speech" : "other", label: kind });
    }
    return chips;
  }

  function dictionarySearchItemText(item) {
    return item?.field?.text || item?.entry?.summaryDefinition || item?.match?.matchedText || "";
  }

  function renderDictionarySearchExpanded(parent, loadedState, onCollapse) {
    const expanded = appendElement(parent, "div", "af-dictionary-search-expanded");
    if (!loadedState || loadedState.status === "loading") {
      const loading = appendElement(expanded, "p", "af-dictionary-copy");
      loading.textContent = "Loading card...";
      return;
    }
    if (loadedState.status === "error") {
      const error = appendElement(expanded, "p", "af-source-option-error");
      error.textContent = loadedState.error || "Card lookup failed.";
      return;
    }
    const cards = focusedDictionarySearchCards(loadedState);
    if (!cards.length) {
      const empty = appendElement(expanded, "p", "af-dictionary-copy");
      empty.textContent = "No full card found.";
      return;
    }
    for (const card of cards) {
      renderOverlayCard(expanded, card, {
        collapseAction: {
          label: "Collapse card",
          onClick: onCollapse,
        },
      });
    }
  }

  function focusedDictionarySearchCards(loadedState) {
    const cards = loadedState?.result?.cards || [];
    const entryId = loadedState?.entryId || "";
    if (!entryId) return cards;
    const matching = cards.filter((card) => card?.id === entryId);
    return matching.length ? matching : cards;
  }

  function renderHighlightedText(parent, text, highlight) {
    const value = typeof text === "string" ? text : "";
    const needle = typeof highlight === "string" ? highlight.trim() : "";
    if (!value || !needle) {
      parent.textContent = value;
      return;
    }
    const haystack = value.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const index = haystack.indexOf(lowerNeedle);
    if (index < 0) {
      parent.textContent = value;
      return;
    }
    parent.textContent = "";
    parent.append(document.createTextNode(value.slice(0, index)));
    const mark = appendElement(parent, "strong", "af-dictionary-search-highlight");
    mark.textContent = value.slice(index, index + needle.length);
    parent.append(document.createTextNode(value.slice(index + needle.length)));
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
        selectLookupWord(selectedWord.word, selectedWord.phraseIndex, selectedWord.selection, {
          preserveSelectedSpan: Boolean(selectedWord.preserveSelectedSpan && state.selectedSpan),
        });
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
      renderGroupedSearchPreviews(lookup, selectedWord);
      return;
    }

    const result = selectedWord.lookupResult?.result;
    const definitions = selectedWord.lookupResult?.definitions || [];
    if (!result) {
      lookup.classList.add("is-empty", "is-card-only");
      lookupTitle.remove();
      lookupCopy.remove();
      const draftCard = generatedDraftCard(selectedWord.generatedDraft);
      renderGeneratedFallback(lookup, selectedWord);
      renderGroupedSearchPreviews(lookup, selectedWord);
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
    renderGroupedSearchPreviews(lookup, selectedWord);
  }

  function renderGeneratedFallback(parent, selectedWord) {
    const draftCard = generatedDraftCard(selectedWord.generatedDraft);
    if (draftCard) {
      renderOverlayCard(parent, draftCard);
      if (selectedWord.generatedDraftStatus === "saving") {
        const status = appendElement(parent, "p", "af-dictionary-copy af-card-action-status");
        status.textContent = "Saving...";
      }
      if (selectedWord.generatedDraftError) {
        const error = appendElement(parent, "p", "af-source-option-error");
        error.textContent = selectedWord.generatedDraftError;
      }
      return;
    }

    const fallback = appendElement(parent, "div", "af-generated-fallback-card");
    let copy = null;

    if (state.accountStatus !== "signed-in") {
      copy = appendElement(fallback, "p", "af-dictionary-copy");
      copy.textContent = "Connect 2000NL to generate and save a private learner card.";
      renderConnectPrompt(fallback);
      return;
    }

    if (selectedWord.generatedDraftStatus === "loading") {
      copy = appendElement(fallback, "p", "af-dictionary-copy");
      copy.textContent = "Generating a same-language explanation...";
      appendElement(fallback, "div", "af-lookup-skeleton");
      return;
    }

    if (selectedWord.generatedDraft) {
      copy = appendElement(fallback, "p", "af-dictionary-copy");
      copy.textContent = "Generated draft did not include a renderable learner card.";
    } else {
      const generate = appendButton(fallback, "Generate learner card", "afGeneratedDraft");
      generate.className = "af-lookup-retry";
      generate.addEventListener("click", () => generateDictionaryDraft(selectedWord));
    }

    if (selectedWord.generatedDraftError) {
      const error = appendElement(fallback, "p", "af-source-option-error");
      error.textContent = selectedWord.generatedDraftError;
    }
  }

  function generatedDraftCard(draft) {
    if (!draft || typeof draft !== "object") return null;
    if (draft.card && typeof draft.card === "object") return draft.card;
    return null;
  }

  function renderOverlayCard(parent, card, options = {}) {
    const entry = appendElement(parent, "div", "af-overlay-card");
    entry.classList.add(`is-phase-${card?.progress?.phase || "guest"}`);
    if (isGeneratedDictionaryCard(card)) {
      entry.classList.add("is-generated-draft");
    }
    const feedback = state.cardActionFeedbackByCardId[card.id];
    if (feedback?.status) {
      entry.classList.add(`is-action-${feedback.status}`);
    }
    const header = appendElement(entry, "div", "af-overlay-card-header");
    const titleWrap = appendElement(header, "div", "af-overlay-title-wrap");
    const cardTranslation = visibleCardTranslation(card);
    const title = appendElement(titleWrap, "div", "af-overlay-card-title");
    renderOverlayCardTitle(title, card);
    renderChipList(titleWrap, overlayChips(card));
    const headwordTranslation = lookupOrOverlayHeadword(card, cardTranslation);
    if (headwordTranslation) {
      const translationLine = appendElement(titleWrap, "div", "af-overlay-headword-translation");
      translationLine.textContent = headwordTranslation;
    }
    const headerActions = appendElement(header, "div", "af-overlay-card-actions");
    const translationActions = displayActionsByGroup(card, "translation");
    if (translationActions.length) {
      const translationVisible = cardTranslationsVisible(card);
      const translationPending = Boolean(
        state.translationPendingByCardId[card.id] || card?.translation?.status === "pending",
      );
      const translateButton = appendButton(headerActions, "", `afAction-${translationActions[0].id}`);
      translateButton.className = "af-card-translate";
      translateButton.disabled = translationPending || !cardCanRequestTranslation(card);
      translateButton.innerHTML = `${iconSvg("translate")}<span class="af-sr-only">${translationVisible ? "Hide translation" : "Show translation"}</span>`;
      translateButton.classList.toggle("is-pending", translationPending);
      translateButton.title = translationPending
        ? "Translation loading"
        : translationVisible
          ? "Hide translation"
          : "Show translation";
      translateButton.setAttribute(
        "aria-label",
        translationPending ? "Translation loading" : translationVisible ? "Hide translation" : "Show translation",
      );
      translateButton.setAttribute("aria-pressed", translationVisible ? "true" : "false");
      translateButton.addEventListener("click", () => performDisplayAction(card, translationActions[0]));
    }
    if (card?.id && !isGeneratedDictionaryCard(card)) {
      const menuButton = appendButton(headerActions, "", `afCardMenu-${card.id}`);
      menuButton.className = "af-card-menu-button";
      menuButton.innerHTML = `${iconSvg("more")}<span class="af-sr-only">Card actions</span>`;
      menuButton.title = "Card actions";
      menuButton.setAttribute("aria-label", "Card actions");
      menuButton.setAttribute("aria-expanded", state.cardMenuOpenId === card.id ? "true" : "false");
      menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleCardMenu(card.id);
      });
    }
    if (options.collapseAction?.onClick) {
      const collapseButton = appendButton(headerActions, "", `afPreviewCollapse-${card.id || "card"}`);
      collapseButton.className = "af-card-collapse";
      collapseButton.innerHTML = `${iconSvg("collapse")}<span class="af-sr-only">${options.collapseAction.label || "Collapse card"}</span>`;
      collapseButton.title = options.collapseAction.label || "Collapse card";
      collapseButton.setAttribute("aria-label", options.collapseAction.label || "Collapse card");
      collapseButton.addEventListener("click", options.collapseAction.onClick);
    }
    if (!headerActions.childElementCount) {
      headerActions.remove();
    }
    if (card?.id && state.cardMenuOpenId === card.id) {
      renderCardActionMenu(entry, card);
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

  }

  function overlayTitle(card) {
    return card.headword || card.clickedForm || state.selectedWord?.word || "Dictionary card";
  }

  function renderOverlayCardTitle(parent, card) {
    clearElement(parent);
    const titleText = appendElement(parent, "span", "af-overlay-card-title-text");
    const titleLine = appendElement(titleText, "span", "af-overlay-card-title-line");
    if (card.article) {
      const article = appendElement(titleLine, "span", "af-overlay-card-article");
      article.textContent = card.article;
    }
    const headword = appendElement(titleLine, "span", "af-overlay-card-headword");
    headword.textContent = overlayTitle(card);
    if (cardAudioPlayable(card)) {
      const audioButton = appendButton(titleLine, "", `afHeadwordAudio-${card.id || "card"}`);
      audioButton.className = "af-headword-audio";
      audioButton.classList.toggle("is-pending", Boolean(state.audioPendingByCardId[card.id]));
      audioButton.innerHTML = `${iconSvg("audio")}<span class="af-sr-only">Play headword audio</span>`;
      audioButton.disabled = Boolean(state.audioPendingByCardId[card.id]);
      audioButton.title = state.audioPendingByCardId[card.id] ? "Preparing pronunciation" : "Play headword audio";
      audioButton.setAttribute(
        "aria-label",
        state.audioPendingByCardId[card.id]
          ? `Preparing pronunciation for ${overlayTitle(card)}`
          : `Play pronunciation for ${overlayTitle(card)}`,
      );
      audioButton.addEventListener("click", (event) => {
        event.stopPropagation();
        playHeadwordAudio(card);
      });
    }
  }

  function cardAudioPlayable(card) {
    return Boolean(card?.audio?.primaryUrl || card?.audio?.resolveToken);
  }

  async function playHeadwordAudio(card) {
    const url = await resolveHeadwordAudioUrl(card);
    if (!url || typeof Audio === "undefined") return;
    try {
      const audio = new Audio(url);
      audio.preload = "none";
      audio.play().catch((error) => {
        recordDebugEvent("headword-audio-failed", {
          cardId: card?.id || "",
          headword: overlayTitle(card),
          error: error instanceof Error ? error.message : String(error || ""),
        });
      });
      recordDebugEvent("headword-audio-play", {
        cardId: card?.id || "",
        headword: overlayTitle(card),
        source: card?.audio?.source || "",
      });
    } catch (error) {
      recordDebugEvent("headword-audio-failed", {
        cardId: card?.id || "",
        headword: overlayTitle(card),
        error: error instanceof Error ? error.message : String(error || ""),
      });
    }
  }

  async function resolveHeadwordAudioUrl(card) {
    if (card?.audio?.primaryUrl) return card.audio.primaryUrl;
    if (!card?.audio?.resolveToken || !card?.id) return "";
    setCardAudioPending(card.id, true);
    try {
      const result = await postDictionaryCommand("audio-resolve", {
        resolveToken: card.audio.resolveToken,
      });
      const url = result?.asset?.url || "";
      if (!url || result?.status !== "ready") {
        throw new Error(result?.error?.message || result?.error?.code || "Audio is not ready.");
      }
      recordDebugEvent("headword-audio-resolved", {
        cardId: card.id,
        headword: overlayTitle(card),
        cache: result?.asset?.cache || "",
      });
      return url;
    } catch (error) {
      recordDebugEvent("headword-audio-failed", {
        cardId: card?.id || "",
        headword: overlayTitle(card),
        error: error instanceof Error ? error.message : String(error || ""),
      });
      return "";
    } finally {
      setCardAudioPending(card.id, false);
    }
  }

  function setCardAudioPending(cardId, pending) {
    if (!cardId) return;
    const next = { ...state.audioPendingByCardId };
    if (pending) {
      next[cardId] = true;
    } else {
      delete next[cardId];
    }
    state.audioPendingByCardId = next;
    render();
  }

  function overlayChips(card) {
    const projected = Array.isArray(card.chips) ? card.chips : [];
    return [
      card.partOfSpeech ? { kind: "part-of-speech", label: card.partOfSpeech } : null,
      ...projected.filter((chip) => chip.kind === "part-of-speech" && chip.label !== card.partOfSpeech),
      definitionNumberChip(card.meaningId),
      card.dictionary?.name || card.dictionary?.slug
        ? { kind: "dictionary", label: card.dictionary.name || card.dictionary.slug }
        : null,
    ].filter(Boolean);
  }

  function definitionNumberChip(value) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const label = `#${Math.trunc(numeric)}`;
    return { kind: "definition-index", label, value: label, title: `Definition ${Math.trunc(numeric)}` };
  }

  function renderChipList(parent, chips, className = "af-chip-list") {
    if (!chips.length) return;
    const list = appendElement(parent, "div", className);
    for (const chip of chips) {
      const item = appendElement(list, "span", `af-chip ${chipClassName(chip)}`);
      item.textContent = chip.label || chip;
      if (chip.title) item.title = chip.title;
    }
  }

  function renderOverlaySections(parent, sections, card, translation = null) {
    const visibleSections = sections
      .filter((section) => section?.text)
      .filter((section, index) => index > 0 || section.kind !== "meaning");
    if (!visibleSections.length) return;

    const cardId = card?.id || "";
    const expanded = cardExpanded(cardId);
    const collapsedSections = collapsedOverlaySections(visibleSections);
    const renderedSections = expanded ? visibleSections : collapsedSections;
    const hiddenCount = Math.max(0, visibleSections.length - renderedSections.length);
    const details = appendElement(parent, "div", "af-overlay-details");
    details.classList.toggle("is-open", expanded);
    details.classList.toggle("has-leading-context", renderedSections[0]?.kind === "context");
    const content = appendElement(details, "div", "af-overlay-details-content");
    for (const section of renderedSections) {
      const block = appendElement(content, "div", `af-overlay-section is-${section.kind || "meaning"}`);
      if (section.kind === "idiom") {
        renderIdiomSection(block, section, card, sections, translation);
        continue;
      }
      if (section.kind === "context") {
        renderContextSection(block, section, card, sections, translation);
        continue;
      }
      if (shouldRenderSectionMicroLabel(section)) {
        const label = appendElement(block, "p", "af-dictionary-copy af-overlay-section-label");
        label.textContent = sectionMicroLabel(section);
      }
      renderTranslatedLine(
        block,
        "p",
        "af-dictionary-copy",
        section.text,
        lookupOrOverlaySection(card, section, sections, translation),
      );
    }
    if (hiddenCount > 0 || expanded) {
      const toggle = appendElement(details, "button", "af-overlay-expand-toggle");
      toggle.type = "button";
      toggle.innerHTML = expanded
        ? `<span>Show less</span>${iconSvg("collapse")}`
        : `<span>Show ${hiddenCount} ${hiddenCount === 1 ? "detail" : "details"}</span>${iconSvg("expand")}`;
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.addEventListener("click", () => toggleCardExpanded(cardId));
    }
  }

  function toggleCardMenu(cardId) {
    state.cardMenuOpenId = state.cardMenuOpenId === cardId ? "" : cardId;
    render();
  }

  function renderCardActionMenu(parent, card) {
    const menu = appendElement(parent, "div", "af-card-action-menu");
    menu.setAttribute("role", "menu");
    const wrongTranslation = appendButton(menu, "Inaccurate translation", "afCardReportWrongTranslation");
    wrongTranslation.setAttribute("role", "menuitem");
    wrongTranslation.addEventListener("click", () => reportCardTranslationIssue(card));
    const translationOk = appendButton(menu, "Translation looks right", "afCardTranslationOk");
    translationOk.setAttribute("role", "menuitem");
    translationOk.addEventListener("click", () => markCardTranslationOk(card));
    const dictionaryIssue = appendButton(menu, "Report dictionary issue", "afCardReportDictionaryIssue");
    dictionaryIssue.setAttribute("role", "menuitem");
    dictionaryIssue.addEventListener("click", () => reportCardDictionaryIssue(card));
    const menuFeedback = state.cardMenuFeedbackByCardId[card?.id];
    if (menuFeedback) {
      const note = appendElement(menu, "p", "af-card-menu-feedback");
      note.textContent = menuFeedback;
    }
  }

  function reportCardTranslationIssue(card) {
    state.cardMenuOpenId = "";
    const issue = dictionaryCardTranslationIssueSnapshot(card);
    openIssueReportDialog({
      source: "dictionary-card-menu",
      category: "translation",
      description: `Dictionary card translation is inaccurate.\n\nCard: ${card?.headword || card?.clickedForm || ""}\nEntry: ${card?.entryId || card?.id || ""}\nClicked form: ${card?.clickedForm || ""}`,
      expectedBehavior: "Translation should match the selected dictionary sense and examples.",
      reportOptions: {
        extraDiagnostics: {
          dictionaryCardTranslationIssue: issue,
        },
      },
    });
  }

  function dictionaryCardTranslationIssueSnapshot(card) {
    const selectedWord = state.selectedWord || {};
    const currentPhrase = describePhraseAtIndex(state.currentIndex);
    const loadedTranslation = card?.id ? selectedWord.translationsByCardId?.[card.id] : null;
    return {
      kind: "dictionary-card-translation-issue",
      schemaVersion: 1,
      card: compactDictionaryCardForIssue(card),
      loadedTranslation: compactTranslationForIssue(loadedTranslation),
      lookup: {
        selectedWord: selectedWord.word || "",
        clickedForm: card?.clickedForm || selectedWord.word || "",
        phraseIndex: selectedWord.phraseIndex ?? state.currentIndex,
        sourceLanguageCode: selectedWord.language || "",
        contextText: selectedWord.contextText || currentPhrase?.text || "",
      },
    };
  }

  function compactDictionaryCardForIssue(card) {
    if (!card) return null;
    return {
      id: card.id || "",
      entryId: card.entryId || "",
      headword: card.headword || "",
      clickedForm: card.clickedForm || "",
      language: card.language || "",
      meaningId: card.meaningId ?? null,
      partOfSpeech: card.partOfSpeech || "",
      headwordTranslation: cleanTranslationText(card.headwordTranslation),
      summary: {
        definition: card.summary?.definition || "",
        definitionTranslation: cleanTranslationText(card.summary?.definitionTranslation),
        example: card.summary?.example || "",
        exampleTranslation: cleanTranslationText(card.summary?.exampleTranslation),
      },
      sections: Array.isArray(card.sections)
        ? card.sections.map((section, index) => ({
            id: section?.id || `section-${index + 1}`,
            kind: section?.kind || "",
            text: section?.text || "",
            translation: cleanTranslationText(section?.translation),
            sourcePath: section?.sourcePath || "",
          }))
        : [],
      translation: card.translation || null,
    };
  }

  function compactTranslationForIssue(translation) {
    if (!translation) return null;
    return {
      status: translation.status || "",
      targetLanguageCode: translation.targetLanguageCode || translation.targetLang || "",
      translationId: translation.translationId || "",
      translationPolicyVersion: translation.translationPolicyVersion || "",
      overlay: translation.overlay || null,
      note: translation.note || "",
      error: translation.error || null,
    };
  }

  function reportCardDictionaryIssue(card) {
    state.cardMenuOpenId = "";
    openIssueReportDialog({
      source: "dictionary-card-menu",
      category: "dictionary",
      description: `Dictionary card content looks wrong.\n\nCard: ${card?.headword || card?.clickedForm || ""}\nEntry: ${card?.entryId || card?.id || ""}\nClicked form: ${card?.clickedForm || ""}`,
      expectedBehavior: "Definition, context, examples, and idioms should match the intended dictionary sense.",
    });
  }

  function markCardTranslationOk(card) {
    if (!card?.id) return;
    state.cardMenuOpenId = card.id;
    state.cardMenuFeedbackByCardId = {
      ...state.cardMenuFeedbackByCardId,
      [card.id]: "Translation marked ok for this session.",
    };
    recordDebugEvent("dictionary-card-translation-ok", {
      cardId: card.id,
      entryId: card.entryId || null,
      headword: card.headword || "",
      clickedForm: card.clickedForm || "",
    });
    render();
  }

  function collapsedOverlaySections(sections) {
    const context = sections.find((section) => section.kind === "context");
    const firstExample = sections.find((section) => section.kind === "example");
    const firstDetail = sections.find((section) => section.kind !== "example");
    if (context) return [context, firstExample].filter(Boolean);
    return [firstExample || firstDetail].filter(Boolean);
  }

  function renderContextSection(parent, section, card, allSections, translation) {
    renderTranslatedLine(
      parent,
      "p",
      "af-dictionary-copy af-overlay-context",
      section.text,
      lookupOrOverlaySection(card, section, allSections, translation),
    );
  }

  function renderIdiomSection(parent, section, card, allSections, translation) {
    renderTranslatedLine(
      parent,
      "p",
      "af-dictionary-copy af-overlay-idiom-expression",
      section.text,
      lookupOrOverlaySection(card, section, allSections, translation),
    );
    const explanation = sectionMicroLabel(section);
    if (explanation) {
      const note = appendElement(parent, "p", "af-dictionary-copy af-overlay-idiom-explanation");
      note.textContent = explanation;
    }
  }

  function shouldRenderSectionMicroLabel(section) {
    return ["idiom", "note", "form"].includes(section?.kind || "");
  }

  function sectionMicroLabel(section) {
    if (section?.label && !/^example$/i.test(section.label)) return section.label;
    return {
      idiom: "idiom",
      form: "form",
      note: "usage note",
    }[section?.kind] || "";
  }

  function chipClassName(chip) {
    const value = String(chip?.value || chip?.label || "").toLowerCase();
    const kind = String(chip?.kind || "").toLowerCase();
    if (kind === "part-of-speech" || ["ww", "verb"].includes(value)) {
      if (["ww", "verb"].includes(value)) return "is-pos-ww";
      if (["zn", "noun", "zelfstandig naamwoord"].includes(value)) return "is-pos-zn";
      if (["bn", "adjective"].includes(value)) return "is-pos-bn";
      if (["bw", "adverb"].includes(value)) return "is-pos-bw";
      if (["idiom"].includes(value)) return "is-pos-bn";
    }
    if (kind === "definition-index") return "is-definition-index";
    if (kind === "list") return "is-list";
    if (value === "draft" || value === "needs save") return "is-draft";
    return "";
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

  function cardCanRequestTranslation(card) {
    return Boolean(card?.entryId || card?.generatedDraftItem || generatedDraftItemFromOverlayCard(card));
  }

  function lookupOrOverlayHeadword(card, translation, options = {}) {
    if (!options.alwaysUseLookup && !cardTranslationsVisible(card)) return "";
    return cleanTranslationText(card?.headwordTranslation) || translatedHeadword(translation);
  }

  function lookupOrOverlayDefinition(card, translation, meaningIndex = 0, options = {}) {
    if (!options.alwaysUseLookup && !cardTranslationsVisible(card)) return "";
    return cleanTranslationText(card?.summary?.definitionTranslation) ||
      translatedDefinition(translation, meaningIndex);
  }

  function lookupOrOverlaySection(card, section, allSections, translation, options = {}) {
    if (!section) return "";
    if (!options.alwaysUseLookup && !cardTranslationsVisible(card)) return "";
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
    if (section.kind === "note") {
      return translatedNote(translation);
    }
    if (section.kind === "context") {
      return translatedNote(translation);
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

  function translatedNote(translation) {
    const meaning = translationMeaning(translation, 0);
    return cleanTranslationText(meaning?.context) || cleanTranslationText(meaning?.note);
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
    const feedback = state.cardActionFeedbackByCardId[card?.id];
    if (!displayActions.length) {
      if (state.accountStatus !== "signed-in") {
        renderConnectPrompt(parent);
      }
      return;
    }
    const section = appendElement(parent, "div", "af-card-review");
    const actions = appendElement(section, "div", "af-review-actions");

    for (const displayAction of displayActions) {
      const button = appendButton(actions, displayAction.label || displayAction.id, `afAction-${displayAction.id}`);
      const isActive = feedback?.actionId === displayAction.id && feedback.status !== "error";
      const isGeneratedSave = displayAction?.command?.kind === "generated-save-and-start-learning";
      button.disabled = (!card?.entryId && !isGeneratedSave) ||
        feedback?.status === "pending" ||
        (feedback?.status === "saved" && feedback.actionId === displayAction.id);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-action-pending", feedback?.actionId === displayAction.id && feedback.status === "pending");
      button.classList.toggle("is-action-saved", feedback?.actionId === displayAction.id && feedback.status === "saved");
      button.classList.toggle("is-action-error", feedback?.actionId === displayAction.id && feedback.status === "error");
      if (feedback?.actionId === displayAction.id && feedback.message) {
        button.textContent = feedback.message;
      }
      if (feedback?.actionId === displayAction.id && feedback.message) {
        button.title = feedback.message;
      }
      button.addEventListener("click", () => performDisplayAction(card, displayAction));
    }
  }

  function displayActionsByGroup(card, group) {
    return (Array.isArray(card?.displayActions) ? card.displayActions : [])
      .filter((displayAction) => (displayAction.group || "progress") === group)
      .filter((displayAction) => shouldRenderDisplayAction(card, displayAction));
  }

  function shouldRenderDisplayAction(card, displayAction) {
    if (!displayAction) return false;
    if (
      displayAction.group === "progress"
      && displayAction.id === "known"
      && ["not-started", "encountered", undefined].includes(card?.progress?.phase)
    ) {
      return false;
    }
    return true;
  }

  function isGeneratedDictionaryCard(card) {
    return Boolean(card?.generatedDraftItem || card?.displayActions?.some((action) =>
      action?.command?.kind === "generated-save-and-start-learning"
    ));
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
      return;
    }
    if (command?.kind === "generated-save-and-start-learning") {
      saveGeneratedDictionaryDraft(state.selectedWord, card);
    }
  }

  function selectLookupWord(word, phraseIndex, selection = {}, options = {}) {
    const lookupSeq = state.dictionaryLookupSeq + 1;
    const sourceBinding = createDictionarySourceBinding(word, phraseIndex, selection);
    state.dictionaryLookupSeq = lookupSeq;
    state.exampleExpansionOverrides = {};
    state.visibleTranslationsByCardId = {};
    state.translationPendingByCardId = {};
    state.cardActionFeedbackByCardId = {};
    state.cardMenuOpenId = "";
    state.cardMenuFeedbackByCardId = {};
    if (!options.preserveSelectedSpan) {
      state.selectedSpan = null;
    }
    state.selectedWord = {
      word,
      phraseIndex,
      selection,
      sourceBinding,
      preserveSelectedSpan: Boolean(options.preserveSelectedSpan),
      lookupSeq,
      lookupStatus: "loading",
      lookupResult: null,
      lookupError: "",
      translateUrl: "",
      cardActionStatus: "",
      cardActionError: "",
      generatedDraftStatus: "",
      generatedDraft: null,
      generatedDraftError: "",
      translationsByCardId: {},
      groupedSearchStatus: "idle",
      groupedSearchResult: null,
      groupedSearchError: "",
      groupedSearchLoadingGroup: "",
      groupedSearchExpandedByKey: {},
      groupedSearchCardsByKey: {},
    };
    state.currentIndex = phraseIndex;
    schedulePhraseProgressSave("lookup-word");
    render();
    lookupSelectedWord(state.selectedWord);
  }

  async function lookupSelectedWord(selectedWord) {
    const phrase = selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || state.phrases[state.currentIndex];
    const source = getSelectedPracticeSource();
    const language = selectedWord.sourceBinding?.captionSource?.languageCode || source?.loadedTranscriptResult?.languageCode || source?.languageCode || "auto";
    const startedAt = Date.now();

    try {
      const result = await fetchDictionaryResult({
        word: selectedWord.word,
        language,
        context: phraseDisplayText(phrase),
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
        groupedSearchStatus: "loading",
        groupedSearchResult: null,
        groupedSearchError: "",
      };
      recordDebugEvent("dictionary-lookup-loaded", {
        word: selectedWord.word,
        language,
        provider: result?.meta?.provider || "",
        totalMs: Date.now() - startedAt,
        commandTimings: result?.meta?.commandTimings || null,
      });
      loadGroupedDictionarySearch(selectedWord, language, phraseDisplayText(phrase));
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
        totalMs: Date.now() - startedAt,
        commandTimings: payload?.meta?.commandTimings || null,
      });
    } finally {
      if (isCurrentLookup(selectedWord)) {
        render();
      }
    }
  }

  async function loadGroupedDictionarySearch(selectedWord, language, contextText, options = {}) {
    const group = options.group || null;
    const cursor = options.cursor || null;
    const startedAt = Date.now();
    try {
      const result = await fetchDictionarySearchResult({
        word: selectedWord.word,
        language,
        context: contextText || "",
        group,
        cursor,
        limit: 5,
      });
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        groupedSearchStatus: "ready",
        groupedSearchResult: mergeGroupedSearchResult(
          state.selectedWord.groupedSearchResult,
          result,
          group,
        ),
        groupedSearchLoadingGroup: "",
        groupedSearchError: "",
      };
      recordDebugEvent("dictionary-search-loaded", {
        word: selectedWord.word,
        language,
        group: group || "preview",
        totalMs: Date.now() - startedAt,
        commandTimings: result?.meta?.commandTimings || null,
      });
      render();
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      const payload = error?.payload || {};
      const unavailable = payload.error === "search_index_not_ready";
      state.selectedWord = {
        ...state.selectedWord,
        groupedSearchStatus: unavailable ? "unavailable" : "error",
        groupedSearchLoadingGroup: "",
        groupedSearchError: unavailable
          ? "Search previews are still being prepared."
          : payload.error || (error instanceof Error ? error.message : String(error)),
      };
      recordDebugEvent("dictionary-search-failed", {
        word: selectedWord.word,
        language,
        error: state.selectedWord.groupedSearchError,
        totalMs: Date.now() - startedAt,
        commandTimings: payload?.meta?.commandTimings || null,
      });
      render();
    }
  }

  function toggleDictionarySearchItem(selectedWord, group, item, itemKey) {
    if (!state.selectedWord || !isCurrentLookup(selectedWord)) return;
    const expandedByKey = { ...(state.selectedWord.groupedSearchExpandedByKey || {}) };
    const cardsByKey = { ...(state.selectedWord.groupedSearchCardsByKey || {}) };

    if (expandedByKey[itemKey]) {
      delete expandedByKey[itemKey];
      state.selectedWord = {
        ...state.selectedWord,
        groupedSearchExpandedByKey: expandedByKey,
      };
      render();
      return;
    }

    expandedByKey[itemKey] = true;
    if (!cardsByKey[itemKey]) {
      cardsByKey[itemKey] = {
        status: "loading",
        result: null,
        error: "",
        entryId: item?.entry?.id || "",
      };
    }
    state.selectedWord = {
      ...state.selectedWord,
      groupedSearchExpandedByKey: expandedByKey,
      groupedSearchCardsByKey: cardsByKey,
    };
    render();

    if (cardsByKey[itemKey].status === "loading" && !cardsByKey[itemKey].result) {
      loadDictionarySearchItemCard(selectedWord, item, itemKey);
    }
  }

  async function loadDictionarySearchItemCard(selectedWord, item, itemKey) {
    const phrase = selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || {};
    const source = getSelectedPracticeSource();
    const language = selectedWord.sourceBinding?.captionSource?.languageCode ||
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      "auto";
    const word = dictionarySearchItemTitle(item);
    const context = dictionarySearchItemText(item) || phraseDisplayText(phrase);
    try {
      const result = await fetchDictionaryResult({ word, language, context });
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        groupedSearchCardsByKey: {
          ...(state.selectedWord.groupedSearchCardsByKey || {}),
          [itemKey]: {
            status: "ready",
            result,
            error: "",
            entryId: item?.entry?.id || "",
          },
        },
      };
      render();
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      const payload = error?.payload || {};
      state.selectedWord = {
        ...state.selectedWord,
        groupedSearchCardsByKey: {
          ...(state.selectedWord.groupedSearchCardsByKey || {}),
          [itemKey]: {
            status: "error",
            result: null,
            error: payload.error || (error instanceof Error ? error.message : String(error)),
            entryId: item?.entry?.id || "",
          },
        },
      };
      render();
    }
  }

  function mergeGroupedSearchResult(current, next, groupId) {
    if (!groupId || !current?.groups?.length) return next;
    const incomingGroup = next?.groups?.[0];
    if (!incomingGroup) return current;
    return {
      ...current,
      groups: current.groups.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...incomingGroup,
          items: [...(group.items || []), ...(incomingGroup.items || [])],
        };
      }),
    };
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
    const pendingFeedback = dictionaryActionApi.pendingFeedback(card, displayAction, action);
    state.selectedWord = {
      ...state.selectedWord,
      cardActionError: "",
    };
    state.cardActionFeedbackByCardId = {
      ...state.cardActionFeedbackByCardId,
      [pendingFeedback.cardId]: pendingFeedback.feedback,
    };
    render();

    try {
      await postDictionaryCommand("dict-action", payload.value);
      if (!isCurrentLookup(selectedWord)) return;
      const savedFeedback = dictionaryActionApi.savedFeedback(card, displayAction, action);
      state.cardActionFeedbackByCardId = {
        ...state.cardActionFeedbackByCardId,
        [savedFeedback.cardId]: savedFeedback.feedback,
      };
      state.selectedWord = {
        ...state.selectedWord,
        cardActionError: "",
      };
      render();
      if (action !== "start-learning") {
        await lookupSelectedWord(state.selectedWord);
      }
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      const failedFeedback = dictionaryActionApi.errorFeedback(card, displayAction, action, error);
      state.cardActionFeedbackByCardId = {
        ...state.cardActionFeedbackByCardId,
        [failedFeedback.cardId]: failedFeedback.feedback,
      };
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  async function generateDictionaryDraft(selectedWord) {
    if (!isCurrentLookup(selectedWord)) return;
    const payload = generatedEntryBasePayload(selectedWord);
    if (!payload.ok) {
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftError: payload.error,
      };
      render();
      return;
    }

    state.selectedWord = {
      ...state.selectedWord,
      generatedDraftStatus: "loading",
      generatedDraftError: "",
    };
    render();

    try {
      const draft = await postDictionaryCommand("dict-generated-draft", payload.value);
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftStatus: "ready",
        generatedDraft: draft?.draft || null,
        generatedDraftError: "",
      };
      render();
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftStatus: "error",
        generatedDraftError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  async function saveGeneratedDictionaryDraft(selectedWord, card = null) {
    if (!isCurrentLookup(selectedWord)) return;
    const draft = selectedWord.generatedDraft;
    const draftPayload = generatedDraftPayload(draft);
    if (!draftPayload) {
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftError: "Generated draft is missing candidate identity.",
      };
      render();
      return;
    }
    const payload = generatedEntryBasePayload(selectedWord, draft, card);
    if (!payload.ok) {
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftError: payload.error,
      };
      render();
      return;
    }

    state.selectedWord = {
      ...state.selectedWord,
      generatedDraftStatus: "saving",
      generatedDraftError: "",
    };
    render();

    try {
      const saved = await postDictionaryCommand("dict-generated-save", payload.value);
      const entryId = saved?.entryId;
      if (entryId) {
        await postDictionaryCommand("dict-action", {
          action: "start-learning",
          entryId,
          clientEventId: createMutationTurnId(),
          sourceContext: generatedEntrySourceContext(selectedWord, entryId),
        });
      }
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftStatus: "saved",
        generatedDraftError: "",
        cardActionStatus: entryId ? "Saved and started learning." : "Saved.",
      };
      render();
      await lookupSelectedWord(state.selectedWord);
    } catch (error) {
      if (!isCurrentLookup(selectedWord)) return;
      state.selectedWord = {
        ...state.selectedWord,
        generatedDraftStatus: "ready",
        generatedDraftError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function generatedEntryBasePayload(selectedWord, draft = null, card = null) {
    const phrase = selectedWord.sourceBinding?.phrase ||
      state.phrases[selectedWord.phraseIndex] ||
      state.phrases[state.currentIndex];
    const source = getSelectedPracticeSource();
    const language = selectedWord.sourceBinding?.captionSource?.languageCode ||
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      "auto";
    if (!selectedWord.word) return { ok: false, error: "Missing selected word." };
    if (!language || language === "auto") return { ok: false, error: "Missing source language." };
    return {
      ok: true,
      value: {
        clickedForm: selectedWord.word,
        sourceLanguageCode: language,
        contextText: phrase?.text || "",
        sourceContext: generatedEntrySourceContext(selectedWord),
        ...(generatedDraftPayload(draft) || {}),
        ...(generatedDraftTranslationPayload(selectedWord, card) || {}),
      },
    };
  }

  function generatedDraftTranslationPayload(selectedWord, card = null) {
    const cardId = card?.id || generatedDraftCard(selectedWord?.generatedDraft)?.id || "";
    const translation = cardId ? selectedWord?.translationsByCardId?.[cardId] : null;
    if (!translation || translation.status !== "ready" || !translation.overlay) return null;
    return {
      draftTranslation: {
        targetLang: translation.targetLang || translation.targetLanguageCode || "",
        status: "ready",
        overlay: translation.overlay,
        ...(translation.note ? { note: translation.note } : {}),
        ...(translation.translationPolicyVersion
          ? { translationPolicyVersion: translation.translationPolicyVersion }
          : {}),
      },
    };
  }

  function generatedDraftPayload(draft) {
    if (!draft || typeof draft !== "object") return null;
    const item = draft.item && typeof draft.item === "object" ? draft.item : null;
    const draftSetId = typeof draft.draftSetId === "string" ? draft.draftSetId : "";
    const candidateId = typeof draft.candidateId === "string" ? draft.candidateId : "";
    const revision = Number.isInteger(draft.revision) ? draft.revision : null;
    if (!item || !draftSetId || !candidateId || !revision) return null;
    return { draftSetId, candidateId, revision, item };
  }

  function generatedEntrySourceContext(selectedWord, entryId = "") {
    return buildDictionaryActionSourceContext(
      selectedWord.sourceBinding,
      {
        id: entryId || "generated-draft",
        entryId,
        clickedForm: selectedWord.word,
        headword: selectedWord.word,
      },
      entryId ? "start-learning" : "generated-entry-draft",
    );
  }

  function createDictionarySourceBinding(word, phraseIndex, selection = {}) {
    return sourceBindingApi.createDictionarySourceBinding({
      word,
      phraseIndex,
      selection,
      videoId: state.videoId,
      selectedSourceId: state.selectedSourceId,
      selectedTrack: state.selectedTrack,
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      transcriptResult: state.transcriptResult,
      source: getSelectedPracticeSource(),
    });
  }

  function frozenDictionaryActionPayload(selectedWord, card, actionPayload = {}) {
    return dictionaryActionApi.frozenDictionaryActionPayload({
      selectedWord,
      card,
      actionPayload,
      currentVideoId: state.videoId,
      createMutationTurnId,
      isUuid,
      buildSourceContext: buildDictionaryActionSourceContext,
    });
  }

  function buildDictionaryActionSourceContext(binding, card, action) {
    const video = getVideoElement();
    return sourceBindingApi.buildDictionaryActionSourceContext({
      binding,
      card,
      action,
      observation: {
        currentPlaybackTimeMs: video ? video.currentTime * 1000 : null,
        title: youtubeVideoTitle(),
        capturedAt: new Date().toISOString(),
      },
      clientVersion: extensionVersion(),
    });
  }

  function youtubeVideoTitle() {
    const title = document.title || "";
    return title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }

  function finiteInteger(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
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
    const generatedDraftItem = card?.generatedDraftItem || generatedDraftItemFromOverlayCard(card);
    if (!card?.entryId && !generatedDraftItem) return;
    if (!state.selectedWord) return;

    const selectedWord = state.selectedWord;
    setCardTranslationPending(card.id, true);
    state.selectedWord = {
      ...state.selectedWord,
      cardActionError: "",
    };
    render();

    try {
      const translation = await postDictionaryCommand("dict-translation", {
        ...(card.entryId && !generatedDraftItem ? { entryId: card.entryId } : {}),
        ...(generatedDraftItem ? { item: generatedDraftItem } : {}),
      });
      if (!isCurrentLookup(selectedWord)) return;
      setCardTranslationPending(card.id, false);
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
      setCardTranslationPending(card.id, false);
      state.selectedWord = {
        ...state.selectedWord,
        cardActionStatus: "",
        cardActionError: error instanceof Error ? error.message : String(error),
      };
      render();
    }
  }

  function generatedDraftItemFromOverlayCard(card) {
    if (!card || card.entryId) return null;
    const sections = Array.isArray(card.sections)
      ? card.sections
          .map((section, index) => ({
            id: section.id || `section-${index + 1}`,
            kind: section.kind || "meaning",
            text: section.text || "",
            sourcePath: section.sourcePath || `card.sections.${index}`,
          }))
          .filter((section) => section.text)
      : [];
    if (!card.headword && !sections.length) return null;
    return {
      entry: {
        id: card.id ? `draft:${card.id}` : undefined,
        content: {
          headword: card.headword || "",
          languageCode: card.language || "",
          sections,
          summary: card.summary || {},
        },
      },
    };
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

    attachCommandTimings(payload, response);

    if (!response.ok && isNoMatchLookupPayload(response, payload)) {
      return payload;
    }

    if (!response.ok) {
      const message = safeLookupErrorMessage(response, payload, text);
      const error = new Error(`Dictionary lookup failed: HTTP ${response.status} ${message}`);
      error.payload = payload || { error: message };
      throw error;
    }

    return payload;
  }

  async function fetchDictionarySearchResult({ word, language, context, group, cursor, limit }) {
    const endpoint = dictionaryLookupEndpoint();
    if (!endpoint) {
      throw new Error("Dictionary search is disabled.");
    }

    const response = await requestDictionaryCommand("dict-search", {
      clickedForm: word,
      sourceLanguageCode: language || "auto",
      ...(context ? { contextText: context } : {}),
      ...(group ? { group } : {}),
      ...(cursor ? { cursor } : {}),
      limit: limit || 5,
    });
    const text = response.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }

    attachCommandTimings(payload, response);

    if (!response.ok) {
      const message = safeLookupErrorMessage(response, payload, text);
      const error = new Error(`Dictionary search failed: HTTP ${response.status} ${message}`);
      error.payload = payload || { error: message };
      throw error;
    }

    return payload;
  }

  function attachCommandTimings(payload, response) {
    if (!payload || typeof payload !== "object" || !response?.timings) return payload;
    const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
    payload.meta = {
      ...meta,
      commandTimings: response.timings,
    };
    return payload;
  }

  function isNoMatchLookupPayload(response, payload) {
    if (response.status !== 404 || !payload) return false;
    return payload.code === "no_match" || payload.error === "no_match";
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
      } else if (operation === "dict-search") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/search");
      } else if (operation === "dict-action") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/actions");
      } else if (operation === "dict-translation") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/translation");
      } else if (operation === "dict-generated-draft") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/generated-entry/draft");
      } else if (operation === "dict-generated-save") {
        url.pathname = url.pathname.replace(/\/dict\/?$/, "/dict/generated-entry");
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
    const mockMode = window.localStorage.getItem("afShadowingDictionaryMock");
    if (mockMode !== "cards" && mockMode !== "generated") return null;
    recordDictionaryMockCommand(operation, body, mockMode);
    if (operation === "dict-lookup") {
      if (mockMode === "generated") {
        return jsonCommandResponse({
          contractVersion: "dict-lookup-v2",
          clickedForm: body?.clickedForm || "gedoe",
          query: body?.clickedForm || "gedoe",
          cards: [],
          error: "no_match",
          code: "no_match",
          meta: { provider: "mock", responseVersion: "overlay-v2" },
        }, false, 404);
      }
      return jsonCommandResponse(mockDictionaryLookup(body));
    }
    if (operation === "dict-search") {
      return jsonCommandResponse(mockDictionarySearch(body));
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
    if (operation === "dict-generated-draft") {
      return jsonCommandResponse({
        ok: true,
        draft: {
          draftSetId: "mock-draft-set",
          candidateId: "mock-candidate",
          revision: 1,
          clickedForm: body?.clickedForm || "appel",
          languageCode: body?.sourceLanguageCode || "nl",
          contextText: body?.contextText || "",
          sourceContext: body?.sourceContext,
          item: {
            draftSetId: "mock-draft-set",
            candidateId: "mock-candidate",
            revision: 1,
            entry: {
              content: {
                headword: body?.clickedForm || "appel",
                languageCode: body?.sourceLanguageCode || "nl",
                sections: [
                  {
                    id: "meaning-1",
                    kind: "meaning",
                    text: "Een gegenereerde uitleg voor deze selectie.",
                  },
                  {
                    id: "example-1",
                    kind: "example",
                    text: body?.contextText || "Dit is een voorbeeld.",
                  },
                ],
                summary: {
                  definition: "Een gegenereerde uitleg voor deze selectie.",
                  example: body?.contextText || "Dit is een voorbeeld.",
                },
              },
              contentFingerprint: "mock-generated-entry",
            },
          },
          card: mockGeneratedDraftCard(body),
        },
      });
    }
    if (operation === "dict-generated-save") {
      return jsonCommandResponse({
        ok: true,
        entryId: "entry-generated-mock",
        generation: {
          status: "persisted",
          requiresExplicitStartLearning: true,
        },
      });
    }
    return null;
  }

  function recordDictionaryMockCommand(operation, body, mockMode) {
    const commands = Array.isArray(window.__afShadowingDictionaryMockCommands)
      ? window.__afShadowingDictionaryMockCommands
      : [];
    commands.push({
      operation,
      mockMode,
      body,
      at: new Date().toISOString(),
    });
    window.__afShadowingDictionaryMockCommands = commands.slice(-50);
    document.documentElement.dataset.afShadowingDictionaryMockCommands =
      JSON.stringify(window.__afShadowingDictionaryMockCommands);
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
          headword: "opbouwen",
          headwordTranslation: "строить; выстраивать; формировать",
          definition: "bouwen; tot een geheel maken",
          definitionTranslation: "строить; создать единое целое",
          context: "iemand bouwt iets op",
          contextTranslation: "кто-то что-то выстраивает",
          example: "Na de brand is het huis weer opnieuw opgebouwd.",
          exampleTranslation: "После пожара дом снова отстроили.",
          partOfSpeech: "ww",
          audio: {
            state: "ready",
            kind: "curated",
            primaryUrl: "https://2000.dilum.io/audio/nl/o/opbouwen.mp3",
            variants: {
              nl: "https://2000.dilum.io/audio/nl/o/opbouwen.mp3",
            },
            source: "2000nl",
            format: "audio/mpeg",
          },
          phase: "encountered",
          progressActions: [
            progressDisplayAction("learn", "Start Learning", "start-learning"),
          ],
        }),
        mockDictionaryCard({
          id: "mock-review",
          entryId: "entry-review",
          clickedForm,
          headword: "groen licht",
          headwordTranslation: "зеленый свет; разрешение; одобрение",
          definition: "toestemming krijgen om iets te doen",
          definitionTranslation: "получить разрешение что-то сделать",
          example: "Na weken wachten kreeg het project eindelijk groen licht.",
          exampleTranslation: "После недель ожидания проект наконец получил разрешение.",
          partOfSpeech: "idiom",
          audio: {
            state: "resolvable",
            kind: "generated",
            source: "2000nl-tts",
            resolveToken: "mock-resolve-token",
            format: "audio/mpeg",
          },
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
          headword: "opgebouwd",
          headwordTranslation: "",
          definition: "voltooid deelwoord van opbouwen; opnieuw tot stand gebracht",
          definitionTranslation: "",
          example: "Het huis is na de brand opnieuw opgebouwd.",
          exampleTranslation: "",
          partOfSpeech: "ww",
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

  function mockDictionarySearch(body = {}) {
    const query = body?.clickedForm || "appel";
    const group = body?.group || null;
    const groups = [
      {
        id: "headwords",
        total: 1,
        items: [],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
      {
        id: "examples",
        total: 2,
        items: [
          {
            kind: "field-match",
            resultKey: "entry-learn:raw.meanings[0].examples[0]",
            entry: { id: "entry-learn", headword: query },
            field: { kind: "example", text: `Een voorbeeldzin met ${query}.` },
            match: { matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: "mock-examples-cursor", hasMore: !body?.cursor },
      },
      {
        id: "definitions",
        total: 1,
        items: [
          {
            kind: "field-match",
            resultKey: "entry-learn:raw.meanings[0].definition",
            entry: { id: "entry-learn", headword: query },
            field: { kind: "meaning-definition", text: `${query} in een woordenboekbetekenis.` },
            match: { matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
      {
        id: "alphabetical",
        total: 3,
        items: [
          {
            kind: "entry",
            entry: { id: "entry-alpha-1", headword: query, summaryDefinition: "alfabetische buur" },
            match: { relation: "alphabetical", matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
    ];
    return {
      contractVersion: "dictionary-search-v1",
      query,
      request: {
        languageCode: body?.sourceLanguageCode || "nl",
        scope: "mock",
        ...(group ? { group } : {}),
      },
      groups: group ? groups.filter((candidate) => candidate.id === group) : groups,
    };
  }

  function mockGeneratedDraftCard(body = {}) {
    const clickedForm = body?.clickedForm || "gedoe";
    return {
      ...mockDictionaryCard({
      id: "mock-generated-draft",
      entryId: "",
      clickedForm,
      headword: clickedForm,
      phase: "not-started",
      progressActions: [
        {
          id: "save-and-learn",
          label: "Start Learning",
          group: "progress",
          enabled: true,
          command: { kind: "generated-save-and-start-learning" },
        },
      ],
      }),
      generatedDraftItem: {
        entry: {
          id: "draft:mock-generated-draft",
          content: {
            headword: clickedForm,
            languageCode: body?.sourceLanguageCode || "nl",
            sections: [
              {
                id: "meaning-1",
                kind: "meaning",
                text: "Een gegenereerde uitleg voor deze selectie.",
              },
              {
                id: "example-1",
                kind: "example",
                text: body?.contextText || "Dit is een voorbeeld.",
              },
            ],
          },
        },
      },
    };
  }

  function mockDictionaryCard({
    id,
    entryId,
    clickedForm,
    headword,
    headwordTranslation = "apple",
    definition = "A round fruit used in learner examples.",
    definitionTranslation = "круглый фрукт для учебных примеров",
    context = "",
    contextTranslation = "",
    example = `${clickedForm} valt niet ver van de boom.`,
    exampleTranslation = "яблоко от яблони недалеко падает",
    meaningId = 1,
    partOfSpeech = "noun",
    audio,
    phase,
    progressActions,
  }) {
    const includeLookupTranslations = Boolean(entryId) && entryId !== "entry-translate-error";
    return {
      id,
      entryId,
      clickedForm,
      headword,
      language: "Dutch",
      meaningId,
      partOfSpeech,
      ...(audio ? { audio } : {}),
      match: { relation: "exact", confidence: 1 },
      summary: {
        definition,
        ...(includeLookupTranslations && definitionTranslation ? { definitionTranslation } : {}),
        example,
        ...(includeLookupTranslations && exampleTranslation ? { exampleTranslation } : {}),
      },
      ...(includeLookupTranslations && headwordTranslation ? { headwordTranslation } : {}),
      chips: [
        { kind: "part-of-speech", label: partOfSpeech },
        { kind: "language", label: "Dutch" },
      ],
      sections: [
        { kind: "meaning", label: "Definition", text: definition },
        ...(context
          ? [{
              kind: "context",
              text: context,
              ...(includeLookupTranslations && contextTranslation ? { translation: contextTranslation } : {}),
            }]
          : []),
        {
          kind: "example",
          text: example,
          ...(includeLookupTranslations && exampleTranslation ? { translation: exampleTranslation } : {}),
        },
        ...(partOfSpeech === "idiom"
          ? [{
              kind: "note",
              label: "usage note",
              text: "Used for permission from a person, organization, or authority.",
            }]
          : []),
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
    if (operation === "issue-report-submit") {
      const mockResponse = issueReportMockResponse();
      if (mockResponse) return Promise.resolve(mockResponse);
    }
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
    } else if (operation === "issue-report-submit") {
      const mockResponse = issueReportMockResponse();
      if (mockResponse) return Promise.resolve(mockResponse);
      url = new URL("/api/extension/issue-reports", `${apiBase}/`);
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

  function issueReportMockResponse() {
    const mode = window.localStorage.getItem("afShadowingIssueReportMock");
    if (mode === "success") {
      return jsonCommandResponse({
        id: "af_report_smoke",
        status: "new",
        category: state.issueCategory,
        createdAt: new Date().toISOString(),
      }, true, 201);
    }
    if (mode === "error") {
      return jsonCommandResponse({ error: "issue_report_mock_failure" }, false, 503);
    }
    return null;
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
    if (phraseProgressSaveTimer) {
      window.clearTimeout(phraseProgressSaveTimer);
      phraseProgressSaveTimer = null;
    }
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
    state.phraseTranslationStickyVisible = false;
    state.phraseTranslations = {};
    state.lastPhraseProgressRestore = null;
    state.timingOperation = null;
    state.timingOperationError = "";
    clearTimingOperationPoll();
    state.selectedWord = null;
    state.selectedSpan = null;
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
      const preferredSource = choosePreferredPracticeSource(state.practiceSources, videoId);
      const defaultSource = preferredSource?.source || captionTrackApi.chooseDefaultPracticeSource(state.practiceSources);
      if (!defaultSource) {
        throw new Error("No caption tracks found for this video.");
      }
      await loadPracticeSource(defaultSource, {
        keepExistingOnError: false,
        preserveVideoTime: false,
        loadToken,
        persistSelection: preferredSource?.reason === "stored-selection",
        sourceSelectionReason: preferredSource?.reason || "initial-default",
      });
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
    await loadPracticeSource(source, {
      keepExistingOnError: true,
      preserveVideoTime: true,
      persistSelection: true,
      allowPreferredSourceSwitch: false,
      sourceSelectionReason: "manual-select",
    });
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
      const reusableTimingResult = source.track?.afPracticeSnapshotSource && source.loadedTranscriptResult?.practiceSnapshot
        ? transcriptResultFromLoadedSource(source)
        : await fetchReusableTimingTranscriptResult(source);
      const cachedTimingResult = options.refreshCache ? null : reusableTimingResult;
      let transcriptResult = cachedTimingResult || await fetchBestAvailableCues(source.track, {
        refreshCache: Boolean(options.refreshCache),
        preferBackendProvider: true,
      });
      if (!cachedTimingResult && transcriptResult?.timingExactness !== "word-level" && transcriptResult?.practiceArtifact) {
        transcriptResult = await fetchReusableTimingTranscriptResult(source, transcriptResult) || transcriptResult;
      }
      const cues = transcriptResult.cues;
      const phrases = phrasesFromTranscriptResult(transcriptResult);
      if (loadToken !== state.loadToken) return;
      if (!phrases.length) {
        throw new Error("Caption track loaded, but no timed phrases were parsed.");
      }
      const restoredProgress = await readStoredPhraseProgress(source.id, phrases);
      if (loadToken !== state.loadToken) return;
      const playbackIndex = findPhraseIndexForTime(phrases, currentMs);
      const nextIndex = restoredProgress?.index ?? playbackIndex;

      state.selectedSourceId = source.id;
      state.selectedTrack = source.track;
      state.cues = cues;
      state.transcriptResult = transcriptResult;
      state.phrases = phrases;
      state.currentIndex = nextIndex;
      state.lastPhraseProgressRestore = restoredProgress
        ? {
            sourceId: source.id,
            reason: restoredProgress.reason,
            currentIndex: nextIndex,
            savedIndex: restoredProgress.progress.currentIndex,
            phraseCount: phrases.length,
            savedPhraseCount: restoredProgress.progress.phraseCount,
            updatedAt: restoredProgress.progress.updatedAt,
          }
        : null;
      if (restoredProgress && video && phrases[nextIndex]) {
        video.currentTime = Math.max(0, phrases[nextIndex].startMs / 1000);
      }
      state.selectedWord = null;
      state.selectedSpan = null;
      state.phraseTranslations = {};
      state.timingOperationError = "";
      source.loadedCueSource = transcriptResult.retrievalPath;
      source.loadedTranscriptResult = summarizeTranscriptResult(transcriptResult);
      source.lastRetrievalAttempts = transcriptResult.retrievalAttempts || [];
      if (options.persistSelection) {
        writeStoredSourceSelection(source, options.sourceSelectionReason || "source-loaded");
      }
      state.guidedMode = state.autoPause;
      state.passivePausedKey = "";
      state.error = "";
      updateBootDiagnostics({
        selectedRetrievalPath: transcriptResult.retrievalPath,
        lastError: "",
      });
      ensurePassivePlaybackWatcher();
      const playbackVideo = getVideoElement();
      if (playbackVideo && state.autoPause) {
        syncPassivePlayback(playbackVideo);
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
        phraseProgressRestore: state.lastPhraseProgressRestore,
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
        holdInitialAutoPauseAfterSourceLoad();
        render();
        if (options.allowPreferredSourceSwitch !== false) {
          try {
            await maybeSwitchToPreferredSource({
              loadToken,
              preserveVideoTime: Boolean(options.preserveVideoTime),
              reason: "post-load",
            });
          } catch (error) {
            recordDebugEvent("source-auto-switch-failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  }

  function phrasesFromTranscriptResult(transcriptResult) {
    const cues = transcriptResult?.cues || [];
    const usesBackendPhraseContract =
      transcriptResult?.practicePhraseSource === "backend" ||
      transcriptResult?.retrievalPath === "backend-provider" ||
      transcriptResult?.retrievalPath === "local-asr-backend" ||
      transcriptResult?.retrievalPath === "practice-timing-cache";
    return usesBackendPhraseContract
      ? cues.map((cue, index) => ({
        id: cue.phraseId ?? index,
        startMs: cue.startMs,
        endMs: cue.endMs,
        playbackStartMs: cue.playbackStartMs,
        text: phraseApi.cleanPhraseText(cue.text),
        displayText: phraseApi.cleanPhraseText(cue.displayText || ""),
        translationText: phraseApi.cleanPhraseText(cue.translationText || ""),
        displayStartChar: finiteInteger(cue.displayStartChar),
        displayEndChar: finiteInteger(cue.displayEndChar),
        displaySegmentId: cue.displaySegmentId || "",
        segmentRole: cue.segmentRole || "",
        timingFlags: Array.isArray(cue.timingFlags) ? cue.timingFlags : [],
        cues: [cue],
        index,
      }))
      : phraseApi.buildPhrases(cues, {
        maxPhraseDurationMs: MAX_PHRASE_DURATION_MS,
        longPauseMs: LONG_PAUSE_MS,
        maxWords: 18,
        maxCharacters: 140,
      });
  }

  async function maybeSwitchToPreferredSource(options = {}) {
    const loadToken = options.loadToken ?? state.loadToken;
    if (loadToken !== state.loadToken || state.loading || !state.practiceSources.length) return false;

    const preferred = choosePreferredPracticeSource(state.practiceSources);
    const target = preferred?.source;
    if (!target || target.id === state.selectedSourceId) return false;

    const current = getSelectedPracticeSource();
    if (
      preferred.reason !== "stored-selection" &&
      current &&
      sourceSelectionRank(current) <= sourceSelectionRank(target)
    ) {
      return false;
    }

    recordDebugEvent("source-auto-switch", {
      reason: options.reason || preferred.reason,
      selectionReason: preferred.reason,
      from: current ? captionTrackApi.sourceDisplayName(current) : "",
      to: captionTrackApi.sourceDisplayName(target),
      targetKind: sourceSelectionKind(target),
    });
    await loadPracticeSource(target, {
      keepExistingOnError: true,
      preserveVideoTime: Boolean(options.preserveVideoTime),
      loadToken,
      persistSelection: preferred.reason === "stored-selection",
      allowPreferredSourceSwitch: false,
      sourceSelectionReason: preferred.reason,
    });
    return true;
  }

  function holdInitialAutoPauseAfterSourceLoad() {
    if (!state.learningEnabled || !state.autoPause || !state.phrases.length) return;

    const video = getVideoElement();
    if (!video) return;

    state.guidedMode = true;
    if (!state.lastPhraseProgressRestore) {
      syncPassivePlayback(video);
    }

    if (video.paused) return;

    const currentMs = video.currentTime * 1000;
    const index = findPlaybackPhraseIndex(state.phrases, currentMs);
    const phrase = state.lastPhraseProgressRestore
      ? state.phrases[state.currentIndex]
      : state.phrases[index] || state.phrases[state.currentIndex];
    if (!state.lastPhraseProgressRestore && phrase && index !== state.currentIndex) {
      state.currentIndex = index;
      schedulePhraseProgressSave("auto-pause-load-sync");
    }

    video.pause();
    state.guidedHold = {
      index: state.currentIndex,
      holdSeconds: video.currentTime,
      createdAt: Date.now(),
    };
    state.passivePausedKey = `${state.videoId || ""}:${state.selectedSourceId}:load`;
    if (phrase) {
      markCurrentTranscriptSegment(phrase);
    }
    recordNavigationEvent("auto-pause-load", {
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      playback: getPlaybackSnapshot(),
    });
  }

  function transcriptResultFromLoadedSource(source) {
    const result = source.loadedTranscriptResult;
    const snapshot = result?.practiceSnapshot;
    if (!snapshot) return null;
    const operation = {
      id: source.id,
      kind: "improve-timing",
      state: "succeeded",
      input: {
        language: result.languageCode || source.languageCode || "",
        textSource: snapshot.textSource?.kind === "asr" ? "asr" : snapshot.textSource?.kind === "provided-captions" ? "manual" : "auto",
      },
      result: {
        snapshot,
        diagnostics: {
          asrJobId: result.actualTrackId || "",
        },
      },
    };
    return transcriptResultFromPracticeSnapshot(snapshot, operation, {
      alternativeId: result.actualTrackId || "",
    });
  }

  async function fetchReusableTimingTranscriptResult(source, resultOverride = null) {
    if (!state.videoId) return null;

    try {
      const operation = await postBackendJson("practice-timing-create", {
        apiBase: apiBaseForBackendCommands(),
        payload: {
          ...buildPracticeTimingPayload(source, "", resultOverride),
          reuseOnly: true,
        },
      });
      const transcriptResult = transcriptResultFromPracticeTimingOperation(operation, {
        currentResult: resultOverride || source?.loadedTranscriptResult || state.transcriptResult,
      });
      const registeredSources = registerTimingOperationResultSources(operation, {
        mainResult: transcriptResult,
      });
      if (registeredSources > 0) {
        recordDebugEvent("timing-cache-sources-registered", {
          operationId: operation.id || "",
          source: captionTrackApi.sourceDisplayName(source),
          registeredSources,
        });
      }
      return transcriptResult;
    } catch (error) {
      recordDebugEvent("timing-cache-miss", {
        source: captionTrackApi.sourceDisplayName(source),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  function registerTimingOperationResultSources(operation, options = {}) {
    if (operation?.kind !== "improve-timing" || operation.state !== "succeeded") return 0;

    const selectedSource = getSelectedPracticeSource();
    const mainResult = Object.prototype.hasOwnProperty.call(options, "mainResult")
      ? options.mainResult
      : transcriptResultFromPracticeTimingOperation(operation, {
        currentResult: selectedSource?.loadedTranscriptResult || state.transcriptResult,
      });
    if (selectedSource && mainResult) {
      selectedSource.loadedTranscriptResult = summarizeTranscriptResult(mainResult);
      selectedSource.loadedCueSource = mainResult.retrievalPath;
      selectedSource.lastRetrievalAttempts = mainResult.retrievalAttempts || [];
      selectedSource.error = "";
      selectedSource.lastError = "";
    }

    let registeredSources = 0;
    for (const alternative of operation.result?.alternatives || []) {
      if (registerPracticeSnapshotSource(operation, alternative)) {
        registeredSources += 1;
      }
    }
    return registeredSources;
  }

  function registerPracticeSnapshotSource(operation, alternative) {
    const snapshot = alternative?.snapshot;
    const result = transcriptResultFromPracticeSnapshot(snapshot, operation, {
      alternativeId: alternative?.id || "",
      label: alternative?.label || "",
    });
    if (!result) return false;

    const sourceId = `practice:${operation.id || "timing"}:${alternative?.id || snapshot.snapshotRevisionId || state.practiceSources.length}`;
    const existing = state.practiceSources.find((source) => source.id === sourceId);
    const source = existing || {
      id: sourceId,
      index: state.practiceSources.length,
      name: alternative?.label || snapshot.textSource?.label || "ASR transcript",
      languageCode: snapshot.textSource?.languageCode || operation.input?.language || "",
      track: {
        kind: snapshot.textSource?.kind === "asr" ? "asr" : "manual",
        languageCode: snapshot.textSource?.languageCode || operation.input?.language || "",
        vssId: sourceId,
        name: { simpleText: alternative?.label || snapshot.textSource?.label || "ASR transcript" },
        afPracticeSnapshotSource: true,
      },
      error: "",
      lastError: "",
      lastRetrievalAttempts: [],
      loadedCueSource: result.retrievalPath,
      loadedTranscriptResult: summarizeTranscriptResult(result),
    };

    source.name = alternative?.label || snapshot.textSource?.label || source.name;
    source.loadedCueSource = result.retrievalPath;
    source.loadedTranscriptResult = summarizeTranscriptResult(result);
    source.lastRetrievalAttempts = result.retrievalAttempts || [];
    source.error = "";
    source.lastError = "";

    if (!existing) state.practiceSources.push(source);
    return true;
  }

  function transcriptResultFromPracticeTimingOperation(operation, options = {}) {
    const snapshot = operation?.result?.snapshot;
    if (operation?.kind !== "improve-timing" || operation.state !== "succeeded") {
      return null;
    }

    const applicability = operation.result?.applicability;
    const fingerprintDetails = timingFingerprintCompatibilityDetails(operation, options.currentResult);
    const fingerprintCompatible = fingerprintDetails.compatible;
    if (!applicability?.appliesToCurrentSnapshot && !fingerprintCompatible) {
      recordDebugEvent("timing-cache-skipped", {
        operationId: operation.id || "",
        staleReason: applicability?.staleReason || "missing-applicability",
        requestedSnapshotRevisionId: applicability?.requestedSnapshotRevisionId || "",
        resultSnapshotRevisionId: applicability?.resultSnapshotRevisionId || operation.result?.snapshotRevisionId || "",
        requestedTextSourceRevisionId: applicability?.requestedTextSourceRevisionId || "",
        resultTextSourceRevisionId: applicability?.resultTextSourceRevisionId || operation.result?.textSourceRevisionId || "",
        currentTextContentFingerprint: fingerprintDetails.currentFingerprint,
        resultTextContentFingerprint: fingerprintDetails.resultFingerprint,
        currentLanguage: fingerprintDetails.currentLanguage,
        resultLanguage: fingerprintDetails.resultLanguage,
        fingerprintSource: fingerprintDetails.currentFingerprintSource,
      });
      return null;
    }
    if (!applicability?.appliesToCurrentSnapshot && fingerprintCompatible) {
      recordDebugEvent("timing-cache-fingerprint-match", {
        operationId: operation.id || "",
        staleReason: applicability?.staleReason || "",
        textContentFingerprint: fingerprintDetails.resultFingerprint,
        fingerprintSource: fingerprintDetails.currentFingerprintSource,
      });
    }

    return transcriptResultFromPracticeSnapshot(snapshot, operation);
  }

  function timingResultMatchesCurrentTextFingerprint(operation, currentResult = null) {
    return timingFingerprintCompatibilityDetails(operation, currentResult).compatible;
  }

  function timingFingerprintCompatibilityDetails(operation, currentResult = null) {
    const staleReason = operation?.result?.applicability?.staleReason || "";
    if (staleReason !== "text-source-revision-mismatch") {
      return {
        compatible: false,
        currentFingerprint: "",
        resultFingerprint: "",
        currentLanguage: "",
        resultLanguage: "",
        currentFingerprintSource: "",
      };
    }
    const resultFingerprint = operation?.result?.snapshot?.textSource?.contentFingerprint || "";
    const artifactFingerprint = currentResult?.practiceArtifact?.textContentFingerprint || "";
    const snapshotFingerprint = currentResult?.practiceSnapshot?.textSource?.contentFingerprint || "";
    const currentFingerprint = artifactFingerprint || snapshotFingerprint || "";
    const currentFingerprintSource = artifactFingerprint
      ? "practiceArtifact.textContentFingerprint"
      : snapshotFingerprint ? "practiceSnapshot.textSource.contentFingerprint" : "";
    const resultLanguage = operation?.result?.snapshot?.textSource?.languageCode || "";
    const currentLanguage = currentResult?.languageCode || currentResult?.practiceSnapshot?.textSource?.languageCode || "";
    const languageCompatible = !resultLanguage || !currentLanguage || resultLanguage === currentLanguage;
    return {
      compatible: Boolean(resultFingerprint && currentFingerprint && resultFingerprint === currentFingerprint && languageCompatible),
      currentFingerprint,
      resultFingerprint,
      currentLanguage,
      resultLanguage,
      currentFingerprintSource,
    };
  }

  function transcriptResultFromPracticeSnapshot(snapshot, operation, options = {}) {
    const phrases = snapshot?.phraseSet?.phrases;
    if (!Array.isArray(phrases) || !phrases.length) {
      return null;
    }

    const cues = phrases.map((phrase, index) => ({
      startMs: Math.max(0, Number(phrase.startSec || 0) * 1000),
      endMs: Math.max(0, Number(phrase.endSec || 0) * 1000),
      playbackStartMs: phrase.playbackStartSec !== undefined
        ? Math.max(0, Number(phrase.playbackStartSec || 0) * 1000)
        : undefined,
      text: phraseApi.cleanPhraseText(phrase.text || ""),
      displayText: phraseApi.cleanPhraseText(phrase.displayText || ""),
      translationText: phraseApi.cleanPhraseText(phrase.translationText || ""),
      displayStartChar: finiteInteger(phrase.displayStartChar),
      displayEndChar: finiteInteger(phrase.displayEndChar),
      displaySegmentId: String(phrase.displaySegmentId || ""),
      segmentRole: String(phrase.segmentRole || ""),
      index,
      timingFlags: Array.isArray(phrase.timingFlags) ? phrase.timingFlags : [],
    })).filter((cue) => cue.text && cue.endMs >= cue.startMs);

    if (!cues.length) return null;

    const textSource = operation.input?.textSource || snapshot.textSource?.kind || "";
    const isAsrTextSource = snapshot.textSource?.kind === "asr" || textSource === "asr";
    const isManualTextSource = !isAsrTextSource && (textSource === "manual" || snapshot.textSource?.kind === "provided-captions");

    return {
      cues,
      sourceKind: isAsrTextSource ? "asr" : isManualTextSource ? "manual" : "auto",
      retrievalPath: "practice-timing-cache",
      fetchOrigin: "backend",
      provider: "audiofilms-practice-timing",
      selectedTrackId: "",
      actualTrackId: options.alternativeId || operation.result?.diagnostics?.asrJobId || "",
      languageCode: snapshot.textSource?.languageCode || operation.input?.language || "",
      timingExactness: "word-level",
      qualityFlags: [],
      warnings: [
        isAsrTextSource
          ? `ASR job completed: ${cues.length} ASR transcript phrases.`
          : isManualTextSource
          ? `ASR timing cache aligned ${cues.length} caption phrases.`
          : `ASR timing cache aligned ${cues.length} auto-caption phrases.`,
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

  function replayCurrentPhrase(options = {}) {
    if (!state.phrases.length) return;
    navigateToPhrase(options.slowReplay ? "slow-replay" : "replay", state.currentIndex, options);
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

  function navigateToPhrase(command, targetIndex, options = {}) {
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
    schedulePhraseProgressSave(command);
    if (fromIndex !== targetIndex) {
      state.selectedSpan = null;
      applyPhraseEntryDisplayState();
    }
    enterGuidedMode();
    render();
    if (shouldHoldRecallPhraseEntry(command, fromIndex, targetIndex)) {
      const holdResult = holdPhraseAtStart(targetIndex, {
        command,
        navigationEventId: navigationEvent.id,
      });
      recordNavigationEvent("command-dispatched", {
        command,
        navigationEventId: navigationEvent.id,
        fromIndex,
        targetIndex,
        playResult: holdResult,
        playbackAfterDispatch: getPlaybackSnapshot(),
      });
      scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 250);
      scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 750);
      return;
    }
    const playResult = playPhrase(state.currentIndex, {
      command,
      navigationEventId: navigationEvent.id,
      slowReplay: Boolean(options.slowReplay),
    });
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

  function shouldHoldRecallPhraseEntry(command, fromIndex, targetIndex) {
    return state.practiceMode === "recall"
      && (command === "next" || command === "previous")
      && fromIndex !== targetIndex;
  }

  function holdPhraseAtStart(index, options = {}) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    stopPlaybackTimer();
    const holdSeconds = Math.max(0, phrase.startMs / 1000);
    video.pause();
    video.currentTime = holdSeconds;
    state.currentIndex = index;
    state.guidedMode = true;
    state.guidedHold = {
      index,
      holdSeconds,
      createdAt: Date.now(),
    };
    state.passivePausedKey = `${state.videoId || ""}:${state.selectedSourceId}:recall-entry:${index}`;
    markCurrentTranscriptSegment(phrase);
    recordNavigationEvent("recall-entry-hold", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: describePhraseAtIndex(index),
      holdSeconds: roundTime(holdSeconds),
      playback: getPlaybackSnapshot(),
    });
    render();
    return {
      ok: true,
      seekToSec: roundTime(holdSeconds),
      expectedPauseAtSec: roundTime(holdSeconds),
      autoPause: true,
      heldForRecall: true,
    };
  }

  function toggleText(event) {
    if (event?.shiftKey) {
      state.shadowTextVisible = !state.shadowTextVisible;
      if (state.practiceMode === "shadow") {
        state.textVisible = state.shadowTextVisible;
      }
    } else {
      state.textVisible = !state.textVisible;
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
    render();
  }

  function applyPhraseEntryDisplayState() {
    if (state.practiceMode === "recall") {
      state.textVisible = false;
      state.phraseTranslationVisible = true;
    } else {
      state.textVisible = state.shadowTextVisible;
      state.phraseTranslationVisible = state.phraseTranslationStickyVisible;
    }
    if (state.practiceMode === "recall" || state.phraseTranslationVisible) {
      ensureCurrentPhraseTranslation();
    }
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
      const changed = activeIndex !== state.currentIndex;
      state.currentIndex = activeIndex;
      if (changed) {
        state.selectedSpan = null;
        applyPhraseEntryDisplayState();
      }
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
    const audibleEndMs = phrase.endMs + MIN_AUDIBLE_END_TAIL_MS;
    if (nextPhrase && nextPhrase.startMs < postRollEndMs) {
      return Math.min(postRollEndMs, Math.max(audibleEndMs, nextPhrase.startMs - CONTIGUOUS_BOUNDARY_GUARD_MS));
    }
    return postRollEndMs;
  }

  function playWordReplay(index, selection, options = {}) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }
    const wordTiming = resolveWordTiming(phrase, selection);
    if (options.mode === "word" && !wordTiming) {
      return {
        ok: false,
        reason: "word-timing-unavailable",
        timingSource: "unavailable",
      };
    }

    const phraseEndMs = playbackEndMsForPhrase(state.phrases, index);
    const startMs = wordTiming
      ? wordTiming.startMs
      : estimateWordStartMs(phrase, selection);
    const endMs = options.mode === "word"
      ? wordTiming.endMs
      : phraseEndMs;
    const clampedStartMs = clampNumber(
      startMs - (options.mode === "word" ? 40 : PRE_ROLL_MS),
      phrase.startMs,
      Math.max(phrase.startMs, phraseEndMs - 40),
      phrase.startMs,
    );
    const clampedEndMs = clampNumber(
      endMs,
      Math.max(clampedStartMs + 80, phrase.startMs),
      phraseEndMs,
      phraseEndMs,
    );
    const startSeconds = Math.max(0, clampedStartMs) / 1000;
    const endSeconds = Math.max(startSeconds + 0.08, clampedEndMs / 1000);

    stopPlaybackTimer();
    state.currentIndex = index;
    state.guidedMode = true;
    schedulePhraseProgressSave(`word-replay-${options.mode || "unknown"}`);
    markCurrentTranscriptSegment(phrase);
    video.currentTime = startSeconds;
    video.play().catch(() => {});

    const timingSource = wordTiming ? wordTiming.source : "estimate-char-position";
    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: endSeconds,
      wordReplay: {
        mode: options.mode,
        tokenIndex: selection.tokenIndex,
        timingSource,
      },
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
      timingSource,
      autoPause: true,
    };
  }

  function resolveWordTiming(phrase, selection = {}) {
    const candidates = Array.isArray(phrase.wordTimings)
      ? phrase.wordTimings
      : Array.isArray(phrase.words)
        ? phrase.words
        : Array.isArray(phrase.tokens)
          ? phrase.tokens
          : [];
    const tokenIndex = finiteInteger(selection.tokenIndex);
    const item = candidates.find((candidate, index) => {
      const candidateIndex = finiteInteger(candidate?.tokenIndex ?? candidate?.index);
      return candidateIndex === tokenIndex || (candidateIndex === null && index === tokenIndex);
    });
    const startMs = finiteInteger(item?.startMs ?? item?.start);
    const endMs = finiteInteger(item?.endMs ?? item?.end);
    if (
      startMs === null ||
      endMs === null ||
      endMs <= startMs ||
      startMs < phrase.startMs - 250 ||
      endMs > playbackEndMsForPhrase(state.phrases, state.phrases.indexOf(phrase)) + 250
    ) {
      return null;
    }
    const exactness = item?.timingExactness || phrase.timingExactness || state.transcriptResult?.timingExactness;
    const source = exactness === "word-level" || item?.source === "asr" || item?.source === "alignment"
      ? item?.source || "word-level"
      : null;
    return source ? { startMs, endMs, source } : null;
  }

  function estimateWordStartMs(phrase, selection = {}) {
    const range = phraseDisplaySegmentRange(phrase);
    const segmentStartChar = range?.start ?? 0;
    const segmentEndChar = range?.end ?? String(phrase.text || "").length;
    const textLength = Math.max(segmentEndChar - segmentStartChar, 1);
    const charStart = clampNumber(
      finiteInteger(selection.charStart) - segmentStartChar,
      0,
      textLength,
      0,
    );
    const ratio = charStart / textLength;
    const durationMs = Math.max(0, phrase.endMs - phrase.startMs);
    return phrase.startMs + durationMs * ratio;
  }

  function playPhrase(index, options = {}) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    stopPlaybackTimer();
    const playbackStartMs = phrasePlaybackStartMs(phrase);
    const startSeconds = Math.max(0, playbackStartMs - PRE_ROLL_MS) / 1000;
    const endSeconds = playbackEndMsForPhrase(state.phrases, index) / 1000;
    const normalPlaybackRate = syncPlaybackRateFromVideo(video);
    const requestedPlaybackRate = options.slowReplay ? slowReplayPlaybackRate() : normalPlaybackRate;
    markCurrentTranscriptSegment(phrase);
    video.currentTime = startSeconds;
    if (options.slowReplay) {
      state.pendingPlaybackRateRestore = normalPlaybackRate;
      video.playbackRate = requestedPlaybackRate;
    }
    video.play().catch(() => {});
    recordNavigationEvent("seek-started", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: describePhraseAtIndex(index),
      seekToSec: roundTime(startSeconds),
      phraseStartSec: roundTime(phrase.startMs / 1000),
      playbackStartSec: roundTime(playbackStartMs / 1000),
      expectedPauseAtSec: roundTime(endSeconds),
      playbackRate: requestedPlaybackRate,
      slowReplay: Boolean(options.slowReplay),
      playbackAfterSeek: getPlaybackSnapshot(),
    });

    if (!state.autoPause && !options.slowReplay) {
      render();
      return {
        ok: true,
        seekToSec: roundTime(startSeconds),
        phraseStartSec: roundTime(phrase.startMs / 1000),
        playbackStartSec: roundTime(playbackStartMs / 1000),
        expectedPauseAtSec: null,
        autoPause: false,
        playbackRate: requestedPlaybackRate,
        slowReplay: false,
      };
    }

    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: endSeconds,
      playbackRate: requestedPlaybackRate,
      restorePlaybackRate: options.slowReplay ? normalPlaybackRate : null,
      slowReplay: Boolean(options.slowReplay),
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
      playbackRate: requestedPlaybackRate,
      slowReplay: Boolean(options.slowReplay),
    };
  }

  function phrasePlaybackStartMs(phrase) {
    const playbackStartMs = Number(phrase?.playbackStartMs);
    if (
      Number.isFinite(playbackStartMs) &&
      playbackStartMs >= phrase.startMs &&
      playbackStartMs < phrase.endMs
    ) {
      return playbackStartMs;
    }
    return phrase.startMs;
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
    restorePlaybackRateAfterOverride();
    if (state.playbackFrame) {
      window.cancelAnimationFrame(state.playbackFrame);
      state.playbackFrame = null;
    }
    state.activePlayback = null;
  }

  function restorePlaybackRateAfterOverride(video = getVideoElement()) {
    const restoreRate = state.activePlayback?.restorePlaybackRate || state.pendingPlaybackRateRestore;
    if (!restoreRate || !video) return;
    video.playbackRate = clampPlaybackRate(restoreRate);
    state.playbackRate = clampPlaybackRate(restoreRate);
    state.pendingPlaybackRateRestore = null;
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
    video.addEventListener("ratechange", onPassiveVideoRateChange, true);
    syncPlaybackRateFromVideo(video);
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
      state.passiveVideo.removeEventListener("ratechange", onPassiveVideoRateChange, true);
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
    restorePlaybackRateAfterOverride();
  }

  function onPassiveVideoRateChange(event) {
    const video = event.currentTarget;
    const activeRestore = state.activePlayback?.restorePlaybackRate;
    if (!activeRestore || Math.abs(video.playbackRate - activeRestore) < 0.001) {
      state.playbackRate = clampPlaybackRate(video.playbackRate || 1);
      render();
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
        schedulePhraseProgressSave("active-playback");
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
      schedulePhraseProgressSave("passive-sync");
      markCurrentTranscriptSegment(phrase);
      render();
      if (state.practiceMode === "recall" && state.guidedMode && state.autoPause && !video.paused) {
        holdPhraseAtStart(index, { command: "passive-recall-entry" });
        return;
      }
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
      schedulePhraseProgressSave("auto-pause-held");
      state.guidedHold = {
        index,
        holdSeconds: pausedAtSeconds,
        createdAt: Date.now(),
      };
      markCurrentTranscriptSegment(phrase);
      recordNavigationEvent("auto-pause-held", {
        targetPhrase: describePhraseAtIndex(index),
        holdSeconds: roundTime(pausedAtSeconds),
        wordReplay: state.activePlayback.wordReplay || null,
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
      schedulePhraseProgressSave("guided-hold");
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
      if (state.spanSelectionDraft) {
        clearSpanSelectionDraft();
        blockYouTubeShortcutWithOptions(event);
        return;
      }
      if (closeOpenMenus()) {
        blockYouTubeShortcutWithOptions(event);
      }
      return;
    }

    if (isShortcutHelpKey(event)) {
      blockYouTubeShortcutWithOptions(event);
      toggleShortcutHelp(event);
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
      replayCurrentPhrase({ slowReplay: event.shiftKey });
    } else if (event.code === "ArrowUp") {
      blockYouTubeShortcutWithOptions(event);
      toggleText(event);
    } else if (event.code === "KeyS") {
      blockYouTubeShortcutWithOptions(event);
      toggleText(event);
    } else if (isSpeedDecreaseKey(event)) {
      blockYouTubeShortcutWithOptions(event);
      adjustVideoPlaybackRate(-PLAYBACK_RATE_STEP);
    } else if (isSpeedIncreaseKey(event)) {
      blockYouTubeShortcutWithOptions(event);
      adjustVideoPlaybackRate(PLAYBACK_RATE_STEP);
    } else if (isTranslationKey(event)) {
      blockYouTubeShortcutWithOptions(event);
      togglePhraseTranslation(event);
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

  function isSpeedDecreaseKey(event) {
    return event.code === "Comma" || event.code === "Minus" || event.code === "NumpadSubtract";
  }

  function isSpeedIncreaseKey(event) {
    return event.code === "Period" || event.code === "Equal" || event.code === "NumpadAdd";
  }

  function isTranslationKey(event) {
    return event.code === "KeyT" || event.code === "Digit0" || event.code === "Numpad0";
  }

  function isShortcutHelpKey(event) {
    return event.code === "Slash" && event.shiftKey;
  }

  function allowsShiftShortcut(event) {
    return event.code === "KeyS"
      || event.code === "KeyT"
      || event.code === "ArrowDown"
      || isSpeedDecreaseKey(event)
      || isSpeedIncreaseKey(event);
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
    if (event.metaKey || event.ctrlKey || event.altKey) return true;
    if (event.shiftKey && !allowsShiftShortcut(event) && !isShortcutHelpKey(event)) return true;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.some((element) => isKeyboardInputElement(element))) return true;
    const target = event.target;
    if (isKeyboardInputElement(target)) return true;
    return false;
  }

  function isKeyboardInputElement(target) {
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
  document.addEventListener("pointerup", onDocumentPointerUp, true);
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
      .replace(/\s*(?:\.{3}|…)\s*(?=\p{L})/gu, " ")
      .replace(/^(?:\.{3}|…)\s*/, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const hasSentenceEnding = (text) => /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
    const shouldJoinAfterEllipsis = (currentText, nextText) => (
      /(?:\.{3}|…)$/.test(String(currentText || "").trim())
      && /^\p{N}/u.test(String(nextText || "").trim())
    );
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
            (hasSentenceEnding(current.text) && !shouldJoinAfterEllipsis(current.text, cue.text)) ||
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

  function createSourceLabelsFallback() {
    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const stripAutoGeneratedSuffix = (value) => {
      const label = normalizeText(value);
      return label
        .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
        .trim() || label;
    };
    const youtubeTextSourceLabel = (source, result = null) => {
      if (!source) return "";
      if (result?.sourceKind === "asr") return "ASR transcript";
      const rawName = normalizeText(source.name) || normalizeText(source.track?.name?.simpleText) || normalizeText(source.languageCode) || "Captions";
      const baseName = stripAutoGeneratedSuffix(rawName);
      const isAuto = source.track?.kind === "asr" || result?.sourceKind === "auto";
      return isAuto ? `${baseName} (auto-generated)` : baseName;
    };
    const timingEnrichmentLabel = (result = null) => {
      if (!result || result.sourceKind === "asr") return "";
      if (result.timingExactness === "word-level") return "ASR timing";
      if (result.timingExactness === "aligned") return "Aligned timing";
      return "";
    };
    return {
      closedSourceLabel(source, result = null) {
        return [youtubeTextSourceLabel(source, result), timingEnrichmentLabel(result)].filter(Boolean).join(" · ") || "Captions";
      },
      sourceProviderLabel(source, result = null) {
        if (result?.sourceKind === "asr") return "ASR";
        if (source?.track || result?.fetchOrigin?.startsWith("youtube")) return "YouTube";
        if (result?.provider === "audiofilms-practice-timing") return "AudioFilms";
        return result?.provider || "";
      },
      stripAutoGeneratedSuffix,
      timingEnrichmentLabel,
      youtubeTextSourceLabel,
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
