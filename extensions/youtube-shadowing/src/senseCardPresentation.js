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
      examples: "EXAMPLES",
      usage: "USAGE",
      prompt: "HOW WELL DID YOU KNOW THIS MEANING?",
      learn: "Learn",
      markKnown: "Mark as known",
      markedKnown: "Marked as known",
      new: "New",
      undo: "Undo",
      again: "Again",
      hard: "Hard",
      good: "Good",
      easy: "Easy",
      showTranslation: "Show translation",
      hideTranslation: "Hide translation",
      playAudio: "Play pronunciation",
      expandMeaning: "Expand meaning",
      collapseMeaning: "Collapse meaning",
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
      examples: "VOORBEELDEN",
      usage: "GEBRUIK",
      prompt: "HOE GOED KEN JE DEZE BETEKENIS?",
      learn: "Leren",
      markKnown: "Markeer als bekend",
      markedKnown: "Gemarkeerd als bekend",
      new: "Nieuw",
      undo: "Ongedaan maken",
      again: "Opnieuw",
      hard: "Lastig",
      good: "Goed",
      easy: "Makkelijk",
      showTranslation: "Vertaling tonen",
      hideTranslation: "Vertaling verbergen",
      playAudio: "Uitspraak afspelen",
      expandMeaning: "Betekenis uitklappen",
      collapseMeaning: "Betekenis inklappen",
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
      examples: "ПРИМЕРЫ",
      usage: "УПОТРЕБЛЕНИЕ",
      prompt: "НАСКОЛЬКО ХОРОШО ВЫ ЗНАЛИ ЭТО ЗНАЧЕНИЕ?",
      learn: "Учить",
      markKnown: "Отметить как знакомое",
      markedKnown: "Отмечено как знакомое",
      new: "Новое",
      undo: "Отменить",
      again: "Снова",
      hard: "Трудно",
      good: "Хорошо",
      easy: "Легко",
      showTranslation: "Показать перевод",
      hideTranslation: "Скрыть перевод",
      playAudio: "Воспроизвести произношение",
      expandMeaning: "Раскрыть значение",
      collapseMeaning: "Свернуть значение",
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
    const overlayTranslation = readyOverlayTranslation(options.overlayTranslation);
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
      .map((node, index) => contentNodeView(
        node,
        targetLanguageCode,
        translationVisible,
        overlayExampleTranslation(overlayTranslation, index),
      ));
    const usage = nodes
      .filter((node) => node.kind === "usage-pattern" || node.kind === "usage-note")
      .map((node, index) => contentNodeView(
        node,
        targetLanguageCode,
        translationVisible,
        overlayUsageTranslation(overlayTranslation, index),
      ));
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
      nodes.some((node) => readyNodeTranslation(node, targetLanguageCode)) ||
      overlayTranslation,
    );
    const partOfSpeech = entry.partOfSpeech || header.partOfSpeech || null;

    return {
      contractVersion: card.contractVersion,
      id: card.id,
      entryId: entry.entryId,
      phase: entry.card?.scheduler?.phase || "guest",
      known: Boolean(entry.card?.knownMark),
      article: header.article || "",
      headword: header.displayPronunciation || header.text || "",
      headwordTranslation: translationVisible
        ? readyEntryTranslation(entry.translation, targetLanguageCode)?.text ||
          cleanText(overlayTranslation?.headword)
        : "",
      partOfSpeechTermId: partOfSpeech?.termId || "",
      partOfSpeechLabel: semanticTermLabel(partOfSpeech, languageCode),
      partOfSpeechFullLabel: semanticTermFullLabel(partOfSpeech, languageCode),
      indicators: group.indicators || [],
      repeatCount: Number(entry.card?.scheduler?.repeatCount || 0),
      repeatLabel: entry.card?.scheduler?.repeatCount
        ? `${entry.card.scheduler.repeatCount}×`
        : message("new", languageCode),
      audio: header.audio || null,
      canToggleTranslation: hasReadyTranslation || options.canRequestTranslation === true,
      translationVisible,
      definition: definitionNode
        ? contentNodeView(
          definitionNode,
          targetLanguageCode,
          translationVisible,
          overlayDefinitionTranslation(overlayTranslation),
        )
        : { id: "", text: "", translation: "" },
      examples,
      usage,
      startAction,
      markKnownAction,
      undoKnownAction,
      reviewActions,
      reportAction: reportView(
        capabilities.find((capability) => capability.actionId === "report-content"),
        languageCode,
      ),
      labels: {
        meanings: message(group.senseCount === 1 ? "meaning" : "meanings", languageCode),
        new: message("new", languageCode),
        examples: message("examples", languageCode),
        usage: message("usage", languageCode),
        prompt: message("prompt", languageCode),
        markedKnown: message("markedKnown", languageCode),
        undo: message("undo", languageCode),
        showTranslation: message("showTranslation", languageCode),
        hideTranslation: message("hideTranslation", languageCode),
        playAudio: message("playAudio", languageCode),
        expandMeaning: message("expandMeaning", languageCode),
        collapseMeaning: message("collapseMeaning", languageCode),
        report: message("report", languageCode),
      },
    };
  }

  function groupViewModel(cards, options = {}) {
    const semanticCards = (cards || [])
      .filter(isSenseCard)
      .sort((left, right) => {
        const leftOrdinal = Number.isFinite(left?.entry?.meaningOrdinal)
          ? left.entry.meaningOrdinal
          : Number.MAX_SAFE_INTEGER;
        const rightOrdinal = Number.isFinite(right?.entry?.meaningOrdinal)
          ? right.entry.meaningOrdinal
          : Number.MAX_SAFE_INTEGER;
        return leftOrdinal - rightOrdinal ||
          String(left?.entryId || "").localeCompare(String(right?.entryId || ""));
      });
    if (!semanticCards.length) return null;
    const groupId = semanticCards[0]?.group?.headwordGroupId || "";
    const groupCards = semanticCards.filter(
      (card) => (card?.group?.headwordGroupId || "") === groupId,
    );
    const expandedByEntryId = options.expandedByEntryId || {};
    const translationVisibleByEntryId = options.translationVisibleByEntryId || {};
    const overlayTranslationByEntryId = options.overlayTranslationByEntryId || {};
    const meanings = groupCards.map((card, index) => ({
      ...cardViewModel(card, {
        ...options,
        translationVisible: translationVisibleByEntryId[card.entryId] === true,
        overlayTranslation: overlayTranslationByEntryId[card.entryId] || null,
      }),
      meaningOrdinal: card.entry.meaningOrdinal,
      numberLabel: String(card.entry.meaningOrdinal || index + 1),
      expanded: Object.prototype.hasOwnProperty.call(expandedByEntryId, card.entryId)
        ? expandedByEntryId[card.entryId] === true
        : index === 0,
    }));
    const first = meanings[0];
    const group = groupCards[0].group || {};
    return {
      contractVersion: "dict-sense-card-group-v1",
      groupId,
      article: first.article,
      headword: first.headword,
      partOfSpeechTermId: first.partOfSpeechTermId,
      partOfSpeechLabel: first.partOfSpeechLabel,
      partOfSpeechFullLabel: first.partOfSpeechFullLabel,
      indicators: first.indicators,
      audio: first.audio,
      senseCount: group.senseCount || meanings.length,
      canToggleTranslation: meanings.some((meaning) => meaning.canToggleTranslation),
      translationVisible: meanings.length > 0 &&
        meanings.every((meaning) => meaning.translationVisible),
      meanings,
      labels: first.labels,
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

  function semanticTermFullLabel(term, languageCode) {
    if (!term) return "";
    return message(term.messageKey, languageCode) !== term.messageKey
      ? message(term.messageKey, languageCode)
      : term.sourceValue || term.termId || "";
  }

  function contentNodeView(
    node,
    targetLanguageCode,
    translationVisible,
    overlayTranslation = "",
  ) {
    return {
      id: node.contentNodeId || "",
      text: node.text || "",
      translation: translationVisible
        ? readyNodeTranslation(node, targetLanguageCode)?.text || cleanText(overlayTranslation)
        : "",
    };
  }

  function readyOverlayTranslation(translation) {
    if (!translation || translation.error || typeof translation.overlay !== "object") return null;
    return translation.overlay;
  }

  function overlayDefinitionTranslation(overlay) {
    return cleanText(overlayMeanings(overlay)[0]?.definition);
  }

  function overlayExampleTranslation(overlay, exampleIndex = 0) {
    const examples = overlayMeanings(overlay).flatMap((meaning) =>
      Array.isArray(meaning?.examples) ? meaning.examples : [],
    );
    return cleanText(examples[exampleIndex]);
  }

  function overlayUsageTranslation(overlay, usageIndex = 0) {
    const usage = overlayMeanings(overlay).flatMap((meaning) => [
      meaning?.context,
      meaning?.note,
    ].filter(Boolean));
    return cleanText(usage[usageIndex]);
  }

  function overlayMeanings(overlay) {
    return Array.isArray(overlay?.meanings) ? overlay.meanings : [];
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
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

  function reportView(capability, languageCode) {
    if (!capability) return null;
    return {
      id: capability.elementId,
      label: message("report", languageCode),
      actionId: capability.actionId,
      target: capability.target,
    };
  }

  window.__afShadowingSenseCardPresentation = {
    isSenseCard,
    interfaceLanguageCode,
    message,
    cardViewModel,
    groupViewModel,
  };
})();
