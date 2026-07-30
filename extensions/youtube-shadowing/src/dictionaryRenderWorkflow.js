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
      renderSenseCardGroup: (parent, cards) => renderSenseCardGroup(parent, cards, options),
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
    if (options.senseCardPresentation?.isSenseCard(card)) {
      const translationVisible = Boolean(
        card?.id && options.state.visibleTranslationsByCardId?.[card.id] === true
      );
      const preferences = options.state.accountPreferences || {};
      const view = options.senseCardPresentation.cardViewModel(card, {
        interfaceLanguageCode: options.senseCardPresentation.interfaceLanguageCode(
          preferences,
          options.browserLanguage,
        ),
        browserLanguage: options.browserLanguage,
        translationTargetLanguageCode: preferences.translationTargetLanguageCode || "",
        translationVisible,
        overlayTranslation: options.state.selectedWord?.translationsByCardId?.[card.id] || null,
        canRequestTranslation: options.dictionaryPresentation.cardCanRequestTranslation(card),
      });
      return options.senseCardDom.renderSenseCard(parent, view, {
        iconSvg: options.iconSvg,
        onTranslation: () => options.performDisplayAction(card, {
          id: "translate",
          label: translationVisible ? view.labels.hideTranslation : view.labels.showTranslation,
          command: { kind: "card-translation" },
        }),
        onAction: (action) => options.performDisplayAction(card, action),
        onReport: (reportAction) => options.reportCardDictionaryIssue?.(card, reportAction),
      });
    }
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

  function renderSenseCardGroup(parent, cards, options = {}) {
    const semanticCards = (cards || []).filter(
      (card) => options.senseCardPresentation?.isSenseCard(card),
    );
    if (!semanticCards.length) return null;
    const preferences = options.state.accountPreferences || {};
    const expansionOverrides = options.state.exampleExpansionOverrides || {};
    const expandedByEntryId = Object.fromEntries(
      semanticCards
        .filter((card) =>
          Object.prototype.hasOwnProperty.call(expansionOverrides, card.entryId))
        .map((card) => [card.entryId, expansionOverrides[card.entryId] === true]),
    );
    const translationVisibleByEntryId = Object.fromEntries(
      semanticCards.map((card) => [
        card.entryId,
        options.state.visibleTranslationsByCardId?.[card.entryId] === true,
      ]),
    );
    const overlayTranslationByEntryId = Object.fromEntries(
      semanticCards.map((card) => [
        card.entryId,
        options.state.selectedWord?.translationsByCardId?.[card.id] || null,
      ]),
    );
    const view = options.senseCardPresentation.groupViewModel(semanticCards, {
      interfaceLanguageCode: options.senseCardPresentation.interfaceLanguageCode(
        preferences,
        options.browserLanguage,
      ),
      browserLanguage: options.browserLanguage,
      translationTargetLanguageCode: preferences.translationTargetLanguageCode || "",
      expandedByEntryId,
      translationVisibleByEntryId,
      overlayTranslationByEntryId,
      canRequestTranslation: true,
    });
    const cardsByEntryId = new Map(semanticCards.map((card) => [card.entryId, card]));
    return options.senseCardDom.renderSenseCardGroup(parent, view, {
      iconSvg: options.iconSvg,
      onTranslation: () => options.toggleSenseCardGroupTranslation?.(semanticCards),
      onToggleExpanded: (entryId) => {
        const meaning = view.meanings.find((candidate) => candidate.entryId === entryId);
        options.toggleCardExpanded?.(entryId, meaning?.expanded === true);
      },
      onAction: (entryId, action) => {
        const card = cardsByEntryId.get(entryId);
        if (card) options.performDisplayAction(card, action);
      },
      onReport: (entryId, reportAction) => {
        const card = cardsByEntryId.get(entryId);
        if (card) options.reportCardDictionaryIssue?.(card, reportAction);
      },
      onAudio: options.playHeadwordAudio
        ? () => options.playHeadwordAudio(semanticCards[0])
        : null,
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
    renderSenseCardGroup,
    renderOverlayCardTitle,
    renderOverlaySections,
    renderReviewActions,
    renderConnectPrompt,
  };
})();
