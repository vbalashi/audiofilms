(function audioFilmsDictionaryLookupWorkflow() {
  function selectLookupWord(word, phraseIndex, selection = {}, selectOptions = {}, options = {}) {
    const state = options.getState();
    const lookupSeq = state.dictionaryLookupSeq + 1;
    const sourceBinding = options.createDictionarySourceBinding(word, phraseIndex, selection);
    state.dictionaryLookupSeq = lookupSeq;
    state.exampleExpansionOverrides = {};
    state.visibleTranslationsByCardId = {};
    state.translationPendingByCardId = {};
    state.cardActionFeedbackByCardId = {};
    state.cardMenuOpenId = "";
    state.cardMenuFeedbackByCardId = {};
    if (!selectOptions.preserveSelectedSpan) {
      state.selectedSpan = null;
    }
    state.selectedWord = options.dictionaryState.initialSelectedWord({
      word,
      phraseIndex,
      selection,
      sourceBinding,
      preserveSelectedSpan: selectOptions.preserveSelectedSpan,
      lookupSeq,
    });
    state.currentIndex = phraseIndex;
    options.phraseProgressStore?.schedule("lookup-word");
    options.render?.();
    options.lookupSelectedWord?.(state.selectedWord);
    return state.selectedWord;
  }

  async function lookupSelectedWord(selectedWord, options = {}) {
    const phrase = options.phraseForSelectedWord(selectedWord);
    const request = options.dictionaryCommands.dictionaryLookupRequest({
      selectedWord,
      source: options.getSelectedPracticeSource(),
      context: options.phraseTranslations.phraseDisplayText(phrase),
    });
    const startedAt = options.nowMs?.() ?? Date.now();

    try {
      const result = await options.fetchDictionaryResult(request);
      if (!options.isCurrentLookup(selectedWord)) return false;
      options.setSelectedWord(options.dictionaryState.lookupReady(options.getSelectedWord(), result));
      options.recordDebugEvent("dictionary-lookup-loaded", {
        word: selectedWord.word,
        language: request.language,
        provider: result?.meta?.provider || "",
        totalMs: (options.nowMs?.() ?? Date.now()) - startedAt,
        commandTimings: result?.meta?.commandTimings || null,
      });
      options.loadGroupedDictionarySearch(selectedWord, request.context);
      return true;
    } catch (error) {
      if (!options.isCurrentLookup(selectedWord)) return false;
      const payload = error?.payload || {};
      const nextSelectedWord = options.dictionaryState.lookupError(options.getSelectedWord(), error);
      options.setSelectedWord(nextSelectedWord);
      options.recordDebugEvent("dictionary-lookup-failed", {
        word: selectedWord.word,
        language: request.language,
        error: nextSelectedWord.lookupError,
        totalMs: (options.nowMs?.() ?? Date.now()) - startedAt,
        commandTimings: payload?.meta?.commandTimings || null,
      });
      return true;
    } finally {
      if (options.isCurrentLookup(selectedWord)) {
        options.render?.();
      }
    }
  }

  async function loadGroupedDictionarySearch(selectedWord, contextText, options = {}) {
    const group = options.group || null;
    const cursor = options.cursor || null;
    const request = options.dictionaryCommands.dictionarySearchRequest({
      selectedWord,
      source: options.getSelectedPracticeSource(),
      context: contextText || "",
      group,
      cursor,
      limit: options.limit || 5,
    });
    const startedAt = options.nowMs?.() ?? Date.now();
    try {
      const result = await options.fetchDictionarySearchResult(request);
      if (!options.isCurrentLookup(selectedWord)) return false;
      options.setSelectedWord(options.dictionaryState.groupedSearchReady(options.getSelectedWord(), result, group));
      options.recordDebugEvent("dictionary-search-loaded", {
        word: selectedWord.word,
        language: request.language,
        group: group || "preview",
        totalMs: (options.nowMs?.() ?? Date.now()) - startedAt,
        commandTimings: result?.meta?.commandTimings || null,
      });
      options.render?.();
      return true;
    } catch (error) {
      if (!options.isCurrentLookup(selectedWord)) return false;
      const payload = error?.payload || {};
      const nextSelectedWord = options.dictionaryState.groupedSearchError(options.getSelectedWord(), error);
      options.setSelectedWord(nextSelectedWord);
      options.recordDebugEvent("dictionary-search-failed", {
        word: selectedWord.word,
        language: request.language,
        error: nextSelectedWord.groupedSearchError,
        totalMs: (options.nowMs?.() ?? Date.now()) - startedAt,
        commandTimings: payload?.meta?.commandTimings || null,
      });
      options.render?.();
      return true;
    }
  }

  async function loadDictionarySearchItemCard(selectedWord, item, itemKey, options = {}) {
    const phrase = options.phraseForSelectedWord(selectedWord) || {};
    const request = options.dictionaryCommands.dictionarySearchItemLookupRequest({
      selectedWord,
      source: options.getSelectedPracticeSource(),
      itemTitle: options.dictionaryPresentation.dictionarySearchItemTitle(item),
      itemText: options.dictionaryPresentation.dictionarySearchItemText(item),
      fallbackContext: options.phraseTranslations.phraseDisplayText(phrase),
    });
    try {
      const result = await options.fetchDictionaryResult(request);
      if (!options.isCurrentLookup(selectedWord)) return false;
      options.setSelectedWord(options.dictionaryState.searchItemCardReady(options.getSelectedWord(), item, itemKey, result));
      options.render?.();
      return true;
    } catch (error) {
      if (!options.isCurrentLookup(selectedWord)) return false;
      options.setSelectedWord(options.dictionaryState.searchItemCardError(options.getSelectedWord(), item, itemKey, error));
      options.render?.();
      return true;
    }
  }

  function toggleDictionarySearchItem(selectedWord, item, itemKey, options = {}) {
    const currentSelectedWord = options.getSelectedWord();
    if (!currentSelectedWord || !options.isCurrentLookup(selectedWord)) return false;
    const transition = options.dictionaryState.toggleSearchItem(currentSelectedWord, item, itemKey);
    options.setSelectedWord(transition.selectedWord);
    options.render?.();

    if (transition.shouldLoad) {
      options.loadDictionarySearchItemCard(selectedWord, item, itemKey);
    }
    return true;
  }

  function toggleCardTranslation(card, options = {}) {
    const selectedWord = options.getSelectedWord();
    const generatedDraftItem = card?.generatedDraftItem || options.generatedDraftItemFromOverlayCard?.(card);
    if (
      !card?.id ||
      !selectedWord ||
      !options.dictionaryPresentation.cardCanRequestTranslation(card, generatedDraftItem)
    ) {
      return false;
    }

    const visibleTranslationsByCardId = options.getVisibleTranslationsByCardId();
    const currentlyVisible = options.dictionaryPresentation.cardTranslationsVisible({
      card,
      visibleTranslationsByCardId,
    });
    options.setVisibleTranslationsByCardId({
      ...visibleTranslationsByCardId,
      [card.id]: !currentlyVisible,
    });

    if (
      currentlyVisible ||
      options.dictionaryPresentation.cardHasLookupTranslations(card) ||
      selectedWord.translationsByCardId?.[card.id]
    ) {
      options.render?.();
      return true;
    }

    options.requestDictionaryCardTranslation(card);
    return true;
  }

  function setCardTranslationPending(cardId, pending, options = {}) {
    if (!cardId) return false;
    const next = { ...options.getTranslationPendingByCardId() };
    if (pending) {
      next[cardId] = true;
    } else {
      delete next[cardId];
    }
    options.setTranslationPendingByCardId(next);
    return true;
  }

  async function requestDictionaryCardTranslation(card, options = {}) {
    const generatedDraftItem = card?.generatedDraftItem || options.generatedDraftItemFromOverlayCard?.(card);
    if (!card?.entryId && !generatedDraftItem) return false;
    if (!options.getSelectedWord()) return false;

    const selectedWord = options.getSelectedWord();
    setCardTranslationPending(card.id, true, options);
    options.setSelectedWord({
      ...options.getSelectedWord(),
      cardActionError: "",
    });
    options.render?.();

    try {
      const translation = await options.postDictionaryCommand("dict-translation", {
        ...(card.entryId && !generatedDraftItem ? { entryId: card.entryId } : {}),
        ...(generatedDraftItem ? { item: generatedDraftItem } : {}),
      });
      if (!options.isCurrentLookup(selectedWord)) return false;
      setCardTranslationPending(card.id, false, options);
      options.setSelectedWord({
        ...options.getSelectedWord(),
        cardActionStatus: "",
        cardActionError: "",
        translationsByCardId: {
          ...(options.getSelectedWord().translationsByCardId || {}),
          [card.id]: translation,
        },
      });
      options.render?.();
      return true;
    } catch (error) {
      if (!options.isCurrentLookup(selectedWord)) return false;
      setCardTranslationPending(card.id, false, options);
      options.setSelectedWord({
        ...options.getSelectedWord(),
        cardActionStatus: "",
        cardActionError: error instanceof Error ? error.message : String(error),
      });
      options.render?.();
      return true;
    }
  }

  window.__afShadowingDictionaryLookupWorkflow = {
    selectLookupWord,
    lookupSelectedWord,
    loadGroupedDictionarySearch,
    loadDictionarySearchItemCard,
    toggleDictionarySearchItem,
    toggleCardTranslation,
    setCardTranslationPending,
    requestDictionaryCardTranslation,
  };
})();
