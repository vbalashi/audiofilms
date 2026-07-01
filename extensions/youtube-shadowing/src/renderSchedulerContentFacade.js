(function audioFilmsRenderSchedulerContentFacade() {
  const ALL_BUCKETS = ["toggle", "layout", "ribbon", "dictionary", "debug", "transcript"];

  function createRenderScheduler({
    getState,
    renderers = {},
    environment = {},
  } = {}) {
    const pendingBuckets = new Set();
    let scheduledFrame = 0;

    function invalidate(buckets = ALL_BUCKETS) {
      for (const bucket of normalizeBuckets(buckets)) {
        pendingBuckets.add(bucket);
      }
      scheduleFlush();
    }

    function flushNow() {
      if (scheduledFrame && typeof environment.cancelAnimationFrame === "function") {
        environment.cancelAnimationFrame(scheduledFrame);
      }
      scheduledFrame = 0;
      flush();
    }

    function scheduleFlush() {
      if (scheduledFrame) return;
      const requestFrame = environment.requestAnimationFrame || ((callback) => environment.setTimeout?.(callback, 0));
      scheduledFrame = requestFrame(() => {
        scheduledFrame = 0;
        flush();
      });
    }

    function flush() {
      if (!pendingBuckets.size) return;
      const buckets = new Set(pendingBuckets);
      pendingBuckets.clear();
      const state = getState();

      if (buckets.has("toggle")) {
        renderers.renderToggle?.();
      }

      if (!state.learningEnabled) {
        renderers.clearTimingOperationPoll?.();
        renderers.removeWorkspace?.();
        return;
      }

      const needsWorkspace = buckets.has("layout") ||
        buckets.has("ribbon") ||
        buckets.has("dictionary") ||
        buckets.has("debug");
      const workspace = needsWorkspace ? renderers.ensureWorkspace?.() : null;
      const dictionaryPanel = workspace?.dictionaryPanel || null;
      const ribbonPanel = workspace?.ribbonPanel || null;
      const debugPanel = workspace?.debugPanel || null;

      if (buckets.has("layout")) {
        renderers.applyPanelLayout?.(ribbonPanel, dictionaryPanel);
      }
      if (buckets.has("ribbon") && ribbonPanel) {
        renderers.renderRibbon?.(ribbonPanel);
      }
      if (buckets.has("debug") && debugPanel) {
        renderers.renderDebugPanel?.(debugPanel);
      }
      if (buckets.has("dictionary") && dictionaryPanel) {
        renderers.renderDictionary?.(dictionaryPanel);
      }
      if (buckets.has("transcript")) {
        environment.document?.documentElement?.classList?.toggle(
          "af-shadowing-hide-transcript",
          !state.textVisible,
        );
      }
    }

    function normalizeBuckets(buckets) {
      if (buckets === "all") return ALL_BUCKETS;
      if (typeof buckets === "string") return [buckets];
      if (Array.isArray(buckets)) return buckets;
      return ALL_BUCKETS;
    }

    return {
      invalidate,
      flushNow,
    };
  }

  window.__afShadowingRenderSchedulerContentFacade = {
    createRenderScheduler,
  };
})();
