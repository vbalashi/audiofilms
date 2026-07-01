(function audioFilmsInteractionRuntimeContentFacade() {
  function createInteractionRuntimeController(deps = {}) {
    const commands = deps.commands || {};
    const environment = deps.environment || {};
    const ids = deps.ids || {};
    const modules = deps.modules || {};

    function onDocumentPointerUp(event) {
      if (!state().spanSelectionDraft) return;
      if (isSpanDraftWordEvent(event)) return;
      clearSpanSelectionDraft();
    }

    function isSpanDraftWordEvent(event) {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      return path.some((element) => (
        element instanceof environment.Element
        && element.matches?.(".af-ribbon-word[data-af-phrase-index][data-af-token-index]")
      ));
    }

    function togglePhraseJumpMenu(event) {
      return modules.phraseJumpWorkflow.togglePhraseJumpMenu(state(), event, phraseJumpWorkflowOptions());
    }

    function submitPhraseJump() {
      return modules.phraseJumpWorkflow.submitPhraseJump(state(), phraseJumpWorkflowOptions());
    }

    function phraseJumpWorkflowOptions() {
      return {
        document: environment.document,
        rootId: ids.rootId,
        menuState: modules.menuState,
        requestAnimationFrame: environment.requestAnimationFrame,
        jumpToPhrase: commands.jumpToPhrase,
        render: commands.render,
      };
    }

    function copyIssueReport(report) {
      Promise.resolve()
        .then(() => environment.navigator.clipboard.writeText(report))
        .catch(() => {
          copyTextWithFallback(report);
        });
    }

    function copyTextWithFallback(text) {
      const textarea = environment.document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      environment.document.documentElement.appendChild(textarea);
      textarea.select();
      environment.document.execCommand("copy");
      textarea.remove();
    }

    function isTokenInSelectedSpan(phraseIndex, tokenIndex) {
      return modules.phraseRows.tokenInSpan(state().selectedSpan, phraseIndex, tokenIndex);
    }

    function isTokenInSpanDraft(phraseIndex, tokenIndex) {
      return modules.phraseRows.tokenInSpanDraft(state().spanSelectionDraft, phraseIndex, tokenIndex);
    }

    function applySpanSelectionDraftPreview() {
      const root = environment.document.getElementById(ids.rootId)?.shadowRoot;
      const words = root?.querySelectorAll(".af-ribbon-word[data-af-phrase-index][data-af-token-index]") || [];
      for (const word of words) {
        const phraseIndex = Number(word.dataset.afPhraseIndex);
        const tokenIndex = Number(word.dataset.afTokenIndex);
        word.classList.toggle("is-span-draft", isTokenInSpanDraft(phraseIndex, tokenIndex));
      }
    }

    function clearSpanSelectionDraft() {
      modules.selectedSpanWorkflow.cancelSpanDraft(state(), {
        applyPreview: applySpanSelectionDraftPreview,
      });
    }

    function state() {
      return deps.getState();
    }

    return {
      onDocumentPointerUp,
      togglePhraseJumpMenu,
      submitPhraseJump,
      copyIssueReport,
      copyTextWithFallback,
      isTokenInSelectedSpan,
      isTokenInSpanDraft,
      applySpanSelectionDraftPreview,
      clearSpanSelectionDraft,
    };
  }

  window.__afShadowingInteractionRuntimeContentFacade = {
    createInteractionRuntimeController,
  };
})();
