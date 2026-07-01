(function audioFilmsDictionaryContentWorkflow() {
  function createDictionaryController(deps = {}) {
    function dictionaryRenderWorkflowOptions() {
      return {
        state: deps.getState(),
        dictionaryPanelWorkflow: deps.dictionaryPanelWorkflow,
        dictionaryPresentation: deps.dictionaryPresentation,
        dictionaryDom: deps.dictionaryDom,
        dictionarySearchDom: deps.dictionarySearchDom,
        dictionarySearchWorkflow: deps.dictionarySearchWorkflow,
        dictionaryOverlayWorkflow: deps.dictionaryOverlayWorkflow,
        captionTracks: deps.captionTracks,
        selectedSpans: deps.selectedSpans,
        selectedSpansDom: deps.selectedSpansDom,
        selectedSpanWorkflow: deps.selectedSpanWorkflow,
        generatedEntries: deps.generatedEntries,
        accountSession: deps.accountSession,
        accountSessionDom: deps.accountSessionDom,
        ribbonDom: deps.ribbonDom,
        clearElement: deps.clearElement,
        iconSvg: deps.iconSvg,
        renderSelectedSpanCard,
        renderSelectedWordCard,
        renderSelectedSpanLookupPrompt,
        renderAccountCard,
        renderOverlayCard,
        renderGeneratedFallback,
        renderConnectPrompt,
        renderOverlayCardTitle,
        renderCardActionMenu: deps.renderCardActionMenu,
        renderOverlaySections,
        renderReviewActions,
        selectLookupWord,
        toggleDictionarySearchItem,
        loadGroupedDictionarySearch,
        saveSelectedSpanCard: deps.saveSelectedSpanCard,
        clearSelectedSpan: deps.clearSelectedSpan,
        generateDictionaryDraft: deps.generateDictionaryDraft,
        performDisplayAction: deps.performDisplayAction,
        toggleCardMenu: deps.toggleCardMenu,
        cardAudioPlayable: deps.cardAudioPlayable,
        playHeadwordAudio: deps.playHeadwordAudio,
        cardExpanded: deps.cardExpanded,
        toggleCardExpanded: deps.toggleCardExpanded,
        handleAccountAction: deps.handleAccountAction,
        render: deps.render,
      };
    }

    function dictionaryLookupWorkflowOptions() {
      const state = deps.getState();
      return {
        getState: deps.getState,
        getSelectedWord: () => deps.getState().selectedWord,
        setSelectedWord: (selectedWord) => {
          deps.getState().selectedWord = selectedWord;
        },
        createDictionarySourceBinding: deps.createDictionarySourceBinding,
        phraseForSelectedWord: (selectedWord) =>
          selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || state.phrases[state.currentIndex],
        getSelectedPracticeSource: deps.getSelectedPracticeSource,
        dictionaryCommands: deps.dictionaryCommands,
        dictionaryState: deps.dictionaryState,
        dictionaryPresentation: deps.dictionaryPresentation,
        phraseTranslations: deps.phraseTranslations,
        fetchDictionaryResult: deps.fetchDictionaryResult,
        fetchDictionarySearchResult: deps.fetchDictionarySearchResult,
        postDictionaryCommand: deps.postDictionaryCommand,
        phraseProgressStore: deps.phraseProgressStore,
        lookupSelectedWord,
        isCurrentLookup: deps.isCurrentLookup,
        loadGroupedDictionarySearch,
        loadDictionarySearchItemCard,
        requestDictionaryCardTranslation,
        getVisibleTranslationsByCardId: () => deps.getState().visibleTranslationsByCardId,
        setVisibleTranslationsByCardId: (visibleTranslationsByCardId) => {
          deps.getState().visibleTranslationsByCardId = visibleTranslationsByCardId;
        },
        getTranslationPendingByCardId: () => deps.getState().translationPendingByCardId,
        setTranslationPendingByCardId: (translationPendingByCardId) => {
          deps.getState().translationPendingByCardId = translationPendingByCardId;
        },
        generatedDraftItemFromOverlayCard: deps.generatedDraftItemFromOverlayCard,
        recordDebugEvent: deps.recordDebugEvent,
        render: deps.render,
      };
    }

    function toggleCardTranslation(card) {
      return deps.dictionaryLookupWorkflow.toggleCardTranslation(card, dictionaryLookupWorkflowOptions());
    }

    function setCardTranslationPending(cardId, pending) {
      return deps.dictionaryLookupWorkflow.setCardTranslationPending(cardId, pending, dictionaryLookupWorkflowOptions());
    }

    function renderDictionary(panel) {
      return deps.dictionaryRenderWorkflow.renderDictionary(panel, dictionaryRenderWorkflowOptions());
    }

    function renderAccountControl(account, accountMenu, accountCopy, accountAction) {
      return deps.dictionaryRenderWorkflow.renderAccountControl(
        account,
        accountMenu,
        accountCopy,
        accountAction,
        dictionaryRenderWorkflowOptions(),
      );
    }

    function dictionaryHeaderCopy() {
      return deps.dictionaryRenderWorkflow.dictionaryHeaderCopy(dictionaryRenderWorkflowOptions());
    }

    function renderAccountCard(parent) {
      return deps.dictionaryRenderWorkflow.renderAccountCard(parent, dictionaryRenderWorkflowOptions());
    }

    function renderSelectedWordCard(parent) {
      return deps.dictionaryRenderWorkflow.renderSelectedWordCard(parent, dictionaryRenderWorkflowOptions());
    }

    function renderSelectedSpanCard(parent) {
      return deps.dictionaryRenderWorkflow.renderSelectedSpanCard(parent, dictionaryRenderWorkflowOptions());
    }

    function renderSelectedSpanTitle(parent, span) {
      return deps.dictionaryRenderWorkflow.renderSelectedSpanTitle(parent, span, dictionaryRenderWorkflowOptions());
    }

    function renderSelectedSpanLookupPrompt(parent) {
      return deps.dictionaryRenderWorkflow.renderSelectedSpanLookupPrompt(parent, dictionaryRenderWorkflowOptions());
    }

    function renderGeneratedFallback(parent, selectedWord) {
      return deps.dictionaryRenderWorkflow.renderGeneratedFallback(parent, selectedWord, dictionaryRenderWorkflowOptions());
    }

    function renderOverlayCard(parent, card, options = {}) {
      return deps.dictionaryRenderWorkflow.renderOverlayCard(parent, card, options, dictionaryRenderWorkflowOptions());
    }

    function renderOverlayCardTitle(parent, card) {
      return deps.dictionaryRenderWorkflow.renderOverlayCardTitle(parent, card, dictionaryRenderWorkflowOptions());
    }

    function renderOverlaySections(parent, sections, card, translation = null) {
      return deps.dictionaryRenderWorkflow.renderOverlaySections(parent, sections, card, translation, dictionaryRenderWorkflowOptions());
    }

    function renderReviewActions(parent, card = null) {
      return deps.dictionaryRenderWorkflow.renderReviewActions(parent, card, dictionaryRenderWorkflowOptions());
    }

    function renderConnectPrompt(parent) {
      return deps.dictionaryRenderWorkflow.renderConnectPrompt(parent, dictionaryRenderWorkflowOptions());
    }

    function selectLookupWord(word, phraseIndex, selection = {}, options = {}) {
      return deps.dictionaryLookupWorkflow.selectLookupWord(word, phraseIndex, selection, options, dictionaryLookupWorkflowOptions());
    }

    function lookupSelectedWord(selectedWord) {
      return deps.dictionaryLookupWorkflow.lookupSelectedWord(selectedWord, dictionaryLookupWorkflowOptions());
    }

    function loadGroupedDictionarySearch(selectedWord, contextText, options = {}) {
      return deps.dictionaryLookupWorkflow.loadGroupedDictionarySearch(selectedWord, contextText, {
        ...dictionaryLookupWorkflowOptions(),
        group: options.group || null,
        cursor: options.cursor || null,
      });
    }

    function toggleDictionarySearchItem(selectedWord, group, item, itemKey) {
      return deps.dictionaryLookupWorkflow.toggleDictionarySearchItem(selectedWord, item, itemKey, dictionaryLookupWorkflowOptions());
    }

    function loadDictionarySearchItemCard(selectedWord, item, itemKey) {
      return deps.dictionaryLookupWorkflow.loadDictionarySearchItemCard(selectedWord, item, itemKey, dictionaryLookupWorkflowOptions());
    }

    function requestDictionaryCardTranslation(card) {
      return deps.dictionaryLookupWorkflow.requestDictionaryCardTranslation(card, dictionaryLookupWorkflowOptions());
    }

    return {
      toggleCardTranslation,
      setCardTranslationPending,
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
      selectLookupWord,
      lookupSelectedWord,
      loadGroupedDictionarySearch,
      toggleDictionarySearchItem,
      loadDictionarySearchItemCard,
      requestDictionaryCardTranslation,
    };
  }

  window.__afShadowingDictionaryContentWorkflow = {
    createDictionaryController,
  };
})();
