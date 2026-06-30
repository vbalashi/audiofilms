(function audioFilmsPhraseJumpWorkflow() {
  function togglePhraseJumpMenu(state, event, options = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const opened = options.menuState.toggleExclusiveMenu(state, "jump");
    state.phraseJumpError = "";
    state.phraseJumpInput = state.phrases.length ? String(state.currentIndex + 1) : "";
    options.render?.();
    if (opened) {
      options.requestAnimationFrame(() => {
        options.document.getElementById(options.rootId)?.shadowRoot
          ?.querySelector("[data-af-jump-input]")
          ?.focus?.();
      });
    }
    return opened;
  }

  function submitPhraseJump(state, options = {}) {
    const targetNumber = Number(state.phraseJumpInput);
    if (!Number.isInteger(targetNumber)) {
      state.phraseJumpError = "Enter a whole number.";
      options.render?.();
      return false;
    }
    if (targetNumber < 1 || targetNumber > state.phrases.length) {
      state.phraseJumpError = `Choose 1-${state.phrases.length}.`;
      options.render?.();
      return false;
    }
    options.jumpToPhrase(targetNumber - 1, "jump-number");
    return true;
  }

  window.__afShadowingPhraseJumpWorkflow = {
    togglePhraseJumpMenu,
    submitPhraseJump,
  };
})();
