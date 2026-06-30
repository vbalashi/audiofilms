(function audioFilmsDictionaryPresentation() {
  function overlayChips(card) {
    const projected = Array.isArray(card?.chips) ? card.chips : [];
    return [
      card?.partOfSpeech ? { kind: "part-of-speech", label: card.partOfSpeech } : null,
      ...projected.filter((chip) => chip.kind === "part-of-speech" && chip.label !== card?.partOfSpeech),
      definitionNumberChip(card?.meaningId),
      card?.dictionary?.name || card?.dictionary?.slug
        ? { kind: "dictionary", label: card.dictionary.name || card.dictionary.slug }
        : null,
    ].filter(Boolean);
  }

  function definitionNumberChip(value) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const label = `#${Math.trunc(numeric)}`;
    return { kind: "definition-index", label, value: label, title: `Definition ${Math.trunc(numeric)}` };
  }

  function collapsedOverlaySections(sections) {
    const list = Array.isArray(sections) ? sections : [];
    const context = list.find((section) => section.kind === "context");
    const firstExample = list.find((section) => section.kind === "example");
    const firstDetail = list.find((section) => section.kind !== "example");
    if (context) return [context, firstExample].filter(Boolean);
    return [firstExample || firstDetail].filter(Boolean);
  }

  function shouldRenderSectionMicroLabel(section) {
    return ["idiom", "note", "form"].includes(section?.kind || "");
  }

  function sectionMicroLabel(section) {
    if (section?.label && !/^example$/i.test(section.label)) return section.label;
    return {
      idiom: "idiom",
      form: "form",
      note: "usage note",
    }[section?.kind] || "";
  }

  function chipClassName(chip) {
    const value = String(chip?.value || chip?.label || "").toLowerCase();
    const kind = String(chip?.kind || "").toLowerCase();
    if (kind === "part-of-speech" || ["ww", "verb"].includes(value)) {
      if (["ww", "verb"].includes(value)) return "is-pos-ww";
      if (["zn", "noun", "zelfstandig naamwoord"].includes(value)) return "is-pos-zn";
      if (["bn", "adjective"].includes(value)) return "is-pos-bn";
      if (["bw", "adverb"].includes(value)) return "is-pos-bw";
      if (["idiom"].includes(value)) return "is-pos-bn";
    }
    if (kind === "definition-index") return "is-definition-index";
    if (kind === "list") return "is-list";
    if (value === "draft" || value === "needs save") return "is-draft";
    return "";
  }

  function progressSignal(progress, options = {}) {
    if (!progress) return [];
    return [
      typeof progress.seenCount === "number" ? { label: `Seen ${progress.seenCount}x` } : null,
      progress.lastSeenAt ? { label: `Last ${formatRelativeDate(progress.lastSeenAt, options)}` } : null,
    ].filter(Boolean);
  }

  function dictionaryHeaderCopy(input = {}) {
    const selectedSpan = input.selectedSpan || null;
    if (selectedSpan) {
      if (selectedSpan.status === "loading") {
        return { title: "Selected phrase", subtitle: "Translating..." };
      }
      if (selectedSpan.status === "failed") {
        return { title: "Selected phrase", subtitle: "Translation failed" };
      }
      return { title: "Selected phrase", subtitle: "" };
    }
    const selectedWord = input.selectedWord || null;
    if (!selectedWord) {
      return {
        title: "Dictionary",
        subtitle: input.selectedTrackLabel || "Click a word",
      };
    }
    if (selectedWord.lookupStatus === "loading") {
      return { title: selectedWord.word, subtitle: "Looking up..." };
    }
    if (selectedWord.lookupStatus === "error") {
      return { title: selectedWord.word, subtitle: "Lookup failed" };
    }
    const cards = selectedWord.lookupResult?.cards || [];
    if (cards.length) {
      return {
        title: selectedWord.word,
        subtitle: `${cards.length} ${cards.length === 1 ? "card" : "cards"} found`,
      };
    }
    return { title: selectedWord.word, subtitle: "No cards found" };
  }

  function dictionaryPanelState(input = {}) {
    const selectedWord = input.selectedWord || null;
    const canToggleExamples = Boolean(selectedWord?.lookupResult?.cards?.length);
    const examplesExpanded = Boolean(input.examplesExpanded);
    const examplesLabel = examplesExpanded ? "Collapse all examples" : "Expand all examples";
    return {
      spanSelected: Boolean(input.selectedSpan),
      lookupWord: selectedWord?.word || "",
      examplesToggle: {
        hidden: !canToggleExamples,
        icon: examplesExpanded ? "collapse" : "expand",
        label: examplesLabel,
        pressed: examplesExpanded,
        title: examplesLabel,
      },
    };
  }

  function selectedSpanSaveLabel(span) {
    if (span?.saveStatus === "saving") return "Saving...";
    if (span?.saveStatus === "saved") return "Saved";
    return "Start Learning";
  }

  function overlayTitle(card, fallbackWord = "") {
    return card?.headword || card?.clickedForm || fallbackWord || "Dictionary card";
  }

  function displayActionsByGroup(card, group) {
    return (Array.isArray(card?.displayActions) ? card.displayActions : [])
      .filter((displayAction) => (displayAction.group || "progress") === group)
      .filter((displayAction) => shouldRenderDisplayAction(card, displayAction));
  }

  function shouldRenderDisplayAction(card, displayAction) {
    if (!displayAction) return false;
    if (
      displayAction.group === "progress"
      && displayAction.id === "known"
      && ["not-started", "encountered", undefined].includes(card?.progress?.phase)
    ) {
      return false;
    }
    return true;
  }

  function isGeneratedDictionaryCard(card) {
    return Boolean(card?.generatedDraftItem || card?.displayActions?.some((action) =>
      action?.command?.kind === "generated-save-and-start-learning"
    ));
  }

  function dictionarySearchGroupLabel(groupId) {
    if (groupId === "examples") return "Within examples";
    if (groupId === "definitions") return "Within definitions";
    if (groupId === "alphabetical") return "Alphabetical";
    if (groupId === "generated") return "Generated";
    return "Headwords";
  }

  function dictionarySearchItemKey(groupId, item, index) {
    return [
      groupId || "group",
      item?.resultKey || item?.entry?.id || dictionarySearchItemTitle(item) || "item",
      index,
    ].join("::");
  }

  function dictionarySearchItemTitle(item, fallbackWord = "") {
    const headword = item?.entry?.headword || "";
    return headword || fallbackWord || "Dictionary card";
  }

  function dictionarySearchItemChips(item) {
    const chips = [];
    const partOfSpeech = item?.entry?.partOfSpeech || item?.entry?.part_of_speech || "";
    if (partOfSpeech) chips.push({ kind: "part-of-speech", label: partOfSpeech });
    const kind = item?.field?.kind || item?.kind || item?.match?.relation || "";
    if (kind && ["idiom", "generated", "draft"].includes(kind)) {
      chips.push({ kind: kind === "idiom" ? "part-of-speech" : "other", label: kind });
    }
    return chips;
  }

  function dictionarySearchItemText(item) {
    return item?.field?.text || item?.entry?.summaryDefinition || item?.match?.matchedText || "";
  }

  function focusedDictionarySearchCards(loadedState) {
    const cards = loadedState?.result?.cards || [];
    const entryId = loadedState?.entryId || "";
    if (!entryId) return cards;
    const matching = cards.filter((card) => card?.id === entryId);
    return matching.length ? matching : cards;
  }

  function highlightedTextParts(text, highlight) {
    const value = typeof text === "string" ? text : "";
    const needle = typeof highlight === "string" ? highlight.trim() : "";
    if (!value || !needle) return [{ text: value, highlight: false }];
    const index = value.toLowerCase().indexOf(needle.toLowerCase());
    if (index < 0) return [{ text: value, highlight: false }];
    return [
      { text: value.slice(0, index), highlight: false },
      { text: value.slice(index, index + needle.length), highlight: true },
      { text: value.slice(index + needle.length), highlight: false },
    ].filter((part) => part.text);
  }

  function dictionarySearchGroupState({ selectedWord = {}, group = {}, fallbackWord = "" } = {}) {
    const items = Array.isArray(group.items) ? group.items : [];
    return {
      groupId: group.id || "",
      title: dictionarySearchGroupLabel(group.id),
      count: String(group.total || items.length || 0),
      rows: items.map((item, index) => {
        const itemKey = dictionarySearchItemKey(group.id, item, index);
        const expanded = Boolean(selectedWord.groupedSearchExpandedByKey?.[itemKey]);
        const title = dictionarySearchItemTitle(item, fallbackWord);
        return {
          item,
          itemKey,
          expanded,
          loadedState: selectedWord.groupedSearchCardsByKey?.[itemKey] || null,
          tabIndex: expanded ? -1 : 0,
          role: expanded ? "" : "button",
          ariaLabel: expanded ? "" : `Open card: ${title}`,
          title,
          chips: dictionarySearchItemChips(item),
          text: dictionarySearchItemText(item),
          highlight: item?.match?.matchedText || "",
        };
      }),
      more: {
        visible: Boolean(group.page?.hasMore && group.page.nextCursor),
        label: "More results",
        datasetKey: `afSearchMore-${group.id}`,
        cursor: group.page?.nextCursor || "",
      },
    };
  }

  function groupedSearchPreviewState(selectedWord) {
    const status = selectedWord?.groupedSearchStatus || "idle";
    if (status === "idle") return { state: "hidden", message: "", groups: [] };
    if (status === "loading" && !selectedWord?.groupedSearchResult?.groups?.length) {
      return {
        state: "loading",
        message: "Loading examples and related dictionary text...",
        groups: [],
      };
    }
    if (status === "unavailable") {
      return {
        state: "unavailable",
        message: selectedWord?.groupedSearchError || "Search previews are not ready yet.",
        groups: [],
      };
    }
    if (status === "error") {
      return {
        state: "error",
        message: selectedWord?.groupedSearchError || "Search previews failed.",
        groups: [],
      };
    }
    const groups = (selectedWord?.groupedSearchResult?.groups || [])
      .filter((group) => group.id !== "headwords" && (group.total || group.items?.length));
    if (!groups.length) {
      return {
        state: "empty",
        message: "No extra examples or browse results.",
        groups: [],
      };
    }
    return { state: "ready", message: "", groups };
  }

  function lookupPlaceholderState(selectedWord) {
    if (!selectedWord) {
      return {
        state: "idle",
        title: "Dictionary result",
        copy: "Click a word to look it up.",
      };
    }
    if (selectedWord.lookupStatus === "loading") {
      return {
        state: "loading",
        title: "Looking up...",
        copy: "Loading dictionary matches.",
      };
    }
    if (selectedWord.lookupStatus === "error") {
      return {
        state: "error",
        title: "Lookup failed",
        copy: selectedWord.lookupError || "Dictionary lookup failed.",
      };
    }
    const cards = selectedWord.lookupResult?.cards || [];
    if (cards.length) {
      return {
        state: "cards",
        title: `${cards.length} dictionary ${cards.length === 1 ? "card" : "cards"}`,
        copy: "Dictionary match",
        cards,
      };
    }
    const result = selectedWord.lookupResult?.result;
    if (!result) {
      return {
        state: "generated-fallback",
        title: "",
        copy: "",
      };
    }
    return {
      state: "definition",
      title: result.word || selectedWord.word,
      copy: result.language || "Dictionary match",
      result,
      definitions: selectedWord.lookupResult?.definitions || [],
    };
  }

  function cardTranslationButtonState({
    card,
    translationAction = null,
    translationVisible = false,
    translationPending = false,
    canRequestTranslation = false,
  } = {}) {
    if (!translationAction) return null;
    const label = translationPending
      ? "Translation loading"
      : translationVisible ? "Hide translation" : "Show translation";
    return {
      action: translationAction,
      datasetKey: `afAction-${translationAction.id}`,
      disabled: Boolean(translationPending) || !canRequestTranslation,
      pending: Boolean(translationPending),
      pressed: Boolean(translationVisible),
      label,
      title: label,
      srText: translationVisible ? "Hide translation" : "Show translation",
      cardId: card?.id || "",
    };
  }

  function cardMenuButtonState({
    card,
    menuOpenId = "",
  } = {}) {
    if (!card?.id || isGeneratedDictionaryCard(card)) return null;
    return {
      datasetKey: `afCardMenu-${card.id}`,
      expanded: menuOpenId === card.id,
      label: "Card actions",
      title: "Card actions",
      cardId: card.id,
    };
  }

  function collapseButtonState(card, collapseAction = null) {
    if (!collapseAction?.onClick) return null;
    const label = collapseAction.label || "Collapse card";
    return {
      datasetKey: `afPreviewCollapse-${card?.id || "card"}`,
      label,
      title: label,
    };
  }

  function headwordAudioButtonState({
    card,
    playable = false,
    pending = false,
    fallbackWord = "",
  } = {}) {
    if (!playable) return null;
    const title = pending ? "Preparing pronunciation" : "Play headword audio";
    const headword = overlayTitle(card, fallbackWord);
    return {
      datasetKey: `afHeadwordAudio-${card?.id || "card"}`,
      pending: Boolean(pending),
      disabled: Boolean(pending),
      title,
      label: pending
        ? `Preparing pronunciation for ${headword}`
        : `Play pronunciation for ${headword}`,
      srText: "Play headword audio",
    };
  }

  function visibleCardTranslation({ card, visibleTranslationsByCardId = {}, selectedWord = null } = {}) {
    if (!card?.id || visibleTranslationsByCardId[card.id] !== true) return null;
    const translation = selectedWord?.translationsByCardId?.[card.id];
    if (!translation || translation.error) return null;
    return translation;
  }

  function cardTranslationsVisible({ card, visibleTranslationsByCardId = {} } = {}) {
    return Boolean(card?.id && visibleTranslationsByCardId[card.id] === true);
  }

  function overlayCardRenderState({
    card,
    selectedWord = null,
    visibleTranslationsByCardId = {},
    translationPendingByCardId = {},
    cardActionFeedbackByCardId = {},
    cardMenuOpenId = "",
    collapseAction = null,
    generatedDraftItem = null,
  } = {}) {
    const feedback = cardActionFeedbackByCardId[card?.id];
    const cardTranslation = visibleCardTranslation({ card, visibleTranslationsByCardId, selectedWord });
    const translationsVisible = cardTranslationsVisible({ card, visibleTranslationsByCardId });
    const translationActions = displayActionsByGroup(card, "translation");
    const summary = card?.summary || {};
    return {
      card,
      cardTranslation,
      generated: isGeneratedDictionaryCard(card),
      feedbackStatus: feedback?.status || "",
      chips: overlayChips(card),
      headwordTranslation: lookupOrOverlayHeadword(card, cardTranslation, {
        translationVisible: translationsVisible,
      }),
      headerActions: {
        translation: cardTranslationButtonState({
          card,
          translationAction: translationActions[0],
          translationVisible: translationsVisible,
          translationPending: Boolean(translationPendingByCardId[card?.id] || card?.translation?.status === "pending"),
          canRequestTranslation: cardCanRequestTranslation(card, generatedDraftItem),
        }),
        menu: cardMenuButtonState({
          card,
          menuOpenId: cardMenuOpenId,
        }),
        collapse: collapseButtonState(card, collapseAction),
      },
      summaryDefinition: summary.definition || "",
      definitionTranslation: lookupOrOverlayDefinition(card, cardTranslation, 0, {
        translationVisible: translationsVisible,
      }),
      personalChips: progressSignal(card?.progress),
    };
  }

  function overlaySectionTranslation({ card, section, allSections, translation = null, visibleTranslationsByCardId = {} } = {}) {
    return lookupOrOverlaySection(card, section, allSections, translation, {
      translationVisible: cardTranslationsVisible({ card, visibleTranslationsByCardId }),
    });
  }

  function reviewActionStates({ card = null, feedback = null } = {}) {
    const displayActions = displayActionsByGroup(card, "progress");
    return displayActions.map((displayAction) => {
      const isActive = feedback?.actionId === displayAction.id && feedback.status !== "error";
      const isGeneratedSave = displayAction?.command?.kind === "generated-save-and-start-learning";
      return {
        action: displayAction,
        label: displayAction.label || displayAction.id,
        datasetKey: `afAction-${displayAction.id}`,
        active: isActive,
        disabled: (!card?.entryId && !isGeneratedSave) ||
          feedback?.status === "pending" ||
          (feedback?.status === "saved" && feedback.actionId === displayAction.id),
        pending: feedback?.actionId === displayAction.id && feedback.status === "pending",
        saved: feedback?.actionId === displayAction.id && feedback.status === "saved",
        error: feedback?.actionId === displayAction.id && feedback.status === "error",
        message: feedback?.actionId === displayAction.id ? feedback.message || "" : "",
      };
    });
  }

  function formatRelativeDate(value, options = {}) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return "seen";
    const now = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
    const days = Math.max(0, Math.round((now - timestamp) / 86400000));
    if (days <= 0) return "today";
    if (days === 1) return "1d";
    return `${days}d`;
  }

  function cardHasLookupTranslations(card) {
    if (!card) return false;
    const summary = card.summary || {};
    return Boolean(
      cleanTranslationText(card.headwordTranslation) ||
      cleanTranslationText(summary.definitionTranslation) ||
      cleanTranslationText(summary.exampleTranslation) ||
      (Array.isArray(card.sections) && card.sections.some((section) => cleanTranslationText(section?.translation)))
    );
  }

  function cardCanRequestTranslation(card, generatedDraftItem = null) {
    return Boolean(card?.entryId || card?.generatedDraftItem || generatedDraftItem);
  }

  function lookupOrOverlayHeadword(card, translation, options = {}) {
    if (!options.alwaysUseLookup && !options.translationVisible) return "";
    return cleanTranslationText(card?.headwordTranslation) || translatedHeadword(translation);
  }

  function lookupOrOverlayDefinition(card, translation, meaningIndex = 0, options = {}) {
    if (!options.alwaysUseLookup && !options.translationVisible) return "";
    return cleanTranslationText(card?.summary?.definitionTranslation) ||
      translatedDefinition(translation, meaningIndex);
  }

  function lookupOrOverlaySection(card, section, allSections, translation, options = {}) {
    if (!section) return "";
    if (!options.alwaysUseLookup && !options.translationVisible) return "";
    return cleanTranslationText(section.translation) ||
      translatedSection(section, allSections, translation);
  }

  function translatedHeadword(translation) {
    const overlay = translationOverlay(translation);
    return cleanTranslationText(overlay?.headword);
  }

  function translatedDefinition(translation, meaningIndex = 0) {
    const meaning = translationMeaning(translation, meaningIndex);
    return cleanTranslationText(meaning?.definition);
  }

  function translatedExample(translation, exampleIndex = 0) {
    const examples = translationMeanings(translation).flatMap((meaning) =>
      Array.isArray(meaning?.examples) ? meaning.examples : [],
    );
    return cleanTranslationText(examples[exampleIndex]);
  }

  function translatedSection(section, allSections, translation) {
    if (!section || !translation) return "";
    const peers = Array.isArray(allSections) ? allSections : [];
    if (section.kind === "meaning") {
      const meaningIndex = sectionKindIndex(section, peers, "meaning");
      return meaningIndex >= 0 ? translatedDefinition(translation, meaningIndex) : "";
    }
    if (section.kind === "example") {
      const exampleIndex = sectionKindIndex(section, peers, "example");
      return exampleIndex >= 0 ? translatedExample(translation, exampleIndex) : "";
    }
    if (section.kind === "note") {
      return translatedNote(translation);
    }
    if (section.kind === "context") {
      return translatedNote(translation);
    }
    if (section.kind === "idiom") {
      const idiomIndex = sectionKindIndex(section, peers, "idiom");
      return idiomIndex >= 0 ? translatedIdiom(translation, idiomIndex) : "";
    }
    return "";
  }

  function translatedIdiom(translation, idiomIndex = 0) {
    const idioms = translationMeanings(translation).flatMap((meaning) =>
      Array.isArray(meaning?.idioms) ? meaning.idioms : [],
    );
    const idiom = idioms[idiomIndex];
    if (typeof idiom === "string") return cleanTranslationText(idiom);
    if (!idiom || typeof idiom !== "object") return "";
    return [
      idiom.translatedExpression,
      idiom.translatedExplanation,
      idiom.expression,
      idiom.explanation,
    ].map(cleanTranslationText).find(Boolean) || "";
  }

  function translatedNote(translation) {
    const meaning = translationMeaning(translation, 0);
    return cleanTranslationText(meaning?.context) || cleanTranslationText(meaning?.note);
  }

  function sectionKindIndex(section, allSections, kind) {
    return allSections.filter((candidate) => candidate?.kind === kind).findIndex((candidate) =>
      candidate === section || (candidate.id && candidate.id === section.id) || (candidate.sourcePath && candidate.sourcePath === section.sourcePath)
    );
  }

  function translationMeaning(translation, meaningIndex = 0) {
    return translationMeanings(translation)[Math.max(0, meaningIndex)] || null;
  }

  function translationMeanings(translation) {
    const overlay = translationOverlay(translation);
    return Array.isArray(overlay?.meanings) ? overlay.meanings : [];
  }

  function translationOverlay(translation) {
    return translation?.overlay && typeof translation.overlay === "object" ? translation.overlay : null;
  }

  function cleanTranslationText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  window.__afShadowingDictionaryPresentation = {
    overlayChips,
    definitionNumberChip,
    collapsedOverlaySections,
    shouldRenderSectionMicroLabel,
    sectionMicroLabel,
    chipClassName,
    progressSignal,
    dictionaryHeaderCopy,
    dictionaryPanelState,
    selectedSpanSaveLabel,
    overlayTitle,
    displayActionsByGroup,
    shouldRenderDisplayAction,
    isGeneratedDictionaryCard,
    dictionarySearchGroupLabel,
    dictionarySearchItemKey,
    dictionarySearchItemTitle,
    dictionarySearchItemChips,
    dictionarySearchItemText,
    dictionarySearchGroupState,
    focusedDictionarySearchCards,
    highlightedTextParts,
    groupedSearchPreviewState,
    lookupPlaceholderState,
    cardTranslationButtonState,
    cardMenuButtonState,
    collapseButtonState,
    headwordAudioButtonState,
    visibleCardTranslation,
    cardTranslationsVisible,
    overlayCardRenderState,
    overlaySectionTranslation,
    reviewActionStates,
    formatRelativeDate,
    cardHasLookupTranslations,
    cardCanRequestTranslation,
    lookupOrOverlayHeadword,
    lookupOrOverlayDefinition,
    lookupOrOverlaySection,
    translatedHeadword,
    translatedDefinition,
    translatedExample,
    translatedSection,
    translatedIdiom,
    translatedNote,
    sectionKindIndex,
    translationMeaning,
    translationMeanings,
    translationOverlay,
    cleanTranslationText,
  };
})();
