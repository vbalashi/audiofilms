(function audioFilmsSourceSelector() {
  function sourceToggleState(input = {}) {
    const selectedSource = input.selectedSource || null;
    const label = selectedSource
      ? input.sourceLabel || "Captions"
      : input.hasTracks ? "Captions: -" : "No captions";
    return {
      label,
      disabled: Boolean(input.loading),
      expanded: Boolean(input.sourceMenuOpen),
      readinessState: input.readiness?.state || "",
      open: Boolean(input.sourceMenuOpen),
    };
  }

  function readinessActionState(input = {}) {
    const timingState = input.timingState || {};
    const readiness = input.readiness || {};
    const timingAlreadyPrecise = readiness.state === "precise";
    const hasSelectedSource = Boolean(input.selectedSource);
    return {
      getCaptions: {
        text: input.cacheRefreshRequested ? "Getting Captions" : "Get Captions",
        disabled: Boolean(input.loading) || !hasSelectedSource,
      },
      improveTiming: {
        text: timingState.active ? "Improving Timing" : "Improve Timing",
        disabled: Boolean(input.loading) || !hasSelectedSource || Boolean(timingState.active) || timingAlreadyPrecise,
        title: timingState.active
          ? "Timing improvement is running."
          : timingAlreadyPrecise
          ? "This source already has the best available timing."
          : hasSelectedSource
          ? "Improve phrase timing with backend timing evidence."
          : "Load captions before improving timing.",
      },
    };
  }

  function shouldOpenReadinessDetails(input = {}) {
    if (!input.selectedSource) return input.readiness?.state === "no-captions";
    const result = input.result || null;
    return Boolean(
      input.timingState?.status ||
      result?.warnings?.length ||
      result?.retrievalPath ||
      result?.cacheStatus ||
      result?.fallbackUsed ||
      input.hasTimingEnrichment,
    );
  }

  function readinessDetails(input = {}) {
    const details = [
      ["Source", input.sourceLabel || "No captions"],
      ["Provider", input.provider || ""],
      ["Timing enrichment", input.enrichment || ""],
      ["Readiness", input.readiness?.label || ""],
      ["Phrases", input.phraseCount ? String(input.phraseCount) : "0"],
    ];
    if (input.result?.retrievalPath) details.push(["Retrieval", input.result.retrievalPath]);
    if (input.timingState?.status) details.push(["Timing", input.timingState.status]);
    if (input.staleReason && !input.timingApplied) details.push(["Timing apply", input.staleReason]);
    return details
      .filter(([, value]) => value !== "")
      .map(([label, value]) => ({ label, value }));
  }

  function readinessPopoverState(input = {}) {
    const timingState = input.timingState || {};
    const result = input.result || null;
    const enrichment = input.enrichment || "";
    return {
      actions: readinessActionState(input),
      actionHelp: "Get Captions retrieves subtitle text. Improve Timing starts ASR alignment for tighter phrase boundaries.",
      operation: {
        visible: Boolean(timingState.copy),
        status: timingState.status || "",
        copy: timingState.copy || "",
      },
      showSourceSelector: Number(input.practiceSourceCount || 0) > 1,
      details: {
        open: shouldOpenReadinessDetails({
          selectedSource: input.selectedSource,
          readiness: input.readiness,
          timingState,
          result,
          hasTimingEnrichment: Boolean(enrichment),
        }),
        summary: "Details",
        rows: readinessDetails({
          sourceLabel: input.sourceLabel,
          provider: input.provider,
          enrichment,
          readiness: input.readiness,
          phraseCount: input.phraseCount,
          result,
          timingState,
          staleReason: input.staleReason,
          timingApplied: input.timingApplied,
        }),
      },
    };
  }

  function sourceOptionState(input = {}) {
    const source = input.source || {};
    const warningText = source.error || source.loadedTranscriptResult?.warnings?.[0] || "";
    return {
      sourceId: source.id || "",
      selected: source.id === input.selectedSourceId,
      label: input.label || "Captions",
      warningText,
      warningClass: source.error
        ? "af-source-option-error"
        : warningText
        ? input.warningInformational ? "af-source-option-note" : "af-source-option-error"
        : "",
    };
  }

  function sourceOptionGroups(input = {}) {
    const labelForSource = typeof input.labelForSource === "function" ? input.labelForSource : () => "";
    const warningInformationalForSource = typeof input.warningInformationalForSource === "function"
      ? input.warningInformationalForSource
      : () => false;
    return (Array.isArray(input.groups) ? input.groups : []).map((group) => ({
      label: group?.label || "",
      options: (Array.isArray(group?.sources) ? group.sources : []).map((source) =>
        sourceOptionState({
          source,
          selectedSourceId: input.selectedSourceId,
          label: labelForSource(source),
          warningInformational: warningInformationalForSource(source),
        })
      ),
    }));
  }

  window.__afShadowingSourceSelector = {
    sourceToggleState,
    readinessActionState,
    shouldOpenReadinessDetails,
    readinessDetails,
    readinessPopoverState,
    sourceOptionState,
    sourceOptionGroups,
  };
})();
