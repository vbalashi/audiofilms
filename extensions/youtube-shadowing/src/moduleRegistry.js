(function audioFilmsModuleRegistry(root) {
  function resolveBootDiagnostics(target = root) {
    const fallbackApi = target.__afShadowingFallbacks;
    if (target.__afShadowingBootDiagnostics) return target.__afShadowingBootDiagnostics;
    if (fallbackApi?.createBootDiagnosticsFallback) {
      return fallbackApi.createBootDiagnosticsFallback();
    }
    return {
      recordBootFailure(error) {
        target.document?.documentElement?.setAttribute?.(
          "data-af-shadowing-boot-error",
          error instanceof Error ? error.message : String(error),
        );
      },
      renderBootFailureBadge(error) {
        const document = target.document;
        if (!document?.documentElement) return;
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

  function resolveContentModules(target = root) {
    const fallbackApi = requiredModule(target, "__afShadowingFallbacks");
    return {
      bootDiagnosticsApi: target.__afShadowingBootDiagnostics || fallbackApi.createBootDiagnosticsFallback(),
      bootStateApi: requiredModule(target, "__afShadowingBootState"),
      formatUtilsApi: requiredModule(target, "__afShadowingFormatUtils"),
      phraseApi: target.__afShadowingPhrases || fallbackApi.createPhraseFallback(),
      captionTrackApi: target.__afShadowingCaptionTracks || fallbackApi.createCaptionTracksFallback(),
      sourceLabelsApi: target.__afShadowingSourceLabels || fallbackApi.createSourceLabelsFallback(),
      sourceSelectionApi: requiredModule(target, "__afShadowingSourceSelection"),
      sourceSelectionStorageApi: requiredModule(target, "__afShadowingSourceSelectionStorage"),
      sourceReadinessApi: requiredModule(target, "__afShadowingSourceReadiness"),
      videoLoadStateApi: requiredModule(target, "__afShadowingVideoLoadState"),
      sourceSelectorApi: requiredModule(target, "__afShadowingSourceSelector"),
      sourceSelectorDomApi: requiredModule(target, "__afShadowingSourceSelectorDom"),
      sourceSelectorWorkflowApi: requiredModule(target, "__afShadowingSourceSelectorWorkflow"),
      youtubeAdapterApi: target.__afShadowingYouTubeAdapter || fallbackApi.createYouTubeAdapterFallback(),
      playerMetadataWorkflowApi: requiredModule(target, "__afShadowingPlayerMetadataWorkflow"),
      transcriptRetrievalApi: requiredModule(target, "__afShadowingTranscriptRetrieval"),
      transcriptMetadataApi: requiredModule(target, "__afShadowingTranscriptMetadata"),
      sourceTranscriptWorkflowApi: requiredModule(target, "__afShadowingSourceTranscriptWorkflow"),
      sourceTranscriptContentWorkflowApi: requiredModule(target, "__afShadowingSourceTranscriptContentWorkflow"),
      transcriptPanelDomApi: requiredModule(target, "__afShadowingTranscriptPanelDom"),
      sourceTimingWorkflowApi: requiredModule(target, "__afShadowingSourceTimingWorkflow"),
      sourceTimingContentWorkflowApi: requiredModule(target, "__afShadowingSourceTimingContentWorkflow"),
      sourceLoadWorkflowApi: requiredModule(target, "__afShadowingSourceLoadWorkflow"),
      sourceLoadContentWorkflowApi: requiredModule(target, "__afShadowingSourceLoadContentWorkflow"),
      sourceContentFacadeApi: requiredModule(target, "__afShadowingSourceContentFacade"),
      videoInitWorkflowApi: requiredModule(target, "__afShadowingVideoInitWorkflow"),
      videoInitContentWorkflowApi: requiredModule(target, "__afShadowingVideoInitContentWorkflow"),
      sourceBindingApi: requiredModule(target, "__afShadowingSourceBinding"),
      dictionaryActionApi: requiredModule(target, "__afShadowingDictionaryActions"),
      dictionaryActionWorkflowApi: requiredModule(target, "__afShadowingDictionaryActionWorkflow"),
      dictionaryStateApi: requiredModule(target, "__afShadowingDictionaryState"),
      dictionaryAudioApi: requiredModule(target, "__afShadowingDictionaryAudio"),
      dictionaryAudioWorkflowApi: requiredModule(target, "__afShadowingDictionaryAudioWorkflow"),
      dictionaryMockApi: requiredModule(target, "__afShadowingDictionaryMocks"),
      dictionaryPresentationApi: requiredModule(target, "__afShadowingDictionaryPresentation"),
      dictionaryDomApi: requiredModule(target, "__afShadowingDictionaryDom"),
      dictionaryOverlayWorkflowApi: requiredModule(target, "__afShadowingDictionaryOverlayWorkflow"),
      dictionaryPanelWorkflowApi: requiredModule(target, "__afShadowingDictionaryPanelWorkflow"),
      dictionarySearchDomApi: requiredModule(target, "__afShadowingDictionarySearchDom"),
      dictionarySearchWorkflowApi: requiredModule(target, "__afShadowingDictionarySearchWorkflow"),
      dictionaryRenderWorkflowApi: requiredModule(target, "__afShadowingDictionaryRenderWorkflow"),
      dictionaryCommandApi: requiredModule(target, "__afShadowingDictionaryCommands"),
      dictionaryCommandTransportApi: requiredModule(target, "__afShadowingDictionaryCommandTransport"),
      dictionaryLookupWorkflowApi: requiredModule(target, "__afShadowingDictionaryLookupWorkflow"),
      dictionaryContentWorkflowApi: requiredModule(target, "__afShadowingDictionaryContentWorkflow"),
      dictionaryRuntimeContentFacadeApi: requiredModule(target, "__afShadowingDictionaryRuntimeContentFacade"),
      accountSessionApi: requiredModule(target, "__afShadowingAccountSession"),
      accountSessionWorkflowApi: requiredModule(target, "__afShadowingAccountSessionWorkflow"),
      accountSessionDomApi: requiredModule(target, "__afShadowingAccountSessionDom"),
      backendCommandApi: requiredModule(target, "__afShadowingBackendCommands"),
      backendBuildWorkflowApi: requiredModule(target, "__afShadowingBackendBuildWorkflow"),
      extensionCommandClientApi: requiredModule(target, "__afShadowingExtensionCommandClient"),
      generatedEntryApi: requiredModule(target, "__afShadowingGeneratedEntries"),
      generatedEntryWorkflowApi: requiredModule(target, "__afShadowingGeneratedEntryWorkflow"),
      phraseProgressApi: requiredModule(target, "__afShadowingPhraseProgress"),
      phraseProgressStorageApi: requiredModule(target, "__afShadowingPhraseProgressStorage"),
      phraseTranslationApi: requiredModule(target, "__afShadowingPhraseTranslations"),
      phraseTranslationWorkflowApi: requiredModule(target, "__afShadowingPhraseTranslationWorkflow"),
      phraseTranslationContentFacadeApi: requiredModule(target, "__afShadowingPhraseTranslationContentFacade"),
      phraseRowsApi: requiredModule(target, "__afShadowingPhraseRows"),
      phraseRowsDomApi: requiredModule(target, "__afShadowingPhraseRowsDom"),
      phraseRowsWorkflowApi: requiredModule(target, "__afShadowingPhraseRowsWorkflow"),
      selectedSpanApi: requiredModule(target, "__afShadowingSelectedSpans"),
      selectedSpanWorkflowApi: requiredModule(target, "__afShadowingSelectedSpanWorkflow"),
      selectedSpanDomApi: requiredModule(target, "__afShadowingSelectedSpansDom"),
      dictionaryOperationsContentFacadeApi: requiredModule(target, "__afShadowingDictionaryOperationsContentFacade"),
      playbackSessionApi: requiredModule(target, "__afShadowingPlaybackSession"),
      playbackTimingApi: requiredModule(target, "__afShadowingPlaybackTiming"),
      playbackWorkflowApi: requiredModule(target, "__afShadowingPlaybackWorkflow"),
      playbackContentWorkflowApi: requiredModule(target, "__afShadowingPlaybackContentWorkflow"),
      passivePlaybackWatcherApi: requiredModule(target, "__afShadowingPassivePlaybackWatcher"),
      passivePlaybackContentWorkflowApi: requiredModule(target, "__afShadowingPassivePlaybackContentWorkflow"),
      playbackContentFacadeApi: requiredModule(target, "__afShadowingPlaybackContentFacade"),
      panelLayoutApi: requiredModule(target, "__afShadowingPanelLayout"),
      panelLayoutDomApi: requiredModule(target, "__afShadowingPanelLayoutDom"),
      panelLayoutWorkflowApi: requiredModule(target, "__afShadowingPanelLayoutWorkflow"),
      panelLayoutContentWorkflowApi: requiredModule(target, "__afShadowingPanelLayoutContentWorkflow"),
      issueReportsApi: requiredModule(target, "__afShadowingIssueReports"),
      issueReportWorkflowApi: requiredModule(target, "__afShadowingIssueReportWorkflow"),
      backendRuntimeContentFacadeApi: requiredModule(target, "__afShadowingBackendRuntimeContentFacade"),
      supportContentFacadeApi: requiredModule(target, "__afShadowingSupportContentFacade"),
      issueReportsDomApi: requiredModule(target, "__afShadowingIssueReportsDom"),
      diagnosticsReportApi: requiredModule(target, "__afShadowingDiagnosticsReport"),
      diagnosticsStateApi: requiredModule(target, "__afShadowingDiagnosticsState"),
      diagnosticsFormatWorkflowApi: requiredModule(target, "__afShadowingDiagnosticsFormatWorkflow"),
      diagnosticsDomApi: requiredModule(target, "__afShadowingDiagnosticsDom"),
      diagnosticsWorkflowApi: requiredModule(target, "__afShadowingDiagnosticsWorkflow"),
      diagnosticsContentWorkflowApi: requiredModule(target, "__afShadowingDiagnosticsContentWorkflow"),
      displayPreferencesApi: requiredModule(target, "__afShadowingDisplayPreferences"),
      displayPreferenceStorageApi: requiredModule(target, "__afShadowingDisplayPreferenceStorage"),
      displayPreferenceWorkflowApi: requiredModule(target, "__afShadowingDisplayPreferenceWorkflow"),
      storageStateApi: requiredModule(target, "__afShadowingStorageState"),
      menuStateApi: requiredModule(target, "__afShadowingMenuState"),
      keyboardShortcutApi: requiredModule(target, "__afShadowingKeyboardShortcuts"),
      keyboardWorkflowApi: requiredModule(target, "__afShadowingKeyboardWorkflow"),
      keyboardContentWorkflowApi: requiredModule(target, "__afShadowingKeyboardContentWorkflow"),
      scrollContainmentApi: requiredModule(target, "__afShadowingScrollContainment"),
      domUtilsApi: requiredModule(target, "__afShadowingDomUtils"),
      uiIconsApi: requiredModule(target, "__afShadowingUiIcons"),
      uiStateWorkflowApi: requiredModule(target, "__afShadowingUiStateWorkflow"),
      displayStateContentWorkflowApi: requiredModule(target, "__afShadowingDisplayStateContentWorkflow"),
      ribbonControlsApi: requiredModule(target, "__afShadowingRibbonControls"),
      workspaceDomApi: requiredModule(target, "__afShadowingWorkspaceDom"),
      workspaceWorkflowApi: requiredModule(target, "__afShadowingWorkspaceWorkflow"),
      workspaceContentWorkflowApi: requiredModule(target, "__afShadowingWorkspaceContentWorkflow"),
      phraseJumpWorkflowApi: requiredModule(target, "__afShadowingPhraseJumpWorkflow"),
      ribbonDomApi: requiredModule(target, "__afShadowingRibbonDom"),
      ribbonPanelDomApi: requiredModule(target, "__afShadowingRibbonPanelDom"),
      ribbonPanelFactoryApi: requiredModule(target, "__afShadowingRibbonPanelFactory"),
      ribbonPanelContentWorkflowApi: requiredModule(target, "__afShadowingRibbonPanelContentWorkflow"),
      ribbonWorkflowApi: requiredModule(target, "__afShadowingRibbonWorkflow"),
      ribbonContentWorkflowApi: requiredModule(target, "__afShadowingRibbonContentWorkflow"),
      surfaceContentFacadeApi: requiredModule(target, "__afShadowingSurfaceContentFacade"),
      surfaceRuntimeContentFacadeApi: requiredModule(target, "__afShadowingSurfaceRuntimeContentFacade"),
      buildInfoApi: target.__afShadowingBuildInfo || {},
    };
  }

  function requiredModule(target, namespace) {
    const module = target[namespace];
    if (module) return module;
    throw new Error(`Missing AudioFilms extension module: ${namespace}`);
  }

  root.__afShadowingModuleRegistry = {
    resolveBootDiagnostics,
    resolveContentModules,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
