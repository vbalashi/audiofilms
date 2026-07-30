(function audioFilmsSenseCardPresentation() {
  const MESSAGES = {
    en: {
      "partOfSpeech.noun": "noun",
      "partOfSpeech.verb": "verb",
      "partOfSpeech.adjective": "adjective",
      "partOfSpeech.adverb": "adverb",
      meaning: "MEANING",
      meanings: "MEANINGS",
      oneMeaning: "1 meaning",
      examples: "EXAMPLES",
      usage: "USAGE",
      prompt: "HOW WELL DID YOU KNOW THIS MEANING?",
      learn: "Learn",
      markKnown: "Mark as known",
      markedKnown: "Marked as known",
      undo: "Undo",
      again: "Again",
      hard: "Hard",
      good: "Good",
      easy: "Easy",
      showTranslation: "Show translation",
      hideTranslation: "Hide translation",
      playAudio: "Play pronunciation",
      report: "Report",
    },
    nl: {
      "partOfSpeech.noun": "zelfstandig naamwoord",
      "partOfSpeech.verb": "werkwoord",
      "partOfSpeech.adjective": "bijvoeglijk naamwoord",
      "partOfSpeech.adverb": "bijwoord",
      meaning: "BETEKENIS",
      meanings: "BETEKENISSEN",
      oneMeaning: "1 betekenis",
      examples: "VOORBEELDEN",
      usage: "GEBRUIK",
      prompt: "HOE GOED KEN JE DEZE BETEKENIS?",
      learn: "Leren",
      markKnown: "Markeer als bekend",
      markedKnown: "Gemarkeerd als bekend",
      undo: "Ongedaan maken",
      again: "Opnieuw",
      hard: "Lastig",
      good: "Goed",
      easy: "Makkelijk",
      showTranslation: "Vertaling tonen",
      hideTranslation: "Vertaling verbergen",
      playAudio: "Uitspraak afspelen",
      report: "Melden",
    },
    ru: {
      "partOfSpeech.noun": "существительное",
      "partOfSpeech.verb": "глагол",
      "partOfSpeech.adjective": "прилагательное",
      "partOfSpeech.adverb": "наречие",
      meaning: "ЗНАЧЕНИЕ",
      meanings: "ЗНАЧЕНИЯ",
      oneMeaning: "1 значение",
      examples: "ПРИМЕРЫ",
      usage: "УПОТРЕБЛЕНИЕ",
      prompt: "НАСКОЛЬКО ХОРОШО ВЫ ЗНАЛИ ЭТО ЗНАЧЕНИЕ?",
      learn: "Учить",
      markKnown: "Отметить как знакомое",
      markedKnown: "Отмечено как знакомое",
      undo: "Отменить",
      again: "Снова",
      hard: "Трудно",
      good: "Хорошо",
      easy: "Легко",
      showTranslation: "Показать перевод",
      hideTranslation: "Скрыть перевод",
      playAudio: "Воспроизвести произношение",
      report: "Сообщить",
    },
  };

  const REVIEW_ORDER = ["fail", "hard", "success", "easy"];

  function isSenseCard(card) {
    return card?.contractVersion === "dict-sense-card-entry-v1" &&
      card?.entry?.kind === "sense-card" &&
      card?.entryId === card?.entry?.entryId;
  }

  function interfaceLanguageCode(preferences = {}, browserLanguage = "") {
    const requested = preferences.interfaceLanguageCode ||
      preferences.onboardingLanguage ||
      String(browserLanguage || "").split("-")[0];
    return MESSAGES[requested] ? requested : "en";
  }

  function message(key, languageCode = "en") {
    return MESSAGES[languageCode]?.[key] || MESSAGES.en[key] || key;
  }

  function cardViewModel(card, options = {}) {
    if (!isSenseCard(card)) return null;
    const languageCode = interfaceLanguageCode(
      { interfaceLanguageCode: options.interfaceLanguageCode },
      options.browserLanguage,
    );
    const targetLanguageCode = options.translationTargetLanguageCode || "";
    const translationVisible = Boolean(options.translationVisible);
    const group = card.group || {};
    const entry = card.entry || {};
    const header = group.header || {};
    const nodes = [...(entry.contentNodes || [])].sort((left, right) => {
      const orderDelta = Number(left?.order || 0) - Number(right?.order || 0);
      return orderDelta || String(left?.contentNodeId || "").localeCompare(String(right?.contentNodeId || ""));
    });
    const definitionNode = nodes.find((node) => node.contentNodeId === entry.summaryContentNodeId) ||
      nodes.find((node) => node.kind === "definition") ||
      null;
    const examples = nodes
      .filter((node) => node.kind === "example")
      .map((node) => contentNodeView(node, targetLanguageCode, translationVisible));
    const usage = nodes
      .filter((node) => node.kind === "usage-pattern" || node.kind === "usage-note")
      .map((node) => contentNodeView(node, targetLanguageCode, translationVisible));
    const capabilities = entry.capabilities || [];
    const reviewActions = capabilities
      .filter((capability) => capability.actionId === "review-card")
      .sort(
        (left, right) =>
          REVIEW_ORDER.indexOf(left.reviewResult) - REVIEW_ORDER.indexOf(right.reviewResult),
      )
      .map((capability) => actionView(capability, languageCode));
    const startAction = actionView(
      capabilities.find((capability) => capability.actionId === "start-learning"),
      languageCode,
    );
    const markKnownAction = actionView(
      capabilities.find((capability) => capability.actionId === "mark-known"),
      languageCode,
    );
    const undoKnownAction = actionView(
      capabilities.find((capability) => capability.actionId === "undo-known"),
      languageCode,
    );
    const hasReadyTranslation = Boolean(
      readyEntryTranslation(entry.translation, targetLanguageCode) ||
      nodes.some((node) => readyNodeTranslation(node, targetLanguageCode)),
    );
    const partOfSpeech = entry.partOfSpeech || header.partOfSpeech || null;

    return {
      id: card.id,
      entryId: entry.entryId,
      phase: entry.card?.scheduler?.phase || "guest",
      known: Boolean(entry.card?.knownMark),
      article: header.article || "",
      headword: header.displayPronunciation || header.text || "",
      headwordTranslation: translationVisible
        ? readyEntryTranslation(entry.translation, targetLanguageCode)?.text || ""
        : "",
      partOfSpeechLabel: semanticTermLabel(partOfSpeech, languageCode),
      senseCountLabel: group.senseCount === 1 ? message("oneMeaning", languageCode) : "",
      indicators: group.indicators || [],
      repeatLabel: entry.card?.scheduler?.repeatCount
        ? `${entry.card.scheduler.repeatCount}×`
        : "",
      audio: header.audio || null,
      canToggleTranslation: hasReadyTranslation,
      translationVisible,
      definition: definitionNode
        ? contentNodeView(definitionNode, targetLanguageCode, translationVisible)
        : { id: "", text: "", translation: "" },
      examples,
      usage,
      startAction,
      markKnownAction,
      undoKnownAction,
      reviewActions,
      reportCapability: capabilities.find((capability) => capability.actionId === "report-content") || null,
      labels: {
        meanings: message(group.senseCount === 1 ? "meaning" : "meanings", languageCode),
        examples: message("examples", languageCode),
        usage: message("usage", languageCode),
        prompt: message("prompt", languageCode),
        markedKnown: message("markedKnown", languageCode),
        undo: message("undo", languageCode),
        showTranslation: message("showTranslation", languageCode),
        hideTranslation: message("hideTranslation", languageCode),
        playAudio: message("playAudio", languageCode),
        report: message("report", languageCode),
      },
    };
  }

  function semanticTermLabel(term, languageCode) {
    if (!term) return "";
    const shortLabels = {
      "partOfSpeech.noun": { en: "n", nl: "zn", ru: "сущ." },
      "partOfSpeech.verb": { en: "v", nl: "ww", ru: "гл." },
      "partOfSpeech.adjective": { en: "adj", nl: "bn", ru: "прил." },
      "partOfSpeech.adverb": { en: "adv", nl: "bw", ru: "нар." },
    };
    if (shortLabels[term.messageKey]?.[languageCode]) {
      return shortLabels[term.messageKey][languageCode];
    }
    return message(term.messageKey, languageCode) !== term.messageKey
      ? message(term.messageKey, languageCode)
      : term.sourceValue || term.termId || "";
  }

  function contentNodeView(node, targetLanguageCode, translationVisible) {
    return {
      id: node.contentNodeId || "",
      text: node.text || "",
      translation: translationVisible
        ? readyNodeTranslation(node, targetLanguageCode)?.text || ""
        : "",
    };
  }

  function readyEntryTranslation(translation, targetLanguageCode) {
    if (!translation || translation.status !== "ready" || !translation.text) return null;
    if (targetLanguageCode && translation.targetLanguageCode !== targetLanguageCode) return null;
    return translation;
  }

  function readyNodeTranslation(node, targetLanguageCode) {
    return (node?.translations || []).find(
      (translation) =>
        translation.status === "ready" &&
        Boolean(translation.text) &&
        (!targetLanguageCode || translation.targetLanguageCode === targetLanguageCode),
    ) || null;
  }

  function actionView(capability, languageCode) {
    if (!capability) return null;
    const labelKey = {
      "start-learning": "learn",
      "mark-known": "markKnown",
      "undo-known": "undo",
      fail: "again",
      hard: "hard",
      success: "good",
      easy: "easy",
    }[capability.reviewResult || capability.actionId];
    return {
      id: capability.elementId,
      label: message(labelKey, languageCode),
      actionId: capability.actionId,
      reviewResult: capability.reviewResult || "",
      command: {
        kind: "platform-action-v2",
        contractVersion: "dict-sense-card-action-v1",
        actionId: capability.actionId,
        target: capability.target,
        ...(capability.reviewResult ? { reviewResult: capability.reviewResult } : {}),
      },
    };
  }

  window.__afShadowingSenseCardPresentation = {
    isSenseCard,
    interfaceLanguageCode,
    message,
    cardViewModel,
  };
})();
