(function audioFilmsRibbonPanelContentWorkflow() {
  function createRibbonPanelController(deps = {}) {
    function createRibbonPanel() {
      return deps.ribbonPanelFactory.createRibbonPanel(ribbonPanelFactoryOptions());
    }

    function ribbonPanelFactoryOptions() {
      return {
        getState: deps.getState,
        workspaceDom: deps.workspaceDom,
        panelId: deps.panelId,
        iconSvg: deps.iconSvg,
        bugIconSvg: deps.bugIconSvg,
        ribbonControls: deps.ribbonControls,
        playbackRateStep: deps.playbackRateStep,
        bringDebugPanelBehindFromPanel: deps.bringDebugPanelBehindFromPanel,
        togglePhraseJumpMenu: deps.togglePhraseJumpMenu,
        jumpToPhrase: deps.jumpToPhrase,
        submitPhraseJump: deps.submitPhraseJump,
        render: deps.render,
        createAccountControl,
        createIssueReportDialog,
        previousPhrase: deps.previousPhrase,
        replayCurrentPhrase: deps.replayCurrentPhrase,
        toggleText: deps.toggleText,
        nextPhrase: deps.nextPhrase,
        setPracticeMode: deps.setPracticeMode,
        togglePhraseTranslation: deps.togglePhraseTranslation,
        toggleSourceMenu: deps.toggleSourceMenu,
        cycleThemePreference: deps.cycleThemePreference,
        toggleSettingsMenu: deps.toggleSettingsMenu,
        toggleShortcutHelp: deps.toggleShortcutHelp,
        toggleUtilityMenu: deps.toggleUtilityMenu,
        adjustLearnerTextScale: deps.adjustLearnerTextScale,
        resetLearnerTextScale: deps.resetLearnerTextScale,
        adjustPanelBackgroundAlpha: deps.adjustPanelBackgroundAlpha,
        resetPanelBackgroundAlpha: deps.resetPanelBackgroundAlpha,
        toggleAutoPause: deps.toggleAutoPause,
        adjustSlowReplaySpeed: deps.adjustSlowReplaySpeed,
        adjustVideoPlaybackRate: deps.adjustVideoPlaybackRate,
        toggleLayoutLock: deps.toggleLayoutLock,
        resetPanelLayout: deps.resetPanelLayout,
        beginPanelDrag: deps.beginPanelDrag,
        beginPanelResize: deps.beginPanelResize,
        toggleDebug: deps.toggleDebug,
        copyDebug: deps.copyDebug,
        clearDiagnostics: deps.clearDiagnostics,
        refreshSelectedSourceCache: deps.refreshSelectedSourceCache,
        openIssueReportDialog: deps.openIssueReportDialog,
        submitPhraseBoundaryIssue: deps.submitPhraseBoundaryIssue,
      };
    }

    function createIssueReportDialog(panel) {
      return deps.issueReportWorkflow.createIssueReportDialog(panel, {
        getState: deps.getState,
        workspaceDom: deps.workspaceDom,
        iconSvg: deps.iconSvg,
        categories: deps.issueReportCategories,
        closeIssueReportDialog: deps.closeIssueReportDialog,
        submitIssueReport: deps.submitIssueReport,
        copyCurrentIssueReport: deps.copyCurrentIssueReport,
        render: deps.render,
      });
    }

    function createAccountControl(parent) {
      return deps.workspaceDom.createAccountControl(parent, {
        onToggle: deps.toggleAccountMenu,
        onAction: () => {
          const state = deps.getState();
          state.accountMenuOpen = false;
          if (state.accountStatus === "signed-in") {
            deps.disconnectAccount();
          } else {
            deps.connectAccount();
          }
        },
      });
    }

    return {
      createRibbonPanel,
      createIssueReportDialog,
      createAccountControl,
    };
  }

  window.__afShadowingRibbonPanelContentWorkflow = {
    createRibbonPanelController,
  };
})();
