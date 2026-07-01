(function audioFilmsDictionaryOperationsContentFacade() {
  function createDictionaryOperationsController(deps = {}) {
    const modules = deps.modules || {};
    const commands = deps.commands || {};
    const environment = deps.environment || {};

    function clearSelectedSpan() {
      state().selectedSpan = null;
      commands.render?.();
    }

    async function saveSelectedSpanCard(span) {
      return modules.selectedSpanWorkflowApi.saveSelectedSpanCard(span, {
        accountStatus: state().accountStatus,
        getSelectedSpan: () => state().selectedSpan,
        setSelectedSpan: (nextSpan) => {
          state().selectedSpan = nextSpan;
        },
        buildPayload: selectedSpanGeneratedEntryPayload,
        postDictionaryCommand,
        createMutationTurnId: commands.createMutationTurnId,
        sourceContext: selectedSpanSourceContext,
        render: commands.render,
      });
    }

    function selectedSpanGeneratedEntryPayload(span, draft = null, action = "generated-entry-draft") {
      const currentState = state();
      const phrase = currentState.phrases[span.phraseIndex] || currentState.phrases[currentState.currentIndex];
      const source = commands.getSelectedPracticeSource?.();
      return modules.selectedSpanApi.selectedSpanGeneratedEntryPayload({
        span,
        phrase,
        sourceLanguageCode: modules.phraseTranslationApi.sourceLanguageCode({
          source,
          transcriptResult: currentState.transcriptResult,
        }),
        sourceContext: selectedSpanSourceContext(span, "", action),
        draftPayload: modules.generatedEntryApi.generatedDraftPayload(draft),
      });
    }

    function selectedSpanSourceContext(span, entryId = "", action = "generated-entry-draft") {
      return modules.selectedSpanWorkflowApi.selectedSpanSourceContext(span, {
        entryId,
        action,
        state: state(),
        selectedSpans: modules.selectedSpanApi,
        getSelectedPracticeSource: commands.getSelectedPracticeSource,
        getVideoElement: commands.getVideoElement,
        youtubeVideoTitle,
        extensionVersion: commands.extensionVersion,
      });
    }

    function selectedSpanSourceBinding(span) {
      return modules.selectedSpanWorkflowApi.selectedSpanSourceBinding(span, {
        state: state(),
        selectedSpans: modules.selectedSpanApi,
        getSelectedPracticeSource: commands.getSelectedPracticeSource,
      });
    }

    function renderCardActionMenu(parent, card) {
      return modules.dictionaryOverlayWorkflowApi.renderCardActionMenu(parent, card, {
        state: state(),
        dictionaryDom: modules.dictionaryDomApi,
        issueReports: modules.issueReportsApi,
        describePhraseAtIndex: commands.describePhraseAtIndex,
        openIssueReportDialog: commands.openIssueReportDialog,
        recordDebugEvent: commands.recordDebugEvent,
        render: commands.render,
      });
    }

    function cardAudioPlayable(card) {
      return modules.dictionaryAudioApi.cardAudioPlayable(card);
    }

    async function playHeadwordAudio(card) {
      return modules.dictionaryAudioWorkflowApi.playHeadwordAudio(card, dictionaryAudioWorkflowOptions());
    }

    async function resolveHeadwordAudioUrl(card) {
      return modules.dictionaryAudioWorkflowApi.resolveHeadwordAudioUrl(card, dictionaryAudioWorkflowOptions());
    }

    function dictionaryAudioWorkflowOptions() {
      return {
        AudioConstructor: typeof environment.AudioConstructor === "function" ? environment.AudioConstructor : null,
        titleForCard: (card) => modules.dictionaryPresentationApi.overlayTitle(card, state().selectedWord?.word),
        postDictionaryCommand,
        setPending: setCardAudioPending,
        recordDebugEvent: commands.recordDebugEvent,
      };
    }

    function setCardAudioPending(cardId, pending) {
      if (!cardId) return;
      state().audioPendingByCardId = modules.dictionaryAudioApi.audioPendingState(state().audioPendingByCardId, cardId, pending);
      commands.render?.();
    }

    function toggleCardMenu(cardId) {
      state().cardMenuOpenId = state().cardMenuOpenId === cardId ? "" : cardId;
      commands.render?.();
    }

    function visibleCardTranslation(card) {
      return modules.dictionaryPresentationApi.visibleCardTranslation({
        card,
        visibleTranslationsByCardId: state().visibleTranslationsByCardId,
        selectedWord: state().selectedWord,
      });
    }

    function cardTranslationsVisible(card) {
      return modules.dictionaryPresentationApi.cardTranslationsVisible({
        card,
        visibleTranslationsByCardId: state().visibleTranslationsByCardId,
      });
    }

    function cardHasLookupTranslations(card) {
      return modules.dictionaryPresentationApi.cardHasLookupTranslations(card);
    }

    function cardCanRequestTranslation(card) {
      return modules.dictionaryPresentationApi.cardCanRequestTranslation(card, generatedDraftItemFromOverlayCard(card));
    }

    function lookupOrOverlayHeadword(card, translation, options = {}) {
      return modules.dictionaryPresentationApi.lookupOrOverlayHeadword(card, translation, {
        ...options,
        translationVisible: cardTranslationsVisible(card),
      });
    }

    function lookupOrOverlayDefinition(card, translation, meaningIndex = 0, options = {}) {
      return modules.dictionaryPresentationApi.lookupOrOverlayDefinition(card, translation, meaningIndex, {
        ...options,
        translationVisible: cardTranslationsVisible(card),
      });
    }

    function lookupOrOverlaySection(card, section, allSections, translation, options = {}) {
      return modules.dictionaryPresentationApi.lookupOrOverlaySection(card, section, allSections, translation, {
        ...options,
        translationVisible: cardTranslationsVisible(card),
      });
    }

    function handleAccountAction() {
      if (state().accountStatus === "signed-in") {
        commands.disconnectAccount?.();
      } else {
        commands.connectAccount?.();
      }
    }

    function performDisplayAction(card, displayAction) {
      return modules.dictionaryOverlayWorkflowApi.performDisplayAction(card, displayAction, {
        getSelectedWord: () => state().selectedWord,
        toggleCardTranslation: commands.toggleCardTranslation,
        performDictionaryCardAction,
        saveGeneratedDictionaryDraft,
      });
    }

    async function performDictionaryCardAction(card, displayAction, actionPayload) {
      return modules.dictionaryActionWorkflowApi.performDictionaryCardAction(card, displayAction, actionPayload, {
        getSelectedWord: () => state().selectedWord,
        setSelectedWord: (selectedWord) => {
          state().selectedWord = selectedWord;
        },
        setCardFeedback: (cardId, feedback) => {
          state().cardActionFeedbackByCardId = {
            ...state().cardActionFeedbackByCardId,
            [cardId]: feedback,
          };
        },
        buildPayload: frozenDictionaryActionPayload,
        postDictionaryCommand,
        isCurrentLookup,
        reloadLookup: commands.lookupSelectedWord,
        render: commands.render,
      });
    }

    async function generateDictionaryDraft(selectedWord) {
      return modules.generatedEntryWorkflowApi.generateDictionaryDraft(selectedWord, generatedEntryWorkflowOptions());
    }

    async function saveGeneratedDictionaryDraft(selectedWord, card = null) {
      return modules.generatedEntryWorkflowApi.saveGeneratedDictionaryDraft(selectedWord, card, generatedEntryWorkflowOptions());
    }

    function generatedEntryWorkflowOptions() {
      return {
        getSelectedWord: () => state().selectedWord,
        setSelectedWord: (selectedWord) => {
          state().selectedWord = selectedWord;
        },
        buildPayload: generatedEntryBasePayload,
        postDictionaryCommand,
        createMutationTurnId: commands.createMutationTurnId,
        sourceContext: generatedEntrySourceContext,
        isCurrentLookup,
        reloadLookup: commands.lookupSelectedWord,
        render: commands.render,
      };
    }

    function generatedEntryBasePayload(selectedWord, draft = null, card = null) {
      const currentState = state();
      return modules.generatedEntryApi.generatedEntryPayloadFromSelection({
        selectedWord,
        phrases: currentState.phrases,
        currentIndex: currentState.currentIndex,
        source: commands.getSelectedPracticeSource?.(),
        sourceContext: generatedEntrySourceContext(selectedWord),
        draft,
        card,
      });
    }

    function generatedEntrySourceContext(selectedWord, entryId = "") {
      return modules.generatedEntryApi.generatedEntrySourceContext({
        selectedWord,
        entryId,
        buildSourceContext: buildDictionaryActionSourceContext,
      });
    }

    function createDictionarySourceBinding(word, phraseIndex, selection = {}) {
      const currentState = state();
      return modules.sourceBindingApi.createDictionarySourceBinding({
        word,
        phraseIndex,
        selection,
        videoId: currentState.videoId,
        selectedSourceId: currentState.selectedSourceId,
        selectedTrack: currentState.selectedTrack,
        phrases: currentState.phrases,
        currentIndex: currentState.currentIndex,
        transcriptResult: currentState.transcriptResult,
        source: commands.getSelectedPracticeSource?.(),
      });
    }

    function frozenDictionaryActionPayload(selectedWord, card, actionPayload = {}) {
      return modules.dictionaryActionApi.frozenDictionaryActionPayload({
        selectedWord,
        card,
        actionPayload,
        currentVideoId: state().videoId,
        createMutationTurnId: commands.createMutationTurnId,
        isUuid,
        buildSourceContext: buildDictionaryActionSourceContext,
      });
    }

    function buildDictionaryActionSourceContext(binding, card, action) {
      const video = commands.getVideoElement?.();
      return modules.sourceBindingApi.buildDictionaryActionSourceContext({
        binding,
        card,
        action,
        observation: {
          currentPlaybackTimeMs: video ? video.currentTime * 1000 : null,
          title: youtubeVideoTitle(),
          capturedAt: new Date().toISOString(),
        },
        clientVersion: commands.extensionVersion?.() || "",
      });
    }

    function youtubeVideoTitle() {
      const title = environment.document?.title || "";
      return title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
    }

    function isUuid(value) {
      return typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    function generatedDraftItemFromOverlayCard(card) {
      return modules.generatedEntryApi.generatedDraftItemFromOverlayCard(card);
    }

    function isCurrentLookup(selectedWord) {
      return state().selectedWord?.lookupSeq === selectedWord.lookupSeq &&
        state().selectedWord?.word === selectedWord.word;
    }

    function dictionaryTransportOptions() {
      return {
        requestDictionaryCommand: commands.requestDictionaryCommand,
        endpoint: modules.dictionaryCommandTransportApi.dictionaryLookupEndpoint(environment.config),
      };
    }

    async function fetchDictionaryResult(request) {
      return modules.dictionaryCommandTransportApi.fetchDictionaryResult(request, dictionaryTransportOptions());
    }

    async function fetchDictionarySearchResult(request) {
      return modules.dictionaryCommandTransportApi.fetchDictionarySearchResult(request, dictionaryTransportOptions());
    }

    async function postDictionaryCommand(operation, payload) {
      return modules.dictionaryCommandTransportApi.postDictionaryCommand(operation, payload, dictionaryTransportOptions());
    }

    function state() {
      return deps.getState();
    }

    return {
      clearSelectedSpan,
      saveSelectedSpanCard,
      selectedSpanSourceBinding,
      renderCardActionMenu,
      cardAudioPlayable,
      playHeadwordAudio,
      resolveHeadwordAudioUrl,
      toggleCardMenu,
      visibleCardTranslation,
      cardTranslationsVisible,
      cardHasLookupTranslations,
      cardCanRequestTranslation,
      lookupOrOverlayHeadword,
      lookupOrOverlayDefinition,
      lookupOrOverlaySection,
      handleAccountAction,
      performDisplayAction,
      performDictionaryCardAction,
      generateDictionaryDraft,
      saveGeneratedDictionaryDraft,
      createDictionarySourceBinding,
      frozenDictionaryActionPayload,
      buildDictionaryActionSourceContext,
      generatedDraftItemFromOverlayCard,
      isCurrentLookup,
      fetchDictionaryResult,
      fetchDictionarySearchResult,
      postDictionaryCommand,
    };
  }

  window.__afShadowingDictionaryOperationsContentFacade = {
    createDictionaryOperationsController,
  };
})();
