(function audioFilmsDictionaryPanelWorkflow() {
  function renderDictionary(panel, {
    state = {},
    dictionaryPresentation,
    dictionaryDom,
    captionTracks,
    clearElement,
    iconSvg,
    renderSelectedSpanCard,
    renderSelectedWordCard,
    renderSelectedSpanLookupPrompt,
    renderAccountCard,
  } = {}) {
    const headerCopy = dictionaryPresentation.dictionaryHeaderCopy({
      selectedSpan: state.selectedSpan,
      selectedWord: state.selectedWord,
      selectedTrackLabel: state.selectedTrack ? captionTracks.describeTrack(state.selectedTrack) : "",
    });
    const panelState = dictionaryPresentation.dictionaryPanelState({
      selectedSpan: state.selectedSpan,
      selectedWord: state.selectedWord,
      examplesExpanded: state.examplesExpanded,
    });
    const body = dictionaryDom.renderDictionaryPanelShell(panel, {
      headerCopy,
      panelState,
      clearElement,
      iconSvg,
    });
    if (state.selectedSpan) {
      renderSelectedSpanCard(body);
      if (state.selectedWord) {
        renderSelectedWordCard(body);
      } else {
        renderSelectedSpanLookupPrompt(body);
      }
    } else if (state.selectedWord) {
      renderSelectedWordCard(body);
    } else {
      renderAccountCard(body);
    }
    return body;
  }

  window.__afShadowingDictionaryPanelWorkflow = {
    renderDictionary,
  };
})();
