(function audioFilmsSelectedSpanWorkflow() {
  const generatedEntryApi = window.__afShadowingGeneratedEntries;

  function renderSelectedSpanCard(parent, options = {}) {
    const span = options.getSelectedSpan?.();
    if (!span) return null;
    const cardState = options.selectedSpans.selectedSpanCardState({
      span,
      saveLabel: options.dictionaryPresentation.selectedSpanSaveLabel(span),
    });
    return options.selectedSpansDom.renderSelectedSpanCard(parent, {
      cardState,
      titleState: options.selectedSpans.selectedSpanTitleState(span),
      renderTranslationField: options.renderTranslationField,
      onLookupWord: (token) => options.selectLookupWord(token.lookupWord, span.phraseIndex, tokenSelection(token), {
        preserveSelectedSpan: true,
      }),
      onSave: () => options.saveSelectedSpanCard(span),
      onClear: options.clearSelectedSpan,
    });
  }

  function tokenSelection(token = {}) {
    return {
      tokenIndex: token.selection?.tokenIndex,
      charStart: token.selection?.charStart,
      charEnd: token.selection?.charEnd,
      originalToken: token.selection?.originalToken,
    };
  }

  function selectedSpanSourceBinding(span, {
    state = {},
    selectedSpans,
    getSelectedPracticeSource,
  } = {}) {
    return selectedSpans.selectedSpanSourceBinding({
      span,
      videoId: state.videoId,
      selectedSourceId: state.selectedSourceId,
      selectedTrack: state.selectedTrack,
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      transcriptResult: state.transcriptResult,
      source: getSelectedPracticeSource?.(),
    });
  }

  function selectedSpanSourceContext(span, {
    entryId = "",
    action = "generated-entry-draft",
    state = {},
    selectedSpans,
    getSelectedPracticeSource,
    getVideoElement,
    youtubeVideoTitle,
    extensionVersion,
    nowIso = () => new Date().toISOString(),
  } = {}) {
    const video = getVideoElement?.();
    return selectedSpans.selectedSpanSourceContext({
      span,
      entryId,
      action,
      videoId: state.videoId,
      selectedSourceId: state.selectedSourceId,
      selectedTrack: state.selectedTrack,
      phrases: state.phrases,
      currentIndex: state.currentIndex,
      transcriptResult: state.transcriptResult,
      source: getSelectedPracticeSource?.(),
      observation: {
        currentPlaybackTimeMs: video ? video.currentTime * 1000 : null,
        title: youtubeVideoTitle?.() || "",
        capturedAt: nowIso(),
      },
      clientVersion: extensionVersion?.() || "",
    });
  }

  async function saveSelectedSpanCard(span, options = {}) {
    if (!span || options.getSelectedSpan?.() !== span) return;
    if (options.accountStatus !== "signed-in") {
      setSelectedSpan(options, {
        ...span,
        saveStatus: "idle",
        saveError: "Connect 2000NL to save selected phrases.",
      });
      return;
    }

    const basePayload = options.buildPayload?.(span);
    if (!basePayload?.ok) {
      setSelectedSpan(options, {
        ...span,
        saveStatus: "idle",
        saveError: basePayload?.error || "Selected phrase cannot be saved.",
      });
      return;
    }

    const savingSpan = {
      ...span,
      saveStatus: "saving",
      saveError: "",
    };
    setSelectedSpan(options, savingSpan);

    try {
      const draft = await options.postDictionaryCommand("dict-generated-draft", basePayload.value);
      if (options.getSelectedSpan?.() !== savingSpan) return;
      const draftPayload = generatedEntryApi.generatedDraftPayload(draft?.draft);
      if (!draftPayload) {
        throw new Error("Generated draft is missing candidate identity.");
      }
      const savePayload = options.buildPayload?.(savingSpan, draft?.draft, "generated-entry-save");
      if (!savePayload?.ok) {
        throw new Error(savePayload?.error || "Selected phrase cannot be saved.");
      }
      const saved = await options.postDictionaryCommand("dict-generated-save", savePayload.value);
      const entryId = saved?.entryId;
      if (entryId) {
        await options.postDictionaryCommand("dict-action", {
          action: "start-learning",
          entryId,
          clientEventId: options.createMutationTurnId(),
          sourceContext: options.sourceContext(savingSpan, entryId, "start-learning"),
        });
      }
      if (options.getSelectedSpan?.() !== savingSpan) return;
      setSelectedSpan(options, {
        ...savingSpan,
        saveStatus: "saved",
        saveError: "",
        savedEntryId: entryId || "",
      });
    } catch (error) {
      if (options.getSelectedSpan?.() !== savingSpan) return;
      setSelectedSpan(options, {
        ...savingSpan,
        saveStatus: "idle",
        saveError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function setSelectedSpan(options, span) {
    options.setSelectedSpan?.(span);
    options.render?.();
  }

  function startSpanDraft(state, phraseIndex, tokenIndex, options = {}) {
    state.spanSelectionDraft = {
      phraseIndex,
      startTokenIndex: tokenIndex,
      endTokenIndex: tokenIndex,
    };
    options.applyPreview?.();
    return state.spanSelectionDraft;
  }

  function moveSpanDraft(state, event, phraseIndex, tokenIndex, options = {}) {
    const draft = state.spanSelectionDraft;
    if (!draft || draft.phraseIndex !== phraseIndex || event?.buttons !== 1) return false;
    draft.endTokenIndex = tokenIndex;
    options.applyPreview?.();
    return true;
  }

  function completeSpanDraft(state, draft, span, options = {}) {
    if (!span) return false;
    state.selectedWord = null;
    state.selectedSpan = span;
    options.render?.();
    options.requestSelectedSpanTranslation?.(span);
    return true;
  }

  function endSpanDraft(state, event, phraseIndex, tokenIndex, options = {}) {
    const draft = state.spanSelectionDraft;
    if (!draft || draft.phraseIndex !== phraseIndex) return false;
    draft.endTokenIndex = tokenIndex;
    state.spanSelectionDraft = null;
    const span = options.selectedSpanFromDraft?.(draft, options.phrase);
    const selected = completeSpanDraft(state, draft, span, options);
    if (selected) {
      state.suppressWordClickUntil = options.nowMs?.() ?? Date.now() + 500;
    }
    return selected;
  }

  function cancelSpanDraft(state, options = {}) {
    if (!state.spanSelectionDraft) return false;
    state.spanSelectionDraft = null;
    options.applyPreview?.();
    return true;
  }

  window.__afShadowingSelectedSpanWorkflow = {
    renderSelectedSpanCard,
    selectedSpanSourceBinding,
    selectedSpanSourceContext,
    saveSelectedSpanCard,
    startSpanDraft,
    moveSpanDraft,
    completeSpanDraft,
    endSpanDraft,
    cancelSpanDraft,
  };
})();
