(function audioFilmsYouTubeShadowing() {
  const CONTENT_SCRIPT_REVISION = "content-module-refactor-2026-06-30";

  try {
    bootAudioFilmsYouTubeShadowing();
  } catch (error) {
    const bootDiagnosticsApi = window.__afShadowingModuleRegistry?.resolveBootDiagnostics(window) ||
      createBootDiagnosticsFallback();
    bootDiagnosticsApi.recordBootFailure(error);
    bootDiagnosticsApi.renderBootFailureBadge(error);
  }

  function bootAudioFilmsYouTubeShadowing() {
  const modules = window.__afShadowingModuleRegistry.resolveContentModules(window);
  const {
    bootDiagnosticsApi,
    bootStateApi,
    formatUtilsApi,
    phraseApi,
    captionTrackApi,
    sourceLabelsApi,
    sourceSelectionApi,
    sourceSelectionStorageApi,
    sourceReadinessApi,
    videoLoadStateApi,
    youtubeAdapterApi,
    playerMetadataWorkflowApi,
    transcriptRetrievalApi,
    transcriptMetadataApi,
    sourceTranscriptWorkflowApi,
    sourceTranscriptContentWorkflowApi,
    transcriptPanelDomApi,
    sourceTimingWorkflowApi,
    sourceTimingContentWorkflowApi,
    sourceLoadWorkflowApi,
    sourceLoadContentWorkflowApi,
    sourceContentFacadeApi,
    videoInitWorkflowApi,
    videoInitContentWorkflowApi,
    sourceBindingApi,
    dictionaryActionApi,
    dictionaryActionWorkflowApi,
    dictionaryStateApi,
    dictionaryAudioApi,
    dictionaryAudioWorkflowApi,
    dictionaryMockApi,
    dictionaryPresentationApi,
    dictionaryDomApi,
    dictionaryOverlayWorkflowApi,
    dictionaryPanelWorkflowApi,
    dictionarySearchDomApi,
    dictionarySearchWorkflowApi,
    dictionaryRenderWorkflowApi,
    dictionaryCommandApi,
    dictionaryCommandTransportApi,
    dictionaryLookupWorkflowApi,
    dictionaryContentWorkflowApi,
    accountSessionApi,
    accountSessionWorkflowApi,
    accountSessionDomApi,
    backendCommandApi,
    backendBuildWorkflowApi,
    extensionCommandClientApi,
    generatedEntryApi,
    generatedEntryWorkflowApi,
    phraseProgressApi,
    phraseProgressStorageApi,
    phraseTranslationApi,
    phraseTranslationWorkflowApi,
    phraseRowsApi,
    phraseRowsDomApi,
    phraseRowsWorkflowApi,
    selectedSpanApi,
    selectedSpanWorkflowApi,
    selectedSpanDomApi,
    playbackSessionApi,
    playbackTimingApi,
    playbackWorkflowApi,
    playbackContentWorkflowApi,
    passivePlaybackWatcherApi,
    passivePlaybackContentWorkflowApi,
    playbackContentFacadeApi,
    issueReportsApi,
    issueReportWorkflowApi,
    supportContentFacadeApi,
    issueReportsDomApi,
    diagnosticsReportApi,
    diagnosticsStateApi,
    diagnosticsDomApi,
    displayPreferencesApi,
    displayPreferenceStorageApi,
    displayPreferenceWorkflowApi,
    storageStateApi,
    menuStateApi,
    scrollContainmentApi,
    domUtilsApi,
    uiIconsApi,
    ribbonControlsApi,
    workspaceDomApi,
    workspaceWorkflowApi,
    workspaceContentWorkflowApi,
    phraseJumpWorkflowApi,
    ribbonDomApi,
    ribbonPanelDomApi,
    ribbonWorkflowApi,
    surfaceContentFacadeApi,
    buildInfoApi,
  } = modules;
  const iconSvg = uiIconsApi.iconSvg;
  const bugIconSvg = uiIconsApi.bugIconSvg;
  const bootDiagnostics = bootDiagnosticsApi.markBootStarted();
  const bootConfig = bootStateApi.createBootConfig({ issueReports: issueReportsApi });
  const {
    DICTIONARY_PANEL_ID,
    RIBBON_PANEL_ID,
    ROOT_ID,
    SHADOW_CONTAINER_ID,
    TOGGLE_ID,
    SOURCE_SELECTION_STORAGE_KEY,
    MAX_PHRASE_DURATION_MS,
    LONG_PAUSE_MS,
    PRE_ROLL_MS,
    POST_ROLL_MS,
    MIN_AUDIBLE_END_TAIL_MS,
    CONTIGUOUS_BOUNDARY_GUARD_MS,
    PLAYBACK_RATE_MIN,
    PLAYBACK_RATE_MAX,
    PLAYBACK_RATE_STEP,
    DEFAULT_SLOW_REPLAY_SPEED,
    ISSUE_REPORT_CATEGORIES,
    displayPreferenceStorageKeys,
  } = bootConfig;
  const initialDisplayPreferences = displayPreferenceStorageApi.readInitialDisplayPreferences({
    storageState: storageStateApi,
    storage: window.localStorage,
    keys: displayPreferenceStorageKeys,
    normalizeDisplayPreferences: displayPreferencesApi.normalizeDisplayPreferences,
  });

  let panelGestureFallbackInstalled = false;
  let shadowLayerFocusInstalled = false;
  let shadowScrollGuardInstalled = false;
  let viewportLayoutFrame = 0;

  const state = bootStateApi.createInitialState({
    bootDiagnostics,
    contentScriptRevision: CONTENT_SCRIPT_REVISION,
    initialDisplayPreferences,
  });
  window.__afShadowingDebug = state;
  const diagnosticsStateController = diagnosticsStateApi.createDiagnosticsStateController({
    state,
    diagnosticsReport: diagnosticsReportApi,
    document,
  });
  const displayPreferenceController = displayPreferenceStorageApi.createDisplayPreferenceController({
    chrome,
    storage: window.localStorage,
    keys: displayPreferenceStorageKeys,
    state,
    normalizeDisplayPreferences: displayPreferencesApi.normalizeDisplayPreferences,
    sendMessage: sendExtensionMessage,
    recordDebugEvent,
    render,
    onDisabled: handleDisplayPreferencesDisabled,
    onEnabled: handleDisplayPreferencesEnabled,
  });
  const phraseProgressStore = phraseProgressStorageApi.createPhraseProgressStore({
    window,
    phraseProgress: phraseProgressApi,
    state,
    sendMessage: sendExtensionMessage,
    recordDebugEvent,
  });
  const sourceSelectionStore = sourceSelectionStorageApi.createSourceSelectionStore({
    storage: window.localStorage,
    storageState: storageStateApi,
    sourceSelection: sourceSelectionApi,
    captionTracks: captionTrackApi,
    storageKey: SOURCE_SELECTION_STORAGE_KEY,
    state,
    recordDebugEvent,
  });
  const sourceController = sourceContentFacadeApi.createSourceController({
    getState: () => state,
    sourceTranscriptContentWorkflow: sourceTranscriptContentWorkflowApi,
    sourceTranscriptWorkflow: sourceTranscriptWorkflowApi,
    sourceTimingContentWorkflow: sourceTimingContentWorkflowApi,
    sourceTimingWorkflow: sourceTimingWorkflowApi,
    sourceLoadContentWorkflow: sourceLoadContentWorkflowApi,
    sourceLoadWorkflow: sourceLoadWorkflowApi,
    transcriptRetrieval: transcriptRetrievalApi,
    transcriptMetadata: transcriptMetadataApi,
    sourceReadiness: sourceReadinessApi,
    sourceSelection: sourceSelectionApi,
    videoLoadState: videoLoadStateApi,
    playbackTiming: playbackTimingApi,
    captionTracks: captionTrackApi,
    phraseProgressStore,
    sourceSelectionStore,
    updateBootDiagnostics,
    recordDebugEvent,
    practiceReadiness,
    timingOperationState,
    apiBaseForBackendCommands,
    postBackendJson,
    getBackendJson,
    findPhraseIndexForTime: playbackTimingApi.findPhraseIndexForTime,
    getVideoElement,
    ensurePassivePlaybackWatcher,
    syncPassivePlayback,
    render,
    findPlaybackPhraseIndex,
    markCurrentTranscriptSegment,
    describePhraseAtIndex,
    getPlaybackSnapshot,
    recordNavigationEvent,
    maxPhraseDurationMs: MAX_PHRASE_DURATION_MS,
    longPauseMs: LONG_PAUSE_MS,
    maxWords: 18,
    maxCharacters: 140,
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (timer) => window.clearTimeout(timer),
  });
  const dictionaryController = dictionaryContentWorkflowApi.createDictionaryController({
    getState: () => state,
    dictionaryPanelWorkflow: dictionaryPanelWorkflowApi,
    dictionaryPresentation: dictionaryPresentationApi,
    dictionaryDom: dictionaryDomApi,
    dictionarySearchDom: dictionarySearchDomApi,
    dictionarySearchWorkflow: dictionarySearchWorkflowApi,
    dictionaryOverlayWorkflow: dictionaryOverlayWorkflowApi,
    dictionaryRenderWorkflow: dictionaryRenderWorkflowApi,
    dictionaryLookupWorkflow: dictionaryLookupWorkflowApi,
    captionTracks: captionTrackApi,
    selectedSpans: selectedSpanApi,
    selectedSpansDom: selectedSpanDomApi,
    selectedSpanWorkflow: selectedSpanWorkflowApi,
    generatedEntries: generatedEntryApi,
    accountSession: accountSessionApi,
    accountSessionDom: accountSessionDomApi,
    ribbonDom: ribbonDomApi,
    clearElement: domUtilsApi.clearElement,
    iconSvg,
    renderCardActionMenu,
    saveSelectedSpanCard,
    clearSelectedSpan,
    generateDictionaryDraft,
    performDisplayAction,
    toggleCardMenu,
    cardAudioPlayable,
    playHeadwordAudio,
    cardExpanded,
    toggleCardExpanded,
    handleAccountAction,
    render,
    createDictionarySourceBinding,
    getSelectedPracticeSource,
    dictionaryCommands: dictionaryCommandApi,
    dictionaryState: dictionaryStateApi,
    phraseTranslations: phraseTranslationApi,
    fetchDictionaryResult,
    fetchDictionarySearchResult,
    postDictionaryCommand,
    phraseProgressStore,
    isCurrentLookup,
    generatedDraftItemFromOverlayCard,
    recordDebugEvent,
  });
  const {
    playbackController,
    passivePlaybackController,
  } = playbackContentFacadeApi.createPlaybackControllers({
    getState: () => state,
    playbackContentWorkflow: playbackContentWorkflowApi,
    playbackWorkflow: playbackWorkflowApi,
    passivePlaybackContentWorkflow: passivePlaybackContentWorkflowApi,
    passivePlaybackWatcher: passivePlaybackWatcherApi,
    playbackSession: playbackSessionApi,
    playbackTiming: playbackTimingApi,
    playbackRateOptions,
    getVideoElement,
    stopPlaybackTimer,
    playbackEndMsForPhrase,
    findPlaybackPhraseIndex,
    syncPlaybackRateFromVideo,
    slowReplayPlaybackRate,
    markCurrentTranscriptSegment,
    recordNavigationEvent,
    describePhraseAtIndex,
    getPlaybackSnapshot,
    updateDisplayPreferences,
    isCurrentPhraseStillSelected,
    phraseProgressStore,
    applyPhraseEntryDisplayState,
    enterGuidedMode,
    resolveWordTiming,
    phraseDisplaySegmentRange,
    playbackTimingConfig,
    restorePlaybackRateAfterOverride,
    requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    cancelAnimationFrame: (frame) => window.cancelAnimationFrame(frame),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    roundTime,
    preRollMs: PRE_ROLL_MS,
    render,
  });
  const {
    ribbonPanelController,
    panelLayoutController,
    diagnosticsController,
    keyboardController,
    displayStateController,
    ribbonContentController,
  } = surfaceContentFacadeApi.createSurfaceControllers({
    getState: () => state,
    modules,
    iconSvg,
    bugIconSvg,
    issueReportWorkflow: issueReportWorkflowApi,
    extensionBuildInfo,
    playbackRateOptions,
    constants: {
      issueReportCategories: ISSUE_REPORT_CATEGORIES,
      playbackRateStep: PLAYBACK_RATE_STEP,
    },
    ids: {
      rootId: ROOT_ID,
      ribbonPanelId: RIBBON_PANEL_ID,
      dictionaryPanelId: DICTIONARY_PANEL_ID,
    },
    environment: {
      document,
      window,
      navigator,
      HTMLElement,
      Element,
      requestAnimationFrame,
    },
    getPanelGestureFallbackInstalled: () => panelGestureFallbackInstalled,
    setPanelGestureFallbackInstalled: (value) => {
      panelGestureFallbackInstalled = value;
    },
    getViewportLayoutFrame: () => viewportLayoutFrame,
    setViewportLayoutFrame: (value) => {
      viewportLayoutFrame = value;
    },
    commands: {
      render,
      account: {
        toggleAccountMenu,
        connectAccount: connectTwoThousandNlAccount,
        disconnectAccount: disconnectTwoThousandNlAccount,
      },
      diagnostics: {
        toggleDebug,
        copyDebug,
        clearDiagnostics,
        publishDiagnosticsSnapshot,
        copyTextWithFallback,
        recordDebugEvent,
      },
      dictionary: {
        applySpanSelectionDraftPreview,
        clearSpanSelectionDraft,
        selectLookupWord,
        handleWordReplayGesture,
      },
      display: {
        updateDisplayPreferences,
        cycleThemePreference,
        toggleSettingsMenu,
        toggleShortcutHelp,
        toggleUtilityMenu,
        adjustLearnerTextScale,
        resetLearnerTextScale,
        adjustPanelBackgroundAlpha,
        resetPanelBackgroundAlpha,
        closeOpenMenus,
      },
      issue: {
        openIssueReportDialog,
        submitPhraseBoundaryIssue,
        closeIssueReportDialog,
        submitIssueReport,
        copyCurrentIssueReport,
      },
      layout: {
        bringDebugPanelBehindFromPanel,
        toggleLayoutLock,
        resetPanelLayout,
        beginPanelDrag,
        beginPanelResize,
      },
      navigation: {
        togglePhraseJumpMenu,
        jumpToPhrase,
        submitPhraseJump,
      },
      playback: {
        getVideoElement,
        describePhraseAtIndex,
        roundTime,
        previousPhrase,
        replayCurrentPhrase,
        toggleText,
        nextPhrase,
        setPracticeMode,
        toggleAutoPause,
        adjustSlowReplaySpeed,
        adjustVideoPlaybackRate,
        toggleContinuousPlayback,
        playbackEndMsForPhrase,
      },
      source: {
        getSelectedPracticeSource,
        practiceReadiness,
        timingOperationState,
        userFacingSourceLabel,
        refreshSelectedSourceCache,
        startImproveTiming,
        selectPracticeSource,
        toggleSourceMenu,
      },
      translation: {
        phraseTranslationState,
        togglePhraseTranslation,
        requestSelectedSpanTranslation,
      },
    },
  });
  const workspaceController = workspaceContentWorkflowApi.createWorkspaceController({
    getState: () => state,
    workspaceWorkflow: workspaceWorkflowApi,
    document,
    window,
    HTMLElement,
    rootId: ROOT_ID,
    toggleId: TOGGLE_ID,
    ribbonPanelId: RIBBON_PANEL_ID,
    dictionaryPanelId: DICTIONARY_PANEL_ID,
    shadowContainerId: SHADOW_CONTAINER_ID,
    displayPreferences: displayPreferencesApi,
    scrollContainment: scrollContainmentApi,
    getShadowLayerFocusInstalled: () => shadowLayerFocusInstalled,
    setShadowLayerFocusInstalled: (value) => {
      shadowLayerFocusInstalled = value;
    },
    getShadowScrollGuardInstalled: () => shadowScrollGuardInstalled,
    setShadowScrollGuardInstalled: (value) => {
      shadowScrollGuardInstalled = value;
    },
    updateDisplayPreferences,
    stopPlaybackTimer,
    detachPassivePlaybackWatcher,
    handleCurrentLocation,
    applyThemeAttributes,
    handleShadowLayerFocus,
    installPanelGestureFallback,
    createRibbonPanel,
    createDebugPanel,
    workspaceDom: workspaceDomApi,
    iconSvg,
    fetch,
    chrome,
    recordDebugEvent,
    onBringDictionaryPanelBehind: bringDebugPanelBehindFromPanel,
    onToggleExamples: toggleAllExamples,
    render,
  });
  const videoInitController = videoInitContentWorkflowApi.createVideoInitController({
    getState: () => state,
    videoInitWorkflow: videoInitWorkflowApi,
    getVideoIdFromUrl: youtubeAdapterApi.getVideoIdFromUrl,
    updateBootDiagnostics,
    phraseProgressStore,
    videoLoadState: videoLoadStateApi,
    clearTimingOperationPoll,
    stopPlaybackTimer,
    detachPassivePlaybackWatcher,
    resetTranscriptPanelState,
    render,
    waitForPlayerResponse,
    captionTracks: captionTrackApi,
    sourceSelectionStore,
    loadPracticeSource,
    renderToggle,
    removeWorkspace,
    removeToggle: () => document.getElementById(TOGGLE_ID)?.remove(),
    ensureWorkspace,
  });
  const {
    commandClient,
    accountSessionWorkflow,
    issueReportWorkflow,
    refreshBackendBuildInfo: refreshBackendBuildInfoFromSupport,
  } = supportContentFacadeApi.createSupportControllers({
    getState: () => state,
    extensionCommandClient: extensionCommandClientApi,
    accountSessionWorkflow: accountSessionWorkflowApi,
    accountSession: accountSessionApi,
    issueReportWorkflow: issueReportWorkflowApi,
    issueReports: issueReportsApi,
    backendBuildWorkflow: backendBuildWorkflowApi,
    chrome,
    fetch,
    storage: window.localStorage,
    document,
    dictionaryCommands: dictionaryCommandApi,
    dictionaryMocks: dictionaryMockApi,
    backendCommands: backendCommandApi,
    dictionaryEndpoint,
    apiBaseForBackendCommands,
    selectLookupWord,
    formatIssueReport,
    extensionVersion,
    extensionBuildInfo,
    browserUserAgent: navigator.userAgent,
    recordDebugEvent,
    render,
    copyIssueReport,
    setTimeout: window.setTimeout.bind(window),
  });
  displayPreferenceController.initialize();
  displayPreferenceController.subscribe();
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

  function updateDisplayPreferences(updater) {
    return displayPreferenceController.update(updater);
  }

  function handleDisplayPreferencesDisabled() {
    stopPlaybackTimer();
    detachPassivePlaybackWatcher();
    state.guidedMode = false;
    removeWorkspace();
    renderToggle();
  }

  function handleDisplayPreferencesEnabled() {
    handleCurrentLocation();
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
    return workspaceController.ensureToggle();
  }

  function renderToggle() {
    return workspaceController.renderToggle();
  }

  function toggleLearningMode() {
    return workspaceController.toggleLearningMode();
  }

  function ensureWorkspace() {
    return workspaceController.ensureWorkspace();
  }

  function ensureAudioFilmsRoot() {
    return workspaceController.ensureAudioFilmsRoot();
  }

  function installShadowLayerFocus(root) {
    return workspaceController.installShadowLayerFocus(root);
  }

  function installShadowScrollGuard(root) {
    return workspaceController.installShadowScrollGuard(root);
  }

  function ensureShadowContainer(root) {
    return workspaceController.ensureShadowContainer(root);
  }

  function ensureShadowStyles(root) {
    return workspaceController.ensureShadowStyles(root);
  }

  function createRibbonPanel() {
    return ribbonPanelController.createRibbonPanel();
  }

  function createIssueReportDialog(panel) {
    return ribbonPanelController.createIssueReportDialog(panel);
  }

  function createDebugPanel() {
    return workspaceDomApi.createDebugPanel({
      onBringToFront: bringDebugPanelToFrontFromEvent,
      onCopy: copyDebug,
      onClose: closeDebug,
      onDrag: beginDebugPanelDrag,
      onResize: beginDebugPanelResize,
    });
  }

  function createAccountControl(parent) {
    return ribbonPanelController.createAccountControl(parent);
  }

  function mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel) {
    return workspaceController.mountWorkspace(container, dictionaryPanel, ribbonPanel, debugPanel);
  }

  function removeWorkspace() {
    return workspaceController.removeWorkspace();
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
    const debugState = diagnosticsReportApi.debugPanelState(state);
    diagnosticsDomApi.renderDebugPanel(debugPanel, debugState, {
      debugText: formatDebugState(),
    });
    applyDebugPanelGeometry(debugPanel);
    applyDebugPanelLayer(debugPanel);
  }

  function renderRibbon(panel) {
    return ribbonWorkflowApi.renderRibbon(panel, {
      getState: () => state,
      practiceReadiness,
      phraseTranslationState,
      getSelectedPracticeSource,
      ribbonControls: ribbonControlsApi,
      ribbonPanelDom: ribbonPanelDomApi,
      iconSvg,
      renderSourceSelector,
      renderAccountControl,
      renderDisplayToggleButton,
      renderDisplayPreferenceControls,
      renderPlaybackRateControls,
      renderIssueReportDialog,
      positionUtilityMenu,
      positionIssueReportDialog,
      clearElement: domUtilsApi.clearElement,
      appendRibbonMessage,
      appendPhraseRow,
    });
  }

  function setPracticeMode(mode) {
    return phraseTranslationWorkflowApi.setPracticeMode(state, mode, {
      phraseTranslations: phraseTranslationApi,
      ensureCurrentPhraseTranslation,
      render,
    });
  }

  function togglePhraseTranslation(event) {
    return phraseTranslationWorkflowApi.togglePhraseTranslation(state, event, {
      phraseTranslations: phraseTranslationApi,
      ensureCurrentPhraseTranslation,
      render,
    });
  }

  function renderDisplayToggleButton(button, options) {
    ribbonDomApi.renderDisplayToggleButton(button, {
      html: ribbonControlsApi.displayToggleButtonHtml(options),
    });
  }

  function renderDisplayPreferenceControls(controls) {
    const controlState = displayPreferencesApi.displayPreferenceControlState({
      preferences: state.displayPreferences,
      autoPause: state.autoPause,
      hasCustomPanelLayout: hasCustomPanelLayout(),
    });
    ribbonDomApi.renderDisplayPreferenceControls(controls, controlState, {
      formatPlaybackRate,
    });
  }

  function renderPlaybackRateControls(controls) {
    const rate = syncPlaybackRateFromVideo();
    const controlState = ribbonControlsApi.playbackRateControlState({
      rate,
      min: PLAYBACK_RATE_MIN,
      max: PLAYBACK_RATE_MAX,
      fallback: 1,
    });
    ribbonDomApi.renderPlaybackRateControls(controls, controlState);
  }

  function positionUtilityMenu(panel, utilityMenu, isOpen = state.utilityMenuOpen) {
    ribbonDomApi.positionUtilityMenu(panel, utilityMenu, isOpen, window.requestAnimationFrame);
  }

  function positionIssueReportDialog(panel, issueDialog) {
    ribbonDomApi.positionIssueReportDialog(panel, issueDialog, state.issueDialogOpen, window.requestAnimationFrame);
  }

  function hasCustomPanelLayout() {
    return panelLayoutController.hasCustomPanelLayout();
  }

  function toggleLayoutLock(event) {
    return panelLayoutController.toggleLayoutLock(event);
  }

  function resetPanelLayout(event) {
    return panelLayoutController.resetPanelLayout(event);
  }

  function applyPanelLayout(ribbonPanel, dictionaryPanel) {
    return panelLayoutController.applyPanelLayout(ribbonPanel, dictionaryPanel);
  }

  function scheduleViewportLayoutClamp() {
    return panelLayoutController.scheduleViewportLayoutClamp();
  }

  function applyPanelGeometry(panel, panelKey, overrideGeometry = null) {
    return panelLayoutController.applyPanelGeometry(panel, panelKey, overrideGeometry);
  }

  function applyDebugPanelGeometry(panel, overrideGeometry = null) {
    return panelLayoutController.applyDebugPanelGeometry(panel, overrideGeometry);
  }

  function applyDebugPanelLayer(panel = debugPanelElement()) {
    return panelLayoutController.applyDebugPanelLayer(panel);
  }

  function bringDebugPanelToFrontFromEvent(event) {
    return panelLayoutController.bringDebugPanelToFrontFromEvent(event);
  }

  function handleShadowLayerFocus(event) {
    return panelLayoutController.handleShadowLayerFocus(event);
  }

  function bringDebugPanelBehindFromPanel(event) {
    return panelLayoutController.bringDebugPanelBehindFromPanel(event);
  }

  function bringDebugPanelToFront() {
    return panelLayoutController.bringDebugPanelToFront();
  }

  function bringDebugPanelBehind() {
    return panelLayoutController.bringDebugPanelBehind();
  }

  function beginDebugPanelDrag(event) {
    return panelLayoutController.beginDebugPanelDrag(event);
  }

  function beginDebugPanelResize(event) {
    return panelLayoutController.beginDebugPanelResize(event);
  }

  function installPanelGestureFallback() {
    return panelLayoutController.installPanelGestureFallback();
  }

  function beginPanelGestureFromHost(event) {
    return panelLayoutController.beginPanelGestureFromHost(event);
  }

  function resolvePanelGestureAt(x, y) {
    return panelLayoutController.resolvePanelGestureAt(x, y);
  }

  function beginPanelDrag(event, forcedPanelKey = "", options = {}) {
    return panelLayoutController.beginPanelDrag(event, forcedPanelKey, options);
  }

  function isInteractiveDragTarget(target) {
    return panelLayoutController.isInteractiveDragTarget(target);
  }

  function beginPanelResize(event, forcedPanelKey = "") {
    return panelLayoutController.beginPanelResize(event, forcedPanelKey);
  }

  function clampPanelGeometry(panelKey, geometry) {
    return panelLayoutController.clampPanelGeometry(panelKey, geometry);
  }

  function clampDebugPanelGeometry(geometry) {
    return panelLayoutController.clampDebugPanelGeometry(geometry);
  }

  function viewportBounds() {
    return panelLayoutController.viewportBounds();
  }

  function savePanelGeometry(panelKey, geometry) {
    return panelLayoutController.savePanelGeometry(panelKey, geometry);
  }

  function saveDebugPanelGeometry(geometry) {
    return panelLayoutController.saveDebugPanelGeometry(geometry);
  }

  function bringPanelToFront(panelKey, persist = true) {
    return panelLayoutController.bringPanelToFront(panelKey, persist);
  }

  function panelElement(panelKey) {
    return panelLayoutController.panelElement(panelKey);
  }

  function debugPanelElement() {
    return panelLayoutController.debugPanelElement();
  }

  function toggleUtilityMenu(event) {
    return displayStateController.toggleUtilityMenu(event);
  }

  function toggleSettingsMenu(event) {
    return displayStateController.toggleSettingsMenu(event);
  }

  function toggleShortcutHelp(event) {
    return displayStateController.toggleShortcutHelp(event);
  }

  function toggleAccountMenu(event) {
    return displayStateController.toggleAccountMenu(event);
  }

  function cycleThemePreference(event) {
    return displayStateController.cycleThemePreference(event);
  }

  function adjustLearnerTextScale(delta) {
    return displayStateController.adjustLearnerTextScale(delta);
  }

  function resetLearnerTextScale() {
    return displayStateController.resetLearnerTextScale();
  }

  function adjustPanelBackgroundAlpha(delta) {
    return displayStateController.adjustPanelBackgroundAlpha(delta);
  }

  function resetPanelBackgroundAlpha() {
    return displayStateController.resetPanelBackgroundAlpha();
  }

  function adjustSlowReplaySpeed(delta) {
    return displayStateController.adjustSlowReplaySpeed(delta);
  }

  function adjustVideoPlaybackRate(delta) {
    return displayStateController.adjustVideoPlaybackRate(delta);
  }

  function setVideoPlaybackRate(rate, reason = "playback-rate") {
    return displayStateController.setVideoPlaybackRate(rate, reason);
  }

  function syncPlaybackRateFromVideo(video = getVideoElement()) {
    return playbackSessionApi.syncPlaybackRateFromVideo(state, video, playbackRateOptions());
  }

  function slowReplayPlaybackRate() {
    return playbackSessionApi.slowReplayPlaybackRate(state, playbackRateOptions());
  }

  function formatPlaybackRate(value) {
    return playbackSessionApi.formatPlaybackRate(value, playbackRateOptions());
  }

  function playbackRateOptions() {
    return {
      clampNumber: formatUtilsApi.clampNumber,
      formatPlaybackRate: formatUtilsApi.formatPlaybackRate,
      min: PLAYBACK_RATE_MIN,
      max: PLAYBACK_RATE_MAX,
      fallback: 1,
      slowReplayFallback: DEFAULT_SLOW_REPLAY_SPEED,
    };
  }

  function applyThemeAttributes() {
    return displayStateController.applyThemeAttributes();
  }

  function toggleAllExamples(event) {
    return displayStateController.toggleAllExamples(event);
  }

  function toggleCardExamples(cardId) {
    toggleCardExpanded(cardId);
  }

  function toggleCardExpanded(cardId) {
    return displayStateController.toggleCardExpanded(cardId);
  }

  function exampleSectionExpanded(cardId) {
    return cardExpanded(cardId);
  }

  function cardExpanded(cardId) {
    return displayStateController.cardExpanded(cardId);
  }

  function toggleCardTranslation(card) {
    return dictionaryController.toggleCardTranslation(card);
  }

  function setCardTranslationPending(cardId, pending) {
    return dictionaryController.setCardTranslationPending(cardId, pending);
  }

  function closeOpenMenus() {
    return displayStateController.closeOpenMenus();
  }

  function focusMenuTrigger(trigger) {
    return displayStateController.focusMenuTrigger(trigger);
  }

  function onDocumentPointerDown(event) {
    return displayStateController.onDocumentPointerDown(event);
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

  function toggleDebug() {
    return diagnosticsController.toggleDebug();
  }

  function togglePhraseJumpMenu(event) {
    return phraseJumpWorkflowApi.togglePhraseJumpMenu(state, event, phraseJumpWorkflowOptions());
  }

  function submitPhraseJump() {
    return phraseJumpWorkflowApi.submitPhraseJump(state, phraseJumpWorkflowOptions());
  }

  function jumpToPhrase(targetIndex, reason) {
    return playbackController.jumpToPhrase(targetIndex, reason);
  }

  function phraseJumpWorkflowOptions() {
    return {
      document,
      rootId: ROOT_ID,
      menuState: menuStateApi,
      requestAnimationFrame,
      jumpToPhrase,
      render,
    };
  }

  function closeDebug() {
    return diagnosticsController.closeDebug();
  }

  async function copyDebug() {
    return diagnosticsController.copyDebug();
  }

  function clearDiagnostics() {
    return diagnosticsController.clearDiagnostics();
  }

  async function refreshSelectedSourceCache() {
    return sourceController.refreshSelectedSourceCache();
  }

  async function startImproveTiming(textSourceOverride = "") {
    return sourceController.startImproveTiming(textSourceOverride);
  }

  function applyTimingOperation(operation) {
    return sourceController.applyTimingOperation(operation);
  }

  function applyTimingOperationResultToActiveSource(operation) {
    return sourceController.applyTimingOperationResultToActiveSource(operation);
  }

  function scheduleTimingOperationPoll(operation) {
    return sourceController.scheduleTimingOperationPoll(operation);
  }

  async function pollTimingOperation(operationId) {
    return sourceController.pollTimingOperation(operationId);
  }

  function clearTimingOperationPoll() {
    return sourceController.clearTimingOperationPoll();
  }

  function openIssueReportDialog(options = {}) {
    issueReportWorkflow.open(options);
  }

  function closeIssueReportDialog() {
    issueReportWorkflow.close();
  }

  function copyCurrentIssueReport() {
    issueReportWorkflow.copyCurrent();
  }

  function copyIssueReport(report) {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(report))
      .catch(() => {
      copyTextWithFallback(report);
    });
  }

  async function submitIssueReport() {
    await issueReportWorkflow.submit();
  }

  async function submitPhraseBoundaryIssue() {
    await issueReportWorkflow.submitPhraseBoundary();
  }

  function extensionVersion() {
    return issueReportsApi.extensionVersion(chrome?.runtime);
  }

  function extensionBuildInfo() {
    const info = typeof buildInfoApi?.buildInfo === "function"
      ? buildInfoApi.buildInfo()
      : {};
    return issueReportsApi.extensionBuildInfo({
      manifestVersion: extensionVersion(),
      contentScriptRevision: CONTENT_SCRIPT_REVISION,
      buildInfo: info,
      apiBase: apiBaseForBackendCommands(),
    });
  }

  async function refreshBackendBuildInfo() {
    return refreshBackendBuildInfoFromSupport();
  }

  function renderIssueReportDialog(dialog) {
    const dialogState = issueReportsApi.issueReportDialogState(state);
    issueReportsDomApi.renderIssueReportDialog(dialog, dialogState);
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
    return diagnosticsController.formatDebugState();
  }

  function recordDebugEvent(type, detail) {
    diagnosticsStateController.recordDebugEvent(type, detail);
  }

  function recordNavigationEvent(type, detail = {}) {
    return diagnosticsStateController.recordNavigationEvent(type, detail);
  }

  function publishDiagnosticsSnapshot() {
    diagnosticsStateController.publishSnapshot();
  }

  function formatIssueReport(options = {}) {
    return diagnosticsController.formatIssueReport(options);
  }

  function practiceReadiness() {
    const result = getSelectedPracticeSource()?.loadedTranscriptResult || state.transcriptResult;
    return sourceReadinessApi.practiceReadiness({
      timingState: timingOperationState(),
      loading: state.loading,
      cacheRefreshRequested: state.cacheRefreshRequested,
      phraseCount: state.phrases.length,
      result,
    });
  }

  function timingOperationState(readiness = null) {
    return sourceReadinessApi.timingOperationState({
      operation: state.timingOperation,
      readiness,
      timingOperationError: state.timingOperationError,
    });
  }

  function userFacingSourceLabel(source) {
    const result = source?.loadedTranscriptResult || state.transcriptResult;
    return sourceLabelsApi.userFacingSourceLabel({
      source,
      result,
      hasTracks: state.tracks.length > 0,
    });
  }

  function getPlaybackSnapshot() {
    return diagnosticsController.getPlaybackSnapshot();
  }

  function describePhraseAtIndex(index) {
    return diagnosticsReportApi.describePhraseAtIndex(state.phrases, index);
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function renderSourceSelector(track, sourceToggle, sourceMenu) {
    return ribbonContentController.renderSourceSelector(track, sourceToggle, sourceMenu);
  }

  function toggleSourceMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    menuStateApi.toggleExclusiveMenu(state, "source");
    render();
  }

  function appendRibbonMessage(parent, text) {
    const message = appendElement(parent, "div", "af-ribbon-message");
    message.textContent = text;
  }

  function appendPhraseRow(parent, phrase, index) {
    return ribbonContentController.appendPhraseRow(parent, phrase, index);
  }

  function phraseTranslationState(phrase, index = state.currentIndex) {
    const key = phraseTranslationKey(phrase, index);
    return key ? state.phraseTranslations[key] || null : null;
  }

  function phraseTranslationKey(phrase, index = state.currentIndex) {
    return phraseTranslationApi.phraseTranslationKey({
      phrase,
      index,
      videoId: state.videoId,
      sourceId: state.selectedSourceId,
    });
  }

  function phraseTranslationId(phrase, index = state.currentIndex) {
    return phraseTranslationApi.phraseTranslationId({
      phrase,
      index,
      videoId: state.videoId,
      sourceId: state.selectedSourceId,
    });
  }

  function ensureCurrentPhraseTranslation() {
    phraseTranslationWorkflowApi.ensureCurrentPhraseTranslation(state, {
      phraseTranslationKey,
      requestPhraseTranslation,
    });
  }

  async function requestPhraseTranslation(phrase, index, key) {
    return phraseTranslationWorkflowApi.requestPhraseTranslation(state, {
      phrase,
      index,
      key,
      options: phraseTranslationWorkflowOptions(),
    });
  }

  async function requestSelectedSpanTranslation(span) {
    return phraseTranslationWorkflowApi.requestSelectedSpanTranslation(state, span, phraseTranslationWorkflowOptions());
  }

  function phraseTranslationWorkflowOptions() {
    return {
      phraseTranslations: phraseTranslationApi,
      getSelectedPracticeSource,
      postDictionaryCommand,
      phraseTranslationId,
      recordDebugEvent,
      render,
    };
  }

  function phraseDisplaySegmentRange(phrase) {
    return phraseTranslationApi.phraseDisplaySegmentRange(phrase);
  }

  function isTokenInSelectedSpan(phraseIndex, tokenIndex) {
    return phraseRowsApi.tokenInSpan(state.selectedSpan, phraseIndex, tokenIndex);
  }

  function isTokenInSpanDraft(phraseIndex, tokenIndex) {
    return phraseRowsApi.tokenInSpanDraft(state.spanSelectionDraft, phraseIndex, tokenIndex);
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
    selectedSpanWorkflowApi.cancelSpanDraft(state, {
      applyPreview: applySpanSelectionDraftPreview,
    });
  }

  function clearSelectedSpan() {
    state.selectedSpan = null;
    render();
  }

  async function saveSelectedSpanCard(span) {
    return selectedSpanWorkflowApi.saveSelectedSpanCard(span, {
      accountStatus: state.accountStatus,
      getSelectedSpan: () => state.selectedSpan,
      setSelectedSpan: (nextSpan) => {
        state.selectedSpan = nextSpan;
      },
      buildPayload: selectedSpanGeneratedEntryPayload,
      postDictionaryCommand,
      createMutationTurnId,
      sourceContext: selectedSpanSourceContext,
      render,
    });
  }

  function selectedSpanGeneratedEntryPayload(span, draft = null, action = "generated-entry-draft") {
    const phrase = state.phrases[span.phraseIndex] || state.phrases[state.currentIndex];
    const source = getSelectedPracticeSource();
    return selectedSpanApi.selectedSpanGeneratedEntryPayload({
      span,
      phrase,
      sourceLanguageCode: phraseTranslationApi.sourceLanguageCode({
        source,
        transcriptResult: state.transcriptResult,
      }),
      sourceContext: selectedSpanSourceContext(span, "", action),
      draftPayload: generatedEntryApi.generatedDraftPayload(draft),
    });
  }

  function selectedSpanSourceContext(span, entryId = "", action = "generated-entry-draft") {
    return selectedSpanWorkflowApi.selectedSpanSourceContext(span, {
      entryId,
      action,
      state,
      selectedSpans: selectedSpanApi,
      getSelectedPracticeSource,
      getVideoElement,
      youtubeVideoTitle,
      extensionVersion,
    });
  }

  function selectedSpanSourceBinding(span) {
    return selectedSpanWorkflowApi.selectedSpanSourceBinding(span, {
      state,
      selectedSpans: selectedSpanApi,
      getSelectedPracticeSource,
    });
  }

  function selectPhraseSpan(draft) {
    const phrase = state.phrases[draft.phraseIndex];
    const span = selectedSpanApi.selectedSpanFromDraft(draft, phrase);
    return selectedSpanWorkflowApi.completeSpanDraft(state, draft, span, {
      render,
      requestSelectedSpanTranslation,
    });
  }

  function handleWordReplayGesture(event, word, phraseIndex, selection) {
    return playbackController.handleWordReplayGesture(event, word, phraseIndex, selection);
  }

  function renderDictionary(panel) {
    return dictionaryController.renderDictionary(panel);
  }

  function renderAccountControl(account, accountMenu, accountCopy, accountAction) {
    return dictionaryController.renderAccountControl(account, accountMenu, accountCopy, accountAction);
  }

  function dictionaryHeaderCopy() {
    return dictionaryController.dictionaryHeaderCopy();
  }

  function renderAccountCard(parent) {
    return dictionaryController.renderAccountCard(parent);
  }

  function renderSelectedWordCard(parent) {
    return dictionaryController.renderSelectedWordCard(parent);
  }

  function renderSelectedSpanCard(parent) {
    return dictionaryController.renderSelectedSpanCard(parent);
  }

  function renderSelectedSpanTitle(parent, span) {
    return dictionaryController.renderSelectedSpanTitle(parent, span);
  }

  function renderSelectedSpanLookupPrompt(parent) {
    return dictionaryController.renderSelectedSpanLookupPrompt(parent);
  }

  function renderGeneratedFallback(parent, selectedWord) {
    return dictionaryController.renderGeneratedFallback(parent, selectedWord);
  }

  function renderOverlayCard(parent, card, options = {}) {
    return dictionaryController.renderOverlayCard(parent, card, options);
  }

  function renderOverlayCardTitle(parent, card) {
    return dictionaryController.renderOverlayCardTitle(parent, card);
  }

  function cardAudioPlayable(card) {
    return dictionaryAudioApi.cardAudioPlayable(card);
  }

  async function playHeadwordAudio(card) {
    return dictionaryAudioWorkflowApi.playHeadwordAudio(card, dictionaryAudioWorkflowOptions());
  }

  async function resolveHeadwordAudioUrl(card) {
    return dictionaryAudioWorkflowApi.resolveHeadwordAudioUrl(card, dictionaryAudioWorkflowOptions());
  }

  function dictionaryAudioWorkflowOptions() {
    return {
      AudioConstructor: typeof Audio === "undefined" ? null : Audio,
      titleForCard: (card) => dictionaryPresentationApi.overlayTitle(card, state.selectedWord?.word),
      postDictionaryCommand,
      setPending: setCardAudioPending,
      recordDebugEvent,
    };
  }

  function setCardAudioPending(cardId, pending) {
    if (!cardId) return;
    state.audioPendingByCardId = dictionaryAudioApi.audioPendingState(state.audioPendingByCardId, cardId, pending);
    render();
  }

  function renderOverlaySections(parent, sections, card, translation = null) {
    return dictionaryController.renderOverlaySections(parent, sections, card, translation);
  }

  function toggleCardMenu(cardId) {
    state.cardMenuOpenId = state.cardMenuOpenId === cardId ? "" : cardId;
    render();
  }

  function renderCardActionMenu(parent, card) {
    return dictionaryOverlayWorkflowApi.renderCardActionMenu(parent, card, {
      state,
      dictionaryDom: dictionaryDomApi,
      issueReports: issueReportsApi,
      describePhraseAtIndex,
      openIssueReportDialog,
      recordDebugEvent,
      render,
    });
  }

  function visibleCardTranslation(card) {
    return dictionaryPresentationApi.visibleCardTranslation({
      card,
      visibleTranslationsByCardId: state.visibleTranslationsByCardId,
      selectedWord: state.selectedWord,
    });
  }

  function cardTranslationsVisible(card) {
    return dictionaryPresentationApi.cardTranslationsVisible({
      card,
      visibleTranslationsByCardId: state.visibleTranslationsByCardId,
    });
  }

  function cardHasLookupTranslations(card) {
    return dictionaryPresentationApi.cardHasLookupTranslations(card);
  }

  function cardCanRequestTranslation(card) {
    return dictionaryPresentationApi.cardCanRequestTranslation(card, generatedDraftItemFromOverlayCard(card));
  }

  function lookupOrOverlayHeadword(card, translation, options = {}) {
    return dictionaryPresentationApi.lookupOrOverlayHeadword(card, translation, {
      ...options,
      translationVisible: cardTranslationsVisible(card),
    });
  }

  function lookupOrOverlayDefinition(card, translation, meaningIndex = 0, options = {}) {
    return dictionaryPresentationApi.lookupOrOverlayDefinition(card, translation, meaningIndex, {
      ...options,
      translationVisible: cardTranslationsVisible(card),
    });
  }

  function lookupOrOverlaySection(card, section, allSections, translation, options = {}) {
    return dictionaryPresentationApi.lookupOrOverlaySection(card, section, allSections, translation, {
      ...options,
      translationVisible: cardTranslationsVisible(card),
    });
  }

  function renderReviewActions(parent, card = null) {
    return dictionaryController.renderReviewActions(parent, card);
  }

  function renderConnectPrompt(parent) {
    return dictionaryController.renderConnectPrompt(parent);
  }

  function handleAccountAction() {
    if (state.accountStatus === "signed-in") {
      disconnectTwoThousandNlAccount();
    } else {
      connectTwoThousandNlAccount();
    }
  }

  function performDisplayAction(card, displayAction) {
    return dictionaryOverlayWorkflowApi.performDisplayAction(card, displayAction, {
      getSelectedWord: () => state.selectedWord,
      toggleCardTranslation,
      performDictionaryCardAction,
      saveGeneratedDictionaryDraft,
    });
  }

  function selectLookupWord(word, phraseIndex, selection = {}, options = {}) {
    return dictionaryController.selectLookupWord(word, phraseIndex, selection, options);
  }

  async function lookupSelectedWord(selectedWord) {
    return dictionaryController.lookupSelectedWord(selectedWord);
  }

  async function loadGroupedDictionarySearch(selectedWord, contextText, options = {}) {
    return dictionaryController.loadGroupedDictionarySearch(selectedWord, contextText, options);
  }

  function toggleDictionarySearchItem(selectedWord, group, item, itemKey) {
    return dictionaryController.toggleDictionarySearchItem(selectedWord, group, item, itemKey);
  }

  async function loadDictionarySearchItemCard(selectedWord, item, itemKey) {
    return dictionaryController.loadDictionarySearchItemCard(selectedWord, item, itemKey);
  }

  async function performDictionaryCardAction(card, displayAction, actionPayload) {
    return dictionaryActionWorkflowApi.performDictionaryCardAction(card, displayAction, actionPayload, {
      getSelectedWord: () => state.selectedWord,
      setSelectedWord: (selectedWord) => {
        state.selectedWord = selectedWord;
      },
      setCardFeedback: (cardId, feedback) => {
        state.cardActionFeedbackByCardId = {
          ...state.cardActionFeedbackByCardId,
          [cardId]: feedback,
        };
      },
      buildPayload: frozenDictionaryActionPayload,
      postDictionaryCommand,
      isCurrentLookup,
      reloadLookup: lookupSelectedWord,
      render,
    });
  }

  async function generateDictionaryDraft(selectedWord) {
    return generatedEntryWorkflowApi.generateDictionaryDraft(selectedWord, generatedEntryWorkflowOptions());
  }

  async function saveGeneratedDictionaryDraft(selectedWord, card = null) {
    return generatedEntryWorkflowApi.saveGeneratedDictionaryDraft(selectedWord, card, generatedEntryWorkflowOptions());
  }

  function generatedEntryWorkflowOptions() {
    return {
      getSelectedWord: () => state.selectedWord,
      setSelectedWord: (selectedWord) => {
        state.selectedWord = selectedWord;
      },
      buildPayload: generatedEntryBasePayload,
      postDictionaryCommand,
      createMutationTurnId,
      sourceContext: generatedEntrySourceContext,
      isCurrentLookup,
      reloadLookup: lookupSelectedWord,
      render,
    };
  }

  function generatedEntryBasePayload(selectedWord, draft = null, card = null) {
    return generatedEntryApi.generatedEntryPayloadFromSelection({
      selectedWord,
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      source: getSelectedPracticeSource(),
      sourceContext: generatedEntrySourceContext(selectedWord),
      draft,
      card,
    });
  }

  function generatedEntrySourceContext(selectedWord, entryId = "") {
    return generatedEntryApi.generatedEntrySourceContext({
      selectedWord,
      entryId,
      buildSourceContext: buildDictionaryActionSourceContext,
    });
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

  function isUuid(value) {
    return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async function requestDictionaryCardTranslation(card) {
    return dictionaryController.requestDictionaryCardTranslation(card);
  }

  function generatedDraftItemFromOverlayCard(card) {
    return generatedEntryApi.generatedDraftItemFromOverlayCard(card);
  }

  function isCurrentLookup(selectedWord) {
    return state.selectedWord?.lookupSeq === selectedWord.lookupSeq &&
      state.selectedWord?.word === selectedWord.word;
  }

  function dictionaryTransportOptions() {
    return {
      requestDictionaryCommand,
      endpoint: dictionaryCommandTransportApi.dictionaryLookupEndpoint(window.__afShadowingConfig),
    };
  }

  async function fetchDictionaryResult(request) {
    return dictionaryCommandTransportApi.fetchDictionaryResult(request, dictionaryTransportOptions());
  }

  async function fetchDictionarySearchResult(request) {
    return dictionaryCommandTransportApi.fetchDictionarySearchResult(request, dictionaryTransportOptions());
  }

  async function postDictionaryCommand(operation, payload) {
    return dictionaryCommandTransportApi.postDictionaryCommand(operation, payload, dictionaryTransportOptions());
  }

  async function syncTwoThousandNlAccount() {
    await accountSessionWorkflow.sync();
  }

  async function connectTwoThousandNlAccount() {
    await accountSessionWorkflow.connect();
  }

  async function disconnectTwoThousandNlAccount() {
    await accountSessionWorkflow.disconnect();
  }

  async function getFreshTwoThousandNlSession() {
    return accountSessionWorkflow.getFreshSession();
  }

  function setTwoThousandNlSessionState(session, error) {
    accountSessionWorkflow.setSessionState(session, error);
  }

  function createMutationTurnId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `af-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function fetchDictionarySession() {
    return commandClient.fetchDictionarySession();
  }

  function sendRuntimeMessage(message) {
    return commandClient.sendRuntimeMessage(message);
  }

  function requestDictionaryCommand(operation, body = null) {
    return commandClient.requestDictionaryCommand(operation, body);
  }

  async function postBackendJson(operation, body = {}) {
    return commandClient.postBackendJson(operation, body);
  }

  async function getBackendJson(operation, body = {}) {
    return commandClient.getBackendJson(operation, body);
  }

  function requestBackendCommand(operation, body = {}) {
    return commandClient.requestBackendCommand(operation, body);
  }

  function apiBaseForBackendCommands() {
    if (window.__afShadowingConfig?.apiBase) {
      return window.__afShadowingConfig.apiBase();
    }
    return "https://audiofilms-api.dilum.io";
  }

  function dictionaryEndpoint() {
    if (window.__afShadowingConfig?.dictionaryEndpoint) {
      return window.__afShadowingConfig.dictionaryEndpoint();
    }
    return new URL("/api/dict", `${apiBaseForBackendCommands()}/`).toString();
  }

  async function initializeForCurrentVideo() {
    return videoInitController.initializeForCurrentVideo();
  }

  async function waitForPlayerResponse() {
    return playerMetadataWorkflowApi.waitForPlayerResponse({
      extractPlayerResponse,
      fetchFreshPlayerResponse,
      getVideoId: () => youtubeAdapterApi.getVideoIdFromUrl(),
      recordDebugEvent,
      delay,
    });
  }

  function extractPlayerResponse() {
    return youtubeAdapterApi.extractPlayerResponseFromDocument(document, youtubeAdapterApi.getVideoIdFromUrl());
  }

  async function fetchFreshPlayerResponse() {
    return playerMetadataWorkflowApi.fetchFreshPlayerResponse({
      videoId: youtubeAdapterApi.getVideoIdFromUrl(),
      youtubeAdapter: {
        extractPlayerResponseFromText: youtubeAdapterApi.extractPlayerResponseFromText,
        getCaptionTracks: captionTrackApi.getCaptionTracks,
      },
      fetch,
      recordDebugEvent,
    });
  }

  function resetTranscriptPanelState(previousVideoId) {
    transcriptPanelDomApi.resetTranscriptPanelState({
      document,
      previousVideoId,
      currentVideoId: state.videoId,
      closeOpenTranscriptPanels,
    });
  }

  function closeOpenTranscriptPanels() {
    return transcriptPanelDomApi.closeOpenTranscriptPanels({
      document,
      domUtils: domUtilsApi,
    });
  }

  function getSelectedPracticeSource() {
    return sourceController.getSelectedPracticeSource();
  }

  async function selectPracticeSource(sourceId) {
    return sourceController.selectPracticeSource(sourceId);
  }

  async function loadPracticeSource(source, options) {
    return sourceController.loadPracticeSource(source, options);
  }

  function phrasesFromTranscriptResult(transcriptResult) {
    return sourceController.phrasesFromTranscriptResult(transcriptResult);
  }

  async function maybeSwitchToPreferredSource(options = {}) {
    return sourceController.maybeSwitchToPreferredSource(options);
  }

  function holdInitialAutoPauseAfterSourceLoad() {
    return sourceController.holdInitialAutoPauseAfterSourceLoad();
  }

  function transcriptResultFromLoadedSource(source) {
    return sourceController.transcriptResultFromLoadedSource(source);
  }

  async function fetchReusableTimingTranscriptResult(source, resultOverride = null) {
    return sourceController.fetchReusableTimingTranscriptResult(source, resultOverride);
  }

  function registerTimingOperationResultSources(operation, options = {}) {
    return sourceController.registerTimingOperationResultSources(operation, options);
  }

  function findPlaybackPhraseIndex(phrases, currentMs) {
    return playbackTimingApi.findPlaybackPhraseIndex(phrases, currentMs, playbackTimingConfig());
  }

  async function fetchBestAvailableCues(track, options = {}) {
    return sourceController.fetchBestAvailableCues(track, options);
  }

  function normalizeTranscriptResult(result, track) {
    return sourceController.normalizeTranscriptResult(result, track);
  }

  function getVideoElement() {
    const video = youtubeAdapterApi.getVideoElement(document);
    updateBootDiagnostics({ videoElementDetected: Boolean(video) });
    return video;
  }

  function replayCurrentPhrase(options = {}) {
    return playbackController.replayCurrentPhrase(options);
  }

  function pauseCurrentPlayback(command = "pause") {
    return playbackController.pauseCurrentPlayback(command);
  }

  function nextPhrase() {
    return playbackController.nextPhrase();
  }

  function previousPhrase() {
    return playbackController.previousPhrase();
  }

  function navigateToPhrase(command, targetIndex, options = {}) {
    return playbackController.navigateToPhrase(command, targetIndex, options);
  }

  function holdPhraseAtStart(index, options = {}) {
    return playbackController.holdPhraseAtStart(index, options);
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
    return playbackController.toggleAutoPause();
  }

  function enterGuidedMode() {
    state.guidedMode = true;
  }

  function showText() {
    state.textVisible = true;
    render();
  }

  function applyPhraseEntryDisplayState() {
    return phraseTranslationWorkflowApi.applyPhraseEntryDisplayState(state, {
      phraseTranslations: phraseTranslationApi,
      ensureCurrentPhraseTranslation,
    });
  }

  function syncIndexToCurrentTime(options = {}) {
    return playbackController.syncIndexToCurrentTime(options);
  }

  function isCurrentPhraseStillSelected(currentMs) {
    return playbackSessionApi.isCurrentPhraseStillSelected({
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      currentMs,
      replayGraceMs: POST_ROLL_MS + 900,
    });
  }

  function playbackEndMsForPhrase(phrases, index) {
    return playbackTimingApi.playbackEndMsForPhrase(phrases, index, playbackTimingConfig());
  }

  function playWordReplay(index, selection, options = {}) {
    return playbackController.playWordReplay(index, selection, options);
  }

  function resolveWordTiming(phrase, selection = {}) {
    return playbackTimingApi.resolveWordTiming({
      phrase,
      phrases: state.phrases,
      selection,
      transcriptTimingExactness: state.transcriptResult?.timingExactness || "",
    });
  }

  function estimateWordStartMs(phrase, selection = {}) {
    return playbackTimingApi.estimateWordStartMs({
      phrase,
      selection,
      displaySegmentRange: phraseDisplaySegmentRange(phrase),
    });
  }

  function playPhrase(index, options = {}) {
    return playbackController.playPhrase(index, options);
  }

  function phrasePlaybackStartMs(phrase) {
    return playbackTimingApi.phrasePlaybackStartMs(phrase);
  }

  function playbackTimingConfig() {
    return {
      preRollMs: PRE_ROLL_MS,
      postRollMs: POST_ROLL_MS,
      minAudibleEndTailMs: MIN_AUDIBLE_END_TAIL_MS,
      contiguousBoundaryGuardMs: CONTIGUOUS_BOUNDARY_GUARD_MS,
    };
  }

  function scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs) {
    return playbackController.scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs);
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
    playbackSessionApi.restorePlaybackRateAfterOverride(state, video, playbackRateOptions());
  }

  function ensurePassivePlaybackWatcher() {
    return passivePlaybackController.ensurePassivePlaybackWatcher();
  }

  function detachPassivePlaybackWatcher() {
    return passivePlaybackController.detachPassivePlaybackWatcher();
  }

  function onPassiveVideoTimeUpdate(event) {
    return passivePlaybackController.onPassiveVideoTimeUpdate(event);
  }

  function onPassiveVideoPlay(event) {
    return passivePlaybackController.onPassiveVideoPlay(event);
  }

  function onPassiveVideoPause() {
    return passivePlaybackController.onPassiveVideoPause();
  }

  function onPassiveVideoRateChange(event) {
    return passivePlaybackController.onPassiveVideoRateChange(event);
  }

  function startPassivePlaybackFrame(video) {
    return playbackController.startPassivePlaybackFrame(video);
  }

  function syncPassivePlayback(video) {
    return playbackController.syncPassivePlayback(video);
  }

  function enforcePhraseEnd(video) {
    return playbackController.enforcePhraseEnd(video);
  }

  function shouldPreserveGuidedHold(currentMs) {
    return playbackController.preserveGuidedHold(currentMs);
  }

  function markCurrentTranscriptSegment(phrase) {
    transcriptPanelDomApi.markCurrentTranscriptSegment({
      document,
      phrase,
    });
  }

  function onKeyboardEvent(event) {
    return keyboardController.onKeyboardEvent(event);
  }

  function toggleContinuousPlayback() {
    return playbackController.toggleContinuousPlayback();
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
    return videoInitController.handleCurrentLocation();
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
    return {
      recordBootFailure(error) {
        document.documentElement.dataset.afShadowingBoot = "1";
        document.documentElement.dataset.afShadowingBootError =
          (error instanceof Error ? error.message : String(error)).slice(0, 180);
      },
      renderBootFailureBadge(error) {
        const badge = document.createElement("div");
        badge.id = "af-shadowing-boot-failure";
        badge.textContent = `AudioFilms failed to start: ${error instanceof Error ? error.message : String(error)}`;
        badge.style.cssText = [
          "position:fixed",
          "right:12px",
          "bottom:12px",
          "z-index:2147483647",
          "padding:8px 10px",
          "background:#7f1d1d",
          "color:#fff",
          "font:12px system-ui,sans-serif",
          "border-radius:6px",
        ].join(";");
        document.documentElement.appendChild(badge);
      },
    };
  }

})();
