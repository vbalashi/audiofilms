(function audioFilmsRibbonControls() {
  const uiIconsApi = window.__afShadowingUiIcons;
  const formatUtilsApi = window.__afShadowingFormatUtils;

  function originalControlLabel(input = {}) {
    return input.textVisible ? "Hide original" : "Show original";
  }

  function originalControlTitle(input = {}) {
    if (input.practiceMode === "recall") {
      return input.textVisible
        ? "Original revealed for the current Recall phrase. Shift+S toggles Shadow sticky original."
        : "Reveal original for the current Recall phrase (S). Shift+S toggles Shadow sticky original.";
    }
    return input.shadowTextVisible
      ? "Original: sticky. Press S to hide only this phrase, or Shift+S to keep originals hidden."
      : "Original: hidden. Press S to reveal only this phrase, or Shift+S to keep originals visible.";
  }

  function translationControlLabel(input = {}) {
    return input.phraseTranslationVisible ? "Hide translation" : "Show translation";
  }

  function phraseTranslationControlTitle(input = {}) {
    const translation = input.translation || null;
    const mode = input.practiceMode === "shadow" && input.phraseTranslationStickyVisible
      ? "Translation: sticky. T or 0 toggles current phrase; Shift+T turns sticky mode off."
      : "Translation: current phrase. Press T or 0. Shift+T toggles sticky mode.";
    if (translation?.status === "ready") return mode;
    if (translation?.status === "loading") return `${mode} Phrase translation is loading.`;
    if (input.accountStatus !== "signed-in") return `${mode} Connect 2000NL to translate phrases.`;
    if (translation?.status === "failed") return `${mode} ${translation.error || "Phrase translation failed."}`;
    return mode;
  }

  function displayToggleButtonHtml(options = {}) {
    const icon = uiIconsApi?.iconSvg ? uiIconsApi.iconSvg(options.icon) : "";
    return [
      icon,
      `<span class="af-sr-only">${escapeHtml(options.label)}</span>`,
    ].join("");
  }

  function playbackRateControlState(input = {}) {
    const rate = Number.isFinite(input.rate) ? input.rate : 1;
    const min = Number.isFinite(input.min) ? input.min : 0.25;
    const max = Number.isFinite(input.max) ? input.max : 2;
    const label = formatPlaybackRate(rate, input);
    return {
      label,
      title: `Playback speed ${label}`,
      lowerDisabled: rate <= min,
      higherDisabled: rate >= max,
      lowerTitle: "Decrease playback speed",
      higherTitle: "Increase playback speed",
    };
  }

  function ribbonPanelState(input = {}) {
    const phraseCount = Array.isArray(input.phrases) ? input.phrases.length : Number(input.phraseCount) || 0;
    const hasPhrases = phraseCount > 0;
    const loading = Boolean(input.loading);
    const isEmpty = !loading && !hasPhrases;
    const currentIndex = Number.isInteger(input.currentIndex) ? input.currentIndex : 0;
    const phraseNumber = currentIndex + 1;
    const jumpOpen = Boolean(input.phraseJumpMenuOpen) && hasPhrases;
    const jumpInputValue = input.phraseJumpInput || (hasPhrases ? String(phraseNumber) : "");

    return {
      hasPhrases,
      isEmpty,
      panelClasses: {
        empty: isEmpty,
        recall: input.practiceMode === "recall",
      },
      controlsHidden: isEmpty,
      count: {
        text: hasPhrases ? `${phraseNumber} / ${phraseCount}` : loading ? "Loading" : "0 / 0",
        disabled: loading || !hasPhrases,
        expanded: Boolean(input.phraseJumpMenuOpen),
        title: hasPhrases ? "Jump to phrase" : "No phrases to jump to",
      },
      jump: {
        open: jumpOpen,
        inputValue: jumpInputValue,
        max: hasPhrases ? String(phraseCount) : "",
        inputDisabled: loading || !hasPhrases,
        startDisabled: loading || !hasPhrases || currentIndex === 0,
        errorText: input.phraseJumpError || "",
        errorHidden: !input.phraseJumpError,
      },
      mode: {
        hidden: true,
        guided: Boolean(input.guidedMode),
        shadowActive: input.practiceMode !== "recall",
        recallActive: input.practiceMode === "recall",
        recallDisabled: false,
        recallTitle: "Recall mode (2)",
      },
      menus: {
        settings: {
          open: Boolean(input.settingsMenuOpen),
          expanded: Boolean(input.settingsMenuOpen),
          active: Boolean(input.settingsMenuOpen),
        },
        help: {
          open: Boolean(input.shortcutHelpOpen),
          expanded: Boolean(input.shortcutHelpOpen),
          active: Boolean(input.shortcutHelpOpen),
          hidden: !input.shortcutHelpOpen,
        },
        utility: {
          open: Boolean(input.utilityMenuOpen),
          expanded: Boolean(input.utilityMenuOpen),
          active: Boolean(input.utilityMenuOpen),
        },
      },
      utility: {
        debugToggleText: input.debugVisible ? "Hide Debug" : "Debug",
        debugCopyText: input.debugCopied ? "Copied" : "Copy Debug",
        diagnosticsClearText: input.diagnosticsClearedAt ? "Diagnostics Cleared" : "Clear Diagnostics",
        refreshCacheText: input.cacheRefreshRequested ? "Refreshing" : "Refresh Cache",
        markIssueText: input.issueDialogOpen ? "Reporting..." : "Mark Issue",
        markIssueExpanded: Boolean(input.issueDialogOpen),
        refreshDisabled: loading || !input.hasSelectedSource,
        diagnosticsClearDisabled: loading,
        markIssueDisabled: loading,
      },
      buttons: {
        hidden: isEmpty,
        disabled: loading || !hasPhrases,
      },
    };
  }

  function displayToggleState(input = {}) {
    const textVisible = Boolean(input.textVisible);
    const phraseTranslationVisible = Boolean(input.phraseTranslationVisible);
    const practiceMode = input.practiceMode === "recall" ? "recall" : "shadow";
    return {
      original: {
        icon: textVisible ? "eye" : "eye-off",
        label: originalControlLabel({ textVisible }),
        title: originalControlTitle({
          practiceMode,
          textVisible,
          shadowTextVisible: input.shadowTextVisible,
        }),
        active: textVisible,
        sticky: practiceMode === "shadow" && Boolean(input.shadowTextVisible),
        pressed: textVisible,
      },
      translation: {
        icon: "translate",
        label: translationControlLabel({ phraseTranslationVisible }),
        title: phraseTranslationControlTitle({
          practiceMode,
          phraseTranslationStickyVisible: input.phraseTranslationStickyVisible,
          accountStatus: input.accountStatus,
          translation: input.translation,
        }),
        active: phraseTranslationVisible,
        sticky: practiceMode === "shadow" && Boolean(input.phraseTranslationStickyVisible),
        pressed: phraseTranslationVisible,
      },
    };
  }

  function shortcutItems() {
    return [
      ["Space", "YouTube play/pause"],
      ["Left / Right", "Previous / next phrase"],
      ["Down", "Repeat phrase"],
      ["Up or S", "Show original"],
      ["T or 0", "Show translation"],
      ["1 / 2", "Shadow / Recall mode"],
      ["?", "Open or close shortcuts"],
      ["Esc", "Close panels"],
    ].map(([key, label]) => ({ key, label }));
  }

  function settingsControlGroups() {
    return [
      {
        label: "Subtitle text",
        buttons: [
          ["A-", "afLearnerTextSmaller"],
          ["Reset", "afLearnerTextReset"],
          ["A+", "afLearnerTextLarger"],
        ],
      },
      {
        label: "Panel transparency",
        buttons: [
          ["-", "afTransparencyLower"],
          ["Reset", "afTransparencyReset"],
          ["+", "afTransparencyHigher"],
        ],
      },
      {
        label: "Playback",
        buttons: [["Auto-pause On", "afAutoPauseToggle"]],
      },
      {
        label: "Slow replay",
        buttons: [
          ["-", "afSlowReplaySlower"],
          ["0.75x", "afSlowReplaySpeed"],
          ["+", "afSlowReplayFaster"],
        ],
      },
      {
        label: "Panel layout",
        buttons: [
          ["Unlock", "afLayoutLockToggle"],
          ["Reset", "afLayoutReset"],
        ],
      },
    ].map((group) => ({
      label: group.label,
      buttons: group.buttons.map(([label, datasetKey]) => ({ label, datasetKey })),
    }));
  }

  function debugActionButtons() {
    return [
      ["Mark Issue", "afMarkIssue"],
      ["Bad Split", "afMarkPhraseBoundary"],
      ["Debug", "afDebugToggle"],
      ["Copy Debug", "afDebugCopy"],
      ["Clear Diagnostics", "afDiagnosticsClear"],
      ["Refresh Cache", "afRefreshCache"],
    ].map(([label, datasetKey]) => ({ label, datasetKey }));
  }

  function formatPlaybackRate(value, options = {}) {
    if (formatUtilsApi?.formatPlaybackRate) {
      return formatUtilsApi.formatPlaybackRate(value, {
        min: options.min,
        max: options.max,
        fallback: options.fallback,
      });
    }
    const min = Number.isFinite(options.min) ? options.min : 0.25;
    const max = Number.isFinite(options.max) ? options.max : 2;
    const fallback = Number.isFinite(options.fallback) ? options.fallback : 1;
    const clamped = Number.isFinite(Number(value))
      ? Math.min(max, Math.max(min, Number(value)))
      : fallback;
    return `${clamped.toFixed(2)}x`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.__afShadowingRibbonControls = {
    originalControlLabel,
    originalControlTitle,
    translationControlLabel,
    phraseTranslationControlTitle,
    displayToggleButtonHtml,
    playbackRateControlState,
    ribbonPanelState,
    displayToggleState,
    shortcutItems,
    settingsControlGroups,
    debugActionButtons,
    escapeHtml,
  };
})();
