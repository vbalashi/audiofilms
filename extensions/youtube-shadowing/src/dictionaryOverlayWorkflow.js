(function audioFilmsDictionaryOverlayWorkflow() {
  function renderOverlayCard(parent, card, {
    state = {},
    collapseAction = null,
    dictionaryPresentation,
    dictionaryDom,
    generatedEntries,
    iconSvg,
    performDisplayAction,
    toggleCardMenu,
    renderOverlayCardTitle,
    renderCardActionMenu,
    renderOverlaySections,
    renderReviewActions,
  } = {}) {
    const cardState = dictionaryPresentation.overlayCardRenderState({
      card,
      selectedWord: state.selectedWord,
      visibleTranslationsByCardId: state.visibleTranslationsByCardId,
      translationPendingByCardId: state.translationPendingByCardId,
      cardActionFeedbackByCardId: state.cardActionFeedbackByCardId,
      cardMenuOpenId: state.cardMenuOpenId,
      collapseAction,
      generatedDraftItem: generatedEntries.generatedDraftItemFromOverlayCard(card),
    });
    return dictionaryDom.renderOverlayCard(parent, {
      ...cardState,
      headerActionHandlers: {
        iconSvg,
        onTranslation: (displayAction) => performDisplayAction(card, displayAction),
        onMenu: toggleCardMenu,
        onCollapse: collapseAction?.onClick,
      },
      renderTitle: renderOverlayCardTitle,
      renderMenu: (entry) => {
        if (card?.id && state.cardMenuOpenId === card.id) {
          renderCardActionMenu(entry, card);
        }
      },
      renderSections: (entry) => renderOverlaySections(entry, card.sections || [], card, cardState.cardTranslation),
      renderReviewActions: (entry) => renderReviewActions(entry, card),
    });
  }

  function performDisplayAction(card, displayAction, options = {}) {
    const command = displayAction?.command;
    if (command?.kind === "card-translation") {
      options.toggleCardTranslation?.(card);
      return "card-translation";
    }
    if (command?.kind === "platform-action") {
      options.performDictionaryCardAction?.(card, displayAction, {
        action: command.action,
        ...(command.result ? { result: command.result } : {}),
      });
      return "platform-action";
    }
    if (command?.kind === "generated-save-and-start-learning") {
      options.saveGeneratedDictionaryDraft?.(options.getSelectedWord?.(), card);
      return "generated-save-and-start-learning";
    }
    return "";
  }

  function renderOverlayCardTitle(parent, card, options = {}) {
    const audioButtonState = options.dictionaryPresentation.headwordAudioButtonState({
      card,
      playable: options.cardAudioPlayable(card),
      pending: Boolean(options.state.audioPendingByCardId[card.id]),
      fallbackWord: options.state.selectedWord?.word,
    });
    options.dictionaryDom.renderOverlayCardTitle(parent, {
      card,
      title: options.dictionaryPresentation.overlayTitle(card, options.state.selectedWord?.word),
      audioButtonState,
      clearElement: options.clearElement,
      iconSvg: options.iconSvg,
      onAudio: () => options.playHeadwordAudio(card),
    });
  }

  function renderOverlaySections(parent, sections, card, translation = null, options = {}) {
    const cardId = card?.id || "";
    options.dictionaryDom.renderOverlaySections(parent, {
      sections,
      expanded: options.cardExpanded(cardId),
      iconSvg: options.iconSvg,
      translationForSection: (section, allSections) => options.dictionaryPresentation.overlaySectionTranslation({
        card,
        section,
        allSections,
        translation,
        visibleTranslationsByCardId: options.state.visibleTranslationsByCardId,
      }),
      onToggleExpanded: () => options.toggleCardExpanded(cardId),
    });
  }

  function renderCardActionMenu(parent, card, options = {}) {
    options.dictionaryDom.renderCardActionMenu(parent, {
      feedback: options.state.cardMenuFeedbackByCardId[card?.id],
      onWrongTranslation: () => reportCardTranslationIssue(card, options),
      onTranslationOk: () => markCardTranslationOk(card, options),
      onDictionaryIssue: () => reportCardDictionaryIssue(card, options),
    });
  }

  function reportCardTranslationIssue(card, options = {}) {
    options.state.cardMenuOpenId = "";
    const issue = options.issueReports.dictionaryCardTranslationIssueSnapshot({
      card,
      selectedWord: options.state.selectedWord || {},
      currentPhrase: options.describePhraseAtIndex(options.state.currentIndex),
      currentIndex: options.state.currentIndex,
    });
    options.openIssueReportDialog({
      source: "dictionary-card-menu",
      category: "translation",
      description: options.issueReports.dictionaryCardIssueDescription(card, "translation"),
      expectedBehavior: "Translation should match the selected dictionary sense and examples.",
      reportOptions: {
        extraDiagnostics: {
          dictionaryCardTranslationIssue: issue,
        },
      },
    });
  }

  function reportCardDictionaryIssue(card, options = {}) {
    options.state.cardMenuOpenId = "";
    options.openIssueReportDialog({
      source: "dictionary-card-menu",
      category: "dictionary",
      description: options.issueReports.dictionaryCardIssueDescription(card, "dictionary"),
      expectedBehavior: "Definition, context, examples, and idioms should match the intended dictionary sense.",
    });
  }

  function markCardTranslationOk(card, options = {}) {
    if (!card?.id) return false;
    options.state.cardMenuOpenId = card.id;
    options.state.cardMenuFeedbackByCardId = {
      ...options.state.cardMenuFeedbackByCardId,
      [card.id]: "Translation marked ok for this session.",
    };
    options.recordDebugEvent("dictionary-card-translation-ok", {
      cardId: card.id,
      entryId: card.entryId || null,
      headword: card.headword || "",
      clickedForm: card.clickedForm || "",
    });
    options.render();
    return true;
  }

  window.__afShadowingDictionaryOverlayWorkflow = {
    renderOverlayCard,
    performDisplayAction,
    renderOverlayCardTitle,
    renderOverlaySections,
    renderCardActionMenu,
    reportCardTranslationIssue,
    reportCardDictionaryIssue,
    markCardTranslationOk,
  };
})();
