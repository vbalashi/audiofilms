(function audioFilmsDictionaryActionWorkflow() {
  const dictionaryActionApi = window.__afShadowingDictionaryActions;

  async function performDictionaryCardAction(card, displayAction, actionPayload, options = {}) {
    if (!card?.entryId || !options.getSelectedWord?.()) return;

    const selectedWord = options.getSelectedWord();
    const action = actionPayload?.action || "";
    const payload = options.buildPayload?.(selectedWord, card, actionPayload);
    if (!payload?.ok) {
      options.setSelectedWord?.({
        ...options.getSelectedWord(),
        cardActionStatus: "",
        cardActionError: payload?.error || "Dictionary action cannot be saved.",
      });
      options.render?.();
      return;
    }

    const pendingFeedback = dictionaryActionApi.pendingFeedback(card, displayAction, action);
    options.setSelectedWord?.({
      ...options.getSelectedWord(),
      cardActionError: "",
    });
    options.setCardFeedback?.(pendingFeedback.cardId, pendingFeedback.feedback);
    options.render?.();

    try {
      await options.postDictionaryCommand("dict-action", payload.value);
      if (!options.isCurrentLookup?.(selectedWord)) return;
      const savedFeedback = dictionaryActionApi.savedFeedback(card, displayAction, action);
      options.setCardFeedback?.(savedFeedback.cardId, savedFeedback.feedback);
      options.setSelectedWord?.({
        ...options.getSelectedWord(),
        cardActionError: "",
      });
      options.render?.();
      if (action !== "start-learning") {
        await options.reloadLookup?.(options.getSelectedWord());
      }
    } catch (error) {
      if (!options.isCurrentLookup?.(selectedWord)) return;
      const failedFeedback = dictionaryActionApi.errorFeedback(card, displayAction, action, error);
      options.setCardFeedback?.(failedFeedback.cardId, failedFeedback.feedback);
      options.setSelectedWord?.({
        ...options.getSelectedWord(),
        cardActionStatus: "",
        cardActionError: error?.message || String(error),
      });
      options.render?.();
    }
  }

  window.__afShadowingDictionaryActionWorkflow = {
    performDictionaryCardAction,
  };
})();
