(function audioFilmsDictionaryStateModule() {
  function initialSelectedWord({
    word,
    phraseIndex,
    selection = {},
    sourceBinding,
    preserveSelectedSpan = false,
    lookupSeq = 0,
  } = {}) {
    return {
      word,
      phraseIndex,
      selection,
      sourceBinding,
      preserveSelectedSpan: Boolean(preserveSelectedSpan),
      lookupSeq,
      lookupStatus: "loading",
      lookupResult: null,
      lookupError: "",
      translateUrl: "",
      cardActionStatus: "",
      cardActionError: "",
      generatedDraftStatus: "",
      generatedDraft: null,
      generatedDraftError: "",
      translationsByCardId: {},
      groupedSearchStatus: "idle",
      groupedSearchResult: null,
      groupedSearchError: "",
      groupedSearchLoadingGroup: "",
      groupedSearchExpandedByKey: {},
      groupedSearchCardsByKey: {},
    };
  }

  function lookupReady(selectedWord, result) {
    return {
      ...selectedWord,
      lookupStatus: "ready",
      lookupResult: result,
      lookupError: "",
      translateUrl: "",
      cardActionStatus: "",
      cardActionError: "",
      groupedSearchStatus: "loading",
      groupedSearchResult: null,
      groupedSearchError: "",
    };
  }

  function lookupError(selectedWord, error) {
    const payload = error?.payload || {};
    return {
      ...selectedWord,
      lookupStatus: "error",
      lookupResult: null,
      lookupError: payload.error || (error instanceof Error ? error.message : String(error)),
      translateUrl: payload.translateUrl || "",
    };
  }

  function groupedSearchReady(selectedWord, result, group = null) {
    return {
      ...selectedWord,
      groupedSearchStatus: "ready",
      groupedSearchResult: mergeGroupedSearchResult(
        selectedWord.groupedSearchResult,
        result,
        group,
      ),
      groupedSearchLoadingGroup: "",
      groupedSearchError: "",
    };
  }

  function groupedSearchError(selectedWord, error) {
    const payload = error?.payload || {};
    const unavailable = payload.error === "search_index_not_ready";
    return {
      ...selectedWord,
      groupedSearchStatus: unavailable ? "unavailable" : "error",
      groupedSearchLoadingGroup: "",
      groupedSearchError: unavailable
        ? "Search previews are still being prepared."
        : payload.error || (error instanceof Error ? error.message : String(error)),
    };
  }

  function toggleSearchItem(selectedWord, item, itemKey) {
    const expandedByKey = { ...(selectedWord.groupedSearchExpandedByKey || {}) };
    const cardsByKey = { ...(selectedWord.groupedSearchCardsByKey || {}) };

    if (expandedByKey[itemKey]) {
      delete expandedByKey[itemKey];
      return {
        selectedWord: {
          ...selectedWord,
          groupedSearchExpandedByKey: expandedByKey,
        },
        shouldLoad: false,
      };
    }

    expandedByKey[itemKey] = true;
    if (!cardsByKey[itemKey]) {
      cardsByKey[itemKey] = searchItemCardLoading(item);
    }
    return {
      selectedWord: {
        ...selectedWord,
        groupedSearchExpandedByKey: expandedByKey,
        groupedSearchCardsByKey: cardsByKey,
      },
      shouldLoad: cardsByKey[itemKey].status === "loading" && !cardsByKey[itemKey].result,
    };
  }

  function searchItemCardReady(selectedWord, item, itemKey, result) {
    return {
      ...selectedWord,
      groupedSearchCardsByKey: {
        ...(selectedWord.groupedSearchCardsByKey || {}),
        [itemKey]: {
          status: "ready",
          result,
          error: "",
          entryId: item?.entry?.id || "",
        },
      },
    };
  }

  function searchItemCardError(selectedWord, item, itemKey, error) {
    const payload = error?.payload || {};
    return {
      ...selectedWord,
      groupedSearchCardsByKey: {
        ...(selectedWord.groupedSearchCardsByKey || {}),
        [itemKey]: {
          status: "error",
          result: null,
          error: payload.error || (error instanceof Error ? error.message : String(error)),
          entryId: item?.entry?.id || "",
        },
      },
    };
  }

  function searchItemCardLoading(item) {
    return {
      status: "loading",
      result: null,
      error: "",
      entryId: item?.entry?.id || "",
    };
  }

  function mergeGroupedSearchResult(current, next, groupId) {
    if (!groupId || !current?.groups?.length) return next;
    const incomingGroup = next?.groups?.[0];
    if (!incomingGroup) return current;
    return {
      ...current,
      groups: current.groups.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...incomingGroup,
          items: [...(group.items || []), ...(incomingGroup.items || [])],
        };
      }),
    };
  }

  window.__afShadowingDictionaryState = {
    initialSelectedWord,
    lookupReady,
    lookupError,
    groupedSearchReady,
    groupedSearchError,
    toggleSearchItem,
    searchItemCardReady,
    searchItemCardError,
    mergeGroupedSearchResult,
  };
})();
