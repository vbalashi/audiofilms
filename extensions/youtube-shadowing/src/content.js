(function audioFilmsYouTubeShadowing() {
  const DICTIONARY_PANEL_ID = "af-shadowing-dictionary-panel";
  const RIBBON_PANEL_ID = "af-shadowing-ribbon-panel";
  const TARGET_LANGUAGE = "nl";
  const MAX_PHRASE_DURATION_MS = 12000;
  const LONG_PAUSE_MS = 1000;
  const PRE_ROLL_MS = 150;
  const POST_ROLL_MS = 250;

  const state = {
    videoId: null,
    tracks: [],
    selectedTrack: null,
    cueSource: "",
    cues: [],
    phrases: [],
    currentIndex: 0,
    textVisible: true,
    autoPause: true,
    selectedWord: null,
    accountStatus: "signed-out",
    playbackTimer: null,
    playbackFrame: null,
    activePlayback: null,
    loading: false,
    error: "",
  };
  window.__afShadowingDebug = state;

  function getVideoIdFromUrl() {
    const url = new URL(window.location.href);
    return url.searchParams.get("v");
  }

  function isWatchPage() {
    return Boolean(getVideoIdFromUrl());
  }

  function ensureWorkspace() {
    document.documentElement.classList.add("af-shadowing-workspace");

    let dictionaryPanel = document.getElementById(DICTIONARY_PANEL_ID);
    if (!dictionaryPanel) {
      dictionaryPanel = createDictionaryPanel();
    }

    let ribbonPanel = document.getElementById(RIBBON_PANEL_ID);
    if (!ribbonPanel) {
      ribbonPanel = createRibbonPanel();
    }

    mountWorkspace(dictionaryPanel, ribbonPanel);
    return { dictionaryPanel, ribbonPanel };
  }

  function createDictionaryPanel() {
    const panel = document.createElement("aside");
    panel.id = DICTIONARY_PANEL_ID;
    panel.setAttribute("aria-label", "AudioFilms dictionary lookup");

    const header = appendElement(panel, "div", "af-dictionary-header");
    const heading = appendElement(header, "div", "af-dictionary-heading");
    const title = appendElement(heading, "div", "af-dictionary-title");
    title.textContent = "Dictionary";
    const subtitle = appendElement(heading, "div", "af-dictionary-subtitle");
    subtitle.dataset.afDictionarySubtitle = "";
    subtitle.textContent = "Contextual Lookup";
    const account = appendElement(header, "div", "af-dictionary-account");
    account.dataset.afAccount = "";

    const body = appendElement(panel, "div", "af-dictionary-body");
    body.dataset.afDictionaryBody = "";

    const footer = appendElement(panel, "div", "af-dictionary-footer");
    const footerTitle = appendElement(footer, "div", "af-dictionary-footer-title");
    footerTitle.textContent = "Grade Your Memory";
    const review = appendElement(footer, "div", "af-review-actions");
    appendButton(review, "Again", "afAgain");
    appendButton(review, "Hard", "afHard");
    appendButton(review, "Good", "afGood");
    appendButton(review, "Easy", "afEasy");

    document.documentElement.appendChild(panel);
    return panel;
  }

  function createRibbonPanel() {
    const panel = document.createElement("section");
    panel.id = RIBBON_PANEL_ID;
    panel.setAttribute("aria-label", "AudioFilms phrase ribbon");

    const meta = appendElement(panel, "div", "af-ribbon-meta");
    const track = appendElement(meta, "span", "af-ribbon-track");
    track.dataset.afTrack = "";
    track.textContent = "Track: -";
    const count = appendElement(meta, "span", "af-ribbon-count");
    count.dataset.afCount = "";
    count.textContent = "0 / 0";

    const list = appendElement(panel, "div", "af-ribbon-list");
    list.dataset.afRibbonList = "";

    const error = appendElement(panel, "div", "af-ribbon-error");
    error.dataset.afError = "";

    const controls = appendElement(panel, "div", "af-ribbon-controls");
    appendButton(controls, "Prev Phrase", "afPrev");
    appendButton(controls, "Replay", "afReplay");
    appendButton(controls, "Hide Source", "afToggle");
    appendButton(controls, "Next Phrase", "afNext");
    appendButton(controls, "Auto-Pause On", "afAutoPause");

    document.documentElement.appendChild(panel);
    panel.querySelector("[data-af-prev]").addEventListener("click", previousPhrase);
    panel.querySelector("[data-af-replay]").addEventListener("click", replayCurrentPhrase);
    panel.querySelector("[data-af-toggle]").addEventListener("click", toggleText);
    panel.querySelector("[data-af-next]").addEventListener("click", nextPhrase);
    panel.querySelector("[data-af-auto-pause]").addEventListener("click", toggleAutoPause);
    return panel;
  }

  function mountWorkspace(dictionaryPanel, ribbonPanel) {
    // YouTube's DOM changes often. Keep selectors scoped and fall back to fixed panels.
    const rightColumn = findFirstElement([
      "ytd-watch-flexy #secondary",
      "#secondary",
    ]);
    if (rightColumn) {
      dictionaryPanel.classList.remove("af-is-fixed");
      if (dictionaryPanel.parentElement !== rightColumn) {
        rightColumn.prepend(dictionaryPanel);
      }
    } else {
      dictionaryPanel.classList.add("af-is-fixed");
      if (dictionaryPanel.parentElement !== document.documentElement) {
        document.documentElement.appendChild(dictionaryPanel);
      }
    }

    const playerAnchor = findFirstElement([
      "ytd-watch-flexy #primary-inner #player",
      "ytd-watch-flexy #player",
      "#player-container-outer",
      "#player",
    ]);
    if (playerAnchor?.parentElement) {
      ribbonPanel.classList.remove("af-is-fixed");
      if (ribbonPanel.previousElementSibling !== playerAnchor) {
        playerAnchor.insertAdjacentElement("afterend", ribbonPanel);
      }
    } else {
      ribbonPanel.classList.add("af-is-fixed");
      if (ribbonPanel.parentElement !== document.documentElement) {
        document.documentElement.appendChild(ribbonPanel);
      }
    }
  }

  function findFirstElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement) return element;
    }
    return null;
  }

  function removeWorkspace() {
    document.documentElement.classList.remove(
      "af-shadowing-workspace",
      "af-shadowing-cover-secondary",
      "af-shadowing-hide-transcript",
    );
    document.getElementById(DICTIONARY_PANEL_ID)?.remove();
    document.getElementById(RIBBON_PANEL_ID)?.remove();
  }

  function appendElement(parent, tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function appendButton(parent, text, datasetKey) {
    const button = appendElement(parent, "button");
    button.type = "button";
    button.textContent = text;
    button.dataset[datasetKey] = "";
    return button;
  }

  function render() {
    const { dictionaryPanel, ribbonPanel } = ensureWorkspace();
    renderRibbon(ribbonPanel);
    renderDictionary(dictionaryPanel);
    document.documentElement.classList.toggle("af-shadowing-cover-secondary", !state.loading);
    document.documentElement.classList.toggle("af-shadowing-hide-transcript", !state.textVisible);
  }

  function renderRibbon(panel) {
    const track = panel.querySelector("[data-af-track]");
    const count = panel.querySelector("[data-af-count]");
    const list = panel.querySelector("[data-af-ribbon-list]");
    const error = panel.querySelector("[data-af-error]");
    const toggle = panel.querySelector("[data-af-toggle]");
    const autoPause = panel.querySelector("[data-af-auto-pause]");
    const buttons = panel.querySelectorAll("button");

    track.textContent = state.selectedTrack
      ? `${describeTrack(state.selectedTrack)}${state.cueSource ? ` via ${state.cueSource}` : ""}`
      : "Track: -";
    count.textContent = state.phrases.length
      ? `${state.currentIndex + 1} / ${state.phrases.length}`
      : state.loading ? "Loading" : "0 / 0";
    toggle.textContent = state.textVisible ? "Hide Source" : "Show Source";
    autoPause.textContent = state.autoPause ? "Auto-Pause On" : "Auto-Pause Off";
    error.textContent = state.error;

    buttons.forEach((button) => {
      button.disabled = state.loading || !state.phrases.length;
    });
    autoPause.disabled = state.loading;

    clearElement(list);
    if (state.loading) {
      appendRibbonMessage(list, "Loading captions...");
      return;
    }
    if (!state.phrases.length) {
      appendRibbonMessage(list, "No timed phrases available.");
      return;
    }

    const start = Math.max(0, state.currentIndex - 2);
    const end = Math.min(state.phrases.length - 1, state.currentIndex + 3);
    for (let index = start; index <= end; index += 1) {
      appendPhraseRow(list, state.phrases[index], index);
    }
  }

  function appendRibbonMessage(parent, text) {
    const message = appendElement(parent, "div", "af-ribbon-message");
    message.textContent = text;
  }

  function appendPhraseRow(parent, phrase, index) {
    const row = appendElement(parent, "div", "af-ribbon-row");
    row.classList.toggle("is-current", index === state.currentIndex);
    row.classList.toggle("is-past", index < state.currentIndex);
    row.classList.toggle("is-future", index > state.currentIndex);

    const time = appendElement(row, "div", "af-ribbon-time");
    time.textContent = formatTimestamp(phrase.startMs);

    const text = appendElement(row, "div", "af-ribbon-text");
    if (!state.textVisible && index === state.currentIndex) {
      appendElement(text, "span", "af-ribbon-mask");
      return;
    }
    renderClickablePhraseText(text, phrase.text, index);
  }

  function renderClickablePhraseText(parent, text, phraseIndex) {
    const tokens = text.split(/(\s+)/);
    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        parent.appendChild(document.createTextNode(token));
        continue;
      }

      const lookupWord = normalizeLookupWord(token);
      if (!lookupWord) {
        parent.appendChild(document.createTextNode(token));
        continue;
      }

      const word = appendElement(parent, "button", "af-ribbon-word");
      word.type = "button";
      word.textContent = token;
      word.dataset.afLookupWord = lookupWord;
      word.classList.toggle(
        "is-selected",
        state.selectedWord?.phraseIndex === phraseIndex && wordsEqual(state.selectedWord.word, lookupWord),
      );
      word.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectLookupWord(lookupWord, phraseIndex);
      });
    }
  }

  function renderDictionary(panel) {
    const subtitle = panel.querySelector("[data-af-dictionary-subtitle]");
    const account = panel.querySelector("[data-af-account]");
    const body = panel.querySelector("[data-af-dictionary-body]");
    const reviewButtons = panel.querySelectorAll(".af-review-actions button");

    subtitle.textContent = state.selectedTrack
      ? describeTrack(state.selectedTrack)
      : "Contextual Lookup";
    account.textContent = accountStatusLabel();

    reviewButtons.forEach((button) => {
      button.disabled = state.accountStatus !== "signed-in" || !state.selectedWord;
    });

    clearElement(body);
    if (state.selectedWord) {
      renderSelectedWordCard(body);
    } else {
      renderAccountCard(body);
    }
  }

  function renderAccountCard(parent) {
    const card = appendElement(parent, "div", "af-dictionary-card");
    const eyebrow = appendElement(card, "div", "af-dictionary-eyebrow");
    eyebrow.textContent = "2000NL account";
    const title = appendElement(card, "div", "af-dictionary-card-title");
    title.textContent = state.accountStatus === "signed-in" ? "Ready for lookup" : "Sign in to 2000NL";
    const copy = appendElement(card, "p", "af-dictionary-copy");
    copy.textContent = state.accountStatus === "signed-in"
      ? "Click a word in the transcript ribbon to inspect dictionary matches."
      : "Phrase navigation works locally. Dictionary lookup and review progress require your 2000NL account.";
    const action = appendButton(card, "Sign in to 2000NL", "afSignIn");
    action.className = "af-signin-button";
    action.disabled = true;
  }

  function renderSelectedWordCard(parent) {
    const phrase = state.phrases[state.selectedWord.phraseIndex] || state.phrases[state.currentIndex];
    const card = appendElement(parent, "div", "af-dictionary-card af-dictionary-card-selected");
    const header = appendElement(card, "div", "af-word-card-header");
    const title = appendElement(header, "div", "af-word-title");
    title.textContent = state.selectedWord.word;
    const menu = appendElement(header, "button", "af-word-menu");
    menu.type = "button";
    menu.textContent = "...";
    menu.setAttribute("aria-label", "More word actions");

    const status = appendElement(card, "div", "af-word-status");
    status.textContent = state.accountStatus === "signed-in"
      ? "Lookup ready"
      : "Sign in to 2000NL to lookup and review this word.";

    if (state.accountStatus !== "signed-in") {
      const action = appendButton(card, "Sign in to 2000NL", "afSignIn");
      action.className = "af-signin-button";
      action.disabled = true;
    }

    if (phrase) {
      const context = appendElement(card, "div", "af-context-block");
      const label = appendElement(context, "div", "af-context-label");
      label.textContent = "Current Context";
      const text = appendElement(context, "div", "af-context-text");
      renderClickablePhraseText(text, phrase.text, phrase.index);
    }

    const placeholder = appendElement(card, "div", "af-lookup-placeholder");
    placeholder.textContent = state.accountStatus === "signed-in"
      ? "Dictionary API wiring will load definitions here."
      : "No lookup request is sent until the 2000NL session is connected.";
  }

  function selectLookupWord(word, phraseIndex) {
    state.selectedWord = { word, phraseIndex };
    state.currentIndex = phraseIndex;
    render();
  }

  function accountStatusLabel() {
    if (state.accountStatus === "signed-in") return "2000NL connected";
    if (state.accountStatus === "expired") return "Reconnect 2000NL";
    return "Sign in required";
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function normalizeLookupWord(token) {
    return token
      .replace(/^[^\p{L}\p{N}]+/gu, "")
      .replace(/[^\p{L}\p{N}]+$/gu, "");
  }

  function wordsEqual(left, right) {
    return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
  }

  function formatTimestamp(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function describeTrack(track) {
    const name = track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || track.languageCode || "unknown";
    const source = track.kind === "asr" ? "auto" : "manual";
    return `${name} (${source})`;
  }

  async function initializeForCurrentVideo() {
    const videoId = getVideoIdFromUrl();
    if (!videoId || videoId === state.videoId || state.loading) return;

    state.videoId = videoId;
    state.tracks = [];
    state.selectedTrack = null;
    state.cueSource = "";
    state.cues = [];
    state.phrases = [];
    state.currentIndex = 0;
    state.textVisible = true;
    state.selectedWord = null;
    state.error = "";
    state.loading = true;
    stopPlaybackTimer();
    render();

    try {
      const playerResponse = await waitForPlayerResponse();
      state.tracks = getCaptionTracks(playerResponse);
      state.selectedTrack = chooseBestTrack(state.tracks);
      if (!state.selectedTrack) {
        throw new Error("No caption tracks found for this video.");
      }

      state.cues = await fetchBestAvailableCues(state.selectedTrack);
      state.phrases = buildPhrases(state.cues);
      if (!state.phrases.length) {
        throw new Error("Caption track loaded, but no timed phrases were parsed.");
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : String(error);
    } finally {
      state.loading = false;
      render();
    }
  }

  async function waitForPlayerResponse() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 10000) {
      const response = extractPlayerResponse();
      if (response) return response;
      await delay(250);
    }
    throw new Error("Could not read YouTube player metadata.");
  }

  function extractPlayerResponse() {
    const scripts = Array.from(document.scripts);
    for (const script of scripts) {
      const text = script.textContent || "";
      const markerIndex = text.indexOf("ytInitialPlayerResponse");
      if (markerIndex === -1) continue;

      const assignmentIndex = text.indexOf("=", markerIndex);
      if (assignmentIndex === -1) continue;

      const jsonStart = text.indexOf("{", assignmentIndex);
      if (jsonStart === -1) continue;

      const jsonText = extractBalancedJson(text, jsonStart);
      if (!jsonText) continue;

      try {
        return JSON.parse(jsonText);
      } catch (_error) {
        continue;
      }
    }

    const ytInitialData = document.documentElement.innerHTML.match(/"playerCaptionsTracklistRenderer":\{/);
    if (ytInitialData) {
      return null;
    }
    return null;
  }

  function extractBalancedJson(text, startIndex) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(startIndex, index + 1);
        }
      }
    }

    return "";
  }

  function getCaptionTracks(playerResponse) {
    return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  }

  function chooseBestTrack(tracks) {
    if (!tracks.length) return null;

    const manualTarget = tracks.find((track) => track.languageCode === TARGET_LANGUAGE && track.kind !== "asr");
    if (manualTarget) return manualTarget;

    const autoTarget = tracks.find((track) => track.languageCode === TARGET_LANGUAGE && track.kind === "asr");
    if (autoTarget) return autoTarget;

    const manualAny = tracks.find((track) => track.kind !== "asr");
    if (manualAny) return manualAny;

    return tracks[0];
  }

  async function fetchBestAvailableCues(track) {
    const errors = [];

    try {
      const cues = await fetchCaptionCues(track);
      state.cueSource = "timedtext";
      return cues;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      const cues = await fetchTranscriptCues();
      state.cueSource = "transcript-api";
      return cues;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      const cues = await fetchTranscriptPanelCues();
      state.cueSource = "transcript-panel";
      return cues;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    throw new Error(errors.join(" | "));
  }

  async function fetchTranscriptPanelCues() {
    let cues = parseTranscriptPanelCues();
    if (cues.length) return cues;

    await openTranscriptPanel();
    const startedAt = Date.now();
    while (Date.now() - startedAt < 8000) {
      cues = parseTranscriptPanelCues();
      if (cues.length) return cues;
      await delay(250);
    }

    throw new Error("Transcript panel did not expose timed segments.");
  }

  async function openTranscriptPanel() {
    clickButtonByText(["...more", "more", "meer", "show more"]);
    await delay(300);

    if (clickButtonByText(["transcript", "transcriptie", "transcript tonen", "show transcript"])) {
      return;
    }

    const transcriptSectionButton = document.querySelector("ytd-video-description-transcript-section-renderer button");
    if (transcriptSectionButton instanceof HTMLButtonElement) {
      transcriptSectionButton.click();
      return;
    }

    throw new Error("Could not find the YouTube transcript button.");
  }

  function clickButtonByText(needles) {
    const buttons = Array.from(document.querySelectorAll("button, yt-button-shape button"));
    for (const button of buttons) {
      const label = `${button.textContent || ""} ${button.getAttribute("aria-label") || ""}`.toLowerCase();
      if (needles.some((needle) => label.includes(needle))) {
        button.click();
        return true;
      }
    }
    return false;
  }

  async function fetchCaptionCues(track) {
    const attempts = [
      { fmt: "json3", parser: parseJson3Cues },
      { fmt: "vtt", parser: parseVttCues },
      { fmt: "srv3", parser: parseSrv3Cues },
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
        if (cues.length) return cues;
        errors.push(`${attempt.fmt}: no cues`);
      } catch (error) {
        errors.push(`${attempt.fmt}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`Could not load caption data (${errors.join("; ")}).`);
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

  function extractYtcfg() {
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const text = script.textContent || "";
      const markerIndex = text.indexOf("ytcfg.set({");
      if (markerIndex === -1) continue;

      const jsonStart = text.indexOf("{", markerIndex);
      const jsonText = extractBalancedJson(text, jsonStart);
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
      const jsonText = extractBalancedJson(text, jsonStart);
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
    return findDeep(payload, (value) => value.transcriptSegmentRenderer)
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
      .filter((cue) => Number.isFinite(cue.startMs) && Number.isFinite(cue.endMs) && cue.endMs > cue.startMs && cue.text)
      .sort((a, b) => a.startMs - b.startMs);
  }

  function parseTranscriptPanelCues() {
    const segments = Array.from(document.querySelectorAll("ytd-transcript-segment-renderer"));
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

  function buildPhrases(cues) {
    const phrases = [];
    let current = null;

    for (const cue of cues) {
      if (!current) {
        current = phraseFromCue(cue);
        continue;
      }

      const pause = cue.startMs - current.endMs;
      const nextDuration = cue.endMs - current.startMs;
      const shouldBreak =
        hasSentenceEnding(current.text) ||
        pause > LONG_PAUSE_MS ||
        nextDuration > MAX_PHRASE_DURATION_MS;

      if (shouldBreak) {
        phrases.push(current);
        current = phraseFromCue(cue);
      } else {
        current.endMs = Math.max(current.endMs, cue.endMs);
        current.text = cleanPhraseText(`${current.text} ${cue.text}`);
        current.cues.push(cue);
      }
    }

    if (current) phrases.push(current);

    return phrases.map((phrase, index) => ({
      ...phrase,
      index,
    }));
  }

  function phraseFromCue(cue) {
    return {
      startMs: cue.startMs,
      endMs: cue.endMs,
      text: cleanPhraseText(cue.text),
      cues: [cue],
    };
  }

  function cleanPhraseText(text) {
    return text
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasSentenceEnding(text) {
    return /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
  }

  function getVideoElement() {
    return document.querySelector("video");
  }

  function replayCurrentPhrase() {
    syncIndexToCurrentTime({ keepCurrentIfJustEnded: true });
    playPhrase(state.currentIndex);
  }

  function nextPhrase() {
    if (!state.phrases.length) return;
    syncIndexToCurrentTime();
    state.currentIndex = Math.min(state.currentIndex + 1, state.phrases.length - 1);
    state.selectedWord = null;
    render();
    playPhrase(state.currentIndex);
  }

  function previousPhrase() {
    if (!state.phrases.length) return;
    syncIndexToCurrentTime();
    state.currentIndex = Math.max(state.currentIndex - 1, 0);
    state.selectedWord = null;
    render();
    playPhrase(state.currentIndex);
  }

  function toggleText() {
    state.textVisible = !state.textVisible;
    render();
  }

  function toggleAutoPause() {
    state.autoPause = !state.autoPause;
    render();
  }

  function showText() {
    state.textVisible = true;
    render();
  }

  function hideText() {
    state.textVisible = false;
    render();
  }

  function syncIndexToCurrentTime(options = {}) {
    const video = getVideoElement();
    if (!video || !state.phrases.length) return;

    const currentMs = video.currentTime * 1000;
    if (options.keepCurrentIfJustEnded && isCurrentPhraseStillSelected(currentMs)) {
      return;
    }

    const activeIndex = state.phrases.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex >= 0) {
      state.currentIndex = activeIndex;
      render();
    }
  }

  function isCurrentPhraseStillSelected(currentMs) {
    const phrase = state.phrases[state.currentIndex];
    if (!phrase) return false;

    const replayGraceMs = POST_ROLL_MS + 900;
    return currentMs >= phrase.startMs && currentMs <= phrase.endMs + replayGraceMs;
  }

  function playPhrase(index) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) return;

    stopPlaybackTimer();
    const startSeconds = Math.max(0, phrase.startMs - PRE_ROLL_MS) / 1000;
    const endSeconds = (phrase.endMs + POST_ROLL_MS) / 1000;
    markCurrentTranscriptSegment(phrase);
    video.currentTime = startSeconds;
    video.play().catch(() => {});

    if (!state.autoPause) {
      render();
      return;
    }

    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: Math.max(0, phrase.startMs / 1000),
    };

    state.playbackTimer = window.setInterval(() => {
      enforcePhraseEnd(video);
    }, 25);
    video.addEventListener("timeupdate", onVideoTimeUpdate, true);
    state.playbackFrame = window.requestAnimationFrame(function frame() {
      enforcePhraseEnd(video);
      if (state.activePlayback) {
        state.playbackFrame = window.requestAnimationFrame(frame);
      }
    });
  }

  function stopPlaybackTimer() {
    if (state.playbackTimer) {
      window.clearInterval(state.playbackTimer);
      state.playbackTimer = null;
    }
    if (state.playbackFrame) {
      window.cancelAnimationFrame(state.playbackFrame);
      state.playbackFrame = null;
    }
    const video = getVideoElement();
    if (video) {
      video.removeEventListener("timeupdate", onVideoTimeUpdate, true);
    }
    state.activePlayback = null;
  }

  function onVideoTimeUpdate(event) {
    enforcePhraseEnd(event.currentTarget);
  }

  function enforcePhraseEnd(video) {
    if (!state.activePlayback || !video) return;

    if (video.currentTime >= state.activePlayback.endSeconds) {
      const phrase = state.phrases[state.activePlayback.index];
      video.pause();
      video.currentTime = state.activePlayback.holdSeconds;
      markCurrentTranscriptSegment(phrase);
      stopPlaybackTimer();
      render();
    }
  }

  function markCurrentTranscriptSegment(phrase) {
    const segmentIndex = phrase?.cues?.[0]?.segmentIndex;
    const segments = Array.from(document.querySelectorAll("ytd-transcript-segment-renderer"));

    segments.forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (typeof segmentIndex !== "number") return;

    const segment = segments[segmentIndex];
    if (!segment) return;

    segment.dataset.afCurrent = "true";
    segment.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKeyboardEvent(event) {
    if (!isWatchPage()) return;
    if (shouldIgnoreKeyEvent(event)) return;

    if (isSpaceKey(event)) {
      blockYouTubeShortcut(event);
      if (event.type === "keydown") {
        replayCurrentPhrase();
      }
      return;
    }

    if (event.type !== "keydown") return;

    if (event.code === "ArrowRight") {
      blockYouTubeShortcut(event);
      nextPhrase();
    } else if (event.code === "ArrowLeft") {
      blockYouTubeShortcut(event);
      previousPhrase();
    } else if (event.code === "ArrowDown") {
      blockYouTubeShortcut(event);
      showText();
    } else if (event.code === "ArrowUp") {
      blockYouTubeShortcut(event);
      hideText();
    }
  }

  function isSpaceKey(event) {
    return event.code === "Space" || event.key === " " || event.key === "Spacebar";
  }

  function blockYouTubeShortcut(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function shouldIgnoreKeyEvent(event) {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || target.isContentEditable;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function watchYouTubeNavigation() {
    let lastUrl = window.location.href;
    window.setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        state.videoId = null;
        handleCurrentLocation();
      }
    }, 500);
  }

  function watchWorkspaceMount() {
    window.setInterval(() => {
      if (isWatchPage()) {
        ensureWorkspace();
      }
    }, 2000);
  }

  function handleCurrentLocation() {
    if (!isWatchPage()) {
      stopPlaybackTimer();
      removeWorkspace();
      return;
    }
    ensureWorkspace();
    render();
    initializeForCurrentVideo();
  }

  document.addEventListener("keydown", onKeyboardEvent, true);
  document.addEventListener("keypress", onKeyboardEvent, true);
  document.addEventListener("keyup", onKeyboardEvent, true);
  window.addEventListener("keydown", onKeyboardEvent, true);
  window.addEventListener("keypress", onKeyboardEvent, true);
  window.addEventListener("keyup", onKeyboardEvent, true);
  watchYouTubeNavigation();
  watchWorkspaceMount();
  handleCurrentLocation();
})();
