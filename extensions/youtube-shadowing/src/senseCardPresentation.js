(function audioFilmsSenseCardPresentation() {
  const MESSAGES = {
    en: {
      "partOfSpeech.afk": "abbreviation",
      "partOfSpeech.bn": "adjective",
      "partOfSpeech.bw": "adverb",
      "partOfSpeech.lidw": "article",
      "partOfSpeech.tsw": "interjection",
      "partOfSpeech.tw": "numeral",
      "partOfSpeech.vnw": "pronoun",
      "partOfSpeech.vv": "prefix",
      "partOfSpeech.vw": "conjunction",
      "partOfSpeech.vz": "preposition",
      "partOfSpeech.ww": "verb",
      "partOfSpeech.zn": "noun",
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
      "partOfSpeech.afk": "afkorting",
      "partOfSpeech.bn": "bijvoeglijk naamwoord",
      "partOfSpeech.bw": "bijwoord",
      "partOfSpeech.lidw": "lidwoord",
      "partOfSpeech.tsw": "tussenwerpsel",
      "partOfSpeech.tw": "telwoord",
      "partOfSpeech.vnw": "voornaamwoord",
      "partOfSpeech.vv": "voorvoegsel",
      "partOfSpeech.vw": "voegwoord",
      "partOfSpeech.vz": "voorzetsel",
      "partOfSpeech.ww": "werkwoord",
      "partOfSpeech.zn": "zelfstandig naamwoord",
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
      "partOfSpeech.afk": "аббревиатура",
      "partOfSpeech.bn": "прилагательное",
      "partOfSpeech.bw": "наречие",
      "partOfSpeech.lidw": "артикль",
      "partOfSpeech.tsw": "междометие",
      "partOfSpeech.tw": "числительное",
      "partOfSpeech.vnw": "местоимение",
      "partOfSpeech.vv": "приставка",
      "partOfSpeech.vw": "союз",
      "partOfSpeech.vz": "предлог",
      "partOfSpeech.ww": "глагол",
      "partOfSpeech.zn": "существительное",
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
  const PART_OF_SPEECH_SHORT_LABELS = {
    "partOfSpeech.afk": { en: "abbr.", nl: "afk.", ru: "аббр." },
    "partOfSpeech.bn": { en: "adj", nl: "bn", ru: "прил." },
    "partOfSpeech.bw": { en: "adv", nl: "bw", ru: "нар." },
    "partOfSpeech.lidw": { en: "art", nl: "lidw", ru: "арт." },
    "partOfSpeech.tsw": { en: "int", nl: "tsw", ru: "межд." },
    "partOfSpeech.tw": { en: "num", nl: "tw", ru: "числ." },
    "partOfSpeech.vnw": { en: "pron", nl: "vnw", ru: "мест." },
    "partOfSpeech.vv": { en: "pref", nl: "vv", ru: "прист." },
    "partOfSpeech.vw": { en: "conj", nl: "vw", ru: "союз" },
    "partOfSpeech.vz": { en: "prep", nl: "vz", ru: "предл." },
    "partOfSpeech.ww": { en: "v", nl: "ww", ru: "гл." },
    "partOfSpeech.zn": { en: "n", nl: "zn", ru: "сущ." },
  };

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
    if (PART_OF_SPEECH_SHORT_LABELS[term.messageKey]?.[languageCode]) {
      return PART_OF_SPEECH_SHORT_LABELS[term.messageKey][languageCode];
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
