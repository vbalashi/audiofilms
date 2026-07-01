(function audioFilmsSelectedSpansModule() {
  const phraseTokenApi = window.__afShadowingPhraseTokens;
  const phraseTranslationApi = window.__afShadowingPhraseTranslations;
  const sourceBindingApi = window.__afShadowingSourceBinding;

  function selectedSpanFromDraft(draft, phrase) {
    if (!phrase) return null;
    const startTokenIndex = Math.min(draft?.startTokenIndex, draft?.endTokenIndex);
    const endTokenIndex = Math.max(draft?.startTokenIndex, draft?.endTokenIndex);
    if (endTokenIndex <= startTokenIndex) return null;

    const displayText = phraseTranslationApi.phraseDisplayText(phrase);
    const tokens = phraseTokenApi.tokenizeClickablePhraseText(displayText)
      .filter((segment) =>
        segment.kind === "word" &&
        segment.tokenIndex >= startTokenIndex &&
        segment.tokenIndex <= endTokenIndex
      );
    if (tokens.length < 2) return null;

    const charStart = Math.min(...tokens.map((token) => token.charStart));
    const charEnd = Math.max(...tokens.map((token) => token.charEnd));
    const text = displayText.slice(charStart, charEnd).trim();
    if (!text || !text.includes(" ")) return null;

    return {
      phraseIndex: draft.phraseIndex,
      startTokenIndex,
      endTokenIndex,
      charStart,
      charEnd,
      text,
      contextText: displayText,
      tokens,
      status: "loading",
      translatedText: "",
      error: "",
    };
  }

  function selectedSpanSourceBinding({
    span,
    videoId = "",
    selectedSourceId = "",
    selectedTrack = null,
    phrases = [],
    currentIndex = 0,
    transcriptResult = null,
    source = null,
  } = {}) {
    return sourceBindingApi.createDictionarySourceBinding({
      word: span?.text || "",
      phraseIndex: span?.phraseIndex || 0,
      selection: {
        tokenIndex: span?.startTokenIndex,
        charStart: span?.charStart,
        charEnd: span?.charEnd,
        originalToken: span?.text || "",
      },
      videoId,
      selectedSourceId,
      selectedTrack,
      phrases,
      currentIndex,
      transcriptResult,
      source,
    });
  }

  function selectedSpanSourceContext(options = {}) {
    const span = options.span || {};
    const entryId = options.entryId || "";
    const action = options.action || "generated-entry-draft";
    return sourceBindingApi.buildDictionaryActionSourceContext({
      binding: selectedSpanSourceBinding(options),
      card: {
        id: entryId || "generated-span-draft",
        entryId,
        clickedForm: span.text || "",
        headword: span.text || "",
      },
      action,
      observation: options.observation || {},
      clientVersion: options.clientVersion || "",
    });
  }

  function selectedSpanGeneratedEntryPayload({
    span,
    phrase,
    sourceLanguageCode = "",
    sourceContext = null,
    draftPayload = null,
  } = {}) {
    if (!span?.text) return { ok: false, error: "Missing selected phrase." };
    if (!sourceLanguageCode || sourceLanguageCode === "auto") {
      return { ok: false, error: "Missing source language." };
    }
    return {
      ok: true,
      value: {
        clickedForm: span.text,
        sourceLanguageCode,
        contextText: span.contextText || phraseTranslationApi.phraseDisplayText(phrase),
        sourceContext,
        ...(draftPayload || {}),
      },
    };
  }

  function selectedSpanCardState({
    span,
    saveLabel = "Save phrase",
  } = {}) {
    if (!span) return null;
    const fields = selectedSpanTranslationFields(span);
    const saveFeedback = span.saveError
      ? { tone: "error", className: "af-source-option-error af-span-save-feedback", text: span.saveError }
      : span.saveStatus === "saved"
      ? { tone: "status", className: "af-dictionary-copy af-span-save-feedback", text: "Started learning." }
      : null;
    return {
      status: span.status || "",
      loading: span.status === "loading",
      error: span.status === "failed" ? span.error || "Selected span translation failed." : "",
      fields,
      save: span.status === "ready"
        ? {
            label: saveLabel,
            disabled: span.saveStatus === "saving" || span.saveStatus === "saved",
          }
        : null,
      clear: {
        label: "Clear selection",
      },
      saveFeedback,
    };
  }

  function selectedSpanTitleState(span = {}) {
    const tokens = Array.isArray(span.tokens) ? span.tokens : [];
    if (!tokens.length) {
      return {
        fallbackText: span.text || "",
        tokens: [],
      };
    }
    return {
      fallbackText: "",
      tokens: tokens.map((token) => ({
        text: token.text || "",
        datasetKey: `afSpanTitleWord-${token.tokenIndex}`,
        lookupWord: token.lookupWord || "",
        tokenIndex: token.tokenIndex,
        datasetTokenIndex: String(token.tokenIndex),
        selection: {
          tokenIndex: token.tokenIndex,
          charStart: token.charStart,
          charEnd: token.charEnd,
          originalToken: token.originalToken,
        },
      })),
    };
  }

  function selectedSpanTranslationFields(span = {}) {
    const contextual = span.translatedText || "";
    const literal = span.literalTranslatedText || "";
    const comment = span.translatorComment || "";
    const fields = [
      {
        label: "Context translation",
        value: contextual || "No translation returned.",
        className: "af-span-translation-text",
        tone: "is-context",
      },
    ];
    if (literal && literal !== contextual) {
      fields.push({
        label: "Without context",
        value: literal,
        className: "af-span-literal-text",
        tone: "is-literal",
      });
    }
    if (comment) {
      fields.push({
        label: "Translator note",
        value: comment,
        className: "af-span-comment-text",
        tone: "is-note",
      });
    }
    return fields;
  }

  window.__afShadowingSelectedSpans = {
    selectedSpanFromDraft,
    selectedSpanSourceBinding,
    selectedSpanSourceContext,
    selectedSpanGeneratedEntryPayload,
    selectedSpanCardState,
    selectedSpanTitleState,
    selectedSpanTranslationFields,
  };
})();
