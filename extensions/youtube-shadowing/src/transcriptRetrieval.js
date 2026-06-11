(function audioFilmsTranscriptRetrieval() {
  const youtubeAdapterApi = window.__afShadowingYouTubeAdapter;

  async function fetchBestAvailableCues(track, options = {}) {
    const attempts = [];
    const errors = [];

    try {
      options.updateRetrievalPath?.("timedtext-json3");
      const captionResult = await fetchCaptionCues(track);
      attempts.push(successfulAttempt(captionResult.retrievalPath, captionResult.cues));
      return buildTranscriptResult(captionResult.cues, {
        sourceKind: track?.kind === "asr" ? "auto" : "manual",
        retrievalPath: captionResult.retrievalPath,
        fetchOrigin: "youtube-page",
        provider: "youtube-timedtext",
        selectedTrackId: trackId(track),
        actualTrackId: trackId(track),
        languageCode: track?.languageCode || "",
        timingExactness: "exact",
        retrievalAttempts: attempts,
      });
    } catch (error) {
      const message = errorMessage(error);
      attempts.push(failedAttempt("timedtext", message));
      errors.push(message);
    }

    try {
      options.updateRetrievalPath?.("backend-provider");
      const backendResult = await fetchBackendProviderCues(track, options);
      attempts.push(successfulAttempt("backend-provider", backendResult.cues));
      return buildTranscriptResult(backendResult.cues, {
        sourceKind: backendResult.sourceKind || "provider",
        retrievalPath: "backend-provider",
        fetchOrigin: "backend",
        provider: backendResult.provider || "audiofilms-backend",
        selectedTrackId: trackId(track),
        actualTrackId: backendResult.provider || "",
        languageCode: backendResult.languageCode || track?.languageCode || "",
        timingExactness: "exact",
        qualityFlags: backendResult.qualityFlags,
        warnings: backendResult.warnings,
        retrievalAttempts: attempts,
      });
    } catch (error) {
      const message = errorMessage(error);
      attempts.push(failedAttempt("backend-provider", message));
      errors.push(message);
    }

    if (!diagnosticTranscriptFallbackEnabled()) {
      const message = "Diagnostic YouTube transcript fallback is disabled. Set localStorage.afShadowingTranscriptFallback = 'on' to probe it.";
      attempts.push(skippedAttempt("youtubei-transcript", message));
      attempts.push(skippedAttempt("transcript-dom", message));
      errors.push(message);
      options.updateLastError?.(errors.join(" | "));
      throw new Error(errors.join(" | "));
    }

    try {
      options.updateRetrievalPath?.("youtubei-transcript");
      const cues = await fetchTranscriptCues();
      attempts.push(successfulAttempt("youtubei-transcript", cues));
      return buildTranscriptResult(cues, {
        sourceKind: "transcript-panel",
        retrievalPath: "youtubei-transcript",
        fetchOrigin: "youtube-transcript-api",
        provider: "youtubei-transcript",
        selectedTrackId: trackId(track),
        actualTrackId: "",
        languageCode: track?.languageCode || "",
        timingExactness: "inferred-end",
        qualityFlags: ["source-unverified"],
        warnings: ["Diagnostic transcript API fallback is not track-aware; selected source may differ."],
        retrievalAttempts: attempts,
      });
    } catch (error) {
      const message = errorMessage(error);
      attempts.push(failedAttempt("youtubei-transcript", message));
      errors.push(message);
    }

    try {
      options.updateRetrievalPath?.("transcript-dom");
      const cues = await fetchTranscriptPanelCues(options);
      attempts.push(successfulAttempt("transcript-dom", cues));
      return buildTranscriptResult(cues, {
        sourceKind: "transcript-panel",
        retrievalPath: "transcript-dom",
        fetchOrigin: "youtube-transcript-dom",
        provider: "youtube-transcript-panel",
        selectedTrackId: trackId(track),
        actualTrackId: "",
        languageCode: track?.languageCode || "",
        timingExactness: "approximate",
        qualityFlags: ["source-unverified"],
        warnings: ["Diagnostic transcript panel fallback is not track-aware; selected source may differ."],
        retrievalAttempts: attempts,
      });
    } catch (error) {
      const message = errorMessage(error);
      attempts.push(failedAttempt("transcript-dom", message));
      errors.push(message);
    }

    const message = errors.join(" | ");
    options.updateLastError?.(message);
    const error = new Error(message);
    error.retrievalAttempts = attempts;
    throw error;
  }

  function diagnosticTranscriptFallbackEnabled() {
    return window.localStorage.getItem("afShadowingTranscriptFallback") === "on";
  }

  function successfulAttempt(path, cues) {
    return {
      path,
      status: "ok",
      cues: Array.isArray(cues) ? cues.length : 0,
    };
  }

  function failedAttempt(path, message) {
    return {
      path,
      status: "failed",
      error: String(message || "").slice(0, 240),
    };
  }

  function skippedAttempt(path, reason) {
    return {
      path,
      status: "skipped",
      reason,
    };
  }

  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  async function fetchCaptionCues(track) {
    const attempts = [
      { fmt: "json3", parser: parseJson3Cues, retrievalPath: "timedtext-json3" },
      { fmt: "vtt", parser: parseVttCues, retrievalPath: "timedtext-vtt" },
      { fmt: "srv3", parser: parseSrv3Cues, retrievalPath: "timedtext-srv3" },
    ];

    const errors = [];

    for (const attempt of attempts) {
      try {
        const url = new URL(track.baseUrl);
        url.searchParams.set("fmt", attempt.fmt);

        const response = await fetch(url.toString(), {
          credentials: "include",
        });

        const text = await response.text();
        if (!response.ok) {
          errors.push(`${attempt.fmt}: HTTP ${response.status}`);
          continue;
        }

        if (!text.trim()) {
          errors.push(`${attempt.fmt}: empty response`);
          continue;
        }

        const payload = attempt.fmt === "json3" ? JSON.parse(text) : text;
        const cues = attempt.parser(payload);
        if (cues.length) {
          return {
            cues,
            retrievalPath: attempt.retrievalPath,
          };
        }
        errors.push(`${attempt.fmt}: no cues`);
      } catch (error) {
        errors.push(`${attempt.fmt}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`Could not load caption data (${errors.join("; ")}).`);
  }

  async function fetchBackendProviderCues(track, options = {}) {
    const videoId = options.videoId || "";
    if (!videoId) {
      throw new Error("Backend provider fallback needs a video id.");
    }

    const endpoint = backendProviderEndpoint();
    if (!endpoint) {
      throw new Error("Backend provider fallback is disabled.");
    }

    const requestedLanguage = track?.languageCode || "auto";
    const requestedSourceKind = track?.kind === "asr" ? "auto" : "manual";
    const url = new URL(endpoint);
    url.searchParams.set("videoId", videoId);
    url.searchParams.set("lang", requestedLanguage || "auto");
    url.searchParams.set("sourceKind", requestedSourceKind);
    if (options.refreshCache) {
      url.searchParams.set("refresh", "1");
    }

    const response = await requestBackendSubtitles(url.toString());
    const text = response.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const message = response.error || payload?.error || text.slice(0, 180) || `HTTP ${response.status}`;
      throw new Error(`Backend provider request failed: HTTP ${response.status} ${message}`);
    }

    const phrases = Array.isArray(payload?.phrases) ? payload.phrases : [];
    const cues = phrases
      .map((phrase) => ({
        startMs: Number(phrase.startSec) * 1000,
        endMs: Number(phrase.endSec) * 1000,
        text: cleanCaptionText(phrase.text || ""),
      }))
      .filter((cue) => Number.isFinite(cue.startMs) && Number.isFinite(cue.endMs) && cue.endMs > cue.startMs && cue.text)
      .sort((a, b) => a.startMs - b.startMs);

    if (!cues.length) {
      throw new Error("Backend provider returned no timed phrases.");
    }

    const languageCode = payload?.language || "";
    const meta = payload?.meta || {};
    const provider = meta.provider || "audiofilms-backend";
    const returnedSourceKind = meta.sourceKind || payload?.sourceKind || "";
    const warnings = [];
    const qualityFlags = [];

    if (meta.warning) {
      warnings.push(meta.warning);
    }
    if (languageCode && requestedLanguage !== "auto" && languageCode !== requestedLanguage) {
      qualityFlags.push("language-mismatch");
      warnings.push(`Backend provider returned ${languageCode}, requested ${requestedLanguage}.`);
    }
    if (returnedSourceKind && returnedSourceKind !== requestedSourceKind) {
      qualityFlags.push("source-kind-mismatch");
      warnings.push(`Backend provider returned ${returnedSourceKind} captions, requested ${requestedSourceKind}.`);
    } else if (!returnedSourceKind) {
      qualityFlags.push("source-kind-unverified");
      warnings.push("Backend provider fallback does not prove whether captions are manual or auto-generated.");
    }

    return {
      cues,
      languageCode,
      provider,
      sourceKind: returnedSourceKind,
      cacheStatus: meta.cacheStatus || "",
      fallbackUsed: Boolean(meta.fallbackUsed),
      primaryProvider: meta.primaryProvider || "",
      failedProvider: meta.failedProvider || "",
      fallbackReason: meta.fallbackReason || "",
      qualityFlags,
      warnings,
    };
  }

  function backendProviderEndpoint() {
    const configured = window.localStorage.getItem("afShadowingBackendSubtitlesUrl") || "";
    if (configured === "off") return "";
    if (configured) return configured;
    return "http://localhost:3000/api/get-subs";
  }

  function requestBackendSubtitles(url) {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      return fetchBackendSubtitlesDirect(url);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Backend provider request timed out."));
      }, 15000);

      chrome.runtime.sendMessage(
        {
          type: "af-fetch-backend-subtitles",
          url,
        },
        (response) => {
          window.clearTimeout(timeoutId);
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(new Error(runtimeError.message));
            return;
          }
          if (!response) {
            reject(new Error("Backend provider returned no response."));
            return;
          }
          resolve(response);
        },
      );
    });
  }

  async function fetchBackendSubtitlesDirect(url) {
    const response = await fetch(url, {
      credentials: "omit",
      headers: {
        accept: "application/json",
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  }

  function buildTranscriptResult(cues, metadata) {
    const quality = analyzeCueQuality(cues, metadata);
    return {
      cues,
      sourceKind: metadata.sourceKind || "unknown",
      retrievalPath: metadata.retrievalPath || "backend-provider",
      fetchOrigin: metadata.fetchOrigin || "",
      provider: metadata.provider || "",
      selectedTrackId: metadata.selectedTrackId || "",
      actualTrackId: metadata.actualTrackId || "",
      languageCode: metadata.languageCode || "",
      timingExactness: metadata.timingExactness || "approximate",
      qualityFlags: uniqueStrings([...(metadata.qualityFlags || []), ...quality.qualityFlags]),
      warnings: uniqueStrings([...(metadata.warnings || []), ...quality.warnings]),
      retrievalAttempts: Array.isArray(metadata.retrievalAttempts) ? metadata.retrievalAttempts : [],
      cacheStatus: metadata.cacheStatus || "",
      fallbackUsed: Boolean(metadata.fallbackUsed),
      primaryProvider: metadata.primaryProvider || "",
      failedProvider: metadata.failedProvider || "",
      fallbackReason: metadata.fallbackReason || "",
    };
  }

  function analyzeCueQuality(cues, metadata = {}) {
    const qualityFlags = [];
    const warnings = [];
    let duplicateCount = 0;
    let overlapCount = 0;
    let inferredEndCount = 0;
    let longCueCount = 0;
    let rollingCaptionCount = 0;
    let previousCue = null;
    const seen = new Set();

    for (const cue of cues) {
      const text = normalizeCueText(cue.text);
      const key = `${Math.round(cue.startMs || 0)}:${text}`;
      if (seen.has(key)) duplicateCount += 1;
      seen.add(key);

      if (previousCue) {
        if (Number.isFinite(cue.startMs) && Number.isFinite(previousCue.endMs) && cue.startMs < previousCue.endMs - 50) {
          overlapCount += 1;
        }

        const previousText = normalizeCueText(previousCue.text);
        if (
          text &&
          previousText &&
          text !== previousText &&
          (text.startsWith(previousText) || previousText.startsWith(text))
        ) {
          rollingCaptionCount += 1;
        }
      }

      const durationMs = cue.endMs - cue.startMs;
      if (Number.isFinite(durationMs) && durationMs > 12000) longCueCount += 1;
      if (cue.endMsEstimated || cue.inferredEndMs || metadata.timingExactness === "inferred-end") inferredEndCount += 1;
      previousCue = cue;
    }

    if (duplicateCount > 0) qualityFlags.push("duplicate-cues");
    if (overlapCount > 0) qualityFlags.push("overlap-cues");
    if (inferredEndCount > 0) qualityFlags.push("inferred-end");
    if (longCueCount > 0) qualityFlags.push("long-cues");
    if (rollingCaptionCount >= Math.max(3, Math.floor(cues.length * 0.08))) qualityFlags.push("rolling-caption");

    if (qualityFlags.includes("duplicate-cues")) warnings.push(`${duplicateCount} duplicate cue candidates detected.`);
    if (qualityFlags.includes("overlap-cues")) warnings.push(`${overlapCount} overlapping cues detected.`);
    if (qualityFlags.includes("inferred-end")) warnings.push("Some cue end times are inferred.");
    if (qualityFlags.includes("long-cues")) warnings.push(`${longCueCount} unusually long cues detected.`);
    if (qualityFlags.includes("rolling-caption")) warnings.push("Caption stream looks like rolling captions; phrase boundaries may be rough.");

    return { qualityFlags, warnings };
  }

  function trackId(track) {
    return track?.vssId || track?.languageCode || track?.baseUrl || "";
  }

  function normalizeCueText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  async function fetchTranscriptCues() {
    const ytcfg = extractYtcfg();
    const initialData = extractInitialData();
    const endpoint = findDeep(initialData, (value) => value.getTranscriptEndpoint?.params)[0];
    const params = endpoint?.getTranscriptEndpoint?.params;

    if (!ytcfg?.INNERTUBE_API_KEY || !ytcfg?.INNERTUBE_CONTEXT || !params) {
      throw new Error("Transcript endpoint metadata was not found.");
    }

    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(ytcfg.INNERTUBE_API_KEY)}&prettyPrint=false`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-youtube-client-name": String(ytcfg.INNERTUBE_CONTEXT_CLIENT_NAME || ytcfg.INNERTUBE_CLIENT_NAME || "1"),
          "x-youtube-client-version": String(ytcfg.INNERTUBE_CLIENT_VERSION || ""),
        },
        body: JSON.stringify({
          context: ytcfg.INNERTUBE_CONTEXT,
          params,
        }),
      },
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Transcript request failed: HTTP ${response.status} ${text.slice(0, 160)}`);
    }

    if (!text.trim()) {
      throw new Error("Transcript request returned an empty response.");
    }

    const payload = JSON.parse(text);
    const cues = parseTranscriptCues(payload);
    if (!cues.length) {
      throw new Error("Transcript response did not contain timed segments.");
    }

    return cues;
  }

  async function fetchTranscriptPanelCues(options = {}) {
    const videoId = options.videoId || "";
    const recordDebugEvent = options.recordDebugEvent || (() => {});
    document.documentElement.classList.add("af-shadowing-loading-transcript");
    recordDebugEvent("transcript-panel-start", { videoId });

    try {
      let cues = parseTranscriptPanelCues(videoId);
      if (cues.length) {
        recordDebugEvent("transcript-panel-existing-cues", { cues: cues.length });
        return cues;
      }

      await openTranscriptPanel(videoId, recordDebugEvent);
      const startedAt = Date.now();
      let retryCount = 0;
      let closeThenOpen = false;
      let nextRetryAt = startedAt + 900;
      while (Date.now() - startedAt < 22000) {
        cues = parseTranscriptPanelCues(videoId);
        if (cues.length) {
          recordDebugEvent("transcript-panel-loaded", { cues: cues.length });
          return cues;
        }

        const panelState = getTranscriptPanelState();
        if (retryCount < 10 && Date.now() >= nextRetryAt) {
          retryCount += 1;
          const clicked = retryOpenTranscriptPanelBody(videoId, panelState, closeThenOpen, recordDebugEvent);
          recordDebugEvent("transcript-panel-retry-open", {
            attempt: retryCount,
            clicked,
            state: panelState,
          });
          closeThenOpen = panelState.emptySelectedTranscriptPanel && !closeThenOpen;
          nextRetryAt = Date.now() + (closeThenOpen ? 700 : 1600);
        }
        await delay(250);
      }

      const finalState = getTranscriptPanelState();
      recordDebugEvent("transcript-panel-empty", {
        state: finalState,
      });
      throw new Error(`Transcript panel did not expose timed segments (${summarizeTranscriptPanelState(finalState)}).`);
    } finally {
      document.documentElement.classList.remove("af-shadowing-loading-transcript");
    }
  }

  async function openTranscriptPanel(videoId, recordDebugEvent) {
    document.documentElement.dataset.afTranscriptVideoId = "";

    if (clickVisibleShowTranscriptButton(recordDebugEvent)) {
      document.documentElement.dataset.afTranscriptVideoId = videoId || "";
      return;
    }

    if (clickTranscriptSectionButton(recordDebugEvent)) {
      document.documentElement.dataset.afTranscriptVideoId = videoId || "";
      return;
    }

    clickDescriptionExpandButton(recordDebugEvent);
    await delay(300);

    if (clickTranscriptSectionButton(recordDebugEvent)) {
      document.documentElement.dataset.afTranscriptVideoId = videoId || "";
      return;
    }

    if (clickVisibleShowTranscriptButton(recordDebugEvent)) {
      document.documentElement.dataset.afTranscriptVideoId = videoId || "";
      return;
    }

    throw new Error("Could not find the YouTube transcript button.");
  }

  function clickDescriptionExpandButton(recordDebugEvent) {
    const expanders = Array.from(document.querySelectorAll(
      "#description-inline-expander #expand, #description-inline-expander #expand-sizer, ytd-text-inline-expander #expand, tp-yt-paper-button#expand",
    ));
    const expander = expanders.find((candidate) => isVisibleElement(candidate));
    if (expander instanceof HTMLElement) {
      activateElement(expander);
      return true;
    }

    return clickButtonByText(["...more", "show more", "meer weergeven", "meer"], { exact: true }, recordDebugEvent);
  }

  function clickTranscriptSectionButton(recordDebugEvent) {
    const buttons = Array.from(document.querySelectorAll("ytd-video-description-transcript-section-renderer button"));
    const button = buttons.find((candidate) => isVisibleElement(candidate));
    if (button instanceof HTMLElement) {
      recordDebugEvent?.("transcript-panel-click-section", {
        text: visibleText(button).slice(0, 80),
      });
      activateElement(button);
      return true;
    }
    return false;
  }

  function retryOpenTranscriptPanelBody(videoId, panelState, closeThenOpen, recordDebugEvent) {
    let clicked = false;
    if (closeThenOpen && panelState.emptySelectedTranscriptPanel) {
      clicked = clickVisibleCloseTranscriptButton(recordDebugEvent);
    }
    if (!clicked && panelState.visibleShowTranscriptButtons > 0) {
      clicked = clickVisibleShowTranscriptButton(recordDebugEvent);
    }
    if (!clicked && panelState.descriptionTranscriptSections > 0) {
      clicked = clickTranscriptSectionButton(recordDebugEvent);
    }
    if (clicked) {
      document.documentElement.dataset.afTranscriptVideoId = videoId || "";
    }
    return clicked;
  }

  function getTranscriptPanelState() {
    const panels = Array.from(document.querySelectorAll("ytd-engagement-panel-section-list-renderer"));
    const activePanels = panels
      .map((panel) => ({
        targetId: panel.getAttribute("target-id") || "",
        display: window.getComputedStyle(panel).display,
        text: cleanCaptionText(panel.textContent || "").slice(0, 240),
      }))
      .filter((panel) => panel.display !== "none");
    const activeTranscriptPanel = activePanels.find((panel) => panel.targetId === "engagement-panel-searchable-transcript");
    const oldSegments = document.querySelectorAll("ytd-transcript-segment-renderer").length;
    const modernSegments = document.querySelectorAll("transcript-segment-view-model").length;
    const visibleShowTranscriptButtons = visibleButtonCount(["show transcript", "transcript tonen"]);
    const visibleCloseTranscriptButtons = visibleButtonCount(["close transcript", "transcript sluiten"]);
    const selectedTranscriptTabs = Array.from(document.querySelectorAll("[role='tab'][aria-selected='true']"))
      .filter((tab) => visibleText(tab).toLowerCase().includes("transcript"))
      .length;
    const modernSpinnerPanels = panels.filter((panel) => (
      panel.getAttribute("target-id") === "PAmodern_transcript_view" &&
      panel.querySelector("tp-yt-paper-spinner[active], yt-content-loading-renderer")
    )).length;

    return {
      oldSegments,
      modernSegments,
      visibleShowTranscriptButtons,
      visibleCloseTranscriptButtons,
      selectedTranscriptTabs,
      descriptionTranscriptSections: document.querySelectorAll("ytd-video-description-transcript-section-renderer").length,
      activePanels,
      emptySelectedTranscriptPanel: Boolean(activeTranscriptPanel) &&
        selectedTranscriptTabs > 0 &&
        oldSegments === 0 &&
        modernSegments === 0,
      modernSpinnerPanels,
      scrollY: Math.round(window.scrollY || 0),
    };
  }

  function visibleButtonCount(needles) {
    const normalizedNeedles = needles.map((needle) => String(needle || "").toLowerCase()).filter(Boolean);
    return Array.from(document.querySelectorAll("button, yt-button-shape button, tp-yt-paper-button"))
      .filter((button) => (
        isVisibleElement(button) &&
        normalizedNeedles.some((needle) => visibleText(button).toLowerCase().includes(needle))
      ))
      .length;
  }

  function summarizeTranscriptPanelState(state) {
    return [
      `old=${state.oldSegments}`,
      `modern=${state.modernSegments}`,
      `showButtons=${state.visibleShowTranscriptButtons}`,
      `closeButtons=${state.visibleCloseTranscriptButtons}`,
      `selectedTabs=${state.selectedTranscriptTabs}`,
      `modernSpinners=${state.modernSpinnerPanels}`,
    ].join(", ");
  }

  function clickVisibleShowTranscriptButton(recordDebugEvent) {
    const bridgeResult = requestPageBridgeTextClick(["show transcript", "transcript tonen"]);
    if (bridgeResult?.ok) {
      recordDebugEvent?.("transcript-panel-page-bridge-click", {
        text: bridgeResult.text || "",
      });
      return true;
    }

    if (bridgeResult) {
      recordDebugEvent?.("transcript-panel-page-bridge-miss", {
        error: bridgeResult.error || "",
      });
    }

    return clickButtonByText(["show transcript", "transcript tonen"], {}, recordDebugEvent);
  }

  function clickVisibleCloseTranscriptButton(recordDebugEvent) {
    const bridgeResult = requestPageBridgeTextClick(["close transcript", "transcript sluiten"]);
    if (bridgeResult?.ok) {
      recordDebugEvent?.("transcript-panel-page-bridge-close", {
        text: bridgeResult.text || "",
      });
      return true;
    }

    if (bridgeResult) {
      recordDebugEvent?.("transcript-panel-page-bridge-close-miss", {
        error: bridgeResult.error || "",
      });
    }

    return clickButtonByText(["close transcript", "transcript sluiten"], {}, recordDebugEvent);
  }

  function requestPageBridgeTextClick(needles) {
    try {
      document.documentElement.dataset.afShadowingPageBridgeCommand = JSON.stringify({
        type: "click-text",
        needles,
        at: new Date().toISOString(),
      });
      document.documentElement.dataset.afShadowingPageBridgeResult = "";
      document.dispatchEvent(new Event("af-shadowing-page-click"));
      const rawResult = document.documentElement.dataset.afShadowingPageBridgeResult || "";
      return rawResult ? JSON.parse(rawResult) : null;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function clickButtonByText(needles, options = {}, recordDebugEvent) {
    const buttons = Array.from(document.querySelectorAll("button, yt-button-shape button, tp-yt-paper-button"));
    for (const button of buttons) {
      if (!isVisibleElement(button)) continue;
      const label = `${button.textContent || ""} ${button.getAttribute("aria-label") || ""}`.toLowerCase();
      const normalizedLabel = label.replace(/\s+/g, " ").trim();
      const matches = options.exact
        ? needles.some((needle) => normalizedLabel === needle)
        : needles.some((needle) => normalizedLabel.includes(needle));
      if (matches) {
        recordDebugEvent?.("transcript-panel-click-text", {
          text: normalizedLabel.slice(0, 80),
        });
        activateElement(button);
        return true;
      }
    }
    return false;
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.isConnected) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
  }

  function visibleText(element) {
    return `${element?.textContent || ""} ${element?.getAttribute?.("aria-label") || ""}`
      .replace(/\s+/g, " ")
      .trim();
  }

  function activateElement(element) {
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    }
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      element.dispatchEvent(new MouseEvent(type, eventOptions));
    }

    if (typeof element.click === "function") {
      element.click();
    }
  }

  function extractYtcfg() {
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const text = script.textContent || "";
      const markerIndex = text.indexOf("ytcfg.set({");
      if (markerIndex === -1) continue;

      const jsonStart = text.indexOf("{", markerIndex);
      const jsonText = youtubeAdapterApi.extractBalancedJson(text, jsonStart);
      if (!jsonText) continue;

      try {
        return JSON.parse(jsonText);
      } catch (_error) {
        continue;
      }
    }

    return null;
  }

  function extractInitialData() {
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const text = script.textContent || "";
      const markerIndex = text.indexOf("ytInitialData");
      if (markerIndex === -1) continue;

      const assignmentIndex = text.indexOf("=", markerIndex);
      if (assignmentIndex === -1) continue;

      const jsonStart = text.indexOf("{", assignmentIndex);
      const jsonText = youtubeAdapterApi.extractBalancedJson(text, jsonStart);
      if (!jsonText) continue;

      try {
        return JSON.parse(jsonText);
      } catch (_error) {
        continue;
      }
    }

    return null;
  }

  function findDeep(value, predicate, results = []) {
    if (!value || typeof value !== "object") return results;
    if (predicate(value)) results.push(value);

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        findDeep(child, predicate, results);
      }
    }

    return results;
  }

  function parseJson3Cues(json3) {
    const cues = [];
    for (const event of json3.events || []) {
      if (!event.segs || typeof event.tStartMs !== "number") continue;

      const text = event.segs
        .map((segment) => segment.utf8 || "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) continue;

      const duration = typeof event.dDurationMs === "number" ? event.dDurationMs : 0;
      cues.push({
        startMs: event.tStartMs,
        endMs: event.tStartMs + duration,
        text,
        rawSegments: event.segs
          .map((segment) => ({
            text: segment.utf8 || "",
            offsetMs: typeof segment.tOffsetMs === "number" ? segment.tOffsetMs : null,
          }))
          .filter((segment) => segment.text),
      });
    }

    return cues
      .filter((cue) => cue.endMs > cue.startMs)
      .sort((a, b) => a.startMs - b.startMs);
  }

  function parseVttCues(vttText) {
    const cues = [];
    const blocks = vttText.split(/\n{2,}/);

    for (const block of blocks) {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex === -1) continue;

      const [startRaw, endRaw] = lines[timingIndex].split("-->").map((value) => value.trim().split(/\s+/)[0]);
      const startMs = parseVttTime(startRaw);
      const endMs = parseVttTime(endRaw);
      const text = cleanCaptionText(lines.slice(timingIndex + 1).join(" "));

      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs && text) {
        cues.push({ startMs, endMs, text });
      }
    }

    return cues.sort((a, b) => a.startMs - b.startMs);
  }

  function parseVttTime(value) {
    const parts = value.split(":");
    const secondsPart = parts.pop();
    if (!secondsPart) return Number.NaN;

    const [secondsRaw, millisRaw = "0"] = secondsPart.split(".");
    const seconds = Number(secondsRaw);
    const minutes = Number(parts.pop() || "0");
    const hours = Number(parts.pop() || "0");
    const millis = Number(millisRaw.padEnd(3, "0").slice(0, 3));

    if ([hours, minutes, seconds, millis].some((part) => Number.isNaN(part))) {
      return Number.NaN;
    }

    return ((hours * 60 * 60 + minutes * 60 + seconds) * 1000) + millis;
  }

  function parseSrv3Cues(xmlText) {
    const documentXml = new DOMParser().parseFromString(xmlText, "text/xml");
    const textNodes = Array.from(documentXml.querySelectorAll("text"));

    return textNodes
      .map((node) => {
        const startMs = Number(node.getAttribute("t"));
        const durationMs = Number(node.getAttribute("d"));
        const text = cleanCaptionText(node.textContent || "");
        return {
          startMs,
          endMs: startMs + durationMs,
          text,
        };
      })
      .filter((cue) => Number.isFinite(cue.startMs) && Number.isFinite(cue.endMs) && cue.endMs > cue.startMs && cue.text)
      .sort((a, b) => a.startMs - b.startMs);
  }

  function parseTranscriptCues(payload) {
    const rawCues = findDeep(payload, (value) => value.transcriptSegmentRenderer)
      .map((wrapper) => wrapper.transcriptSegmentRenderer)
      .map((segment) => {
        const startMs = Number(segment.startMs ?? segment.start_ms);
        const endMs = Number(segment.endMs ?? segment.end_ms);
        const text = cleanCaptionText(textRunsToString(segment.snippet));

        return {
          startMs,
          endMs,
          text,
        };
      })
      .filter((cue) => Number.isFinite(cue.startMs) && cue.text)
      .sort((a, b) => a.startMs - b.startMs);

    return rawCues
      .map((cue, index) => {
        const nextCue = rawCues[index + 1];
        const inferredEndMs = nextCue ? Math.max(cue.startMs + 500, nextCue.startMs) : cue.startMs + 4000;
        return {
          ...cue,
          endMs: Number.isFinite(cue.endMs) && cue.endMs > cue.startMs ? cue.endMs : inferredEndMs,
        };
      })
      .filter((cue) => cue.endMs > cue.startMs);
  }

  function parseTranscriptPanelCues(videoId) {
    const transcriptVideoId = document.documentElement.dataset.afTranscriptVideoId || "";
    if (!videoId || transcriptVideoId !== videoId) return [];

    const segments = Array.from(document.querySelectorAll("ytd-transcript-segment-renderer"));
    if (!segments.length) {
      return parseModernTranscriptPanelCues();
    }

    const rawCues = segments
      .map((segment, segmentIndex) => {
        const timestampEl = segment.querySelector(".segment-timestamp, .segment-start-offset, [class*='timestamp']");
        const textEls = Array.from(segment.querySelectorAll(".segment-text, [class*='segment-text']"));
        const timestampText = timestampEl?.textContent?.trim() || "";
        const startMs = parseTimestampText(timestampText);
        const text = cleanCaptionText(
          textEls
            .map((textEl) => textEl.textContent || "")
            .join(" "),
        );

        return {
          startMs,
          endMs: startMs,
          text,
          segmentIndex,
        };
      })
      .filter((cue) => Number.isFinite(cue.startMs) && cue.text)
      .sort((a, b) => a.startMs - b.startMs);

    const dedupedCues = dedupeCues(rawCues);

    return dedupedCues
      .map((cue, index) => {
        const nextCue = dedupedCues[index + 1];
        const estimatedEndMs = nextCue ? Math.max(cue.startMs + 500, nextCue.startMs) : cue.startMs + 4000;
        return {
          ...cue,
          endMs: estimatedEndMs,
        };
      })
      .filter((cue) => cue.endMs > cue.startMs);
  }

  function parseModernTranscriptPanelCues() {
    const segments = Array.from(document.querySelectorAll("transcript-segment-view-model"));
    const rawCues = segments
      .map((segment, segmentIndex) => {
        const timestampText = segment.querySelector(".ytwTranscriptSegmentViewModelTimestamp")?.textContent?.trim() || "";
        const textEl = segment.querySelector("[role='text'], .ytAttributedStringHost");
        const startMs = parseTimestampText(timestampText);
        const text = cleanCaptionText(textEl?.textContent || "");

        return {
          startMs,
          endMs: startMs,
          text,
          segmentIndex,
          segmentSelector: "modern",
        };
      })
      .filter((cue) => Number.isFinite(cue.startMs) && cue.text)
      .sort((a, b) => a.startMs - b.startMs);

    const dedupedCues = dedupeCues(rawCues);

    return dedupedCues
      .map((cue, index) => {
        const nextCue = dedupedCues[index + 1];
        const estimatedEndMs = nextCue ? Math.max(cue.startMs + 500, nextCue.startMs) : cue.startMs + 4000;
        return {
          ...cue,
          endMs: estimatedEndMs,
        };
      })
      .filter((cue) => cue.endMs > cue.startMs);
  }

  function dedupeCues(cues) {
    const seen = new Set();
    const deduped = [];

    for (const cue of cues) {
      const key = `${cue.startMs}:${cue.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(cue);
    }

    return deduped;
  }

  function parseTimestampText(text) {
    const normalized = text.trim();
    if (!normalized) return Number.NaN;

    const parts = normalized.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) {
      return Number.NaN;
    }

    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return (minutes * 60 + seconds) * 1000;
    }

    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return ((hours * 60 * 60) + (minutes * 60) + seconds) * 1000;
    }

    return Number.NaN;
  }

  function textRunsToString(value) {
    if (!value) return "";
    if (typeof value.simpleText === "string") return value.simpleText;
    if (Array.isArray(value.runs)) {
      return value.runs.map((run) => run.text || "").join("");
    }
    return "";
  }

  function cleanCaptionText(text) {
    return decodeCommonHtmlEntities(text)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function decodeCommonHtmlEntities(text) {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  window.__afShadowingTranscriptRetrieval = {
    fetchBestAvailableCues,
    fetchCaptionCues,
    fetchTranscriptCues,
    fetchTranscriptPanelCues,
    parseJson3Cues,
    parseVttCues,
    parseSrv3Cues,
    parseTranscriptCues,
    parseTranscriptPanelCues,
    cleanCaptionText,
  };
})();
