(function audioFilmsYouTubeShadowing() {
  const bootDiagnosticsApi = window.__afShadowingBootDiagnostics || createBootDiagnosticsFallback();
  const phraseApi = window.__afShadowingPhrases || createPhraseFallback();
  const captionTrackApi = window.__afShadowingCaptionTracks || createCaptionTracksFallback();
  const youtubeAdapterApi = window.__afShadowingYouTubeAdapter || createYouTubeAdapterFallback();
  const transcriptRetrievalApi = window.__afShadowingTranscriptRetrieval;

  try {
    bootAudioFilmsYouTubeShadowing();
  } catch (error) {
    bootDiagnosticsApi.recordBootFailure(error);
    bootDiagnosticsApi.renderBootFailureBadge(error);
  }

  function bootAudioFilmsYouTubeShadowing() {
  const bootDiagnostics = bootDiagnosticsApi.markBootStarted();
  const DICTIONARY_PANEL_ID = "af-shadowing-dictionary-panel";
  const RIBBON_PANEL_ID = "af-shadowing-ribbon-panel";
  const ROOT_ID = "audiofilms-root";
  const SHADOW_CONTAINER_ID = "audiofilms-shadow-container";
  const TOGGLE_ID = "af-shadowing-toggle";
  const LEARNING_ENABLED_STORAGE_KEY = "afShadowingLearningEnabled";
  const MAX_PHRASE_DURATION_MS = 12000;
  const LONG_PAUSE_MS = 1000;
  const PRE_ROLL_MS = 150;
  const POST_ROLL_MS = 250;
  const CONTIGUOUS_BOUNDARY_GUARD_MS = 120;

  const state = {
    videoId: null,
    tracks: [],
    practiceSources: [],
    selectedSourceId: "",
    sourceMenuOpen: false,
    selectedTrack: null,
    cueSource: "",
    transcriptResult: null,
    debugVisible: false,
    debugCopied: false,
    cacheRefreshRequested: false,
    issueCopied: false,
    debugEvents: [],
    navigationEvents: [],
    lastIssueReport: null,
    navigationEventSeq: 0,
    cues: [],
    phrases: [],
    currentIndex: 0,
    learningEnabled: readLearningEnabled(),
    textVisible: true,
    autoPause: true,
    guidedMode: false,
    selectedWord: null,
    accountStatus: "guest",
    playbackFrame: null,
    activePlayback: null,
    guidedHold: null,
    passiveVideo: null,
    passiveFrame: null,
    passivePausedKey: "",
    loading: false,
    loadToken: 0,
    error: "",
    bootDiagnostics,
  };
  window.__afShadowingDebug = state;

  function updateBootDiagnostics(updates) {
    Object.assign(state.bootDiagnostics, updates, {
      updatedAt: new Date().toISOString(),
      url: window.location.href,
    });
    bootDiagnosticsApi.publish(state.bootDiagnostics);
    if (updates.lastError) {
      document.documentElement.dataset.afShadowingLastError = String(updates.lastError).slice(0, 180);
    }
  }

  function readLearningEnabled() {
    return window.localStorage.getItem(LEARNING_ENABLED_STORAGE_KEY) !== "false";
  }

  function writeLearningEnabled(value) {
    window.localStorage.setItem(LEARNING_ENABLED_STORAGE_KEY, value ? "true" : "false");
  }

  function ensureToggle() {
    let button = document.getElementById(TOGGLE_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = TOGGLE_ID;
    button.type = "button";
    button.addEventListener("click", toggleLearningMode);
    document.documentElement.appendChild(button);
    return button;
  }

  function renderToggle() {
    const button = ensureToggle();
    button.textContent = state.learningEnabled ? "AudioFilms On" : "AudioFilms Off";
    button.classList.toggle("is-enabled", state.learningEnabled);
    button.setAttribute(
      "aria-label",
      state.learningEnabled ? "Disable AudioFilms shadowing workspace" : "Enable AudioFilms shadowing workspace",
    );
  }

  function toggleLearningMode() {
    state.learningEnabled = !state.learningEnabled;
    writeLearningEnabled(state.learningEnabled);
    if (!state.learningEnabled) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      state.guidedMode = false;
      removeWorkspace();
      renderToggle();
      return;
    }
    handleCurrentLocation();
  }

  function ensureWorkspace() {
    document.documentElement.classList.add("af-shadowing-workspace", "af-shadowing-enabled");
    const root = ensureAudioFilmsRoot();
    const container = ensureShadowContainer(root);

    let ribbonPanel = root.querySelector(`#${RIBBON_PANEL_ID}`);
    if (!ribbonPanel) {
      ribbonPanel = createRibbonPanel();
    }

    let dictionaryPanel = root.querySelector(`#${DICTIONARY_PANEL_ID}`);
    if (state.selectedWord && !dictionaryPanel) {
      dictionaryPanel = createDictionaryPanel();
    }

    mountWorkspace(container, dictionaryPanel, ribbonPanel);
    return { dictionaryPanel, ribbonPanel };
  }

  function ensureAudioFilmsRoot() {
    let host = document.getElementById(ROOT_ID);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.id = ROOT_ID;
      host.setAttribute("aria-label", "AudioFilms YouTube learning layer");
      document.documentElement.appendChild(host);
    }

    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    ensureShadowStyles(root);
    return root;
  }

  function ensureShadowContainer(root) {
    let container = root.getElementById(SHADOW_CONTAINER_ID);
    if (container instanceof HTMLElement) return container;

    container = document.createElement("div");
    container.id = SHADOW_CONTAINER_ID;
    root.appendChild(container);
    return container;
  }

  function ensureShadowStyles(root) {
    if (root.querySelector("style[data-af-shadow-style]")) return;

    const style = document.createElement("style");
    style.dataset.afShadowStyle = "";
    style.textContent = ":host{all:initial;position:fixed;inset:auto 16px 16px 16px;z-index:2147483646;display:block;pointer-events:none}";
    root.prepend(style);

    loadShadowStyles(root, style);
  }

  async function loadShadowStyles(root, style) {
    if (style.dataset.afLoaded === "1") return;
    style.dataset.afLoaded = "1";

    try {
      const response = await fetch(chrome.runtime.getURL("src/shadow.css"));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const css = await response.text();
      style.textContent = css
        .replace(/html\.af-shadowing-workspace/g, ":host")
        .replace(/#audiofilms-root/g, ":host");
    } catch (error) {
      recordDebugEvent("shadow-style-load-failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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

    return panel;
  }

  function createRibbonPanel() {
    const panel = document.createElement("section");
    panel.id = RIBBON_PANEL_ID;
    panel.setAttribute("aria-label", "AudioFilms phrase ribbon");

    const meta = appendElement(panel, "div", "af-ribbon-meta");
    const track = appendElement(meta, "div", "af-source-selector");
    track.dataset.afTrack = "";
    const trackButton = appendButton(track, "Captions: -", "afSourceToggle");
    trackButton.className = "af-source-toggle";
    const sourceMenu = appendElement(track, "div", "af-source-menu");
    sourceMenu.dataset.afSourceMenu = "";
    const count = appendElement(meta, "span", "af-ribbon-count");
    count.dataset.afCount = "";
    count.textContent = "0 / 0";
    const mode = appendElement(meta, "span", "af-ribbon-mode");
    mode.dataset.afMode = "";
    mode.textContent = "Passive";

    const list = appendElement(panel, "div", "af-ribbon-list");
    list.dataset.afRibbonList = "";

    const error = appendElement(panel, "div", "af-ribbon-error");
    error.dataset.afError = "";
    const debug = appendElement(panel, "pre", "af-ribbon-debug");
    debug.dataset.afDebug = "";

    const controls = appendElement(panel, "div", "af-ribbon-controls");
    appendButton(controls, "Prev", "afPrev");
    appendButton(controls, "Replay", "afReplay");
    appendButton(controls, "Hide Text", "afToggle");
    appendButton(controls, "Next", "afNext");
    appendButton(controls, "Auto-Pause", "afAutoPause");
    appendButton(controls, "Debug", "afDebugToggle");
    appendButton(controls, "Copy", "afDebugCopy");
    appendButton(controls, "Refresh Cache", "afRefreshCache");
    appendButton(controls, "Mark Issue", "afMarkIssue");

    panel.querySelector("[data-af-prev]").addEventListener("click", previousPhrase);
    panel.querySelector("[data-af-replay]").addEventListener("click", replayCurrentPhrase);
    panel.querySelector("[data-af-toggle]").addEventListener("click", toggleText);
    panel.querySelector("[data-af-next]").addEventListener("click", nextPhrase);
    panel.querySelector("[data-af-auto-pause]").addEventListener("click", toggleAutoPause);
    panel.querySelector("[data-af-source-toggle]").addEventListener("click", toggleSourceMenu);
    panel.querySelector("[data-af-debug-toggle]").addEventListener("click", toggleDebug);
    panel.querySelector("[data-af-debug-copy]").addEventListener("click", copyDebug);
    panel.querySelector("[data-af-refresh-cache]").addEventListener("click", refreshSelectedSourceCache);
    panel.querySelector("[data-af-mark-issue]").addEventListener("click", markIssue);
    return panel;
  }

  function mountWorkspace(container, dictionaryPanel, ribbonPanel) {
    if (ribbonPanel.parentElement !== container) {
      container.appendChild(ribbonPanel);
    }

    if (!state.selectedWord) {
      dictionaryPanel?.remove();
      return;
    }

    if (dictionaryPanel && dictionaryPanel.parentElement !== container) {
      container.appendChild(dictionaryPanel);
    }
  }

  function removeWorkspace() {
    document.documentElement.classList.remove(
      "af-shadowing-workspace",
      "af-shadowing-enabled",
      "af-shadowing-hide-transcript",
    );
    document.getElementById(ROOT_ID)?.remove();
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
    renderToggle();
    if (!state.learningEnabled) {
      removeWorkspace();
      return;
    }

    const { dictionaryPanel, ribbonPanel } = ensureWorkspace();
    renderRibbon(ribbonPanel);
    if (dictionaryPanel) {
      renderDictionary(dictionaryPanel);
    }
    document.documentElement.classList.toggle("af-shadowing-hide-transcript", !state.textVisible);
  }

  function renderRibbon(panel) {
    const track = panel.querySelector("[data-af-track]");
    const sourceToggle = panel.querySelector("[data-af-source-toggle]");
    const sourceMenu = panel.querySelector("[data-af-source-menu]");
    const count = panel.querySelector("[data-af-count]");
    const mode = panel.querySelector("[data-af-mode]");
    const list = panel.querySelector("[data-af-ribbon-list]");
    const error = panel.querySelector("[data-af-error]");
    const debug = panel.querySelector("[data-af-debug]");
    const toggle = panel.querySelector("[data-af-toggle]");
    const autoPause = panel.querySelector("[data-af-auto-pause]");
    const debugToggle = panel.querySelector("[data-af-debug-toggle]");
    const debugCopy = panel.querySelector("[data-af-debug-copy]");
    const refreshCache = panel.querySelector("[data-af-refresh-cache]");
    const markIssue = panel.querySelector("[data-af-mark-issue]");
    const playbackButtons = [
      panel.querySelector("[data-af-prev]"),
      panel.querySelector("[data-af-replay]"),
      panel.querySelector("[data-af-toggle]"),
      panel.querySelector("[data-af-next]"),
    ].filter(Boolean);
    const hasPhrases = state.phrases.length > 0;
    const isEmpty = !state.loading && !hasPhrases;

    renderSourceSelector(track, sourceToggle, sourceMenu);
    panel.classList.toggle("is-empty", isEmpty);
    count.textContent = hasPhrases
      ? `${state.currentIndex + 1} / ${state.phrases.length}`
      : state.loading ? "Loading" : "0 / 0";
    mode.textContent = state.guidedMode ? "Shortcuts active" : "Passive sync";
    mode.classList.toggle("is-guided", state.guidedMode);
    toggle.textContent = state.textVisible ? "Hide Text" : "Show Text";
    autoPause.textContent = state.autoPause ? "Auto-Pause On" : "Auto-Pause Off";
    debugToggle.textContent = state.debugVisible ? "Hide Debug" : "Debug";
    debugCopy.textContent = state.debugCopied ? "Copied" : "Copy Debug";
    refreshCache.textContent = state.cacheRefreshRequested ? "Refreshing" : "Refresh Cache";
    markIssue.textContent = state.issueCopied ? "Issue Copied" : "Mark Issue";
    error.textContent = state.error;
    debug.textContent = state.debugVisible ? formatDebugState() : "";

    playbackButtons.forEach((button) => {
      button.hidden = isEmpty;
      button.disabled = state.loading || !hasPhrases;
    });
    autoPause.hidden = isEmpty;
    autoPause.disabled = state.loading || !hasPhrases;
    refreshCache.disabled = state.loading || !getSelectedPracticeSource();
    markIssue.disabled = state.loading;

    clearElement(list);
    if (state.loading) {
      appendRibbonMessage(list, "Loading captions...");
      return;
    }
    if (!hasPhrases) {
      appendRibbonMessage(
        list,
        state.tracks.length
          ? "No timed phrases available for this caption source."
          : "This video has no captions, so phrase practice cannot start.",
      );
      return;
    }

    list.classList.add("is-compact");
    appendPhraseRow(list, state.phrases[state.currentIndex], state.currentIndex);
  }

  function toggleDebug() {
    state.debugVisible = !state.debugVisible;
    render();
  }

  async function copyDebug() {
    const text = formatDebugState();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      copyTextWithFallback(text);
    }
    state.debugCopied = true;
    render();
    window.setTimeout(() => {
      state.debugCopied = false;
      render();
    }, 1200);
  }

  async function refreshSelectedSourceCache() {
    const source = getSelectedPracticeSource();
    if (!source || state.loading) return;
    state.cacheRefreshRequested = true;
    recordDebugEvent("cache-refresh-start", {
      source: captionTrackApi.sourceDisplayName(source),
      videoId: state.videoId,
    });
    render();
    try {
      await loadPracticeSource(source, {
        keepExistingOnError: true,
        preserveVideoTime: true,
        refreshCache: true,
      });
    } finally {
      state.cacheRefreshRequested = false;
      render();
    }
  }

  function markIssue() {
    const report = formatIssueReport();
    recordDebugEvent("issue-marked", {
      navigationEventId: state.navigationEvents.at(-1)?.id || null,
      currentIndex: state.currentIndex,
    });
    state.lastIssueReport = report;
    state.issueCopied = true;
    render();
    copyIssueReport(report);
    window.setTimeout(() => {
      state.issueCopied = false;
      render();
    }, 1500);
  }

  function copyIssueReport(report) {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(report))
      .catch(() => {
        copyTextWithFallback(report);
      });
  }

  function copyTextWithFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.documentElement.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function formatDebugState() {
    const selectedSource = getSelectedPracticeSource();
    return JSON.stringify({
      boot: state.bootDiagnostics,
      videoId: state.videoId,
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      cueSource: state.cueSource,
      transcriptResult: state.transcriptResult ? summarizeTranscriptResult(state.transcriptResult) : null,
      phrases: state.phrases.length,
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      error: state.error,
      sources: state.practiceSources.map(captionTrackApi.formatSourceDebug),
      navigationEvents: state.navigationEvents.slice(-12),
      lastIssueReport: state.lastIssueReport,
      events: state.debugEvents.slice(-8),
    }, null, 2);
  }

  function recordDebugEvent(type, detail) {
    state.debugEvents.push({
      at: new Date().toISOString(),
      type,
      ...detail,
    });
    if (state.debugEvents.length > 30) {
      state.debugEvents.splice(0, state.debugEvents.length - 30);
    }
  }

  function recordNavigationEvent(type, detail = {}) {
    const event = {
      id: `nav-${state.navigationEventSeq += 1}`,
      at: new Date().toISOString(),
      type,
      ...detail,
    };
    state.navigationEvents.push(event);
    if (state.navigationEvents.length > 40) {
      state.navigationEvents.splice(0, state.navigationEvents.length - 40);
    }
    return event;
  }

  function formatIssueReport() {
    const selectedSource = getSelectedPracticeSource();
    return JSON.stringify({
      kind: "audiofilms-youtube-navigation-issue",
      capturedAt: new Date().toISOString(),
      page: {
        url: window.location.href,
        videoId: state.videoId,
      },
      selectedSource: selectedSource ? captionTrackApi.formatSourceDebug(selectedSource) : null,
      mode: {
        guidedMode: state.guidedMode,
        autoPause: state.autoPause,
        textVisible: state.textVisible,
      },
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      visibleState: {
        count: state.phrases.length ? `${state.currentIndex + 1} / ${state.phrases.length}` : "0 / 0",
        error: state.error,
      },
      navigationEvents: state.navigationEvents.slice(-20),
      debugEvents: state.debugEvents.slice(-12),
    }, null, 2);
  }

  function getPlaybackSnapshot() {
    const video = getVideoElement();
    if (!video) {
      return { videoPresent: false };
    }

    return {
      videoPresent: true,
      currentTime: roundTime(video.currentTime),
      duration: roundTime(video.duration),
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      playbackRate: video.playbackRate,
    };
  }

  function describePhraseAtIndex(index) {
    const phrase = state.phrases[index];
    if (!phrase) {
      return {
        index,
        count: state.phrases.length,
        present: false,
      };
    }

    return {
      index,
      ordinal: index + 1,
      count: state.phrases.length,
      startSec: roundTime(phrase.startMs / 1000),
      endSec: roundTime(phrase.endMs / 1000),
      text: phrase.text,
    };
  }

  function roundTime(value) {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function renderSourceSelector(track, sourceToggle, sourceMenu) {
    const selectedSource = getSelectedPracticeSource();
    const loadedVia = selectedSource?.loadedTranscriptResult
      ? ` · ${formatTranscriptBadge(selectedSource.loadedTranscriptResult)}`
      : selectedSource?.loadedCueSource ? ` · ${captionTrackApi.cueSourceLabel(selectedSource.loadedCueSource)}` : "";
    const warning = selectedSource?.loadedTranscriptResult?.warnings?.length ? " · source warning" : "";
    sourceToggle.textContent = selectedSource
      ? `${captionTrackApi.sourceDisplayName(selectedSource)}${loadedVia}${warning}`
      : state.tracks.length ? "Captions: -" : "No captions";
    sourceToggle.disabled = state.loading || state.practiceSources.length <= 1;
    sourceToggle.setAttribute("aria-expanded", state.sourceMenuOpen ? "true" : "false");
    track.classList.toggle("is-open", state.sourceMenuOpen);

    clearElement(sourceMenu);
    if (!state.sourceMenuOpen || state.practiceSources.length <= 1) return;

    for (const group of captionTrackApi.groupPracticeSources(state.practiceSources)) {
      const header = appendElement(sourceMenu, "div", "af-source-group");
      header.textContent = group.label;

      for (const source of group.sources) {
        const option = appendElement(sourceMenu, "button", "af-source-option");
        option.type = "button";
        option.dataset.afSourceId = source.id;
        option.classList.toggle("is-selected", source.id === state.selectedSourceId);
        option.textContent = captionTrackApi.sourceDisplayName(source);
        option.addEventListener("click", () => selectPracticeSource(source.id));

        if (source.error) {
          const error = appendElement(sourceMenu, "div", "af-source-option-error");
          error.textContent = source.error;
        } else if (source.loadedTranscriptResult?.warnings?.length) {
          const warning = appendElement(sourceMenu, "div", "af-source-option-error");
          warning.textContent = source.loadedTranscriptResult.warnings[0];
        }
      }
    }
  }

  function toggleSourceMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    if (state.practiceSources.length <= 1) return;
    state.sourceMenuOpen = !state.sourceMenuOpen;
    render();
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

    subtitle.textContent = state.selectedTrack
      ? captionTrackApi.describeTrack(state.selectedTrack)
      : "Contextual Lookup";
    account.textContent = accountStatusLabel();

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
    eyebrow.textContent = "Lookup";
    const title = appendElement(card, "div", "af-dictionary-card-title");
    title.textContent = "Click a word";
    const copy = appendElement(card, "p", "af-dictionary-copy");
    copy.textContent = "Basic lookup should work in guest mode. Sign in later to sync saved words, review grades, and progress with 2000NL.";

    const accountCard = appendElement(parent, "div", "af-dictionary-card af-account-mini-card");
    const accountTitle = appendElement(accountCard, "div", "af-account-mini-title");
    accountTitle.textContent = "2000NL account";
    const accountCopy = appendElement(accountCard, "p", "af-dictionary-copy");
    accountCopy.textContent = "Not connected. Personal progress is off.";
    const action = appendButton(accountCard, "Connect 2000NL", "afSignIn");
    action.className = "af-secondary-button";
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
    status.textContent = state.accountStatus === "signed-in" ? "Personal lookup" : "Guest lookup";

    if (phrase) {
      const context = appendElement(card, "div", "af-context-block");
      const label = appendElement(context, "div", "af-context-label");
      label.textContent = "Current Context";
      const text = appendElement(context, "div", "af-context-text");
      renderClickablePhraseText(text, phrase.text, state.selectedWord.phraseIndex);
    }

    const lookup = appendElement(card, "div", "af-lookup-placeholder");
    const lookupTitle = appendElement(lookup, "div", "af-lookup-placeholder-title");
    lookupTitle.textContent = "Dictionary result";
    const lookupCopy = appendElement(lookup, "p", "af-dictionary-copy");
    lookupCopy.textContent = "API wiring will load public dictionary matches here. Login will add your personal progress, not unlock basic lookup.";

    renderReviewActions(card);
  }

  function renderReviewActions(parent) {
    const section = appendElement(parent, "div", "af-card-review");
    const label = appendElement(section, "div", "af-card-review-label");
    label.textContent = state.accountStatus === "signed-in" ? "Grade this card" : "Connect 2000NL to grade memory";
    const actions = appendElement(section, "div", "af-review-actions");
    const again = appendButton(actions, "Again", "afAgain");
    const hard = appendButton(actions, "Hard", "afHard");
    const good = appendButton(actions, "Good", "afGood");
    const easy = appendButton(actions, "Easy", "afEasy");
    [again, hard, good, easy].forEach((button) => {
      button.disabled = state.accountStatus !== "signed-in";
    });
  }

  function selectLookupWord(word, phraseIndex) {
    state.selectedWord = { word, phraseIndex };
    state.currentIndex = phraseIndex;
    render();
  }

  function accountStatusLabel() {
    if (state.accountStatus === "signed-in") return "2000NL connected";
    if (state.accountStatus === "expired") return "Reconnect 2000NL";
    return "Guest lookup";
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

  async function initializeForCurrentVideo() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    updateBootDiagnostics({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });
    if (!videoId || videoId === state.videoId || state.loading) return;

    const previousVideoId = state.videoId;
    const loadToken = state.loadToken + 1;
    state.videoId = videoId;
    state.loadToken = loadToken;
    state.tracks = [];
    state.practiceSources = [];
    state.selectedSourceId = "";
    state.sourceMenuOpen = false;
    state.selectedTrack = null;
    state.cueSource = "";
    state.transcriptResult = null;
    state.cues = [];
    state.phrases = [];
    state.currentIndex = 0;
    state.textVisible = true;
    state.selectedWord = null;
    state.guidedMode = false;
    state.error = "";
    state.loading = true;
    stopPlaybackTimer();
    detachPassivePlaybackWatcher();
    resetTranscriptPanelState(previousVideoId);
    render();

    try {
      const playerResponse = await waitForPlayerResponse();
      state.tracks = captionTrackApi.getCaptionTracks(playerResponse);
      updateBootDiagnostics({ captionTracksCount: state.tracks.length });
      state.practiceSources = captionTrackApi.buildPracticeSources(state.tracks);
      const defaultSource = captionTrackApi.chooseDefaultPracticeSource(state.practiceSources);
      if (!defaultSource) {
        throw new Error("No caption tracks found for this video.");
      }
      await loadPracticeSource(defaultSource, { keepExistingOnError: false, preserveVideoTime: false, loadToken });
    } catch (error) {
      if (loadToken !== state.loadToken) return;
      state.error = error instanceof Error ? error.message : String(error);
      updateBootDiagnostics({ lastError: state.error });
    } finally {
      if (loadToken === state.loadToken) {
        state.loading = false;
        render();
      }
    }
  }

  async function waitForPlayerResponse() {
    const startedAt = Date.now();
    let fetchedFreshPage = false;
    let lastError = "";

    while (Date.now() - startedAt < 10000) {
      const response = extractPlayerResponse();
      if (response) return response;

      if (!fetchedFreshPage && Date.now() - startedAt > 1000) {
        fetchedFreshPage = true;
        try {
          const freshResponse = await fetchFreshPlayerResponse();
          if (freshResponse) return freshResponse;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          recordDebugEvent("player-metadata-fetch-failed", {
            videoId: youtubeAdapterApi.getVideoIdFromUrl(),
            error: lastError,
          });
        }
      }

      await delay(250);
    }
    throw new Error(lastError ? `Could not read YouTube player metadata. ${lastError}` : "Could not read YouTube player metadata.");
  }

  function extractPlayerResponse() {
    return youtubeAdapterApi.extractPlayerResponseFromDocument(document, youtubeAdapterApi.getVideoIdFromUrl());
  }

  async function fetchFreshPlayerResponse() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    if (!videoId) return null;

    recordDebugEvent("player-metadata-fetch-start", { videoId });
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const html = await response.text();

    if (!response.ok) {
      throw new Error(`Fresh watch page request failed: HTTP ${response.status}`);
    }

    const playerResponse = youtubeAdapterApi.extractPlayerResponseFromText(html, videoId);
    if (!playerResponse) {
      throw new Error("Fresh watch page did not contain current player metadata.");
    }

    recordDebugEvent("player-metadata-fetch-loaded", {
      videoId,
      tracks: captionTrackApi.getCaptionTracks(playerResponse).length,
    });
    return playerResponse;
  }

  function resetTranscriptPanelState(previousVideoId) {
    document.documentElement.dataset.afTranscriptVideoId = "";
    Array.from(document.querySelectorAll("[data-af-current]")).forEach((segment) => {
      delete segment.dataset.afCurrent;
    });

    if (previousVideoId && previousVideoId !== state.videoId) {
      closeOpenTranscriptPanels();
    }
  }

  function closeOpenTranscriptPanels() {
    const closeButtons = Array.from(document.querySelectorAll("button[aria-label*='Close transcript'], button[aria-label*='Sluiten']"));
    const button = closeButtons.find((candidate) => isVisibleElement(candidate));
    if (button instanceof HTMLElement) {
      activateElement(button);
    }
  }

  function getSelectedPracticeSource() {
    return state.practiceSources.find((source) => source.id === state.selectedSourceId) || null;
  }

  async function selectPracticeSource(sourceId) {
    const source = state.practiceSources.find((candidate) => candidate.id === sourceId);
    if (!source || source.id === state.selectedSourceId || state.loading) return;

    state.sourceMenuOpen = false;
    await loadPracticeSource(source, { keepExistingOnError: true, preserveVideoTime: true });
  }

  async function loadPracticeSource(source, options) {
    const loadToken = options.loadToken ?? state.loadToken;
    if (loadToken !== state.loadToken) return;

    const video = getVideoElement();
    const currentMs = options.preserveVideoTime && video ? video.currentTime * 1000 : 0;

    state.loading = true;
    state.error = "";
    source.error = "";
    source.lastError = "";
    source.lastRetrievalAttempts = [];
    render();

    try {
      state.cueSource = "";
      state.transcriptResult = null;
      const transcriptResult = await fetchBestAvailableCues(source.track, {
        refreshCache: Boolean(options.refreshCache),
      });
      const cues = transcriptResult.cues;
      const phrases = phraseApi.buildPhrases(cues, {
        maxPhraseDurationMs: MAX_PHRASE_DURATION_MS,
        longPauseMs: LONG_PAUSE_MS,
        maxWords: 18,
        maxCharacters: 140,
      });
      if (loadToken !== state.loadToken) return;
      if (!phrases.length) {
        throw new Error("Caption track loaded, but no timed phrases were parsed.");
      }

      state.selectedSourceId = source.id;
      state.selectedTrack = source.track;
      state.cues = cues;
      state.transcriptResult = transcriptResult;
      state.phrases = phrases;
      state.currentIndex = findPhraseIndexForTime(phrases, currentMs);
      state.selectedWord = null;
      source.loadedCueSource = transcriptResult.retrievalPath;
      source.loadedTranscriptResult = summarizeTranscriptResult(transcriptResult);
      source.lastRetrievalAttempts = transcriptResult.retrievalAttempts || [];
      state.error = "";
      updateBootDiagnostics({
        selectedRetrievalPath: transcriptResult.retrievalPath,
        lastError: "",
      });
      ensurePassivePlaybackWatcher();
      recordDebugEvent("source-loaded", {
        source: captionTrackApi.sourceDisplayName(source),
        sourceKind: transcriptResult.sourceKind,
        retrievalPath: transcriptResult.retrievalPath,
        timingExactness: transcriptResult.timingExactness,
        qualityFlags: transcriptResult.qualityFlags,
        warnings: transcriptResult.warnings,
        cues: cues.length,
        phrases: phrases.length,
      });
    } catch (error) {
      if (loadToken !== state.loadToken) return;
      const message = error instanceof Error ? error.message : String(error);
      source.lastError = message;
      source.error = summarizeError(message);
      source.lastRetrievalAttempts = Array.isArray(error?.retrievalAttempts) ? error.retrievalAttempts : [];
      state.error = source.error;
      updateBootDiagnostics({ lastError: message });
      recordDebugEvent("source-failed", {
        source: captionTrackApi.sourceDisplayName(source),
        languageCode: source.languageCode,
        error: message,
      });
      if (!options.keepExistingOnError) {
        state.selectedSourceId = source.id;
        state.selectedTrack = source.track;
        state.cues = [];
        state.transcriptResult = null;
        state.phrases = [];
        state.currentIndex = 0;
        state.sourceMenuOpen = state.practiceSources.length > 1;
      }
    } finally {
      if (loadToken === state.loadToken) {
        state.loading = false;
        render();
      }
    }
  }

  function summarizeError(message) {
    if (/Backend provider fallback is disabled/i.test(message)) {
      return "Caption retrieval failed: YouTube timedtext was empty and backend fallback is disabled.";
    }
    if (/Backend provider request timed out|Backend provider returned no response|Backend provider request failed/i.test(message)) {
      return "Caption retrieval failed: YouTube timedtext was empty and backend provider failed.";
    }
    if (/Diagnostic YouTube transcript fallback is disabled/i.test(message) && /empty response/i.test(message)) {
      return "Caption retrieval failed: YouTube timedtext was empty and diagnostic transcript fallback is disabled.";
    }
    const first = message.split("|")[0]?.split(";")[0]?.trim() || message;
    return first.length > 140 ? `${first.slice(0, 137)}...` : first;
  }

  function findPhraseIndexForTime(phrases, currentMs) {
    if (!phrases.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    const activeIndex = phrases.findIndex((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs);
    if (activeIndex >= 0) return activeIndex;

    for (let index = phrases.length - 1; index >= 0; index -= 1) {
      if (phrases[index].startMs <= currentMs) return index;
    }

    return 0;
  }

  function findPlaybackPhraseIndex(phrases, currentMs) {
    if (!phrases.length || !Number.isFinite(currentMs) || currentMs <= 0) return 0;

    for (let index = 0; index < phrases.length; index += 1) {
      const phrase = phrases[index];
      if (
        currentMs >= phrase.startMs - PRE_ROLL_MS &&
        currentMs <= playbackEndMsForPhrase(phrases, index)
      ) {
        return index;
      }
    }

    return findPhraseIndexForTime(phrases, currentMs);
  }

  async function fetchBestAvailableCues(track, options = {}) {
    if (!transcriptRetrievalApi?.fetchBestAvailableCues) {
      throw new Error("Transcript retrieval helper was not loaded.");
    }

    const result = await transcriptRetrievalApi.fetchBestAvailableCues(track, {
      videoId: state.videoId,
      recordDebugEvent,
      updateRetrievalPath: (path) => updateBootDiagnostics({ selectedRetrievalPath: path }),
      updateLastError: (message) => updateBootDiagnostics({ lastError: message }),
      refreshCache: Boolean(options.refreshCache),
    });
    return normalizeTranscriptResult(result, track);
  }

  function normalizeTranscriptResult(result, track) {
    const normalized = {
      cues: Array.isArray(result?.cues) ? result.cues : [],
      sourceKind: result?.sourceKind || sourceKindFromTrack(track),
      retrievalPath: result?.retrievalPath || result?.cueSource || "backend-provider",
      fetchOrigin: result?.fetchOrigin || fetchOriginFromRetrievalPath(result?.retrievalPath || result?.cueSource || "backend-provider"),
      provider: result?.provider || result?.actualTrackId || "",
      selectedTrackId: result?.selectedTrackId || track?.vssId || track?.languageCode || "",
      actualTrackId: result?.actualTrackId || "",
      languageCode: result?.languageCode || track?.languageCode || "",
      timingExactness: result?.timingExactness || "approximate",
      qualityFlags: Array.isArray(result?.qualityFlags) ? result.qualityFlags : [],
      warnings: Array.isArray(result?.warnings) ? result.warnings : [],
      retrievalAttempts: Array.isArray(result?.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result?.cacheStatus || "",
      fallbackUsed: Boolean(result?.fallbackUsed),
      primaryProvider: result?.primaryProvider || "",
      failedProvider: result?.failedProvider || "",
      fallbackReason: result?.fallbackReason || "",
    };
    state.cueSource = normalized.retrievalPath;
    return normalized;
  }

  function sourceKindFromTrack(track) {
    return track?.kind === "asr" ? "auto" : "manual";
  }

  function summarizeTranscriptResult(result) {
    return {
      sourceKind: result.sourceKind,
      retrievalPath: result.retrievalPath,
      fetchOrigin: result.fetchOrigin || fetchOriginFromRetrievalPath(result.retrievalPath),
      provider: result.provider || result.actualTrackId || "",
      selectedTrackId: result.selectedTrackId || "",
      actualTrackId: result.actualTrackId || "",
      languageCode: result.languageCode || "",
      timingExactness: result.timingExactness,
      qualityFlags: [...(result.qualityFlags || [])],
      warnings: [...(result.warnings || [])],
      retrievalAttempts: Array.isArray(result.retrievalAttempts) ? result.retrievalAttempts : [],
      cacheStatus: result.cacheStatus || "",
      fallbackUsed: Boolean(result.fallbackUsed),
      primaryProvider: result.primaryProvider || "",
      failedProvider: result.failedProvider || "",
      fallbackReason: result.fallbackReason || "",
    };
  }

  function formatTranscriptBadge(result) {
    const sourceLabel = {
      manual: "Manual",
      auto: "Auto",
      "transcript-panel": "Transcript fallback",
      provider: "Provider",
      asr: "ASR",
      unknown: "Unknown",
    }[result.sourceKind] || "Unknown";
    const timingLabel = result.timingExactness === "exact"
      ? "exact"
      : result.timingExactness === "word-level" ? "word-level" : "rough timing";
    const originLabel = formatFetchOriginLabel(result);
    const cacheLabel = result.cacheStatus === "hit" ? " · cached" : "";
    const fallbackLabel = result.fallbackUsed ? " · fallback" : "";
    return `${sourceLabel} · ${timingLabel}${originLabel ? ` · via ${originLabel}` : ""}${cacheLabel}${fallbackLabel}`;
  }

  function fetchOriginFromRetrievalPath(retrievalPath) {
    if (!retrievalPath) return "";
    if (String(retrievalPath).startsWith("timedtext")) return "youtube-page";
    if (retrievalPath === "backend-provider") return "backend";
    if (retrievalPath === "youtubei-transcript") return "youtube-transcript-api";
    if (retrievalPath === "transcript-dom") return "youtube-transcript-dom";
    return "";
  }

  function formatFetchOriginLabel(result) {
    const provider = String(result?.provider || "").trim();
    if (provider === "supadata") return "Supadata";
    if (provider === "yt-dlp") return "yt-dlp";
    if (provider === "youtube-timedtext") return "YouTube page";
    if (provider === "youtubei-transcript") return "YouTube transcript API";
    if (provider === "youtube-transcript-panel") return "YouTube transcript DOM";

    const origin = String(result?.fetchOrigin || "").trim();
    if (origin === "youtube-page") return "YouTube page";
    if (origin === "backend") return provider || "backend";
    if (origin === "youtube-transcript-api") return "YouTube transcript API";
    if (origin === "youtube-transcript-dom") return "YouTube transcript DOM";
    return provider;
  }

  function getVideoElement() {
    const video = youtubeAdapterApi.getVideoElement(document);
    updateBootDiagnostics({ videoElementDetected: Boolean(video) });
    return video;
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.isConnected) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
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

  function replayCurrentPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("replay", state.currentIndex);
  }

  function pauseCurrentPlayback(command = "pause") {
    const video = getVideoElement();
    if (!video) return;

    const before = getPlaybackSnapshot();
    stopPlaybackTimer();
    state.guidedHold = null;
    if (!video.paused) {
      video.pause();
    }
    recordNavigationEvent(`${command}-pause`, {
      currentPhrase: describePhraseAtIndex(state.currentIndex),
      playbackBefore: before,
      playbackAfter: getPlaybackSnapshot(),
    });
    render();
  }

  function nextPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("next", Math.min(state.currentIndex + 1, state.phrases.length - 1));
  }

  function previousPhrase() {
    if (!state.phrases.length) return;
    navigateToPhrase("previous", Math.max(state.currentIndex - 1, 0));
  }

  function navigateToPhrase(command, targetIndex) {
    const fromIndex = state.currentIndex;
    const before = getPlaybackSnapshot();
    const navigationEvent = recordNavigationEvent("command-start", {
      command,
      fromPhrase: describePhraseAtIndex(fromIndex),
      targetPhrase: describePhraseAtIndex(targetIndex),
      playbackBefore: before,
    });
    state.guidedHold = null;
    state.currentIndex = targetIndex;
    state.selectedWord = null;
    enterGuidedMode();
    render();
    const playResult = playPhrase(state.currentIndex, { command, navigationEventId: navigationEvent.id });
    recordNavigationEvent("command-dispatched", {
      command,
      navigationEventId: navigationEvent.id,
      fromIndex,
      targetIndex,
      playResult,
      playbackAfterDispatch: getPlaybackSnapshot(),
    });
    scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 250);
    scheduleNavigationObservation(navigationEvent.id, command, targetIndex, 750);
  }

  function toggleText() {
    state.textVisible = !state.textVisible;
    render();
  }

  function toggleAutoPause() {
    state.autoPause = !state.autoPause;
    state.guidedMode = state.autoPause ? true : false;
    recordNavigationEvent("auto-pause-toggle", {
      autoPause: state.autoPause,
      guidedMode: state.guidedMode,
      playback: getPlaybackSnapshot(),
      currentPhrase: describePhraseAtIndex(state.currentIndex),
    });
    render();
  }

  function enterGuidedMode() {
    state.guidedMode = true;
  }

  function showText() {
    state.textVisible = true;
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

  function playbackEndMsForPhrase(phrases, index) {
    const phrase = phrases[index];
    if (!phrase) return 0;
    const nextPhrase = phrases[index + 1];
    const postRollEndMs = phrase.endMs + POST_ROLL_MS;
    if (nextPhrase && nextPhrase.startMs < postRollEndMs) {
      return Math.max(phrase.startMs, nextPhrase.startMs - CONTIGUOUS_BOUNDARY_GUARD_MS);
    }
    return postRollEndMs;
  }

  function playPhrase(index, options = {}) {
    const phrase = state.phrases[index];
    const video = getVideoElement();
    if (!phrase || !video) {
      return { ok: false, reason: !phrase ? "missing-phrase" : "missing-video" };
    }

    stopPlaybackTimer();
    const startSeconds = Math.max(0, phrase.startMs - PRE_ROLL_MS) / 1000;
    const endSeconds = playbackEndMsForPhrase(state.phrases, index) / 1000;
    markCurrentTranscriptSegment(phrase);
    video.currentTime = startSeconds;
    video.play().catch(() => {});
    recordNavigationEvent("seek-started", {
      command: options.command || "unknown",
      navigationEventId: options.navigationEventId || null,
      targetPhrase: describePhraseAtIndex(index),
      seekToSec: roundTime(startSeconds),
      expectedPauseAtSec: roundTime(endSeconds),
      playbackAfterSeek: getPlaybackSnapshot(),
    });

    if (!state.autoPause) {
      render();
      return {
        ok: true,
        seekToSec: roundTime(startSeconds),
        expectedPauseAtSec: null,
        autoPause: false,
      };
    }

    state.activePlayback = {
      index,
      endSeconds,
      holdSeconds: Math.max(0, phrase.startMs / 1000),
    };

    state.playbackFrame = window.requestAnimationFrame(function frame() {
      enforcePhraseEnd(video);
      if (state.activePlayback) {
        state.playbackFrame = window.requestAnimationFrame(frame);
      }
    });
    return {
      ok: true,
      seekToSec: roundTime(startSeconds),
      expectedPauseAtSec: roundTime(endSeconds),
      autoPause: true,
    };
  }

  function scheduleNavigationObservation(navigationEventId, command, targetIndex, delayMs) {
    window.setTimeout(() => {
      recordNavigationEvent("command-observation", {
        command,
        navigationEventId,
        delayMs,
        targetPhrase: describePhraseAtIndex(targetIndex),
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playback: getPlaybackSnapshot(),
      });
      if (state.debugVisible) {
        render();
      }
    }, delayMs);
  }

  function stopPlaybackTimer() {
    if (state.playbackFrame) {
      window.cancelAnimationFrame(state.playbackFrame);
      state.playbackFrame = null;
    }
    state.activePlayback = null;
  }

  function ensurePassivePlaybackWatcher() {
    const video = getVideoElement();
    if (!video || state.passiveVideo === video) return;

    detachPassivePlaybackWatcher();
    state.passiveVideo = video;
    state.passivePausedKey = "";
    video.addEventListener("timeupdate", onPassiveVideoTimeUpdate, true);
    video.addEventListener("play", onPassiveVideoPlay, true);
    video.addEventListener("pause", onPassiveVideoPause, true);
    syncPassivePlayback(video);
    if (!video.paused) {
      startPassivePlaybackFrame(video);
    }
  }

  function detachPassivePlaybackWatcher() {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }

    if (state.passiveVideo) {
      state.passiveVideo.removeEventListener("timeupdate", onPassiveVideoTimeUpdate, true);
      state.passiveVideo.removeEventListener("play", onPassiveVideoPlay, true);
      state.passiveVideo.removeEventListener("pause", onPassiveVideoPause, true);
      state.passiveVideo = null;
    }

    state.passivePausedKey = "";
  }

  function onPassiveVideoTimeUpdate(event) {
    syncPassivePlayback(event.currentTarget);
  }

  function onPassiveVideoPlay(event) {
    state.passivePausedKey = "";
    const video = event.currentTarget;
    syncPassivePlayback(video);
    startPassivePlaybackFrame(video);
  }

  function onPassiveVideoPause() {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
      state.passiveFrame = null;
    }
  }

  function startPassivePlaybackFrame(video) {
    if (state.passiveFrame) {
      window.cancelAnimationFrame(state.passiveFrame);
    }

    state.passiveFrame = window.requestAnimationFrame(function frame() {
      if (state.passiveVideo !== video) {
        state.passiveFrame = null;
        return;
      }

      syncPassivePlayback(video);
      if (!video.paused) {
        state.passiveFrame = window.requestAnimationFrame(frame);
      } else {
        state.passiveFrame = null;
      }
    });
  }

  function syncPassivePlayback(video) {
    if (!video || !state.learningEnabled || state.loading || !state.phrases.length) return;

    if (state.activePlayback) {
      const phrase = state.phrases[state.activePlayback.index];
      if (phrase && state.currentIndex !== state.activePlayback.index) {
        state.currentIndex = state.activePlayback.index;
        state.selectedWord = null;
        markCurrentTranscriptSegment(phrase);
        render();
      }
      return;
    }

    const currentMs = video.currentTime * 1000;
    if (shouldPreserveGuidedHold(currentMs)) {
      return;
    }

    const index = findPlaybackPhraseIndex(state.phrases, currentMs);
    const phrase = state.phrases[index];
    if (!phrase) return;

    if (index !== state.currentIndex) {
      state.currentIndex = index;
      state.selectedWord = null;
      markCurrentTranscriptSegment(phrase);
      render();
    }

    if (!state.guidedMode || !state.autoPause || state.activePlayback || video.paused) return;

    const endMs = playbackEndMsForPhrase(state.phrases, index);
    if (currentMs < endMs) return;

    const pauseKey = `${state.videoId || ""}:${state.selectedSourceId}:${index}`;
    if (state.passivePausedKey === pauseKey) return;

    state.passivePausedKey = pauseKey;
    video.pause();
    video.currentTime = Math.max(0, phrase.startMs / 1000);
    markCurrentTranscriptSegment(phrase);
    render();
  }

  function enforcePhraseEnd(video) {
    if (!state.activePlayback || !video) return;

    if (video.currentTime >= state.activePlayback.endSeconds) {
      const index = state.activePlayback.index;
      const phrase = state.phrases[state.activePlayback.index];
      video.pause();
      video.currentTime = state.activePlayback.holdSeconds;
      state.currentIndex = index;
      state.guidedHold = {
        index,
        holdSeconds: state.activePlayback.holdSeconds,
        createdAt: Date.now(),
      };
      markCurrentTranscriptSegment(phrase);
      recordNavigationEvent("auto-pause-held", {
        targetPhrase: describePhraseAtIndex(index),
        holdSeconds: roundTime(state.activePlayback.holdSeconds),
        playback: getPlaybackSnapshot(),
      });
      stopPlaybackTimer();
      render();
    }
  }

  function shouldPreserveGuidedHold(currentMs) {
    if (!state.guidedMode || !state.guidedHold) return false;
    const phrase = state.phrases[state.guidedHold.index];
    if (!phrase) return false;
    const holdMs = state.guidedHold.holdSeconds * 1000;
    const atHeldBoundary = Math.abs(currentMs - holdMs) <= 350;
    if (!atHeldBoundary) {
      state.guidedHold = null;
      return false;
    }
    if (state.currentIndex !== state.guidedHold.index) {
      state.currentIndex = state.guidedHold.index;
      state.selectedWord = null;
      markCurrentTranscriptSegment(phrase);
      render();
    }
    return true;
  }

  function markCurrentTranscriptSegment(phrase) {
    const segmentIndex = phrase?.cues?.[0]?.segmentIndex;
    const segmentSelector = phrase?.cues?.[0]?.segmentSelector;
    const selector = segmentSelector === "modern"
      ? "transcript-segment-view-model"
      : "ytd-transcript-segment-renderer";
    const segments = Array.from(document.querySelectorAll(selector));

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
    if (!youtubeAdapterApi.isWatchPage()) return;
    if (!state.learningEnabled) return;
    if (shouldIgnoreKeyEvent(event)) return;

    if (isSpaceKey(event)) {
      blockYouTubeShortcut(event);
      if (event.type === "keydown" && !event.repeat) {
        toggleContinuousPlayback();
      }
      return;
    }

    if (event.type !== "keydown") return;

    if (event.code === "ArrowRight") {
      blockYouTubeShortcutWithOptions(event);
      nextPhrase();
    } else if (event.code === "ArrowLeft") {
      blockYouTubeShortcutWithOptions(event);
      previousPhrase();
    } else if (event.code === "ArrowDown") {
      blockYouTubeShortcutWithOptions(event);
      replayCurrentPhrase();
    } else if (event.code === "ArrowUp") {
      blockYouTubeShortcutWithOptions(event);
      pauseCurrentPlayback("arrow-up");
    }
  }

  function toggleContinuousPlayback() {
    const video = getVideoElement();
    if (!video) return;

    const before = getPlaybackSnapshot();
    stopPlaybackTimer();
    state.guidedMode = false;
    state.passivePausedKey = "";

    if (video.paused || video.ended) {
      recordNavigationEvent("space-play", {
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playbackBefore: before,
      });
      video.play().catch(() => {});
    } else {
      recordNavigationEvent("space-pause", {
        currentPhrase: describePhraseAtIndex(state.currentIndex),
        playbackBefore: before,
      });
      video.pause();
    }

    scheduleNavigationObservation(
      state.navigationEvents[state.navigationEvents.length - 1]?.id || null,
      "space",
      state.currentIndex,
      250,
    );
    render();
  }

  function isSpaceKey(event) {
    return event.code === "Space" || event.key === " " || event.key === "Spacebar";
  }

  function blockYouTubeShortcut(event) {
    blockYouTubeShortcutWithOptions(event, { immediate: true });
  }

  function blockYouTubeShortcutWithOptions(event, options = {}) {
    event.preventDefault();
    event.stopPropagation();
    if (options.immediate) {
      event.stopImmediatePropagation();
    }
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
        state.loadToken += 1;
        state.loading = false;
        state.videoId = null;
        handleCurrentLocation();
      }
    }, 500);
  }

  function watchWorkspaceMount() {
    window.setInterval(() => {
      if (youtubeAdapterApi.isWatchPage() && state.learningEnabled) {
        ensureWorkspace();
        initializeForCurrentVideo();
        if (state.phrases.length) {
          ensurePassivePlaybackWatcher();
        }
      }
    }, 2000);
  }

  function handleCurrentLocation() {
    const videoId = youtubeAdapterApi.getVideoIdFromUrl();
    updateBootDiagnostics({
      watchPageDetected: Boolean(videoId),
      videoIdDetected: videoId || "",
    });

    if (!videoId) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      removeWorkspace();
      document.getElementById(TOGGLE_ID)?.remove();
      return;
    }
    renderToggle();
    if (!state.learningEnabled) {
      stopPlaybackTimer();
      detachPassivePlaybackWatcher();
      state.guidedMode = false;
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
  }

  function createBootDiagnosticsFallback() {
    const version = "missing-boot-diagnostics-helper";
    const publish = (diagnostics) => {
      document.documentElement.dataset.afShadowingBootState = JSON.stringify(diagnostics);
    };

    return {
      markBootStarted() {
        const diagnostics = {
          contentScriptLoaded: true,
          bootFailed: false,
          version,
          loadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url: window.location.href,
          extensionId: "",
          watchPageDetected: false,
          videoIdDetected: "",
          videoElementDetected: false,
          captionTracksCount: null,
          selectedRetrievalPath: "",
          lastError: "",
        };
        document.documentElement.dataset.afShadowingBoot = "1";
        document.documentElement.dataset.afShadowingBootVersion = version;
        publish(diagnostics);
        return diagnostics;
      },
      recordBootFailure(error) {
        console.error("[AudioFilms] content script boot failed", error);
      },
      renderBootFailureBadge() {},
      publish,
    };
  }

  function createPhraseFallback() {
    const cleanPhraseText = (text) => text
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const hasSentenceEnding = (text) => /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
    const wordCount = (text) => {
      const matches = String(text || "").match(/[\p{L}\p{N}]+/gu);
      return matches ? matches.length : 0;
    };

    return {
      buildPhrases(cues, options = {}) {
        const maxPhraseDurationMs = options.maxPhraseDurationMs ?? 12000;
        const longPauseMs = options.longPauseMs ?? 1000;
        const maxWords = options.maxWords ?? 18;
        const maxCharacters = options.maxCharacters ?? 140;
        const phrases = [];
        let current = null;

        for (const cue of cues) {
          if (!current) {
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
            continue;
          }

          const pause = cue.startMs - current.endMs;
          const nextDuration = cue.endMs - current.startMs;
          const nextText = cleanPhraseText(`${current.text} ${cue.text}`);
          const shouldBreak =
            hasSentenceEnding(current.text) ||
            pause > longPauseMs ||
            nextDuration > maxPhraseDurationMs ||
            wordCount(nextText) > maxWords ||
            nextText.length > maxCharacters;

          if (shouldBreak) {
            phrases.push(current);
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
          } else {
            current.endMs = Math.max(current.endMs, cue.endMs);
            current.text = nextText;
            current.cues.push(cue);
          }
        }

        if (current) phrases.push(current);
        return phrases.map((phrase, index) => ({ ...phrase, index }));
      },
      cleanPhraseText,
      hasSentenceEnding,
      wordCount,
    };
  }

  function createCaptionTracksFallback() {
    const trackName = (track) => (
      track.name?.simpleText ||
      track.name?.runs?.map((run) => run.text).join("") ||
      track.languageCode ||
      "unknown"
    );
    const sourceDisplayName = (source) => source.name || source.languageCode || "Captions";
    const languageLabelFromSource = (source) => {
      const name = source.name || source.languageCode || "Unknown";
      return name
        .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
        .trim() || name;
    };

    return {
      getCaptionTracks(playerResponse) {
        return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      },
      buildPracticeSources(tracks) {
        return tracks.map((track, index) => ({
          id: `${track.languageCode || "unknown"}:${track.vssId || index}:${index}`,
          index,
          name: trackName(track),
          languageCode: track.languageCode || "",
          track,
          error: "",
          lastError: "",
          lastRetrievalAttempts: [],
          loadedCueSource: "",
          loadedTranscriptResult: null,
        }));
      },
      chooseDefaultPracticeSource(sources) {
        return sources.find((source) => source.track.kind !== "asr") || sources[0] || null;
      },
      describeTrack: trackName,
      trackName,
      sourceDisplayName,
      cueSourceLabel(value) {
        if (!value) return "";
        if (String(value).startsWith("timedtext")) return "timedtext";
        if (value === "youtubei-transcript") return "transcript API";
        if (value === "transcript-dom") return "transcript fallback";
        return "fallback";
      },
      groupPracticeSources(sources) {
        const groups = [];
        const byLanguage = new Map();

        for (const source of sources) {
          const key = source.languageCode || source.name || "unknown";
          if (!byLanguage.has(key)) {
            const label = source.languageCode
              ? `${languageLabelFromSource(source)} (${source.languageCode})`
              : languageLabelFromSource(source);
            const group = { key, label, sources: [] };
            byLanguage.set(key, group);
            groups.push(group);
          }
          byLanguage.get(key).sources.push(source);
        }

        groups.forEach((group) => {
          group.sources.sort((left, right) => {
            const leftAuto = left.track.kind === "asr" ? 1 : 0;
            const rightAuto = right.track.kind === "asr" ? 1 : 0;
            return leftAuto - rightAuto || left.index - right.index;
          });
        });

        return groups;
      },
      languageLabelFromSource,
      formatSourceDebug(source) {
        return {
          id: source.id,
          name: source.name,
          languageCode: source.languageCode,
          kind: source.track.kind || "manual",
          vssId: source.track.vssId || "",
          loadedCueSource: source.loadedCueSource,
          loadedTranscriptResult: source.loadedTranscriptResult,
          lastRetrievalAttempts: source.lastRetrievalAttempts || [],
          error: source.error,
          lastError: source.lastError,
        };
      },
    };
  }

  function createYouTubeAdapterFallback() {
    const getVideoIdFromUrl = (href = window.location.href) => {
      const url = new URL(href);
      return url.searchParams.get("v");
    };

    const extractBalancedJson = (text, startIndex) => {
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
    };

    const extractPlayerResponseFromText = (text, currentVideoId) => {
      let searchFrom = 0;

      while (searchFrom < text.length) {
        const markerIndex = text.indexOf("ytInitialPlayerResponse", searchFrom);
        if (markerIndex === -1) return null;
        searchFrom = markerIndex + "ytInitialPlayerResponse".length;

        const assignmentIndex = text.indexOf("=", markerIndex);
        if (assignmentIndex === -1) continue;

        const jsonStart = text.indexOf("{", assignmentIndex);
        if (jsonStart === -1) continue;

        const jsonText = extractBalancedJson(text, jsonStart);
        if (!jsonText) continue;

        try {
          const response = JSON.parse(jsonText);
          const responseVideoId = response?.videoDetails?.videoId;
          if (!currentVideoId || !responseVideoId || responseVideoId === currentVideoId) {
            return response;
          }
        } catch (_error) {
          continue;
        }
      }

      return null;
    };

    const isVisibleVideoElement = (video) => {
      if (!(video instanceof HTMLVideoElement)) return false;
      if (!video.isConnected) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(video);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      return true;
    };

    const isUsableYouTubeVideo = (video) => {
      if (!isVisibleVideoElement(video)) return false;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 100) return false;
      if (video.closest(".ytp-ad-player-overlay, .ytp-ad-module")) return false;
      return true;
    };

    return {
      getVideoIdFromUrl,
      isWatchPage(href = window.location.href) {
        return Boolean(getVideoIdFromUrl(href));
      },
      extractPlayerResponseFromDocument(doc = document, currentVideoId = getVideoIdFromUrl()) {
        const scripts = Array.from(doc.scripts);
        for (const script of scripts) {
          const response = extractPlayerResponseFromText(script.textContent || "", currentVideoId);
          if (response) return response;
        }
        return null;
      },
      extractPlayerResponseFromText,
      extractBalancedJson,
      getVideoElement(doc = document) {
        const videos = Array.from(doc.querySelectorAll("video"));
        return videos.find(isUsableYouTubeVideo) || videos.find(isVisibleVideoElement) || videos[0] || null;
      },
      isUsableYouTubeVideo,
      isVisibleVideoElement,
    };
  }
})();
