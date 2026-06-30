(function audioFilmsSourceSelectorWorkflow() {
  function renderSourceSelector(track, sourceToggle, sourceMenu, options = {}) {
    const state = options.state || {};
    const selectedSource = options.getSelectedPracticeSource();
    const readiness = options.practiceReadiness();
    const toggleState = options.sourceSelector.sourceToggleState({
      selectedSource,
      sourceLabel: selectedSource ? options.userFacingSourceLabel(selectedSource) : "",
      hasTracks: state.tracks?.length > 0,
      loading: state.loading,
      sourceMenuOpen: state.sourceMenuOpen,
      readiness,
    });
    if (!options.sourceSelectorDom.renderSourceToggle(track, sourceToggle, sourceMenu, toggleState, {
      clearElement: options.clearElement,
    })) return;

    renderReadinessPopover(sourceMenu, {
      ...options,
      state,
      selectedSource,
      readiness,
    });
  }

  function renderReadinessPopover(sourceMenu, {
    state = {},
    selectedSource = null,
    readiness = {},
    timingOperationState,
    userFacingSourceLabel,
    sourceSelector,
    sourceSelectorDom,
    sourceReadiness,
    sourceLabels,
    captionTracks,
    onGetCaptions,
    onImproveTiming,
    onSelectSource,
  } = {}) {
    const timingState = timingOperationState(readiness);
    const result = selectedSource?.loadedTranscriptResult || state.transcriptResult;
    const enrichment = sourceLabels.timingEnrichmentLabel(result);
    const popoverState = sourceSelector.readinessPopoverState({
      cacheRefreshRequested: state.cacheRefreshRequested,
      loading: state.loading,
      selectedSource,
      timingState,
      readiness,
      result,
      enrichment,
      sourceLabel: selectedSource ? userFacingSourceLabel(selectedSource) : "No captions",
      provider: sourceLabels.sourceProviderLabel(selectedSource, result),
      phraseCount: state.phrases?.length || 0,
      practiceSourceCount: state.practiceSources?.length || 0,
      staleReason: state.timingOperation?.result?.applicability?.staleReason,
      timingApplied: state.timingOperation?.appliedToActiveSource,
    });
    const sourceOptionGroups = sourceSelector.sourceOptionGroups({
      groups: captionTracks.groupPracticeSources(state.practiceSources || []),
      selectedSourceId: state.selectedSourceId,
      labelForSource: userFacingSourceLabel,
      warningInformationalForSource: (source) =>
        sourceReadiness.sourceWarningIsInformational(source.loadedTranscriptResult?.warnings?.[0]),
    });
    sourceSelectorDom.renderReadinessPopover(sourceMenu, {
      readiness,
      readinessCopy: sourceReadiness.readinessCopy(readiness.state),
      popoverState,
      sourceOptionGroups,
      onGetCaptions,
      onImproveTiming,
      onSelectSource,
    });
  }

  window.__afShadowingSourceSelectorWorkflow = {
    renderSourceSelector,
    renderReadinessPopover,
  };
})();
