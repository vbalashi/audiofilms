(function audioFilmsKeyboardWorkflow() {
  function handleKeyboardEvent(event, deps = {}) {
    const state = deps.getState();
    const shortcuts = deps.keyboardShortcuts;
    if (!deps.isWatchPage()) return false;
    if (state.issueDialogOpen) {
      return handleIssueDialogKeyboardEvent(event, deps);
    }
    if (!state.learningEnabled) return false;
    if (shortcuts.shouldIgnoreKeyEvent(event)) return false;

    if (shortcuts.isSpaceKey(event)) {
      shortcuts.blockYouTubeShortcut(event, { immediate: true });
      if (event.type === "keydown" && !event.repeat) {
        deps.toggleContinuousPlayback();
      }
      return true;
    }

    if (event.type !== "keydown") return false;

    if (event.code === "Escape") {
      if (state.spanSelectionDraft) {
        deps.clearSpanSelectionDraft();
        shortcuts.blockYouTubeShortcut(event);
        return true;
      }
      if (deps.closeOpenMenus()) {
        shortcuts.blockYouTubeShortcut(event);
        return true;
      }
      return false;
    }

    if (shortcuts.isShortcutHelpKey(event)) {
      shortcuts.blockYouTubeShortcut(event);
      deps.toggleShortcutHelp(event);
      return true;
    }

    const command = commandForEvent(event, shortcuts);
    if (!command) return false;
    shortcuts.blockYouTubeShortcut(event);
    runCommand(command, event, deps);
    return true;
  }

  function handleIssueDialogKeyboardEvent(event, deps = {}) {
    const shortcuts = deps.keyboardShortcuts;
    const isTextEntry = isKeyboardInputEvent(event, shortcuts);
    if (!isTextEntry) {
      event.preventDefault();
    }
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (event.type === "keydown" && event.code === "Escape") {
      deps.closeIssueReportDialog?.();
    }

    return true;
  }

  function isKeyboardInputEvent(event, shortcuts) {
    if (!shortcuts || typeof shortcuts.isKeyboardInputElement !== "function") return false;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    return path.some((element) => shortcuts.isKeyboardInputElement(element))
      || shortcuts.isKeyboardInputElement(event.target);
  }

  function commandForEvent(event, shortcuts) {
    if (event.code === "ArrowRight") return "next";
    if (event.code === "ArrowLeft") return "previous";
    if (event.code === "ArrowDown") return "replay";
    if (event.code === "ArrowUp" || event.code === "KeyS") return "toggle-text";
    if (shortcuts.isSpeedDecreaseKey(event)) return "speed-down";
    if (shortcuts.isSpeedIncreaseKey(event)) return "speed-up";
    if (shortcuts.isTranslationKey(event)) return "toggle-translation";
    if (event.code === "Digit1") return "mode-shadow";
    if (event.code === "Digit2") return "mode-recall";
    return "";
  }

  function runCommand(command, event, deps = {}) {
    if (command === "next") {
      deps.nextPhrase();
    } else if (command === "previous") {
      deps.previousPhrase();
    } else if (command === "replay") {
      deps.replayCurrentPhrase({ slowReplay: event.shiftKey });
    } else if (command === "toggle-text") {
      deps.toggleText(event);
    } else if (command === "speed-down") {
      deps.adjustVideoPlaybackRate(-deps.playbackRateStep);
    } else if (command === "speed-up") {
      deps.adjustVideoPlaybackRate(deps.playbackRateStep);
    } else if (command === "toggle-translation") {
      deps.togglePhraseTranslation(event);
    } else if (command === "mode-shadow") {
      deps.setPracticeMode("shadow");
    } else if (command === "mode-recall") {
      deps.setPracticeMode("recall");
    }
  }

  window.__afShadowingKeyboardWorkflow = {
    handleKeyboardEvent,
    handleIssueDialogKeyboardEvent,
    commandForEvent,
  };
})();
