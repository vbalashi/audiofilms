(function audioFilmsDictionarySearchWorkflow() {
  function renderSelectedWordCard(parent, options = {}) {
    const state = options.getState();
    const selectedWord = state.selectedWord;
    if (selectedWord?.lookupStatus === "ready" && selectedWord.lookupResult?.cards?.length) {
      renderReadyDictionaryCards(parent, selectedWord, options);
      return;
    }
    renderDictionaryLookup(parent, selectedWord, options);
  }

  function renderReadyDictionaryCards(parent, selectedWord, options = {}) {
    const lookupResult = selectedWord.lookupResult;
    if (
      lookupResult.contractVersion === "dict-sense-card-v1" &&
      options.renderSenseCardGroup
    ) {
      const cardsByGroupId = new Map();
      for (const card of lookupResult.cards) {
        const groupId = card?.group?.headwordGroupId || card?.entryId || card?.id;
        if (!cardsByGroupId.has(groupId)) cardsByGroupId.set(groupId, []);
        cardsByGroupId.get(groupId).push(card);
      }
      for (const cards of cardsByGroupId.values()) {
        if (cards.length > 1) {
          options.renderSenseCardGroup(parent, cards);
        } else {
          options.renderOverlayCard(parent, cards[0]);
        }
      }
    } else {
      for (const card of lookupResult.cards) {
        options.renderOverlayCard(parent, card);
      }
    }
    options.dictionaryDom.renderLookupMessages(parent, {
      status: selectedWord.cardActionStatus,
      error: selectedWord.cardActionError,
      warning: lookupResult?.meta?.warning,
    });
    renderGroupedSearchPreviews(parent, selectedWord, options);
  }

  function renderDictionaryLookup(parent, selectedWord, options = {}) {
    const state = options.getState();
    const lookupState = options.dictionaryPresentation.lookupPlaceholderState(selectedWord);
    options.dictionaryDom.renderDictionaryLookup(parent, {
      selectedWord,
      lookupState,
      onRetry: () => {
        options.selectLookupWord(selectedWord.word, selectedWord.phraseIndex, selectedWord.selection, {
          preserveSelectedSpan: Boolean(selectedWord.preserveSelectedSpan && state.selectedSpan),
        });
      },
      renderCard: options.renderOverlayCard,
      renderGeneratedFallback: options.renderGeneratedFallback,
      renderGroupedSearchPreviews: (lookupParent, lookupSelectedWord) => {
        renderGroupedSearchPreviews(lookupParent, lookupSelectedWord, options);
      },
    });
  }

  function renderGroupedSearchPreviews(parent, selectedWord, options = {}) {
    options.dictionarySearchDom.renderGroupedSearchPreviews(parent, selectedWord, {
      fallbackWord: options.getState().selectedWord?.word,
      renderOverlayCard: options.renderOverlayCard,
      onToggleItem: options.toggleDictionarySearchItem,
      onLoadMore: (_selectedWord, groupState) => {
        const state = options.getState();
        const phrase = selectedWord.sourceBinding?.phrase || state.phrases[selectedWord.phraseIndex] || {};
        state.selectedWord = {
          ...state.selectedWord,
          groupedSearchStatus: "ready",
          groupedSearchLoadingGroup: groupState.groupId,
          groupedSearchError: "",
        };
        options.render();
        options.loadGroupedDictionarySearch(selectedWord, phrase.text || "", {
          group: groupState.groupId,
          cursor: groupState.more.cursor,
        });
      },
    });
  }

  window.__afShadowingDictionarySearchWorkflow = {
    renderSelectedWordCard,
    renderGroupedSearchPreviews,
  };
})();
