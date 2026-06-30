(function audioFilmsIssueReports() {
  const ISSUE_REPORT_CATEGORIES = [
    { value: "phrase-boundary", label: "Incorrect phrase split / merged sentences" },
    { value: "timing", label: "Wrong timing / pause point" },
    { value: "navigation", label: "Replay / Previous / Next behaved wrong" },
    { value: "translation", label: "Translation problem" },
    { value: "dictionary", label: "Dictionary lookup problem" },
    { value: "ui-layout", label: "UI/layout problem" },
    { value: "captions-source", label: "Captions/source problem" },
    { value: "other", label: "Other" },
  ];

  function issueReportCategories() {
    return ISSUE_REPORT_CATEGORIES.map((category) => ({ ...category }));
  }

  function issueReportPayload({
    report,
    category,
    description,
    expectedBehavior,
    includeDiagnostics,
    extensionVersion,
    extensionBuildInfo,
    backendBuildInfo,
    browserUserAgent,
  } = {}) {
    return {
      payload: {
        reportVersion: 1,
        category,
        description,
        expectedBehavior,
        includeDiagnostics,
        diagnostics: includeDiagnostics ? JSON.parse(report) : undefined,
        extensionVersion,
        extensionBuildInfo,
        backendBuildInfo,
        browserUserAgent,
      },
    };
  }

  function formatNavigationIssueReport({
    diagnosticsReportApi = window.__afShadowingDiagnosticsReport,
    extraDiagnostics,
    ...input
  } = {}) {
    if (!diagnosticsReportApi || typeof diagnosticsReportApi.issueReport !== "function") {
      return JSON.stringify({}, null, 2);
    }
    return JSON.stringify(diagnosticsReportApi.issueReport({
      ...input,
      ...(extraDiagnostics && typeof extraDiagnostics === "object"
        ? extraDiagnostics
        : {}),
    }), null, 2);
  }

  function readableIssueSubmitError(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/rate/i.test(message)) return "Too many reports. Copy report and share it manually.";
    if (/missing_description/i.test(message)) return "Describe what went wrong before submitting.";
    return message || "Report submit failed. Copy report and share it manually.";
  }

  function issueReportDialogState(state = {}) {
    const submitError = state.issueSubmitError || "";
    const submitStatus = state.issueSubmitStatus || "";
    return {
      hidden: !state.issueDialogOpen,
      submitting: Boolean(state.issueSubmitting),
      category: state.issueCategory || "",
      description: state.issueDescription || "",
      expectedBehavior: state.issueExpectedBehavior || "",
      includeDiagnostics: Boolean(state.issueIncludeDiagnostics),
      status: {
        text: submitError || submitStatus,
        error: Boolean(submitError),
        hidden: !submitError && !submitStatus,
      },
      submit: {
        text: state.issueSubmitting ? "Submitting..." : "Submit",
        disabled: Boolean(state.issueSubmitting) || !String(state.issueDescription || "").trim(),
      },
      copy: {
        text: state.issueCopied ? "Copied" : "Copy report",
        disabled: Boolean(state.issueSubmitting),
      },
    };
  }

  function phraseBoundaryCase({
    currentIndex = 0,
    phrases = [],
    describePhraseAtIndex,
    videoId = "",
    url = "",
    selectedSource = null,
    transcriptResult = null,
    boundaryCaseReason = "manual-report",
    capturedAt = new Date().toISOString(),
  } = {}) {
    const describe = typeof describePhraseAtIndex === "function"
      ? describePhraseAtIndex
      : (index) => ({ index, present: false });
    const current = describe(currentIndex);
    const windowStart = Math.max(0, currentIndex - 2);
    const windowEnd = Math.min(phrases.length - 1, currentIndex + 2);
    const phraseWindow = [];
    for (let index = windowStart; index <= windowEnd; index += 1) {
      phraseWindow.push(describe(index));
    }

    return {
      kind: "audiofilms-phrase-boundary-raw-case",
      schemaVersion: 1,
      status: "raw",
      reason: boundaryCaseReason,
      capturedAt,
      video: {
        id: videoId || "",
        url,
      },
      source: selectedSource,
      transcriptResult,
      currentIndex,
      currentPhrase: current,
      phraseWindow,
      expectedReview: {
        task: "Decide whether neighboring caption phrases should be merged into one display sentence, split into replay segments, or left separate.",
        output: "Curated fixture for normalizePracticePhrases regression tests.",
      },
    };
  }

  function extensionVersion(runtime) {
    try {
      return runtime?.getManifest?.()?.version || "";
    } catch (_error) {
      return "";
    }
  }

  function extensionBuildInfo({
    manifestVersion = "",
    contentScriptRevision = "",
    buildInfo = {},
    apiBase = "",
  } = {}) {
    return {
      manifestVersion,
      contentScriptRevision,
      manifestName: buildInfo.manifestName || "",
      extensionId: buildInfo.extensionId || "",
      channel: buildInfo.channel || "",
      buildId: buildInfo.buildId || "",
      sourceCommit: buildInfo.sourceCommit || "",
      builtAt: buildInfo.builtAt || "",
      loadedAt: buildInfo.loadedAt || "",
      apiBase,
    };
  }

  function dictionaryCardTranslationIssueSnapshot({
    card,
    selectedWord = {},
    currentPhrase = null,
    currentIndex = 0,
  } = {}) {
    const loadedTranslation = card?.id ? selectedWord.translationsByCardId?.[card.id] : null;
    return {
      kind: "dictionary-card-translation-issue",
      schemaVersion: 1,
      card: compactDictionaryCardForIssue(card),
      loadedTranslation: compactTranslationForIssue(loadedTranslation),
      lookup: {
        selectedWord: selectedWord.word || "",
        clickedForm: card?.clickedForm || selectedWord.word || "",
        phraseIndex: selectedWord.phraseIndex ?? currentIndex,
        sourceLanguageCode: selectedWord.language || "",
        contextText: selectedWord.contextText || currentPhrase?.text || "",
      },
    };
  }

  function compactDictionaryCardForIssue(card) {
    if (!card) return null;
    return {
      id: card.id || "",
      entryId: card.entryId || "",
      headword: card.headword || "",
      clickedForm: card.clickedForm || "",
      language: card.language || "",
      meaningId: card.meaningId ?? null,
      partOfSpeech: card.partOfSpeech || "",
      headwordTranslation: cleanTranslationText(card.headwordTranslation),
      summary: {
        definition: card.summary?.definition || "",
        definitionTranslation: cleanTranslationText(card.summary?.definitionTranslation),
        example: card.summary?.example || "",
        exampleTranslation: cleanTranslationText(card.summary?.exampleTranslation),
      },
      sections: Array.isArray(card.sections)
        ? card.sections.map((section, index) => ({
            id: section?.id || `section-${index + 1}`,
            kind: section?.kind || "",
            text: section?.text || "",
            translation: cleanTranslationText(section?.translation),
            sourcePath: section?.sourcePath || "",
          }))
        : [],
      translation: card.translation || null,
    };
  }

  function compactTranslationForIssue(translation) {
    if (!translation) return null;
    return {
      status: translation.status || "",
      targetLanguageCode: translation.targetLanguageCode || translation.targetLang || "",
      translationId: translation.translationId || "",
      translationPolicyVersion: translation.translationPolicyVersion || "",
      overlay: translation.overlay || null,
      note: translation.note || "",
      error: translation.error || null,
    };
  }

  function dictionaryCardIssueDescription(card, issueKind = "dictionary") {
    const title = issueKind === "translation"
      ? "Dictionary card translation is inaccurate."
      : "Dictionary card content looks wrong.";
    return `${title}\n\nCard: ${card?.headword || card?.clickedForm || ""}\nEntry: ${card?.entryId || card?.id || ""}\nClicked form: ${card?.clickedForm || ""}`;
  }

  function cleanTranslationText(value) {
    return String(value || "").trim();
  }

  function issueReportMockResponse(mode, options = {}) {
    if (mode === "success") {
      return jsonCommandResponse({
        id: "af_report_smoke",
        status: "new",
        category: options.category || "",
        createdAt: options.createdAt || new Date().toISOString(),
      }, true, 201);
    }
    if (mode === "failure" || mode === "error") {
      return jsonCommandResponse({ error: "issue_report_mock_failure" }, false, 503);
    }
    return null;
  }

  function jsonCommandResponse(body, ok = true, status = 200) {
    return {
      ok,
      status,
      text: JSON.stringify(body),
    };
  }

  window.__afShadowingIssueReports = {
    issueReportCategories,
    issueReportPayload,
    formatNavigationIssueReport,
    readableIssueSubmitError,
    issueReportDialogState,
    phraseBoundaryCase,
    extensionVersion,
    extensionBuildInfo,
    dictionaryCardTranslationIssueSnapshot,
    compactDictionaryCardForIssue,
    compactTranslationForIssue,
    dictionaryCardIssueDescription,
    issueReportMockResponse,
  };
})();
