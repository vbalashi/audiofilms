(function audioFilmsDisplayStateContentWorkflow() {
  function createDisplayStateController(deps = {}) {
    function displayPreferenceWorkflowOptions() {
      return {
        displayPreferences: deps.displayPreferences,
        menuState: deps.menuState,
        playbackSession: deps.playbackSession,
        playbackRateOptions: deps.playbackRateOptions,
        getVideoElement: deps.getVideoElement,
        updateDisplayPreferences: deps.updateDisplayPreferences,
        recordDebugEvent: deps.recordDebugEvent,
        render: deps.render,
      };
    }

    function uiStateWorkflowOptions() {
      return {
        document: deps.document,
        Element: deps.Element,
        rootId: deps.rootId,
        displayPreferences: deps.displayPreferences,
        menuState: deps.menuState,
        requestAnimationFrame: deps.requestAnimationFrame,
        updateDisplayPreferences: deps.updateDisplayPreferences,
        render: deps.render,
      };
    }

    function toggleUtilityMenu(event) {
      return deps.displayPreferenceWorkflow.toggleExclusiveMenu(deps.getState(), "utility", event, displayPreferenceWorkflowOptions());
    }

    function toggleSettingsMenu(event) {
      return deps.displayPreferenceWorkflow.toggleExclusiveMenu(deps.getState(), "settings", event, displayPreferenceWorkflowOptions());
    }

    function toggleShortcutHelp(event) {
      return deps.displayPreferenceWorkflow.toggleExclusiveMenu(deps.getState(), "help", event, displayPreferenceWorkflowOptions());
    }

    function toggleAccountMenu(event) {
      return deps.displayPreferenceWorkflow.toggleExclusiveMenu(deps.getState(), "account", event, displayPreferenceWorkflowOptions());
    }

    function cycleThemePreference(event) {
      return deps.displayPreferenceWorkflow.cycleThemePreference(deps.getState(), event, displayPreferenceWorkflowOptions());
    }

    function adjustLearnerTextScale(delta) {
      return deps.displayPreferenceWorkflow.adjustLearnerTextScale(delta, displayPreferenceWorkflowOptions());
    }

    function resetLearnerTextScale() {
      return deps.displayPreferenceWorkflow.resetLearnerTextScale(displayPreferenceWorkflowOptions());
    }

    function adjustPanelBackgroundAlpha(delta) {
      return deps.displayPreferenceWorkflow.adjustPanelBackgroundAlpha(delta, displayPreferenceWorkflowOptions());
    }

    function resetPanelBackgroundAlpha() {
      return deps.displayPreferenceWorkflow.resetPanelBackgroundAlpha(displayPreferenceWorkflowOptions());
    }

    function adjustSlowReplaySpeed(delta) {
      return deps.displayPreferenceWorkflow.adjustSlowReplaySpeed(delta, displayPreferenceWorkflowOptions());
    }

    function adjustVideoPlaybackRate(delta) {
      return deps.displayPreferenceWorkflow.adjustVideoPlaybackRate(deps.getState(), delta, displayPreferenceWorkflowOptions());
    }

    function setVideoPlaybackRate(rate, reason = "playback-rate") {
      return deps.displayPreferenceWorkflow.setVideoPlaybackRate(deps.getState(), rate, {
        ...displayPreferenceWorkflowOptions(),
        reason,
      });
    }

    function applyThemeAttributes() {
      return deps.uiStateWorkflow.applyThemeAttributes(deps.getState(), uiStateWorkflowOptions());
    }

    function toggleAllExamples(event) {
      return deps.uiStateWorkflow.toggleAllExamples(deps.getState(), event, uiStateWorkflowOptions());
    }

    function toggleCardExpanded(cardId) {
      return deps.uiStateWorkflow.toggleCardExpanded(deps.getState(), cardId, uiStateWorkflowOptions());
    }

    function cardExpanded(cardId) {
      return deps.uiStateWorkflow.cardExpanded(deps.getState(), cardId);
    }

    function closeOpenMenus() {
      return deps.uiStateWorkflow.closeOpenMenus(deps.getState(), uiStateWorkflowOptions());
    }

    function focusMenuTrigger(trigger) {
      return deps.uiStateWorkflow.focusMenuTrigger(trigger, uiStateWorkflowOptions());
    }

    function onDocumentPointerDown(event) {
      return deps.uiStateWorkflow.onDocumentPointerDown(deps.getState(), event, uiStateWorkflowOptions());
    }

    return {
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
    };
  }

  window.__afShadowingDisplayStateContentWorkflow = {
    createDisplayStateController,
  };
})();
