(function audioFilmsGeneratedEntriesModule() {
  function generatedEntryBasePayload({
    selectedWord,
    phrase,
    sourceLanguageCode = "",
    sourceContext = null,
    draft = null,
    card = null,
  } = {}) {
    if (!selectedWord?.word) return { ok: false, error: "Missing selected word." };
    if (!sourceLanguageCode || sourceLanguageCode === "auto") {
      return { ok: false, error: "Missing source language." };
    }
    return {
      ok: true,
      value: {
        clickedForm: selectedWord.word,
        sourceLanguageCode,
        contextText: phrase?.text || "",
        sourceContext,
        ...(generatedDraftPayload(draft) || {}),
        ...(generatedDraftTranslationPayload(selectedWord, card) || {}),
      },
    };
  }

  function generatedEntryPayloadFromSelection({
    selectedWord,
    phrases = [],
    currentIndex = 0,
    source = null,
    sourceContext = null,
    draft = null,
    card = null,
  } = {}) {
    const phrase = selectedWord?.sourceBinding?.phrase ||
      phrases[selectedWord?.phraseIndex] ||
      phrases[currentIndex] ||
      null;
    return generatedEntryBasePayload({
      selectedWord,
      phrase,
      sourceLanguageCode: selectedWordSourceLanguage(selectedWord, source),
      sourceContext,
      draft,
      card,
    });
  }

  function selectedWordSourceLanguage(selectedWord, source, fallback = "auto") {
    return selectedWord?.sourceBinding?.captionSource?.languageCode ||
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      fallback;
  }

  function generatedDraftTranslationPayload(selectedWord, card = null) {
    const cardId = card?.id || generatedDraftCard(selectedWord?.generatedDraft)?.id || "";
    const translation = cardId ? selectedWord?.translationsByCardId?.[cardId] : null;
    if (!translation || translation.status !== "ready" || !translation.overlay) return null;
    return {
      draftTranslation: {
        targetLang: translation.targetLang || translation.targetLanguageCode || "",
        status: "ready",
        overlay: translation.overlay,
        ...(translation.note ? { note: translation.note } : {}),
        ...(translation.translationPolicyVersion
          ? { translationPolicyVersion: translation.translationPolicyVersion }
          : {}),
      },
    };
  }

  function generatedDraftPayload(draft) {
    if (!draft || typeof draft !== "object") return null;
    const item = draft.item && typeof draft.item === "object" ? draft.item : null;
    const draftSetId = typeof draft.draftSetId === "string" ? draft.draftSetId : "";
    const candidateId = typeof draft.candidateId === "string" ? draft.candidateId : "";
    const revision = Number.isInteger(draft.revision) ? draft.revision : null;
    if (!item || !draftSetId || !candidateId || !revision) return null;
    return { draftSetId, candidateId, revision, item };
  }

  function generatedEntrySourceContext({ selectedWord, entryId = "", buildSourceContext } = {}) {
    if (typeof buildSourceContext !== "function") return null;
    return buildSourceContext(
      selectedWord?.sourceBinding,
      {
        id: entryId || "generated-draft",
        entryId,
        clickedForm: selectedWord?.word || "",
        headword: selectedWord?.word || "",
      },
      entryId ? "start-learning" : "generated-entry-draft",
    );
  }

  function generatedDraftItemFromOverlayCard(card) {
    if (!card || card.entryId) return null;
    const sections = Array.isArray(card.sections)
      ? card.sections
          .map((section, index) => ({
            id: section.id || `section-${index + 1}`,
            kind: section.kind || "meaning",
            text: section.text || "",
            sourcePath: section.sourcePath || `card.sections.${index}`,
          }))
          .filter((section) => section.text)
      : [];
    if (!card.headword && !sections.length) return null;
    return {
      entry: {
        id: card.id ? `draft:${card.id}` : undefined,
        content: {
          headword: card.headword || "",
          languageCode: card.language || "",
          sections,
          summary: card.summary || {},
        },
      },
    };
  }

  function generatedDraftCard(draft) {
    if (!draft || typeof draft !== "object") return null;
    if (draft.card && typeof draft.card === "object") return draft.card;
    return null;
  }

  function generatedFallbackState(selectedWord, accountStatus = "") {
    const draftCard = generatedDraftCard(selectedWord?.generatedDraft);
    if (draftCard) {
      return {
        state: "card",
        draftCard,
        saving: selectedWord?.generatedDraftStatus === "saving",
        error: selectedWord?.generatedDraftError || "",
      };
    }
    if (accountStatus !== "signed-in") {
      return {
        state: "connect",
        copy: "Connect 2000NL to generate and save a private learner card.",
        error: "",
      };
    }
    if (selectedWord?.generatedDraftStatus === "loading") {
      return {
        state: "loading",
        copy: "Generating a same-language explanation...",
        error: "",
      };
    }
    if (selectedWord?.generatedDraft) {
      return {
        state: "unrenderable",
        copy: "Generated draft did not include a renderable learner card.",
        error: selectedWord?.generatedDraftError || "",
      };
    }
    return {
      state: "generate",
      error: selectedWord?.generatedDraftError || "",
    };
  }

  window.__afShadowingGeneratedEntries = {
    generatedEntryBasePayload,
    generatedEntryPayloadFromSelection,
    selectedWordSourceLanguage,
    generatedDraftTranslationPayload,
    generatedDraftPayload,
    generatedEntrySourceContext,
    generatedDraftItemFromOverlayCard,
    generatedDraftCard,
    generatedFallbackState,
  };
})();
