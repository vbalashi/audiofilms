(function audioFilmsRibbonRuntimeContentFacade() {
  function createRibbonRuntimeController(deps = {}) {
    const modules = deps.modules || {};
    const commands = deps.commands || {};
    const constants = deps.constants || {};
    const environment = deps.environment || {};

    function renderRibbon(panel) {
      return modules.ribbonWorkflowApi.renderRibbon(panel, {
        getState: deps.getState,
        practiceReadiness: commands.source.practiceReadiness,
        phraseTranslationState: commands.translation.phraseTranslationState,
        getSelectedPracticeSource: commands.source.getSelectedPracticeSource,
        ribbonControls: modules.ribbonControlsApi,
        ribbonPanelDom: modules.ribbonPanelDomApi,
        iconSvg: deps.iconSvg,
        renderSourceSelector: commands.surface.renderSourceSelector,
        renderAccountControl: commands.dictionary.renderAccountControl,
        renderDisplayToggleButton,
        renderDisplayPreferenceControls,
        renderPlaybackRateControls,
        renderIssueReportDialog: commands.issue.renderIssueReportDialog,
        positionUtilityMenu,
        positionIssueReportDialog,
        clearElement: modules.domUtilsApi.clearElement,
        appendRibbonMessage,
        appendPhraseRow: commands.surface.appendPhraseRow,
      });
    }

    function renderDisplayToggleButton(button, options) {
      modules.ribbonDomApi.renderDisplayToggleButton(button, {
        html: modules.ribbonControlsApi.displayToggleButtonHtml(options),
      });
    }

    function renderDisplayPreferenceControls(controls) {
      const state = deps.getState();
      const controlState = modules.displayPreferencesApi.displayPreferenceControlState({
        preferences: state.displayPreferences,
        autoPause: state.autoPause,
        hasCustomPanelLayout: commands.layout.hasCustomPanelLayout(),
      });
      modules.ribbonDomApi.renderDisplayPreferenceControls(controls, controlState, {
        formatPlaybackRate: commands.playback.formatPlaybackRate,
      });
    }

    function renderPlaybackRateControls(controls) {
      const rate = commands.playback.syncPlaybackRateFromVideo();
      const controlState = modules.ribbonControlsApi.playbackRateControlState({
        rate,
        min: constants.playbackRateMin,
        max: constants.playbackRateMax,
        fallback: 1,
      });
      modules.ribbonDomApi.renderPlaybackRateControls(controls, controlState);
    }

    function positionUtilityMenu(panel, utilityMenu, isOpen = deps.getState().utilityMenuOpen) {
      modules.ribbonDomApi.positionUtilityMenu(panel, utilityMenu, isOpen, environment.requestAnimationFrame);
    }

    function positionIssueReportDialog(panel, issueDialog) {
      modules.ribbonDomApi.positionIssueReportDialog(
        panel,
        issueDialog,
        deps.getState().issueDialogOpen,
        environment.requestAnimationFrame,
      );
    }

    function appendRibbonMessage(parent, text) {
      const message = environment.document.createElement("div");
      message.className = "af-ribbon-message";
      message.textContent = text;
      parent.appendChild(message);
      return message;
    }

    return {
      renderRibbon,
      renderDisplayToggleButton,
      renderDisplayPreferenceControls,
      renderPlaybackRateControls,
      positionUtilityMenu,
      positionIssueReportDialog,
      appendRibbonMessage,
    };
  }

  window.__afShadowingRibbonRuntimeContentFacade = {
    createRibbonRuntimeController,
  };
})();
