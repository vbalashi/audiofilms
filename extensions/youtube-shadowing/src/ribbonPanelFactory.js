(function audioFilmsRibbonPanelFactory() {
  function createRibbonPanel(deps = {}) {
    return deps.workspaceDom.createRibbonPanel(ribbonPanelOptions(deps));
  }

  function ribbonPanelOptions(deps = {}) {
    const state = deps.getState();
    return {
      panelId: deps.panelId,
      iconSvg: deps.iconSvg,
      bugIconSvg: deps.bugIconSvg,
      ribbonControlsApi: deps.ribbonControls,
      onBringPanelBehind: deps.bringDebugPanelBehindFromPanel,
      onTogglePhraseJumpMenu: deps.togglePhraseJumpMenu,
      onJumpStart: () => deps.jumpToPhrase(0, "jump-start"),
      onSubmitPhraseJump: deps.submitPhraseJump,
      onJumpInput: (event) => {
        state.phraseJumpInput = event.currentTarget.value;
        state.phraseJumpError = "";
        deps.render();
      },
      onJumpInputKeydown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          deps.submitPhraseJump();
        }
      },
      createAccountControl: deps.createAccountControl,
      createIssueReportDialog: deps.createIssueReportDialog,
      onPreviousPhrase: deps.previousPhrase,
      onReplayCurrentPhrase: (event) => deps.replayCurrentPhrase({ slowReplay: event.shiftKey }),
      onToggleText: (event) => deps.toggleText(event),
      onNextPhrase: deps.nextPhrase,
      onSetShadowMode: () => deps.setPracticeMode("shadow"),
      onSetRecallMode: () => deps.setPracticeMode("recall"),
      onTogglePhraseTranslation: (event) => deps.togglePhraseTranslation(event),
      onToggleSourceMenu: deps.toggleSourceMenu,
      onCycleThemePreference: deps.cycleThemePreference,
      onToggleSettingsMenu: deps.toggleSettingsMenu,
      onToggleShortcutHelp: deps.toggleShortcutHelp,
      onToggleUtilityMenu: deps.toggleUtilityMenu,
      onLearnerTextSmaller: () => deps.adjustLearnerTextScale(-0.1),
      onLearnerTextReset: deps.resetLearnerTextScale,
      onLearnerTextLarger: () => deps.adjustLearnerTextScale(0.1),
      onTransparencyLower: () => deps.adjustPanelBackgroundAlpha(-0.1),
      onTransparencyReset: deps.resetPanelBackgroundAlpha,
      onTransparencyHigher: () => deps.adjustPanelBackgroundAlpha(0.1),
      onToggleAutoPause: deps.toggleAutoPause,
      onSlowReplaySlower: () => deps.adjustSlowReplaySpeed(-deps.playbackRateStep),
      onSlowReplayFaster: () => deps.adjustSlowReplaySpeed(deps.playbackRateStep),
      onSpeedLower: () => deps.adjustVideoPlaybackRate(-deps.playbackRateStep),
      onSpeedHigher: () => deps.adjustVideoPlaybackRate(deps.playbackRateStep),
      onToggleLayoutLock: deps.toggleLayoutLock,
      onResetPanelLayout: deps.resetPanelLayout,
      onBeginPanelDrag: deps.beginPanelDrag,
      onBeginPanelResize: deps.beginPanelResize,
      onToggleDebug: deps.toggleDebug,
      onCopyDebug: deps.copyDebug,
      onClearDiagnostics: deps.clearDiagnostics,
      onRefreshSelectedSourceCache: deps.refreshSelectedSourceCache,
      onOpenIssueReportDialog: deps.openIssueReportDialog,
      onSubmitPhraseBoundaryIssue: deps.submitPhraseBoundaryIssue,
    };
  }

  window.__afShadowingRibbonPanelFactory = {
    createRibbonPanel,
    ribbonPanelOptions,
  };
})();
