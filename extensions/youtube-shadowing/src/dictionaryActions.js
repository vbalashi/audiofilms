(function audioFilmsDictionaryActions() {
  function frozenDictionaryActionPayload(input = {}) {
    const selectedWord = input.selectedWord || {};
    const card = input.card || {};
    const actionPayload = input.actionPayload || {};
    const action = actionPayload?.action || "";
    const binding = selectedWord.sourceBinding;

    if (!binding?.videoId) {
      return { ok: false, error: "Cannot save progress: the YouTube video identity is unavailable." };
    }
    if (input.currentVideoId && binding.videoId !== input.currentVideoId) {
      return { ok: false, error: "This dictionary card belongs to a previous YouTube video. Click the word again on the current video." };
    }

    const clientEventId = actionPayload?.clientEventId || input.createMutationTurnId();
    const turnId = actionPayload?.turnId || (
      (action === "review-card" || action === "mark-known" || action === "mark-unknown") && input.isUuid(clientEventId)
        ? clientEventId
        : undefined
    );
    const payload = {
      ...actionPayload,
      clientEventId,
      ...(turnId ? { turnId } : {}),
      sourceContext: input.buildSourceContext(binding, card, action),
      entryId: card.entryId,
    };
    return { ok: true, value: payload };
  }

  function pendingFeedback(card, displayAction, action) {
    return cardFeedback(card, {
      status: "pending",
      actionId: displayAction?.id || action,
      message: `${displayAction?.label || "Action"}...`,
    });
  }

  function savedFeedback(card, displayAction, action) {
    return cardFeedback(card, {
      status: "saved",
      actionId: displayAction?.id || action,
      message: actionSuccessMessage(displayAction, action),
    });
  }

  function errorFeedback(card, displayAction, action, error) {
    return cardFeedback(card, {
      status: "error",
      actionId: displayAction?.id || action,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  function cardFeedback(card, feedback) {
    return {
      cardId: card?.id,
      feedback,
    };
  }

  function actionSuccessMessage(displayAction, action) {
    if (action === "start-learning") return "Started learning";
    if (action === "mark-known") return "Marked known";
    const label = displayAction?.label || "Progress";
    return `${label} recorded`;
  }

  window.__afShadowingDictionaryActions = {
    frozenDictionaryActionPayload,
    pendingFeedback,
    savedFeedback,
    errorFeedback,
    actionSuccessMessage,
  };
})();
