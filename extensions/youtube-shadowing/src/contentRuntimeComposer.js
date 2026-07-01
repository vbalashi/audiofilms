(function audioFilmsContentRuntimeComposer(root) {
  function bootAudioFilmsYouTubeShadowing({
    modules,
    environment,
    contentScriptRevision = "content-runtime-composer",
  } = {}) {
  const {
    window,
    document,
    chrome,
    fetch,
    navigator,
    crypto,
    Audio,
    HTMLElement,
    Element,
    requestAnimationFrame,
  } = environment;
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
    dictionaryAudioApi,
    dictionaryAudioWorkflowApi,
    dictionaryActionApi,
    dictionaryActionWorkflowApi,
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
    dictionaryRuntimeContentFacadeApi,
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
    phraseTranslationContentFacadeApi,
    phraseRowsApi,
    phraseRowsDomApi,
    phraseRowsWorkflowApi,
    selectedSpanApi,
    selectedSpanWorkflowApi,
    selectedSpanDomApi,
    sourceBindingApi,
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
    diagnosticsWorkflowApi,
    diagnosticsFormatWorkflowApi,
    diagnosticsContentWorkflowApi,
    diagnosticsDomApi,
    displayPreferencesApi,
    displayPreferenceStorageApi,
    displayPreferenceWorkflowApi,
    storageStateApi,
    menuStateApi,
    keyboardShortcutApi,
    keyboardWorkflowApi,
    keyboardContentWorkflowApi,
    scrollContainmentApi,
    domUtilsApi,
    uiIconsApi,
    uiStateWorkflowApi,
    displayStateContentWorkflowApi,
    workspaceDomApi,
    workspaceWorkflowApi,
    workspaceContentWorkflowApi,
    phraseJumpWorkflowApi,
    sourceSelectorApi,
    sourceSelectorDomApi,
    sourceSelectorWorkflowApi,
    ribbonControlsApi,
    ribbonDomApi,
    ribbonPanelDomApi,
    ribbonPanelFactoryApi,
    ribbonPanelContentWorkflowApi,
    ribbonWorkflowApi,
    ribbonContentWorkflowApi,
    panelLayoutApi,
    panelLayoutDomApi,
    panelLayoutWorkflowApi,
    panelLayoutContentWorkflowApi,
    surfaceContentFacadeApi,
    surfaceRuntimeContentFacadeApi,
    ribbonRuntimeContentFacadeApi,
    interactionRuntimeContentFacadeApi,
    renderSchedulerContentFacadeApi,
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
  let bootDiagnosticsPublishFrame = 0;

  const state = bootStateApi.createInitialState({
    bootDiagnostics,
    contentScriptRevision: contentScriptRevision,
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
  const runtimeMessageClient = extensionCommandClientApi.createRuntimeMessageClient({
    chrome,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  });
  const displayPreferenceController = displayPreferenceStorageApi.createDisplayPreferenceController({
    chrome,
    storage: window.localStorage,
    keys: displayPreferenceStorageKeys,
    state,
    normalizeDisplayPreferences: displayPreferencesApi.normalizeDisplayPreferences,
    sendMessage: runtimeMessageClient.sendRuntimeMessage,
    recordDebugEvent,
    render,
    onDisabled: handleDisplayPreferencesDisabled,
    onEnabled: handleDisplayPreferencesEnabled,
  });
  const phraseProgressStore = phraseProgressStorageApi.createPhraseProgressStore({
    window,
    phraseProgress: phraseProgressApi,
    state,
    sendMessage: runtimeMessageClient.sendRuntimeMessage,
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
  const interactionRuntimeController = interactionRuntimeContentFacadeApi.createInteractionRuntimeController({
    getState: () => state,
    modules: {
      phraseJumpWorkflow: phraseJumpWorkflowApi,
      menuState: menuStateApi,
      phraseRows: phraseRowsApi,
      selectedSpanWorkflow: selectedSpanWorkflowApi,
    },
    commands: {
      jumpToPhrase: (targetIndex, reason) => playbackRuntimeController?.jumpToPhrase(targetIndex, reason),
      render,
    },
    ids: {
      rootId: ROOT_ID,
    },
    environment: {
      document,
      navigator,
      Element,
      requestAnimationFrame,
    },
  });
  const {
    onDocumentPointerUp,
    togglePhraseJumpMenu,
    submitPhraseJump,
    copyIssueReport,
    copyTextWithFallback,
    isTokenInSelectedSpan,
    isTokenInSpanDraft,
    applySpanSelectionDraftPreview,
    clearSpanSelectionDraft,
  } = interactionRuntimeController;
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
    document,
    dictionaryCommands: dictionaryCommandApi,
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
    syncLinkedAccount,
    connectLinkedAccount,
    disconnectLinkedAccount,
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
    modules: {
      selectedSpanWorkflowApi,
      selectedSpanApi,
      phraseTranslationApi,
      generatedEntryApi,
      dictionaryOverlayWorkflowApi,
      dictionaryDomApi,
      issueReportsApi,
      dictionaryAudioApi,
      dictionaryAudioWorkflowApi,
      dictionaryPresentationApi,
      dictionaryActionWorkflowApi,
      generatedEntryWorkflowApi,
      sourceBindingApi,
      dictionaryActionApi,
      dictionaryContentWorkflowApi,
      dictionaryLookupWorkflowApi,
      dictionaryStateApi,
      dictionaryCommandApi,
      dictionaryCommandTransportApi,
    },
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
      connectAccount: connectLinkedAccount,
      disconnectAccount: disconnectLinkedAccount,
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
    modules: {
      phraseTranslationWorkflowApi,
      phraseTranslationApi,
    },
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
    formatUtils: formatUtilsApi,
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
      playbackRateMin: PLAYBACK_RATE_MIN,
      playbackRateMax: PLAYBACK_RATE_MAX,
      defaultSlowReplaySpeed: DEFAULT_SLOW_REPLAY_SPEED,
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
    playbackRateOptions,
    syncPlaybackRateFromVideo,
    slowReplayPlaybackRate,
    formatPlaybackRate,
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
    modules: {
      ribbonPanelContentWorkflowApi,
      workspaceDomApi,
      ribbonControlsApi,
      ribbonPanelFactoryApi,
      panelLayoutContentWorkflowApi,
      panelLayoutWorkflowApi,
      panelLayoutApi,
      panelLayoutDomApi,
      displayPreferencesApi,
      diagnosticsContentWorkflowApi,
      diagnosticsWorkflowApi,
      diagnosticsFormatWorkflowApi,
      diagnosticsReportApi,
      issueReportsApi,
      captionTrackApi,
      transcriptMetadataApi,
      keyboardContentWorkflowApi,
      keyboardWorkflowApi,
      youtubeAdapterApi,
      keyboardShortcutApi,
      displayStateContentWorkflowApi,
      displayPreferenceWorkflowApi,
      uiStateWorkflowApi,
      menuStateApi,
      playbackSessionApi,
      ribbonContentWorkflowApi,
      sourceSelectorWorkflowApi,
      sourceSelectorApi,
      sourceSelectorDomApi,
      sourceReadinessApi,
      sourceLabelsApi,
      phraseRowsWorkflowApi,
      phraseRowsApi,
      phraseRowsDomApi,
      selectedSpanWorkflowApi,
      selectedSpanApi,
      domUtilsApi,
    },
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
        connectAccount: connectLinkedAccount,
        disconnectAccount: disconnectLinkedAccount,
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
        jumpToPhrase: jumpToPhraseFromPlayback,
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
  const ribbonRuntimeController = ribbonRuntimeContentFacadeApi.createRibbonRuntimeController({
    getState: () => state,
    modules: {
      ribbonWorkflowApi,
      ribbonControlsApi,
      ribbonPanelDomApi,
      ribbonDomApi,
      displayPreferencesApi,
      domUtilsApi,
    },
    iconSvg,
    constants: {
      playbackRateMin: PLAYBACK_RATE_MIN,
      playbackRateMax: PLAYBACK_RATE_MAX,
    },
    commands: {
      source: {
        practiceReadiness,
        getSelectedPracticeSource,
      },
      translation: {
        phraseTranslationState,
      },
      surface: {
        renderSourceSelector,
        appendPhraseRow,
      },
      dictionary: {
        renderAccountControl,
      },
      issue: {
        renderIssueReportDialog,
      },
      layout: {
        hasCustomPanelLayout,
      },
      playback: {
        syncPlaybackRateFromVideo,
        formatPlaybackRate,
      },
    },
    environment: {
      document,
      requestAnimationFrame: window.requestAnimationFrame,
    },
  });
  const {
    renderRibbon,
  } = ribbonRuntimeController;
  const renderScheduler = renderSchedulerContentFacadeApi.createRenderScheduler({
    getState: () => state,
    renderers: {
      renderToggle,
      clearTimingOperationPoll,
      removeWorkspace,
      ensureWorkspace,
      applyPanelLayout,
      renderRibbon,
      renderDebugPanel,
      renderDictionary,
    },
    environment: {
      document,
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
      setTimeout: window.setTimeout.bind(window),
    },
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
  syncLinkedAccount();
  refreshBackendBuildInfo();

  function updateBootDiagnostics(updates) {
    Object.assign(state.bootDiagnostics, updates, {
      updatedAt: new Date().toISOString(),
      url: window.location.href,
    });
    if (updates.lastError) {
      document.documentElement.dataset.afShadowingLastError = String(updates.lastError).slice(0, 180);
      publishBootDiagnosticsNow();
      return;
    }
    scheduleBootDiagnosticsPublish();
  }

  function publishBootDiagnosticsNow() {
    bootDiagnosticsPublishFrame = 0;
    bootDiagnosticsApi.publish(state.bootDiagnostics);
    publishDiagnosticsSnapshot();
  }

  function scheduleBootDiagnosticsPublish() {
    if (bootDiagnosticsPublishFrame) return;
    bootDiagnosticsPublishFrame = requestAnimationFrame(() => {
      publishBootDiagnosticsNow();
    });
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

  function createDebugPanel() {
    return workspaceDomApi.createDebugPanel({
      onBringToFront: bringDebugPanelToFrontFromEvent,
      onCopy: copyDebug,
      onClose: closeDebug,
      onDrag: beginDebugPanelDrag,
      onResize: beginDebugPanelResize,
    });
  }

  function render(invalidation = "all") {
    renderScheduler.invalidate(invalidation);
  }

  function renderDebugPanel(debugPanel) {
    const debugState = diagnosticsReportApi.debugPanelState(state);
    diagnosticsDomApi.renderDebugPanel(debugPanel, debugState, {
      debugText: formatDebugState(),
    });
    applyDebugPanelGeometry(debugPanel);
    applyDebugPanelLayer(debugPanel);
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
      contentScriptRevision: contentScriptRevision,
      buildInfo: info,
      apiBase: apiBaseForBackendCommands(),
    });
  }

  function renderIssueReportDialog(dialog) {
    const dialogState = issueReportsApi.issueReportDialogState(state);
    issueReportsDomApi.renderIssueReportDialog(dialog, dialogState);
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


  root.__afShadowingContentRuntimeComposer = {
    bootAudioFilmsYouTubeShadowing,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
