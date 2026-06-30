(function audioFilmsRibbonContentWorkflow() {
  function createRibbonContentController(deps = {}) {
    function renderSourceSelector(track, sourceToggle, sourceMenu) {
      return deps.sourceSelectorWorkflow.renderSourceSelector(track, sourceToggle, sourceMenu, {
        state: deps.getState(),
        getSelectedPracticeSource: deps.getSelectedPracticeSource,
        practiceReadiness: deps.practiceReadiness,
        timingOperationState: deps.timingOperationState,
        userFacingSourceLabel: deps.userFacingSourceLabel,
        sourceSelector: deps.sourceSelector,
        sourceSelectorDom: deps.sourceSelectorDom,
        sourceReadiness: deps.sourceReadiness,
        sourceLabels: deps.sourceLabels,
        captionTracks: deps.captionTracks,
        clearElement: deps.clearElement,
        onGetCaptions: () => {
          deps.getState().sourceMenuOpen = false;
          deps.refreshSelectedSourceCache();
        },
        onImproveTiming: () => deps.startImproveTiming(),
        onSelectSource: deps.selectPracticeSource,
      });
    }

    function appendPhraseRow(parent, phrase, index) {
      return deps.phraseRowsWorkflow.appendPhraseRow(parent, phrase, index, {
        state: deps.getState(),
        phraseRows: deps.phraseRows,
        phraseRowsDom: deps.phraseRowsDom,
        selectedSpanWorkflow: deps.selectedSpanWorkflow,
        selectedSpans: deps.selectedSpans,
        phraseTranslationState: deps.phraseTranslationState,
        playbackEndMsForPhrase: deps.playbackEndMsForPhrase,
        applySpanSelectionDraftPreview: deps.applySpanSelectionDraftPreview,
        clearSpanSelectionDraft: deps.clearSpanSelectionDraft,
        selectLookupWord: deps.selectLookupWord,
        handleWordReplayGesture: deps.handleWordReplayGesture,
        render: deps.render,
        requestSelectedSpanTranslation: deps.requestSelectedSpanTranslation,
      });
    }

    return {
      renderSourceSelector,
      appendPhraseRow,
    };
  }

  window.__afShadowingRibbonContentWorkflow = {
    createRibbonContentController,
  };
})();
