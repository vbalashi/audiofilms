(function audioFilmsPhraseRowsWorkflow() {
  function appendPhraseRow(parent, phrase, index, {
    state = {},
    phraseRows,
    phraseRowsDom,
    selectedSpanWorkflow,
    selectedSpans,
    phraseTranslationState,
    playbackEndMsForPhrase,
    applySpanSelectionDraftPreview,
    clearSpanSelectionDraft,
    selectLookupWord,
    handleWordReplayGesture,
    render,
    requestSelectedSpanTranslation,
    nowMs = () => Date.now(),
  } = {}) {
    const rowState = phraseRows.phraseRowState({
      phrase,
      index,
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      practiceMode: state.practiceMode,
      textVisible: state.textVisible,
      phraseTranslationVisible: state.phraseTranslationVisible,
      translation: phraseTranslationState(phrase, index),
      accountStatus: state.accountStatus,
      playbackEndMs: playbackEndMsForPhrase(state.phrases, index),
    });
    return phraseRowsDom.appendPhraseRow(parent, rowState, {
      phraseIndex: index,
      selectedWord: state.selectedWord,
      selectedSpan: state.selectedSpan,
      spanDraft: state.spanSelectionDraft,
      lastWordReplay: state.lastWordReplay,
      shouldSuppressWordClick: () => Date.now() < state.suppressWordClickUntil,
      onLookupWord: selectLookupWord,
      onWordReplay: handleWordReplayGesture,
      onSpanDraftStart: (phraseIndex, tokenIndex) => selectedSpanWorkflow.startSpanDraft(state, phraseIndex, tokenIndex, {
        applyPreview: applySpanSelectionDraftPreview,
      }),
      onSpanDraftMove: (event, phraseIndex, tokenIndex) => selectedSpanWorkflow.moveSpanDraft(state, event, phraseIndex, tokenIndex, {
        applyPreview: applySpanSelectionDraftPreview,
      }),
      onSpanDraftEnd: (event, phraseIndex, tokenIndex) => selectedSpanWorkflow.endSpanDraft(state, event, phraseIndex, tokenIndex, {
        phrase: state.phrases[phraseIndex],
        selectedSpanFromDraft: selectedSpans.selectedSpanFromDraft,
        render,
        requestSelectedSpanTranslation,
        nowMs: () => nowMs() + 500,
      }),
      onSpanDraftCancel: clearSpanSelectionDraft,
    });
  }

  window.__afShadowingPhraseRowsWorkflow = {
    appendPhraseRow,
  };
})();
