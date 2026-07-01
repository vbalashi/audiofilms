(function audioFilmsPhraseRowsDomModule() {
  const phraseRowsApi = window.__afShadowingPhraseRows;

  function appendPhraseRow(parent, rowState = {}, options = {}) {
    const row = appendElement(parent, "div", "af-ribbon-row");
    row.dataset.afPhraseStartMs = rowState.dataset?.startMs || "0";
    row.dataset.afPhraseEndMs = rowState.dataset?.endMs || "0";
    row.dataset.afPhrasePlaybackEndMs = rowState.dataset?.playbackEndMs || "0";
    row.style.setProperty("--af-segment-count", String(rowState.segmentIndicator?.count || 0));
    row.style.setProperty("--af-segment-index", String(rowState.segmentIndicator?.index || 0));
    row.classList.toggle("has-segmented-rail", Boolean(rowState.classes?.segmentedRail));
    row.classList.toggle("is-current", Boolean(rowState.classes?.current));
    row.classList.toggle("is-past", Boolean(rowState.classes?.past));
    row.classList.toggle("is-future", Boolean(rowState.classes?.future));
    row.classList.toggle("is-recall-mode", Boolean(rowState.classes?.recallMode));
    row.classList.toggle("is-shadow-mode", Boolean(rowState.classes?.shadowMode));

    appendElement(row, "div", "af-ribbon-time").textContent = rowState.timeText || "";

    const prompt = appendElement(row, "div", "af-recall-prompt");
    prompt.textContent = rowState.prompt?.text || "";
    if (rowState.prompt?.hidden) {
      prompt.setAttribute("aria-hidden", "true");
    }

    const text = appendElement(row, "div", "af-ribbon-text");
    text.classList.toggle("has-replay-segment", Boolean(rowState.text?.hasReplaySegment));
    if (!rowState.text?.showOriginal) {
      appendElement(text, "span", "af-ribbon-mask");
    } else {
      renderClickablePhraseText(text, rowState.text.displayText, options.phraseIndex, rowState.text.replayRange, options);
    }

    const translation = appendElement(row, "div", "af-phrase-translation");
    translation.classList.toggle("is-unavailable", Boolean(rowState.translation?.unavailable));
    translation.textContent = rowState.translation?.visibleText || "";
    if (rowState.translation?.hidden) {
      translation.setAttribute("aria-hidden", "true");
    }
    return row;
  }

  function renderClickablePhraseText(parent, text, phraseIndex, replayRange = null, options = {}) {
    const segments = phraseRowsApi.clickablePhraseSegmentsState({
      text,
      phraseIndex,
      replayRange,
      selectedWord: options.selectedWord,
      selectedSpan: options.selectedSpan,
      spanDraft: options.spanDraft,
      lastWordReplay: options.lastWordReplay,
    });
    for (const segmentModel of segments) {
      if (segmentModel.kind !== "word") {
        parent.appendChild(document.createTextNode(segmentModel.text));
        continue;
      }

      appendClickableWord(parent, segmentModel, phraseIndex, options);
    }
  }

  function appendClickableWord(parent, segmentModel, phraseIndex, options = {}) {
    const segment = segmentModel.segment;
    const wordState = segmentModel.state;
    const word = appendElement(parent, "button", "af-ribbon-word");
    word.type = "button";
    word.textContent = segmentModel.text;
    word.dataset.afLookupWord = wordState.dataset.lookupWord;
    word.dataset.afPhraseIndex = wordState.dataset.phraseIndex;
    word.dataset.afTokenIndex = wordState.dataset.tokenIndex;
    word.dataset.afCharStart = wordState.dataset.charStart;
    word.dataset.afCharEnd = wordState.dataset.charEnd;
    word.classList.toggle("is-replay-segment", wordState.classes.replaySegment);
    word.classList.toggle("is-selected", wordState.classes.selected);
    word.classList.toggle("is-span-selected", wordState.classes.spanSelected);
    word.classList.toggle("is-span-draft", wordState.classes.spanDraft);
    word.classList.toggle("is-word-replay", wordState.classes.wordReplay);
    word.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (options.shouldSuppressWordClick?.()) {
        return;
      }
      const selection = wordSelection(segment);
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        options.onWordReplay?.(event, segment.lookupWord, phraseIndex, selection);
        return;
      }
      options.onLookupWord?.(segment.lookupWord, phraseIndex, selection);
    });
    word.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;
      options.onSpanDraftStart?.(phraseIndex, segment.tokenIndex);
    });
    word.addEventListener("pointerenter", (event) => {
      options.onSpanDraftMove?.(event, phraseIndex, segment.tokenIndex);
    });
    word.addEventListener("pointerup", (event) => {
      if (options.onSpanDraftEnd?.(event, phraseIndex, segment.tokenIndex)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    word.addEventListener("pointercancel", () => options.onSpanDraftCancel?.());
    return word;
  }

  function wordSelection(segment) {
    return {
      tokenIndex: segment.tokenIndex,
      charStart: segment.charStart,
      charEnd: segment.charEnd,
      originalToken: segment.originalToken,
    };
  }

  function appendElement(parent, tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  window.__afShadowingPhraseRowsDom = {
    appendPhraseRow,
    renderClickablePhraseText,
  };
})();
