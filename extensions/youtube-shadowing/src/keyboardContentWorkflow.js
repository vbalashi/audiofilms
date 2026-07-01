(function audioFilmsKeyboardContentWorkflow() {
  function createKeyboardController(deps = {}) {
    function keyboardWorkflowOptions() {
      return {
        getState: deps.getState,
        isWatchPage: deps.isWatchPage,
        keyboardShortcuts: deps.keyboardShortcuts,
        toggleContinuousPlayback: deps.toggleContinuousPlayback,
        clearSpanSelectionDraft: deps.clearSpanSelectionDraft,
        closeOpenMenus: deps.closeOpenMenus,
        closeIssueReportDialog: deps.closeIssueReportDialog,
        toggleShortcutHelp: deps.toggleShortcutHelp,
        nextPhrase: deps.nextPhrase,
        previousPhrase: deps.previousPhrase,
        replayCurrentPhrase: deps.replayCurrentPhrase,
        toggleText: deps.toggleText,
        adjustVideoPlaybackRate: deps.adjustVideoPlaybackRate,
        togglePhraseTranslation: deps.togglePhraseTranslation,
        setPracticeMode: deps.setPracticeMode,
        playbackRateStep: deps.playbackRateStep,
      };
    }

    function onKeyboardEvent(event) {
      return deps.keyboardWorkflow.handleKeyboardEvent(event, keyboardWorkflowOptions());
    }

    return {
      onKeyboardEvent,
    };
  }

  window.__afShadowingKeyboardContentWorkflow = {
    createKeyboardController,
  };
})();
