(function audioFilmsDictionaryRenderWorkflow() {
  function renderDictionary(panel, options = {}) {
    return options.dictionaryPanelWorkflow.renderDictionary(panel, {
      state: options.state,
      dictionaryPresentation: options.dictionaryPresentation,
      dictionaryDom: options.dictionaryDom,
      captionTracks: options.captionTracks,
      clearElement: options.clearElement,
      iconSvg: options.iconSvg,
      renderSelectedSpanCard: options.renderSelectedSpanCard,
      renderSelectedWordCard: options.renderSelectedWordCard,
      renderSelectedSpanLookupPrompt: options.renderSelectedSpanLookupPrompt,
      renderAccountCard: options.renderAccountCard,
    });
  }

  function renderAccountControl(account, accountMenu, accountCopy, accountAction, options = {}) {
    const accountState = options.accountSession.accountControlState(options.state);
    options.ribbonDom.renderAccountControl(
      { account, accountMenu, accountCopy, accountAction },
      accountState,
      {
        clearElement: options.clearElement,
        iconSvg: options.iconSvg,
      },
    );
  }

  function dictionaryHeaderCopy(options = {}) {
    const state = options.state;
    return options.dictionaryPresentation.dictionaryHeaderCopy({
      selectedSpan: state.selectedSpan,
      selectedWord: state.selectedWord,
      selectedTrackLabel: state.selectedTrack ? options.captionTracks.describeTrack(state.selectedTrack) : "",
    });
  }

  function renderAccountCard(parent, options = {}) {
    const accountState = options.accountSession.accountMiniCardState(options.state);
    options.accountSessionDom.renderAccountCard(parent, accountState, {
      onAccountAction: options.handleAccountAction,
    });
  }

  function renderSelectedWordCard(parent, options = {}) {
    return options.dictionarySearchWorkflow.renderSelectedWordCard(parent, {
      getState: () => options.state,
      dictionaryPresentation: options.dictionaryPresentation,
      dictionaryDom: options.dictionaryDom,
      dictionarySearchDom: options.dictionarySearchDom,
      renderOverlayCard: options.renderOverlayCard,
      renderGeneratedFallback: options.renderGeneratedFallback,
      selectLookupWord: options.selectLookupWord,
      toggleDictionarySearchItem: options.toggleDictionarySearchItem,
      loadGroupedDictionarySearch: options.loadGroupedDictionarySearch,
      render: options.render,
    });
  }

  function renderSelectedSpanCard(parent, options = {}) {
    return options.selectedSpanWorkflow.renderSelectedSpanCard(parent, {
      getSelectedSpan: () => options.state.selectedSpan,
      selectedSpans: options.selectedSpans,
      selectedSpansDom: options.selectedSpansDom,
      dictionaryPresentation: options.dictionaryPresentation,
      renderTranslationField: options.dictionaryDom.renderTranslationField,
      selectLookupWord: options.selectLookupWord,
      saveSelectedSpanCard: options.saveSelectedSpanCard,
      clearSelectedSpan: options.clearSelectedSpan,
    });
  }

  function renderSelectedSpanTitle(parent, span, options = {}) {
    const titleState = options.selectedSpans.selectedSpanTitleState(span);
    options.selectedSpansDom.renderSelectedSpanTitle(parent, titleState, {
      onLookupWord: (token) => options.selectLookupWord(token.lookupWord, span.phraseIndex, {
        tokenIndex: token.selection.tokenIndex,
        charStart: token.selection.charStart,
        charEnd: token.selection.charEnd,
        originalToken: token.selection.originalToken,
      }, {
        preserveSelectedSpan: true,
      }),
    });
  }

  function renderSelectedSpanLookupPrompt(parent, options = {}) {
    options.selectedSpansDom.renderSelectedSpanLookupPrompt(parent);
  }

  function renderGeneratedFallback(parent, selectedWord, options = {}) {
    const fallbackState = options.generatedEntries.generatedFallbackState(selectedWord, options.state.accountStatus);
    options.dictionaryDom.renderGeneratedFallback(parent, fallbackState, {
      renderCard: options.renderOverlayCard,
      renderConnectPrompt: options.renderConnectPrompt,
      onGenerate: () => options.generateDictionaryDraft(selectedWord),
    });
  }

  function renderOverlayCard(parent, card, cardOptions = {}, options = {}) {
    return options.dictionaryOverlayWorkflow.renderOverlayCard(parent, card, {
      state: options.state,
      collapseAction: cardOptions.collapseAction,
      dictionaryPresentation: options.dictionaryPresentation,
      dictionaryDom: options.dictionaryDom,
      generatedEntries: options.generatedEntries,
      iconSvg: options.iconSvg,
      performDisplayAction: options.performDisplayAction,
      toggleCardMenu: options.toggleCardMenu,
      renderOverlayCardTitle: options.renderOverlayCardTitle,
      renderCardActionMenu: options.renderCardActionMenu,
      renderOverlaySections: options.renderOverlaySections,
      renderReviewActions: options.renderReviewActions,
    });
  }

  function renderOverlayCardTitle(parent, card, options = {}) {
    return options.dictionaryOverlayWorkflow.renderOverlayCardTitle(parent, card, {
      state: options.state,
      dictionaryPresentation: options.dictionaryPresentation,
      dictionaryDom: options.dictionaryDom,
      clearElement: options.clearElement,
      iconSvg: options.iconSvg,
      cardAudioPlayable: options.cardAudioPlayable,
      playHeadwordAudio: options.playHeadwordAudio,
    });
  }

  function renderOverlaySections(parent, sections, card, translation = null, options = {}) {
    return options.dictionaryOverlayWorkflow.renderOverlaySections(parent, sections, card, translation, {
      state: options.state,
      dictionaryPresentation: options.dictionaryPresentation,
      dictionaryDom: options.dictionaryDom,
      iconSvg: options.iconSvg,
      cardExpanded: options.cardExpanded,
      toggleCardExpanded: options.toggleCardExpanded,
    });
  }

  function renderReviewActions(parent, card = null, options = {}) {
    const feedback = options.state.cardActionFeedbackByCardId[card?.id];
    const actionStates = options.dictionaryPresentation.reviewActionStates({ card, feedback });
    if (!actionStates.length) {
      if (options.state.accountStatus !== "signed-in") {
        renderConnectPrompt(parent, options);
      }
      return;
    }
    options.dictionaryDom.renderReviewActions(parent, actionStates, {
      onAction: (displayAction) => options.performDisplayAction(card, displayAction),
    });
  }

  function renderConnectPrompt(parent, options = {}) {
    const promptState = options.accountSession.connectPromptState(options.state);
    options.accountSessionDom.renderConnectPrompt(parent, promptState, {
      onAccountAction: options.handleAccountAction,
    });
  }

  window.__afShadowingDictionaryRenderWorkflow = {
    renderDictionary,
    renderAccountControl,
    dictionaryHeaderCopy,
    renderAccountCard,
    renderSelectedWordCard,
    renderSelectedSpanCard,
    renderSelectedSpanTitle,
    renderSelectedSpanLookupPrompt,
    renderGeneratedFallback,
    renderOverlayCard,
    renderOverlayCardTitle,
    renderOverlaySections,
    renderReviewActions,
    renderConnectPrompt,
  };
})();
