(function audioFilmsGeneratedEntryWorkflow() {
  const generatedEntryApi = window.__afShadowingGeneratedEntries;

  async function generateDictionaryDraft(selectedWord, options = {}) {
    if (!options.isCurrentLookup?.(selectedWord)) return;
    const payload = options.buildPayload?.(selectedWord);
    if (!payload?.ok) {
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftError: payload?.error || "Generated draft cannot be created.",
      });
      return;
    }

    setSelectedWord(options, {
      ...options.getSelectedWord(),
      generatedDraftStatus: "loading",
      generatedDraftError: "",
    });

    try {
      const draft = await options.postDictionaryCommand("dict-generated-draft", payload.value);
      if (!options.isCurrentLookup?.(selectedWord)) return;
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftStatus: "ready",
        generatedDraft: draft?.draft || null,
        generatedDraftError: "",
      });
    } catch (error) {
      if (!options.isCurrentLookup?.(selectedWord)) return;
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftStatus: "error",
        generatedDraftError: errorMessage(error),
      });
    }
  }

  async function saveGeneratedDictionaryDraft(selectedWord, card = null, options = {}) {
    if (!options.isCurrentLookup?.(selectedWord)) return;
    const draft = selectedWord.generatedDraft;
    const draftPayload = generatedEntryApi.generatedDraftPayload(draft);
    if (!draftPayload) {
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftError: "Generated draft is missing candidate identity.",
      });
      return;
    }
    const payload = options.buildPayload?.(selectedWord, draft, card);
    if (!payload?.ok) {
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftError: payload?.error || "Generated draft cannot be saved.",
      });
      return;
    }

    setSelectedWord(options, {
      ...options.getSelectedWord(),
      generatedDraftStatus: "saving",
      generatedDraftError: "",
    });

    try {
      const saved = await options.postDictionaryCommand("dict-generated-save", payload.value);
      const entryId = saved?.entryId;
      if (entryId) {
        await options.postDictionaryCommand("dict-action", {
          action: "start-learning",
          entryId,
          clientEventId: options.createMutationTurnId(),
          sourceContext: options.sourceContext(selectedWord, entryId),
        });
      }
      if (!options.isCurrentLookup?.(selectedWord)) return;
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftStatus: "saved",
        generatedDraftError: "",
        cardActionStatus: entryId ? "Saved and started learning." : "Saved.",
      });
      await options.reloadLookup?.(options.getSelectedWord());
    } catch (error) {
      if (!options.isCurrentLookup?.(selectedWord)) return;
      setSelectedWord(options, {
        ...options.getSelectedWord(),
        generatedDraftStatus: "ready",
        generatedDraftError: errorMessage(error),
      });
    }
  }

  function setSelectedWord(options, selectedWord) {
    options.setSelectedWord?.(selectedWord);
    options.render?.();
  }

  function errorMessage(error) {
    return error?.message || String(error);
  }

  window.__afShadowingGeneratedEntryWorkflow = {
    generateDictionaryDraft,
    saveGeneratedDictionaryDraft,
  };
})();
