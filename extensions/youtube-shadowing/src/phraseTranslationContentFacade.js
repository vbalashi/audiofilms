(function audioFilmsPhraseTranslationContentFacade() {
  function createPhraseTranslationController(deps = {}) {
    const modules = deps.modules || {};
    const commands = deps.commands || {};

    function setPracticeMode(mode) {
      return modules.phraseTranslationWorkflowApi.setPracticeMode(state(), mode, phraseTranslationWorkflowOptions());
    }

    function togglePhraseTranslation(event) {
      return modules.phraseTranslationWorkflowApi.togglePhraseTranslation(state(), event, phraseTranslationWorkflowOptions());
    }

    function phraseTranslationState(phrase, index = state().currentIndex) {
      const key = phraseTranslationKey(phrase, index);
      return key ? state().phraseTranslations[key] || null : null;
    }

    function phraseTranslationKey(phrase, index = state().currentIndex) {
      return modules.phraseTranslationApi.phraseTranslationKey({
        phrase,
        index,
        videoId: state().videoId,
        sourceId: state().selectedSourceId,
      });
    }

    function phraseTranslationId(phrase, index = state().currentIndex) {
      return modules.phraseTranslationApi.phraseTranslationId({
        phrase,
        index,
        videoId: state().videoId,
        sourceId: state().selectedSourceId,
      });
    }

    function ensureCurrentPhraseTranslation() {
      return modules.phraseTranslationWorkflowApi.ensureCurrentPhraseTranslation(state(), {
        phraseTranslationKey,
        requestPhraseTranslation,
      });
    }

    async function requestPhraseTranslation(phrase, index, key) {
      return modules.phraseTranslationWorkflowApi.requestPhraseTranslation(state(), {
        phrase,
        index,
        key,
        options: phraseTranslationWorkflowOptions(),
      });
    }

    async function requestSelectedSpanTranslation(span) {
      return modules.phraseTranslationWorkflowApi.requestSelectedSpanTranslation(state(), span, phraseTranslationWorkflowOptions());
    }

    function phraseTranslationWorkflowOptions() {
      return {
        phraseTranslations: modules.phraseTranslationApi,
        getSelectedPracticeSource: commands.getSelectedPracticeSource,
        postDictionaryCommand: commands.postDictionaryCommand,
        phraseTranslationId,
        ensureCurrentPhraseTranslation,
        recordDebugEvent: commands.recordDebugEvent,
        render: commands.render,
      };
    }

    function phraseDisplaySegmentRange(phrase) {
      return modules.phraseTranslationApi.phraseDisplaySegmentRange(phrase);
    }

    function applyPhraseEntryDisplayState() {
      return modules.phraseTranslationWorkflowApi.applyPhraseEntryDisplayState(state(), {
        phraseTranslations: modules.phraseTranslationApi,
        ensureCurrentPhraseTranslation,
      });
    }

    function state() {
      return deps.getState();
    }

    return {
      setPracticeMode,
      togglePhraseTranslation,
      phraseTranslationState,
      phraseTranslationKey,
      phraseTranslationId,
      ensureCurrentPhraseTranslation,
      requestPhraseTranslation,
      requestSelectedSpanTranslation,
      phraseDisplaySegmentRange,
      applyPhraseEntryDisplayState,
    };
  }

  window.__afShadowingPhraseTranslationContentFacade = {
    createPhraseTranslationController,
  };
})();
