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
    youtubeRuntimeContentFacadeApi,
    videoInitWorkflowApi,
    videoInitContentWorkflowApi,
    dictionaryStateApi,
    dictionaryMockApi,
    dictionaryPresentationApi,
    dictionaryDomApi,
    dictionaryOverlayWorkflowApi,
    dictionaryPanelWorkflowApi,
    dictionarySearchDomApi,
    dictionarySearchWorkflowApi,
    dictionaryRenderWorkflowApi,
    dictionaryCommandApi,
    dictionaryLookupWorkflowApi,
    dictionaryContentWorkflowApi,
    dictionaryRuntimeContentFacadeApi,
    accountSessionApi,
    accountSessionWorkflowApi,
    accountSessionDomApi,
    backendCommandApi,
    backendBuildWorkflowApi,
    extensionCommandClientApi,
    generatedEntryApi,
    phraseProgressApi,
    phraseProgressStorageApi,
    phraseTranslationApi,
    phraseTranslationWorkflowApi,
    phraseTranslationContentFacadeApi,
    phraseRowsApi,
    phraseRowsDomApi,
    phraseRowsWorkflowApi,
    selectedSpanApi,
    selectedSpanWorkflowApi,
    selectedSpanDomApi,
    dictionaryOperationsContentFacadeApi,
    playbackSessionApi,
    playbackTimingApi,
    playbackWorkflowApi,
    playbackContentWorkflowApi,
    passivePlaybackWatcherApi,
    passivePlaybackContentWorkflowApi,
    playbackContentFacadeApi,
    issueReportsApi,
    issueReportWorkflowApi,
    backendRuntimeContentFacadeApi,
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
    surfaceRuntimeContentFacadeApi,
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
  const {
    recordDebugEvent,
    recordNavigationEvent,
    publishSnapshot: publishDiagnosticsSnapshot,
  } = diagnosticsStateController;
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
  const dictionaryRuntimeController = dictionaryRuntimeContentFacadeApi.createDictionaryRuntimeController();
  const surfaceRuntimeController = surfaceRuntimeContentFacadeApi.createSurfaceRuntimeController();
  const {
    toggleCardTranslation,
    setCardTranslationPending,
    renderDictionary,
    renderAccountControl,
    dictionaryHeaderCopy,
    renderAccountCard,
    renderSelectedWordCard,
    renderSelectedSpanCard,
    renderSelectedSpanTitle,
    renderSelectedSpanLookupPrompt,
    renderGeneratedFallback,
    renderOverlayCard,
    renderOverlayCardTitle,
    renderOverlaySections,
    renderReviewActions,
    renderConnectPrompt,
    selectLookupWord,
    lookupSelectedWord,
    loadGroupedDictionarySearch,
    toggleDictionarySearchItem,
    loadDictionarySearchItemCard,
    requestDictionaryCardTranslation,
  } = dictionaryRuntimeController;
  const playbackRuntimeBinding = playbackContentFacadeApi.createPlaybackRuntimeBinding();
  const {
    findPlaybackPhraseIndex,
    getVideoElement,
    ensurePassivePlaybackWatcher,
    syncPassivePlayback,
    markCurrentTranscriptSegment,
  } = playbackRuntimeBinding;
  const {
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
    createRibbonPanel,
    createIssueReportDialog,
    createAccountControl,
    hasCustomPanelLayout,
    toggleLayoutLock,
    resetPanelLayout,
    applyPanelLayout,
    scheduleViewportLayoutClamp,
    applyPanelGeometry,
    applyDebugPanelGeometry,
    applyDebugPanelLayer,
    bringDebugPanelToFrontFromEvent,
    handleShadowLayerFocus,
    bringDebugPanelBehindFromPanel,
    bringDebugPanelToFront,
    bringDebugPanelBehind,
    beginDebugPanelDrag,
    beginDebugPanelResize,
    installPanelGestureFallback,
    beginPanelGestureFromHost,
    resolvePanelGestureAt,
    beginPanelDrag,
    isInteractiveDragTarget,
    beginPanelResize,
    clampPanelGeometry,
    clampDebugPanelGeometry,
    viewportBounds,
    savePanelGeometry,
    saveDebugPanelGeometry,
    bringPanelToFront,
    panelElement,
    debugPanelElement,
    toggleUtilityMenu,
    toggleSettingsMenu,
    toggleShortcutHelp,
    toggleAccountMenu,
    cycleThemePreference,
    adjustLearnerTextScale,
    resetLearnerTextScale,
    adjustPanelBackgroundAlpha,
    resetPanelBackgroundAlpha,
    adjustSlowReplaySpeed,
    adjustVideoPlaybackRate,
    setVideoPlaybackRate,
    applyThemeAttributes,
    toggleAllExamples,
    toggleCardExpanded,
    cardExpanded,
    closeOpenMenus,
    focusMenuTrigger,
    onDocumentPointerDown,
    toggleDebug,
    closeDebug,
    copyDebug,
    clearDiagnostics,
    formatDebugState,
    getPlaybackSnapshot,
    formatIssueReport,
    renderSourceSelector,
    appendPhraseRow,
  } = surfaceRuntimeController;
  let playbackRuntimeController = null;
  const backendRuntimeController = backendRuntimeContentFacadeApi.createBackendRuntimeController({
    environment: {
      config: window.__afShadowingConfig,
      cryptoApi: typeof crypto === "undefined" ? null : crypto,
    },
  });
  const {
    apiBaseForBackendCommands,
    dictionaryEndpoint,
    createMutationTurnId,
  } = backendRuntimeController;
  const {
    commandClient,
    accountSessionWorkflow,
    issueReportWorkflow,
    refreshBackendBuildInfo,
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
  const {
    open: openIssueReportDialog,
    close: closeIssueReportDialog,
    copyCurrent: copyCurrentIssueReport,
    submit: submitIssueReport,
    submitPhraseBoundary: submitPhraseBoundaryIssue,
  } = issueReportWorkflow;
  const {
    syncTwoThousandNlAccount,
    connectTwoThousandNlAccount,
    disconnectTwoThousandNlAccount,
    requestDictionaryCommand,
    postBackendJson,
    getBackendJson,
  } = backendRuntimeController.createSupportCommandPorts({
    commandClient,
    accountSessionWorkflow,
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
  const {
    refreshSelectedSourceCache,
    startImproveTiming,
    applyTimingOperation,
    applyTimingOperationResultToActiveSource,
    scheduleTimingOperationPoll,
    pollTimingOperation,
    clearTimingOperationPoll,
    getSelectedPracticeSource,
    selectPracticeSource,
    loadPracticeSource,
    phrasesFromTranscriptResult,
    maybeSwitchToPreferredSource,
    holdInitialAutoPauseAfterSourceLoad,
    transcriptResultFromLoadedSource,
    fetchReusableTimingTranscriptResult,
    registerTimingOperationResultSources,
    fetchBestAvailableCues,
    normalizeTranscriptResult,
  } = sourceController;
  const youtubeRuntimeController = youtubeRuntimeContentFacadeApi.createYoutubeRuntimeController({
    getState: () => state,
    playerMetadataWorkflow: playerMetadataWorkflowApi,
    youtubeAdapter: youtubeAdapterApi,
    captionTracks: captionTrackApi,
    transcriptPanelDom: transcriptPanelDomApi,
    domUtils: domUtilsApi,
    recordDebugEvent,
    delay,
    environment: {
      document,
      fetch,
    },
  });
  const {
    waitForPlayerResponse,
    resetTranscriptPanelState,
  } = youtubeRuntimeController;
  const dictionaryOperationsController = dictionaryOperationsContentFacadeApi.createDictionaryOperationsController({
    getState: () => state,
    modules,
    environment: {
      document,
      config: window.__afShadowingConfig,
      AudioConstructor: typeof Audio === "undefined" ? null : Audio,
    },
    commands: {
      render,
      getSelectedPracticeSource,
      getVideoElement,
      extensionVersion,
      describePhraseAtIndex,
      openIssueReportDialog,
      recordDebugEvent,
      createMutationTurnId,
      requestDictionaryCommand,
      lookupSelectedWord,
      connectAccount: connectTwoThousandNlAccount,
      disconnectAccount: disconnectTwoThousandNlAccount,
      toggleCardTranslation,
    },
  });
  const {
    clearSelectedSpan,
    saveSelectedSpanCard,
    renderCardActionMenu,
    cardAudioPlayable,
    playHeadwordAudio,
    toggleCardMenu,
    visibleCardTranslation,
    cardTranslationsVisible,
    cardHasLookupTranslations,
    cardCanRequestTranslation,
    lookupOrOverlayHeadword,
    lookupOrOverlayDefinition,
    lookupOrOverlaySection,
    handleAccountAction,
    performDisplayAction,
    generateDictionaryDraft,
    createDictionarySourceBinding,
    generatedDraftItemFromOverlayCard,
    isCurrentLookup,
    fetchDictionaryResult,
    fetchDictionarySearchResult,
    postDictionaryCommand,
  } = dictionaryOperationsController;
  const phraseTranslationController = phraseTranslationContentFacadeApi.createPhraseTranslationController({
    getState: () => state,
    modules,
    commands: {
      getSelectedPracticeSource,
      postDictionaryCommand,
      recordDebugEvent,
      render,
    },
  });
  const {
    setPracticeMode,
    togglePhraseTranslation,
    phraseTranslationState,
    ensureCurrentPhraseTranslation,
    requestSelectedSpanTranslation,
    phraseDisplaySegmentRange,
    applyPhraseEntryDisplayState,
  } = phraseTranslationController;
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
  dictionaryRuntimeController.bindController(dictionaryController);
  playbackRuntimeController = playbackContentFacadeApi.createPlaybackRuntimeController({
    getState: () => state,
    playbackContentWorkflow: playbackContentWorkflowApi,
    playbackWorkflow: playbackWorkflowApi,
    passivePlaybackContentWorkflow: passivePlaybackContentWorkflowApi,
    passivePlaybackWatcher: passivePlaybackWatcherApi,
    playbackSession: playbackSessionApi,
    playbackTiming: playbackTimingApi,
    transcriptPanelDom: transcriptPanelDomApi,
    youtubeAdapter: youtubeAdapterApi,
    playbackRateOptions,
    syncPlaybackRateFromVideo,
    slowReplayPlaybackRate,
    recordNavigationEvent,
    describePhraseAtIndex,
    getPlaybackSnapshot,
    updateDisplayPreferences,
    phraseProgressStore,
    applyPhraseEntryDisplayState,
    phraseDisplaySegmentRange,
    roundTime,
    render,
    updateBootDiagnostics,
    constants: {
      preRollMs: PRE_ROLL_MS,
      postRollMs: POST_ROLL_MS,
      minAudibleEndTailMs: MIN_AUDIBLE_END_TAIL_MS,
      contiguousBoundaryGuardMs: CONTIGUOUS_BOUNDARY_GUARD_MS,
    },
    environment: {
      document,
      window,
    },
  });
  playbackRuntimeBinding.bindRuntimeController(playbackRuntimeController);
  const {
    jumpToPhrase: jumpToPhraseFromPlayback,
    handleWordReplayGesture: handleWordReplayGestureFromPlayback,
    replayCurrentPhrase,
    pauseCurrentPlayback,
    nextPhrase,
    previousPhrase,
    navigateToPhrase,
    holdPhraseAtStart,
    toggleText,
    toggleAutoPause,
    enterGuidedMode,
    showText,
    syncIndexToCurrentTime,
    isCurrentPhraseStillSelected,
    playbackEndMsForPhrase,
    playWordReplay,
    resolveWordTiming,
    estimateWordStartMs,
    playPhrase,
    phrasePlaybackStartMs,
    playbackTimingConfig,
    scheduleNavigationObservation,
    stopPlaybackTimer,
    restorePlaybackRateAfterOverride,
    detachPassivePlaybackWatcher,
    onPassiveVideoTimeUpdate,
    onPassiveVideoPlay,
    onPassiveVideoPause,
    onPassiveVideoRateChange,
    startPassivePlaybackFrame,
    enforcePhraseEnd,
    shouldPreserveGuidedHold,
    toggleContinuousPlayback,
  } = playbackRuntimeController;
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
  surfaceRuntimeController.bindControllers({
    workspaceController,
    ribbonPanelController,
    panelLayoutController,
    diagnosticsController,
    displayStateController,
    ribbonContentController,
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

  function createDebugPanel() {
    return workspaceDomApi.createDebugPanel({
      onBringToFront: bringDebugPanelToFrontFromEvent,
      onCopy: copyDebug,
      onClose: closeDebug,
      onDrag: beginDebugPanelDrag,
      onResize: beginDebugPanelResize,
    });
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

  function toggleCardExamples(cardId) {
    toggleCardExpanded(cardId);
  }

  function exampleSectionExpanded(cardId) {
    return cardExpanded(cardId);
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

  function togglePhraseJumpMenu(event) {
    return phraseJumpWorkflowApi.togglePhraseJumpMenu(state, event, phraseJumpWorkflowOptions());
  }

  function submitPhraseJump() {
    return phraseJumpWorkflowApi.submitPhraseJump(state, phraseJumpWorkflowOptions());
  }

  function jumpToPhrase(targetIndex, reason) {
    return jumpToPhraseFromPlayback(targetIndex, reason);
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

  function copyIssueReport(report) {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(report))
      .catch(() => {
      copyTextWithFallback(report);
    });
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

  function describePhraseAtIndex(index) {
    return diagnosticsReportApi.describePhraseAtIndex(state.phrases, index);
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
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

  function handleWordReplayGesture(event, word, phraseIndex, selection) {
    return handleWordReplayGestureFromPlayback(event, word, phraseIndex, selection);
  }

  async function initializeForCurrentVideo() {
    return videoInitController.initializeForCurrentVideo();
  }

  function onKeyboardEvent(event) {
    return keyboardController.onKeyboardEvent(event);
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
