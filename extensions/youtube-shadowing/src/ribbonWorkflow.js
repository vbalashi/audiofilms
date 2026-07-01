(function audioFilmsRibbonWorkflow() {
  function renderRibbon(panel, deps = {}) {
    const state = deps.getState();
    const readiness = deps.practiceReadiness();
    const currentPhraseTranslation = deps.phraseTranslationState(
      state.phrases[state.currentIndex],
      state.currentIndex,
    );
    const ribbonState = deps.ribbonControls.ribbonPanelState({
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      loading: state.loading,
      practiceMode: state.practiceMode,
      guidedMode: state.guidedMode,
      phraseJumpMenuOpen: state.phraseJumpMenuOpen,
      phraseJumpInput: state.phraseJumpInput,
      phraseJumpError: state.phraseJumpError,
      settingsMenuOpen: state.settingsMenuOpen,
      shortcutHelpOpen: state.shortcutHelpOpen,
      utilityMenuOpen: state.utilityMenuOpen,
      debugVisible: state.debugVisible,
      debugCopied: state.debugCopied,
      diagnosticsClearedAt: state.diagnosticsClearedAt,
      cacheRefreshRequested: state.cacheRefreshRequested,
      issueDialogOpen: state.issueDialogOpen,
      hasSelectedSource: Boolean(deps.getSelectedPracticeSource()),
    });
    const displayToggleState = deps.ribbonControls.displayToggleState({
      practiceMode: state.practiceMode,
      textVisible: state.textVisible,
      shadowTextVisible: state.shadowTextVisible,
      phraseTranslationVisible: state.phraseTranslationVisible,
      phraseTranslationStickyVisible: state.phraseTranslationStickyVisible,
      accountStatus: state.accountStatus,
      translation: currentPhraseTranslation,
    });

    const { list } = deps.ribbonPanelDom.renderRibbonPanel(panel, {
      ribbonState,
      displayToggleState,
      themePreference: state.themePreference,
      readinessState: readiness.state,
      errorText: state.error,
    }, {
      iconSvg: deps.iconSvg,
      renderSourceSelector: deps.renderSourceSelector,
      renderAccountControl: deps.renderAccountControl,
      renderDisplayToggleButton: deps.renderDisplayToggleButton,
      renderDisplayPreferenceControls: deps.renderDisplayPreferenceControls,
      renderPlaybackRateControls: deps.renderPlaybackRateControls,
      renderIssueReportDialog: deps.renderIssueReportDialog,
      positionUtilityMenu: deps.positionUtilityMenu,
      positionIssueReportDialog: deps.positionIssueReportDialog,
    });

    deps.clearElement(list);
    if (state.loading) {
      deps.appendRibbonMessage(list, "Loading captions...");
      return "loading";
    }
    if (!ribbonState.hasPhrases) {
      deps.appendRibbonMessage(
        list,
        state.tracks.length
          ? "No timed phrases available for this caption source."
          : "This video has no captions, so phrase practice cannot start.",
      );
      return "empty";
    }

    list.classList.add("is-compact");
    deps.appendPhraseRow(list, state.phrases[state.currentIndex], state.currentIndex);
    return "phrase";
  }

  window.__afShadowingRibbonWorkflow = {
    renderRibbon,
  };
})();
