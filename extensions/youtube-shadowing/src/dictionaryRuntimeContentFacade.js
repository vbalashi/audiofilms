(function audioFilmsDictionaryRuntimeContentFacade() {
  function createDictionaryRuntimeController() {
    let dictionaryController = null;

    function bindController(controller) {
      dictionaryController = controller;
      return api;
    }

    function controller() {
      if (!dictionaryController) {
        throw new Error("Dictionary runtime controller used before binding");
      }
      return dictionaryController;
    }

    const api = {
      bindController,
      toggleCardTranslation: (card) => controller().toggleCardTranslation(card),
      setCardTranslationPending: (cardId, pending) => controller().setCardTranslationPending(cardId, pending),
      renderDictionary: (panel) => controller().renderDictionary(panel),
      renderAccountControl: (account, accountMenu, accountCopy, accountAction) =>
        controller().renderAccountControl(account, accountMenu, accountCopy, accountAction),
      dictionaryHeaderCopy: () => controller().dictionaryHeaderCopy(),
      renderAccountCard: (parent) => controller().renderAccountCard(parent),
      renderSelectedWordCard: (parent) => controller().renderSelectedWordCard(parent),
      renderSelectedSpanCard: (parent) => controller().renderSelectedSpanCard(parent),
      renderSelectedSpanTitle: (parent, span) => controller().renderSelectedSpanTitle(parent, span),
      renderSelectedSpanLookupPrompt: (parent) => controller().renderSelectedSpanLookupPrompt(parent),
      renderGeneratedFallback: (parent, selectedWord) => controller().renderGeneratedFallback(parent, selectedWord),
      renderOverlayCard: (parent, card, options = {}) => controller().renderOverlayCard(parent, card, options),
      renderOverlayCardTitle: (parent, card) => controller().renderOverlayCardTitle(parent, card),
      renderOverlaySections: (parent, sections, card, translation = null) =>
        controller().renderOverlaySections(parent, sections, card, translation),
      renderReviewActions: (parent, card = null) => controller().renderReviewActions(parent, card),
      renderConnectPrompt: (parent) => controller().renderConnectPrompt(parent),
      selectLookupWord: (word, phraseIndex, selection = {}, options = {}) =>
        controller().selectLookupWord(word, phraseIndex, selection, options),
      lookupSelectedWord: (selectedWord) => controller().lookupSelectedWord(selectedWord),
      loadGroupedDictionarySearch: (selectedWord, contextText, options = {}) =>
        controller().loadGroupedDictionarySearch(selectedWord, contextText, options),
      toggleDictionarySearchItem: (selectedWord, group, item, itemKey) =>
        controller().toggleDictionarySearchItem(selectedWord, group, item, itemKey),
      loadDictionarySearchItemCard: (selectedWord, item, itemKey) =>
        controller().loadDictionarySearchItemCard(selectedWord, item, itemKey),
      requestDictionaryCardTranslation: (card) => controller().requestDictionaryCardTranslation(card),
    };

    return api;
  }

  window.__afShadowingDictionaryRuntimeContentFacade = {
    createDictionaryRuntimeController,
  };
})();
