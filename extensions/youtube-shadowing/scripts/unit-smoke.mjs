import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");

function loadBrowserModule(relativePath, exportName, globals = {}) {
  const sandbox = { window: { ...globals }, URL, ...globals };
  const source = fs.readFileSync(path.join(extensionRoot, relativePath), "utf8");
  vm.runInNewContext(source, sandbox, { filename: relativePath });
  return sandbox.window[exportName];
}

function assertManifestOrderRegistersContentNamespaces() {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));
  const contentScripts = manifest.content_scripts
    .find((entry) => (entry.js || []).includes("src/content.js"))?.js || [];
  assert.ok(contentScripts.length, "manifest includes the extension content script list");

  const sandbox = createManifestOrderSandbox();
  for (const scriptPath of contentScripts) {
    if (scriptPath === "src/content.js") break;
    const source = fs.readFileSync(path.join(extensionRoot, scriptPath), "utf8");
    vm.runInNewContext(source, sandbox, { filename: scriptPath });
  }

  const requiredNamespaces = [
    "__afShadowingFallbacks",
    "__afShadowingBootDiagnostics",
    "__afShadowingBootState",
    "__afShadowingFormatUtils",
    "__afShadowingPhrases",
    "__afShadowingCaptionTracks",
    "__afShadowingSourceLabels",
    "__afShadowingSourceSelection",
    "__afShadowingSourceSelectionStorage",
    "__afShadowingSourceReadiness",
    "__afShadowingVideoLoadState",
    "__afShadowingSourceSelector",
    "__afShadowingSourceSelectorDom",
    "__afShadowingSourceSelectorWorkflow",
    "__afShadowingYouTubeAdapter",
    "__afShadowingPlayerMetadataWorkflow",
    "__afShadowingTranscriptRetrieval",
    "__afShadowingTranscriptMetadata",
    "__afShadowingSourceTranscriptWorkflow",
    "__afShadowingSourceTranscriptContentWorkflow",
    "__afShadowingTranscriptPanelDom",
    "__afShadowingSourceTimingWorkflow",
    "__afShadowingSourceTimingContentWorkflow",
    "__afShadowingSourceLoadWorkflow",
    "__afShadowingSourceLoadContentWorkflow",
    "__afShadowingSourceContentFacade",
    "__afShadowingVideoInitWorkflow",
    "__afShadowingVideoInitContentWorkflow",
    "__afShadowingSourceBinding",
    "__afShadowingDictionaryActions",
    "__afShadowingDictionaryActionWorkflow",
    "__afShadowingDictionaryState",
    "__afShadowingDictionaryAudio",
    "__afShadowingDictionaryAudioWorkflow",
    "__afShadowingDictionaryMocks",
    "__afShadowingDictionaryPresentation",
    "__afShadowingDictionaryDom",
    "__afShadowingDictionaryOverlayWorkflow",
    "__afShadowingDictionaryPanelWorkflow",
    "__afShadowingDictionarySearchDom",
    "__afShadowingDictionarySearchWorkflow",
    "__afShadowingDictionaryRenderWorkflow",
    "__afShadowingDictionaryCommands",
    "__afShadowingDictionaryCommandTransport",
    "__afShadowingDictionaryLookupWorkflow",
    "__afShadowingDictionaryContentWorkflow",
    "__afShadowingAccountSession",
    "__afShadowingAccountSessionWorkflow",
    "__afShadowingAccountSessionDom",
    "__afShadowingBackendCommands",
    "__afShadowingBackendBuildWorkflow",
    "__afShadowingExtensionCommandClient",
    "__afShadowingGeneratedEntries",
    "__afShadowingGeneratedEntryWorkflow",
    "__afShadowingPhraseProgress",
    "__afShadowingPhraseProgressStorage",
    "__afShadowingPhraseTranslations",
    "__afShadowingPhraseTranslationWorkflow",
    "__afShadowingPhraseRows",
    "__afShadowingPhraseRowsDom",
    "__afShadowingPhraseRowsWorkflow",
    "__afShadowingSelectedSpans",
    "__afShadowingSelectedSpanWorkflow",
    "__afShadowingSelectedSpansDom",
    "__afShadowingDictionaryOperationsContentFacade",
    "__afShadowingPlaybackSession",
    "__afShadowingPlaybackTiming",
    "__afShadowingPlaybackWorkflow",
    "__afShadowingPlaybackContentWorkflow",
    "__afShadowingPassivePlaybackWatcher",
    "__afShadowingPassivePlaybackContentWorkflow",
    "__afShadowingPlaybackContentFacade",
    "__afShadowingPanelLayout",
    "__afShadowingPanelLayoutDom",
    "__afShadowingPanelLayoutWorkflow",
    "__afShadowingPanelLayoutContentWorkflow",
    "__afShadowingIssueReports",
    "__afShadowingIssueReportWorkflow",
    "__afShadowingSupportContentFacade",
    "__afShadowingIssueReportsDom",
    "__afShadowingDiagnosticsReport",
    "__afShadowingDiagnosticsState",
    "__afShadowingDiagnosticsFormatWorkflow",
    "__afShadowingDiagnosticsDom",
    "__afShadowingDiagnosticsWorkflow",
    "__afShadowingDiagnosticsContentWorkflow",
    "__afShadowingDisplayPreferences",
    "__afShadowingDisplayPreferenceStorage",
    "__afShadowingDisplayPreferenceWorkflow",
    "__afShadowingStorageState",
    "__afShadowingMenuState",
    "__afShadowingKeyboardShortcuts",
    "__afShadowingKeyboardWorkflow",
    "__afShadowingKeyboardContentWorkflow",
    "__afShadowingScrollContainment",
    "__afShadowingDomUtils",
    "__afShadowingUiIcons",
    "__afShadowingUiStateWorkflow",
    "__afShadowingDisplayStateContentWorkflow",
    "__afShadowingRibbonControls",
    "__afShadowingWorkspaceDom",
    "__afShadowingWorkspaceWorkflow",
    "__afShadowingWorkspaceContentWorkflow",
    "__afShadowingPhraseJumpWorkflow",
    "__afShadowingRibbonDom",
    "__afShadowingRibbonPanelDom",
    "__afShadowingRibbonPanelFactory",
    "__afShadowingRibbonPanelContentWorkflow",
    "__afShadowingRibbonWorkflow",
    "__afShadowingRibbonContentWorkflow",
    "__afShadowingSurfaceContentFacade",
    "__afShadowingModuleRegistry",
    "__afShadowingBuildInfo",
  ];
  for (const namespace of requiredNamespaces) {
    assert.ok(sandbox[namespace], `manifest order registers ${namespace}`);
  }
}

function createManifestOrderSandbox() {
  const sandbox = {
    URL,
    console,
    Date,
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    localStorage: {
      getItem: () => "",
      setItem: () => {},
      removeItem: () => {},
    },
    chrome: {
      runtime: {
        id: "unit-extension",
        getManifest: () => ({ name: "AudioFilms YouTube Shadowing", version: "0.0.0" }),
        getURL: (value) => `chrome-extension://unit-extension/${value}`,
      },
    },
    document: {
      documentElement: { dataset: {}, appendChild: () => {}, setAttribute: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({
        dataset: {},
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
        addEventListener: () => {},
      }),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    navigator: {},
    location: { href: "https://www.youtube.com/watch?v=unit" },
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    HTMLElement: class HTMLElement {},
    Element: class Element {},
    MouseEvent: class MouseEvent {},
  };
  sandbox.window = sandbox;
  return sandbox;
}

function createTestElement(tagName) {
  const classValues = new Set();
  const element = {
    tagName,
    className: "",
    textContent: "",
    title: "",
    type: "",
    hidden: false,
    dataset: {},
    attributes: {},
    listeners: {},
    style: {
      properties: {},
      setProperty(name, value) {
        this.properties[name] = String(value);
      },
    },
    children: [],
    classList: {
      values: classValues,
      add(value) {
        this.values.add(value);
      },
      remove(value) {
        this.values.delete(value);
      },
      toggle(value, force) {
        const active = force === undefined ? !this.values.has(value) : Boolean(force);
        if (active) this.values.add(value);
        else this.values.delete(value);
        return active;
      },
      contains(value) {
        return this.values.has(value);
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(name, listener, options) {
      this.listeners[name] = this.listeners[name] || [];
      this.listeners[name].push({ listener, options });
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(child) {
      this.children.push(child);
      return child;
    },
    remove() {
      this.removed = true;
    },
    insertAdjacentHTML(position, html) {
      this.children.push({ nodeType: 1, position, innerHTML: String(html) });
    },
    querySelector(selector) {
      return findTestElement(this, selector);
    },
    querySelectorAll(selector) {
      return findTestElements(this, selector);
    },
    getBoundingClientRect() {
      return { top: Number(this.rectTop) || 0, height: Number(this.rectHeight) || 0 };
    },
  };
  Object.defineProperty(element, "innerHTML", {
    get() {
      return this._innerHTML || "";
    },
    set(value) {
      this._innerHTML = String(value);
      this.children = [];
    },
  });
  Object.defineProperty(element, "childElementCount", {
    get() {
      return this.children.filter((child) => child && child.nodeType !== 3).length;
    },
  });
  return element;
}

function findTestElement(root, selector) {
  return findTestElements(root, selector)[0] || null;
}

function findTestElements(root, selector) {
  const results = [];
  const selectors = String(selector || "").split(",").map((value) => value.trim()).filter(Boolean);
  function visit(node) {
    if (!node || !Array.isArray(node.children)) return;
    if (selectors.some((item) => testElementMatches(node, item))) {
      results.push(node);
    }
    node.children.forEach(visit);
  }
  visit(root);
  return results;
}

function testElementMatches(element, selector) {
  const dataMatch = selector.match(/^\[data-([a-z0-9-]+)\]$/i);
  if (!dataMatch) return false;
  const datasetKey = dataMatch[1].replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
  return Object.hasOwn(element.dataset || {}, datasetKey);
}

function TestHTMLElement() {}
Object.defineProperty(TestHTMLElement, Symbol.hasInstance, {
  value(instance) {
    return Boolean(instance && Array.isArray(instance.children) && instance.classList);
  },
});

const testDocument = {
  createElement: createTestElement,
  createTextNode: (text) => ({ nodeType: 3, textContent: text }),
};

function assertSourceContentFacadeComposesSourceBoundary() {
  const sourceContentFacade = loadBrowserModule("src/sourceContentFacade.js", "__afShadowingSourceContentFacade");
  const calls = [];
  const transcriptController = {
    getSelectedPracticeSource: () => "selected-source",
    phrasesFromTranscriptResult: (result) => ({ from: "transcript", result }),
    fetchBestAvailableCues: (track, options) => ({ track, options }),
    normalizeTranscriptResult: (result, track) => ({ result, track }),
  };
  const timingController = {
    startImproveTiming: (text) => ({ action: "start", text }),
    applyTimingOperation: (operation) => ({ action: "apply", operation }),
    applyTimingOperationResultToActiveSource: (operation) => ({ action: "apply-active", operation }),
    scheduleTimingOperationPoll: (operation) => ({ action: "schedule", operation }),
    pollTimingOperation: (operationId) => ({ action: "poll", operationId }),
    clearTimingOperationPoll: () => "cleared",
    transcriptResultFromLoadedSource: (source) => ({ action: "loaded", source }),
    fetchReusableTimingTranscriptResult: (source, resultOverride) => ({ action: "reusable", source, resultOverride }),
    registerTimingOperationResultSources: (operation, options) => ({ action: "register", operation, options }),
  };
  const loadController = {
    refreshSelectedSourceCache: () => "refreshed",
    selectPracticeSource: (sourceId) => ({ action: "select", sourceId }),
    loadPracticeSource: (source, options) => ({ action: "load", source, options }),
    maybeSwitchToPreferredSource: (options) => ({ action: "switch", options }),
    holdInitialAutoPauseAfterSourceLoad: () => "held",
  };
  const sourceController = sourceContentFacade.createSourceController({
    getState: () => ({}),
    sourceTranscriptContentWorkflow: {
      createSourceTranscriptController: (deps) => {
        calls.push(["transcript", deps.maxWords, deps.maxCharacters]);
        return transcriptController;
      },
    },
    sourceTimingContentWorkflow: {
      createSourceTimingController: (deps) => {
        calls.push(["timing", deps.getSelectedPracticeSource(), deps.phrasesFromTranscriptResult({ id: "r1" }).from]);
        return timingController;
      },
    },
    sourceLoadContentWorkflow: {
      createSourceLoadController: (deps) => {
        calls.push(["load", deps.getSelectedPracticeSource(), deps.transcriptResultFromLoadedSource({ id: "s1" }).action]);
        return loadController;
      },
    },
    maxWords: 18,
    maxCharacters: 140,
  });

  assert.deepEqual(calls, [
    ["transcript", 18, 140],
    ["timing", "selected-source", "transcript"],
    ["load", "selected-source", "loaded"],
  ]);
  assert.equal(sourceController.refreshSelectedSourceCache(), "refreshed");
  assert.deepEqual(sourceController.startImproveTiming("manual"), { action: "start", text: "manual" });
  assert.deepEqual(sourceController.selectPracticeSource("source-2"), { action: "select", sourceId: "source-2" });
  assert.deepEqual(sourceController.fetchBestAvailableCues("track-1", { refresh: true }), {
    track: "track-1",
    options: { refresh: true },
  });
}

function assertPlaybackContentFacadeComposesPlaybackBoundary() {
  const playbackContentFacade = loadBrowserModule("src/playbackContentFacade.js", "__afShadowingPlaybackContentFacade");
  const calls = [];
  let playbackController;
  let passivePlaybackController;
  const controllers = playbackContentFacade.createPlaybackControllers({
    getState: () => ({}),
    playbackContentWorkflow: {
      createPlaybackController: (deps) => {
        calls.push(["playback", typeof deps.ensurePassivePlaybackWatcher]);
        playbackController = {
          jumpToPhrase: () => "jumped",
          syncPassivePlayback: (video) => ({ action: "sync", video }),
          startPassivePlaybackFrame: (video) => ({ action: "frame", video }),
        };
        passivePlaybackController = {
          ensurePassivePlaybackWatcher: () => "ensured",
        };
        return playbackController;
      },
    },
    passivePlaybackContentWorkflow: {
      createPassivePlaybackController: (deps) => {
        calls.push(["passive", deps.syncPassivePlayback("video-1").action, deps.startPassivePlaybackFrame("video-2").action]);
        return {
          ...passivePlaybackController,
          detachPassivePlaybackWatcher: () => "detached",
        };
      },
    },
  });

  assert.deepEqual(calls, [
    ["playback", "function"],
    ["passive", "sync", "frame"],
  ]);
  assert.equal(controllers.playbackController.jumpToPhrase(), "jumped");
  assert.equal(controllers.passivePlaybackController.ensurePassivePlaybackWatcher(), "ensured");
  assert.equal(controllers.passivePlaybackController.detachPassivePlaybackWatcher(), "detached");
}

function assertSupportContentFacadeComposesSupportBoundary() {
  const supportContentFacade = loadBrowserModule("src/supportContentFacade.js", "__afShadowingSupportContentFacade");
  const state = { issueCategory: "timing", backendBuildInfo: { commit: "backend-1" } };
  const commandClient = {
    sendRuntimeMessage: () => "runtime-message",
    fetchDictionarySession: () => "dictionary-session",
    postBackendJson: () => "backend-json",
  };
  const selectedWords = [];
  let commandOptions = null;
  let accountOptions = null;
  let issueOptions = null;
  let backendOptions = null;
  const supportControllers = supportContentFacade.createSupportControllers({
    getState: () => state,
    extensionCommandClient: {
      createExtensionCommandClient: (options) => {
        commandOptions = options;
        return commandClient;
      },
    },
    accountSessionWorkflow: {
      createAccountSessionWorkflow: (options) => {
        accountOptions = options;
        return { sync: () => "synced" };
      },
    },
    issueReportWorkflow: {
      createIssueReportWorkflow: (options) => {
        issueOptions = options;
        return { open: () => "opened" };
      },
      sendIssueReportPayload: (payload, options) => ({ payload, options }),
    },
    backendBuildWorkflow: {
      refreshBackendBuildInfo: (options) => {
        backendOptions = options;
        return "refreshed";
      },
    },
    chrome: {},
    fetch: () => {},
    storage: {},
    document: {},
    dictionaryCommands: {},
    dictionaryMocks: {},
    backendCommands: {},
    issueReports: {},
    accountSession: {},
    dictionaryEndpoint: () => "https://dict.test",
    apiBaseForBackendCommands: () => "https://api.test",
    selectLookupWord: (word, phraseIndex) => selectedWords.push([word, phraseIndex]),
    formatIssueReport: () => "report",
    extensionVersion: () => "0.1.7",
    extensionBuildInfo: () => ({ contentScriptRevision: "rev-1" }),
    browserUserAgent: "UnitBrowser",
    recordDebugEvent: () => {},
    render: () => {},
    copyIssueReport: () => {},
    setTimeout: () => 0,
  });

  assert.equal(commandOptions.getIssueCategory(), "timing");
  assert.equal(accountOptions.sendRuntimeMessage, commandClient.sendRuntimeMessage);
  assert.equal(accountOptions.fetchDictionarySession, commandClient.fetchDictionarySession);
  accountOptions.onLookupRefresh({ word: "bouwen", phraseIndex: 2 });
  assert.deepEqual(selectedWords, [["bouwen", 2]]);
  const issuePayloadResult = issueOptions.sendIssueReportPayload({ report: "unit" });
  assert.equal(issuePayloadResult.options.postBackendJson, commandClient.postBackendJson);
  assert.deepEqual(issuePayloadResult.options.backendBuildInfo, { commit: "backend-1" });
  assert.equal(issuePayloadResult.options.browserUserAgent, "UnitBrowser");
  assert.equal(supportControllers.refreshBackendBuildInfo(), "refreshed");
  assert.equal(backendOptions.getState(), state);
  assert.equal(supportControllers.commandClient, commandClient);
  assert.equal(supportControllers.accountSessionWorkflow.sync(), "synced");
  assert.equal(supportControllers.issueReportWorkflow.open(), "opened");
}

async function assertDictionaryOperationsContentFacadeOwnsDictionaryBoundary() {
  const dictionaryOperationsFacade = loadBrowserModule(
    "src/dictionaryOperationsContentFacade.js",
    "__afShadowingDictionaryOperationsContentFacade",
  );
  const events = [];
  const state = {
    accountStatus: "signed-in",
    selectedSpan: { phraseIndex: 0, text: "kleine rode ster" },
    selectedWord: { lookupSeq: 7, word: "klein" },
    phrases: [{ text: "een kleine rode ster" }],
    currentIndex: 0,
    videoId: "video-1",
    selectedSourceId: "source-1",
    selectedTrack: { id: "track-1" },
    transcriptResult: { language: "nl" },
    visibleTranslationsByCardId: {},
    audioPendingByCardId: {},
    cardActionFeedbackByCardId: {},
  };
  const modules = {
    selectedSpanWorkflowApi: {
      saveSelectedSpanCard: async (span, options) => {
        events.push(["span-save", options.accountStatus, options.buildPayload(span).ok]);
        events.push(["span-context", options.sourceContext(span, "entry-1", "start-learning").action]);
      },
      selectedSpanSourceContext: (_span, options) => ({ action: options.action, entryId: options.entryId }),
      selectedSpanSourceBinding: () => ({ binding: true }),
    },
    selectedSpanApi: {
      selectedSpanGeneratedEntryPayload: (payload) => ({ ok: true, value: payload }),
    },
    phraseTranslationApi: {
      sourceLanguageCode: () => "nl",
    },
    generatedEntryApi: {
      generatedDraftPayload: () => ({ candidateId: "draft-1" }),
      generatedEntryPayloadFromSelection: () => ({ ok: true, value: { draft: true } }),
      generatedEntrySourceContext: ({ buildSourceContext }) => buildSourceContext({ binding: true }, { id: "card-1" }, "start-learning"),
      generatedDraftItemFromOverlayCard: () => ({ draft: true }),
    },
    dictionaryOverlayWorkflowApi: {
      renderCardActionMenu: () => "menu",
      performDisplayAction: (_card, _displayAction, options) => options.performDictionaryCardAction({ entryId: "entry-1" }, {}, { action: "start-learning" }),
    },
    dictionaryDomApi: {},
    issueReportsApi: {},
    dictionaryAudioApi: {
      cardAudioPlayable: () => true,
      audioPendingState: (_current, cardId, pending) => ({ [cardId]: pending }),
    },
    dictionaryAudioWorkflowApi: {
      playHeadwordAudio: async (_card, options) => {
        events.push(["audio-title", options.titleForCard({ title: "kop" })]);
        options.setPending("card-1", true);
      },
      resolveHeadwordAudioUrl: async () => "audio-url",
    },
    dictionaryPresentationApi: {
      overlayTitle: (card) => card.title || "",
      visibleCardTranslation: () => "visible",
      cardTranslationsVisible: () => true,
      cardHasLookupTranslations: () => true,
      cardCanRequestTranslation: () => true,
      lookupOrOverlayHeadword: () => "headword",
      lookupOrOverlayDefinition: () => "definition",
      lookupOrOverlaySection: () => "section",
    },
    dictionaryActionWorkflowApi: {
      performDictionaryCardAction: async (_card, _displayAction, _actionPayload, options) => {
        events.push(["action-payload", options.buildPayload(state.selectedWord, { entryId: "entry-1" }, { action: "start-learning" }).ok]);
        options.setCardFeedback("card-1", { state: "pending" });
      },
    },
    dictionaryActionApi: {
      frozenDictionaryActionPayload: () => ({ ok: true, value: { action: "start-learning" } }),
    },
    generatedEntryWorkflowApi: {
      generateDictionaryDraft: async (_selectedWord, options) => {
        events.push(["generated-payload", options.buildPayload(state.selectedWord).ok]);
      },
      saveGeneratedDictionaryDraft: async () => {},
    },
    sourceBindingApi: {
      createDictionarySourceBinding: (payload) => ({ phraseIndex: payload.phraseIndex, sourceId: payload.selectedSourceId }),
      buildDictionaryActionSourceContext: ({ action, observation, clientVersion }) => ({ action, title: observation.title, clientVersion }),
    },
    dictionaryCommandTransportApi: {
      dictionaryLookupEndpoint: () => "https://dict.test",
      fetchDictionaryResult: async (_request, options) => {
        events.push(["fetch-endpoint", options.endpoint]);
        return { ok: true };
      },
      fetchDictionarySearchResult: async () => ({ ok: true }),
      postDictionaryCommand: async (operation, _payload, options) => {
        events.push(["post", operation, options.endpoint]);
        return { ok: true };
      },
    },
  };
  const controller = dictionaryOperationsFacade.createDictionaryOperationsController({
    getState: () => state,
    modules,
    environment: {
      document: { title: "Unit Video - YouTube" },
      config: {},
      AudioConstructor: function AudioConstructor() {},
    },
    commands: {
      render: () => events.push(["render"]),
      getSelectedPracticeSource: () => ({ id: "source-1" }),
      getVideoElement: () => ({ currentTime: 12.345 }),
      extensionVersion: () => "0.1.7",
      describePhraseAtIndex: () => "phrase",
      openIssueReportDialog: () => {},
      recordDebugEvent: () => {},
      createMutationTurnId: () => "turn-1",
      requestDictionaryCommand: () => ({ ok: true }),
      lookupSelectedWord: () => {},
      connectAccount: () => events.push(["connect"]),
      disconnectAccount: () => events.push(["disconnect"]),
      toggleCardTranslation: () => events.push(["toggle-translation"]),
    },
  });

  await controller.saveSelectedSpanCard(state.selectedSpan);
  await controller.generateDictionaryDraft(state.selectedWord);
  await controller.playHeadwordAudio({ id: "card-1", title: "kop" });
  await controller.performDisplayAction({ entryId: "entry-1" }, { command: { kind: "display-action" } });
  await controller.fetchDictionaryResult({ word: "klein" });
  await controller.postDictionaryCommand("dict-action", { action: "start-learning" });
  assert.deepEqual(controller.createDictionarySourceBinding("klein", 0).sourceId, "source-1");
  assert.equal(controller.cardAudioPlayable({}), true);
  assert.equal(controller.cardTranslationsVisible({}), true);
  assert.equal(JSON.stringify(state.audioPendingByCardId), JSON.stringify({ "card-1": true }));
  assert.equal(JSON.stringify(state.cardActionFeedbackByCardId), JSON.stringify({ "card-1": { state: "pending" } }));
  assert.ok(events.some((event) => event[0] === "span-context" && event[1] === "start-learning"));
  assert.ok(events.some((event) => event[0] === "fetch-endpoint" && event[1] === "https://dict.test"));
  assert.ok(events.some((event) => event[0] === "post" && event[1] === "dict-action"));
}

function assertSurfaceContentFacadeComposesTypedCommands() {
  const surfaceContentFacade = loadBrowserModule("src/surfaceContentFacade.js", "__afShadowingSurfaceContentFacade");
  const captured = {};
  const modules = {
    ribbonPanelContentWorkflowApi: {
      createRibbonPanelController: (options) => {
        captured.ribbonPanel = options;
        return { createRibbonPanel: () => "ribbon" };
      },
    },
    panelLayoutContentWorkflowApi: {
      createPanelLayoutController: (options) => {
        captured.panelLayout = options;
        return { mount: () => "layout" };
      },
    },
    diagnosticsContentWorkflowApi: {
      createDiagnosticsController: (options) => {
        captured.diagnostics = options;
        return { copyDebug: () => "diagnostics" };
      },
    },
    keyboardContentWorkflowApi: {
      createKeyboardController: (options) => {
        captured.keyboard = options;
        return { attach: () => "keyboard" };
      },
    },
    displayStateContentWorkflowApi: {
      createDisplayStateController: (options) => {
        captured.displayState = options;
        return { update: () => "display" };
      },
    },
    ribbonContentWorkflowApi: {
      createRibbonContentController: (options) => {
        captured.ribbonContent = options;
        return { appendPhraseRow: () => "row" };
      },
    },
    workspaceDomApi: {},
    ribbonControlsApi: {},
    ribbonPanelFactoryApi: {},
    panelLayoutWorkflowApi: {},
    panelLayoutApi: {},
    panelLayoutDomApi: {},
    displayPreferencesApi: {},
    diagnosticsWorkflowApi: {},
    diagnosticsFormatWorkflowApi: {},
    diagnosticsReportApi: {},
    issueReportsApi: {},
    captionTrackApi: {},
    transcriptMetadataApi: {},
    keyboardWorkflowApi: {},
    youtubeAdapterApi: { isWatchPage: () => true },
    keyboardShortcutApi: {},
    displayPreferenceWorkflowApi: {},
    uiStateWorkflowApi: {},
    menuStateApi: {},
    playbackSessionApi: {},
    sourceSelectorWorkflowApi: {},
    sourceSelectorApi: {},
    sourceSelectorDomApi: {},
    sourceReadinessApi: {},
    sourceLabelsApi: {},
    phraseRowsWorkflowApi: {},
    phraseRowsApi: {},
    phraseRowsDomApi: {},
    selectedSpanWorkflowApi: {},
    selectedSpanApi: {},
    domUtilsApi: { clearElement: () => "cleared" },
  };
  const action = (name) => () => name;
  const controllers = surfaceContentFacade.createSurfaceControllers({
    getState: () => ({}),
    modules,
    iconSvg: "<svg>",
    bugIconSvg: "<bug>",
    issueReportWorkflow: {},
    extensionBuildInfo: { revision: "unit" },
    playbackRateOptions: [1],
    constants: { issueReportCategories: [], playbackRateStep: 0.25 },
    ids: { rootId: "root", ribbonPanelId: "ribbon", dictionaryPanelId: "dictionary" },
    environment: { document: {}, window: {}, navigator: {}, HTMLElement: class {}, Element: class {}, requestAnimationFrame: () => 0 },
    getPanelGestureFallbackInstalled: () => false,
    setPanelGestureFallbackInstalled: () => {},
    getViewportLayoutFrame: () => 0,
    setViewportLayoutFrame: () => {},
    commands: {
      render: action("render"),
      account: {
        toggleAccountMenu: action("toggle-account"),
        connectAccount: action("connect-account"),
        disconnectAccount: action("disconnect-account"),
      },
      diagnostics: {
        toggleDebug: action("toggle-debug"),
        copyDebug: action("copy-debug"),
        clearDiagnostics: action("clear-diagnostics"),
        publishDiagnosticsSnapshot: action("publish-diagnostics"),
        copyTextWithFallback: action("copy-text"),
        recordDebugEvent: action("record-debug"),
      },
      dictionary: {
        applySpanSelectionDraftPreview: action("apply-preview"),
        clearSpanSelectionDraft: action("clear-span"),
        selectLookupWord: action("select-word"),
        handleWordReplayGesture: action("replay-word"),
      },
      display: {
        updateDisplayPreferences: action("update-display"),
        cycleThemePreference: action("cycle-theme"),
        toggleSettingsMenu: action("toggle-settings"),
        toggleShortcutHelp: action("toggle-shortcuts"),
        toggleUtilityMenu: action("toggle-utility"),
        adjustLearnerTextScale: action("text-scale"),
        resetLearnerTextScale: action("reset-text-scale"),
        adjustPanelBackgroundAlpha: action("alpha"),
        resetPanelBackgroundAlpha: action("reset-alpha"),
        closeOpenMenus: action("close-menus"),
      },
      issue: {
        openIssueReportDialog: action("open-issue"),
        submitPhraseBoundaryIssue: action("submit-boundary"),
        closeIssueReportDialog: action("close-issue"),
        submitIssueReport: action("submit-issue"),
        copyCurrentIssueReport: action("copy-issue"),
      },
      layout: {
        bringDebugPanelBehindFromPanel: action("behind"),
        toggleLayoutLock: action("lock"),
        resetPanelLayout: action("reset-layout"),
        beginPanelDrag: action("drag"),
        beginPanelResize: action("resize"),
      },
      navigation: {
        togglePhraseJumpMenu: action("jump-menu"),
        jumpToPhrase: action("jump"),
        submitPhraseJump: action("submit-jump"),
      },
      playback: {
        getVideoElement: action("video"),
        describePhraseAtIndex: action("describe"),
        roundTime: action("round"),
        previousPhrase: action("previous"),
        replayCurrentPhrase: action("replay"),
        toggleText: action("text"),
        nextPhrase: action("next"),
        setPracticeMode: action("mode"),
        toggleAutoPause: action("auto-pause"),
        adjustSlowReplaySpeed: action("slow"),
        adjustVideoPlaybackRate: action("rate"),
        toggleContinuousPlayback: action("continuous"),
        playbackEndMsForPhrase: action("end"),
      },
      source: {
        getSelectedPracticeSource: action("selected-source"),
        practiceReadiness: action("readiness"),
        timingOperationState: action("timing"),
        userFacingSourceLabel: action("label"),
        refreshSelectedSourceCache: action("refresh-source"),
        startImproveTiming: action("improve"),
        selectPracticeSource: action("select-source"),
        toggleSourceMenu: action("source-menu"),
      },
      translation: {
        phraseTranslationState: action("translation-state"),
        togglePhraseTranslation: action("toggle-translation"),
        requestSelectedSpanTranslation: action("span-translation"),
      },
    },
  });

  assert.equal(controllers.ribbonPanelController.createRibbonPanel(), "ribbon");
  assert.equal(captured.ribbonPanel.nextPhrase(), "next");
  assert.equal(captured.ribbonPanel.connectAccount(), "connect-account");
  assert.equal(captured.keyboard.clearSpanSelectionDraft(), "clear-span");
  assert.equal(captured.displayState.updateDisplayPreferences(), "update-display");
  assert.equal(captured.ribbonContent.requestSelectedSpanTranslation(), "span-translation");
  assert.equal(captured.ribbonContent.clearElement(), "cleared");
}

function assertLearningBoundaryTermsStayOutOfContentScript() {
  const contentSource = fs.readFileSync(path.join(extensionRoot, "src/content.js"), "utf8");
  const boundaryTerms = [
    "af-connect-2000nl",
    "af-disconnect-2000nl",
    "af-get-2000nl-session",
    "start-learning",
    "mark-known",
    "mark-unknown",
    "review-card",
    "record-view",
    "save-and-start-learning",
    "includeUserState",
    "Bearer",
  ];
  for (const term of boundaryTerms) {
    assert.equal(contentSource.includes(term), false, `content.js must not own 2000NL boundary term ${term}`);
  }
}

assertManifestOrderRegistersContentNamespaces();
assertSourceContentFacadeComposesSourceBoundary();
assertPlaybackContentFacadeComposesPlaybackBoundary();
assertSupportContentFacadeComposesSupportBoundary();
await assertDictionaryOperationsContentFacadeOwnsDictionaryBoundary();
assertSurfaceContentFacadeComposesTypedCommands();
assertLearningBoundaryTermsStayOutOfContentScript();
const shadowCssSource = fs.readFileSync(path.join(extensionRoot, "src/shadow.css"), "utf8");
assert.match(shadowCssSource, /:host\(\[data-af-theme="dark"\]\)[\s\S]*--af-bg-alpha:/);
assert.match(shadowCssSource, /:host\(\[data-af-theme="system"\]\)[\s\S]*--af-bg-alpha:/);
assert.match(shadowCssSource, /:host\(\[data-af-theme="light"\]\)[\s\S]*--af-bg-alpha:/);

const phraseTokens = loadBrowserModule("src/phraseTokens.js", "__afShadowingPhraseTokens");
const bootState = loadBrowserModule("src/bootState.js", "__afShadowingBootState");
const formatUtils = loadBrowserModule("src/formatUtils.js", "__afShadowingFormatUtils");
const displayPreferences = loadBrowserModule("src/displayPreferences.js", "__afShadowingDisplayPreferences");
const displayPreferenceStorage = loadBrowserModule("src/displayPreferenceStorage.js", "__afShadowingDisplayPreferenceStorage");
const storageState = loadBrowserModule("src/storageState.js", "__afShadowingStorageState");
const menuState = loadBrowserModule("src/menuState.js", "__afShadowingMenuState");
const phraseJumpWorkflow = loadBrowserModule("src/phraseJumpWorkflow.js", "__afShadowingPhraseJumpWorkflow");
const keyboardShortcuts = loadBrowserModule("src/keyboardShortcuts.js", "__afShadowingKeyboardShortcuts");
const keyboardWorkflow = loadBrowserModule("src/keyboardWorkflow.js", "__afShadowingKeyboardWorkflow");
const scrollContainment = loadBrowserModule("src/scrollContainment.js", "__afShadowingScrollContainment");
const domUtils = loadBrowserModule("src/domUtils.js", "__afShadowingDomUtils", {
  getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
});
const uiIcons = loadBrowserModule("src/uiIcons.js", "__afShadowingUiIcons");
const uiStateWorkflow = loadBrowserModule("src/uiStateWorkflow.js", "__afShadowingUiStateWorkflow");
const fallbacks = loadBrowserModule("src/fallbacks.js", "__afShadowingFallbacks");
const ribbonControls = loadBrowserModule("src/ribbonControls.js", "__afShadowingRibbonControls", {
  __afShadowingUiIcons: uiIcons,
  __afShadowingFormatUtils: formatUtils,
});
const phrases = loadBrowserModule("src/phrases.js", "__afShadowingPhrases");
const sourceLabels = loadBrowserModule("src/sourceLabels.js", "__afShadowingSourceLabels");
const sourceSelection = loadBrowserModule("src/sourceSelection.js", "__afShadowingSourceSelection");
const sourceSelectionStorage = loadBrowserModule("src/sourceSelectionStorage.js", "__afShadowingSourceSelectionStorage");
const sourceReadiness = loadBrowserModule("src/sourceReadiness.js", "__afShadowingSourceReadiness");
const videoLoadState = loadBrowserModule("src/videoLoadState.js", "__afShadowingVideoLoadState");
const sourceSelector = loadBrowserModule("src/sourceSelector.js", "__afShadowingSourceSelector");
const sourceSelectorDom = loadBrowserModule("src/sourceSelectorDom.js", "__afShadowingSourceSelectorDom", {
  document: testDocument,
});
const sourceSelectorWorkflow = loadBrowserModule("src/sourceSelectorWorkflow.js", "__afShadowingSourceSelectorWorkflow");
const playerMetadataWorkflow = loadBrowserModule("src/playerMetadataWorkflow.js", "__afShadowingPlayerMetadataWorkflow");
const sourceBinding = loadBrowserModule("src/sourceBinding.js", "__afShadowingSourceBinding");
const phraseProgress = loadBrowserModule("src/phraseProgress.js", "__afShadowingPhraseProgress");
const phraseProgressStorage = loadBrowserModule("src/phraseProgressStorage.js", "__afShadowingPhraseProgressStorage");
const dictionaryActions = loadBrowserModule("src/dictionaryActions.js", "__afShadowingDictionaryActions");
const dictionaryActionWorkflow = loadBrowserModule("src/dictionaryActionWorkflow.js", "__afShadowingDictionaryActionWorkflow", {
  __afShadowingDictionaryActions: dictionaryActions,
});
const dictionaryState = loadBrowserModule("src/dictionaryState.js", "__afShadowingDictionaryState");
const dictionaryAudio = loadBrowserModule("src/dictionaryAudio.js", "__afShadowingDictionaryAudio");
const dictionaryAudioWorkflow = loadBrowserModule("src/dictionaryAudioWorkflow.js", "__afShadowingDictionaryAudioWorkflow", {
  __afShadowingDictionaryAudio: dictionaryAudio,
});
const dictionaryMocks = loadBrowserModule("src/dictionaryMocks.js", "__afShadowingDictionaryMocks");
const dictionaryPresentation = loadBrowserModule("src/dictionaryPresentation.js", "__afShadowingDictionaryPresentation");
const dictionaryDom = loadBrowserModule("src/dictionaryDom.js", "__afShadowingDictionaryDom", {
  __afShadowingDictionaryPresentation: dictionaryPresentation,
  document: testDocument,
});
const dictionaryOverlayWorkflow = loadBrowserModule("src/dictionaryOverlayWorkflow.js", "__afShadowingDictionaryOverlayWorkflow");
const dictionaryPanelWorkflow = loadBrowserModule("src/dictionaryPanelWorkflow.js", "__afShadowingDictionaryPanelWorkflow");
const dictionarySearchDom = loadBrowserModule("src/dictionarySearchDom.js", "__afShadowingDictionarySearchDom", {
  __afShadowingDictionaryPresentation: dictionaryPresentation,
  __afShadowingDictionaryDom: dictionaryDom,
  document: testDocument,
});
const dictionarySearchWorkflow = loadBrowserModule("src/dictionarySearchWorkflow.js", "__afShadowingDictionarySearchWorkflow");
const dictionaryRenderWorkflow = loadBrowserModule("src/dictionaryRenderWorkflow.js", "__afShadowingDictionaryRenderWorkflow");
const workspaceDom = loadBrowserModule("src/workspaceDom.js", "__afShadowingWorkspaceDom", {
  document: testDocument,
});
const workspaceWorkflow = loadBrowserModule("src/workspaceWorkflow.js", "__afShadowingWorkspaceWorkflow");
const workspaceContentWorkflow = loadBrowserModule("src/workspaceContentWorkflow.js", "__afShadowingWorkspaceContentWorkflow");
const ribbonDom = loadBrowserModule("src/ribbonDom.js", "__afShadowingRibbonDom", {
  document: testDocument,
  HTMLElement: TestHTMLElement,
  window: { requestAnimationFrame: (callback) => callback() },
});
const ribbonPanelDom = loadBrowserModule("src/ribbonPanelDom.js", "__afShadowingRibbonPanelDom");
const ribbonPanelFactory = loadBrowserModule("src/ribbonPanelFactory.js", "__afShadowingRibbonPanelFactory");
const ribbonWorkflow = loadBrowserModule("src/ribbonWorkflow.js", "__afShadowingRibbonWorkflow");
const dictionaryCommands = loadBrowserModule("src/dictionaryCommands.js", "__afShadowingDictionaryCommands");
const dictionaryCommandTransport = loadBrowserModule("src/dictionaryCommandTransport.js", "__afShadowingDictionaryCommandTransport", {
  __afShadowingDictionaryCommands: dictionaryCommands,
});
const dictionaryLookupWorkflow = loadBrowserModule("src/dictionaryLookupWorkflow.js", "__afShadowingDictionaryLookupWorkflow");
const accountSession = loadBrowserModule("src/accountSession.js", "__afShadowingAccountSession");
const accountSessionWorkflow = loadBrowserModule("src/accountSessionWorkflow.js", "__afShadowingAccountSessionWorkflow");
const accountSessionDom = loadBrowserModule("src/accountSessionDom.js", "__afShadowingAccountSessionDom", {
  document: testDocument,
});
const backendCommands = loadBrowserModule("src/backendCommands.js", "__afShadowingBackendCommands");
const backendBuildWorkflow = loadBrowserModule("src/backendBuildWorkflow.js", "__afShadowingBackendBuildWorkflow");
const extensionCommandClient = loadBrowserModule("src/extensionCommandClient.js", "__afShadowingExtensionCommandClient");
const generatedEntries = loadBrowserModule("src/generatedEntries.js", "__afShadowingGeneratedEntries");
const generatedEntryWorkflow = loadBrowserModule("src/generatedEntryWorkflow.js", "__afShadowingGeneratedEntryWorkflow", {
  __afShadowingGeneratedEntries: generatedEntries,
});
const phraseTranslations = loadBrowserModule("src/phraseTranslations.js", "__afShadowingPhraseTranslations");
const phraseTranslationWorkflow = loadBrowserModule("src/phraseTranslationWorkflow.js", "__afShadowingPhraseTranslationWorkflow");
const phraseRows = loadBrowserModule("src/phraseRows.js", "__afShadowingPhraseRows", {
  __afShadowingPhraseTranslations: phraseTranslations,
  __afShadowingFormatUtils: formatUtils,
  __afShadowingPhraseTokens: phraseTokens,
});
const phraseRowsDom = loadBrowserModule("src/phraseRowsDom.js", "__afShadowingPhraseRowsDom", {
  __afShadowingPhraseRows: phraseRows,
  document: testDocument,
});
const phraseRowsWorkflow = loadBrowserModule("src/phraseRowsWorkflow.js", "__afShadowingPhraseRowsWorkflow");
const selectedSpans = loadBrowserModule("src/selectedSpans.js", "__afShadowingSelectedSpans", {
  __afShadowingPhraseTokens: phraseTokens,
  __afShadowingPhraseTranslations: phraseTranslations,
  __afShadowingSourceBinding: sourceBinding,
});
const selectedSpanWorkflow = loadBrowserModule("src/selectedSpanWorkflow.js", "__afShadowingSelectedSpanWorkflow", {
  __afShadowingGeneratedEntries: generatedEntries,
});
const selectedSpansDom = loadBrowserModule("src/selectedSpansDom.js", "__afShadowingSelectedSpansDom", {
  document: testDocument,
});
const playbackSession = loadBrowserModule("src/playbackSession.js", "__afShadowingPlaybackSession");
const displayPreferenceWorkflow = loadBrowserModule("src/displayPreferenceWorkflow.js", "__afShadowingDisplayPreferenceWorkflow");
const playbackTiming = loadBrowserModule("src/playbackTiming.js", "__afShadowingPlaybackTiming");
const playbackWorkflow = loadBrowserModule("src/playbackWorkflow.js", "__afShadowingPlaybackWorkflow");
const passivePlaybackWatcher = loadBrowserModule("src/passivePlaybackWatcher.js", "__afShadowingPassivePlaybackWatcher");
const panelLayout = loadBrowserModule("src/panelLayout.js", "__afShadowingPanelLayout");
const panelLayoutDom = loadBrowserModule("src/panelLayoutDom.js", "__afShadowingPanelLayoutDom", {
  __afShadowingPanelLayout: panelLayout,
  __afShadowingFormatUtils: formatUtils,
  HTMLElement: TestHTMLElement,
  innerWidth: 800,
  innerHeight: 600,
});
const panelLayoutWorkflow = loadBrowserModule("src/panelLayoutWorkflow.js", "__afShadowingPanelLayoutWorkflow");
const issueReports = loadBrowserModule("src/issueReports.js", "__afShadowingIssueReports");
const issueReportWorkflow = loadBrowserModule("src/issueReportWorkflow.js", "__afShadowingIssueReportWorkflow");
const issueReportsDom = loadBrowserModule("src/issueReportsDom.js", "__afShadowingIssueReportsDom", {
  HTMLElement: TestHTMLElement,
});
const transcriptMetadata = loadBrowserModule("src/transcriptMetadata.js", "__afShadowingTranscriptMetadata", {
  __afShadowingPhrases: phrases,
});
const sourceTranscriptWorkflow = loadBrowserModule("src/sourceTranscriptWorkflow.js", "__afShadowingSourceTranscriptWorkflow");
const transcriptPanelDom = loadBrowserModule("src/transcriptPanelDom.js", "__afShadowingTranscriptPanelDom", {
  HTMLElement: TestHTMLElement,
});
const sourceTimingWorkflow = loadBrowserModule("src/sourceTimingWorkflow.js", "__afShadowingSourceTimingWorkflow");
const sourceLoadWorkflow = loadBrowserModule("src/sourceLoadWorkflow.js", "__afShadowingSourceLoadWorkflow");
const videoInitWorkflow = loadBrowserModule("src/videoInitWorkflow.js", "__afShadowingVideoInitWorkflow");
const diagnosticsReport = loadBrowserModule("src/diagnosticsReport.js", "__afShadowingDiagnosticsReport");
const diagnosticsState = loadBrowserModule("src/diagnosticsState.js", "__afShadowingDiagnosticsState");
const diagnosticsFormatWorkflow = loadBrowserModule("src/diagnosticsFormatWorkflow.js", "__afShadowingDiagnosticsFormatWorkflow");
const diagnosticsDom = loadBrowserModule("src/diagnosticsDom.js", "__afShadowingDiagnosticsDom", {
  HTMLElement: TestHTMLElement,
});
const diagnosticsWorkflow = loadBrowserModule("src/diagnosticsWorkflow.js", "__afShadowingDiagnosticsWorkflow");

assert.equal(phraseTokens.normalizeLookupWord("'m"), "'m");
assert.equal(phraseTokens.normalizeLookupWord("‘m"), "‘m");
assert.equal(phraseTokens.normalizeLookupWord("erbij."), "erbij");
const bootConfig = bootState.createBootConfig({
  issueReports: { issueReportCategories: () => ["navigation", "timing"] },
});
assert.equal(bootConfig.RIBBON_PANEL_ID, "af-shadowing-ribbon-panel");
assert.equal(bootConfig.displayPreferenceStorageKeys.displayPreferences, "afShadowingDisplayPreferences");
assert.equal(bootConfig.ISSUE_REPORT_CATEGORIES[1], "timing");
const initialBootState = bootState.createInitialState({
  bootDiagnostics: { status: "started" },
  contentScriptRevision: "unit-revision",
  initialDisplayPreferences: {
    enabled: true,
    autoPause: false,
    examplesExpanded: true,
    theme: "dark",
  },
});
assert.equal(initialBootState.learningEnabled, true);
assert.equal(initialBootState.autoPause, false);
assert.equal(initialBootState.examplesExpanded, true);
assert.equal(initialBootState.themePreference, "dark");
assert.equal(initialBootState.contentScriptRevision, "unit-revision");
assert.equal(formatUtils.clampNumber(5, 1, 4, 2), 4);
assert.equal(formatUtils.clampNumber(Number.NaN, 1, 4, 2), 2);
assert.equal(formatUtils.formatPlaybackRate(0.755), "0.76x");
assert.equal(formatUtils.formatTimestamp(3723000), "1:02:03");
assert.equal(formatUtils.wordsEqual("café", "cafe"), false);
assert.equal(formatUtils.wordsEqual("Hoog", "hoog"), true);

const displayControlState = displayPreferences.displayPreferenceControlState({
  preferences: {
    appearance: { learnerTextScale: 1.35, panelBackgroundAlpha: 0.65 },
    playback: { slowReplaySpeed: 2 },
    layout: { locked: false },
  },
  autoPause: false,
  hasCustomPanelLayout: true,
});
assert.equal(displayControlState.learnerText.percent, 135);
assert.equal(displayControlState.learnerText.largerDisabled, true);
assert.equal(displayControlState.learnerText.smallerTitle, "Subtitle text size: 135%");
assert.equal(displayControlState.panelBackground.percent, 65);
assert.equal(displayControlState.panelBackground.lowerDisabled, true);
assert.equal(displayControlState.autoPause.text, "Auto-pause Off");
assert.equal(displayControlState.slowReplay.fasterDisabled, true);
assert.equal(displayControlState.layout.lockText, "Lock");
assert.equal(displayControlState.layout.resetDisabled, false);
assert.equal(displayPreferences.nextThemePreference("system"), "light");
assert.equal(displayPreferences.nextThemePreference("dark"), "system");
assert.equal(displayPreferences.withThemePreference({}, "dark").theme, "dark");
assert.equal(displayPreferences.withLearnerTextScaleDelta({ appearance: { learnerTextScale: 1.34 } }, 0.2).appearance.learnerTextScale, 1.35);
assert.equal(displayPreferences.withLearnerTextScaleReset({ appearance: { learnerTextScale: 1.2 } }).appearance.learnerTextScale, 1);
assert.equal(displayPreferences.withPanelBackgroundAlphaDelta({ appearance: { panelBackgroundAlpha: 0.7 } }, -0.2).appearance.panelBackgroundAlpha, 0.65);
assert.equal(displayPreferences.withPanelBackgroundAlphaReset({ appearance: { panelBackgroundAlpha: 0.7 } }).appearance.panelBackgroundAlpha, 0.92);
assert.equal(displayPreferences.withSlowReplaySpeedDelta({ playback: { slowReplaySpeed: 1.95 } }, 0.2).playback.slowReplaySpeed, 2);
assert.equal(displayPreferences.withExamplesExpanded({}, true).examplesExpanded, true);
const storageFixture = new Map([
  ["afShadowingLearningEnabled", "false"],
  ["afDictionaryExamplesExpanded", "true"],
  ["afShadowingTheme", "dark"],
  ["afShadowingSourceSelection:video-1", JSON.stringify({
    videoId: "video-1",
    sourceId: "source-1",
    sourceKind: "manual",
    languageCode: "nl",
    textSourceKind: "provided-captions",
    updatedAt: "2026-06-30T10:00:00.000Z",
  })],
  ["afShadowingSourceSelection:bad-json", "{"],
]);
const storageAdapter = {
  getItem: (key) => storageFixture.get(key) ?? null,
};
const initialDisplayPreferences = storageState.readInitialDisplayPreferences({
  storage: storageAdapter,
  keys: {
    learningEnabled: "afShadowingLearningEnabled",
    examplesExpanded: "afDictionaryExamplesExpanded",
    theme: "afShadowingTheme",
  },
  normalizeDisplayPreferences: displayPreferences.normalizeDisplayPreferences,
});
assert.equal(initialDisplayPreferences.enabled, false);
assert.equal(initialDisplayPreferences.examplesExpanded, true);
assert.equal(initialDisplayPreferences.theme, "dark");
assert.equal(storageState.sourceSelectionKey({ storageKey: "afShadowingSourceSelection", videoId: "video-1" }), "afShadowingSourceSelection:video-1");
const storedSourceSelection = storageState.readStoredSourceSelection({
  storage: storageAdapter,
  storageKey: "afShadowingSourceSelection",
  videoId: "video-1",
});
assert.equal(storedSourceSelection.sourceId, "source-1");
assert.equal(storedSourceSelection.textSourceKind, "provided-captions");
assert.equal(storageState.readStoredSourceSelection({
  storage: storageAdapter,
  storageKey: "afShadowingSourceSelection",
  videoId: "bad-json",
}), null);
const sourceSelectionSnapshot = storageState.sourceSelectionSnapshot({
  videoId: "video-1",
  source: {
    id: "source-2",
    languageCode: "nl",
    loadedTranscriptResult: { practiceSnapshot: { textSource: { kind: "asr" } } },
  },
  sourceKind: "asr",
  now: new Date("2026-06-30T10:00:00.000Z"),
});
assert.equal(sourceSelectionSnapshot.sourceId, "source-2");
assert.equal(sourceSelectionSnapshot.textSourceKind, "asr");
assert.equal(sourceSelectionSnapshot.updatedAt, "2026-06-30T10:00:00.000Z");
const sourceSelectionStorageFixture = new Map();
const sourceSelectionStorageEvents = [];
const sourceSelectionStorageState = { videoId: "video-1" };
const sourceSelectionStorageSources = [
  { id: "nl:manual", index: 0, name: "Dutch", languageCode: "nl", track: { kind: "manual" } },
  {
    id: "nl:asr",
    index: 1,
    name: "ASR transcript",
    languageCode: "nl",
    track: { kind: "asr", afPracticeSnapshotSource: true },
    loadedTranscriptResult: { practiceSnapshot: { textSource: { kind: "asr" } } },
  },
];
const sourceSelectionStore = sourceSelectionStorage.createSourceSelectionStore({
  storage: {
    getItem: (key) => sourceSelectionStorageFixture.get(key) ?? null,
    setItem: (key, value) => sourceSelectionStorageFixture.set(key, value),
  },
  storageState,
  sourceSelection,
  captionTracks: {
    sourceDisplayName: (source) => source.name,
    preferredLanguageRank: (languageCode) => (languageCode === "nl" ? 0 : 100),
    preferredLanguageCodes: () => ["nl"],
  },
  storageKey: "afShadowingSourceSelection",
  state: sourceSelectionStorageState,
  recordDebugEvent: (event, details) => sourceSelectionStorageEvents.push({ event, details }),
});
sourceSelectionStore.write(sourceSelectionStorageSources[1], "unit-test");
assert.equal(sourceSelectionStorageEvents.at(-1).event, "source-selection-saved");
assert.equal(sourceSelectionStore.read().sourceKind, "asr");
assert.equal(sourceSelectionStore.choosePreferred(sourceSelectionStorageSources).source.id, "nl:asr");
const videoResetPatch = videoLoadState.currentVideoResetPatch({ videoId: "video-1", loadToken: 4 });
assert.equal(videoResetPatch.videoId, "video-1");
assert.equal(videoResetPatch.loadToken, 4);
assert.equal(videoResetPatch.practiceSources.length, 0);
assert.equal(videoResetPatch.loading, true);
assert.equal(videoResetPatch.textVisible, true);
const sourceForReset = { error: "old", lastError: "old", lastRetrievalAttempts: ["old"] };
videoLoadState.resetSourceForLoad(sourceForReset);
assert.equal(sourceForReset.error, "");
assert.equal(sourceForReset.lastError, "");
assert.equal(sourceForReset.lastRetrievalAttempts.length, 0);
assert.equal(videoLoadState.sourceLoadStartPatch().transcriptResult, null);
const sourceSuccessLog = videoLoadState.sourceLoadSuccessLog({
  source: { name: "Dutch" },
  captionTracks: { sourceDisplayName: (source) => source.name },
  transcriptResult: {
    sourceKind: "manual",
    retrievalPath: "backend-provider",
    timingExactness: "word-level",
    qualityFlags: ["ok"],
    warnings: ["none"],
  },
  cues: [{}, {}],
  phrases: [{}],
  phraseProgressRestore: { reason: "phrase-id" },
});
assert.equal(sourceSuccessLog.source, "Dutch");
assert.equal(sourceSuccessLog.cues, 2);
assert.equal(sourceSuccessLog.phraseProgressRestore.reason, "phrase-id");
assert.equal(videoLoadState.sourceLoadFailureLog({
  source: { name: "Dutch", languageCode: "nl" },
  captionTracks: { sourceDisplayName: (source) => source.name },
  error: "failed",
}).languageCode, "nl");
const videoInitState = {
  videoId: "",
  loadToken: 0,
  loading: false,
  learningEnabled: true,
};
const videoInitEvents = [];
const videoInitSource = { id: "nl:manual", languageCode: "nl", track: { kind: "manual" } };
await videoInitWorkflow.initializeForCurrentVideo({
  getState: () => videoInitState,
  applyStatePatch: (patch) => Object.assign(videoInitState, patch),
  getVideoIdFromUrl: () => "video-1",
  updateBootDiagnostics: (patch) => videoInitEvents.push(["boot", patch]),
  phraseProgressStore: {
    cancel: () => videoInitEvents.push(["progress-cancel"]),
  },
  videoLoadState,
  clearTimingOperationPoll: () => videoInitEvents.push(["clear-timing"]),
  stopPlaybackTimer: () => videoInitEvents.push(["stop-playback"]),
  detachPassivePlaybackWatcher: () => videoInitEvents.push(["detach-passive"]),
  resetTranscriptPanelState: (previousVideoId) => videoInitEvents.push(["reset-transcript", previousVideoId]),
  render: () => videoInitEvents.push(["render"]),
  waitForPlayerResponse: async () => ({ captions: true }),
  captionTracks: {
    getCaptionTracks: () => [{ languageCode: "nl", kind: "manual" }],
    buildPracticeSources: () => [videoInitSource],
    chooseDefaultPracticeSource: () => videoInitSource,
  },
  sourceSelectionStore: {
    choosePreferred: () => ({ source: videoInitSource, reason: "stored-selection" }),
  },
  loadPracticeSource: async (source, options) => {
    videoInitEvents.push(["load-source", source.id, options]);
  },
});
assert.equal(videoInitState.videoId, "video-1");
assert.equal(videoInitState.loadToken, 1);
assert.equal(videoInitState.loading, false);
assert.equal(videoInitState.tracks.length, 1);
assert.equal(videoInitEvents.find((event) => event[0] === "load-source")[2].persistSelection, true);
const videoInitNoCaptionState = {
  videoId: "",
  loadToken: 0,
  loading: false,
  learningEnabled: true,
};
await videoInitWorkflow.initializeForCurrentVideo({
  getState: () => videoInitNoCaptionState,
  applyStatePatch: (patch) => Object.assign(videoInitNoCaptionState, patch),
  getVideoIdFromUrl: () => "video-empty",
  updateBootDiagnostics: (patch) => videoInitEvents.push(["boot-empty", patch]),
  phraseProgressStore: { cancel: () => {} },
  videoLoadState,
  clearTimingOperationPoll: () => {},
  stopPlaybackTimer: () => {},
  detachPassivePlaybackWatcher: () => {},
  resetTranscriptPanelState: () => {},
  render: () => {},
  waitForPlayerResponse: async () => ({}),
  captionTracks: {
    getCaptionTracks: () => [],
    buildPracticeSources: () => [],
    chooseDefaultPracticeSource: () => null,
  },
  sourceSelectionStore: { choosePreferred: () => null },
  loadPracticeSource: async () => {
    throw new Error("should not load");
  },
});
assert.equal(videoInitNoCaptionState.error, "No caption tracks found for this video.");
assert.equal(videoInitNoCaptionState.loading, false);
const locationCalls = [];
assert.equal(videoInitWorkflow.handleCurrentLocation({
  getState: () => ({ learningEnabled: true }),
  applyStatePatch: () => {},
  getVideoIdFromUrl: () => "",
  updateBootDiagnostics: (patch) => locationCalls.push(["boot", patch]),
  stopPlaybackTimer: () => locationCalls.push(["stop"]),
  detachPassivePlaybackWatcher: () => locationCalls.push(["detach"]),
  removeWorkspace: () => locationCalls.push(["remove-workspace"]),
  removeToggle: () => locationCalls.push(["remove-toggle"]),
}), "no-video");
assert.deepEqual(locationCalls.map((call) => call[0]).slice(-4), ["stop", "detach", "remove-workspace", "remove-toggle"]);
const disabledLocationState = { learningEnabled: false, guidedMode: true };
const disabledLocationCalls = [];
assert.equal(videoInitWorkflow.handleCurrentLocation({
  getState: () => disabledLocationState,
  applyStatePatch: (patch) => Object.assign(disabledLocationState, patch),
  getVideoIdFromUrl: () => "video-1",
  updateBootDiagnostics: () => {},
  renderToggle: () => disabledLocationCalls.push(["render-toggle"]),
  stopPlaybackTimer: () => disabledLocationCalls.push(["stop"]),
  detachPassivePlaybackWatcher: () => disabledLocationCalls.push(["detach"]),
  removeWorkspace: () => disabledLocationCalls.push(["remove-workspace"]),
}), "disabled");
assert.equal(disabledLocationState.guidedMode, false);
assert.deepEqual(disabledLocationCalls.map((call) => call[0]), ["render-toggle", "stop", "detach", "remove-workspace"]);
const displayPreferenceStorageFixture = new Map([
  ["afShadowingLearningEnabled", "false"],
  ["afDictionaryExamplesExpanded", "true"],
  ["afShadowingTheme", "dark"],
]);
const displayPreferenceStorageRemovals = [];
const displayPreferenceStorageEvents = [];
const displayPreferenceStorageMessages = [];
const displayPreferenceStorageState = {
  displayPreferences: displayPreferences.normalizeDisplayPreferences({ enabled: true }),
  learningEnabled: true,
  autoPause: true,
  examplesExpanded: false,
  themePreference: "system",
};
const displayPreferenceChangeListeners = [];
const displayPreferenceController = displayPreferenceStorage.createDisplayPreferenceController({
  chrome: {
    storage: {
      onChanged: {
        addListener(listener) {
          displayPreferenceChangeListeners.push(listener);
        },
      },
    },
  },
  storage: {
    getItem: (key) => displayPreferenceStorageFixture.get(key) ?? null,
    removeItem: (key) => {
      displayPreferenceStorageRemovals.push(key);
      displayPreferenceStorageFixture.delete(key);
    },
  },
  keys: {
    displayPreferences: "afShadowingDisplayPreferences",
    learningEnabled: "afShadowingLearningEnabled",
    examplesExpanded: "afDictionaryExamplesExpanded",
    theme: "afShadowingTheme",
  },
  state: displayPreferenceStorageState,
  normalizeDisplayPreferences: displayPreferences.normalizeDisplayPreferences,
  sendMessage: async (message) => {
    displayPreferenceStorageMessages.push(message);
    if (message.type === "af-get-display-preferences") return { ok: true, preferences: null };
    if (message.type === "af-set-display-preferences") return { ok: true, preferences: message.preferences };
    return { ok: false, error: "unexpected message" };
  },
  recordDebugEvent: (event, details) => displayPreferenceStorageEvents.push({ event, details }),
  render: () => displayPreferenceStorageEvents.push({ event: "render" }),
  onDisabled: () => displayPreferenceStorageEvents.push({ event: "disabled" }),
  onEnabled: () => displayPreferenceStorageEvents.push({ event: "enabled" }),
});
await displayPreferenceController.initialize();
assert.equal(displayPreferenceStorageState.learningEnabled, true);
assert.equal(displayPreferenceStorageMessages[0].type, "af-get-display-preferences");
assert.equal(displayPreferenceStorageMessages[1].type, "af-set-display-preferences");
assert.deepEqual(displayPreferenceStorageRemovals, [
  "afShadowingLearningEnabled",
  "afDictionaryExamplesExpanded",
  "afShadowingTheme",
]);
displayPreferenceController.subscribe();
assert.equal(displayPreferenceChangeListeners.length, 1);
displayPreferenceChangeListeners[0]({
  afShadowingDisplayPreferences: { newValue: { enabled: false, autoPause: true } },
}, "local");
assert.equal(displayPreferenceStorageState.learningEnabled, false);
assert.equal(displayPreferenceStorageEvents.at(-1).event, "disabled");
displayPreferenceChangeListeners[0]({
  afShadowingDisplayPreferences: { newValue: { enabled: true, autoPause: false } },
}, "local");
assert.equal(displayPreferenceStorageState.learningEnabled, true);
assert.equal(displayPreferenceStorageState.autoPause, false);
assert.equal(displayPreferenceStorageEvents.at(-1).event, "enabled");

const menuFixture = {
  sourceMenuOpen: false,
  utilityMenuOpen: false,
  settingsMenuOpen: false,
  shortcutHelpOpen: false,
  accountMenuOpen: false,
  phraseJumpMenuOpen: false,
  phraseJumpError: "Choose 1-3.",
  lastMenuTrigger: null,
};
assert.equal(menuState.toggleExclusiveMenu(menuFixture, "settings"), true);
assert.equal(menuFixture.settingsMenuOpen, true);
assert.equal(menuFixture.lastMenuTrigger, "settings");
assert.equal(menuState.toggleExclusiveMenu(menuFixture, "jump"), true);
assert.equal(menuFixture.settingsMenuOpen, false);
assert.equal(menuFixture.phraseJumpMenuOpen, true);
assert.equal(menuFixture.lastMenuTrigger, "jump");
const closeJumpMenuResult = menuState.closeMenus(menuFixture);
assert.equal(closeJumpMenuResult.closed, true);
assert.equal(closeJumpMenuResult.trigger, "jump");
assert.equal(menuFixture.phraseJumpMenuOpen, false);
assert.equal(menuFixture.phraseJumpError, "");
const closeNoMenuResult = menuState.closeMenus(menuFixture);
assert.equal(closeNoMenuResult.closed, false);
assert.equal(closeNoMenuResult.trigger, null);
const phraseJumpInput = { focused: false, focus() { this.focused = true; } };
const phraseJumpRoot = {
  shadowRoot: {
    querySelector: (selector) => (selector === "[data-af-jump-input]" ? phraseJumpInput : null),
  },
};
const phraseJumpState = {
  phrases: [{}, {}, {}],
  currentIndex: 1,
  phraseJumpMenuOpen: false,
  phraseJumpError: "old error",
  phraseJumpInput: "",
};
let phraseJumpRendered = 0;
let phraseJumpPrevented = false;
let phraseJumpStopped = false;
let phraseJumpTarget = null;
const phraseJumpOptions = {
  document: {
    getElementById: (id) => (id === "af-root" ? phraseJumpRoot : null),
  },
  rootId: "af-root",
  menuState,
  requestAnimationFrame: (callback) => callback(),
  jumpToPhrase: (targetIndex, reason) => {
    phraseJumpTarget = { targetIndex, reason };
  },
  render: () => {
    phraseJumpRendered += 1;
  },
};
assert.equal(phraseJumpWorkflow.togglePhraseJumpMenu(phraseJumpState, {
  preventDefault: () => {
    phraseJumpPrevented = true;
  },
  stopPropagation: () => {
    phraseJumpStopped = true;
  },
}, phraseJumpOptions), true);
assert.equal(phraseJumpPrevented, true);
assert.equal(phraseJumpStopped, true);
assert.equal(phraseJumpState.phraseJumpMenuOpen, true);
assert.equal(phraseJumpState.phraseJumpInput, "2");
assert.equal(phraseJumpState.phraseJumpError, "");
assert.equal(phraseJumpInput.focused, true);
phraseJumpState.phraseJumpInput = "two";
assert.equal(phraseJumpWorkflow.submitPhraseJump(phraseJumpState, phraseJumpOptions), false);
assert.equal(phraseJumpState.phraseJumpError, "Enter a whole number.");
phraseJumpState.phraseJumpInput = "4";
assert.equal(phraseJumpWorkflow.submitPhraseJump(phraseJumpState, phraseJumpOptions), false);
assert.equal(phraseJumpState.phraseJumpError, "Choose 1-3.");
phraseJumpState.phraseJumpInput = "3";
assert.equal(phraseJumpWorkflow.submitPhraseJump(phraseJumpState, phraseJumpOptions), true);
assert.equal(phraseJumpTarget.targetIndex, 2);
assert.equal(phraseJumpTarget.reason, "jump-number");
assert.equal(phraseJumpRendered, 3);
const uiStateRoot = createTestElement("div");
const uiStateDocument = {
  documentElement: createTestElement("html"),
  getElementById: (id) => (id === "af-root" ? uiStateRoot : null),
};
const uiStateState = {
  themePreference: "dark",
  displayPreferences: {
    appearance: {
      learnerTextScale: 1.2,
      panelBackgroundAlpha: 0.8,
    },
  },
  examplesExpanded: false,
  exampleExpansionOverrides: {},
  learningEnabled: true,
  settingsMenuOpen: true,
  lastMenuTrigger: "settings",
};
let uiStateRenderCount = 0;
let uiStateUpdatedPreferences = null;
let uiStateFocused = false;
uiStateRoot.shadowRoot = {
  querySelector: (selector) => (selector === "[data-af-settings-toggle]" ? { focus: () => { uiStateFocused = true; } } : null),
};
const uiStateOptions = {
  document: uiStateDocument,
  Element: TestHTMLElement,
  rootId: "af-root",
  displayPreferences,
  menuState,
  requestAnimationFrame: (callback) => callback(),
  updateDisplayPreferences: (updater) => {
    uiStateUpdatedPreferences = updater({ examplesExpanded: false });
  },
  render: () => {
    uiStateRenderCount += 1;
  },
};
uiStateWorkflow.applyThemeAttributes(uiStateState, uiStateOptions);
assert.equal(uiStateDocument.documentElement.dataset.afTheme, "dark");
assert.equal(uiStateRoot.style.properties["--af-learner-text-scale"], "1.2");
assert.equal(uiStateWorkflow.toggleAllExamples(uiStateState, { preventDefault() {}, stopPropagation() {} }, uiStateOptions), true);
assert.equal(uiStateUpdatedPreferences.examplesExpanded, true);
assert.equal(uiStateWorkflow.toggleCardExpanded(uiStateState, "card-1", uiStateOptions), true);
assert.equal(uiStateWorkflow.cardExpanded(uiStateState, "card-1"), true);
assert.equal(uiStateWorkflow.closeOpenMenus(uiStateState, uiStateOptions), true);
assert.equal(uiStateState.settingsMenuOpen, false);
assert.equal(uiStateFocused, true);
assert.equal(uiStateRenderCount, 3);
const menuInteractionElement = createTestElement("button");
menuInteractionElement.matches = (selector) => selector.includes("[data-af-settings-toggle]");
assert.equal(menuState.isMenuInteractionEvent({
  composedPath: () => [menuInteractionElement],
}, { Element: TestHTMLElement }), true);
const outsideMenuElement = createTestElement("div");
outsideMenuElement.matches = () => false;
assert.equal(menuState.isMenuInteractionEvent({
  composedPath: () => [outsideMenuElement],
}, { Element: TestHTMLElement }), false);

const enabledLearningToggle = displayPreferences.learningToggleState({ enabled: true });
assert.equal(enabledLearningToggle.text, "AudioFilms On");
assert.equal(enabledLearningToggle.enabled, true);
assert.equal(enabledLearningToggle.ariaLabel, "Disable AudioFilms shadowing workspace");
const disabledLearningToggle = displayPreferences.learningToggleState({ enabled: false });
assert.equal(disabledLearningToggle.text, "AudioFilms Off");
assert.equal(disabledLearningToggle.enabled, false);
assert.equal(disabledLearningToggle.ariaLabel, "Enable AudioFilms shadowing workspace");

assert.equal(keyboardShortcuts.isSpaceKey({ code: "Space", key: "" }), true);
assert.equal(keyboardShortcuts.isSpaceKey({ code: "", key: "Spacebar" }), true);
assert.equal(keyboardShortcuts.isSpeedDecreaseKey({ code: "NumpadSubtract" }), true);
assert.equal(keyboardShortcuts.isSpeedIncreaseKey({ code: "Equal" }), true);
assert.equal(keyboardShortcuts.isTranslationKey({ code: "Digit0" }), true);
assert.equal(keyboardShortcuts.isShortcutHelpKey({ code: "Slash", shiftKey: true }), true);
assert.equal(keyboardShortcuts.allowsShiftShortcut({ code: "ArrowDown" }), true);
assert.equal(keyboardShortcuts.shouldIgnoreKeyEvent({ metaKey: true }), true);
assert.equal(keyboardShortcuts.shouldIgnoreKeyEvent({ shiftKey: true, code: "KeyA" }), true);
assert.equal(keyboardShortcuts.shouldIgnoreKeyEvent({ shiftKey: true, code: "KeyS" }), false);
assert.equal(keyboardShortcuts.shouldIgnoreKeyEvent({
  composedPath: () => [{ tagName: "TEXTAREA" }],
  target: null,
}), true);
const blockedEvent = {
  prevented: false,
  stopped: false,
  immediateStopped: false,
  preventDefault() { this.prevented = true; },
  stopPropagation() { this.stopped = true; },
  stopImmediatePropagation() { this.immediateStopped = true; },
};
keyboardShortcuts.blockYouTubeShortcut(blockedEvent, { immediate: true });
assert.equal(blockedEvent.prevented, true);
assert.equal(blockedEvent.stopped, true);
assert.equal(blockedEvent.immediateStopped, true);
function createKeyboardWorkflowEvent(code, options = {}) {
  return {
    code,
    key: options.key || "",
    type: options.type || "keydown",
    repeat: Boolean(options.repeat),
    shiftKey: Boolean(options.shiftKey),
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: {},
    prevented: false,
    stopped: false,
    immediateStopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
    stopImmediatePropagation() { this.immediateStopped = true; },
    composedPath: () => [],
  };
}
function createKeyboardWorkflowDeps(state, calls, options = {}) {
  return {
    getState: () => state,
    isWatchPage: () => options.watchPage !== false,
    keyboardShortcuts,
    toggleContinuousPlayback: () => calls.push(["toggleContinuousPlayback"]),
    clearSpanSelectionDraft: () => {
      calls.push(["clearSpanSelectionDraft"]);
      state.spanSelectionDraft = null;
    },
    closeOpenMenus: () => {
      calls.push(["closeOpenMenus"]);
      return Boolean(options.closeMenus);
    },
    toggleShortcutHelp: () => calls.push(["toggleShortcutHelp"]),
    nextPhrase: () => calls.push(["nextPhrase"]),
    previousPhrase: () => calls.push(["previousPhrase"]),
    replayCurrentPhrase: (payload) => calls.push(["replayCurrentPhrase", payload]),
    toggleText: (event) => calls.push(["toggleText", { shiftKey: event.shiftKey }]),
    adjustVideoPlaybackRate: (delta) => calls.push(["adjustVideoPlaybackRate", delta]),
    togglePhraseTranslation: () => calls.push(["togglePhraseTranslation"]),
    setPracticeMode: (mode) => calls.push(["setPracticeMode", mode]),
    playbackRateStep: 0.25,
  };
}
const keyboardWorkflowState = { learningEnabled: true, spanSelectionDraft: null };
const keyboardWorkflowCalls = [];
const spaceEvent = createKeyboardWorkflowEvent("Space", { key: " " });
assert.equal(keyboardWorkflow.handleKeyboardEvent(
  spaceEvent,
  createKeyboardWorkflowDeps(keyboardWorkflowState, keyboardWorkflowCalls),
), true);
assert.equal(spaceEvent.immediateStopped, true);
assert.equal(keyboardWorkflowCalls[0][0], "toggleContinuousPlayback");
const replayEvent = createKeyboardWorkflowEvent("ArrowDown", { shiftKey: true });
keyboardWorkflow.handleKeyboardEvent(replayEvent, createKeyboardWorkflowDeps(keyboardWorkflowState, keyboardWorkflowCalls));
assert.equal(replayEvent.prevented, true);
assert.equal(keyboardWorkflowCalls.at(-1)[0], "replayCurrentPhrase");
assert.equal(keyboardWorkflowCalls.at(-1)[1].slowReplay, true);
const speedEvent = createKeyboardWorkflowEvent("Comma");
keyboardWorkflow.handleKeyboardEvent(speedEvent, createKeyboardWorkflowDeps(keyboardWorkflowState, keyboardWorkflowCalls));
assert.deepEqual(keyboardWorkflowCalls.at(-1), ["adjustVideoPlaybackRate", -0.25]);
const modeEvent = createKeyboardWorkflowEvent("Digit2");
keyboardWorkflow.handleKeyboardEvent(modeEvent, createKeyboardWorkflowDeps(keyboardWorkflowState, keyboardWorkflowCalls));
assert.deepEqual(keyboardWorkflowCalls.at(-1), ["setPracticeMode", "recall"]);
const escapeDraftState = { learningEnabled: true, spanSelectionDraft: { text: "draft" } };
const escapeCalls = [];
const escapeEvent = createKeyboardWorkflowEvent("Escape");
keyboardWorkflow.handleKeyboardEvent(escapeEvent, createKeyboardWorkflowDeps(escapeDraftState, escapeCalls));
assert.equal(escapeEvent.prevented, true);
assert.equal(escapeCalls[0][0], "clearSpanSelectionDraft");
assert.equal(escapeDraftState.spanSelectionDraft, null);
const ignoredCalls = [];
assert.equal(keyboardWorkflow.handleKeyboardEvent(
  createKeyboardWorkflowEvent("ArrowRight"),
  createKeyboardWorkflowDeps({ learningEnabled: false }, ignoredCalls),
), false);
assert.equal(ignoredCalls.length, 0);

const scrollSurface = {
  matches: (selector) => selector.includes("[data-af-utility-menu]"),
};
const scrollBox = {
  matches: () => false,
  scrollTop: 0,
  scrollHeight: 300,
  clientHeight: 100,
  scrollLeft: 0,
  scrollWidth: 100,
  clientWidth: 100,
};
const styleForScrollBox = (element) => (element === scrollBox
  ? { overflowX: "hidden", overflowY: "auto" }
  : { overflowX: "hidden", overflowY: "hidden" });
assert.equal(scrollContainment.pathContainsSurface([scrollBox, scrollSurface], ["[data-af-utility-menu]"]), true);
assert.equal(scrollContainment.isScrollableInWheelDirection(scrollBox, 0, 20, styleForScrollBox), true);
assert.equal(scrollContainment.canScrollElement(scrollBox, 0, 20), true);
scrollBox.scrollTop = 200;
assert.equal(scrollContainment.canScrollElement(scrollBox, 0, 20), false);
const containedWheel = {
  deltaX: 0,
  deltaY: 20,
  stopped: false,
  prevented: false,
  composedPath: () => [scrollBox, scrollSurface],
  stopPropagation() { this.stopped = true; },
  preventDefault() { this.prevented = true; },
};
assert.equal(scrollContainment.containWheelScroll(containedWheel, ["[data-af-utility-menu]"], styleForScrollBox), true);
assert.equal(containedWheel.stopped, true);
assert.equal(containedWheel.prevented, true);

const clearFixture = {
  firstChild: { id: 1 },
  removed: 0,
  removeChild() {
    this.removed += 1;
    this.firstChild = this.removed < 2 ? { id: this.removed + 1 } : null;
  },
};
domUtils.clearElement(clearFixture);
assert.equal(clearFixture.removed, 2);
const visibleFixture = {
  isConnected: true,
  hidden: false,
  getAttribute: () => "",
  getClientRects: () => [1],
};
assert.equal(domUtils.isVisibleElement(visibleFixture, {
  getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
}), true);
assert.equal(domUtils.isVisibleElement({ ...visibleFixture, hidden: true }, {
  getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
}), false);
const activationEvents = [];
const activationFixture = {
  scrollIntoView: (options) => activationEvents.push(["scroll", options.block]),
  focus: (options) => activationEvents.push(["focus", options.preventScroll]),
  dispatchEvent: (event) => activationEvents.push(["event", event.type]),
  click: () => activationEvents.push(["click"]),
};
domUtils.activateElement(activationFixture, {
  view: {},
  createEvent: (type) => ({ type }),
});
assert.deepEqual(activationEvents.map((entry) => entry[0]), [
  "scroll",
  "focus",
  "event",
  "event",
  "event",
  "event",
  "event",
  "click",
]);
assert.equal(uiIcons.iconSvg("prev").includes('class="af-button-icon"'), true);
assert.equal(uiIcons.iconSvg("prev").includes('d="m15 18-6-6 6-6"'), true);
assert.equal(uiIcons.iconSvg("unknown"), '<svg class="af-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"></svg>');
assert.equal(uiIcons.bugIconSvg().includes('d="M12 21a6 6 0 0 1-6-6v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4a6 6 0 0 1-6 6Z"'), true);
const phraseFallback = fallbacks.createPhraseFallback();
assert.equal(phraseFallback.cleanPhraseText("Goed... daarna"), "Goed daarna");
assert.equal(phraseFallback.buildPhrases([
  { startMs: 0, endMs: 500, text: "Hello" },
  { startMs: 650, endMs: 1100, text: "world." },
]).map((phrase) => phrase.text).join("|"), "Hello world.");
const captionFallback = fallbacks.createCaptionTracksFallback();
const fallbackSources = captionFallback.buildPracticeSources([
  { languageCode: "nl", vssId: ".nl", name: { simpleText: "Dutch" }, kind: "manual" },
  { languageCode: "nl", vssId: "a.nl", name: { simpleText: "Dutch (auto-generated)" }, kind: "asr" },
]);
assert.equal(captionFallback.chooseDefaultPracticeSource(fallbackSources).id, "nl:.nl:0");
assert.equal(captionFallback.groupPracticeSources(fallbackSources)[0].sources.length, 2);
const sourceLabelFallback = fallbacks.createSourceLabelsFallback();
assert.equal(
  sourceLabelFallback.closedSourceLabel({ name: "Dutch (auto-generated)", track: { kind: "asr" } }, { sourceKind: "auto" }),
  "Dutch (auto-generated)",
);
assert.equal(sourceLabelFallback.closedSourceLabel({ name: "Dutch", track: { kind: "manual" } }, { timingExactness: "word-level" }), "Dutch · ASR timing");
const youtubeFallback = fallbacks.createYouTubeAdapterFallback();
assert.equal(youtubeFallback.getVideoIdFromUrl("https://www.youtube.com/watch?v=video-1"), "video-1");
assert.equal(
  youtubeFallback.extractPlayerResponseFromText("var ytInitialPlayerResponse = {\"videoDetails\":{\"videoId\":\"video-1\"}};", "video-1").videoDetails.videoId,
  "video-1",
);
assert.equal(ribbonControls.originalControlLabel({ textVisible: true }), "Hide original");
assert.equal(
  ribbonControls.originalControlTitle({ practiceMode: "recall", textVisible: false }),
  "Reveal original for the current Recall phrase (S). Shift+S toggles Shadow sticky original.",
);
assert.equal(ribbonControls.translationControlLabel({ phraseTranslationVisible: false }), "Show translation");
assert.equal(
  ribbonControls.phraseTranslationControlTitle({
    practiceMode: "shadow",
    phraseTranslationStickyVisible: true,
    accountStatus: "signed-out",
    translation: null,
  }),
  "Translation: sticky. T or 0 toggles current phrase; Shift+T turns sticky mode off. Connect 2000NL to translate phrases.",
);
assert.equal(
  ribbonControls.displayToggleButtonHtml({ icon: "translate", label: "Show <translation>" }).includes("Show &lt;translation&gt;"),
  true,
);
const playbackRateControl = ribbonControls.playbackRateControlState({ rate: 2, min: 0.25, max: 2, fallback: 1 });
assert.equal(playbackRateControl.label, "2.00x");
assert.equal(playbackRateControl.higherDisabled, true);
assert.equal(playbackRateControl.lowerDisabled, false);
const playbackSessionOptions = {
  clampNumber: formatUtils.clampNumber,
  formatPlaybackRate: formatUtils.formatPlaybackRate,
  min: 0.25,
  max: 2,
  fallback: 1,
  slowReplayFallback: 0.75,
};
assert.equal(playbackSession.clampPlaybackRate(5, playbackSessionOptions), 2);
assert.equal(playbackSession.nextPlaybackRate(1, 0.25, playbackSessionOptions), 1.25);
const playbackSessionState = {
  playbackRate: 1,
  displayPreferences: { playback: { slowReplaySpeed: 0.6 } },
  activePlayback: { restorePlaybackRate: 1.4 },
  pendingPlaybackRateRestore: 1.2,
};
const playbackSessionVideo = { playbackRate: 1.75 };
assert.equal(playbackSession.syncPlaybackRateFromVideo(playbackSessionState, playbackSessionVideo, playbackSessionOptions), 1.75);
assert.equal(playbackSession.setVideoPlaybackRate(playbackSessionState, playbackSessionVideo, 3, playbackSessionOptions), 2);
assert.equal(playbackSessionVideo.playbackRate, 2);
assert.equal(playbackSession.slowReplayPlaybackRate(playbackSessionState, playbackSessionOptions), 0.6);
assert.equal(playbackSession.restorePlaybackRateAfterOverride(playbackSessionState, playbackSessionVideo, playbackSessionOptions), 1.4);
assert.equal(playbackSessionState.pendingPlaybackRateRestore, null);
assert.equal(playbackSession.formatPlaybackRate(1.25, playbackSessionOptions), "1.25x");
const displayPreferenceWorkflowState = {
  themePreference: "system",
  utilityMenuOpen: false,
  settingsMenuOpen: false,
  playbackRate: 1,
};
const displayPreferenceWorkflowEvents = [];
let displayPreferenceWorkflowRenderCount = 0;
let displayPreferenceWorkflowUpdatedPreferences = null;
const displayPreferenceWorkflowOptions = {
  displayPreferences,
  menuState,
  playbackSession,
  playbackRateOptions: () => playbackSessionOptions,
  getVideoElement: () => playbackSessionVideo,
  updateDisplayPreferences: (updater) => {
    displayPreferenceWorkflowUpdatedPreferences = updater({});
  },
  recordDebugEvent: (type, detail) => displayPreferenceWorkflowEvents.push({ type, detail }),
  render: () => {
    displayPreferenceWorkflowRenderCount += 1;
  },
};
const displayPreferenceWorkflowEvent = {
  preventDefault: () => displayPreferenceWorkflowEvents.push({ type: "prevent" }),
  stopPropagation: () => displayPreferenceWorkflowEvents.push({ type: "stop" }),
};
displayPreferenceWorkflow.toggleExclusiveMenu(
  displayPreferenceWorkflowState,
  "utility",
  displayPreferenceWorkflowEvent,
  displayPreferenceWorkflowOptions,
);
assert.equal(displayPreferenceWorkflowState.utilityMenuOpen, true);
assert.equal(displayPreferenceWorkflowEvents[0].type, "prevent");
assert.equal(displayPreferenceWorkflowEvents[1].type, "stop");
assert.equal(displayPreferenceWorkflow.cycleThemePreference(
  displayPreferenceWorkflowState,
  displayPreferenceWorkflowEvent,
  displayPreferenceWorkflowOptions,
), "light");
assert.equal(displayPreferenceWorkflowState.themePreference, "light");
assert.equal(displayPreferenceWorkflowUpdatedPreferences.theme, "light");
assert.equal(displayPreferenceWorkflow.adjustVideoPlaybackRate(
  displayPreferenceWorkflowState,
  0.25,
  displayPreferenceWorkflowOptions,
), 1.65);
assert.equal(playbackSessionVideo.playbackRate, 1.65);
assert.equal(displayPreferenceWorkflowEvents.at(-1).type, "playback-rate-set");
assert.equal(displayPreferenceWorkflowEvents.at(-1).detail.reason, "speed-control");
assert.equal(displayPreferenceWorkflowRenderCount, 3);
assert.equal(playbackSession.isCurrentPhraseStillSelected({
  phrases: [{ startMs: 1000, endMs: 2000 }],
  currentIndex: 0,
  currentMs: 2450,
  replayGraceMs: 500,
}), true);
assert.equal(playbackSession.isCurrentPhraseStillSelected({
  phrases: [{ startMs: 1000, endMs: 2000 }],
  currentIndex: 0,
  currentMs: 2600,
  replayGraceMs: 500,
}), false);
const activePlaybackPatch = playbackSession.activePlaybackSyncPatch({
  activePlayback: { index: 1 },
  phrases: [{ text: "one" }, { text: "two" }],
  currentIndex: 0,
});
assert.equal(activePlaybackPatch.index, 1);
assert.equal(activePlaybackPatch.statePatch.currentIndex, 1);
assert.equal(activePlaybackPatch.progressReason, "active-playback");
const guidedHoldState = {
  guidedMode: true,
  guidedHold: { index: 1, holdSeconds: 2 },
  phrases: [{ text: "one" }, { text: "two" }],
  currentIndex: 0,
};
const guidedHoldPatch = playbackSession.guidedHoldPatch(guidedHoldState, 2025);
assert.equal(guidedHoldPatch.preserve, true);
assert.equal(guidedHoldPatch.statePatch.currentIndex, 1);
assert.equal(guidedHoldPatch.progressReason, "guided-hold");
const guidedHoldClearPatch = playbackSession.guidedHoldPatch(guidedHoldState, 2600);
assert.equal(guidedHoldClearPatch.preserve, false);
assert.equal(guidedHoldClearPatch.statePatch.guidedHold, null);
const passivePausePatch = playbackSession.passiveSyncPatch({
  videoId: "video-1",
  selectedSourceId: "source-1",
  currentIndex: 0,
  guidedMode: true,
  autoPause: true,
  activePlayback: null,
  passivePausedKey: "",
}, {
  index: 0,
  phrase: { text: "phrase" },
  videoPaused: false,
  currentMs: 2500,
  playbackEndMs: 2400,
});
assert.equal(passivePausePatch.action, "pause");
assert.equal(passivePausePatch.statePatch.passivePausedKey, "video-1:source-1:0");
const passiveSyncPatch = playbackSession.passiveSyncPatch({
  currentIndex: 0,
  practiceMode: "recall",
  guidedMode: true,
  autoPause: true,
}, {
  index: 1,
  phrase: { text: "next" },
  videoPaused: false,
});
assert.equal(passiveSyncPatch.action, "sync-index");
assert.equal(passiveSyncPatch.shouldHoldRecallEntry, true);
const phraseEndPatch = playbackSession.phraseEndHoldPatch({
  activePlayback: { index: 1, wordReplay: { mode: "word" } },
  phrases: [{ text: "one" }, { text: "two" }],
}, 3.25);
assert.equal(phraseEndPatch.statePatch.currentIndex, 1);
assert.equal(phraseEndPatch.statePatch.guidedHold.holdSeconds, 3.25);
assert.equal(phraseEndPatch.wordReplay.mode, "word");
function createPlaybackWorkflowDeps(state, video, overrides = {}) {
  const events = [];
  const progressReasons = [];
  let markedPhrase = null;
  let renderCount = 0;
  let stopped = false;
  let frameCallback = null;
  return {
    deps: {
      getState: () => state,
      applyStatePatch: (patch) => Object.assign(state, patch),
      getVideoElement: () => video,
      stopPlaybackTimer: () => {
        stopped = true;
        state.activePlayback = null;
      },
      playbackTiming,
      playbackSession,
      playbackEndMsForPhrase: (phrases, index) => playbackTiming.playbackEndMsForPhrase(phrases, index, playbackTimingOptions),
      findPlaybackPhraseIndex: (phrases, currentMs) => playbackTiming.findPlaybackPhraseIndex(phrases, currentMs, playbackTimingOptions),
      syncPlaybackRateFromVideo: () => video.playbackRate || 1,
      slowReplayPlaybackRate: () => 0.75,
      markCurrentTranscriptSegment: (phrase) => {
        markedPhrase = phrase;
      },
      recordNavigationEvent: (type, details) => events.push({ type, details }),
      describePhraseAtIndex: (index) => ({ index, text: state.phrases[index]?.text || "" }),
      getPlaybackSnapshot: () => ({ currentTime: video.currentTime, paused: video.paused }),
      phraseProgressStore: {
        schedule: (reason) => progressReasons.push(reason),
      },
      applyPhraseEntryDisplayState: () => {
        state.appliedPhraseEntryDisplayState = true;
      },
      enterGuidedMode: () => {
        state.guidedMode = true;
      },
      holdPhraseAtStart: (targetIndex, holdOptions) =>
        playbackWorkflow.holdPhraseAtStart(targetIndex, holdOptions, {
          ...overrides,
          getState: () => state,
          applyStatePatch: (patch) => Object.assign(state, patch),
          getVideoElement: () => video,
          stopPlaybackTimer: () => {
            stopped = true;
            state.activePlayback = null;
          },
          markCurrentTranscriptSegment: (phrase) => {
            markedPhrase = phrase;
          },
          recordNavigationEvent: (type, details) => events.push({ type, details }),
          describePhraseAtIndex: (phraseIndex) => ({ index: phraseIndex, text: state.phrases[phraseIndex]?.text || "" }),
          getPlaybackSnapshot: () => ({ currentTime: video.currentTime, paused: video.paused }),
          roundTime: (value) => Math.round(value * 1000) / 1000,
          render: () => {
            renderCount += 1;
          },
          nowMs: () => 1234,
        }),
      playPhrase: (targetIndex, playOptions) => {
        state.playPhraseCall = { targetIndex, playOptions };
        return { ok: true, targetIndex, slowReplay: Boolean(playOptions.slowReplay) };
      },
      resolveWordTiming: () => null,
      phraseDisplaySegmentRange: (phrase) => ({ start: 0, end: phrase.text.length }),
      playbackTimingConfig: () => playbackTimingOptions,
      enforcePhraseEnd: () => {},
      scheduleNavigationObservation: (navigationEventId, command, targetIndex, delayMs) => {
        events.push({ type: "observation-scheduled", details: { navigationEventId, command, targetIndex, delayMs } });
      },
      requestAnimationFrame: (callback) => {
        frameCallback = callback;
        return 42;
      },
      roundTime: (value) => Math.round(value * 1000) / 1000,
      preRollMs: playbackTimingOptions.preRollMs,
      render: () => {
        renderCount += 1;
      },
      nowMs: () => 1234,
      ...overrides,
    },
    snapshot: () => ({ events, progressReasons, markedPhrase, renderCount, stopped, frameCallback }),
  };
}
const playbackTimingOptions = {
  preRollMs: 150,
  postRollMs: 500,
  minAudibleEndTailMs: 300,
  contiguousBoundaryGuardMs: 120,
};
const playbackWorkflowState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [
    { startMs: 1000, endMs: 2000, text: "one" },
    { startMs: 3000, endMs: 4000, text: "two" },
  ],
  autoPause: true,
  currentIndex: 0,
};
const playbackWorkflowVideo = {
  currentTime: 0,
  playbackRate: 1,
  paused: true,
  pause() {
    this.paused = true;
  },
  play() {
    this.paused = false;
    return Promise.resolve();
  },
};
const holdDeps = createPlaybackWorkflowDeps(playbackWorkflowState, playbackWorkflowVideo);
const holdResult = playbackWorkflow.holdPhraseAtStart(1, { command: "next", navigationEventId: "nav-1" }, holdDeps.deps);
assert.equal(holdResult.heldForRecall, true);
assert.equal(playbackWorkflowVideo.currentTime, 3);
assert.equal(playbackWorkflowState.guidedHold.index, 1);
assert.equal(holdDeps.snapshot().events[0].type, "recall-entry-hold");
const playDeps = createPlaybackWorkflowDeps(playbackWorkflowState, playbackWorkflowVideo);
const playResult = playbackWorkflow.playPhrase(0, { command: "replay", slowReplay: true }, playDeps.deps);
assert.equal(playResult.ok, true);
assert.equal(playResult.slowReplay, true);
assert.equal(playbackWorkflowVideo.playbackRate, 0.75);
assert.equal(playbackWorkflowState.activePlayback.index, 0);
assert.equal(playDeps.snapshot().events[0].type, "seek-started");
const retryPlayState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  autoPause: true,
  currentIndex: 0,
};
let retryPlayCalls = 0;
const retryPlayVideo = {
  currentTime: 0,
  playbackRate: 1,
  paused: true,
  play() {
    retryPlayCalls += 1;
    if (retryPlayCalls > 1) this.paused = false;
    return Promise.resolve();
  },
};
const retryCallbacks = [];
const retryPlayDeps = createPlaybackWorkflowDeps(retryPlayState, retryPlayVideo, {
  setTimeout: (callback, delay) => {
    retryCallbacks.push({ callback, delay });
  },
});
const retryPlayResult = playbackWorkflow.playPhrase(0, { command: "next" }, retryPlayDeps.deps);
assert.equal(retryPlayResult.autoPause, true);
assert.equal(retryPlayCalls, 1);
assert.equal(retryCallbacks[0].delay, 80);
retryCallbacks[0].callback();
assert.equal(retryPlayCalls, 2);
assert.equal(retryPlayVideo.paused, false);
const wordReplayState = {
  phrases: [{ startMs: 1000, endMs: 3000, text: "hello world" }],
  currentIndex: 0,
};
const wordReplayVideo = {
  currentTime: 0,
  paused: true,
  play() {
    this.paused = false;
    return Promise.resolve();
  },
};
const wordReplayDeps = createPlaybackWorkflowDeps(wordReplayState, wordReplayVideo);
const wordReplayResult = playbackWorkflow.playWordReplay(
  0,
  { tokenIndex: 1, charStart: 6, charEnd: 11 },
  { mode: "from-word" },
  wordReplayDeps.deps,
);
assert.equal(wordReplayResult.ok, true);
assert.equal(wordReplayState.guidedMode, true);
assert.equal(wordReplayState.activePlayback.wordReplay.timingSource, "estimate-char-position");
assert.equal(wordReplayDeps.snapshot().progressReasons[0], "word-replay-from-word");
const wordReplayGestureState = {};
const wordReplayGestureEvents = [];
const wordReplayGestureDeps = createPlaybackWorkflowDeps(wordReplayGestureState, {}, {
  playWordReplay: (phraseIndex, selection, options) => ({
    ok: true,
    phraseIndex,
    tokenIndex: selection.tokenIndex,
    timingSource: options.mode === "word" ? "exact" : "estimate",
    seekToSec: 1.2,
    expectedPauseAtSec: 2.3,
  }),
  recordNavigationEvent: (type, detail) => wordReplayGestureEvents.push({ type, detail }),
  nowMs: () => 123456,
});
const wordReplayGesture = playbackWorkflow.handleWordReplayGesture(
  { ctrlKey: true, metaKey: false },
  "bouwen",
  4,
  { tokenIndex: 2 },
  wordReplayGestureDeps.deps,
);
assert.equal(wordReplayGesture.mode, "word");
assert.equal(wordReplayGesture.atMs, 123456);
assert.equal(wordReplayGesture.timingSource, "exact");
assert.equal(wordReplayGestureState.lastWordReplay.word, "bouwen");
assert.equal(wordReplayGestureEvents[0].type, "word-replay");
const navigateState = {
  phrases: [
    { startMs: 1000, endMs: 2000, text: "one" },
    { startMs: 3000, endMs: 4000, text: "two" },
  ],
  currentIndex: 0,
  practiceMode: "shadow",
  selectedSpan: { text: "selected" },
};
const navigateVideo = { currentTime: 0, paused: true };
const navigateDeps = createPlaybackWorkflowDeps(navigateState, navigateVideo, {
  recordNavigationEvent: (type, details) => ({ id: `nav-${type}`, type, details }),
});
playbackWorkflow.navigateToPhrase("next", 1, { slowReplay: true }, navigateDeps.deps);
assert.equal(navigateState.currentIndex, 1);
assert.equal(navigateState.selectedSpan, null);
assert.equal(navigateState.guidedMode, true);
assert.equal(navigateState.appliedPhraseEntryDisplayState, true);
assert.equal(navigateState.playPhraseCall.targetIndex, 1);
assert.equal(navigateState.playPhraseCall.playOptions.slowReplay, true);
assert.equal(navigateDeps.snapshot().progressReasons[0], "next");
const jumpState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [
    { startMs: 1000, endMs: 2000, text: "one" },
    { startMs: 5000, endMs: 6000, text: "two" },
  ],
  currentIndex: 0,
  phraseJumpMenuOpen: true,
  phraseJumpError: "old error",
  lastMenuTrigger: "jump",
  passivePausedKey: "old",
  activePlayback: { index: 0 },
};
const jumpVideo = {
  currentTime: 1,
  paused: false,
  pause() {
    this.paused = true;
  },
};
const jumpDeps = createPlaybackWorkflowDeps(jumpState, jumpVideo);
assert.equal(playbackWorkflow.jumpToPhrase(1, "jump-number", jumpDeps.deps), true);
assert.equal(jumpVideo.paused, true);
assert.equal(jumpVideo.currentTime, 5);
assert.equal(jumpState.currentIndex, 1);
assert.equal(jumpState.guidedHold.createdAt, 1234);
assert.equal(jumpState.passivePausedKey, "");
assert.equal(jumpState.phraseJumpMenuOpen, false);
assert.equal(jumpState.phraseJumpError, "");
assert.equal(jumpState.lastMenuTrigger, null);
assert.equal(jumpDeps.snapshot().stopped, true);
assert.equal(jumpDeps.snapshot().progressReasons[0], "jump-number");
assert.equal(jumpDeps.snapshot().markedPhrase.text, "two");
assert.equal(jumpDeps.snapshot().events[0].type, "phrase-jump");
assert.equal(jumpDeps.snapshot().renderCount, 1);
const continuousPlayState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  currentIndex: 0,
  guidedMode: true,
  passivePausedKey: "old",
  activePlayback: { index: 0 },
  navigationEvents: [],
};
const continuousPlayVideo = {
  currentTime: 1.2,
  paused: true,
  ended: false,
  play() {
    this.paused = false;
    return Promise.resolve();
  },
  pause() {
    this.paused = true;
  },
};
const continuousPlayDeps = createPlaybackWorkflowDeps(continuousPlayState, continuousPlayVideo, {
  recordNavigationEvent: (type, details) => {
    const event = { id: `nav-${type}`, type, details };
    continuousPlayState.navigationEvents.push(event);
    return event;
  },
});
assert.equal(playbackWorkflow.toggleContinuousPlayback(continuousPlayDeps.deps), true);
assert.equal(continuousPlayVideo.paused, false);
assert.equal(continuousPlayState.guidedMode, false);
assert.equal(continuousPlayState.passivePausedKey, "");
assert.equal(continuousPlayState.activePlayback, null);
assert.equal(continuousPlayDeps.snapshot().stopped, true);
assert.equal(continuousPlayState.navigationEvents[0].type, "space-play");
assert.equal(continuousPlayDeps.snapshot().events[0].details.navigationEventId, "nav-space-play");
assert.equal(continuousPlayDeps.snapshot().renderCount, 1);
const continuousPauseState = {
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  currentIndex: 0,
  guidedMode: true,
  passivePausedKey: "old",
  navigationEvents: [],
};
const continuousPauseVideo = {
  currentTime: 1.5,
  paused: false,
  ended: false,
  play() {
    this.paused = false;
    return Promise.resolve();
  },
  pause() {
    this.paused = true;
  },
};
let continuousPauseEvent = null;
const continuousPauseDeps = createPlaybackWorkflowDeps(continuousPauseState, continuousPauseVideo, {
  recordNavigationEvent: (type, details) => {
    continuousPauseEvent = { id: `nav-${type}`, type, details };
    return continuousPauseEvent;
  },
});
assert.equal(playbackWorkflow.toggleContinuousPlayback(continuousPauseDeps.deps), true);
assert.equal(continuousPauseVideo.paused, true);
assert.equal(continuousPauseEvent.type, "space-pause");
assert.equal(continuousPauseDeps.snapshot().events[0].details.navigationEventId, "nav-space-pause");
const autoPauseToggleState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  currentIndex: 0,
  autoPause: false,
  guidedMode: false,
  passivePausedKey: "old",
};
let autoPausePreference = null;
let passiveWatcherEnsured = false;
let passivePlaybackSynced = false;
const autoPauseToggleDeps = createPlaybackWorkflowDeps(autoPauseToggleState, { currentTime: 1.2, paused: false }, {
  updateDisplayPreferences: (updater) => {
    autoPausePreference = updater({ autoPause: false });
    autoPauseToggleState.autoPause = autoPausePreference.autoPause;
  },
  ensurePassivePlaybackWatcher: () => {
    passiveWatcherEnsured = true;
  },
  syncPassivePlayback: () => {
    passivePlaybackSynced = true;
  },
});
assert.equal(playbackWorkflow.toggleAutoPause(autoPauseToggleDeps.deps), true);
assert.equal(autoPausePreference.autoPause, true);
assert.equal(autoPauseToggleState.guidedMode, true);
assert.equal(autoPauseToggleState.passivePausedKey, "");
assert.equal(passiveWatcherEnsured, true);
assert.equal(passivePlaybackSynced, true);
assert.equal(autoPauseToggleDeps.snapshot().events[0].type, "auto-pause-toggle");
const syncIndexState = {
  phrases: [
    { startMs: 1000, endMs: 2000, text: "one" },
    { startMs: 3000, endMs: 4000, text: "two" },
  ],
  currentIndex: 0,
  selectedSpan: { text: "one" },
};
const syncIndexDeps = createPlaybackWorkflowDeps(syncIndexState, { currentTime: 3.2, paused: false });
assert.equal(playbackWorkflow.syncIndexToCurrentTime({}, syncIndexDeps.deps), true);
assert.equal(syncIndexState.currentIndex, 1);
assert.equal(syncIndexState.selectedSpan, null);
assert.equal(syncIndexState.appliedPhraseEntryDisplayState, true);
assert.equal(syncIndexDeps.snapshot().renderCount, 1);
const syncIndexHoldDeps = createPlaybackWorkflowDeps(syncIndexState, { currentTime: 3.9, paused: false }, {
  isCurrentPhraseStillSelected: () => true,
});
assert.equal(playbackWorkflow.syncIndexToCurrentTime({ keepCurrentIfJustEnded: true }, syncIndexHoldDeps.deps), false);
const passiveFrameVideo = { paused: false };
const passiveFrameState = { passiveFrame: 7, passiveVideo: passiveFrameVideo };
const passiveFrameCallbacks = [];
const passiveFrameCalls = [];
const passiveFrameDeps = createPlaybackWorkflowDeps(passiveFrameState, passiveFrameVideo, {
  requestAnimationFrame: (callback) => {
    passiveFrameCallbacks.push(callback);
    return 100 + passiveFrameCallbacks.length;
  },
  cancelAnimationFrame: (frame) => passiveFrameCalls.push(`cancel:${frame}`),
  syncPassivePlayback: () => passiveFrameCalls.push("sync"),
});
assert.equal(playbackWorkflow.startPassivePlaybackFrame(passiveFrameVideo, passiveFrameDeps.deps), 101);
assert.equal(passiveFrameState.passiveFrame, 101);
passiveFrameCallbacks[0]();
assert.equal(passiveFrameState.passiveFrame, 102);
passiveFrameVideo.paused = true;
passiveFrameCallbacks[1]();
assert.equal(passiveFrameState.passiveFrame, null);
passiveFrameState.passiveVideo = { paused: false };
playbackWorkflow.startPassivePlaybackFrame(passiveFrameVideo, passiveFrameDeps.deps);
passiveFrameCallbacks.at(-1)();
assert.equal(passiveFrameState.passiveFrame, null);
assert.equal(passiveFrameCalls.join("|"), "cancel:7|sync|sync");
const passiveSyncState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  learningEnabled: true,
  loading: false,
  phrases: [
    { startMs: 1000, endMs: 2000, text: "one" },
    { startMs: 3000, endMs: 4000, text: "two" },
  ],
  currentIndex: 0,
  guidedMode: false,
  autoPause: false,
};
const passiveSyncVideo = { currentTime: 3.1, paused: false };
const passiveSyncDeps = createPlaybackWorkflowDeps(passiveSyncState, passiveSyncVideo);
assert.equal(playbackWorkflow.syncPassivePlayback(passiveSyncVideo, passiveSyncDeps.deps), true);
assert.equal(passiveSyncState.currentIndex, 1);
assert.equal(passiveSyncDeps.snapshot().progressReasons[0], "passive-sync");
assert.equal(passiveSyncDeps.snapshot().markedPhrase.text, "two");
const passivePauseState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  learningEnabled: true,
  loading: false,
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  currentIndex: 0,
  guidedMode: true,
  autoPause: true,
};
const passivePauseVideo = {
  currentTime: 2.7,
  paused: false,
  pause() {
    this.paused = true;
  },
};
const passivePauseDeps = createPlaybackWorkflowDeps(passivePauseState, passivePauseVideo);
assert.equal(playbackWorkflow.syncPassivePlayback(passivePauseVideo, passivePauseDeps.deps), true);
assert.equal(passivePauseVideo.paused, true);
assert.equal(passivePauseState.passivePausedKey, "video-1:nl:manual:0");
const enforceState = {
  phrases: [{ startMs: 1000, endMs: 2000, text: "one" }],
  currentIndex: 0,
  activePlayback: { index: 0, endSeconds: 2.1, wordReplay: { mode: "word" } },
};
const enforceVideo = {
  currentTime: 2.2,
  paused: false,
  pause() {
    this.paused = true;
  },
};
const enforceDeps = createPlaybackWorkflowDeps(enforceState, enforceVideo);
assert.equal(playbackWorkflow.enforcePhraseEnd(enforceVideo, enforceDeps.deps), true);
assert.equal(enforceVideo.paused, true);
assert.equal(enforceState.guidedHold.index, 0);
assert.equal(enforceDeps.snapshot().progressReasons[0], "auto-pause-held");
assert.equal(enforceDeps.snapshot().events[0].type, "auto-pause-held");
const passiveWatcherListeners = [];
const passiveWatcherRemovals = [];
const passiveWatcherVideo = {
  paused: false,
  playbackRate: 1.25,
  addEventListener: (...args) => passiveWatcherListeners.push(args),
  removeEventListener: (...args) => passiveWatcherRemovals.push(args),
};
const passiveWatcherState = {
  passiveVideo: null,
  passiveFrame: 42,
  passivePausedKey: "old",
  playbackRate: 1,
  activePlayback: null,
};
const passiveWatcherCalls = [];
const passiveWatcherOptions = {
  playbackSession,
  playbackRateOptions: () => playbackSessionOptions,
  getVideoElement: () => passiveWatcherVideo,
  syncPlaybackRateFromVideo: (video) => passiveWatcherCalls.push(`sync-rate:${video.playbackRate}`),
  syncPassivePlayback: () => passiveWatcherCalls.push("sync-passive"),
  startPassivePlaybackFrame: () => passiveWatcherCalls.push("start-frame"),
  restorePlaybackRateAfterOverride: () => passiveWatcherCalls.push("restore-rate"),
  onPassiveVideoTimeUpdate: () => {},
  onPassiveVideoPlay: () => {},
  onPassiveVideoPause: () => {},
  onPassiveVideoRateChange: () => {},
  cancelAnimationFrame: (frame) => passiveWatcherCalls.push(`cancel:${frame}`),
  render: () => passiveWatcherCalls.push("render"),
};
assert.equal(passivePlaybackWatcher.ensurePassivePlaybackWatcher(passiveWatcherState, passiveWatcherOptions), true);
assert.equal(passiveWatcherState.passiveVideo, passiveWatcherVideo);
assert.equal(passiveWatcherListeners.map((entry) => entry[0]).join("|"), "timeupdate|play|pause|ratechange");
assert.equal(passiveWatcherCalls.join("|"), "cancel:42|sync-rate:1.25|sync-passive|start-frame");
passivePlaybackWatcher.onPassiveVideoTimeUpdate({ currentTarget: passiveWatcherVideo }, passiveWatcherOptions);
assert.equal(passiveWatcherCalls.at(-1), "sync-passive");
passiveWatcherState.passivePausedKey = "paused";
passivePlaybackWatcher.onPassiveVideoPlay(passiveWatcherState, { currentTarget: passiveWatcherVideo }, passiveWatcherOptions);
assert.equal(passiveWatcherState.passivePausedKey, "");
assert.equal(passiveWatcherCalls.slice(-2).join("|"), "sync-passive|start-frame");
passivePlaybackWatcher.onPassiveVideoPause(passiveWatcherState, passiveWatcherOptions);
assert.equal(passiveWatcherState.passiveFrame, null);
assert.equal(passiveWatcherCalls.at(-1), "restore-rate");
passivePlaybackWatcher.onPassiveVideoRateChange(passiveWatcherState, { currentTarget: passiveWatcherVideo }, passiveWatcherOptions);
assert.equal(passiveWatcherState.playbackRate, 1.25);
assert.equal(passiveWatcherCalls.at(-1), "render");
passivePlaybackWatcher.detachPassivePlaybackWatcher(passiveWatcherState, passiveWatcherOptions);
assert.equal(passiveWatcherState.passiveVideo, null);
assert.equal(passiveWatcherRemovals.map((entry) => entry[0]).join("|"), "timeupdate|play|pause|ratechange");
const ribbonPanelState = ribbonControls.ribbonPanelState({
  phrases: [{ text: "one" }, { text: "two" }, { text: "three" }],
  currentIndex: 1,
  practiceMode: "recall",
  guidedMode: true,
  phraseJumpMenuOpen: true,
  phraseJumpError: "Choose 1-3.",
  settingsMenuOpen: true,
  shortcutHelpOpen: true,
  utilityMenuOpen: true,
  debugVisible: true,
  debugCopied: true,
  diagnosticsClearedAt: "2026-06-30T10:00:00.000Z",
  cacheRefreshRequested: true,
  issueDialogOpen: true,
  hasSelectedSource: false,
});
assert.equal(ribbonPanelState.count.text, "2 / 3");
assert.equal(ribbonPanelState.jump.open, true);
assert.equal(ribbonPanelState.jump.inputValue, "2");
assert.equal(ribbonPanelState.panelClasses.recall, true);
assert.equal(ribbonPanelState.mode.guided, true);
assert.equal(ribbonPanelState.mode.shadowActive, false);
assert.equal(ribbonPanelState.mode.recallActive, true);
assert.equal(ribbonPanelState.mode.recallTitle, "Recall mode (2)");
assert.equal(ribbonPanelState.menus.settings.open, true);
assert.equal(ribbonPanelState.menus.help.hidden, false);
assert.equal(ribbonPanelState.menus.utility.expanded, true);
assert.equal(ribbonPanelState.utility.debugToggleText, "Hide Debug");
assert.equal(ribbonPanelState.utility.debugCopyText, "Copied");
assert.equal(ribbonPanelState.utility.refreshDisabled, true);
const emptyRibbonPanelState = ribbonControls.ribbonPanelState({ loading: false, phrases: [] });
assert.equal(emptyRibbonPanelState.isEmpty, true);
assert.equal(emptyRibbonPanelState.count.text, "0 / 0");
assert.equal(emptyRibbonPanelState.buttons.hidden, true);
function createRibbonWorkflowDeps(state, calls = []) {
  const list = createTestElement("div");
  const panel = createTestElement("section");
  return {
    panel,
    list,
    deps: {
      getState: () => state,
      practiceReadiness: () => ({ state: state.readinessState || "ready" }),
      phraseTranslationState: (_phrase, index) => ({ status: "ready", index }),
      getSelectedPracticeSource: () => state.selectedPracticeSource || null,
      ribbonControls,
      ribbonPanelDom: {
        renderRibbonPanel: (_panel, input) => {
          calls.push(["render-panel", input.ribbonState.count.text, input.readinessState, input.errorText]);
          return { list };
        },
      },
      iconSvg: () => "",
      renderSourceSelector: () => {},
      renderAccountControl: () => {},
      renderDisplayToggleButton: () => {},
      renderDisplayPreferenceControls: () => {},
      renderPlaybackRateControls: () => {},
      renderIssueReportDialog: () => {},
      positionUtilityMenu: () => {},
      positionIssueReportDialog: () => {},
      clearElement: (element) => {
        element.children = [];
        calls.push(["clear"]);
      },
      appendRibbonMessage: (_parent, text) => calls.push(["message", text]),
      appendPhraseRow: (_parent, phrase, index) => calls.push(["phrase", phrase.text, index]),
    },
  };
}
const loadingRibbonCalls = [];
const loadingRibbon = createRibbonWorkflowDeps({
  phrases: [],
  currentIndex: 0,
  loading: true,
  tracks: [],
}, loadingRibbonCalls);
assert.equal(ribbonWorkflow.renderRibbon(loadingRibbon.panel, loadingRibbon.deps), "loading");
assert.equal(loadingRibbonCalls.at(-1)[1], "Loading captions...");
const emptyRibbonCalls = [];
const emptyRibbon = createRibbonWorkflowDeps({
  phrases: [],
  currentIndex: 0,
  loading: false,
  tracks: [],
}, emptyRibbonCalls);
assert.equal(ribbonWorkflow.renderRibbon(emptyRibbon.panel, emptyRibbon.deps), "empty");
assert.equal(emptyRibbonCalls.at(-1)[1], "This video has no captions, so phrase practice cannot start.");
const phraseRibbonCalls = [];
const phraseRibbon = createRibbonWorkflowDeps({
  phrases: [{ text: "one" }, { text: "two" }],
  currentIndex: 1,
  loading: false,
  tracks: [{}],
  selectedPracticeSource: { id: "nl:manual" },
  textVisible: true,
}, phraseRibbonCalls);
assert.equal(ribbonWorkflow.renderRibbon(phraseRibbon.panel, phraseRibbon.deps), "phrase");
assert.equal(phraseRibbon.list.classList.contains("is-compact"), true);
assert.deepEqual(phraseRibbonCalls.at(-1), ["phrase", "two", 1]);
const ribbonFactoryState = { phraseJumpInput: "", phraseJumpError: "old" };
const ribbonFactoryCalls = [];
const ribbonFactoryDeps = {
  getState: () => ribbonFactoryState,
  workspaceDom: {
    createRibbonPanel: (options) => {
      ribbonFactoryCalls.push(["create-panel", options.panelId]);
      return { options };
    },
  },
  panelId: "panel-1",
  iconSvg: () => "",
  bugIconSvg: () => "",
  ribbonControls,
  playbackRateStep: 0.05,
  bringDebugPanelBehindFromPanel: () => ribbonFactoryCalls.push(["behind"]),
  togglePhraseJumpMenu: () => ribbonFactoryCalls.push(["toggle-jump"]),
  jumpToPhrase: (index, reason) => ribbonFactoryCalls.push(["jump", index, reason]),
  submitPhraseJump: () => ribbonFactoryCalls.push(["submit-jump"]),
  render: () => ribbonFactoryCalls.push(["render"]),
  createAccountControl: () => {},
  createIssueReportDialog: () => {},
  previousPhrase: () => ribbonFactoryCalls.push(["previous"]),
  replayCurrentPhrase: (payload) => ribbonFactoryCalls.push(["replay", payload]),
  toggleText: () => ribbonFactoryCalls.push(["toggle-text"]),
  nextPhrase: () => ribbonFactoryCalls.push(["next"]),
  setPracticeMode: (mode) => ribbonFactoryCalls.push(["mode", mode]),
  togglePhraseTranslation: () => ribbonFactoryCalls.push(["translation"]),
  toggleSourceMenu: () => {},
  cycleThemePreference: () => {},
  toggleSettingsMenu: () => {},
  toggleShortcutHelp: () => {},
  toggleUtilityMenu: () => {},
  adjustLearnerTextScale: (delta) => ribbonFactoryCalls.push(["learner", delta]),
  resetLearnerTextScale: () => {},
  adjustPanelBackgroundAlpha: (delta) => ribbonFactoryCalls.push(["alpha", delta]),
  resetPanelBackgroundAlpha: () => {},
  toggleAutoPause: () => {},
  adjustSlowReplaySpeed: (delta) => ribbonFactoryCalls.push(["slow", delta]),
  adjustVideoPlaybackRate: (delta) => ribbonFactoryCalls.push(["speed", delta]),
  toggleLayoutLock: () => {},
  resetPanelLayout: () => {},
  beginPanelDrag: () => {},
  beginPanelResize: () => {},
  toggleDebug: () => {},
  copyDebug: () => {},
  clearDiagnostics: () => {},
  refreshSelectedSourceCache: () => {},
  openIssueReportDialog: () => {},
  submitPhraseBoundaryIssue: () => {},
};
const ribbonFactoryPanel = ribbonPanelFactory.createRibbonPanel(ribbonFactoryDeps);
assert.equal(ribbonFactoryPanel.options.panelId, "panel-1");
ribbonFactoryPanel.options.onJumpStart();
assert.deepEqual(ribbonFactoryCalls.at(-1), ["jump", 0, "jump-start"]);
ribbonFactoryPanel.options.onJumpInput({ currentTarget: { value: "12" } });
assert.equal(ribbonFactoryState.phraseJumpInput, "12");
assert.equal(ribbonFactoryState.phraseJumpError, "");
assert.deepEqual(ribbonFactoryCalls.at(-1), ["render"]);
const jumpKeyEvent = { key: "Enter", prevented: false, preventDefault() { this.prevented = true; } };
ribbonFactoryPanel.options.onJumpInputKeydown(jumpKeyEvent);
assert.equal(jumpKeyEvent.prevented, true);
assert.deepEqual(ribbonFactoryCalls.at(-1), ["submit-jump"]);
ribbonFactoryPanel.options.onReplayCurrentPhrase({ shiftKey: true });
assert.equal(ribbonFactoryCalls.at(-1)[1].slowReplay, true);
ribbonFactoryPanel.options.onSetRecallMode();
assert.deepEqual(ribbonFactoryCalls.at(-1), ["mode", "recall"]);
ribbonFactoryPanel.options.onSpeedLower();
assert.deepEqual(ribbonFactoryCalls.at(-1), ["speed", -0.05]);
const displayToggleState = ribbonControls.displayToggleState({
  practiceMode: "shadow",
  textVisible: true,
  shadowTextVisible: true,
  phraseTranslationVisible: false,
  phraseTranslationStickyVisible: true,
  accountStatus: "signed-out",
  translation: null,
});
assert.equal(displayToggleState.original.icon, "eye");
assert.equal(displayToggleState.original.sticky, true);
assert.equal(displayToggleState.translation.label, "Show translation");
assert.equal(displayToggleState.translation.sticky, true);
assert.equal(displayToggleState.translation.title.includes("Connect 2000NL"), true);
assert.equal(ribbonControls.shortcutItems().map((item) => item.key).join("|"), "Space|Left / Right|Down|Up or S|T or 0|1 / 2|?|Esc");
assert.equal(ribbonControls.settingsControlGroups().map((group) => group.label).join("|"), "Subtitle text|Panel transparency|Playback|Slow replay|Panel layout");
assert.equal(ribbonControls.settingsControlGroups()[0].buttons.map((button) => button.datasetKey).join("|"), "afLearnerTextSmaller|afLearnerTextReset|afLearnerTextLarger");
assert.equal(ribbonControls.debugActionButtons().map((button) => button.datasetKey).join("|"), "afMarkIssue|afMarkPhraseBoundary|afDebugToggle|afDebugCopy|afDiagnosticsClear|afRefreshCache");

const tokenized = phraseTokens.tokenizeClickablePhraseText("We pakken 'm erbij.");
assert.equal(tokenized.find((segment) => segment.text === "'m")?.lookupWord, "'m");

assert.equal(phrases.cleanPhraseText("Goed... 20 minuten later"), "Goed... 20 minuten later");
assert.equal(phrases.cleanPhraseText("Goed... daarna"), "Goed daarna");

const phraseSet = phrases.buildPhrases([
  { startMs: 0, endMs: 1000, text: "Goed..." },
  { startMs: 1000, endMs: 2000, text: "20 minuten later" },
]);
assert.equal(phraseSet.length, 1);
assert.equal(phraseSet[0].text, "Goed... 20 minuten later");

assert.equal(
  sourceLabels.closedSourceLabel(
    { name: "Dutch", languageCode: "nl", track: { kind: "manual" } },
    { sourceKind: "manual", timingExactness: "exact" },
  ),
  "Dutch",
);
assert.equal(
  sourceLabels.closedSourceLabel(
    { name: "Dutch", languageCode: "nl", track: { kind: "manual" } },
    { sourceKind: "manual", timingExactness: "word-level" },
  ),
  "Dutch · ASR timing",
);
assert.equal(
  sourceLabels.closedSourceLabel(
    { name: "Dutch (auto-generated)", languageCode: "nl", track: { kind: "asr" } },
    { sourceKind: "auto", timingExactness: "exact" },
  ),
  "Dutch (auto-generated)",
);
assert.equal(
  sourceLabels.closedSourceLabel(
    { name: "ASR transcript", languageCode: "nl", track: { kind: "asr", afPracticeSnapshotSource: true } },
    { sourceKind: "asr", timingExactness: "word-level" },
  ),
  "ASR transcript",
);
assert.equal(sourceLabels.userFacingSourceLabel({ source: null, hasTracks: true }), "Captions");
assert.equal(sourceLabels.userFacingSourceLabel({ source: null, hasTracks: false }), "No captions");
assert.equal(
  sourceLabels.userFacingSourceLabel({
    source: { name: "Dutch", languageCode: "nl", track: { kind: "manual" } },
    result: { sourceKind: "manual", timingExactness: "word-level" },
  }),
  "Dutch · ASR timing",
);

const practiceSources = [
  { id: "en:auto", index: 0, languageCode: "en", track: { kind: "asr" } },
  { id: "nl:manual", index: 1, languageCode: "nl", track: { kind: "manual" } },
  { id: "nl:asr", index: 2, languageCode: "nl", track: { kind: "asr", afPracticeSnapshotSource: true }, loadedTranscriptResult: { practiceSnapshot: { textSource: { kind: "asr" } } } },
];
assert.equal(sourceSelection.sourceSelectionKind(practiceSources[0]), "auto");
assert.equal(sourceSelection.sourceSelectionKind(practiceSources[2]), "asr");
assert.equal(
  sourceSelection.choosePreferredPracticeSource(practiceSources, { preferredLanguageCodes: () => ["en", "nl"] }).source.id,
  "nl:manual",
);
assert.equal(
  sourceSelection.choosePreferredPracticeSource(practiceSources, { storedSelection: { sourceKind: "asr", languageCode: "nl" } }).source.id,
  "nl:asr",
);
const practiceSnapshotSource = sourceSelection.practiceSnapshotSource({
  operation: { id: "operation-1", input: { language: "nl" } },
  alternative: { id: "asr-1", label: "ASR transcript" },
  snapshot: {
    snapshotRevisionId: "snapshot-1",
    textSource: { kind: "asr", languageCode: "nl", label: "Generated ASR" },
  },
  result: {
    retrievalPath: "practice-timing-cache",
    retrievalAttempts: [{ path: "practice-timing-cache", status: "ok" }],
  },
  nextIndex: 3,
  summary: { retrievalPath: "practice-timing-cache", languageCode: "nl" },
});
assert.equal(practiceSnapshotSource.id, "practice:operation-1:asr-1");
assert.equal(practiceSnapshotSource.index, 3);
assert.equal(practiceSnapshotSource.name, "ASR transcript");
assert.equal(practiceSnapshotSource.languageCode, "nl");
assert.equal(practiceSnapshotSource.track.kind, "asr");
assert.equal(practiceSnapshotSource.track.afPracticeSnapshotSource, true);
assert.equal(practiceSnapshotSource.loadedCueSource, "practice-timing-cache");
assert.equal(practiceSnapshotSource.loadedTranscriptResult.languageCode, "nl");
const existingPracticeSnapshotSource = sourceSelection.practiceSnapshotSource({
  operation: { id: "operation-1", input: { language: "nl" } },
  alternative: { id: "manual-1", label: "Manual captions" },
  snapshot: { textSource: { kind: "provided-captions", languageCode: "nl" } },
  result: { retrievalPath: "practice-timing-cache", retrievalAttempts: [] },
  existingSource: { id: "practice:operation-1:manual-1", index: 5, name: "Old", track: { vssId: "old" } },
  nextIndex: 6,
});
assert.equal(existingPracticeSnapshotSource.index, 5);
assert.equal(existingPracticeSnapshotSource.name, "Manual captions");
assert.equal(existingPracticeSnapshotSource.track.kind, "manual");
assert.equal(existingPracticeSnapshotSource.error, "");
const loadedSourcePatch = sourceSelection.loadedPracticeSourcePatch({
  source: { id: "nl:manual", track: { kind: "manual" } },
  transcriptResult: {
    retrievalPath: "backend-provider",
    cues: [{ startMs: 0, endMs: 1000, text: "Hallo" }],
    retrievalAttempts: [{ path: "backend-provider", status: "ok" }],
  },
  phrases: [{ startMs: 0, endMs: 1000, text: "Hallo" }],
  restoredProgress: {
    index: 0,
    reason: "phrase-id",
    progress: {
      currentIndex: 2,
      phraseCount: 3,
      updatedAt: "2026-06-30T10:00:00.000Z",
    },
  },
  playbackIndex: 4,
  autoPause: true,
  transcriptSummary: { retrievalPath: "backend-provider", sourceKind: "manual" },
});
assert.equal(loadedSourcePatch.statePatch.selectedSourceId, "nl:manual");
assert.equal(loadedSourcePatch.statePatch.currentIndex, 0);
assert.equal(loadedSourcePatch.statePatch.lastPhraseProgressRestore.reason, "phrase-id");
assert.equal(loadedSourcePatch.statePatch.guidedMode, true);
assert.equal(loadedSourcePatch.sourcePatch.loadedCueSource, "backend-provider");
assert.equal(loadedSourcePatch.sourcePatch.loadedTranscriptResult.sourceKind, "manual");
const keptFailurePatch = sourceSelection.failedPracticeSourcePatch({
  source: { id: "nl:auto", track: { kind: "asr" } },
  message: "raw failure",
  summarizedError: "friendly failure",
  keepExistingOnError: true,
  existingPhraseCount: 5,
  practiceSourceCount: 2,
});
assert.equal(keptFailurePatch.statePatch.error, "");
assert.equal(Object.hasOwn(keptFailurePatch.statePatch, "phrases"), false);
assert.equal(keptFailurePatch.sourcePatch.error, "friendly failure");
const replacingFailurePatch = sourceSelection.failedPracticeSourcePatch({
  source: { id: "nl:auto", track: { kind: "asr" } },
  message: "raw failure",
  summarizedError: "friendly failure",
  keepExistingOnError: false,
  existingPhraseCount: 5,
  practiceSourceCount: 2,
});
assert.equal(replacingFailurePatch.statePatch.error, "friendly failure");
assert.equal(replacingFailurePatch.statePatch.phrases.length, 0);
assert.equal(replacingFailurePatch.statePatch.sourceMenuOpen, true);
const selectSourceState = {
  selectedSourceId: "manual-1",
  loading: false,
  sourceMenuOpen: true,
  practiceSources: [
    { id: "manual-1", name: "Manual" },
    { id: "auto-1", name: "Auto" },
  ],
};
let selectedSourceLoad = null;
assert.equal(await sourceLoadWorkflow.selectPracticeSource("auto-1", {
  getState: () => selectSourceState,
  loadPracticeSource: async (source, options) => {
    selectedSourceLoad = { source, options };
  },
}), true);
assert.equal(selectSourceState.sourceMenuOpen, false);
assert.equal(selectedSourceLoad.source.id, "auto-1");
assert.equal(selectedSourceLoad.options.persistSelection, true);
assert.equal(selectedSourceLoad.options.sourceSelectionReason, "manual-select");
assert.equal(await sourceLoadWorkflow.selectPracticeSource("manual-1", {
  getState: () => ({ ...selectSourceState, selectedSourceId: "manual-1" }),
  loadPracticeSource: async () => {
    throw new Error("should not load");
  },
}), false);
const refreshSourceState = {
  videoId: "video-refresh",
  loading: false,
  cacheRefreshRequested: false,
};
const refreshSourceCalls = [];
let refreshLoadOptions = null;
assert.equal(await sourceLoadWorkflow.refreshSelectedSourceCache({
  getState: () => refreshSourceState,
  getSelectedPracticeSource: () => ({ id: "nl:manual", name: "Dutch", track: { kind: "manual" } }),
  captionTracks: {
    sourceDisplayName: (source) => source.name,
  },
  recordDebugEvent: (type, detail) => refreshSourceCalls.push(`${type}:${detail.source}:${detail.videoId}`),
  render: () => refreshSourceCalls.push(`render:${refreshSourceState.cacheRefreshRequested}`),
  loadPracticeSource: async (_source, options) => {
    refreshLoadOptions = options;
    refreshSourceCalls.push("load");
  },
}), true);
assert.equal(refreshSourceState.cacheRefreshRequested, false);
assert.equal(refreshLoadOptions.refreshCache, true);
assert.equal(refreshLoadOptions.keepExistingOnError, true);
assert.equal(refreshLoadOptions.allowPreferredSourceSwitch, false);
assert.equal(refreshSourceCalls.join("|"), "cache-refresh-start:Dutch:video-refresh|render:true|load|render:false");
const sourceLoadState = {
  loadToken: 3,
  autoPause: true,
  phrases: [],
  practiceSources: [{ id: "nl:manual" }],
};
const sourceLoadSource = { id: "nl:manual", languageCode: "nl", track: { kind: "manual" } };
const sourceLoadEvents = [];
const sourceLoadBootDiagnostics = [];
const sourceLoadVideo = { currentTime: 12 };
let sourceLoadRenderCount = 0;
let sourceLoadPassiveEnsured = false;
let sourceLoadSynced = false;
let sourceLoadHeld = false;
let sourceLoadPersisted = null;
const sourceLoadTranscript = {
  retrievalPath: "backend-provider",
  sourceKind: "manual",
  timingExactness: "exact",
  cues: [{ startMs: 10000, endMs: 11000, text: "Hallo" }],
  retrievalAttempts: [{ path: "backend-provider", status: "ok" }],
};
await sourceLoadWorkflow.loadPracticeSource(sourceLoadSource, {
  preserveVideoTime: true,
  persistSelection: true,
  sourceSelectionReason: "unit-test",
  allowPreferredSourceSwitch: false,
}, {
  getState: () => sourceLoadState,
  applyStatePatch: (patch) => Object.assign(sourceLoadState, patch),
  applySourcePatch: (source, patch) => Object.assign(source, patch),
  getVideoElement: () => sourceLoadVideo,
  render: () => {
    sourceLoadRenderCount += 1;
  },
  videoLoadState,
  sourceSelection,
  transcriptMetadata: {
    summarizeTranscriptResult: () => ({ retrievalPath: "backend-provider", sourceKind: "manual" }),
    summarizeTranscriptError: (message) => `friendly ${message}`,
  },
  playbackTiming,
  captionTracks: { sourceDisplayName: (source) => source.id },
  phraseProgressStore: {
    read: async () => ({
      index: 0,
      reason: "phrase-id",
      progress: { currentIndex: 0, phraseCount: 1, updatedAt: "2026-06-30T10:00:00.000Z" },
    }),
  },
  sourceSelectionStore: {
    write: (source, reason) => {
      sourceLoadPersisted = { sourceId: source.id, reason };
    },
  },
  transcriptResultFromLoadedSource: () => null,
  fetchReusableTimingTranscriptResult: async () => null,
  fetchBestAvailableCues: async () => sourceLoadTranscript,
  phrasesFromTranscriptResult: () => [{ startMs: 10000, endMs: 11000, text: "Hallo" }],
  updateBootDiagnostics: (patch) => sourceLoadBootDiagnostics.push(patch),
  ensurePassivePlaybackWatcher: () => {
    sourceLoadPassiveEnsured = true;
  },
  syncPassivePlayback: () => {
    sourceLoadSynced = true;
  },
  recordDebugEvent: (event, details) => sourceLoadEvents.push({ event, details }),
  holdInitialAutoPauseAfterSourceLoad: () => {
    sourceLoadHeld = true;
  },
});
assert.equal(sourceLoadState.selectedSourceId, "nl:manual");
assert.equal(sourceLoadState.loading, false);
assert.equal(sourceLoadState.lastPhraseProgressRestore.reason, "phrase-id");
assert.equal(sourceLoadSource.loadedCueSource, "backend-provider");
assert.equal(sourceLoadVideo.currentTime, 10);
assert.equal(sourceLoadPersisted.reason, "unit-test");
assert.equal(sourceLoadBootDiagnostics.at(-1).selectedRetrievalPath, "backend-provider");
assert.equal(sourceLoadEvents.at(-1).event, "source-loaded");
assert.equal(sourceLoadPassiveEnsured, true);
assert.equal(sourceLoadSynced, true);
assert.equal(sourceLoadHeld, true);
assert.equal(sourceLoadRenderCount, 2);
const sourceLoadFailureState = {
  loadToken: 9,
  autoPause: false,
  phrases: [],
  practiceSources: [{ id: "nl:auto" }, { id: "nl:manual" }],
};
const sourceLoadFailureSource = { id: "nl:auto", languageCode: "nl", track: { kind: "asr" } };
const sourceLoadFailureEvents = [];
await sourceLoadWorkflow.loadPracticeSource(sourceLoadFailureSource, {
  keepExistingOnError: false,
  allowPreferredSourceSwitch: false,
}, {
  getState: () => sourceLoadFailureState,
  applyStatePatch: (patch) => Object.assign(sourceLoadFailureState, patch),
  applySourcePatch: (source, patch) => Object.assign(source, patch),
  getVideoElement: () => null,
  render: () => {},
  videoLoadState,
  sourceSelection,
  transcriptMetadata: {
    summarizeTranscriptResult: () => null,
    summarizeTranscriptError: (message) => `friendly ${message}`,
  },
  playbackTiming,
  captionTracks: { sourceDisplayName: (source) => source.id },
  phraseProgressStore: { read: async () => null },
  sourceSelectionStore: { write: () => {} },
  transcriptResultFromLoadedSource: () => null,
  fetchReusableTimingTranscriptResult: async () => null,
  fetchBestAvailableCues: async () => {
    throw new Error("provider down");
  },
  phrasesFromTranscriptResult: () => [],
  updateBootDiagnostics: () => {},
  ensurePassivePlaybackWatcher: () => {},
  syncPassivePlayback: () => {},
  recordDebugEvent: (event, details) => sourceLoadFailureEvents.push({ event, details }),
  holdInitialAutoPauseAfterSourceLoad: () => {},
});
assert.equal(sourceLoadFailureState.error, "friendly provider down");
assert.equal(sourceLoadFailureState.loading, false);
assert.equal(sourceLoadFailureSource.error, "friendly provider down");
assert.equal(sourceLoadFailureEvents.at(-1).event, "source-failed");
const autoPauseLoadState = {
  learningEnabled: true,
  autoPause: true,
  videoId: "video-1",
  selectedSourceId: "source-1",
  phrases: [
    { startMs: 0, endMs: 1000, text: "first" },
    { startMs: 1000, endMs: 2000, text: "second" },
  ],
  currentIndex: 0,
  lastPhraseProgressRestore: null,
  guidedMode: false,
  guidedHold: null,
  passivePausedKey: "",
};
const autoPauseLoadVideo = {
  currentTime: 1.25,
  paused: false,
  pause() {
    this.paused = true;
  },
};
const autoPauseLoadEvents = [];
assert.equal(sourceLoadWorkflow.holdInitialAutoPauseAfterSourceLoad({
  getState: () => autoPauseLoadState,
  getVideoElement: () => autoPauseLoadVideo,
  syncPassivePlayback: (video) => autoPauseLoadEvents.push({ type: "sync", currentTime: video.currentTime }),
  findPlaybackPhraseIndex: () => 1,
  phraseProgressStore: {
    schedule: (reason) => autoPauseLoadEvents.push({ type: "progress", reason }),
  },
  markCurrentTranscriptSegment: (phrase) => autoPauseLoadEvents.push({ type: "mark", phrase: phrase.text }),
  recordNavigationEvent: (event, detail) => autoPauseLoadEvents.push({ type: event, detail }),
  describePhraseAtIndex: (index) => `phrase-${index}`,
  getPlaybackSnapshot: () => ({ paused: autoPauseLoadVideo.paused }),
  nowMs: () => 12345,
}), true);
assert.equal(autoPauseLoadState.currentIndex, 1);
assert.equal(autoPauseLoadState.guidedMode, true);
assert.equal(autoPauseLoadState.guidedHold.createdAt, 12345);
assert.equal(autoPauseLoadState.passivePausedKey, "video-1:source-1:load");
assert.equal(autoPauseLoadVideo.paused, true);
assert.equal(autoPauseLoadEvents.find((event) => event.type === "sync").currentTime, 1.25);
assert.equal(autoPauseLoadEvents.find((event) => event.type === "progress").reason, "auto-pause-load-sync");
assert.equal(autoPauseLoadEvents.find((event) => event.type === "mark").phrase, "second");
assert.equal(autoPauseLoadEvents.at(-1).detail.currentPhrase, "phrase-1");
const sourceSwitchManual = { id: "nl:manual", languageCode: "nl", track: { kind: "manual" } };
const sourceSwitchAuto = { id: "nl:auto", languageCode: "nl", track: { kind: "asr" } };
const sourceSwitchState = {
  loadToken: 12,
  loading: false,
  selectedSourceId: "nl:auto",
  practiceSources: [sourceSwitchAuto, sourceSwitchManual],
};
const sourceSwitchEvents = [];
let sourceSwitchLoadCall = null;
const sourceSwitchResult = await sourceLoadWorkflow.maybeSwitchToPreferredSource({
  preserveVideoTime: true,
  reason: "unit-auto-switch",
}, {
  getState: () => sourceSwitchState,
  sourceSelection,
  sourceSelectionStore: {
    choosePreferred: () => ({ source: sourceSwitchManual, reason: "default-priority" }),
  },
  getSelectedPracticeSource: () => sourceSwitchAuto,
  captionTracks: { sourceDisplayName: (source) => source.id },
  recordDebugEvent: (event, details) => sourceSwitchEvents.push({ event, details }),
  loadPracticeSource: async (source, options) => {
    sourceSwitchLoadCall = { source, options };
  },
});
assert.equal(sourceSwitchResult, true);
assert.equal(sourceSwitchEvents[0].event, "source-auto-switch");
assert.equal(sourceSwitchEvents[0].details.from, "nl:auto");
assert.equal(sourceSwitchEvents[0].details.to, "nl:manual");
assert.equal(sourceSwitchLoadCall.source.id, "nl:manual");
assert.equal(sourceSwitchLoadCall.options.allowPreferredSourceSwitch, false);
assert.equal(sourceSwitchLoadCall.options.preserveVideoTime, true);

const noCaptionReadiness = sourceReadiness.practiceReadiness({ phraseCount: 0 });
assert.equal(noCaptionReadiness.state, "no-captions");
assert.equal(noCaptionReadiness.label, "No captions");
const preciseReadiness = sourceReadiness.practiceReadiness({ phraseCount: 2, result: { timingExactness: "word-level" } });
assert.equal(preciseReadiness.state, "precise");
assert.equal(preciseReadiness.label, "Precise");
const roughReadiness = sourceReadiness.practiceReadiness({ phraseCount: 2, result: { warnings: ["fallback"] } });
assert.equal(roughReadiness.state, "rough");
assert.equal(roughReadiness.label, "Rough");
const runningTimingState = sourceReadiness.timingOperationState({ operation: { state: "running" } });
assert.equal(runningTimingState.active, true);
assert.equal(runningTimingState.status, "running");
assert.equal(runningTimingState.copy, "Timing improvement is running.");
const appliedTimingState = sourceReadiness.timingOperationState({ operation: { state: "succeeded", appliedToActiveSource: true } });
assert.equal(appliedTimingState.active, false);
assert.equal(appliedTimingState.status, "succeeded");
assert.equal(appliedTimingState.copy, "Timing improvement applied to current captions.");
assert.equal(sourceReadiness.sourceWarningIsInformational("ASR job completed: 12 phrases."), true);
assert.equal(sourceReadiness.readinessCopy("precise"), "Phrase practice has the best available timing.");
const sourceToggleState = sourceSelector.sourceToggleState({
  selectedSource: practiceSources[1],
  sourceLabel: "Dutch · ASR timing",
  hasTracks: true,
  loading: false,
  sourceMenuOpen: true,
  readiness: { state: "precise" },
});
assert.equal(sourceToggleState.label, "Dutch · ASR timing");
assert.equal(sourceToggleState.expanded, true);
assert.equal(sourceToggleState.readinessState, "precise");
assert.equal(sourceSelector.sourceToggleState({ hasTracks: false }).label, "No captions");
const sourceActionState = sourceSelector.readinessActionState({
  cacheRefreshRequested: true,
  loading: false,
  selectedSource: practiceSources[1],
  timingState: { active: false },
  readiness: { state: "rough" },
});
assert.equal(sourceActionState.getCaptions.text, "Getting Captions");
assert.equal(sourceActionState.improveTiming.disabled, false);
assert.equal(sourceSelector.readinessActionState({
  selectedSource: practiceSources[1],
  timingState: {},
  readiness: { state: "precise" },
}).improveTiming.title, "This source already has the best available timing.");
assert.equal(sourceSelector.shouldOpenReadinessDetails({
  selectedSource: practiceSources[1],
  readiness: { state: "ready" },
  result: { retrievalPath: "backend-provider" },
}), true);
const readinessDetails = sourceSelector.readinessDetails({
  sourceLabel: "Dutch",
  provider: "YouTube",
  enrichment: "ASR timing",
  readiness: { label: "Precise" },
  phraseCount: 165,
  result: { retrievalPath: "practice-timing-cache" },
  timingState: { status: "succeeded" },
  staleReason: "text-source-revision-mismatch",
  timingApplied: false,
});
assert.equal(readinessDetails.map((detail) => detail.label).join("|"), [
  "Source",
  "Provider",
  "Timing enrichment",
  "Readiness",
  "Phrases",
  "Retrieval",
  "Timing",
  "Timing apply",
].join("|"));
const readinessPopoverState = sourceSelector.readinessPopoverState({
  cacheRefreshRequested: true,
  loading: false,
  selectedSource: practiceSources[1],
  timingState: { active: false, status: "succeeded", copy: "Timing improvement applied to current captions." },
  readiness: { state: "rough", label: "Rough" },
  result: { retrievalPath: "practice-timing-cache" },
  enrichment: "ASR timing",
  sourceLabel: "Dutch",
  provider: "YouTube",
  phraseCount: 165,
  practiceSourceCount: 3,
  staleReason: "text-source-revision-mismatch",
  timingApplied: false,
});
assert.equal(readinessPopoverState.actions.getCaptions.text, "Getting Captions");
assert.equal(readinessPopoverState.actions.improveTiming.disabled, false);
assert.equal(readinessPopoverState.operation.visible, true);
assert.equal(readinessPopoverState.operation.status, "succeeded");
assert.equal(readinessPopoverState.showSourceSelector, true);
assert.equal(readinessPopoverState.details.open, true);
assert.equal(readinessPopoverState.details.summary, "Details");
assert.equal(readinessPopoverState.details.rows.map((detail) => detail.label).join("|"), [
  "Source",
  "Provider",
  "Timing enrichment",
  "Readiness",
  "Phrases",
  "Retrieval",
  "Timing",
  "Timing apply",
].join("|"));
const sourceOptionState = sourceSelector.sourceOptionState({
  source: { id: "nl:asr", loadedTranscriptResult: { warnings: ["ASR job completed: 12 phrases."] } },
  selectedSourceId: "nl:manual",
  label: "ASR transcript",
  warningInformational: true,
});
assert.equal(sourceOptionState.sourceId, "nl:asr");
assert.equal(sourceOptionState.warningClass, "af-source-option-note");
const sourceOptionGroups = sourceSelector.sourceOptionGroups({
  groups: [{ label: "Dutch", sources: [
    { id: "nl:manual", loadedTranscriptResult: {} },
    { id: "nl:asr", loadedTranscriptResult: { warnings: ["ASR job completed: 12 phrases."] } },
  ] }],
  selectedSourceId: "nl:manual",
  labelForSource: (source) => source.id,
  warningInformationalForSource: (source) => source.id === "nl:asr",
});
assert.equal(sourceOptionGroups[0].label, "Dutch");
assert.equal(sourceOptionGroups[0].options[0].sourceId, "nl:manual");
assert.equal(sourceOptionGroups[0].options[0].selected, true);
assert.equal(sourceOptionGroups[0].options[1].warningClass, "af-source-option-note");
const sourceTrack = createTestElement("div");
const sourceToggle = createTestElement("button");
const sourceMenu = createTestElement("div");
assert.equal(
  sourceSelectorDom.renderSourceToggle(sourceTrack, sourceToggle, sourceMenu, {
    label: "Dutch",
    disabled: false,
    expanded: true,
    readinessState: "rough",
    open: true,
  }, {
    clearElement: (element) => {
      element.children = [];
    },
  }),
  true,
);
assert.equal(sourceToggle.children[1].textContent, "Dutch");
assert.equal(sourceToggle.attributes["aria-expanded"], "true");
assert.equal(sourceToggle.dataset.afReadiness, "rough");
assert.equal(sourceTrack.classList.contains("is-open"), true);
let selectedSourceFromDom = "";
let getCaptionsClicked = false;
let improveTimingClicked = false;
sourceSelectorDom.renderReadinessPopover(sourceMenu, {
  readiness: { label: "Rough" },
  readinessCopy: "Captions are usable but timing can improve.",
  popoverState: readinessPopoverState,
  sourceOptionGroups,
  onGetCaptions: () => {
    getCaptionsClicked = true;
  },
  onImproveTiming: () => {
    improveTimingClicked = true;
  },
  onSelectSource: (sourceId) => {
    selectedSourceFromDom = sourceId;
  },
});
assert.equal(sourceMenu.children[0].children[0].textContent, "Rough");
assert.equal(sourceMenu.children[1].children[0].dataset.afReadinessGetCaptions, "");
sourceMenu.children[1].children[0].listeners.click[0].listener({
  preventDefault() {},
  stopPropagation() {},
});
sourceMenu.children[1].children[1].listeners.click[0].listener({
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(getCaptionsClicked, true);
assert.equal(improveTimingClicked, true);
const sourceOptionButton = sourceMenu.children.find((child) => child.dataset?.afSourceId === "nl:manual");
assert.equal(sourceOptionButton.classList.contains("is-selected"), true);
sourceOptionButton.listeners.click[0].listener();
assert.equal(selectedSourceFromDom, "nl:manual");
let workflowPopoverInput = null;
let workflowRefreshCalled = false;
let workflowImproveCalled = false;
let workflowSelectSource = "";
sourceSelectorWorkflow.renderReadinessPopover(createTestElement("div"), {
  state: {
    cacheRefreshRequested: false,
    loading: false,
    phrases: [{ text: "one" }],
    practiceSources: [
      { id: "manual-1", loadedTranscriptResult: { retrievalPath: "backend-provider" } },
      { id: "auto-1", loadedTranscriptResult: { warnings: ["estimated timing"] } },
    ],
    selectedSourceId: "manual-1",
    timingOperation: { result: { applicability: { staleReason: "stale" } }, appliedToActiveSource: false },
  },
  selectedSource: { id: "manual-1", loadedTranscriptResult: { retrievalPath: "backend-provider" } },
  readiness: { state: "rough", label: "Rough" },
  timingOperationState: () => ({ status: "queued", copy: "Improving" }),
  userFacingSourceLabel: (source) => source.id === "manual-1" ? "Manual captions" : "Auto captions",
  sourceSelector,
  sourceSelectorDom: {
    renderReadinessPopover(_sourceMenu, input) {
      workflowPopoverInput = input;
    },
  },
  sourceReadiness,
  sourceLabels: {
    timingEnrichmentLabel: () => "ASR timing",
    sourceProviderLabel: () => "Backend",
  },
  captionTracks: {
    groupPracticeSources: (sources) => [{ label: "Text Source", sources }],
  },
  onGetCaptions: () => {
    workflowRefreshCalled = true;
  },
  onImproveTiming: () => {
    workflowImproveCalled = true;
  },
  onSelectSource: (sourceId) => {
    workflowSelectSource = sourceId;
  },
});
assert.equal(workflowPopoverInput.readinessCopy, "Phrase practice is available, but timing or source quality may be rough.");
assert.equal(workflowPopoverInput.popoverState.operation.status, "queued");
assert.equal(workflowPopoverInput.popoverState.details.rows.find((row) => row.label === "Provider").value, "Backend");
assert.equal(workflowPopoverInput.sourceOptionGroups[0].options[0].label, "Manual captions");
workflowPopoverInput.onGetCaptions();
workflowPopoverInput.onImproveTiming();
workflowPopoverInput.onSelectSource("auto-1");
assert.equal(workflowRefreshCalled, true);
assert.equal(workflowImproveCalled, true);
assert.equal(workflowSelectSource, "auto-1");
const workflowSourceSelectorState = {
  tracks: [{ languageCode: "nl" }],
  loading: false,
  sourceMenuOpen: true,
  phrases: [{ text: "one" }],
  practiceSources: [{ id: "manual-1", loadedTranscriptResult: {} }],
  selectedSourceId: "manual-1",
  cacheRefreshRequested: false,
};
const workflowSourceSelectorCalls = [];
let workflowSourceSelectorInput = null;
sourceSelectorWorkflow.renderSourceSelector(createTestElement("div"), createTestElement("button"), createTestElement("div"), {
  state: workflowSourceSelectorState,
  getSelectedPracticeSource: () => ({ id: "manual-1", loadedTranscriptResult: {} }),
  practiceReadiness: () => ({ state: "ready", label: "Ready" }),
  timingOperationState: () => null,
  userFacingSourceLabel: () => "Dutch captions",
  sourceSelector,
  sourceSelectorDom: {
    renderSourceToggle(_track, _sourceToggle, _sourceMenu, toggleState, options) {
      workflowSourceSelectorCalls.push(`${toggleState.label}:${toggleState.open}`);
      options.clearElement(_sourceMenu);
      return toggleState.open;
    },
    renderReadinessPopover(_sourceMenu, input) {
      workflowSourceSelectorInput = input;
    },
  },
  sourceReadiness,
  sourceLabels: {
    timingEnrichmentLabel: () => "",
    sourceProviderLabel: () => "",
  },
  captionTracks: {
    groupPracticeSources: (sources) => [{ label: "Text Source", sources }],
  },
  clearElement: () => workflowSourceSelectorCalls.push("clear"),
  onGetCaptions: () => {},
  onImproveTiming: () => {},
  onSelectSource: () => {},
});
assert.equal(workflowSourceSelectorCalls.join("|"), "Dutch captions:true|clear");
assert.equal(
  workflowSourceSelectorInput.popoverState.details.rows.find((row) => row.label === "Source").value,
  "Dutch captions",
);
const manualTimingPayload = sourceReadiness.buildPracticeTimingPayload({
  videoId: "video-1",
  source: {
    languageCode: "nl",
    track: { kind: "manual" },
    loadedTranscriptResult: {
      languageCode: "nl",
      sourceKind: "manual",
      practiceArtifact: {
        snapshotRevisionId: "snapshot-1",
        textSourceRevisionId: "text-1",
        timingEvidenceRevisionId: "timing-1",
      },
    },
  },
});
assert.equal(manualTimingPayload.sourceKind, "manual");
assert.equal(manualTimingPayload.textSource, "manual");
assert.equal(manualTimingPayload.snapshotRevisionId, "snapshot-1");
const autoTimingPayload = sourceReadiness.buildPracticeTimingPayload({
  videoId: "video-1",
  textSourceOverride: "asr",
  source: { languageCode: "nl", track: { kind: "asr" }, loadedTranscriptResult: { languageCode: "nl" } },
});
assert.equal(autoTimingPayload.sourceKind, "auto");
assert.equal(autoTimingPayload.textSource, "asr");
assert.equal(sourceReadiness.readableTimingError(new Error("401 unauthorized")), "Timing improvement needs a tester token for this backend.");

let playerMetadataExtractCalls = 0;
const inlinePlayerResponse = await playerMetadataWorkflow.waitForPlayerResponse({
  extractPlayerResponse: () => {
    playerMetadataExtractCalls += 1;
    return playerMetadataExtractCalls === 2 ? { videoDetails: { videoId: "video-1" } } : null;
  },
  fetchFreshPlayerResponse: async () => {
    throw new Error("should not fetch");
  },
  delay: async () => {},
});
assert.equal(inlinePlayerResponse.videoDetails.videoId, "video-1");
assert.equal(playerMetadataExtractCalls, 2);
const playerMetadataEvents = [];
const freshPlayerResponse = await playerMetadataWorkflow.fetchFreshPlayerResponse({
  videoId: "video 1",
  youtubeAdapter: {
    extractPlayerResponseFromText: (html, videoId) => ({ html, videoDetails: { videoId } }),
    getCaptionTracks: () => [{ languageCode: "nl" }, { languageCode: "en" }],
  },
  fetch: async (url, options) => ({
    ok: true,
    status: 200,
    text: async () => `html:${url}:${options.cache}`,
  }),
  recordDebugEvent: (type, detail) => playerMetadataEvents.push({ type, detail }),
});
assert.equal(freshPlayerResponse.videoDetails.videoId, "video 1");
assert.equal(freshPlayerResponse.html, "html:https://www.youtube.com/watch?v=video%201:no-store");
assert.equal(playerMetadataEvents[0].type, "player-metadata-fetch-start");
assert.equal(playerMetadataEvents[1].detail.tracks, 2);
await assert.rejects(
  () => playerMetadataWorkflow.fetchFreshPlayerResponse({
    videoId: "video-1",
    youtubeAdapter: { extractPlayerResponseFromText: () => null },
    fetch: async () => ({ ok: false, status: 503, text: async () => "" }),
  }),
  /HTTP 503/,
);

const transcriptSegment = createTestElement("span");
transcriptSegment.dataset.afCurrent = "true";
let transcriptPanelClosed = false;
transcriptPanelDom.resetTranscriptPanelState({
  document: {
    documentElement: { dataset: { afTranscriptVideoId: "old-video" } },
    querySelectorAll: () => [transcriptSegment],
  },
  previousVideoId: "old-video",
  currentVideoId: "new-video",
  closeOpenTranscriptPanels: () => {
    transcriptPanelClosed = true;
  },
});
assert.equal(transcriptSegment.dataset.afCurrent, undefined);
assert.equal(transcriptPanelClosed, true);
const transcriptCloseButton = createTestElement("button");
let transcriptCloseActivated = false;
const transcriptPanelClosedByDom = transcriptPanelDom.closeOpenTranscriptPanels({
  document: { querySelectorAll: () => [transcriptCloseButton] },
  domUtils: {
    isVisibleElement: (element) => element === transcriptCloseButton,
    activateElement: () => {
      transcriptCloseActivated = true;
    },
  },
});
assert.equal(transcriptPanelClosedByDom, true);
assert.equal(transcriptCloseActivated, true);
const transcriptSegments = [createTestElement("transcript-segment-view-model"), createTestElement("transcript-segment-view-model")];
transcriptSegments[0].dataset.afCurrent = "true";
let transcriptScrolled = false;
transcriptSegments[1].scrollIntoView = (options) => {
  transcriptScrolled = options.block === "nearest" && options.inline === "nearest";
};
const transcriptMarkerApplied = transcriptPanelDom.markCurrentTranscriptSegment({
  document: {
    querySelectorAll: (selector) => selector === "transcript-segment-view-model" ? transcriptSegments : [],
  },
  phrase: { cues: [{ segmentIndex: 1, segmentSelector: "modern" }] },
});
assert.equal(transcriptMarkerApplied, true);
assert.equal(transcriptSegments[0].dataset.afCurrent, undefined);
assert.equal(transcriptSegments[1].dataset.afCurrent, "true");
assert.equal(transcriptScrolled, true);

const segmentedBinding = sourceBinding.createDictionarySourceBinding({
  word: "rode",
  phraseIndex: 0,
  selection: { tokenIndex: 5, charStart: 29, charEnd: 33 },
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{
    index: 0,
    startMs: 10000,
    endMs: 14000,
    text: "de kleine rode ster",
    displayText: "De onderzoeker vertelde dat de kleine rode ster al jaren wordt gevolgd.",
    displayStartChar: 29,
    displayEndChar: 48,
    displaySegmentId: "sentence-1",
    segmentRole: "sentence-segment",
  }],
  source: {
    languageCode: "nl",
    track: { kind: "manual", vssId: ".nl" },
    loadedTranscriptResult: {
      languageCode: "nl",
      timingExactness: "exact",
      practiceArtifact: {
        producer: "audiofilms_backend",
        phraseSetRevisionId: "phrase-set:1",
      },
    },
  },
});
assert.equal(segmentedBinding.phrase.text, "de kleine rode ster");
assert.equal(segmentedBinding.phrase.displayText, "De onderzoeker vertelde dat de kleine rode ster al jaren wordt gevolgd.");
assert.equal(segmentedBinding.phrase.displaySegmentId, "sentence-1");
assert.equal(
  sourceBinding.buildDictionaryActionSourceContext({ binding: segmentedBinding }).selection.contextText,
  segmentedBinding.phrase.displayText,
);

const savedPhrases = [
  { startMs: 1000, endMs: 2000, text: "Een korte zin." },
  { index: 4, startMs: 3000.4, endMs: 4500.6, text: "Tweede zin met stabiele tekst." },
];
const savedProgress = phraseProgress.buildProgress({
  phrases: savedPhrases,
  currentIndex: 1,
  now: new Date("2026-06-29T12:00:00.000Z"),
});
assert.equal(phraseProgress.progressKey({ videoId: "video-1", sourceId: "nl:manual" }), "video-1::nl:manual");
assert.equal(savedProgress.currentIndex, 1);
assert.equal(savedProgress.phraseCount, 2);
assert.equal(savedProgress.updatedAt, "2026-06-29T12:00:00.000Z");
assert.equal(phraseProgress.restoreIndexFromProgress(savedProgress, savedPhrases).index, 1);
assert.equal(phraseProgress.restoreIndexFromProgress({ currentIndex: 99 }, savedPhrases).index, 1);
const phraseProgressStorageMessages = [];
const phraseProgressStorageEvents = [];
const phraseProgressStorageTimers = new Map();
let phraseProgressStorageTimerId = 0;
const phraseProgressStorageState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: savedPhrases,
  currentIndex: 1,
};
const phraseProgressStore = phraseProgressStorage.createPhraseProgressStore({
  window: {
    setTimeout(callback) {
      phraseProgressStorageTimerId += 1;
      phraseProgressStorageTimers.set(phraseProgressStorageTimerId, callback);
      return phraseProgressStorageTimerId;
    },
    clearTimeout(id) {
      phraseProgressStorageTimers.delete(id);
    },
  },
  phraseProgress,
  state: phraseProgressStorageState,
  saveDelayMs: 1,
  sendMessage: async (message) => {
    phraseProgressStorageMessages.push(message);
    if (message.type === "af-get-phrase-progress") return { ok: true, progress: savedProgress };
    if (message.type === "af-set-phrase-progress") return { ok: true };
    return { ok: false, error: "unexpected phrase progress message" };
  },
  recordDebugEvent: (event, details) => phraseProgressStorageEvents.push({ event, details }),
});
assert.equal(phraseProgressStore.key(), "video-1::nl:manual");
assert.equal((await phraseProgressStore.read("nl:manual", savedPhrases)).index, 1);
phraseProgressStore.schedule("first");
assert.equal(phraseProgressStorageTimers.size, 1);
phraseProgressStore.cancel();
assert.equal(phraseProgressStorageTimers.size, 0);
phraseProgressStore.schedule("second");
assert.equal(phraseProgressStorageTimers.size, 1);
const scheduledPhraseProgressSave = [...phraseProgressStorageTimers.values()][0];
scheduledPhraseProgressSave();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(phraseProgressStorageMessages.at(-1).type, "af-set-phrase-progress");
assert.equal(phraseProgressStorageMessages.at(-1).key, "video-1::nl:manual");
assert.equal(phraseProgressStorageEvents.at(-1).event, "phrase-progress-saved");

const mockLookupResponse = dictionaryMocks.dictionaryMockResponse(
  "dict-lookup",
  { clickedForm: "appel", sourceLanguageCode: "nl" },
  "cards",
  { now: new Date("2026-06-29T12:00:00.000Z") },
);
const mockLookup = JSON.parse(mockLookupResponse.text);
assert.equal(mockLookupResponse.ok, true);
assert.equal(mockLookup.cards.length, 3);
assert.equal(mockLookup.cards[0].displayActions[0].label, "Start Learning");
assert.equal(mockLookup.cards[0].progress.lastSeenAt, "2026-06-29T12:00:00.000Z");

const generatedNoMatchResponse = dictionaryMocks.dictionaryMockResponse(
  "dict-lookup",
  { clickedForm: "gedoe" },
  "generated",
);
assert.equal(generatedNoMatchResponse.ok, false);
assert.equal(generatedNoMatchResponse.status, 404);
assert.equal(JSON.parse(generatedNoMatchResponse.text).code, "no_match");

const mockSearchResponse = dictionaryMocks.dictionaryMockResponse(
  "dict-search",
  { clickedForm: "appel", group: "definitions" },
  "cards",
);
const mockSearch = JSON.parse(mockSearchResponse.text);
assert.equal(mockSearch.groups.length, 1);
assert.equal(mockSearch.groups[0].id, "definitions");

const selectedWordState = dictionaryState.initialSelectedWord({
  word: "bouwen",
  phraseIndex: 2,
  selection: { tokenIndex: 1 },
  sourceBinding: { videoId: "video-1" },
  preserveSelectedSpan: true,
  lookupSeq: 7,
});
assert.equal(selectedWordState.lookupStatus, "loading");
assert.equal(selectedWordState.lookupSeq, 7);
assert.equal(selectedWordState.preserveSelectedSpan, true);
const lookupReadyState = dictionaryState.lookupReady(selectedWordState, { cards: [{ id: "card-1" }] });
assert.equal(lookupReadyState.lookupStatus, "ready");
assert.equal(lookupReadyState.groupedSearchStatus, "loading");
const lookupErrorState = dictionaryState.lookupError(selectedWordState, { payload: { error: "not_found", translateUrl: "https://translate.test" } });
assert.equal(lookupErrorState.lookupStatus, "error");
assert.equal(lookupErrorState.lookupError, "not_found");
assert.equal(lookupErrorState.translateUrl, "https://translate.test");
const mergedSearch = dictionaryState.mergeGroupedSearchResult(
  { groups: [{ id: "definitions", items: [{ id: "a" }] }, { id: "examples", items: [] }] },
  { groups: [{ id: "definitions", items: [{ id: "b" }] }] },
  "definitions",
);
assert.equal(mergedSearch.groups[0].items.map((item) => item.id).join("|"), "a|b");
const searchUnavailable = dictionaryState.groupedSearchError(selectedWordState, { payload: { error: "search_index_not_ready" } });
assert.equal(searchUnavailable.groupedSearchStatus, "unavailable");
assert.equal(searchUnavailable.groupedSearchError, "Search previews are still being prepared.");
const toggleSearchOpen = dictionaryState.toggleSearchItem(selectedWordState, { entry: { id: "entry-1" } }, "definitions:entry-1");
assert.equal(toggleSearchOpen.shouldLoad, true);
assert.equal(toggleSearchOpen.selectedWord.groupedSearchCardsByKey["definitions:entry-1"].status, "loading");
const itemReady = dictionaryState.searchItemCardReady(toggleSearchOpen.selectedWord, { entry: { id: "entry-1" } }, "definitions:entry-1", { cards: [] });
assert.equal(itemReady.groupedSearchCardsByKey["definitions:entry-1"].status, "ready");
const itemError = dictionaryState.searchItemCardError(toggleSearchOpen.selectedWord, { entry: { id: "entry-1" } }, "definitions:entry-1", new Error("lookup failed"));
assert.equal(itemError.groupedSearchCardsByKey["definitions:entry-1"].error, "Error: lookup failed");
let lookupWorkflowSelectedWord = dictionaryState.initialSelectedWord({
  word: "bouwen",
  phraseIndex: 0,
  sourceBinding: { videoId: "video-1", phrase: { text: "ik bouw een huis" } },
  lookupSeq: 10,
});
const lookupWorkflowEvents = [];
let lookupWorkflowRenderCount = 0;
let lookupWorkflowGroupedContext = "";
const lookupWorkflowOptions = {
  getSelectedWord: () => lookupWorkflowSelectedWord,
  setSelectedWord: (selectedWord) => {
    lookupWorkflowSelectedWord = selectedWord;
  },
  phraseForSelectedWord: (selectedWord) => selectedWord.sourceBinding?.phrase,
  getSelectedPracticeSource: () => ({ languageCode: "nl" }),
  dictionaryCommands,
  dictionaryState,
  dictionaryPresentation,
  phraseTranslations,
  fetchDictionaryResult: async (request) => {
    assert.equal(request.word, "bouwen");
    return { cards: [{ id: "card-1" }], meta: { provider: "mock", commandTimings: { totalMs: 7 } } };
  },
  fetchDictionarySearchResult: async () => ({ groups: [] }),
  isCurrentLookup: (selectedWord) => selectedWord.lookupSeq === lookupWorkflowSelectedWord.lookupSeq,
  loadGroupedDictionarySearch: (_selectedWord, context) => {
    lookupWorkflowGroupedContext = context;
  },
  recordDebugEvent: (type, detail) => lookupWorkflowEvents.push({ type, detail }),
  render: () => {
    lookupWorkflowRenderCount += 1;
  },
  nowMs: (() => {
    let now = 1000;
    return () => {
      now += 5;
      return now;
    };
  })(),
};
const selectLookupState = {
  dictionaryLookupSeq: 3,
  exampleExpansionOverrides: { old: true },
  visibleTranslationsByCardId: { old: true },
  translationPendingByCardId: { old: true },
  cardActionFeedbackByCardId: { old: { status: "saved" } },
  cardMenuOpenId: "old-card",
  cardMenuFeedbackByCardId: { old: "ok" },
  selectedSpan: { text: "keep me" },
  selectedWord: null,
  currentIndex: 0,
};
const selectLookupEvents = [];
const selectedLookupWord = dictionaryLookupWorkflow.selectLookupWord("Hoog", 2, { tokenIndex: 1 }, {
  preserveSelectedSpan: true,
}, {
  getState: () => selectLookupState,
  createDictionarySourceBinding: (word, phraseIndex, selection) => ({ word, phraseIndex, selection, phrase: { text: "context" } }),
  dictionaryState,
  phraseProgressStore: {
    schedule: (reason) => selectLookupEvents.push(`progress:${reason}`),
  },
  render: () => selectLookupEvents.push("render"),
  lookupSelectedWord: (selectedWord) => selectLookupEvents.push(`lookup:${selectedWord.lookupSeq}`),
});
assert.equal(selectedLookupWord.word, "Hoog");
assert.equal(selectedLookupWord.lookupSeq, 4);
assert.equal(selectLookupState.selectedSpan.text, "keep me");
assert.equal(Object.keys(selectLookupState.visibleTranslationsByCardId).length, 0);
assert.equal(selectLookupState.cardMenuOpenId, "");
assert.equal(selectLookupState.currentIndex, 2);
assert.equal(selectLookupEvents.join("|"), "progress:lookup-word|render|lookup:4");
await dictionaryLookupWorkflow.lookupSelectedWord(lookupWorkflowSelectedWord, lookupWorkflowOptions);
assert.equal(lookupWorkflowSelectedWord.lookupStatus, "ready");
assert.equal(lookupWorkflowGroupedContext, "ik bouw een huis");
assert.equal(lookupWorkflowEvents[0].type, "dictionary-lookup-loaded");
assert.equal(lookupWorkflowRenderCount, 1);
await dictionaryLookupWorkflow.loadGroupedDictionarySearch(lookupWorkflowSelectedWord, "context", {
  ...lookupWorkflowOptions,
  fetchDictionarySearchResult: async () => ({ groups: [{ id: "examples", items: [{ id: "a" }] }], meta: { commandTimings: { totalMs: 4 } } }),
});
assert.equal(lookupWorkflowSelectedWord.groupedSearchStatus, "ready");
assert.equal(lookupWorkflowSelectedWord.groupedSearchResult.groups[0].id, "examples");
await dictionaryLookupWorkflow.loadDictionarySearchItemCard(
  lookupWorkflowSelectedWord,
  { entry: { id: "entry-1", headword: "gebouw" }, field: { text: "gebouw text" } },
  "examples::entry-1::0",
  {
    ...lookupWorkflowOptions,
    fetchDictionaryResult: async (request) => {
      assert.equal(request.word, "gebouw");
      return { cards: [{ id: "entry-1" }] };
    },
  },
);
assert.equal(lookupWorkflowSelectedWord.groupedSearchCardsByKey["examples::entry-1::0"].status, "ready");
let lookupWorkflowLoadedItemKey = "";
await dictionaryLookupWorkflow.toggleDictionarySearchItem(
  lookupWorkflowSelectedWord,
  { entry: { id: "entry-2", headword: "huis" }, field: { text: "huis text" } },
  "examples::entry-2::0",
  {
    ...lookupWorkflowOptions,
    loadDictionarySearchItemCard: (_selectedWord, _item, itemKey) => {
      lookupWorkflowLoadedItemKey = itemKey;
    },
  },
);
assert.equal(lookupWorkflowLoadedItemKey, "examples::entry-2::0");
assert.equal(lookupWorkflowSelectedWord.groupedSearchExpandedByKey["examples::entry-2::0"], true);
let visibleTranslationsByCardId = {};
let translationPendingByCardId = {};
let postedTranslationCommand = null;
const translationWorkflowOptions = {
  ...lookupWorkflowOptions,
  getVisibleTranslationsByCardId: () => visibleTranslationsByCardId,
  setVisibleTranslationsByCardId: (next) => {
    visibleTranslationsByCardId = next;
  },
  getTranslationPendingByCardId: () => translationPendingByCardId,
  setTranslationPendingByCardId: (next) => {
    translationPendingByCardId = next;
  },
  generatedDraftItemFromOverlayCard: generatedEntries.generatedDraftItemFromOverlayCard,
  requestDictionaryCardTranslation: (card) =>
    dictionaryLookupWorkflow.requestDictionaryCardTranslation(card, translationWorkflowOptions),
  postDictionaryCommand: async (command, payload) => {
    postedTranslationCommand = { command, payload };
    return { headword: "building" };
  },
};
assert.equal(dictionaryLookupWorkflow.toggleCardTranslation(
  { id: "card-with-lookup", entryId: "entry-3", headwordTranslation: "gebouw" },
  translationWorkflowOptions,
), true);
assert.equal(visibleTranslationsByCardId["card-with-lookup"], true);
assert.equal(postedTranslationCommand, null);
await dictionaryLookupWorkflow.requestDictionaryCardTranslation(
  { id: "card-needs-command", entryId: "entry-4" },
  translationWorkflowOptions,
);
assert.equal(postedTranslationCommand.command, "dict-translation");
assert.equal(postedTranslationCommand.payload.entryId, "entry-4");
assert.equal(lookupWorkflowSelectedWord.translationsByCardId["card-needs-command"].headword, "building");
assert.equal("card-needs-command" in translationPendingByCardId, false);
let failedLookupSelectedWord = dictionaryState.initialSelectedWord({
  word: "falen",
  phraseIndex: 0,
  sourceBinding: { videoId: "video-1", phrase: { text: "context" } },
  lookupSeq: 11,
});
await dictionaryLookupWorkflow.lookupSelectedWord(failedLookupSelectedWord, {
  ...lookupWorkflowOptions,
  getSelectedWord: () => failedLookupSelectedWord,
  setSelectedWord: (selectedWord) => {
    failedLookupSelectedWord = selectedWord;
  },
  fetchDictionaryResult: async () => {
    const error = new Error("lookup failed");
    error.payload = { error: "not_found", translateUrl: "https://translate.test" };
    throw error;
  },
  isCurrentLookup: (selectedWord) => selectedWord.lookupSeq === failedLookupSelectedWord.lookupSeq,
});
assert.equal(failedLookupSelectedWord.lookupStatus, "error");
assert.equal(failedLookupSelectedWord.lookupError, "not_found");
assert.equal(dictionaryAudio.cardAudioPlayable({ audio: { primaryUrl: "https://audio.test/a.mp3" } }), true);
assert.equal(dictionaryAudio.cardAudioPlayable({ audio: { resolveToken: "token-1" } }), true);
assert.equal(dictionaryAudio.cardAudioPlayable({ audio: {} }), false);
assert.equal(dictionaryAudio.audioPendingState({}, "card-1", true)["card-1"], true);
assert.equal("card-1" in dictionaryAudio.audioPendingState({ "card-1": true }, "card-1", false), false);
assert.equal(dictionaryAudio.audioResolvePayload({ id: "card-1", audio: { resolveToken: "token-1" } }).resolveToken, "token-1");
assert.equal(dictionaryAudio.resolvedAudioUrl({ audio: { primaryUrl: "https://audio.test/direct.mp3" } }), "https://audio.test/direct.mp3");
assert.equal(
  dictionaryAudio.resolvedAudioUrl(
    {},
    { status: "ready", asset: { url: "https://audio.test/resolved.mp3" } },
  ).url,
  "https://audio.test/resolved.mp3",
);
assert.equal(dictionaryAudio.resolvedAudioUrl({}, { status: "pending" }).error, "Audio is not ready.");
const audioWorkflowEvents = [];
const audioWorkflowPending = [];
const playedAudioUrls = [];
class TestAudio {
  constructor(url) {
    this.url = url;
    playedAudioUrls.push(url);
  }
  play() {
    return Promise.resolve();
  }
}
await dictionaryAudioWorkflow.playHeadwordAudio({
  id: "card-direct",
  headword: "bouwen",
  audio: { primaryUrl: "https://audio.test/direct.mp3", source: "direct" },
}, {
  AudioConstructor: TestAudio,
  titleForCard: (card) => card.headword,
  recordDebugEvent: (type, detail) => audioWorkflowEvents.push({ type, detail }),
});
assert.equal(playedAudioUrls[0], "https://audio.test/direct.mp3");
assert.equal(audioWorkflowEvents[0].type, "headword-audio-play");
const resolvedWorkflowUrl = await dictionaryAudioWorkflow.resolveHeadwordAudioUrl({
  id: "card-resolve",
  headword: "lopen",
  audio: { resolveToken: "token-1" },
}, {
  titleForCard: (card) => card.headword,
  postDictionaryCommand: async (operation, payload) => {
    assert.equal(operation, "audio-resolve");
    assert.equal(payload.resolveToken, "token-1");
    return { status: "ready", asset: { url: "https://audio.test/resolved.mp3", cache: "hit" } };
  },
  setPending: (cardId, pending) => audioWorkflowPending.push(`${cardId}:${pending}`),
  recordDebugEvent: (type, detail) => audioWorkflowEvents.push({ type, detail }),
});
assert.equal(resolvedWorkflowUrl, "https://audio.test/resolved.mp3");
assert.equal(audioWorkflowPending.join("|"), "card-resolve:true|card-resolve:false");
assert.equal(audioWorkflowEvents.some((event) => event.type === "headword-audio-resolved" && event.detail.cache === "hit"), true);
const failedWorkflowUrl = await dictionaryAudioWorkflow.resolveHeadwordAudioUrl({
  id: "card-fail",
  headword: "gaan",
  audio: { resolveToken: "token-fail" },
}, {
  titleForCard: (card) => card.headword,
  postDictionaryCommand: async () => ({ status: "pending" }),
  setPending: (cardId, pending) => audioWorkflowPending.push(`${cardId}:${pending}`),
  recordDebugEvent: (type, detail) => audioWorkflowEvents.push({ type, detail }),
});
assert.equal(failedWorkflowUrl, "");
assert.equal(audioWorkflowEvents.some((event) => event.type === "headword-audio-failed" && event.detail.error === "Audio is not ready."), true);
let actionWorkflowSelectedWord = {
  word: "bouwen",
  lookupSeq: 1,
  sourceBinding: { videoId: "video-1" },
};
const actionWorkflowFeedback = {};
const actionWorkflowCommands = [];
let actionWorkflowReloaded = false;
let actionWorkflowRenderCount = 0;
await dictionaryActionWorkflow.performDictionaryCardAction(
  { id: "card-1", entryId: "entry-1" },
  { id: "known", label: "Known" },
  { action: "mark-known" },
  {
    getSelectedWord: () => actionWorkflowSelectedWord,
    setSelectedWord: (selectedWord) => {
      actionWorkflowSelectedWord = selectedWord;
    },
    setCardFeedback: (cardId, feedback) => {
      actionWorkflowFeedback[cardId] = feedback;
    },
    buildPayload: () => ({ ok: true, value: { action: "mark-known", entryId: "entry-1" } }),
    postDictionaryCommand: async (operation, payload) => {
      actionWorkflowCommands.push({ operation, payload });
      return { ok: true };
    },
    isCurrentLookup: (selectedWord) => selectedWord.lookupSeq === actionWorkflowSelectedWord.lookupSeq,
    reloadLookup: async () => {
      actionWorkflowReloaded = true;
    },
    render: () => {
      actionWorkflowRenderCount += 1;
    },
  },
);
assert.equal(actionWorkflowCommands[0].operation, "dict-action");
assert.equal(actionWorkflowFeedback["card-1"].status, "saved");
assert.equal(actionWorkflowFeedback["card-1"].message, "Marked known");
assert.equal(actionWorkflowReloaded, true);
assert.equal(actionWorkflowRenderCount, 2);
let failedActionSelectedWord = { word: "bouwen", lookupSeq: 2 };
const failedActionFeedback = {};
await dictionaryActionWorkflow.performDictionaryCardAction(
  { id: "card-2", entryId: "entry-2" },
  { id: "known", label: "Known" },
  { action: "mark-known" },
  {
    getSelectedWord: () => failedActionSelectedWord,
    setSelectedWord: (selectedWord) => {
      failedActionSelectedWord = selectedWord;
    },
    setCardFeedback: (cardId, feedback) => {
      failedActionFeedback[cardId] = feedback;
    },
    buildPayload: () => ({ ok: true, value: { action: "mark-known", entryId: "entry-2" } }),
    postDictionaryCommand: async () => {
      throw new Error("backend failed");
    },
    isCurrentLookup: () => true,
    render: () => {},
  },
);
assert.equal(failedActionSelectedWord.cardActionError, "backend failed");
assert.equal(failedActionFeedback["card-2"].status, "error");
let invalidActionSelectedWord = { word: "bouwen", lookupSeq: 3 };
await dictionaryActionWorkflow.performDictionaryCardAction(
  { id: "card-3", entryId: "entry-3" },
  { id: "known", label: "Known" },
  { action: "mark-known" },
  {
    getSelectedWord: () => invalidActionSelectedWord,
    setSelectedWord: (selectedWord) => {
      invalidActionSelectedWord = selectedWord;
    },
    buildPayload: () => ({ ok: false, error: "missing source" }),
    render: () => {},
  },
);
assert.equal(invalidActionSelectedWord.cardActionError, "missing source");

const presentedCard = {
  partOfSpeech: "ww",
  meaningId: 2,
  dictionary: { slug: "vandale" },
  chips: [
    { kind: "part-of-speech", label: "ww" },
    { kind: "part-of-speech", label: "idiom" },
    { kind: "list", label: "2k", value: "nt2-2000" },
  ],
};
assert.equal(
  dictionaryPresentation.overlayChips(presentedCard).map((chip) => `${chip.kind}:${chip.label}`).join("|"),
  "part-of-speech:ww|part-of-speech:idiom|definition-index:#2|dictionary:vandale",
);
assert.equal(dictionaryPresentation.chipClassName({ kind: "part-of-speech", label: "ww" }), "is-pos-ww");
assert.equal(dictionaryPresentation.chipClassName({ kind: "list", label: "2k", value: "nt2-2000" }), "is-list");
assert.equal(dictionaryPresentation.sectionMicroLabel({ kind: "note" }), "usage note");
assert.equal(dictionaryPresentation.dictionaryHeaderCopy({ selectedTrackLabel: "Dutch" }).subtitle, "Dutch");
assert.equal(dictionaryPresentation.dictionaryHeaderCopy({
  selectedWord: { word: "bouwen", lookupStatus: "ready", lookupResult: { cards: [{ id: "card-1" }, { id: "card-2" }] } },
}).subtitle, "2 cards found");
assert.equal(dictionaryPresentation.dictionaryHeaderCopy({
  selectedSpan: { status: "loading" },
}).subtitle, "Translating...");
const chipParent = createTestElement("div");
const chipList = dictionaryDom.renderChipList(chipParent, [{ kind: "part-of-speech", label: "ww", title: "Verb" }]);
assert.equal(chipList.children[0].textContent, "ww");
assert.equal(chipList.children[0].title, "Verb");
const highlightParent = createTestElement("p");
dictionaryDom.renderHighlightedText(highlightParent, "hoog gebouw", "gebouw");
assert.equal(highlightParent.children[1].tagName, "strong");
assert.equal(highlightParent.children[1].textContent, "gebouw");
const translationField = dictionaryDom.renderTranslationField(createTestElement("div"), {
  label: "Context translation",
  value: "маленькая красная",
  className: "af-span-translation-text",
  tone: "is-context",
});
assert.equal(translationField.children[0].children[1].textContent, "Context translation");
assert.equal(translationField.children[1].textContent, "маленькая красная");
const translatedLine = dictionaryDom.renderTranslatedLine(
  createTestElement("div"),
  "p",
  "af-dictionary-copy",
  "een gebouw",
  "здание",
);
assert.equal(translatedLine.textContent, "een gebouw");
assert.equal(translatedLine.children[0].className, "af-inline-translation");
assert.equal(translatedLine.children[0].textContent, "\nздание");
const overlaySectionsHost = createTestElement("div");
let overlayExpanded = false;
const overlayDetails = dictionaryDom.renderOverlaySections(overlaySectionsHost, {
  sections: [
    { kind: "meaning", text: "skip first meaning" },
    { kind: "context", text: "in de context" },
    { kind: "idiom", text: "een gebouw neerzetten", explanation: "fixed phrase" },
    { kind: "note", text: "usage note text" },
  ],
  expanded: false,
  iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
  translationForSection: (section) => `translated ${section.kind}`,
  onToggleExpanded: () => {
    overlayExpanded = true;
  },
});
assert.equal(overlayDetails.classList.contains("has-leading-context"), true);
assert.equal(overlayDetails.children[0].children[0].className, "af-overlay-section is-context");
assert.equal(overlayDetails.children[0].children[0].children[0].children[0].textContent, "\ntranslated context");
const overlayToggle = overlayDetails.children[1];
assert.equal(overlayToggle.attributes["aria-expanded"], "false");
overlayToggle.listeners.click[0].listener();
assert.equal(overlayExpanded, true);
const headerActionsHost = createTestElement("div");
let headerTranslationAction = null;
let headerMenuCardId = "";
let headerCollapsed = false;
const headerActions = dictionaryDom.renderCardHeaderActionButtons(headerActionsHost, {
  translation: {
    datasetKey: "afCardTranslate-card-1",
    disabled: false,
    srText: "Translate card",
    pending: true,
    title: "Translate",
    label: "Translate",
    pressed: true,
    action: { id: "translate" },
  },
  menu: {
    datasetKey: "afCardMenu-card-1",
    label: "Card actions",
    title: "Card actions",
    expanded: true,
    cardId: "card-1",
  },
  collapse: {
    datasetKey: "afPreviewCollapse-card-1",
    label: "Collapse card",
    title: "Collapse card",
  },
}, {
  iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
  onTranslation: (action) => {
    headerTranslationAction = action;
  },
  onMenu: (cardId) => {
    headerMenuCardId = cardId;
  },
  onCollapse: () => {
    headerCollapsed = true;
  },
});
assert.equal(headerActions.children[0].className, "af-card-translate");
assert.equal(headerActions.children[0].classList.contains("is-pending"), true);
assert.equal(headerActions.children[0].attributes["aria-pressed"], "true");
headerActions.children[0].listeners.click[0].listener();
assert.equal(headerTranslationAction.id, "translate");
headerActions.children[1].listeners.click[0].listener({ stopPropagation() {} });
assert.equal(headerMenuCardId, "card-1");
headerActions.children[2].listeners.click[0].listener();
assert.equal(headerCollapsed, true);
const overlayCardHost = createTestElement("div");
const overlayCardCalls = [];
const overlayCard = dictionaryDom.renderOverlayCard(overlayCardHost, {
  card: {
    id: "card-1",
    progress: { phase: "learning" },
    summary: { definition: "a building" },
  },
  generated: true,
  feedbackStatus: "saved",
  chips: [{ kind: "part-of-speech", label: "zn" }],
  headwordTranslation: "здание",
  headerActions: {
    menu: {
      datasetKey: "afCardMenu-card-1",
      label: "Card actions",
      title: "Card actions",
      expanded: false,
      cardId: "card-1",
    },
  },
  headerActionHandlers: {
    iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    onMenu: (cardId) => overlayCardCalls.push(`menu:${cardId}`),
  },
  summaryDefinition: "a building",
  definitionTranslation: "здание",
  personalChips: [{ kind: "progress", label: "Seen 2x" }],
  renderTitle: (parent, card) => {
    overlayCardCalls.push(`title:${card.id}`);
    parent.textContent = "gebouw";
  },
  renderMenu: (_entry, card) => overlayCardCalls.push(`render-menu:${card.id}`),
  renderSections: (_entry, card) => overlayCardCalls.push(`sections:${card.id}`),
  renderReviewActions: (_entry, card) => overlayCardCalls.push(`review:${card.id}`),
});
assert.equal(overlayCard.classList.contains("is-phase-learning"), true);
assert.equal(overlayCard.classList.contains("is-generated-draft"), true);
assert.equal(overlayCard.classList.contains("is-action-saved"), true);
assert.equal(overlayCard.children[0].children[0].children[0].textContent, "gebouw");
assert.equal(overlayCard.children[0].children[0].children[1].children[0].textContent, "zn");
assert.equal(overlayCard.children[0].children[0].children[2].textContent, "здание");
assert.equal(overlayCard.children[1].children[0].textContent, "\nздание");
assert.equal(overlayCard.children[2].children[0].textContent, "Seen 2x");
assert.equal(overlayCardCalls.join("|"), "title:card-1|render-menu:card-1|sections:card-1|review:card-1");
overlayCard.children[0].children[1].children[0].listeners.click[0].listener({ stopPropagation() {} });
assert.equal(overlayCardCalls.at(-1), "menu:card-1");
const lookupHost = createTestElement("div");
const lookupElements = dictionaryDom.createLookupPlaceholder(lookupHost);
dictionaryDom.renderLookupError(lookupElements, {
  title: "Lookup failed",
  copy: "No match",
}, {
  translateUrl: "https://translate.test",
  onRetry: () => overlayCardCalls.push("retry"),
});
assert.equal(lookupElements.lookup.classList.contains("is-error"), true);
assert.equal(lookupElements.title.textContent, "Lookup failed");
assert.equal(lookupElements.lookup.children[2].dataset.afLookupRetry, "");
assert.equal(lookupElements.lookup.children[3].href, "https://translate.test");
lookupElements.lookup.children[2].listeners.click[0].listener();
assert.equal(overlayCardCalls.at(-1), "retry");
const definitionLookupHost = createTestElement("div");
const definitionLookupElements = dictionaryDom.createLookupPlaceholder(definitionLookupHost);
dictionaryDom.renderLookupDefinitions(definitionLookupElements, {
  title: "bouwen",
  copy: "Dictionary match",
  definitions: ["to build"],
}, {
  warning: "warning text",
});
assert.equal(definitionLookupElements.lookup.children[2].textContent, "to build");
assert.equal(definitionLookupElements.lookup.children[3].textContent, "warning text");
const dictionaryLookupHost = createTestElement("div");
const dictionaryLookupCalls = [];
const dictionaryLookupElement = dictionaryDom.renderDictionaryLookup(dictionaryLookupHost, {
  selectedWord: {
    cardActionStatus: "saved",
    cardActionError: "",
    lookupResult: { meta: { warning: "careful" } },
  },
  lookupState: {
    state: "cards",
    title: "Lookup ready",
    copy: "1 card found",
    cards: [{ id: "card-lookup" }],
  },
  renderCard: (parent, card) => {
    dictionaryLookupCalls.push(`card:${card.id}`);
    parent.appendChild(createTestElement("article"));
  },
  renderGroupedSearchPreviews: (_parent, selectedWord) => {
    dictionaryLookupCalls.push(`grouped:${selectedWord.cardActionStatus}`);
  },
});
assert.equal(dictionaryLookupElement.children[0].textContent, "Lookup ready");
assert.equal(dictionaryLookupElement.children[2].tagName, "article");
assert.equal(dictionaryLookupElement.children[3].textContent, "saved");
assert.equal(dictionaryLookupElement.children[4].textContent, "careful");
assert.equal(dictionaryLookupCalls.join("|"), "card:card-lookup|grouped:saved");
const generatedFallbackHost = createTestElement("div");
const generatedFallbackCalls = [];
const generatedFallback = dictionaryDom.renderGeneratedFallback(generatedFallbackHost, {
  state: "generate",
  error: "previous failure",
}, {
  onGenerate: () => generatedFallbackCalls.push("generate"),
});
assert.equal(generatedFallback.className, "af-generated-fallback-card");
assert.equal(generatedFallback.children[0].dataset.afGeneratedDraft, "");
assert.equal(generatedFallback.children[1].textContent, "previous failure");
generatedFallback.children[0].listeners.click[0].listener();
assert.equal(generatedFallbackCalls[0], "generate");
const cardTitleHost = createTestElement("div");
let audioPlayed = false;
const cardTitleLine = dictionaryDom.renderOverlayCardTitle(cardTitleHost, {
  card: { article: "de" },
  title: "gebouw",
  audioButtonState: {
    datasetKey: "afHeadwordAudio-card-1",
    pending: false,
    srText: "Play pronunciation",
    disabled: false,
    title: "Play",
    label: "Play pronunciation",
  },
  clearElement: (element) => {
    element.children = [];
  },
  iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
  onAudio: () => {
    audioPlayed = true;
  },
});
assert.equal(cardTitleLine.children[0].textContent, "de");
assert.equal(cardTitleLine.children[1].textContent, "gebouw");
assert.equal(cardTitleLine.children[2].className, "af-headword-audio");
cardTitleLine.children[2].listeners.click[0].listener({ stopPropagation() {} });
assert.equal(audioPlayed, true);
const cardMenuHost = createTestElement("div");
const cardMenuClicks = [];
const cardMenu = dictionaryDom.renderCardActionMenu(cardMenuHost, {
  feedback: "Translation marked ok.",
  onWrongTranslation: () => cardMenuClicks.push("wrong-translation"),
  onTranslationOk: () => cardMenuClicks.push("translation-ok"),
  onDictionaryIssue: () => cardMenuClicks.push("dictionary-issue"),
});
assert.equal(cardMenu.attributes.role, "menu");
assert.equal(cardMenu.children[0].attributes.role, "menuitem");
assert.equal(cardMenu.children[0].dataset.afCardReportWrongTranslation, "");
assert.equal(cardMenu.children[3].className, "af-card-menu-feedback");
cardMenu.children[0].listeners.click[0].listener();
cardMenu.children[1].listeners.click[0].listener();
cardMenu.children[2].listeners.click[0].listener();
assert.equal(cardMenuClicks.join("|"), "wrong-translation|translation-ok|dictionary-issue");
const reviewActionsHost = createTestElement("div");
let reviewActionId = "";
const reviewSection = dictionaryDom.renderReviewActions(reviewActionsHost, [{
  action: { id: "start-learning" },
  label: "Start learning",
  datasetKey: "afAction-start-learning",
  active: true,
  disabled: false,
  pending: false,
  saved: true,
  error: false,
  message: "Saved",
}], {
  onAction: (action) => {
    reviewActionId = action.id;
  },
});
assert.equal(reviewSection.children[0].children[0].attributes["data-af-action-start-learning"], "");
assert.equal(reviewSection.children[0].children[0].attributes["aria-pressed"], "true");
assert.equal(reviewSection.children[0].children[0].classList.contains("is-action-saved"), true);
assert.equal(reviewSection.children[0].children[0].textContent, "Saved");
reviewSection.children[0].children[0].listeners.click[0].listener();
assert.equal(reviewActionId, "start-learning");
const dictionaryPanelFixture = createTestElement("section");
const dictionaryPanelElements = {
  "[data-af-dictionary-title]": createTestElement("div"),
  "[data-af-dictionary-subtitle]": createTestElement("div"),
  "[data-af-examples-toggle]": createTestElement("button"),
  "[data-af-dictionary-body]": createTestElement("div"),
};
dictionaryPanelElements["[data-af-dictionary-body]"].children.push(createTestElement("p"));
dictionaryPanelFixture.querySelector = (selector) => dictionaryPanelElements[selector] || null;
const dictionaryShellBody = dictionaryDom.renderDictionaryPanelShell(dictionaryPanelFixture, {
  headerCopy: { title: "Dictionary", subtitle: "2 cards" },
  panelState: {
    spanSelected: true,
    lookupWord: "hoog",
    examplesToggle: {
      hidden: false,
      icon: "collapse",
      label: "Collapse all examples",
      pressed: true,
      title: "Collapse examples",
    },
  },
  clearElement: (element) => {
    element.children = [];
  },
  iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
});
assert.equal(dictionaryShellBody, dictionaryPanelElements["[data-af-dictionary-body]"]);
assert.equal(dictionaryPanelFixture.classList.contains("is-span-selected"), true);
assert.equal(dictionaryPanelElements["[data-af-dictionary-title]"].textContent, "Dictionary");
assert.equal(dictionaryPanelElements["[data-af-dictionary-subtitle]"].hidden, false);
assert.equal(dictionaryPanelElements["[data-af-examples-toggle]"].attributes["aria-pressed"], "true");
assert.equal(dictionaryPanelElements["[data-af-dictionary-body]"].dataset.afLookupWord, "hoog");
assert.equal(dictionaryPanelElements["[data-af-dictionary-body]"].children.length, 0);
function createDictionaryWorkflowFixture() {
  const panel = createTestElement("section");
  const elements = {
    "[data-af-dictionary-title]": createTestElement("div"),
    "[data-af-dictionary-subtitle]": createTestElement("div"),
    "[data-af-examples-toggle]": createTestElement("button"),
    "[data-af-dictionary-body]": createTestElement("div"),
  };
  panel.querySelector = (selector) => elements[selector] || null;
  return { panel, elements };
}
function renderDictionaryWorkflowState(state) {
  const fixture = createDictionaryWorkflowFixture();
  const calls = [];
  const body = dictionaryPanelWorkflow.renderDictionary(fixture.panel, {
    state,
    dictionaryPresentation,
    dictionaryDom,
    captionTracks: { describeTrack: (track) => track.label || "Track" },
    clearElement: (element) => {
      element.children = [];
    },
    iconSvg: (name) => `<${name}>`,
    renderSelectedSpanCard: () => calls.push("span-card"),
    renderSelectedWordCard: () => calls.push("word-card"),
    renderSelectedSpanLookupPrompt: () => calls.push("span-prompt"),
    renderAccountCard: () => calls.push("account-card"),
  });
  return { ...fixture, body, calls };
}
const dictionaryWorkflowBoth = renderDictionaryWorkflowState({
  selectedSpan: { text: "rode ster", status: "ready" },
  selectedWord: { word: "hoog", lookupResult: { cards: [{ id: "card-1" }] } },
  selectedTrack: { label: "Dutch" },
  examplesExpanded: true,
});
assert.equal(dictionaryWorkflowBoth.elements["[data-af-dictionary-title]"].textContent, "Selected phrase");
assert.equal(dictionaryWorkflowBoth.body.dataset.afLookupWord, "hoog");
assert.equal(dictionaryWorkflowBoth.calls.join("|"), "span-card|word-card");
const dictionaryWorkflowSpanOnly = renderDictionaryWorkflowState({
  selectedSpan: { text: "rode ster", status: "loading" },
  selectedWord: null,
  selectedTrack: { label: "Dutch" },
});
assert.equal(dictionaryWorkflowSpanOnly.elements["[data-af-dictionary-subtitle]"].textContent, "Translating...");
assert.equal(dictionaryWorkflowSpanOnly.calls.join("|"), "span-card|span-prompt");
const dictionaryWorkflowWordOnly = renderDictionaryWorkflowState({
  selectedWord: { word: "hoog", lookupStatus: "loading" },
  selectedTrack: { label: "Dutch" },
});
assert.equal(dictionaryWorkflowWordOnly.elements["[data-af-dictionary-title]"].textContent, "hoog");
assert.equal(dictionaryWorkflowWordOnly.calls.join("|"), "word-card");
const dictionaryWorkflowEmpty = renderDictionaryWorkflowState({
  selectedTrack: { label: "Dutch" },
});
assert.equal(dictionaryWorkflowEmpty.elements["[data-af-dictionary-subtitle]"].textContent, "Dutch");
assert.equal(dictionaryWorkflowEmpty.calls.join("|"), "account-card");
const dictionaryRenderFixture = createDictionaryWorkflowFixture();
const dictionaryRenderCalls = [];
dictionaryRenderWorkflow.renderDictionary(dictionaryRenderFixture.panel, {
  state: {
    selectedSpan: { text: "rode ster", status: "ready" },
    selectedWord: { word: "hoog", lookupStatus: "loading" },
    selectedTrack: { label: "Dutch" },
  },
  dictionaryPanelWorkflow,
  dictionaryPresentation,
  dictionaryDom,
  captionTracks: { describeTrack: (track) => track.label },
  clearElement: (element) => {
    element.children = [];
  },
  iconSvg: () => "",
  renderSelectedSpanCard: () => dictionaryRenderCalls.push("span-card"),
  renderSelectedWordCard: () => dictionaryRenderCalls.push("word-card"),
  renderSelectedSpanLookupPrompt: () => dictionaryRenderCalls.push("span-prompt"),
  renderAccountCard: () => dictionaryRenderCalls.push("account-card"),
});
assert.equal(dictionaryRenderFixture.elements["[data-af-dictionary-title]"].textContent, "Selected phrase");
assert.equal(dictionaryRenderCalls.join("|"), "span-card|word-card");
let dictionaryRenderLookup = null;
const dictionaryRenderTitleHost = createTestElement("div");
dictionaryRenderWorkflow.renderSelectedSpanTitle(dictionaryRenderTitleHost, {
  phraseIndex: 2,
  text: "kleine rode",
  tokens: [{
    text: "kleine",
    lookupWord: "klein",
    tokenIndex: 1,
    charStart: 0,
    charEnd: 6,
    originalToken: "kleine",
  }],
}, {
  selectedSpans,
  selectedSpansDom,
  selectLookupWord: (word, phraseIndex, selection, options) => {
    dictionaryRenderLookup = { word, phraseIndex, selection, options };
  },
});
dictionaryRenderTitleHost.children[0].children[0].listeners.click[0].listener();
assert.equal(dictionaryRenderLookup.word, "klein");
assert.equal(dictionaryRenderLookup.options.preserveSelectedSpan, true);
const dictionaryRenderFallbackHost = createTestElement("div");
let dictionaryRenderGenerated = null;
let dictionaryRenderConnected = false;
dictionaryRenderWorkflow.renderGeneratedFallback(dictionaryRenderFallbackHost, { word: "bouwen" }, {
  state: { accountStatus: "signed-in" },
  generatedEntries,
  dictionaryDom,
  renderOverlayCard: () => {},
  renderConnectPrompt: () => {
    dictionaryRenderConnected = true;
  },
  generateDictionaryDraft: (selectedWord) => {
    dictionaryRenderGenerated = selectedWord.word;
  },
});
assert.equal(dictionaryRenderConnected, false);
dictionaryRenderFallbackHost.children[0].children.at(-1).listeners.click[0].listener();
assert.equal(dictionaryRenderGenerated, "bouwen");
const dictionaryRenderReviewHost = createTestElement("div");
let dictionaryRenderAccountAction = false;
dictionaryRenderWorkflow.renderReviewActions(dictionaryRenderReviewHost, null, {
  state: { accountStatus: "guest", cardActionFeedbackByCardId: {} },
  dictionaryPresentation,
  dictionaryDom,
  accountSession,
  accountSessionDom,
  handleAccountAction: () => {
    dictionaryRenderAccountAction = true;
  },
});
assert.equal(dictionaryRenderReviewHost.children[0].className, "af-connect-prompt");
dictionaryRenderReviewHost.children[0].children[1].listeners.click[0].listener();
assert.equal(dictionaryRenderAccountAction, true);
const workspaceDictionaryPanel = workspaceDom.createDictionaryPanel({
  panelId: "dictionary-panel",
  iconSvg: () => "<svg></svg>",
  onBringPanelBehind: () => {},
  onToggleExamples: () => {},
  onClose: () => {},
});
assert.equal(workspaceDictionaryPanel.id, "dictionary-panel");
assert.equal(workspaceDictionaryPanel.children[0].dataset.afDragSurface, "dictionaryPanel");
assert.equal(workspaceDictionaryPanel.children[0].children[2].dataset.afExamplesToggle, "");
assert.equal(workspaceDictionaryPanel.children[0].children[3].listeners.click.length, 1);
const workspaceRibbonPanel = workspaceDom.createRibbonPanel({
  panelId: "ribbon-panel",
  iconSvg: () => "<svg></svg>",
  bugIconSvg: () => "<svg></svg>",
  onBringPanelBehind: () => {},
  onTogglePhraseJumpMenu: () => {},
});
assert.equal(workspaceRibbonPanel.id, "ribbon-panel");
assert.equal(workspaceRibbonPanel.children[0].dataset.afDragSurface, "phraseRibbon");
assert.equal(workspaceRibbonPanel.children[0].children[1].dataset.afTrack, "");
assert.equal(workspaceRibbonPanel.children[0].children[2].children[0].children[0].dataset.afCount, "");
const workspaceIssueHost = createTestElement("section");
const workspaceIssueDialog = workspaceDom.createIssueReportDialog(workspaceIssueHost, {
  iconSvg: () => "<svg></svg>",
  categories: [{ value: "timing", label: "Timing" }],
  onClose: () => {},
  onCategoryChange: () => {},
  onDescriptionInput: () => {},
  onExpectedInput: () => {},
  onDiagnosticsChange: () => {},
  onSubmit: () => {},
  onCopy: () => {},
});
assert.equal(workspaceIssueDialog.dataset.afIssueDialog, "");
assert.equal(workspaceIssueDialog.children[1].children[1].children[0].value, "timing");
assert.equal(workspaceIssueDialog.children[6].children[0].dataset.afIssueSubmit, "");
const workspaceDebugPanel = workspaceDom.createDebugPanel({
  onCopy: () => {},
  onClose: () => {},
  onDrag: () => {},
  onResize: () => {},
});
assert.equal(workspaceDebugPanel.dataset.afDebugPanel, "");
assert.equal(workspaceDebugPanel.children[0].listeners.pointerdown.length, 1);
const workspaceAccountHost = createTestElement("div");
const workspaceAccountControl = workspaceDom.createAccountControl(workspaceAccountHost, {
  onToggle: () => {},
  onAction: () => {},
});
assert.equal(workspaceAccountControl.children[0].dataset.afAccount, "");
assert.equal(workspaceAccountControl.children[1].children[1].dataset.afAccountAction, "");
const workspaceWorkflowDocumentElement = createTestElement("html");
const workspaceWorkflowElements = new Map();
const workspaceWorkflowDocumentListeners = [];
const workspaceWorkflowDocument = {
  documentElement: workspaceWorkflowDocumentElement,
  createElement: createTestElement,
  getElementById: (id) => workspaceWorkflowElements.get(id) || null,
  addEventListener: (...args) => workspaceWorkflowDocumentListeners.push(args),
};
let workspaceWorkflowToggleCalls = 0;
let workspaceWorkflowUpdatedPreferences = null;
let workspaceWorkflowThemeCalls = 0;
let workspaceWorkflowStopped = false;
let workspaceWorkflowDetached = false;
let workspaceWorkflowLocationHandled = false;
const workspaceWorkflowState = {
  learningEnabled: true,
  guidedMode: true,
  selectedWord: null,
  selectedSpan: null,
};
const workspaceWorkflowOptions = {
  document: workspaceWorkflowDocument,
  window: { getComputedStyle: () => ({}) },
  HTMLElement: TestHTMLElement,
  rootId: "af-root",
  toggleId: "af-toggle",
  ribbonPanelId: "af-ribbon",
  dictionaryPanelId: "af-dictionary",
  shadowContainerId: "af-container",
  displayPreferences,
  scrollContainment: {
    installScrollGuard: (root, options) => {
      root.scrollGuardOptions = options;
    },
  },
  getShadowLayerFocusInstalled: () => workspaceWorkflowOptions.shadowLayerFocusInstalled,
  setShadowLayerFocusInstalled: (value) => {
    workspaceWorkflowOptions.shadowLayerFocusInstalled = value;
  },
  getShadowScrollGuardInstalled: () => workspaceWorkflowOptions.shadowScrollGuardInstalled,
  setShadowScrollGuardInstalled: (value) => {
    workspaceWorkflowOptions.shadowScrollGuardInstalled = value;
  },
  toggleLearningMode: () => {
    workspaceWorkflowToggleCalls += 1;
  },
  updateDisplayPreferences: (updater) => {
    workspaceWorkflowUpdatedPreferences = updater({ enabled: workspaceWorkflowState.learningEnabled });
    workspaceWorkflowState.learningEnabled = workspaceWorkflowUpdatedPreferences.enabled;
  },
  stopPlaybackTimer: () => {
    workspaceWorkflowStopped = true;
  },
  detachPassivePlaybackWatcher: () => {
    workspaceWorkflowDetached = true;
  },
  handleCurrentLocation: () => {
    workspaceWorkflowLocationHandled = true;
  },
  applyThemeAttributes: () => {
    workspaceWorkflowThemeCalls += 1;
  },
  handleShadowLayerFocus: () => {},
  installPanelGestureFallback: () => {
    workspaceWorkflowOptions.panelGestureFallbackInstalled = true;
  },
  createRibbonPanel: () => createTestElement("section"),
  createDictionaryPanel: () => createTestElement("aside"),
  createDebugPanel: () => {
    const panel = createTestElement("section");
    panel.dataset.afDebugPanel = "";
    return panel;
  },
  loadShadowStyles: (_root, style) => {
    style.dataset.afLoaded = "1";
  },
};
const workspaceWorkflowToggle = workspaceWorkflow.ensureToggle(workspaceWorkflowOptions);
workspaceWorkflowElements.set("af-toggle", workspaceWorkflowToggle);
assert.equal(workspaceWorkflowToggle.id, "af-toggle");
assert.equal(workspaceWorkflowToggle.listeners.click.length, 1);
workspaceWorkflowToggle.listeners.click[0].listener();
assert.equal(workspaceWorkflowToggleCalls, 1);
const workspaceWorkflowToggleState = workspaceWorkflow.renderToggle(workspaceWorkflowState, workspaceWorkflowOptions);
assert.equal(workspaceWorkflowToggle.textContent, "AudioFilms On");
assert.equal(workspaceWorkflowToggleState.enabled, true);
assert.equal(workspaceWorkflowThemeCalls, 1);
assert.equal(workspaceWorkflow.toggleLearningMode(workspaceWorkflowState, workspaceWorkflowOptions), false);
assert.equal(workspaceWorkflowStopped, true);
assert.equal(workspaceWorkflowDetached, true);
assert.equal(workspaceWorkflowState.guidedMode, false);
assert.equal(workspaceWorkflowDocumentElement.classList.contains("af-shadowing-enabled"), false);
workspaceWorkflowState.learningEnabled = false;
assert.equal(workspaceWorkflow.toggleLearningMode(workspaceWorkflowState, workspaceWorkflowOptions), true);
assert.equal(workspaceWorkflowLocationHandled, true);
const workspaceWorkflowHost = createTestElement("div");
workspaceWorkflowHost.attachShadow = () => {
  const root = createTestElement("shadow-root");
  root.getElementById = (id) => root.children.find((child) => child.id === id) || null;
  root.prepend = (child) => {
    root.children.unshift(child);
    return child;
  };
  workspaceWorkflowHost.shadowRoot = root;
  return root;
};
workspaceWorkflowElements.set("af-root", workspaceWorkflowHost);
const workspaceWorkflowRoot = workspaceWorkflow.ensureAudioFilmsRoot(workspaceWorkflowOptions);
assert.equal(workspaceWorkflowRoot.children[0].dataset.afShadowStyle, "");
assert.equal(workspaceWorkflowRoot.children[0].dataset.afLoaded, "1");
assert.equal(workspaceWorkflowRoot.scrollGuardOptions.surfaceSelectors.includes("#af-ribbon"), true);
assert.equal(workspaceWorkflowDocumentListeners.length, 2);
const fallbackStyle = createTestElement("style");
fallbackStyle.dataset.afShadowStyle = "";
fallbackStyle.textContent = ":host{all:initial}";
const styleRetryRoot = createTestElement("shadow-root");
styleRetryRoot.querySelector = (selector) => (
  selector === "style[data-af-shadow-style]" ? fallbackStyle : null
);
let styleRetryCalls = 0;
assert.equal(workspaceWorkflow.ensureShadowStyles(styleRetryRoot, {
  ...workspaceWorkflowOptions,
  loadShadowStyles: (_root, style) => {
    styleRetryCalls += 1;
    style.dataset.afLoaded = "1";
  },
}), false);
assert.equal(styleRetryCalls, 1);
assert.equal(fallbackStyle.dataset.afLoaded, "1");
let styleFetchAttempts = 0;
const styleFetchEvents = [];
const styleFetchTimers = [];
const styleFetchRoot = createTestElement("shadow-root");
styleFetchRoot.prepend = (child) => {
  styleFetchRoot.children.unshift(child);
  return child;
};
styleFetchRoot.querySelector = (selector) => (
  selector === "style[data-af-shadow-style]"
    ? styleFetchRoot.children.find((child) => !child.removed && Object.hasOwn(child.dataset || {}, "afShadowStyle")) || null
    : selector === "link[data-af-shadow-style-link]"
      ? styleFetchRoot.children.find((child) => !child.removed && Object.hasOwn(child.dataset || {}, "afShadowStyleLink")) || null
      : null
);
const styleFetchDocument = {
  ...testDocument,
  createElement: (tagName) => {
    const element = createTestElement(tagName);
    element.remove = () => {
      element.removed = true;
    };
    return element;
  },
};
const workspaceControllerForStyles = workspaceContentWorkflow.createWorkspaceController({
  getState: () => ({}),
  workspaceWorkflow,
  document: styleFetchDocument,
  window: {
    setTimeout: (callback, delay) => {
      styleFetchTimers.push({ callback, delay });
      return styleFetchTimers.length;
    },
  },
  HTMLElement: TestHTMLElement,
  rootId: "af-root",
  toggleId: "af-toggle",
  ribbonPanelId: "af-ribbon",
  dictionaryPanelId: "af-dictionary",
  shadowContainerId: "af-shadow",
  displayPreferences,
  scrollContainment: { installScrollGuard: () => {} },
  getShadowLayerFocusInstalled: () => true,
  setShadowLayerFocusInstalled: () => {},
  getShadowScrollGuardInstalled: () => true,
  setShadowScrollGuardInstalled: () => {},
  fetch: () => {
    styleFetchAttempts += 1;
    throw new Error("shadow CSS should load through link, not fetch");
  },
  chrome: { runtime: { getURL: (value) => `chrome-extension://unit/${value}` } },
  recordDebugEvent: (type, detail) => styleFetchEvents.push({ type, detail }),
});
workspaceControllerForStyles.ensureShadowStyles(styleFetchRoot);
const styleAfterFailure = styleFetchRoot.children[0];
const firstStyleLink = styleFetchRoot.children[1];
assert.equal(firstStyleLink.rel, "stylesheet");
assert.equal(firstStyleLink.href, "chrome-extension://unit/src/shadow.css");
firstStyleLink.onerror();
assert.equal(styleFetchAttempts, 0);
assert.equal(styleAfterFailure.dataset.afLoaded, undefined);
assert.equal(styleAfterFailure.dataset.afLoadFailed, "1");
assert.equal(styleFetchEvents[0].type, "shadow-style-load-failed");
assert.equal(styleFetchTimers[0].delay, 1000);
styleFetchTimers[0].callback();
const secondStyleLink = styleFetchRoot.children[2];
assert.equal(firstStyleLink.removed, true);
assert.equal(secondStyleLink.rel, "stylesheet");
secondStyleLink.onload();
assert.equal(styleAfterFailure.dataset.afLoaded, "1");
assert.equal(styleAfterFailure.dataset.afLoadFailed, undefined);
assert.equal(secondStyleLink.dataset.afLoaded, "1");
const workspaceWorkflowContainer = workspaceWorkflow.ensureShadowContainer(workspaceWorkflowRoot, workspaceWorkflowOptions);
const workspaceWorkflowRibbon = createTestElement("section");
const workspaceWorkflowDebug = createTestElement("section");
const workspaceWorkflowDictionary = createTestElement("aside");
workspaceWorkflow.mountWorkspace(workspaceWorkflowState, workspaceWorkflowContainer, workspaceWorkflowDictionary, workspaceWorkflowRibbon, workspaceWorkflowDebug);
assert.equal(workspaceWorkflowContainer.children.includes(workspaceWorkflowRibbon), true);
assert.equal(workspaceWorkflowDictionary.removed, true);
workspaceWorkflowState.selectedWord = { text: "hoog" };
workspaceWorkflow.mountWorkspace(workspaceWorkflowState, workspaceWorkflowContainer, workspaceWorkflowDictionary, workspaceWorkflowRibbon, workspaceWorkflowDebug);
assert.equal(workspaceWorkflowContainer.children.includes(workspaceWorkflowDictionary), true);
const displayToggleButton = createTestElement("button");
ribbonDom.renderDisplayToggleButton(displayToggleButton, { html: "<svg></svg><span>Toggle</span>" });
assert.equal(displayToggleButton.innerHTML, "<svg></svg><span>Toggle</span>");
const playbackControls = {
  speedLabel: createTestElement("span"),
  speedLower: createTestElement("button"),
  speedHigher: createTestElement("button"),
};
ribbonDom.renderPlaybackRateControls(playbackControls, {
  label: "2.00x",
  title: "Playback speed 2.00x",
  lowerDisabled: false,
  higherDisabled: true,
  lowerTitle: "Decrease playback speed",
  higherTitle: "Increase playback speed",
});
assert.equal(playbackControls.speedLabel.textContent, "2.00x");
assert.equal(playbackControls.speedHigher.disabled, true);
const preferenceControls = {
  learnerTextSmaller: createTestElement("button"),
  learnerTextReset: createTestElement("button"),
  learnerTextLarger: createTestElement("button"),
  transparencyLower: createTestElement("button"),
  transparencyReset: createTestElement("button"),
  transparencyHigher: createTestElement("button"),
  autoPauseToggle: createTestElement("button"),
  slowReplaySlower: createTestElement("button"),
  slowReplaySpeed: createTestElement("button"),
  slowReplayFaster: createTestElement("button"),
  layoutLockToggle: createTestElement("button"),
  layoutReset: createTestElement("button"),
};
ribbonDom.renderDisplayPreferenceControls(preferenceControls, displayControlState, {
  formatPlaybackRate: (value) => `${value.toFixed(2)}x`,
});
assert.equal(preferenceControls.learnerTextLarger.disabled, true);
assert.equal(preferenceControls.autoPauseToggle.textContent, "Auto-pause Off");
assert.equal(preferenceControls.slowReplaySpeed.textContent, "2.00x");
const accountButton = createTestElement("button");
const accountMenu = createTestElement("div");
const accountCopy = createTestElement("div");
const accountAction = createTestElement("button");
ribbonDom.renderAccountControl(
  { account: accountButton, accountMenu, accountCopy, accountAction },
  {
    icon: "user-check",
    srText: "2000NL connected",
    connected: true,
    ariaLabel: "2000NL account connected",
    expanded: true,
    title: "Connected",
    menuOpen: true,
    copy: "Signed in",
    actionText: "Disconnect",
    actionDisabled: false,
  },
  {
    clearElement: (element) => {
      element.children = [];
    },
    iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
  },
);
assert.equal(accountButton.attributes["aria-expanded"], "true");
assert.equal(accountMenu.classList.contains("is-open"), true);
assert.equal(accountAction.textContent, "Disconnect");
const ribbonPanelSelectors = [
  "[data-af-track]",
  "[data-af-source-toggle]",
  "[data-af-source-menu]",
  "[data-af-count]",
  "[data-af-jump-menu]",
  "[data-af-jump-input]",
  "[data-af-jump-start]",
  "[data-af-jump-error]",
  "[data-af-mode]",
  "[data-af-ribbon-list]",
  "[data-af-error]",
  ".af-ribbon-controls",
  "[data-af-toggle]",
  "[data-af-mode-shadow]",
  "[data-af-mode-recall]",
  "[data-af-phrase-translation]",
  "[data-af-speed-lower]",
  "[data-af-speed-higher]",
  "[data-af-speed-label]",
  "[data-af-account]",
  "[data-af-account-menu]",
  "[data-af-account-copy]",
  "[data-af-account-action]",
  "[data-af-theme-toggle]",
  "[data-af-settings-toggle]",
  "[data-af-settings-menu]",
  "[data-af-shortcut-help]",
  "[data-af-shortcut-help-panel]",
  "[data-af-utility-toggle]",
  "[data-af-utility-menu]",
  "[data-af-learner-text-smaller]",
  "[data-af-learner-text-reset]",
  "[data-af-learner-text-larger]",
  "[data-af-transparency-lower]",
  "[data-af-transparency-reset]",
  "[data-af-transparency-higher]",
  "[data-af-auto-pause-toggle]",
  "[data-af-slow-replay-slower]",
  "[data-af-slow-replay-speed]",
  "[data-af-slow-replay-faster]",
  "[data-af-layout-lock-toggle]",
  "[data-af-layout-reset]",
  "[data-af-debug-toggle]",
  "[data-af-debug-copy]",
  "[data-af-diagnostics-clear]",
  "[data-af-refresh-cache]",
  "[data-af-mark-issue]",
  "[data-af-issue-dialog]",
  "[data-af-prev]",
  "[data-af-replay]",
  "[data-af-next]",
];
const ribbonPanelFixture = createTestElement("section");
const ribbonElementsBySelector = Object.fromEntries(
  ribbonPanelSelectors.map((selector) => [selector, createTestElement(selector.includes("button") ? "button" : "div")]),
);
ribbonPanelFixture.querySelector = (selector) => ribbonElementsBySelector[selector] || null;
const ribbonPanelHookCalls = [];
const renderedRibbonElements = ribbonPanelDom.renderRibbonPanel(ribbonPanelFixture, {
  ribbonState: {
    panelClasses: { empty: false, recall: true },
    controlsHidden: false,
    count: { text: "2 / 4", disabled: false, expanded: true, title: "Jump to phrase" },
    jump: {
      open: true,
      inputValue: "2",
      max: "4",
      inputDisabled: false,
      startDisabled: false,
      errorText: "Choose 1-4.",
      errorHidden: false,
    },
    mode: {
      hidden: true,
      guided: true,
      shadowActive: false,
      recallActive: true,
      recallDisabled: false,
      recallTitle: "Recall mode (2)",
    },
    menus: {
      settings: { open: true, expanded: true, active: true },
      help: { open: false, expanded: false, active: false, hidden: true },
      utility: { open: true, expanded: true, active: true },
    },
    buttons: { hidden: false, disabled: false },
    utility: {
      debugToggleText: "Debug",
      debugCopyText: "Copy Debug",
      diagnosticsClearText: "Clear Diagnostics",
      refreshCacheText: "Refresh Cache",
      markIssueText: "Reporting...",
      markIssueExpanded: true,
      refreshDisabled: false,
      diagnosticsClearDisabled: false,
      markIssueDisabled: true,
    },
  },
  displayToggleState: {
    original: {
      active: true,
      sticky: false,
      pressed: true,
      label: "Hide original",
      title: "Original title",
    },
    translation: {
      active: false,
      sticky: true,
      pressed: false,
      label: "Show translation",
      title: "Translation title",
    },
  },
  themePreference: "dark",
  readinessState: "ready",
  errorText: "No error",
}, {
  iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
  renderSourceSelector: () => ribbonPanelHookCalls.push("source"),
  renderAccountControl: () => ribbonPanelHookCalls.push("account"),
  renderDisplayToggleButton: (_button, state) => ribbonPanelHookCalls.push(`display:${state.label}`),
  renderDisplayPreferenceControls: () => ribbonPanelHookCalls.push("preferences"),
  renderPlaybackRateControls: () => ribbonPanelHookCalls.push("playback-rate"),
  renderIssueReportDialog: () => ribbonPanelHookCalls.push("issue"),
  positionUtilityMenu: () => ribbonPanelHookCalls.push("position-menu"),
  positionIssueReportDialog: () => ribbonPanelHookCalls.push("position-issue"),
});
assert.equal(renderedRibbonElements.list, ribbonElementsBySelector["[data-af-ribbon-list]"]);
assert.equal(ribbonPanelFixture.classList.contains("is-recall"), true);
assert.equal(ribbonElementsBySelector["[data-af-count]"].textContent, "2 / 4");
assert.equal(ribbonElementsBySelector["[data-af-count]"].attributes["aria-expanded"], "true");
assert.equal(ribbonElementsBySelector["[data-af-jump-input]"].value, "2");
assert.equal(ribbonElementsBySelector["[data-af-jump-error]"].hidden, false);
assert.equal(ribbonElementsBySelector["[data-af-theme-toggle]"].attributes["aria-label"], "Theme: dark");
assert.equal(ribbonElementsBySelector["[data-af-toggle]"].attributes["aria-pressed"], "true");
assert.equal(ribbonElementsBySelector["[data-af-phrase-translation]"].classList.contains("is-sticky"), true);
assert.equal(ribbonElementsBySelector["[data-af-mark-issue]"].disabled, true);
assert.equal(ribbonElementsBySelector["[data-af-source-toggle]"].dataset.afReadiness, "ready");
assert.equal(ribbonPanelHookCalls.includes("source"), true);
assert.equal(ribbonPanelHookCalls.includes("preferences"), true);
assert.equal(ribbonPanelHookCalls.includes("position-issue"), true);
const positionedPanel = createTestElement("section");
positionedPanel.rectTop = 4;
const positionedMenu = createTestElement("div");
positionedMenu.rectHeight = 80;
ribbonDom.positionUtilityMenu(positionedPanel, positionedMenu, true, (callback) => callback());
assert.equal(positionedMenu.classList.contains("is-below"), true);
const positionedDialog = createTestElement("section");
positionedDialog.rectHeight = 80;
ribbonDom.positionIssueReportDialog(positionedPanel, positionedDialog, true, (callback) => callback());
assert.equal(positionedDialog.classList.contains("is-below"), true);
const dictionarySearchGroupState = dictionaryPresentation.dictionarySearchGroupState({
  selectedWord: {
    groupedSearchExpandedByKey: { "examples::entry-2::1": true },
    groupedSearchCardsByKey: { "examples::entry-2::1": { status: "ready", result: { cards: [{ id: "entry-2" }] } } },
  },
  group: {
    id: "examples",
    total: 2,
    items: [
      { entry: { id: "entry-1", headword: "bouwen", partOfSpeech: "ww" }, field: { text: "een gebouw bouwen" }, match: { matchedText: "gebouw" } },
      { entry: { id: "entry-2", headword: "verbouwen" }, field: { text: "huis verbouwen" } },
    ],
    page: { hasMore: true, nextCursor: "cursor-2" },
  },
  fallbackWord: "bouw",
});
assert.equal(dictionarySearchGroupState.title, "Within examples");
assert.equal(dictionarySearchGroupState.count, "2");
assert.equal(dictionarySearchGroupState.rows[0].itemKey, "examples::entry-1::0");
assert.equal(dictionarySearchGroupState.rows[0].ariaLabel, "Open card: bouwen");
assert.equal(dictionarySearchGroupState.rows[0].highlight, "gebouw");
assert.equal(dictionarySearchGroupState.rows[1].expanded, true);
assert.equal(dictionarySearchGroupState.rows[1].loadedState.status, "ready");
assert.equal(dictionarySearchGroupState.more.datasetKey, "afSearchMoreExamples");
assert.equal(/^[A-Za-z_$][\w$]*$/.test(dictionarySearchGroupState.more.datasetKey), true);
assert.equal(dictionarySearchGroupState.more.datasetKey.includes("-"), false);
assert.equal(dictionarySearchGroupState.more.cursor, "cursor-2");
const dictionarySearchLoadingHost = createTestElement("div");
dictionarySearchDom.renderGroupedSearchPreviews(dictionarySearchLoadingHost, {
  groupedSearchStatus: "loading",
  groupedSearchResult: null,
});
assert.equal(dictionarySearchLoadingHost.children[0].className, "af-dictionary-search-groups");
assert.equal(dictionarySearchLoadingHost.children[0].children[0].textContent, "Loading examples and related dictionary text...");
const dictionarySearchHost = createTestElement("div");
let toggledSearchItemKey = "";
let loadMoreGroupId = "";
dictionarySearchDom.renderGroupedSearchPreviews(dictionarySearchHost, {
  word: "bouw",
  groupedSearchStatus: "ready",
  groupedSearchResult: {
    groups: [
      { id: "headwords", total: 1, items: [{ entry: { id: "skip" } }] },
      {
        id: "examples",
        total: 2,
        items: [
          {
            entry: { id: "entry-1", headword: "bouwen", partOfSpeech: "ww" },
            field: { text: "een gebouw bouwen" },
            match: { matchedText: "gebouw" },
          },
        ],
        page: { hasMore: true, nextCursor: "cursor-2" },
      },
    ],
  },
}, {
  onToggleItem: (_selectedWord, _group, _item, itemKey) => {
    toggledSearchItemKey = itemKey;
  },
  onLoadMore: (_selectedWord, groupState) => {
    loadMoreGroupId = groupState.groupId;
  },
});
const dictionarySearchContainer = dictionarySearchHost.children[0];
const dictionarySearchGroup = dictionarySearchContainer.children[0];
const dictionarySearchRow = dictionarySearchGroup.children[1].children[0];
assert.equal(dictionarySearchGroup.children[0].children[0].textContent, "Within examples");
assert.equal(dictionarySearchGroup.children[0].children[1].textContent, "2");
assert.equal(dictionarySearchRow.dataset.afSearchItemKey, "examples::entry-1::0");
dictionarySearchRow.listeners.click[0].listener({ target: { closest: () => null } });
assert.equal(toggledSearchItemKey, "examples::entry-1::0");
dictionarySearchGroup.children[2].listeners.click[0].listener();
assert.equal(dictionarySearchGroup.children[2].dataset.afSearchMoreExamples, "");
assert.equal(loadMoreGroupId, "examples");
assert.equal(dictionaryPresentation.dictionarySearchMoreDatasetKey("related-forms"), "afSearchMoreRelatedForms");
const dictionarySearchWorkflowState = {
  selectedWord: { word: "bouw" },
  phrases: [{ text: "Fallback phrase." }],
};
const dictionarySearchWorkflowCalls = [];
let dictionarySearchWorkflowLoad = null;
dictionarySearchWorkflow.renderGroupedSearchPreviews(createTestElement("div"), {
  phraseIndex: 0,
  sourceBinding: { phrase: { text: "Bound phrase." } },
}, {
  getState: () => dictionarySearchWorkflowState,
  dictionarySearchDom: {
    renderGroupedSearchPreviews(_parent, _selectedWord, options) {
      dictionarySearchWorkflowCalls.push(options.fallbackWord);
      options.renderOverlayCard();
      options.onToggleItem();
      options.onLoadMore(null, {
        groupId: "examples",
        more: { cursor: "cursor-3" },
      });
    },
  },
  renderOverlayCard: () => dictionarySearchWorkflowCalls.push("card"),
  toggleDictionarySearchItem: () => dictionarySearchWorkflowCalls.push("toggle"),
  loadGroupedDictionarySearch: (selectedWord, phraseText, options) => {
    dictionarySearchWorkflowLoad = { selectedWord, phraseText, options };
  },
  render: () => dictionarySearchWorkflowCalls.push("render"),
});
assert.equal(dictionarySearchWorkflowCalls.join("|"), "bouw|card|toggle|render");
assert.equal(dictionarySearchWorkflowState.selectedWord.groupedSearchLoadingGroup, "examples");
assert.equal(dictionarySearchWorkflowState.selectedWord.groupedSearchError, "");
assert.equal(dictionarySearchWorkflowLoad.phraseText, "Bound phrase.");
assert.equal(dictionarySearchWorkflowLoad.options.cursor, "cursor-3");
const readyWordWorkflowState = {
  selectedWord: {
    word: "bouw",
    phraseIndex: 0,
    lookupStatus: "ready",
    lookupResult: {
      cards: [{ id: "card-1" }],
      meta: { warning: "Partial result." },
    },
  },
  phrases: [{ text: "Ready phrase." }],
};
const readyWordWorkflowCalls = [];
dictionarySearchWorkflow.renderSelectedWordCard(createTestElement("div"), {
  getState: () => readyWordWorkflowState,
  dictionaryDom: {
    renderLookupMessages(_parent, messageState) {
      readyWordWorkflowCalls.push(`message:${messageState.warning}`);
    },
  },
  dictionarySearchDom: {
    renderGroupedSearchPreviews(_parent, _selectedWord, options) {
      readyWordWorkflowCalls.push(`fallback:${options.fallbackWord}`);
    },
  },
  renderOverlayCard: (_parent, card) => readyWordWorkflowCalls.push(`card:${card.id}`),
  toggleDictionarySearchItem: () => {},
  loadGroupedDictionarySearch: () => {},
  render: () => {},
});
assert.equal(readyWordWorkflowCalls.join("|"), "card:card-1|message:Partial result.|fallback:bouw");
const retryWordWorkflowState = {
  selectedWord: {
    word: "lopen",
    phraseIndex: 2,
    lookupStatus: "error",
    selection: { tokenIndex: 1 },
    preserveSelectedSpan: true,
  },
  selectedSpan: { phraseIndex: 2 },
  phrases: [],
};
let retryLookup = null;
dictionarySearchWorkflow.renderSelectedWordCard(createTestElement("div"), {
  getState: () => retryWordWorkflowState,
  dictionaryPresentation: {
    lookupPlaceholderState: () => ({ state: "error" }),
  },
  dictionaryDom: {
    renderDictionaryLookup(_parent, options) {
      options.onRetry();
    },
  },
  dictionarySearchDom: {
    renderGroupedSearchPreviews: () => {},
  },
  renderOverlayCard: () => {},
  renderGeneratedFallback: () => {},
  selectLookupWord: (word, phraseIndex, selection, options) => {
    retryLookup = { word, phraseIndex, selection, options };
  },
  toggleDictionarySearchItem: () => {},
  loadGroupedDictionarySearch: () => {},
  render: () => {},
});
assert.equal(retryLookup.word, "lopen");
assert.equal(retryLookup.phraseIndex, 2);
assert.equal(retryLookup.options.preserveSelectedSpan, true);
const dictionarySearchExpandedHost = createTestElement("div");
let collapsedSearchCard = false;
let renderedSearchCardId = "";
dictionarySearchDom.renderDictionarySearchExpanded(
  dictionarySearchExpandedHost,
  {
    status: "ready",
    entryId: "entry-2",
    result: { cards: [{ id: "entry-1" }, { id: "entry-2" }] },
  },
  () => {
    collapsedSearchCard = true;
  },
  {
    renderOverlayCard: (_parent, card, options) => {
      renderedSearchCardId = card.id;
      options.collapseAction.onClick();
    },
  },
);
assert.equal(renderedSearchCardId, "entry-2");
assert.equal(collapsedSearchCard, true);
const dictionaryPanelState = dictionaryPresentation.dictionaryPanelState({
  selectedSpan: { text: "rode ster" },
  selectedWord: { word: "hoog", lookupResult: { cards: [{ id: "card-1" }] } },
  examplesExpanded: true,
});
assert.equal(dictionaryPanelState.spanSelected, true);
assert.equal(dictionaryPanelState.lookupWord, "hoog");
assert.equal(dictionaryPanelState.examplesToggle.hidden, false);
assert.equal(dictionaryPanelState.examplesToggle.icon, "collapse");
assert.equal(dictionaryPanelState.examplesToggle.label, "Collapse all examples");
assert.equal(dictionaryPanelState.examplesToggle.pressed, true);
const emptyDictionaryPanelState = dictionaryPresentation.dictionaryPanelState({
  selectedWord: { word: "hoog", lookupResult: { cards: [] } },
});
assert.equal(emptyDictionaryPanelState.spanSelected, false);
assert.equal(emptyDictionaryPanelState.lookupWord, "hoog");
assert.equal(emptyDictionaryPanelState.examplesToggle.hidden, true);
assert.equal(dictionaryPresentation.selectedSpanSaveLabel({ saveStatus: "saving" }), "Saving...");
assert.equal(dictionaryPresentation.overlayTitle({ clickedForm: "bouwt" }, "bouwen"), "bouwt");
assert.equal(dictionaryPresentation.isGeneratedDictionaryCard({
  displayActions: [{ command: { kind: "generated-save-and-start-learning" } }],
}), true);
assert.equal(dictionaryPresentation.displayActionsByGroup({
  progress: { phase: "not-started" },
  displayActions: [
    { id: "known", group: "progress" },
    { id: "start", group: "progress" },
    { id: "translate", group: "translation" },
  ],
}, "progress").map((action) => action.id).join("|"), "start");
assert.equal(dictionaryPresentation.dictionarySearchGroupLabel("examples"), "Within examples");
assert.equal(dictionaryPresentation.dictionarySearchItemKey("examples", { entry: { id: "entry-1", headword: "jaar" } }, 2), "examples::entry-1::2");
assert.equal(dictionaryPresentation.dictionarySearchItemTitle({}, "fallback"), "fallback");
assert.equal(dictionaryPresentation.dictionarySearchItemChips({
  entry: { partOfSpeech: "ww" },
  field: { kind: "idiom" },
}).map((chip) => chip.label).join("|"), "ww|idiom");
assert.equal(dictionaryPresentation.dictionarySearchItemText({
  field: { text: "within field" },
  entry: { summaryDefinition: "definition" },
}), "within field");
assert.equal(dictionaryPresentation.focusedDictionarySearchCards({
  entryId: "entry-2",
  result: { cards: [{ id: "entry-1" }, { id: "entry-2" }] },
}).map((card) => card.id).join("|"), "entry-2");
assert.equal(dictionaryPresentation.highlightedTextParts("hoog gebouw", "gebouw")
  .map((part) => `${part.highlight ? "mark" : "text"}:${part.text}`).join("|"), "text:hoog |mark:gebouw");
assert.equal(dictionaryPresentation.groupedSearchPreviewState({ groupedSearchStatus: "idle" }).state, "hidden");
assert.equal(dictionaryPresentation.groupedSearchPreviewState({
  groupedSearchStatus: "loading",
  groupedSearchResult: null,
}).message, "Loading examples and related dictionary text...");
assert.equal(dictionaryPresentation.groupedSearchPreviewState({
  groupedSearchStatus: "error",
  groupedSearchError: "",
}).message, "Search previews failed.");
assert.equal(dictionaryPresentation.groupedSearchPreviewState({
  groupedSearchStatus: "ready",
  groupedSearchResult: {
    groups: [
      { id: "headwords", total: 1, items: [{ id: "headword" }] },
      { id: "examples", total: 1, items: [{ id: "example" }] },
    ],
  },
}).groups.map((group) => group.id).join("|"), "examples");
assert.equal(dictionaryPresentation.lookupPlaceholderState(null).copy, "Click a word to look it up.");
assert.equal(dictionaryPresentation.lookupPlaceholderState({ lookupStatus: "loading" }).state, "loading");
assert.equal(dictionaryPresentation.lookupPlaceholderState({
  lookupStatus: "error",
  lookupError: "no match",
}).copy, "no match");
assert.equal(dictionaryPresentation.lookupPlaceholderState({
  word: "bouwen",
  lookupStatus: "ready",
  lookupResult: { cards: [{ id: "card-1" }] },
}).title, "1 dictionary card");
const definitionLookupState = dictionaryPresentation.lookupPlaceholderState({
  word: "bouwen",
  lookupStatus: "ready",
  lookupResult: {
    result: { word: "bouwen", language: "nl", definition: "maken" },
    definitions: [],
  },
});
assert.equal(definitionLookupState.state, "definition");
assert.equal(definitionLookupState.title, "bouwen");
assert.equal(definitionLookupState.definitions.length, 0);
assert.equal(dictionaryPresentation.lookupPlaceholderState({
  word: "bouwen",
  lookupStatus: "ready",
  lookupResult: {},
}).state, "generated-fallback");
const sectionsForCollapse = [
  { id: "meaning-1", kind: "meaning", text: "meaning" },
  { id: "context-1", kind: "context", text: "context" },
  { id: "example-1", kind: "example", text: "example" },
];
assert.equal(
  dictionaryPresentation.collapsedOverlaySections(sectionsForCollapse).map((section) => section.kind).join("|"),
  "context|example",
);
assert.equal(
  dictionaryPresentation.progressSignal(
    { seenCount: 3, lastSeenAt: "2026-06-28T12:00:00.000Z" },
    { nowMs: Date.parse("2026-06-29T12:00:00.000Z") },
  ).map((signal) => signal.label).join("|"),
  "Seen 3x|Last 1d",
);
assert.equal(dictionaryPresentation.cardHasLookupTranslations({ headwordTranslation: "  bouw  " }), true);
assert.equal(dictionaryPresentation.cardCanRequestTranslation({ entryId: "entry-1" }), true);
const translationButtonState = dictionaryPresentation.cardTranslationButtonState({
  card: { id: "card-1" },
  translationAction: { id: "translate" },
  translationVisible: false,
  translationPending: true,
  canRequestTranslation: true,
});
assert.equal(translationButtonState.disabled, true);
assert.equal(translationButtonState.pending, true);
assert.equal(translationButtonState.label, "Translation loading");
assert.equal(translationButtonState.datasetKey, "afAction-translate");
assert.equal(dictionaryPresentation.cardTranslationButtonState({ card: { id: "card-1" } }), null);
const menuButtonState = dictionaryPresentation.cardMenuButtonState({
  card: { id: "card-1" },
  menuOpenId: "card-1",
});
assert.equal(menuButtonState.expanded, true);
assert.equal(menuButtonState.datasetKey, "afCardMenu-card-1");
assert.equal(dictionaryPresentation.cardMenuButtonState({
  card: { id: "draft", displayActions: [{ command: { kind: "generated-save-and-start-learning" } }] },
  menuOpenId: "",
}), null);
const collapseButtonState = dictionaryPresentation.collapseButtonState(
  { id: "card-1" },
  { label: "Close preview", onClick() {} },
);
assert.equal(collapseButtonState.datasetKey, "afPreviewCollapse-card-1");
assert.equal(collapseButtonState.label, "Close preview");
const audioButtonState = dictionaryPresentation.headwordAudioButtonState({
  card: { id: "card-1", headword: "bouwen" },
  playable: true,
  pending: true,
});
assert.equal(audioButtonState.disabled, true);
assert.equal(audioButtonState.datasetKey, "afHeadwordAudio-card-1");
assert.equal(audioButtonState.label, "Preparing pronunciation for bouwen");
assert.equal(dictionaryPresentation.headwordAudioButtonState({ playable: false }), null);
const overlayTranslation = {
  overlay: {
    headword: "строить",
    meanings: [
      {
        definition: "создавать",
        examples: ["пример"],
        idioms: [{ translatedExpression: "дать зеленый свет" }],
        note: "заметка",
      },
    ],
  },
};
assert.equal(dictionaryPresentation.lookupOrOverlayHeadword({}, overlayTranslation, { translationVisible: true }), "строить");
assert.equal(dictionaryPresentation.lookupOrOverlayDefinition({}, overlayTranslation, 0, { translationVisible: true }), "создавать");
assert.equal(dictionaryPresentation.visibleCardTranslation({
  card: { id: "card-1" },
  visibleTranslationsByCardId: { "card-1": true },
  selectedWord: { translationsByCardId: { "card-1": overlayTranslation } },
}), overlayTranslation);
assert.equal(dictionaryPresentation.cardTranslationsVisible({
  card: { id: "card-1" },
  visibleTranslationsByCardId: { "card-1": true },
}), true);
const overlayCardState = dictionaryPresentation.overlayCardRenderState({
  card: {
    id: "card-1",
    entryId: "entry-1",
    headword: "bouwen",
    partOfSpeech: "ww",
    summary: { definition: "maken" },
    sections: [{ id: "meaning-1", kind: "meaning", text: "maken" }],
    displayActions: [
      { id: "translate", group: "translation", command: { kind: "card-translation" } },
      { id: "start", group: "progress", command: { kind: "platform-action", action: "start-learning" } },
    ],
  },
  selectedWord: { translationsByCardId: { "card-1": overlayTranslation } },
  visibleTranslationsByCardId: { "card-1": true },
  translationPendingByCardId: {},
  cardActionFeedbackByCardId: { "card-1": { actionId: "start", status: "saved", message: "Started" } },
  cardMenuOpenId: "card-1",
});
assert.equal(overlayCardState.feedbackStatus, "saved");
assert.equal(overlayCardState.headwordTranslation, "строить");
assert.equal(overlayCardState.definitionTranslation, "создавать");
assert.equal(overlayCardState.headerActions.translation.pressed, true);
assert.equal(overlayCardState.headerActions.menu.expanded, true);
let overlayWorkflowOptions = null;
const overlayWorkflowCalls = [];
const overlayWorkflowEntry = createTestElement("div");
const overlayWorkflowCard = {
  id: "card-1",
  entryId: "entry-1",
  headword: "bouwen",
  sections: [{ id: "meaning-1", kind: "meaning", text: "maken" }],
  displayActions: [
    { id: "translate", group: "translation", command: { kind: "card-translation" } },
  ],
};
assert.equal(dictionaryOverlayWorkflow.renderOverlayCard(createTestElement("div"), overlayWorkflowCard, {
  state: {
    selectedWord: { word: "bouwen", translationsByCardId: { "card-1": overlayTranslation } },
    visibleTranslationsByCardId: { "card-1": true },
    translationPendingByCardId: {},
    cardActionFeedbackByCardId: {},
    cardMenuOpenId: "card-1",
  },
  collapseAction: { onClick: () => overlayWorkflowCalls.push("collapse") },
  dictionaryPresentation,
  dictionaryDom: {
    renderOverlayCard(_parent, options) {
      overlayWorkflowOptions = options;
      options.renderTitle(overlayWorkflowEntry, overlayWorkflowCard);
      options.renderMenu(overlayWorkflowEntry, overlayWorkflowCard);
      options.renderSections(overlayWorkflowEntry, overlayWorkflowCard);
      options.renderReviewActions(overlayWorkflowEntry, overlayWorkflowCard);
      options.headerActionHandlers.onTranslation({ id: "translate" });
      options.headerActionHandlers.onMenu("card-1");
      options.headerActionHandlers.onCollapse();
      return overlayWorkflowEntry;
    },
  },
  generatedEntries,
  iconSvg: (name) => `<${name}>`,
  performDisplayAction: (card, action) => overlayWorkflowCalls.push(`action:${card.id}:${action.id}`),
  toggleCardMenu: (cardId) => overlayWorkflowCalls.push(`menu:${cardId}`),
  renderOverlayCardTitle: (_parent, card) => overlayWorkflowCalls.push(`title:${card.id}`),
  renderCardActionMenu: (_parent, card) => overlayWorkflowCalls.push(`card-menu:${card.id}`),
  renderOverlaySections: (_parent, sections, card, translation) =>
    overlayWorkflowCalls.push(`sections:${card.id}:${sections.length}:${translation?.overlay?.headword || ""}`),
  renderReviewActions: (_parent, card) => overlayWorkflowCalls.push(`review:${card.id}`),
}), overlayWorkflowEntry);
assert.equal(overlayWorkflowOptions.headerActions.menu.expanded, true);
assert.equal(overlayWorkflowOptions.headerActionHandlers.iconSvg("more"), "<more>");
assert.equal(overlayWorkflowCalls.join("|"), [
  "title:card-1",
  "card-menu:card-1",
  "sections:card-1:1:строить",
  "review:card-1",
  "action:card-1:translate",
  "menu:card-1",
  "collapse",
].join("|"));
const overlayTitleCalls = [];
dictionaryOverlayWorkflow.renderOverlayCardTitle(createTestElement("div"), {
  id: "card-title",
  headword: "bouwen",
  audio: { url: "https://audio.example/bouwen.mp3" },
}, {
  state: {
    selectedWord: { word: "bouw" },
    audioPendingByCardId: { "card-title": true },
  },
  dictionaryPresentation,
  dictionaryDom: {
    renderOverlayCardTitle(_parent, options) {
      overlayTitleCalls.push(`${options.title}:${options.audioButtonState.pending}:${options.audioButtonState.disabled}`);
      options.onAudio();
    },
  },
  clearElement: () => {},
  iconSvg: () => "<svg></svg>",
  cardAudioPlayable: () => true,
  playHeadwordAudio: (card) => overlayTitleCalls.push(`audio:${card.id}`),
});
assert.equal(overlayTitleCalls.join("|"), "bouwen:true:true|audio:card-title");
const overlaySectionCalls = [];
dictionaryOverlayWorkflow.renderOverlaySections(createTestElement("div"), [
  { id: "meaning-1", kind: "meaning", text: "maken", translation: "делать" },
], { id: "card-section" }, {
  overlay: { sections: { "meaning-1": "делать" } },
}, {
  state: {
    visibleTranslationsByCardId: { "card-section": true },
  },
  dictionaryPresentation,
  dictionaryDom: {
    renderOverlaySections(_parent, options) {
      overlaySectionCalls.push(`${options.expanded}:${options.translationForSection(options.sections[0], options.sections)}`);
      options.onToggleExpanded();
    },
  },
  iconSvg: () => "<svg></svg>",
  cardExpanded: () => true,
  toggleCardExpanded: (cardId) => overlaySectionCalls.push(`toggle:${cardId}`),
});
assert.equal(overlaySectionCalls.join("|"), "true:делать|toggle:card-section");
const overlayActionCalls = [];
assert.equal(dictionaryOverlayWorkflow.performDisplayAction({ id: "card-1" }, {
  command: { kind: "card-translation" },
}, {
  toggleCardTranslation: (card) => overlayActionCalls.push(`translation:${card.id}`),
}), "card-translation");
assert.equal(dictionaryOverlayWorkflow.performDisplayAction({ id: "card-2" }, {
  command: { kind: "platform-action", action: "known", result: "good" },
}, {
  performDictionaryCardAction: (card, _displayAction, command) => overlayActionCalls.push(`platform:${card.id}:${command.action}:${command.result}`),
}), "platform-action");
assert.equal(dictionaryOverlayWorkflow.performDisplayAction({ id: "card-3" }, {
  command: { kind: "generated-save-and-start-learning" },
}, {
  getSelectedWord: () => ({ word: "bouwen" }),
  saveGeneratedDictionaryDraft: (selectedWord, card) => overlayActionCalls.push(`generated:${selectedWord.word}:${card.id}`),
}), "generated-save-and-start-learning");
assert.equal(dictionaryOverlayWorkflow.performDisplayAction({ id: "card-4" }, {}, {}), "");
assert.equal(overlayActionCalls.join("|"), "translation:card-1|platform:card-2:known:good|generated:bouwen:card-3");
const overlayMenuState = {
  selectedWord: { word: "bouwen" },
  currentIndex: 1,
  cardMenuOpenId: "card-menu",
  cardMenuFeedbackByCardId: { "card-menu": "Previous feedback" },
};
const overlayMenuCalls = [];
const overlayMenuReports = [];
let overlayMenuOptions = null;
dictionaryOverlayWorkflow.renderCardActionMenu(createTestElement("div"), {
  id: "card-menu",
  entryId: "entry-menu",
  headword: "bouwen",
  clickedForm: "bouw",
}, {
  state: overlayMenuState,
  dictionaryDom: {
    renderCardActionMenu(_parent, options) {
      overlayMenuOptions = options;
      overlayMenuCalls.push(`feedback:${options.feedback}`);
    },
  },
  issueReports,
  describePhraseAtIndex: (index) => ({ index, text: "Current phrase" }),
  openIssueReportDialog: (report) => overlayMenuReports.push(report),
  recordDebugEvent: (type, detail) => overlayMenuCalls.push(`debug:${type}:${detail.cardId}`),
  render: () => overlayMenuCalls.push("render"),
});
overlayMenuOptions.onTranslationOk();
assert.equal(overlayMenuState.cardMenuOpenId, "card-menu");
assert.equal(overlayMenuState.cardMenuFeedbackByCardId["card-menu"], "Translation marked ok for this session.");
overlayMenuOptions.onWrongTranslation();
assert.equal(overlayMenuState.cardMenuOpenId, "");
assert.equal(overlayMenuReports.at(-1).category, "translation");
assert.equal(overlayMenuReports.at(-1).reportOptions.extraDiagnostics.dictionaryCardTranslationIssue.lookup.contextText, "Current phrase");
overlayMenuOptions.onDictionaryIssue();
assert.equal(overlayMenuReports.at(-1).category, "dictionary");
assert.equal(overlayMenuCalls.join("|"), "feedback:Previous feedback|debug:dictionary-card-translation-ok:card-menu|render");
assert.equal(dictionaryPresentation.overlaySectionTranslation({
  card: { id: "card-1" },
  section: sectionsForCollapse[2],
  allSections: sectionsForCollapse,
  translation: overlayTranslation,
  visibleTranslationsByCardId: { "card-1": true },
}), "пример");
const reviewActionStates = dictionaryPresentation.reviewActionStates({
  card: {
    id: "card-1",
    entryId: "entry-1",
    displayActions: [{ id: "start", label: "Start", group: "progress", command: { kind: "platform-action" } }],
  },
  feedback: { actionId: "start", status: "pending", message: "Saving..." },
});
assert.equal(reviewActionStates[0].disabled, true);
assert.equal(reviewActionStates[0].pending, true);
assert.equal(reviewActionStates[0].message, "Saving...");
assert.equal(
  dictionaryPresentation.lookupOrOverlaySection(
    {},
    sectionsForCollapse[2],
    sectionsForCollapse,
    overlayTranslation,
    { translationVisible: true },
  ),
  "пример",
);
assert.equal(dictionaryPresentation.translatedIdiom(overlayTranslation), "дать зеленый свет");

const parsedCommand = dictionaryCommands.parseCommandResponse({
  ok: true,
  text: JSON.stringify({ meta: { provider: "mock" } }),
  timings: { totalMs: 12 },
});
dictionaryCommands.attachCommandTimings(parsedCommand.payload, { timings: { totalMs: 12 } });
assert.equal(parsedCommand.payload.meta.commandTimings.totalMs, 12);
assert.equal(dictionaryCommands.isNoMatchLookupPayload({ status: 404 }, { code: "no_match" }), true);
assert.equal(
  dictionaryCommands.safeLookupErrorMessage({ status: 404 }, null, "<!doctype html><html></html>"),
  "Dictionary endpoint is unavailable on the remote AudioFilms API.",
);
assert.equal(dictionaryCommands.dictionaryOperationPath("dict-generated-draft"), "/dict/generated-entry/draft");
assert.equal(
  dictionaryCommands.dictionaryCommandUrl("https://audiofilms-api.dilum.io/api/dict", "phrase-translation").pathname,
  "/api/practice/phrase-translations",
);
assert.equal(dictionaryCommands.dictionaryRequestInit("dict-session").method, "GET");
assert.equal(dictionaryCommands.dictionaryRequestInit("dict-lookup", { clickedForm: "oog" }).method, "POST");
assert.equal(JSON.parse(dictionaryCommands.dictionaryRequestInit("dict-lookup", { clickedForm: "oog" }).body).clickedForm, "oog");
const selectedWordRequestFixture = {
  word: "oog",
  sourceBinding: { captionSource: { languageCode: "nl" } },
};
assert.equal(
  dictionaryCommands.selectedWordSourceLanguage(selectedWordRequestFixture, { languageCode: "en" }),
  "nl",
);
const dictionaryLookupRequest = dictionaryCommands.dictionaryLookupRequest({
  selectedWord: selectedWordRequestFixture,
  source: { languageCode: "en" },
  context: "met het blote oog",
});
assert.equal(dictionaryLookupRequest.word, "oog");
assert.equal(dictionaryLookupRequest.language, "nl");
assert.equal(dictionaryLookupRequest.context, "met het blote oog");
const dictionarySearchRequest = dictionaryCommands.dictionarySearchRequest({
  selectedWord: { word: "ster" },
  source: { loadedTranscriptResult: { languageCode: "nl" } },
  context: "rode ster",
  group: "examples",
  cursor: "cursor-1",
});
assert.equal(dictionarySearchRequest.word, "ster");
assert.equal(dictionarySearchRequest.language, "nl");
assert.equal(dictionarySearchRequest.context, "rode ster");
assert.equal(dictionarySearchRequest.group, "examples");
assert.equal(dictionarySearchRequest.cursor, "cursor-1");
assert.equal(dictionarySearchRequest.limit, 5);
const dictionarySearchItemLookupRequest = dictionaryCommands.dictionarySearchItemLookupRequest({
  selectedWord: { word: "fallback", sourceBinding: { captionSource: { languageCode: "nl" } } },
  source: { languageCode: "en" },
  itemTitle: "TRAPPIST",
  itemText: "",
  fallbackContext: "een kleine rode ster",
});
assert.equal(dictionarySearchItemLookupRequest.word, "TRAPPIST");
assert.equal(dictionarySearchItemLookupRequest.language, "nl");
assert.equal(dictionarySearchItemLookupRequest.context, "een kleine rode ster");
const transportRequests = [];
const transportOptions = {
  endpoint: "https://audiofilms-api.dilum.io/api/dict",
  requestDictionaryCommand: async (operation, body) => {
    transportRequests.push({ operation, body });
    if (operation === "dict-lookup" && body.clickedForm === "missing") {
      return { ok: false, status: 404, text: JSON.stringify({ code: "no_match" }) };
    }
    if (operation === "dict-search") {
      return { ok: false, status: 502, text: JSON.stringify({ error: "bad gateway" }) };
    }
    if (operation === "dict-action") {
      return { ok: false, status: 400, text: JSON.stringify({ detail: "missing entry" }) };
    }
    return {
      ok: true,
      status: 200,
      text: JSON.stringify({ cards: [{ id: "card-1" }], meta: {} }),
      timings: { totalMs: 7 },
    };
  },
};
const transportedLookup = await dictionaryCommandTransport.fetchDictionaryResult({
  word: "oog",
  language: "nl",
  context: "met het blote oog",
}, transportOptions);
assert.equal(transportedLookup.cards[0].id, "card-1");
assert.equal(transportedLookup.meta.commandTimings.totalMs, 7);
assert.equal(transportRequests[0].body.contextText, "met het blote oog");
const noMatchLookup = await dictionaryCommandTransport.fetchDictionaryResult({
  word: "missing",
  language: "nl",
  context: "",
}, transportOptions);
assert.equal(noMatchLookup.code, "no_match");
await assert.rejects(
  () => dictionaryCommandTransport.fetchDictionarySearchResult({
    word: "oog",
    language: "nl",
    context: "context",
    group: "examples",
    cursor: "cursor-1",
    limit: 3,
  }, transportOptions),
  /Dictionary search failed: HTTP 502 bad gateway/,
);
await assert.rejects(
  () => dictionaryCommandTransport.postDictionaryCommand("dict-action", {}, transportOptions),
  /missing entry/,
);
assert.equal(
  dictionaryCommandTransport.dictionaryLookupEndpoint({ dictionaryEndpoint: () => "http://localhost:3000/api/dict" }),
  "http://localhost:3000/api/dict",
);
const commandClientDocument = { documentElement: { dataset: {} } };
const commandClientStorage = new Map();
const commandClientFetches = [];
const commandClient = extensionCommandClient.createExtensionCommandClient({
  chrome: undefined,
  fetch: async (url, init) => {
    commandClientFetches.push({ url, init });
    if (String(url).includes("/dict/session")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ authenticated: true }) };
    }
    if (String(url).includes("/dict/lookup")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ cards: [{ id: "card-1" }] }) };
    }
    return { ok: true, status: 201, text: async () => JSON.stringify({ id: "backend-1" }) };
  },
  storage: {
    getItem: (key) => commandClientStorage.get(key) || "",
  },
  document: commandClientDocument,
  dictionaryCommands,
  dictionaryMocks,
  backendCommands,
  issueReports,
  dictionaryEndpoint: () => "https://audiofilms-api.dilum.io/api/dict",
  apiBase: () => "https://audiofilms-api.dilum.io",
  getIssueCategory: () => "timing",
  now: () => "2026-06-30T10:00:00.000Z",
});
const commandClientLookup = await commandClient.postDictionaryCommand("dict-lookup", { clickedForm: "oog" });
assert.equal(commandClientLookup.cards[0].id, "card-1");
assert.equal(commandClientFetches[0].init.method, "POST");
const commandClientSession = await commandClient.fetchDictionarySession();
assert.equal(commandClientSession.authenticated, true);
const commandClientBackend = await commandClient.postBackendJson("practice-timing-create", { payload: { videoId: "video-1" } });
assert.equal(commandClientBackend.id, "backend-1");
commandClientStorage.set("afShadowingDictionaryMock", "cards");
const mockedDictionaryResponse = await commandClient.requestDictionaryCommand("dict-lookup", { clickedForm: "appel" });
assert.equal(mockedDictionaryResponse.ok, true);
assert.equal(JSON.parse(commandClientDocument.documentElement.dataset.afShadowingDictionaryMockCommands)[0].operation, "dict-lookup");
commandClientStorage.set("afShadowingIssueReportMock", "success");
const mockedIssueResponse = await commandClient.requestBackendCommand("issue-report-submit", {});
assert.equal(JSON.parse(mockedIssueResponse.text).category, "timing");

const mergedAccountSession = accountSession.mergeBackendSession(
  { user: { email: "old@example.test" }, preferences: { theme: "old" } },
  { authenticated: true, user: { email: "new@example.test" }, preferences: { nativeLanguage: "ru" } },
);
assert.equal(mergedAccountSession.authenticated, true);
assert.equal(mergedAccountSession.user.email, "new@example.test");
assert.equal(mergedAccountSession.preferences.nativeLanguage, "ru");
const signedInAccount = accountSession.sessionState({ user: { email: "new@example.test" } }, "");
assert.equal(signedInAccount.accountStatus, "signed-in");
assert.equal(accountSession.accountStatusLabel(signedInAccount), "new@example.test");
assert.equal(accountSession.accountStatusAriaLabel(signedInAccount), "2000NL account connected as new@example.test");
assert.equal(accountSession.accountStatusCopy(signedInAccount), "Connected as new@example.test.");
assert.equal(accountSession.accountConnectLabel(signedInAccount), "Disconnect");
const signedInControl = accountSession.accountControlState({ ...signedInAccount, accountMenuOpen: true });
assert.equal(signedInControl.icon, "account-connected");
assert.equal(signedInControl.connected, true);
assert.equal(signedInControl.expanded, true);
assert.equal(signedInControl.copy, "Connected as new@example.test.");
assert.equal(signedInControl.actionText, "Disconnect");
const expiredAccount = accountSession.sessionState(null, "token expired");
assert.equal(expiredAccount.accountStatus, "expired");
assert.equal(accountSession.accountStatusLabel(expiredAccount), "Reconnect 2000NL");
assert.equal(accountSession.accountStatusCopy(expiredAccount), "Session expired: token expired");
assert.equal(accountSession.accountConnectLabel({ ...expiredAccount, accountLoading: true }), "Connecting...");
const expiredCard = accountSession.accountMiniCardState({ ...expiredAccount, accountLoading: true });
assert.equal(expiredCard.copy, "Connecting to 2000NL...");
assert.equal(expiredCard.error, "token expired");
assert.equal(expiredCard.actionText, "Connecting...");
assert.equal(expiredCard.actionDisabled, true);
const expiredPrompt = accountSession.connectPromptState({ ...expiredAccount, accountLoading: true });
assert.equal(expiredPrompt.copy, "Connecting to 2000NL...");
assert.equal(expiredPrompt.actionText, "Connecting...");
assert.equal(expiredPrompt.actionDisabled, true);
const accountCardHost = createTestElement("div");
let accountCardClicked = false;
const accountMiniCard = accountSessionDom.renderAccountCard(accountCardHost, expiredCard, {
  onAccountAction: () => {
    accountCardClicked = true;
  },
});
assert.equal(accountCardHost.children[0].children[1].textContent, "Click a word");
assert.equal(accountMiniCard.children[1].textContent, "Connecting to 2000NL...");
assert.equal(accountMiniCard.children[2].textContent, "token expired");
assert.equal(accountMiniCard.children[3].dataset.afSignIn, "");
assert.equal(accountMiniCard.children[3].disabled, true);
accountMiniCard.children[3].listeners.click[0].listener();
assert.equal(accountCardClicked, true);
const connectPromptHost = createTestElement("div");
let promptClicked = false;
const connectPrompt = accountSessionDom.renderConnectPrompt(connectPromptHost, expiredPrompt, {
  onAccountAction: () => {
    promptClicked = true;
  },
});
assert.equal(connectPrompt.children[0].textContent, "Connecting to 2000NL...");
assert.equal(connectPrompt.children[1].textContent, "Connecting...");
assert.equal(connectPrompt.children[1].disabled, true);
connectPrompt.children[1].listeners.click[0].listener();
assert.equal(promptClicked, true);
const guestAccount = accountSession.sessionState(null, "");
assert.equal(guestAccount.accountStatus, "guest");
assert.equal(accountSession.accountStatusLabel(guestAccount), "Guest lookup");
assert.equal(accountSession.accountStatusCopy(guestAccount), "Not connected. Personal progress is off.");
const accountWorkflowMessages = [];
const accountWorkflowEvents = [];
const accountWorkflowRenders = [];
const accountWorkflowRefreshes = [];
const accountWorkflowState = {
  selectedWord: { word: "oog", phraseIndex: 3 },
  accountLoading: false,
  accountError: "",
};
const accountWorkflow = accountSessionWorkflow.createAccountSessionWorkflow({
  state: accountWorkflowState,
  chrome: { runtime: { sendMessage() {} } },
  accountSession,
  sendRuntimeMessage: async (message) => {
    accountWorkflowMessages.push(message);
    if (message.type === "af-get-2000nl-session") {
      return { ok: true, session: { user: { email: "chrome@example.test" } } };
    }
    if (message.type === "af-connect-2000nl") {
      return { ok: true, session: { user: { email: "connect@example.test" } } };
    }
    if (message.type === "af-disconnect-2000nl") {
      return { ok: true };
    }
    return { ok: false, error: "unexpected" };
  },
  fetchDictionarySession: async () => ({
    authenticated: true,
    user: { email: "backend@example.test" },
    preferences: { nativeLanguage: "ru" },
  }),
  recordDebugEvent: (type, detail) => accountWorkflowEvents.push({ type, detail }),
  render: () => accountWorkflowRenders.push("render"),
  onLookupRefresh: (selectedWord) => accountWorkflowRefreshes.push(selectedWord.word),
});
const freshWorkflowSession = await accountWorkflow.getFreshSession();
assert.equal(freshWorkflowSession.user.email, "backend@example.test");
assert.equal(accountWorkflowState.accountStatus, "signed-in");
assert.equal(accountWorkflowState.accountPreferences.nativeLanguage, "ru");
await accountWorkflow.connect();
assert.equal(accountWorkflowState.accountLoading, false);
assert.equal(accountWorkflowRefreshes.at(-1), "oog");
await accountWorkflow.disconnect();
assert.equal(accountWorkflowState.accountStatus, "guest");
assert.equal(accountWorkflowRefreshes.at(-1), "oog");
accountWorkflow.setSessionState(null, "expired");
assert.equal(accountWorkflowState.accountStatus, "expired");
assert.equal(accountWorkflowState.accountError, "expired");
assert.equal(accountWorkflowEvents.length, 0);

const backendTimingRequest = backendCommands.backendCommandRequest(
  "https://audiofilms-api.dilum.io",
  "practice-timing-create",
  { payload: { videoId: "video-1" } },
);
assert.equal(backendTimingRequest.url.pathname, "/api/practice/timing-jobs");
assert.equal(backendTimingRequest.fetchOptions.method, "POST");
assert.equal(JSON.parse(backendTimingRequest.fetchOptions.body).videoId, "video-1");
const backendOperationRequest = backendCommands.backendCommandRequest(
  "https://audiofilms-api.dilum.io",
  "practice-operation",
  { operationId: "operation 1" },
);
assert.equal(backendOperationRequest.url.pathname, "/api/practice/operations/operation%201");
assert.equal(backendOperationRequest.fetchOptions.method, "GET");
const disabledBackend = backendCommands.backendCommandRequest("", "practice-operation", {});
assert.equal(disabledBackend.response.ok, false);
assert.equal(JSON.parse(disabledBackend.response.text).error, "AudioFilms backend is disabled.");
assert.equal(
  backendCommands.parseBackendJsonResponse({ ok: false, status: 404, text: "<!doctype html><html></html>" }).errorMessage,
  "Timing endpoint is unavailable on this AudioFilms API.",
);
assert.equal(
  backendCommands.parseBackendJsonResponse({ ok: false, status: 500, text: JSON.stringify({ error: { message: "backend down" } }) }).errorMessage,
  "backend down",
);
const backendBuildState = { backendBuildInfo: null, backendBuildError: "" };
const backendBuildEvents = [];
let backendBuildRendered = 0;
assert.equal(await backendBuildWorkflow.refreshBackendBuildInfo({
  getState: () => backendBuildState,
  apiBaseForBackendCommands: () => "https://api.test",
  fetch: async (url, options) => {
    backendBuildEvents.push({ type: "fetch", url, options });
    return {
      json: async () => ({
        service: "audiofilms-api",
        status: "ok",
        version: "api-1",
        builtAt: "2026-06-30T05:00:00.000Z",
        commit: "abc123",
      }),
    };
  },
  recordDebugEvent: (type, detail) => backendBuildEvents.push({ type, detail }),
  render: () => {
    backendBuildRendered += 1;
  },
}), true);
assert.equal(backendBuildEvents[0].url, "https://api.test/api/health");
assert.equal(backendBuildEvents[0].options.cache, "no-store");
assert.equal(backendBuildState.backendBuildInfo.version, "api-1");
assert.equal(backendBuildState.backendBuildError, "");
assert.equal(backendBuildEvents.at(-1).type, "backend-build-info");
assert.equal(backendBuildRendered, 1);
assert.equal(await backendBuildWorkflow.refreshBackendBuildInfo({
  getState: () => backendBuildState,
  apiBaseForBackendCommands: () => "https://api.test",
  fetch: async () => {
    throw new Error("offline");
  },
  recordDebugEvent: (type, detail) => backendBuildEvents.push({ type, detail }),
  render: () => {
    backendBuildRendered += 1;
  },
}), false);
assert.equal(backendBuildState.backendBuildError, "offline");
assert.equal(backendBuildEvents.at(-1).type, "backend-build-info-failed");
assert.equal(backendBuildRendered, 2);

const translationPhrase = {
  index: 4,
  text: "kleine rode ster",
  displayText: "Een kleine rode ster.",
  translationText: "small red star",
  displaySegmentId: "segment-1",
};
assert.equal(phraseTranslations.phraseDisplayText(translationPhrase), "Een kleine rode ster.");
assert.equal(phraseTranslations.phraseTranslationSourceText(translationPhrase), "small red star");
const segmentedPhrasesForTranslation = [
  { displaySegmentId: "sentence-1", segmentRole: "sentence-segment", text: "kleine" },
  { displaySegmentId: "sentence-1", segmentRole: "sentence-segment", text: "rode ster" },
  { displaySegmentId: "sentence-2", segmentRole: "sentence-segment", text: "later" },
];
assert.equal(
  `${phraseTranslations.phraseSegmentIndicator(segmentedPhrasesForTranslation, segmentedPhrasesForTranslation[1], 1).index}/` +
    phraseTranslations.phraseSegmentIndicator(segmentedPhrasesForTranslation, segmentedPhrasesForTranslation[1], 1).count,
  "1/2",
);
const displayRange = phraseTranslations.phraseDisplaySegmentRange({
  text: "rode ster",
  displayText: "de kleine rode ster",
  displayStartChar: 10,
  displayEndChar: 18,
});
assert.equal(`${displayRange.start}-${displayRange.end}`, "10-18");
assert.equal(phraseTranslations.segmentOverlapsRange({ charStart: 3, charEnd: 6 }, { start: 5, end: 8 }), true);
assert.equal(phraseTranslations.segmentOverlapsRange({ charStart: 1, charEnd: 3 }, { start: 5, end: 8 }), false);
const phraseRowState = phraseRows.phraseRowState({
  phrase: {
    startMs: 1234,
    endMs: 5678,
    text: "rode ster",
    displayText: "de kleine rode ster",
    displayStartChar: 10,
    displayEndChar: 18,
    displaySegmentId: "sentence-1",
    segmentRole: "sentence-segment",
  },
  index: 1,
  phrases: segmentedPhrasesForTranslation,
  currentIndex: 1,
  practiceMode: "recall",
  textVisible: false,
  phraseTranslationVisible: true,
  translation: { status: "ready", translatedText: "красная звезда" },
  accountStatus: "signed-in",
  playbackEndMs: 6000,
});
assert.equal(phraseRowState.dataset.startMs, "1234");
assert.equal(phraseRowState.dataset.playbackEndMs, "6000");
assert.equal(phraseRowState.classes.current, true);
assert.equal(phraseRowState.classes.recallMode, true);
assert.equal(phraseRowState.prompt.text, "красная звезда");
assert.equal(phraseRowState.text.showOriginal, false);
assert.equal(phraseRowState.text.hasReplaySegment, true);
assert.equal(phraseRowState.translation.hidden, true);
const recallEntryDisplay = phraseTranslations.phraseEntryDisplayState({
  practiceMode: "recall",
  shadowTextVisible: true,
  phraseTranslationStickyVisible: false,
});
assert.equal(recallEntryDisplay.practiceMode, "recall");
assert.equal(recallEntryDisplay.textVisible, false);
assert.equal(recallEntryDisplay.phraseTranslationVisible, true);
assert.equal(recallEntryDisplay.shouldEnsureTranslation, true);
const shadowEntryDisplay = phraseTranslations.phraseEntryDisplayState({
  practiceMode: "shadow",
  shadowTextVisible: true,
  phraseTranslationStickyVisible: false,
});
assert.equal(shadowEntryDisplay.textVisible, true);
assert.equal(shadowEntryDisplay.phraseTranslationVisible, false);
assert.equal(shadowEntryDisplay.shouldEnsureTranslation, false);
const stickyTranslationToggle = phraseTranslations.phraseTranslationToggleState({
  shiftKey: true,
  phraseTranslationVisible: false,
  phraseTranslationStickyVisible: false,
});
assert.equal(stickyTranslationToggle.phraseTranslationStickyVisible, true);
assert.equal(stickyTranslationToggle.phraseTranslationVisible, true);
assert.equal(stickyTranslationToggle.shouldEnsureTranslation, true);
const currentTranslationToggle = phraseTranslations.phraseTranslationToggleState({
  shiftKey: false,
  phraseTranslationVisible: true,
  phraseTranslationStickyVisible: true,
});
assert.equal(currentTranslationToggle.phraseTranslationStickyVisible, true);
assert.equal(currentTranslationToggle.phraseTranslationVisible, false);
assert.equal(currentTranslationToggle.shouldEnsureTranslation, false);
const shadowRowState = phraseRows.phraseRowState({
  phrase: translationPhrase,
  index: 4,
  currentIndex: 2,
  practiceMode: "shadow",
  textVisible: false,
  phraseTranslationVisible: false,
  translation: { status: "ready", translatedText: "маленькая красная звезда" },
  accountStatus: "signed-in",
});
assert.equal(shadowRowState.text.showOriginal, true);
assert.equal(shadowRowState.translation.hidden, true);
assert.equal(shadowRowState.translation.visibleText, "маленькая красная звезда");
const wordState = phraseRows.clickableWordState({
  segment: { lookupWord: "Hoog", tokenIndex: 2, charStart: 4, charEnd: 8 },
  phraseIndex: 3,
  replayRange: { start: 0, end: 6 },
  selectedWord: { phraseIndex: 3, word: "hoog" },
  selectedSpan: { phraseIndex: 3, startTokenIndex: 1, endTokenIndex: 3 },
  spanDraft: { phraseIndex: 3, startTokenIndex: 2, endTokenIndex: 4 },
  lastWordReplay: { phraseIndex: 3, tokenIndex: 2, atMs: 1000 },
  nowMs: 1500,
});
assert.equal(wordState.dataset.lookupWord, "Hoog");
assert.equal(wordState.classes.replaySegment, true);
assert.equal(wordState.classes.selected, true);
assert.equal(wordState.classes.spanSelected, true);
assert.equal(wordState.classes.spanDraft, true);
assert.equal(wordState.classes.wordReplay, true);
const clickableSegmentsState = phraseRows.clickablePhraseSegmentsState({
  text: "Hoog aan de hemel.",
  phraseIndex: 3,
  replayRange: { start: 0, end: 4 },
  selectedWord: { word: "Hoog", phraseIndex: 3 },
  nowMs: 2000,
});
assert.equal(clickableSegmentsState[0].kind, "word");
assert.equal(clickableSegmentsState[0].state.dataset.lookupWord, "Hoog");
assert.equal(clickableSegmentsState[0].state.classes.selected, true);
assert.equal(clickableSegmentsState.some((segment) => segment.kind === "text"), true);
const phraseRowHost = createTestElement("div");
const renderedPhraseRow = phraseRowsDom.appendPhraseRow(phraseRowHost, shadowRowState, {
  phraseIndex: 4,
  selectedWord: { word: "kleine", phraseIndex: 4 },
  shouldSuppressWordClick: () => false,
  onLookupWord: () => {},
});
assert.equal(renderedPhraseRow.dataset.afPhraseStartMs, shadowRowState.dataset.startMs);
assert.equal(renderedPhraseRow.style.properties["--af-segment-count"], "1");
assert.equal(renderedPhraseRow.children[2].classList.contains("has-replay-segment"), true);
const workflowPhraseRowsState = {
  phrases: [{
    text: "Hoog aan",
    startMs: 1000,
    endMs: 2500,
  }],
  currentIndex: 0,
  practiceMode: "shadow",
  textVisible: true,
  phraseTranslationVisible: false,
  selectedWord: null,
  selectedSpan: null,
  spanSelectionDraft: null,
  lastWordReplay: null,
  suppressWordClickUntil: 0,
  accountStatus: "signed-in",
};
const workflowPhraseRowsHost = createTestElement("div");
let workflowLookup = null;
let workflowReplay = null;
let workflowPreviewCount = 0;
let workflowRendered = 0;
let workflowSelectedSpanTranslation = null;
const workflowPhraseRow = phraseRowsWorkflow.appendPhraseRow(workflowPhraseRowsHost, workflowPhraseRowsState.phrases[0], 0, {
  state: workflowPhraseRowsState,
  phraseRows,
  phraseRowsDom,
  selectedSpanWorkflow,
  selectedSpans,
  phraseTranslationState: () => null,
  playbackEndMsForPhrase: () => 2600,
  applySpanSelectionDraftPreview: () => {
    workflowPreviewCount += 1;
  },
  clearSpanSelectionDraft: () => {
    workflowPhraseRowsState.spanSelectionDraft = null;
  },
  selectLookupWord: (word, phraseIndex, selection) => {
    workflowLookup = { word, phraseIndex, selection };
  },
  handleWordReplayGesture: (event, word, phraseIndex, selection) => {
    workflowReplay = { shiftKey: event.shiftKey, word, phraseIndex, selection };
  },
  render: () => {
    workflowRendered += 1;
  },
  requestSelectedSpanTranslation: (span) => {
    workflowSelectedSpanTranslation = span;
  },
  nowMs: () => 1000,
});
assert.equal(workflowPhraseRow.dataset.afPhrasePlaybackEndMs, "2600");
const workflowWord = workflowPhraseRow.children[2].children[0];
const workflowSecondWord = workflowPhraseRow.children[2].children[2];
workflowWord.listeners.click[0].listener({
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(workflowLookup.word, "Hoog");
workflowWord.listeners.click[0].listener({
  shiftKey: true,
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(workflowReplay.word, "Hoog");
assert.equal(workflowReplay.shiftKey, true);
workflowWord.listeners.pointerdown[0].listener({ button: 0 });
assert.equal(workflowPhraseRowsState.spanSelectionDraft.startTokenIndex, 0);
assert.equal(workflowPreviewCount, 1);
workflowSecondWord.listeners.pointerenter[0].listener({ buttons: 1 });
assert.equal(workflowPreviewCount, 2);
workflowSecondWord.listeners.pointerup[0].listener({
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(workflowRendered, 1);
assert.equal(workflowSelectedSpanTranslation.text, "Hoog aan");
assert.equal(workflowPhraseRowsState.suppressWordClickUntil, 1500);
const clickableHost = createTestElement("div");
let lookupSelection = null;
let replaySelection = null;
let draftStart = null;
let draftMove = null;
let draftEnd = null;
let draftCancel = false;
phraseRowsDom.renderClickablePhraseText(clickableHost, "Hoog aan", 3, { start: 0, end: 4 }, {
  selectedWord: { word: "Hoog", phraseIndex: 3 },
  shouldSuppressWordClick: () => false,
  onLookupWord: (word, phraseIndex, selection) => {
    lookupSelection = { word, phraseIndex, selection };
  },
  onWordReplay: (event, word, phraseIndex, selection) => {
    replaySelection = { word, phraseIndex, selection, shiftKey: event.shiftKey };
  },
  onSpanDraftStart: (phraseIndex, tokenIndex) => {
    draftStart = { phraseIndex, tokenIndex };
  },
  onSpanDraftMove: (event, phraseIndex, tokenIndex) => {
    draftMove = { buttons: event.buttons, phraseIndex, tokenIndex };
  },
  onSpanDraftEnd: (event, phraseIndex, tokenIndex) => {
    draftEnd = { phraseIndex, tokenIndex };
    return true;
  },
  onSpanDraftCancel: () => {
    draftCancel = true;
  },
});
const firstWordButton = clickableHost.children[0];
assert.equal(firstWordButton.dataset.afLookupWord, "Hoog");
assert.equal(firstWordButton.classList.contains("is-selected"), true);
firstWordButton.listeners.click[0].listener({
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(lookupSelection.word, "Hoog");
firstWordButton.listeners.click[0].listener({
  shiftKey: true,
  preventDefault() {},
  stopPropagation() {},
});
assert.equal(replaySelection.shiftKey, true);
firstWordButton.listeners.pointerdown[0].listener({ button: 0 });
firstWordButton.listeners.pointerenter[0].listener({ buttons: 1 });
let pointerUpPrevented = false;
firstWordButton.listeners.pointerup[0].listener({
  preventDefault() {
    pointerUpPrevented = true;
  },
  stopPropagation() {},
});
firstWordButton.listeners.pointercancel[0].listener({});
assert.deepEqual(draftStart, { phraseIndex: 3, tokenIndex: 0 });
assert.deepEqual(draftMove, { buttons: 1, phraseIndex: 3, tokenIndex: 0 });
assert.deepEqual(draftEnd, { phraseIndex: 3, tokenIndex: 0 });
assert.equal(pointerUpPrevented, true);
assert.equal(draftCancel, true);
const spanWorkflowState = {
  spanSelectionDraft: null,
  selectedWord: { word: "Hoog" },
  selectedSpan: null,
  suppressWordClickUntil: 0,
};
let spanPreviewCount = 0;
let spanWorkflowRendered = false;
let spanWorkflowTranslated = null;
selectedSpanWorkflow.startSpanDraft(spanWorkflowState, 2, 0, {
  applyPreview: () => {
    spanPreviewCount += 1;
  },
});
assert.equal(spanWorkflowState.spanSelectionDraft.phraseIndex, 2);
assert.equal(spanWorkflowState.spanSelectionDraft.startTokenIndex, 0);
assert.equal(spanWorkflowState.spanSelectionDraft.endTokenIndex, 0);
assert.equal(spanPreviewCount, 1);
assert.equal(selectedSpanWorkflow.moveSpanDraft(spanWorkflowState, { buttons: 1 }, 2, 1, {
  applyPreview: () => {
    spanPreviewCount += 1;
  },
}), true);
assert.equal(spanWorkflowState.spanSelectionDraft.endTokenIndex, 1);
assert.equal(spanPreviewCount, 2);
assert.equal(selectedSpanWorkflow.endSpanDraft(spanWorkflowState, {}, 2, 1, {
  phrase: { displayText: "Hoog aan", text: "Hoog aan" },
  selectedSpanFromDraft: selectedSpans.selectedSpanFromDraft,
  render: () => {
    spanWorkflowRendered = true;
  },
  requestSelectedSpanTranslation: (span) => {
    spanWorkflowTranslated = span;
  },
  nowMs: () => 1500,
}), true);
assert.equal(spanWorkflowState.spanSelectionDraft, null);
assert.equal(spanWorkflowState.selectedWord, null);
assert.equal(spanWorkflowState.selectedSpan.text, "Hoog aan");
assert.equal(spanWorkflowTranslated, spanWorkflowState.selectedSpan);
assert.equal(spanWorkflowRendered, true);
assert.equal(spanWorkflowState.suppressWordClickUntil, 1500);
selectedSpanWorkflow.startSpanDraft(spanWorkflowState, 2, 0);
assert.equal(selectedSpanWorkflow.cancelSpanDraft(spanWorkflowState, {
  applyPreview: () => {
    spanPreviewCount += 1;
  },
}), true);
assert.equal(spanWorkflowState.spanSelectionDraft, null);
assert.equal(
  phraseTranslations.phraseTranslationKey({
    phrase: translationPhrase,
    index: 4,
    videoId: "video-1",
    sourceId: "nl:manual",
  }),
  "video-1|nl:manual|segment-1|small red star",
);
assert.equal(
  phraseTranslations.phraseTranslationId({
    phrase: translationPhrase,
    index: 4,
    videoId: "video-1",
    sourceId: "nl:manual",
  }),
  "video-1:nl:manual:segment-1",
);
assert.equal(
  phraseTranslations.sourceLanguageCode({
    source: { loadedTranscriptResult: { languageCode: "nl-NL" }, languageCode: "nl" },
    transcriptResult: { languageCode: "en" },
  }),
  "nl-NL",
);
const phraseTranslationPayload = phraseTranslations.phraseTranslationPayload({
  phrase: translationPhrase,
  index: 4,
  videoId: "video-1",
  sourceId: "nl:manual",
  sourceLanguageCode: "nl",
  targetLanguageCode: "ru",
});
assert.equal(phraseTranslationPayload.phraseId, "video-1:nl:manual:segment-1");
assert.equal(phraseTranslationPayload.sourceText, "small red star");
assert.equal(phraseTranslationPayload.contextText, "Een kleine rode ster.");
assert.equal(phraseTranslationPayload.targetLanguageCode, "ru");
assert.equal(phraseTranslations.phraseTranslationText({ status: "ready", translatedText: "маленькая красная звезда" }), "маленькая красная звезда");
assert.equal(phraseTranslations.phraseTranslationCopy({ translation: { status: "loading" }, accountStatus: "signed-in" }), "Translating phrase...");
assert.equal(phraseTranslations.phraseTranslationCopy({ translation: null, accountStatus: "guest" }), "Connect 2000NL to translate phrases.");
assert.equal(
  phraseTranslations.phraseTranslationResultState({ error: { code: "no_text" } }).error,
  "no_text",
);
const phraseWorkflowState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  transcriptResult: { languageCode: "nl" },
  accountPreferences: { translationTargetLanguageCode: "ru" },
  accountStatus: "signed-in",
  phraseTranslationSeq: 0,
  phraseTranslations: {},
  phrases: [translationPhrase],
  currentIndex: 0,
};
const phraseWorkflowEvents = [];
let phraseWorkflowRenderCount = 0;
const phraseWorkflowKey = phraseTranslations.phraseTranslationKey({
  phrase: translationPhrase,
  index: 0,
  videoId: "video-1",
  sourceId: "nl:manual",
});
await phraseTranslationWorkflow.requestPhraseTranslation(phraseWorkflowState, {
  phrase: translationPhrase,
  index: 0,
  key: phraseWorkflowKey,
  options: {
    phraseTranslations,
    getSelectedPracticeSource: () => ({ languageCode: "nl" }),
    postDictionaryCommand: async (operation, payload) => {
      assert.equal(operation, "phrase-translation");
      assert.equal(payload.targetLanguageCode, "ru");
      return { translatedText: "маленькая красная звезда" };
    },
    phraseTranslationId: (phrase, index) => phraseTranslations.phraseTranslationId({
      phrase,
      index,
      videoId: phraseWorkflowState.videoId,
      sourceId: phraseWorkflowState.selectedSourceId,
    }),
    recordDebugEvent: (type, detail) => phraseWorkflowEvents.push({ type, detail }),
    render: () => {
      phraseWorkflowRenderCount += 1;
    },
  },
});
assert.equal(phraseWorkflowState.phraseTranslationSeq, 1);
assert.equal(phraseWorkflowState.phraseTranslations[phraseWorkflowKey].status, "ready");
assert.equal(phraseWorkflowState.phraseTranslations[phraseWorkflowKey].translatedText, "маленькая красная звезда");
assert.equal(phraseWorkflowEvents[0].type, "phrase-translation-loaded");
assert.equal(phraseWorkflowRenderCount, 2);
const phraseEntryWorkflowState = {
  practiceMode: "recall",
  shadowTextVisible: true,
  phraseTranslationStickyVisible: false,
  textVisible: true,
  phraseTranslationVisible: false,
};
let phraseEntryWorkflowEnsureCount = 0;
const phraseEntryWorkflowDisplay = phraseTranslationWorkflow.applyPhraseEntryDisplayState(phraseEntryWorkflowState, {
  phraseTranslations,
  ensureCurrentPhraseTranslation: () => {
    phraseEntryWorkflowEnsureCount += 1;
  },
});
assert.equal(phraseEntryWorkflowState.textVisible, false);
assert.equal(phraseEntryWorkflowState.phraseTranslationVisible, true);
assert.equal(phraseEntryWorkflowDisplay.shouldEnsureTranslation, true);
assert.equal(phraseEntryWorkflowEnsureCount, 1);
let phraseToggleWorkflowRenderCount = 0;
let phraseToggleWorkflowEnsureCount = 0;
const phraseToggleWorkflowState = {
  phraseTranslationVisible: false,
  phraseTranslationStickyVisible: false,
};
const phraseToggleWorkflowDisplay = phraseTranslationWorkflow.togglePhraseTranslation(phraseToggleWorkflowState, { shiftKey: true }, {
  phraseTranslations,
  ensureCurrentPhraseTranslation: () => {
    phraseToggleWorkflowEnsureCount += 1;
  },
  render: () => {
    phraseToggleWorkflowRenderCount += 1;
  },
});
assert.equal(phraseToggleWorkflowState.phraseTranslationStickyVisible, true);
assert.equal(phraseToggleWorkflowState.phraseTranslationVisible, true);
assert.equal(phraseToggleWorkflowDisplay.shouldEnsureTranslation, true);
assert.equal(phraseToggleWorkflowEnsureCount, 1);
assert.equal(phraseToggleWorkflowRenderCount, 1);
const phraseModeWorkflowState = {
  practiceMode: "shadow",
  shadowTextVisible: true,
  phraseTranslationStickyVisible: false,
  textVisible: true,
  phraseTranslationVisible: false,
};
let phraseModeWorkflowRenderCount = 0;
let phraseModeWorkflowEnsureCount = 0;
const phraseModeWorkflowDisplay = phraseTranslationWorkflow.setPracticeMode(phraseModeWorkflowState, "recall", {
  phraseTranslations,
  ensureCurrentPhraseTranslation: () => {
    phraseModeWorkflowEnsureCount += 1;
  },
  render: () => {
    phraseModeWorkflowRenderCount += 1;
  },
});
assert.equal(phraseModeWorkflowState.practiceMode, "recall");
assert.equal(phraseModeWorkflowState.textVisible, false);
assert.equal(phraseModeWorkflowState.phraseTranslationVisible, true);
assert.equal(phraseModeWorkflowDisplay.shouldEnsureTranslation, true);
assert.equal(phraseModeWorkflowEnsureCount, 1);
assert.equal(phraseModeWorkflowRenderCount, 1);
const guestPhraseWorkflowState = {
  ...phraseWorkflowState,
  accountStatus: "guest",
  phraseTranslations: {},
};
assert.equal(phraseTranslationWorkflow.ensureCurrentPhraseTranslation(guestPhraseWorkflowState, {
  phraseTranslationKey: (phrase, index) => phraseTranslations.phraseTranslationKey({
    phrase,
    index,
    videoId: guestPhraseWorkflowState.videoId,
    sourceId: guestPhraseWorkflowState.selectedSourceId,
  }),
}), true);
assert.equal(Object.values(guestPhraseWorkflowState.phraseTranslations)[0].status, "failed");
const spanTranslationPayload = phraseTranslations.spanTranslationPayload({
  phrase: translationPhrase,
  span: { text: "rode ster", contextText: "kleine rode ster", startTokenIndex: 1, endTokenIndex: 2 },
  phraseIndex: 4,
  videoId: "video-1",
  sourceId: "nl:manual",
  sourceLanguageCode: "nl",
});
assert.equal(spanTranslationPayload.phraseId, "video-1:nl:manual:segment-1:span:1-2");
assert.equal(spanTranslationPayload.purpose, "youtube-span-translation");
assert.equal(
  phraseTranslations.spanTranslationResultState(
    { text: "rode ster" },
    { translatedText: "красная звезда" },
  ).translatedText,
  "красная звезда",
);
const spanWorkflowGuestState = {
  phrases: [translationPhrase],
  selectedSpan: { phraseIndex: 0, text: "rode ster" },
  accountStatus: "guest",
  transcriptResult: { languageCode: "nl" },
};
let spanWorkflowGuestRendered = false;
await phraseTranslationWorkflow.requestSelectedSpanTranslation(spanWorkflowGuestState, spanWorkflowGuestState.selectedSpan, {
  phraseTranslations,
  render: () => {
    spanWorkflowGuestRendered = true;
  },
});
assert.equal(spanWorkflowGuestState.selectedSpan.status, "failed");
assert.equal(spanWorkflowGuestRendered, true);
const spanWorkflowSignedInSpan = { phraseIndex: 0, text: "rode ster", contextText: "kleine rode ster", startTokenIndex: 1, endTokenIndex: 2 };
const spanWorkflowSignedInState = {
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [translationPhrase],
  selectedSpan: spanWorkflowSignedInSpan,
  accountStatus: "signed-in",
  accountPreferences: { translationTargetLanguageCode: "ru" },
  transcriptResult: { languageCode: "nl" },
};
await phraseTranslationWorkflow.requestSelectedSpanTranslation(spanWorkflowSignedInState, spanWorkflowSignedInSpan, {
  phraseTranslations,
  getSelectedPracticeSource: () => ({ languageCode: "nl" }),
  postDictionaryCommand: async () => ({ translatedText: "красная звезда" }),
  render: () => {},
});
assert.equal(spanWorkflowSignedInState.selectedSpan.status, "ready");
assert.equal(spanWorkflowSignedInState.selectedSpan.translatedText, "красная звезда");
const selectedSpan = selectedSpans.selectedSpanFromDraft(
  { phraseIndex: 0, startTokenIndex: 1, endTokenIndex: 2 },
  { text: "de kleine rode ster" },
);
assert.equal(selectedSpan.text, "kleine rode");
assert.equal(selectedSpan.contextText, "de kleine rode ster");
assert.equal(selectedSpan.status, "loading");
const selectedSpanBinding = selectedSpans.selectedSpanSourceBinding({
  span: selectedSpan,
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{ index: 0, startMs: 1000, endMs: 2000, text: "de kleine rode ster" }],
  currentIndex: 0,
  source: {
    languageCode: "nl",
    track: { kind: "manual", vssId: ".nl" },
    loadedTranscriptResult: { languageCode: "nl", timingExactness: "exact" },
  },
});
assert.equal(selectedSpanBinding.selection.clickedForm, "kleine rode");
assert.equal(selectedSpanBinding.videoId, "video-1");
const selectedSpanWorkflowBinding = selectedSpanWorkflow.selectedSpanSourceBinding(selectedSpan, {
  state: {
    videoId: "video-workflow",
    selectedSourceId: "nl:manual",
    selectedTrack: { languageCode: "nl" },
    phrases: [{ index: 0, startMs: 1000, endMs: 2000, text: "de kleine rode ster" }],
    currentIndex: 0,
    transcriptResult: { retrievalPath: "backend-provider" },
  },
  selectedSpans,
  getSelectedPracticeSource: () => ({
    languageCode: "nl",
    track: { kind: "manual", vssId: ".nl" },
    loadedTranscriptResult: { languageCode: "nl", timingExactness: "exact" },
  }),
});
assert.equal(selectedSpanWorkflowBinding.videoId, "video-workflow");
assert.equal(selectedSpanWorkflowBinding.selection.clickedForm, "kleine rode");
assert.equal(selectedSpanWorkflowBinding.captionSource.trackKind, "manual");
const selectedSpanContext = selectedSpans.selectedSpanSourceContext({
  span: selectedSpan,
  entryId: "entry-1",
  action: "start-learning",
  videoId: "video-1",
  selectedSourceId: "nl:manual",
  phrases: [{ index: 0, startMs: 1000, endMs: 2000, text: "de kleine rode ster" }],
  currentIndex: 0,
  source: {
    languageCode: "nl",
    track: { kind: "manual", vssId: ".nl" },
    loadedTranscriptResult: { languageCode: "nl", timingExactness: "exact" },
  },
  observation: { currentPlaybackTimeMs: 1500, title: "Unit video", capturedAt: "2026-06-29T12:00:00.000Z" },
  clientVersion: "0.1.0",
});
assert.equal(selectedSpanContext.selection.clickedForm, "kleine rode");
assert.equal(selectedSpanContext.diagnostics.action, "start-learning");
assert.equal(selectedSpanContext.diagnostics.cardId, "entry-1");
const selectedSpanWorkflowContext = selectedSpanWorkflow.selectedSpanSourceContext(selectedSpan, {
  entryId: "entry-2",
  action: "generated-entry-save",
  state: {
    videoId: "video-2",
    selectedSourceId: "nl:manual",
    selectedTrack: { label: "Dutch" },
    phrases: [{ index: 0, startMs: 1000, endMs: 2000, text: "de kleine rode ster" }],
    currentIndex: 0,
    transcriptResult: { retrievalPath: "backend-provider" },
  },
  selectedSpans,
  getSelectedPracticeSource: () => ({
    languageCode: "nl",
    track: { kind: "manual", vssId: ".nl" },
    loadedTranscriptResult: { languageCode: "nl", timingExactness: "exact" },
  }),
  getVideoElement: () => ({ currentTime: 1.75 }),
  youtubeVideoTitle: () => "Workflow video",
  extensionVersion: () => "0.2.0",
  nowIso: () => "2026-06-30T08:00:00.000Z",
});
assert.equal(selectedSpanWorkflowContext.source.externalId, "video-2");
assert.equal(selectedSpanWorkflowContext.diagnostics.action, "generated-entry-save");
assert.equal(selectedSpanWorkflowContext.diagnostics.cardId, "entry-2");
assert.equal(selectedSpanWorkflowContext.observation.currentPlaybackTimeMs, 1750);
assert.equal(selectedSpanWorkflowContext.observation.title, "Workflow video");
assert.equal(selectedSpanWorkflowContext.diagnostics.clientVersion, "0.2.0");
const selectedSpanPayload = selectedSpans.selectedSpanGeneratedEntryPayload({
  span: selectedSpan,
  phrase: { text: "de kleine rode ster" },
  sourceLanguageCode: "nl",
  sourceContext: selectedSpanContext,
  draftPayload: { draftSetId: "draft-set-1", candidateId: "candidate-1", revision: 1, item: { headword: "kleine rode" } },
});
assert.equal(selectedSpanPayload.ok, true);
assert.equal(selectedSpanPayload.value.clickedForm, "kleine rode");
assert.equal(selectedSpanPayload.value.draftSetId, "draft-set-1");
assert.equal(
  selectedSpans.selectedSpanGeneratedEntryPayload({ span: selectedSpan, sourceLanguageCode: "auto" }).error,
  "Missing source language.",
);
let workflowSelectedSpan = selectedSpan;
const selectedSpanWorkflowCommands = [];
let selectedSpanWorkflowRenderCount = 0;
await selectedSpanWorkflow.saveSelectedSpanCard(selectedSpan, {
  accountStatus: "signed-in",
  getSelectedSpan: () => workflowSelectedSpan,
  setSelectedSpan: (span) => {
    workflowSelectedSpan = span;
  },
  buildPayload: (_span, draft, action = "generated-entry-draft") => ({
    ok: true,
    value: {
      action,
      clickedForm: _span.text,
      ...(draft ? { candidateId: draft.candidateId } : {}),
    },
  }),
  postDictionaryCommand: async (operation, payload) => {
    selectedSpanWorkflowCommands.push({ operation, payload });
    if (operation === "dict-generated-draft") {
      return { draft: { draftSetId: "draft-set-1", candidateId: "candidate-1", revision: 1, item: { headword: "kleine rode" } } };
    }
    if (operation === "dict-generated-save") {
      return { entryId: "entry-1" };
    }
    return { ok: true };
  },
  createMutationTurnId: () => "turn-1",
  sourceContext: (_span, entryId, action) => ({ entryId, action }),
  render: () => {
    selectedSpanWorkflowRenderCount += 1;
  },
});
assert.equal(workflowSelectedSpan.saveStatus, "saved");
assert.equal(workflowSelectedSpan.savedEntryId, "entry-1");
assert.equal(
  selectedSpanWorkflowCommands.map((command) => command.operation).join("|"),
  "dict-generated-draft|dict-generated-save|dict-action",
);
assert.equal(selectedSpanWorkflowCommands[2].payload.sourceContext.action, "start-learning");
assert.equal(selectedSpanWorkflowRenderCount, 2);
let signedOutWorkflowSpan = selectedSpan;
await selectedSpanWorkflow.saveSelectedSpanCard(selectedSpan, {
  accountStatus: "signed-out",
  getSelectedSpan: () => signedOutWorkflowSpan,
  setSelectedSpan: (span) => {
    signedOutWorkflowSpan = span;
  },
  render: () => {},
});
assert.equal(signedOutWorkflowSpan.saveError, "Connect 2000NL to save selected phrases.");
const selectedSpanCard = selectedSpans.selectedSpanCardState({
  span: {
    status: "ready",
    translatedText: "маленькая красная",
    literalTranslatedText: "маленький красный",
    translatorComment: "Context prefers feminine agreement.",
    saveStatus: "saving",
  },
  saveLabel: "Save phrase",
});
assert.equal(selectedSpanCard.fields.length, 3);
assert.equal(selectedSpanCard.fields[0].label, "Context translation");
assert.equal(selectedSpanCard.save.disabled, true);
assert.equal(selectedSpanCard.clear.label, "Clear selection");
const savedSelectedSpanCard = selectedSpans.selectedSpanCardState({
  span: { status: "ready", translatedText: "готово", saveStatus: "saved" },
});
assert.equal(savedSelectedSpanCard.saveFeedback.text, "Started learning.");
assert.equal(savedSelectedSpanCard.saveFeedback.className, "af-dictionary-copy af-span-save-feedback");
assert.equal(
  selectedSpans.selectedSpanCardState({ span: { status: "ready", saveError: "save failed" } }).saveFeedback.className,
  "af-source-option-error af-span-save-feedback",
);
assert.equal(
  selectedSpans.selectedSpanCardState({ span: { status: "failed", error: "" } }).error,
  "Selected span translation failed.",
);
assert.equal(
  selectedSpans.selectedSpanTitleState({ text: "kleine rode" }).fallbackText,
  "kleine rode",
);
const selectedSpanTitle = selectedSpans.selectedSpanTitleState({
  tokens: [{
    text: "kleine",
    lookupWord: "klein",
    tokenIndex: 2,
    charStart: 4,
    charEnd: 10,
    originalToken: "kleine",
  }],
});
assert.equal(selectedSpanTitle.tokens[0].datasetKey, "afSpanTitleWord-2");
assert.equal(selectedSpanTitle.tokens[0].datasetTokenIndex, "2");
assert.equal(selectedSpanTitle.tokens[0].selection.originalToken, "kleine");
const selectedSpanCardHost = createTestElement("div");
let selectedSpanLookupToken = null;
let selectedSpanSaved = false;
let selectedSpanCleared = false;
const renderedSelectedSpanCard = selectedSpansDom.renderSelectedSpanCard(selectedSpanCardHost, {
  cardState: selectedSpanCard,
  titleState: selectedSpanTitle,
  renderTranslationField: dictionaryDom.renderTranslationField,
  onLookupWord: (token) => {
    selectedSpanLookupToken = token;
  },
  onSave: () => {
    selectedSpanSaved = true;
  },
  onClear: () => {
    selectedSpanCleared = true;
  },
});
assert.equal(renderedSelectedSpanCard.className, "af-dictionary-card af-span-translation-card");
assert.equal(renderedSelectedSpanCard.children[0].children[0].dataset.afLookupWord, "klein");
assert.equal(renderedSelectedSpanCard.children[1].className, "af-translation-field");
const selectedSpanActions = renderedSelectedSpanCard.children[4];
assert.equal(selectedSpanActions.children[0].dataset.afSpanSave, "");
assert.equal(selectedSpanActions.children[0].disabled, true);
assert.equal(selectedSpanActions.children[1].dataset.afSpanClear, "");
renderedSelectedSpanCard.children[0].children[0].listeners.click[0].listener();
selectedSpanActions.children[0].listeners.click[0].listener();
selectedSpanActions.children[1].listeners.click[0].listener();
assert.equal(selectedSpanLookupToken.lookupWord, "klein");
assert.equal(selectedSpanSaved, true);
assert.equal(selectedSpanCleared, true);
const selectedSpanWorkflowRenderHost = createTestElement("div");
let workflowRenderLookup = null;
let workflowRenderSaved = false;
let workflowRenderCleared = false;
const workflowRenderedSpanCard = selectedSpanWorkflow.renderSelectedSpanCard(selectedSpanWorkflowRenderHost, {
  getSelectedSpan: () => ({
    ...selectedSpan,
    status: "ready",
    translatedText: "маленькая красная",
    tokens: [{
      text: "kleine",
      lookupWord: "klein",
      tokenIndex: 2,
      charStart: 4,
      charEnd: 10,
      originalToken: "kleine",
    }],
  }),
  selectedSpans,
  selectedSpansDom,
  dictionaryPresentation,
  renderTranslationField: dictionaryDom.renderTranslationField,
  selectLookupWord: (word, phraseIndex, selection, options) => {
    workflowRenderLookup = { word, phraseIndex, selection, options };
  },
  saveSelectedSpanCard: () => {
    workflowRenderSaved = true;
  },
  clearSelectedSpan: () => {
    workflowRenderCleared = true;
  },
});
assert.equal(workflowRenderedSpanCard.className, "af-dictionary-card af-span-translation-card");
workflowRenderedSpanCard.children[0].children[0].listeners.click[0].listener();
assert.equal(workflowRenderLookup.word, "klein");
assert.equal(workflowRenderLookup.phraseIndex, selectedSpan.phraseIndex);
assert.equal(workflowRenderLookup.options.preserveSelectedSpan, true);
assert.equal(workflowRenderLookup.selection.originalToken, "kleine");
const workflowRenderedSpanActions = workflowRenderedSpanCard.children.at(-1);
workflowRenderedSpanActions.children[0].listeners.click[0].listener();
assert.equal(workflowRenderSaved, true);
workflowRenderedSpanActions.children[1].listeners.click[0].listener();
assert.equal(workflowRenderCleared, true);
const selectedSpanPromptHost = createTestElement("div");
const selectedSpanPrompt = selectedSpansDom.renderSelectedSpanLookupPrompt(selectedSpanPromptHost);
assert.equal(selectedSpanPrompt.children[0].textContent, "Dictionary result");
assert.equal(selectedSpanPrompt.children[1].textContent, "Click a word in the selected phrase.");
const generatedDraft = {
  draftSetId: "draft-set-1",
  candidateId: "candidate-1",
  revision: 2,
  item: { headword: "bouwen" },
  card: { id: "generated-card-1" },
};
assert.equal(generatedEntries.generatedDraftPayload(generatedDraft).candidateId, "candidate-1");
assert.equal(generatedEntries.generatedDraftCard(generatedDraft).id, "generated-card-1");
const generatedSourceContext = { contractVersion: "source-context-v2" };
const generatedPayload = generatedEntries.generatedEntryBasePayload({
  selectedWord: {
    word: "bouwen",
    generatedDraft,
    translationsByCardId: {
      "generated-card-1": {
        status: "ready",
        targetLanguageCode: "ru",
        overlay: { headword: "строить" },
        translationPolicyVersion: "v1",
      },
    },
  },
  phrase: { text: "Wij bouwen een huis." },
  sourceLanguageCode: "nl",
  sourceContext: generatedSourceContext,
  draft: generatedDraft,
});
assert.equal(generatedPayload.ok, true);
assert.equal(generatedPayload.value.clickedForm, "bouwen");
assert.equal(generatedPayload.value.sourceContext, generatedSourceContext);
assert.equal(generatedPayload.value.draftTranslation.targetLang, "ru");
const generatedSelectionPayload = generatedEntries.generatedEntryPayloadFromSelection({
  selectedWord: {
    word: "leren",
    phraseIndex: 1,
    generatedDraft,
  },
  phrases: [
    { text: "Wij bouwen." },
    { text: "Wij leren Nederlands." },
  ],
  currentIndex: 0,
  source: { languageCode: "nl" },
  sourceContext: generatedSourceContext,
  draft: generatedDraft,
});
assert.equal(generatedSelectionPayload.ok, true);
assert.equal(generatedSelectionPayload.value.clickedForm, "leren");
assert.equal(generatedSelectionPayload.value.contextText, "Wij leren Nederlands.");
assert.equal(generatedSelectionPayload.value.sourceLanguageCode, "nl");
assert.equal(generatedEntries.selectedWordSourceLanguage(
  { sourceBinding: { captionSource: { languageCode: "nl" } } },
  { languageCode: "en" },
), "nl");
assert.equal(
  generatedEntries.generatedEntryBasePayload({ selectedWord: { word: "" }, sourceLanguageCode: "nl" }).error,
  "Missing selected word.",
);
assert.equal(generatedEntries.generatedFallbackState({ generatedDraft }, "signed-in").state, "card");
assert.equal(generatedEntries.generatedFallbackState({ generatedDraftStatus: "loading" }, "signed-in").copy, "Generating a same-language explanation...");
assert.equal(generatedEntries.generatedFallbackState({}, "signed-out").state, "connect");
assert.equal(generatedEntries.generatedFallbackState({ generatedDraft: { item: { headword: "bouwen" } } }, "signed-in").state, "unrenderable");
assert.equal(generatedEntries.generatedFallbackState({}, "signed-in").state, "generate");
assert.equal(generatedEntries.generatedFallbackState({ generatedDraftError: "failed" }, "signed-in").error, "failed");
let generatedWorkflowSelectedWord = { word: "bouwen", lookupSeq: 1 };
let generatedWorkflowRenderCount = 0;
const generatedWorkflowCommands = [];
const generatedWorkflowOptions = {
  getSelectedWord: () => generatedWorkflowSelectedWord,
  setSelectedWord: (selectedWord) => {
    generatedWorkflowSelectedWord = selectedWord;
  },
  buildPayload: (_selectedWord, draft = null) => ({
    ok: true,
    value: {
      clickedForm: _selectedWord.word,
      ...(draft ? { candidateId: draft.candidateId } : {}),
    },
  }),
  postDictionaryCommand: async (operation, payload) => {
    generatedWorkflowCommands.push({ operation, payload });
    if (operation === "dict-generated-draft") return { draft: generatedDraft };
    if (operation === "dict-generated-save") return { entryId: "entry-1" };
    return { ok: true };
  },
  createMutationTurnId: () => "turn-1",
  sourceContext: (_selectedWord, entryId) => ({ entryId }),
  isCurrentLookup: (selectedWord) => selectedWord.lookupSeq === generatedWorkflowSelectedWord.lookupSeq,
  reloadLookup: async () => {
    generatedWorkflowSelectedWord.reloaded = true;
  },
  render: () => {
    generatedWorkflowRenderCount += 1;
  },
};
await generatedEntryWorkflow.generateDictionaryDraft(generatedWorkflowSelectedWord, generatedWorkflowOptions);
assert.equal(generatedWorkflowSelectedWord.generatedDraftStatus, "ready");
assert.equal(generatedWorkflowSelectedWord.generatedDraft.candidateId, "candidate-1");
assert.equal(generatedWorkflowCommands[0].operation, "dict-generated-draft");
generatedWorkflowSelectedWord = {
  ...generatedWorkflowSelectedWord,
  generatedDraft,
};
await generatedEntryWorkflow.saveGeneratedDictionaryDraft(generatedWorkflowSelectedWord, null, generatedWorkflowOptions);
assert.equal(generatedWorkflowSelectedWord.generatedDraftStatus, "saved");
assert.equal(generatedWorkflowSelectedWord.cardActionStatus, "Saved and started learning.");
assert.equal(generatedWorkflowSelectedWord.reloaded, true);
assert.equal(
  generatedWorkflowCommands.map((command) => command.operation).join("|"),
  "dict-generated-draft|dict-generated-save|dict-action",
);
assert.equal(generatedWorkflowRenderCount, 4);
let invalidGeneratedWorkflowWord = { word: "bouwen", lookupSeq: 2, generatedDraft: { item: { headword: "bouwen" } } };
await generatedEntryWorkflow.saveGeneratedDictionaryDraft(invalidGeneratedWorkflowWord, null, {
  ...generatedWorkflowOptions,
  getSelectedWord: () => invalidGeneratedWorkflowWord,
  setSelectedWord: (selectedWord) => {
    invalidGeneratedWorkflowWord = selectedWord;
  },
  isCurrentLookup: () => true,
});
assert.equal(invalidGeneratedWorkflowWord.generatedDraftError, "Generated draft is missing candidate identity.");
const generatedContext = generatedEntries.generatedEntrySourceContext({
  selectedWord: { word: "bouwen", sourceBinding: { videoId: "video-1" } },
  entryId: "entry-1",
  buildSourceContext: (_binding, card, action) => ({ cardId: card.id, action }),
});
assert.equal(generatedContext.cardId, "entry-1");
assert.equal(generatedContext.action, "start-learning");
const overlayDraftItem = generatedEntries.generatedDraftItemFromOverlayCard({
  id: "card-1",
  headword: "bouwen",
  language: "nl",
  sections: [
    { kind: "meaning", text: "maken" },
    { kind: "example", text: "" },
  ],
  summary: { definition: "maken" },
});
assert.equal(overlayDraftItem.entry.id, "draft:card-1");
assert.equal(overlayDraftItem.entry.content.sections.length, 1);

const timingPhrases = [
  { startMs: 1000, endMs: 1800, text: "eerste" },
  { startMs: 2050, endMs: 2600, text: "tweede" },
  { startMs: 3400, endMs: 4000, text: "derde" },
];
assert.equal(playbackTiming.findPhraseIndexForTime(timingPhrases, 1200), 0);
assert.equal(playbackTiming.findPhraseIndexForTime(timingPhrases, 3000), 1);
assert.equal(playbackTiming.findPlaybackPhraseIndex(timingPhrases, 900), 0);
assert.equal(playbackTiming.playbackEndMsForPhrase(timingPhrases, 0), 2100);
assert.equal(playbackTiming.playbackEndMsForPhrase(timingPhrases, 2), 4500);
assert.equal(playbackTiming.phrasePlaybackStartMs({ startMs: 1000, endMs: 2000, playbackStartMs: 1300 }), 1300);
assert.equal(playbackTiming.phrasePlaybackStartMs({ startMs: 1000, endMs: 2000, playbackStartMs: 2500 }), 1000);

const wordTimedPhrase = {
  startMs: 1000,
  endMs: 3000,
  text: "rode ster",
  wordTimings: [
    { tokenIndex: 0, startMs: 1200, endMs: 1500, source: "alignment" },
  ],
};
assert.deepEqual(
  Object.assign({}, playbackTiming.resolveWordTiming({
    phrase: wordTimedPhrase,
    phrases: [wordTimedPhrase],
    selection: { tokenIndex: 0 },
  })),
  { startMs: 1200, endMs: 1500, source: "alignment" },
);
assert.equal(
  playbackTiming.estimateWordStartMs({
    phrase: { startMs: 1000, endMs: 3000, text: "kleine rode ster" },
    selection: { charStart: 7 },
    displaySegmentRange: { start: 0, end: 16 },
  }),
  1875,
);
const estimatedReplayPhrase = { startMs: 1000, endMs: 3000, text: "kleine rode ster" };
const estimatedWordReplay = playbackTiming.wordReplayTiming({
  phrase: estimatedReplayPhrase,
  phrases: [estimatedReplayPhrase],
  selection: { charStart: 7 },
  displaySegmentRange: { start: 0, end: 16 },
  mode: "from-word",
  options: { preRollMs: 150, postRollMs: 500 },
});
assert.equal(estimatedWordReplay.ok, true);
assert.equal(estimatedWordReplay.seekToSec, 1.725);
assert.equal(estimatedWordReplay.expectedPauseAtSec, 3.5);
assert.equal(estimatedWordReplay.timingSource, "estimate-char-position");
const exactWordReplay = playbackTiming.wordReplayTiming({
  phrase: wordTimedPhrase,
  phrases: [wordTimedPhrase],
  selection: { tokenIndex: 0 },
  wordTiming: { startMs: 1200, endMs: 1500, source: "alignment" },
  mode: "word",
  options: { postRollMs: 500 },
});
assert.equal(exactWordReplay.seekToSec, 1.16);
assert.equal(exactWordReplay.expectedPauseAtSec, 1.5);
assert.equal(exactWordReplay.timingSource, "alignment");
assert.equal(
  playbackTiming.wordReplayTiming({
    phrase: wordTimedPhrase,
    phrases: [wordTimedPhrase],
    selection: { tokenIndex: 0 },
    mode: "word",
  }).reason,
  "word-timing-unavailable",
);

assert.equal(panelLayout.panelHasGeometry({ x: null, y: null, width: null, height: null }), false);
assert.equal(panelLayout.panelHasGeometry({ x: 10, y: null, width: null, height: null }), true);
assert.equal(panelLayout.hasCustomLayout({
  locked: true,
  phraseRibbon: { x: null, y: null, width: null, height: null },
  dictionaryPanel: { x: null, y: null, width: null, height: null },
  debugPanel: { x: null, y: null, width: null, height: null },
  zOrder: "phraseRibbon",
}), false);
assert.equal(panelLayout.hasCustomLayout({
  locked: true,
  phraseRibbon: { x: null, y: null, width: null, height: null },
  dictionaryPanel: { x: 40, y: null, width: null, height: null },
  debugPanel: { x: null, y: null, width: null, height: null },
  zOrder: "phraseRibbon",
}), true);
assert.equal(panelLayout.panelGestureOrder({ zOrder: "dictionaryPanel" }).join("|"), "dictionaryPanel|phraseRibbon");
assert.equal(panelLayout.panelGestureOrder({ zOrder: "phraseRibbon" }).join("|"), "phraseRibbon|dictionaryPanel");
assert.equal(JSON.stringify(panelLayout.pointerEventNames("mousedown")), JSON.stringify({ move: "mousemove", up: "mouseup", cancel: "mouseup" }));
assert.equal(JSON.stringify(panelLayout.pointerEventNames("pointerdown")), JSON.stringify({ move: "pointermove", up: "pointerup", cancel: "pointercancel" }));
assert.equal(panelLayout.isPrimaryPointerEvent({ type: "mousedown", button: 2 }), false);
assert.equal(panelLayout.isPrimaryPointerEvent({ type: "pointerdown", button: 2 }), true);
assert.equal(JSON.stringify(panelLayout.panelDragStartGeometry({
  panelKey: "dictionaryPanel",
  rect: { left: 10, top: 20, width: 700, height: 500 },
  layout: { dictionaryPanel: { x: null, y: null, width: null, height: null } },
})), JSON.stringify({ x: 10, y: 20, width: 520, height: 500 }));
assert.equal(JSON.stringify(panelLayout.panelResizeStartGeometry({
  panelKey: "phraseRibbon",
  rect: { left: 10, top: 20, width: 700, height: 500 },
})), JSON.stringify({ x: 10, y: 20, width: 700, height: null }));
assert.equal(
  JSON.stringify(panelLayout.nextDragGeometry({ x: 10, y: 20, width: 300, height: 200 }, { x: 100, y: 50 }, { x: 120, y: 40 })),
  JSON.stringify({ x: 30, y: 10, width: 300, height: 200 }),
);
assert.equal(
  JSON.stringify(panelLayout.nextResizeGeometry("dictionaryPanel", { x: 10, y: 20, width: 300, height: 200 }, { x: 100, y: 50 }, { x: 120, y: 90 })),
  JSON.stringify({ x: 10, y: 20, width: 320, height: 240 }),
);
const clampedRibbon = panelLayout.clampPanelGeometry(
  "phraseRibbon",
  { x: -100, y: 900, width: 100, height: 500 },
  { width: 800, height: 600 },
);
assert.equal(clampedRibbon.x, 8);
assert.equal(clampedRibbon.y, 512);
assert.equal(clampedRibbon.width, 360);
assert.equal(clampedRibbon.height, null);
const clampedDebug = panelLayout.clampDebugPanelGeometry(
  { x: 900, y: -10, width: 1000, height: 100 },
  { width: 800, height: 600 },
);
assert.equal(clampedDebug.x, 8);
assert.equal(clampedDebug.y, 8);
assert.equal(clampedDebug.width, 784);
assert.equal(clampedDebug.height, 220);
const panelGeometryState = panelLayout.panelGeometryState({
  panelKey: "dictionaryPanel",
  layout: {
    locked: false,
    zOrder: "dictionaryPanel",
    dictionaryPanel: { x: 20, y: 30, width: 400, height: 300 },
  },
  viewport: { width: 800, height: 600 },
});
assert.equal(panelGeometryState.hasGeometry, true);
assert.equal(panelGeometryState.classes.layoutUnlocked, true);
assert.equal(panelGeometryState.style.left, "20px");
assert.equal(panelGeometryState.style.height, "300px");
assert.equal(panelGeometryState.style.zIndex, "1002");
const emptyDebugGeometryState = panelLayout.debugPanelGeometryState({
  layout: { debugPanel: { x: null, y: null, width: null, height: null } },
  viewport: { width: 800, height: 600 },
});
assert.equal(emptyDebugGeometryState.hasGeometry, false);
assert.equal(emptyDebugGeometryState.style.right, "");
assert.equal(panelLayout.rectContainsPoint({ left: 10, right: 20, top: 30, bottom: 40 }, 15, 35), true);
assert.equal(panelLayout.rectContainsPoint({ left: 10, right: 20, top: 30, bottom: 40 }, 25, 35), false);
function createRectElement(tagName, rect) {
  const element = createTestElement(tagName);
  element.getBoundingClientRect = () => rect;
  return element;
}
const gesturePanel = createRectElement("section", { left: 10, right: 310, top: 20, bottom: 160 });
const gestureResizeHandle = createRectElement("button", { left: 290, right: 310, top: 140, bottom: 160 });
const gestureDragHandle = createRectElement("button", { left: 10, right: 310, top: 20, bottom: 44 });
const gestureDragSurface = createRectElement("div", { left: 10, right: 310, top: 20, bottom: 160 });
const gestureInteractive = createRectElement("button", { left: 60, right: 100, top: 60, bottom: 90 });
gestureDragSurface.querySelectorAll = () => [gestureInteractive];
gesturePanel.querySelector = (selector) => ({
  "[data-af-resize-handle]": gestureResizeHandle,
  "[data-af-drag-handle]": gestureDragHandle,
  "[data-af-drag-surface]": gestureDragSurface,
}[selector] || null);
assert.equal(JSON.stringify(panelLayout.resolvePanelGestureAt({
  x: 300,
  y: 150,
  layout: { zOrder: "phraseRibbon" },
  panelElement: (panelKey) => (panelKey === "phraseRibbon" ? gesturePanel : null),
  HTMLElement: TestHTMLElement,
})), JSON.stringify({ kind: "resize", panelKey: "phraseRibbon" }));
assert.equal(JSON.stringify(panelLayout.resolvePanelGestureAt({
  x: 30,
  y: 30,
  layout: { zOrder: "phraseRibbon" },
  panelElement: (panelKey) => (panelKey === "phraseRibbon" ? gesturePanel : null),
  HTMLElement: TestHTMLElement,
})), JSON.stringify({ kind: "drag", panelKey: "phraseRibbon", fromSurface: false }));
assert.equal(panelLayout.resolvePanelGestureAt({
  x: 70,
  y: 70,
  layout: { zOrder: "phraseRibbon" },
  panelElement: (panelKey) => (panelKey === "phraseRibbon" ? gesturePanel : null),
  HTMLElement: TestHTMLElement,
}), null);
assert.equal(JSON.stringify(panelLayout.resolvePanelGestureAt({
  x: 130,
  y: 90,
  layout: { zOrder: "phraseRibbon" },
  panelElement: (panelKey) => (panelKey === "phraseRibbon" ? gesturePanel : null),
  HTMLElement: TestHTMLElement,
})), JSON.stringify({ kind: "drag", panelKey: "phraseRibbon", fromSurface: true }));
const focusDebugPanel = createRectElement("section", { left: 400, right: 520, top: 30, bottom: 180 });
const focusRibbonPanel = createRectElement("section", { left: 10, right: 310, top: 20, bottom: 160 });
assert.equal(panelLayout.shadowLayerFocusAction({
  event: { type: "pointerdown", clientX: 410, clientY: 40 },
  debugVisible: true,
  debugPanel: focusDebugPanel,
  mainPanels: [focusRibbonPanel],
  HTMLElement: TestHTMLElement,
}), "debug-front");
assert.equal(panelLayout.shadowLayerFocusAction({
  event: { type: "pointerdown", clientX: 40, clientY: 40 },
  debugVisible: true,
  debugPanel: focusDebugPanel,
  mainPanels: [focusRibbonPanel],
  HTMLElement: TestHTMLElement,
}), "debug-behind");
const panelLayoutDomElement = createTestElement("section");
panelLayoutDomElement.rectLeft = 790;
panelLayoutDomElement.rectTop = 590;
panelLayoutDomElement.rectWidth = 200;
panelLayoutDomElement.rectHeight = 120;
panelLayoutDomElement.getBoundingClientRect = () => ({
  left: panelLayoutDomElement.rectLeft,
  top: panelLayoutDomElement.rectTop,
  width: panelLayoutDomElement.rectWidth,
  height: panelLayoutDomElement.rectHeight,
});
panelLayoutDom.applyPanelGeometry(panelLayoutDomElement, "dictionaryPanel", {
  layout: {
    locked: false,
    zOrder: "dictionaryPanel",
    dictionaryPanel: { x: 790, y: 590, width: 400, height: 240 },
  },
  viewport: { width: 800, height: 600 },
});
assert.equal(panelLayoutDomElement.classList.contains("is-layout-unlocked"), true);
assert.equal(panelLayoutDomElement.classList.contains("is-floating"), true);
assert.equal(panelLayoutDomElement.style.zIndex, "1002");
assert.equal(panelLayoutDomElement.style.left, "592px");
assert.equal(panelLayoutDomElement.style.top, "472px");
const panelLayoutDebugElement = createTestElement("section");
panelLayoutDom.applyDebugPanelGeometry(panelLayoutDebugElement, {
  layout: { debugPanel: { x: 20, y: 30, width: 400, height: 260 } },
  viewport: { width: 800, height: 600 },
});
assert.equal(panelLayoutDebugElement.style.left, "20px");
assert.equal(panelLayoutDebugElement.style.right, "auto");
panelLayoutDom.applyDebugPanelLayer(panelLayoutDebugElement, true);
assert.equal(panelLayoutDebugElement.style.zIndex, "1003");
const pointerGestureListeners = new Map();
const pointerGestureDocument = {
  addEventListener(name, listener) {
    pointerGestureListeners.set(name, listener);
  },
  removeEventListener(name, listener) {
    if (pointerGestureListeners.get(name) === listener) {
      pointerGestureListeners.delete(name);
    }
  },
};
const pointerGesturePanel = createTestElement("section");
pointerGesturePanel.ownerDocument = pointerGestureDocument;
let pointerGestureMove = null;
let pointerGestureEnded = false;
const pointerGestureStarted = panelLayoutDom.beginPointerGesture({
  type: "pointerdown",
  preventDefault() {
    this.prevented = true;
  },
  stopPropagation() {
    this.stopped = true;
  },
}, pointerGesturePanel, {
  onMove: (event) => {
    pointerGestureMove = event.clientX;
  },
  onEnd: () => {
    pointerGestureEnded = true;
  },
});
assert.equal(pointerGestureStarted, true);
assert.equal(pointerGestureListeners.has("pointermove"), true);
pointerGestureListeners.get("pointermove")({ clientX: 42 });
assert.equal(pointerGestureMove, 42);
pointerGestureListeners.get("pointerup")();
assert.equal(pointerGestureEnded, true);
assert.equal(pointerGestureListeners.size, 0);
const panelDragGestureListeners = new Map();
const panelDragGestureDocument = {
  addEventListener(name, listener) {
    panelDragGestureListeners.set(name, listener);
  },
  removeEventListener(name, listener) {
    if (panelDragGestureListeners.get(name) === listener) {
      panelDragGestureListeners.delete(name);
    }
  },
};
const panelDragGesturePanel = createTestElement("section");
panelDragGesturePanel.ownerDocument = panelDragGestureDocument;
panelDragGesturePanel.getBoundingClientRect = () => ({
  left: 20,
  top: 30,
  width: 300,
  height: 160,
});
let appliedPanelDragGeometry = null;
let savedPanelDragGeometry = null;
const panelDragStarted = panelLayoutDom.beginPanelDragGesture({
  type: "pointerdown",
  clientX: 25,
  clientY: 35,
  preventDefault() {},
  stopPropagation() {},
}, panelDragGesturePanel, {
  panelKey: "dictionaryPanel",
  layout: {},
  clampGeometry: (geometry) => ({ ...geometry, x: geometry.x + 1 }),
  applyGeometry: (_panel, geometry) => {
    appliedPanelDragGeometry = geometry;
  },
  saveGeometry: (geometry) => {
    savedPanelDragGeometry = geometry;
  },
});
assert.equal(panelDragStarted, true);
panelDragGestureListeners.get("pointermove")({ clientX: 45, clientY: 55 });
assert.equal(appliedPanelDragGeometry.x, 41);
assert.equal(appliedPanelDragGeometry.y, 50);
panelDragGestureListeners.get("pointerup")();
assert.equal(savedPanelDragGeometry.x, 41);
assert.equal(panelDragGestureListeners.size, 0);
const layoutWorkflowRibbon = createRectElement("section", { left: 10, top: 20, right: 310, bottom: 160, width: 300, height: 140 });
layoutWorkflowRibbon.dataset.afPanelKey = "phraseRibbon";
const layoutWorkflowDragHandle = createRectElement("button", { left: 10, top: 20, right: 310, bottom: 44, width: 300, height: 24 });
layoutWorkflowRibbon.querySelector = (selector) => ({
  "[data-af-drag-handle]": layoutWorkflowDragHandle,
}[selector] || null);
const layoutWorkflowDictionary = createRectElement("section", { left: 360, top: 20, right: 660, bottom: 260, width: 300, height: 240 });
layoutWorkflowDictionary.dataset.afPanelKey = "dictionaryPanel";
const layoutWorkflowDebug = createRectElement("section", { left: 20, top: 30, right: 420, bottom: 290, width: 400, height: 260 });
const layoutWorkflowState = {
  debugVisible: true,
  debugPanelInFront: false,
  displayPreferences: {
    layout: {
      locked: false,
      zOrder: "phraseRibbon",
      phraseRibbon: { x: null, y: null, width: null, height: null },
      dictionaryPanel: { x: null, y: null, width: null, height: null },
      debugPanel: { x: null, y: null, width: null, height: null },
    },
  },
};
let layoutWorkflowRenderCount = 0;
let layoutWorkflowUpdatedPreferences = null;
let layoutWorkflowFrame = 0;
let layoutWorkflowFallbackInstalled = false;
const layoutWorkflowDocumentListeners = [];
const layoutWorkflowWindowListeners = [];
const layoutWorkflowOptions = {
  panelLayout,
  panelLayoutDom,
  displayPreferences,
  HTMLElement: TestHTMLElement,
  Element: TestHTMLElement,
  document: {
    addEventListener: (...args) => layoutWorkflowDocumentListeners.push(args),
    getElementById: (id) => (id === "af-root" ? layoutWorkflowRoot : null),
  },
  window: {
    addEventListener: (...args) => layoutWorkflowWindowListeners.push(args),
  },
  rootId: "af-root",
  getPanelGestureFallbackInstalled: () => layoutWorkflowFallbackInstalled,
  setPanelGestureFallbackInstalled: (value) => {
    layoutWorkflowFallbackInstalled = value;
  },
  getViewportLayoutFrame: () => layoutWorkflowFrame,
  setViewportLayoutFrame: (value) => {
    layoutWorkflowFrame = value;
  },
  requestAnimationFrame: (callback) => {
    callback();
    return 99;
  },
  beginPanelGestureFromHost: () => {},
  scheduleViewportLayoutClamp: () => {},
  viewportBounds: () => ({ width: 800, height: 600 }),
  panelElement: (panelKey) => (panelKey === "dictionaryPanel" ? layoutWorkflowDictionary : layoutWorkflowRibbon),
  debugPanelElement: () => layoutWorkflowDebug,
  updateDisplayPreferences: (updater) => {
    layoutWorkflowUpdatedPreferences = updater(layoutWorkflowState.displayPreferences);
    layoutWorkflowState.displayPreferences = layoutWorkflowUpdatedPreferences;
  },
  render: () => {
    layoutWorkflowRenderCount += 1;
  },
};
const layoutWorkflowRoot = createTestElement("div");
const layoutWorkflowEvent = {
  type: "pointerdown",
  button: 0,
  clientX: 30,
  clientY: 30,
  target: layoutWorkflowRoot,
  currentTarget: { dataset: { afDragHandle: "phraseRibbon" } },
  preventDefault() {
    this.prevented = true;
  },
  stopPropagation() {
    this.stopped = true;
  },
};
assert.equal(panelLayoutWorkflow.hasCustomPanelLayout(layoutWorkflowState, layoutWorkflowOptions), true);
panelLayoutWorkflow.toggleLayoutLock(layoutWorkflowState, layoutWorkflowEvent, layoutWorkflowOptions);
assert.equal(layoutWorkflowState.displayPreferences.layout.locked, true);
assert.equal(layoutWorkflowEvent.prevented, true);
assert.equal(layoutWorkflowRenderCount, 1);
panelLayoutWorkflow.resetPanelLayout(layoutWorkflowEvent, layoutWorkflowOptions);
assert.equal(layoutWorkflowState.displayPreferences.layout.zOrder, "phraseRibbon");
assert.equal(layoutWorkflowRenderCount, 2);
layoutWorkflowState.displayPreferences.layout.locked = false;
panelLayoutWorkflow.bringPanelToFront(layoutWorkflowState, "dictionaryPanel", true, layoutWorkflowOptions);
assert.equal(layoutWorkflowState.displayPreferences.layout.zOrder, "dictionaryPanel");
assert.equal(layoutWorkflowUpdatedPreferences.layout.zOrder, "dictionaryPanel");
panelLayoutWorkflow.savePanelGeometry("dictionaryPanel", { x: 20, y: 30, width: 400, height: 300 }, layoutWorkflowOptions);
assert.equal(layoutWorkflowState.displayPreferences.layout.dictionaryPanel.width, 400);
assert.equal(layoutWorkflowState.displayPreferences.layout.zOrder, "dictionaryPanel");
assert.equal(panelLayoutWorkflow.bringDebugPanelToFront(layoutWorkflowState, layoutWorkflowOptions), true);
assert.equal(layoutWorkflowState.debugPanelInFront, true);
assert.equal(layoutWorkflowDebug.classList.contains("is-front"), true);
assert.equal(layoutWorkflowDebug.style.zIndex, "1003");
assert.equal(panelLayoutWorkflow.handleShadowLayerFocus(layoutWorkflowState, {
  type: "pointerdown",
  clientX: 500,
  clientY: 40,
}, layoutWorkflowOptions), "debug-behind");
assert.equal(layoutWorkflowState.debugPanelInFront, false);
assert.equal(panelLayoutWorkflow.installPanelGestureFallback(layoutWorkflowState, layoutWorkflowOptions), true);
assert.equal(layoutWorkflowDocumentListeners.length, 2);
assert.equal(layoutWorkflowWindowListeners.length, 1);
let layoutWorkflowDragStarted = false;
const layoutWorkflowDragOptions = {
  ...layoutWorkflowOptions,
  panelLayoutDom: {
    ...panelLayoutDom,
    beginPanelDragGesture: () => {
      layoutWorkflowDragStarted = true;
      return true;
    },
  },
};
layoutWorkflowState.displayPreferences.layout.locked = false;
assert.equal(panelLayoutWorkflow.beginPanelGestureFromHost(layoutWorkflowState, layoutWorkflowEvent, layoutWorkflowDragOptions), true);
assert.equal(layoutWorkflowDragStarted, true);
assert.equal(layoutWorkflowState.displayPreferences.layout.zOrder, "phraseRibbon");

const issuePayload = issueReports.issueReportPayload({
  report: JSON.stringify({ kind: "test-report", value: 1 }),
  category: "timing",
  description: "Replay stopped late.",
  expectedBehavior: "Stop on phrase.",
  includeDiagnostics: true,
  extensionVersion: "0.1.0",
  extensionBuildInfo: { buildId: "build-1" },
  backendBuildInfo: { version: "api-1" },
  browserUserAgent: "UnitTest",
});
assert.equal(issuePayload.payload.reportVersion, 1);
assert.equal(issuePayload.payload.diagnostics.kind, "test-report");
assert.equal(issuePayload.payload.extensionBuildInfo.buildId, "build-1");
assert.equal(issueReports.readableIssueSubmitError(new Error("rate limit")), "Too many reports. Copy report and share it manually.");
assert.equal(issueReports.readableIssueSubmitError("missing_description"), "Describe what went wrong before submitting.");
let submittedIssuePayload = null;
const submittedIssueResult = await issueReportWorkflow.sendIssueReportPayload({
  report: JSON.stringify({ kind: "test-report", value: 2 }),
  category: "navigation",
  description: "Moved wrong.",
  expectedBehavior: "Stay here.",
  includeDiagnostics: false,
}, {
  issueReports,
  postBackendJson: async (eventName, payload) => {
    submittedIssuePayload = { eventName, payload };
    return { id: "issue-1" };
  },
  extensionVersion: () => "0.2.0",
  extensionBuildInfo: () => ({ buildId: "build-2" }),
  backendBuildInfo: { version: "api-2" },
  browserUserAgent: "UnitBrowser",
});
assert.equal(submittedIssueResult.id, "issue-1");
assert.equal(submittedIssuePayload.eventName, "issue-report-submit");
assert.equal(submittedIssuePayload.payload.payload.extensionVersion, "0.2.0");
assert.equal(submittedIssuePayload.payload.payload.extensionBuildInfo.buildId, "build-2");
assert.equal(submittedIssuePayload.payload.payload.browserUserAgent, "UnitBrowser");
const issueDialogState = issueReports.issueReportDialogState({
  issueDialogOpen: true,
  issueSubmitting: false,
  issueCategory: "timing",
  issueDescription: "",
  issueExpectedBehavior: "Stay near phrase.",
  issueIncludeDiagnostics: true,
  issueSubmitError: "Describe what went wrong before submitting.",
  issueCopied: true,
});
assert.equal(issueDialogState.hidden, false);
assert.equal(issueDialogState.category, "timing");
assert.equal(issueDialogState.status.error, true);
assert.equal(issueDialogState.submit.disabled, true);
assert.equal(issueDialogState.copy.text, "Copied");
const issueWorkflowState = {
  navigationEvents: [{ id: "nav-1" }],
  currentIndex: 2,
  issueCategory: "navigation",
  issueDescription: "",
  issueExpectedBehavior: "",
  issueIncludeDiagnostics: true,
  issueDialogOpen: false,
  issueSubmitStatus: "",
  issueSubmitError: "",
  issueSubmittedId: "",
  issueCopied: false,
  issueSubmitting: false,
  lastIssueReport: "",
  phrases: [{ text: "one" }, { text: "two" }, { text: "three" }],
  loading: false,
};
const issueWorkflowEvents = [];
const issueWorkflowRenders = [];
const issueWorkflowCopies = [];
const issueWorkflowSubmissions = [];
const issueWorkflowTimers = [];
const issueWorkflow = issueReportWorkflow.createIssueReportWorkflow({
  state: issueWorkflowState,
  issueReports,
  formatIssueReport: (options = {}) => JSON.stringify({ report: "unit", ...options }),
  sendIssueReportPayload: async (payload) => {
    issueWorkflowSubmissions.push(payload);
    return { id: "report-1" };
  },
  recordDebugEvent: (type, detail) => issueWorkflowEvents.push({ type, detail }),
  render: () => issueWorkflowRenders.push("render"),
  copyIssueReport: (report) => issueWorkflowCopies.push(report),
  setTimeout: (callback, delay) => {
    issueWorkflowTimers.push({ callback, delay });
  },
});
issueWorkflow.open({ category: "timing", description: "Wrong pause.", expectedBehavior: "Stop earlier.", source: "unit" });
assert.equal(issueWorkflowState.issueDialogOpen, true);
assert.equal(issueWorkflowState.issueCategory, "timing");
assert.equal(issueWorkflowEvents.at(-1).type, "issue-marked");
issueWorkflow.copyCurrent();
assert.equal(issueWorkflowState.issueCopied, true);
assert.equal(issueWorkflowCopies.length, 1);
assert.equal(issueWorkflowTimers[0].delay, 1500);
issueWorkflowTimers[0].callback();
assert.equal(issueWorkflowState.issueCopied, false);
assert.equal(issueWorkflowState.issueSubmitStatus, "");
await issueWorkflow.submit();
assert.equal(issueWorkflowState.issueSubmitStatus, "Submitted: report-1");
assert.equal(issueWorkflowState.issueDescription, "");
assert.equal(issueWorkflowSubmissions[0].category, "timing");
assert.equal(issueWorkflowEvents.at(-1).type, "issue-report-submitted");
await issueWorkflow.submitPhraseBoundary();
assert.equal(issueWorkflowState.issueCategory, "phrase-boundary");
assert.equal(issueWorkflowState.issueSubmitStatus, "Boundary case saved: report-1");
assert.equal(issueWorkflowSubmissions.at(-1).category, "phrase-boundary");
const issueDialogWorkflowState = {
  issueCategory: "timing",
  issueDescription: "Late subtitle.",
  issueExpectedBehavior: "",
  issueIncludeDiagnostics: true,
  issueSubmitStatus: "Report copied.",
  issueSubmitError: "Previous error.",
};
const issueDialogWorkflowCalls = [];
let issueDialogWorkflowOptions = null;
const issueDialogWorkflowDialog = createTestElement("section");
const issueDialogWorkflowResult = issueReportWorkflow.createIssueReportDialog(createTestElement("section"), {
  getState: () => issueDialogWorkflowState,
  workspaceDom: {
    createIssueReportDialog(panel, options) {
      issueDialogWorkflowCalls.push(panel.tagName);
      issueDialogWorkflowOptions = options;
      return issueDialogWorkflowDialog;
    },
  },
  iconSvg: () => "<svg></svg>",
  categories: [{ value: "timing", label: "Timing" }],
  closeIssueReportDialog: () => issueDialogWorkflowCalls.push("close"),
  submitIssueReport: () => issueDialogWorkflowCalls.push("submit"),
  copyCurrentIssueReport: () => issueDialogWorkflowCalls.push("copy"),
  render: () => issueDialogWorkflowCalls.push("render"),
});
assert.equal(issueDialogWorkflowResult, issueDialogWorkflowDialog);
assert.equal(issueDialogWorkflowOptions.categories[0].value, "timing");
issueDialogWorkflowOptions.onCategoryChange({ currentTarget: { value: "navigation" } });
assert.equal(issueDialogWorkflowState.issueCategory, "navigation");
issueDialogWorkflowOptions.onDescriptionInput({ currentTarget: { value: "Wrong phrase." } });
assert.equal(issueDialogWorkflowState.issueDescription, "Wrong phrase.");
assert.equal(issueDialogWorkflowState.issueSubmitError, "");
assert.equal(issueDialogWorkflowState.issueSubmitStatus, "");
issueDialogWorkflowOptions.onExpectedInput({ currentTarget: { value: "Stay in sync." } });
assert.equal(issueDialogWorkflowState.issueExpectedBehavior, "Stay in sync.");
issueDialogWorkflowOptions.onDiagnosticsChange({ currentTarget: { checked: false } });
assert.equal(issueDialogWorkflowState.issueIncludeDiagnostics, false);
issueDialogWorkflowOptions.onClose();
issueDialogWorkflowOptions.onSubmit();
issueDialogWorkflowOptions.onCopy();
assert.equal(issueDialogWorkflowCalls.join("|"), "section|render|render|render|render|close|submit|copy");
const issueDialogElements = {
  "[data-af-issue-category]": createTestElement("select"),
  "[data-af-issue-description]": createTestElement("textarea"),
  "[data-af-issue-expected]": createTestElement("textarea"),
  "[data-af-issue-diagnostics]": createTestElement("input"),
  "[data-af-issue-status]": createTestElement("div"),
  "[data-af-issue-submit]": createTestElement("button"),
  "[data-af-issue-copy]": createTestElement("button"),
};
const issueDialogElement = createTestElement("section");
issueDialogElement.querySelector = (selector) => issueDialogElements[selector] || null;
issueReportsDom.renderIssueReportDialog(issueDialogElement, issueDialogState);
assert.equal(issueDialogElement.hidden, false);
assert.equal(issueDialogElement.classList.contains("is-submitting"), false);
assert.equal(issueDialogElements["[data-af-issue-category]"].value, "timing");
assert.equal(issueDialogElements["[data-af-issue-expected]"].value, "Stay near phrase.");
assert.equal(issueDialogElements["[data-af-issue-diagnostics]"].checked, true);
assert.equal(issueDialogElements["[data-af-issue-status]"].classList.contains("is-error"), true);
assert.equal(issueDialogElements["[data-af-issue-submit]"].disabled, true);
assert.equal(issueDialogElements["[data-af-issue-copy]"].textContent, "Copied");
const submittingIssueDialogState = issueReports.issueReportDialogState({
  issueDialogOpen: true,
  issueSubmitting: true,
  issueDescription: "Replay stopped late.",
});
assert.equal(submittingIssueDialogState.submit.text, "Submitting...");
assert.equal(submittingIssueDialogState.copy.disabled, true);
const issueCategories = issueReports.issueReportCategories();
assert.equal(issueCategories.some((category) => category.value === "phrase-boundary"), true);
issueCategories[0].label = "Changed";
assert.notEqual(issueReports.issueReportCategories()[0].label, "Changed");
assert.equal(issueReports.extensionVersion({ getManifest: () => ({ version: "1.2.3" }) }), "1.2.3");
assert.equal(issueReports.extensionVersion({ getManifest: () => { throw new Error("manifest"); } }), "");
const extensionBuild = issueReports.extensionBuildInfo({
  manifestVersion: "1.2.3",
  contentScriptRevision: "rev-1",
  buildInfo: {
    manifestName: "AudioFilms",
    extensionId: "ext-1",
    channel: "local",
    buildId: "build-1",
    sourceCommit: "abc123",
    builtAt: "2026-06-29T11:00:00.000Z",
    loadedAt: "2026-06-29T12:00:00.000Z",
  },
  apiBase: "https://api.test",
});
assert.equal(extensionBuild.contentScriptRevision, "rev-1");
assert.equal(extensionBuild.sourceCommit, "abc123");
const formattedIssueReport = JSON.parse(issueReports.formatNavigationIssueReport({
  diagnosticsReportApi: diagnosticsReport,
  url: "https://youtube.test/watch?v=video-1",
  videoId: "video-1",
  phrases: [{ startMs: 0, endMs: 1200, text: "Hallo" }],
  currentIndex: 0,
  guidedMode: true,
  autoPause: true,
  textVisible: false,
  playback: { videoPresent: true },
  capturedAt: "2026-06-29T12:00:00.000Z",
  extraDiagnostics: { ignoredByDiagnosticsReport: true },
}));
assert.equal(formattedIssueReport.kind, "audiofilms-youtube-navigation-issue");
assert.equal(formattedIssueReport.page.videoId, "video-1");
assert.equal(formattedIssueReport.currentPhrase.text, "Hallo");
assert.equal(Object.hasOwn(formattedIssueReport, "ignoredByDiagnosticsReport"), false);
const diagnosticsWorkflowState = {
  backendBuildInfo: { version: "api-1" },
  backendBuildError: "",
  bootDiagnostics: { lastError: "" },
  videoId: "video-1",
  cueSource: "backend-provider",
  transcriptResult: { retrievalPath: "backend-provider", cues: [] },
  phrases: [{ startMs: 0, endMs: 1200, text: "Hallo" }],
  currentIndex: 0,
  lastPhraseProgressRestore: { reason: "phrase-id" },
  diagnosticsClearedAt: "2026-06-29T12:00:00.000Z",
  error: "",
  practiceSources: [{ id: "source-1", track: { kind: "manual" } }],
  navigationEvents: [{ id: "nav-1" }],
  lastWordReplay: { word: "Hallo" },
  lastIssueReport: "",
  debugEvents: [{ type: "unit" }],
  guidedMode: true,
  autoPause: true,
  textVisible: false,
};
const diagnosticsWorkflowDebug = JSON.parse(diagnosticsFormatWorkflow.formatDebugState({
  state: diagnosticsWorkflowState,
  selectedSource: diagnosticsWorkflowState.practiceSources[0],
  extensionBuildInfo: () => ({ contentScriptRevision: "rev-1" }),
  diagnosticsReport,
  captionTracks: {
    formatSourceDebug: (source) => ({ id: source.id, kind: source.track?.kind || "" }),
  },
  transcriptMetadata: {
    summarizeTranscriptResult: (result) => ({ retrievalPath: result.retrievalPath }),
  },
  describePhraseAtIndex: (index) => ({ index, text: diagnosticsWorkflowState.phrases[index]?.text || "" }),
}));
assert.equal(diagnosticsWorkflowDebug.videoId, "video-1");
assert.equal(diagnosticsWorkflowDebug.selectedSource.id, "source-1");
assert.equal(diagnosticsWorkflowDebug.transcriptResult.retrievalPath, "backend-provider");
const diagnosticsWorkflowIssue = JSON.parse(diagnosticsFormatWorkflow.formatIssueReport({
  state: diagnosticsWorkflowState,
  options: {
    boundaryCaseReason: "unit-workflow",
    extraDiagnostics: { workflowExtra: { ok: true } },
  },
  selectedSource: diagnosticsWorkflowState.practiceSources[0],
  pageUrl: "https://youtube.test/watch?v=video-1",
  issueReports,
  diagnosticsReport,
  captionTracks: {
    formatSourceDebug: (source) => ({ id: source.id, kind: source.track?.kind || "" }),
  },
  transcriptMetadata: {
    summarizeTranscriptResult: (result) => ({ retrievalPath: result.retrievalPath }),
  },
  describePhraseAtIndex: (index) => ({ index, text: diagnosticsWorkflowState.phrases[index]?.text || "" }),
  getPlaybackSnapshot: () => ({ videoPresent: true }),
  extensionBuildInfo: () => ({ contentScriptRevision: "rev-1" }),
}));
assert.equal(diagnosticsWorkflowIssue.phraseBoundaryCase.reason, "unit-workflow");
assert.equal(diagnosticsWorkflowIssue.selectedSource.id, "source-1");
let diagnosticsWorkflowRenderCount = 0;
let diagnosticsWorkflowFallbackCopy = "";
let diagnosticsWorkflowSnapshotPublished = false;
const diagnosticsWorkflowDocument = {
  documentElement: {
    dataset: {
      afShadowingLastError: "last",
      afShadowingBootError: "boot",
    },
  },
};
const diagnosticsWorkflowRuntimeState = {
  ...diagnosticsWorkflowState,
  debugVisible: false,
  debugPanelInFront: false,
  debugCopied: false,
  issueCopied: true,
  bootDiagnostics: { lastError: "boom", updatedAt: "" },
  navigationEventSeq: 3,
};
const diagnosticsWorkflowOptions = {
  state: diagnosticsWorkflowRuntimeState,
  document: diagnosticsWorkflowDocument,
  window: {
    location: { href: "https://youtube.test/watch?v=video-1" },
    setTimeout: (callback) => {
      callback();
    },
  },
  navigator: {
    clipboard: {
      writeText: async () => {
        throw new Error("clipboard blocked");
      },
    },
  },
  diagnosticsFormatWorkflow,
  diagnosticsReport,
  issueReports,
  captionTracks: {
    formatSourceDebug: (source) => ({ id: source.id, kind: source.track?.kind || "" }),
  },
  transcriptMetadata: {
    summarizeTranscriptResult: (result) => ({ retrievalPath: result.retrievalPath }),
  },
  getSelectedPracticeSource: () => diagnosticsWorkflowRuntimeState.practiceSources[0],
  getVideoElement: () => ({
    currentTime: 1.2345,
    duration: 10.987,
    paused: false,
    ended: false,
    readyState: 4,
    playbackRate: 1.25,
  }),
  describePhraseAtIndex: (index) => ({ index, text: diagnosticsWorkflowRuntimeState.phrases[index]?.text || "" }),
  getPlaybackSnapshot: () => diagnosticsWorkflow.getPlaybackSnapshot(diagnosticsWorkflowOptions),
  extensionBuildInfo: () => ({ contentScriptRevision: "rev-1" }),
  publishDiagnosticsSnapshot: () => {
    diagnosticsWorkflowSnapshotPublished = true;
  },
  copyTextWithFallback: (text) => {
    diagnosticsWorkflowFallbackCopy = text;
  },
  roundTime: (value) => Math.round(value * 100) / 100,
  now: () => "2026-06-30T10:15:00.000Z",
  render: () => {
    diagnosticsWorkflowRenderCount += 1;
  },
};
assert.equal(diagnosticsWorkflow.toggleDebug(diagnosticsWorkflowRuntimeState, diagnosticsWorkflowOptions), true);
assert.equal(diagnosticsWorkflowRuntimeState.debugPanelInFront, true);
diagnosticsWorkflow.closeDebug(diagnosticsWorkflowRuntimeState, diagnosticsWorkflowOptions);
assert.equal(diagnosticsWorkflowRuntimeState.debugVisible, false);
const diagnosticsWorkflowPlayback = diagnosticsWorkflow.getPlaybackSnapshot(diagnosticsWorkflowOptions);
assert.equal(diagnosticsWorkflowPlayback.currentTime, 1.23);
assert.equal(JSON.parse(diagnosticsWorkflow.formatDebugState(diagnosticsWorkflowOptions)).selectedSource.id, "source-1");
assert.equal(JSON.parse(diagnosticsWorkflow.formatIssueReport({ boundaryCaseReason: "workflow-wrapper" }, diagnosticsWorkflowOptions)).phraseBoundaryCase.reason, "workflow-wrapper");
await diagnosticsWorkflow.copyDebug(diagnosticsWorkflowRuntimeState, diagnosticsWorkflowOptions);
assert.equal(diagnosticsWorkflowFallbackCopy.includes("\"videoId\": \"video-1\""), true);
assert.equal(diagnosticsWorkflowRuntimeState.debugCopied, false);
const diagnosticsClearedAt = diagnosticsWorkflow.clearDiagnostics(diagnosticsWorkflowRuntimeState, diagnosticsWorkflowOptions);
assert.equal(diagnosticsClearedAt, "2026-06-30T10:15:00.000Z");
assert.equal(diagnosticsWorkflowRuntimeState.navigationEventSeq, 0);
assert.equal(diagnosticsWorkflowRuntimeState.bootDiagnostics.lastError, "");
assert.equal(diagnosticsWorkflowSnapshotPublished, true);
assert.equal(Object.hasOwn(diagnosticsWorkflowDocument.documentElement.dataset, "afShadowingBootError"), false);
assert.equal(diagnosticsWorkflowRenderCount >= 5, true);
const boundaryCase = issueReports.phraseBoundaryCase({
  currentIndex: 2,
  phrases: [{}, {}, {}, {}, {}],
  describePhraseAtIndex: (index) => ({ index, text: `phrase-${index}` }),
  videoId: "video-1",
  url: "https://youtube.test/watch?v=video-1",
  selectedSource: { id: "source-1" },
  transcriptResult: { retrievalPath: "backend-provider" },
  boundaryCaseReason: "unit",
  capturedAt: "2026-06-29T12:00:00.000Z",
});
assert.equal(boundaryCase.currentPhrase.text, "phrase-2");
assert.equal(boundaryCase.phraseWindow.map((phrase) => phrase.index).join("|"), "0|1|2|3|4");
assert.equal(boundaryCase.reason, "unit");
const issueMockSuccess = issueReports.issueReportMockResponse("success", {
  category: "navigation",
  createdAt: "2026-06-29T12:00:00.000Z",
});
assert.equal(issueMockSuccess.status, 201);
assert.equal(JSON.parse(issueMockSuccess.text).category, "navigation");
const issueMockError = issueReports.issueReportMockResponse("error");
assert.equal(issueMockError.ok, false);
assert.equal(issueMockError.status, 503);
const describedPhrase = diagnosticsReport.describePhraseAtIndex([
  {
    startMs: 1200,
    endMs: 2400,
    text: "rode ster",
    displayText: "de kleine rode ster",
    translationText: "red star",
    displayStartChar: 10,
    displayEndChar: 18,
    displaySegmentId: "segment-1",
    segmentRole: "sentence-segment",
  },
], 0);
assert.equal(describedPhrase.startSec, 1.2);
assert.equal(describedPhrase.displayText, "de kleine rode ster");
assert.equal(describedPhrase.translationText, "red star");
assert.equal(describedPhrase.displayStartChar, 10);
const cappedEvents = diagnosticsReport.appendCappedEvent(
  [{ id: 1 }, { id: 2 }],
  { id: 3 },
  2,
);
assert.equal(cappedEvents.map((event) => event.id).join("|"), "2|3");
const debugState = diagnosticsReport.debugState({
  videoId: "video-1",
  phrases: [{ startMs: 0, endMs: 1000, text: "eerste" }],
  currentIndex: 0,
  debugEvents: [{ type: "a" }, { type: "b" }],
  navigationEvents: Array.from({ length: 14 }, (_, index) => ({ id: index })),
});
assert.equal(debugState.videoId, "video-1");
assert.equal(debugState.phrases, 1);
assert.equal(debugState.navigationEvents.length, 12);
const diagnosticsStateDocument = { documentElement: { dataset: {} } };
const diagnosticsStateModel = {
  diagnosticsClearedAt: "",
  videoId: "video-1",
  selectedSourceId: "source-1",
  contentScriptRevision: "rev-1",
  lastPhraseProgressRestore: null,
  loading: false,
  error: "",
  bootDiagnostics: { lastError: "" },
  debugEvents: [],
  navigationEvents: [],
  navigationEventSeq: 0,
  lastIssueReport: "",
};
const diagnosticsController = diagnosticsState.createDiagnosticsStateController({
  state: diagnosticsStateModel,
  diagnosticsReport,
  document: diagnosticsStateDocument,
  now: () => "2026-06-30T10:00:00.000Z",
});
diagnosticsController.recordDebugEvent("unit-debug", { value: 1 });
assert.equal(diagnosticsStateModel.debugEvents[0].type, "unit-debug");
const diagnosticsNavigationEvent = diagnosticsController.recordNavigationEvent("unit-nav", { value: 2 });
assert.equal(diagnosticsNavigationEvent.id, "nav-1");
assert.equal(diagnosticsStateModel.navigationEventSeq, 1);
const diagnosticsSnapshot = JSON.parse(diagnosticsStateDocument.documentElement.dataset.afShadowingDiagnosticsState);
assert.equal(diagnosticsSnapshot.videoId, "video-1");
assert.equal(diagnosticsSnapshot.debugEventCount, 1);
assert.equal(diagnosticsSnapshot.navigationEventCount, 1);
const openDebugPanelState = diagnosticsReport.debugPanelState({
  debugVisible: true,
  debugPanelInFront: true,
  debugCopied: true,
});
assert.equal(openDebugPanelState.open, true);
assert.equal(openDebugPanelState.inFront, true);
assert.equal(openDebugPanelState.behind, false);
assert.equal(openDebugPanelState.copyText, "Copied");
assert.equal(openDebugPanelState.showDebugText, true);
const closedDebugPanelState = diagnosticsReport.debugPanelState({
  debugVisible: false,
  debugPanelInFront: false,
});
assert.equal(closedDebugPanelState.open, false);
assert.equal(closedDebugPanelState.inFront, false);
assert.equal(closedDebugPanelState.behind, true);
assert.equal(closedDebugPanelState.copyText, "Copy");
assert.equal(closedDebugPanelState.showDebugText, false);
const debugPanelElement = createTestElement("section");
const debugOutput = createTestElement("pre");
const debugCopyButton = createTestElement("button");
debugPanelElement.querySelector = (selector) => {
  if (selector === "[data-af-debug]") return debugOutput;
  if (selector === "[data-af-debug-panel-copy]") return debugCopyButton;
  return null;
};
diagnosticsDom.renderDebugPanel(debugPanelElement, openDebugPanelState, {
  debugText: "{\"videoId\":\"video-1\"}",
});
assert.equal(debugPanelElement.classList.contains("is-open"), true);
assert.equal(debugPanelElement.classList.contains("is-front"), true);
assert.equal(debugCopyButton.textContent, "Copied");
assert.equal(debugOutput.textContent, "{\"videoId\":\"video-1\"}");
diagnosticsDom.renderDebugPanel(debugPanelElement, closedDebugPanelState, {
  debugText: "hidden",
});
assert.equal(debugPanelElement.classList.contains("is-open"), false);
assert.equal(debugPanelElement.classList.contains("is-behind"), true);
assert.equal(debugOutput.textContent, "");
const dictionaryIssueSnapshot = issueReports.dictionaryCardTranslationIssueSnapshot({
  card: {
    id: "card-1",
    entryId: "entry-1",
    headword: "bouwen",
    clickedForm: "bouwt",
    language: "nl",
    meaningId: 2,
    partOfSpeech: "ww",
    headwordTranslation: "  строить  ",
    summary: {
      definition: "maken",
      definitionTranslation: "  создавать  ",
      example: "Zij bouwt een huis.",
      exampleTranslation: "  Она строит дом.  ",
    },
    sections: [{ kind: "example", text: "bouwt", translation: "  строит  " }],
  },
  selectedWord: {
    word: "bouwt",
    phraseIndex: 8,
    language: "nl",
    contextText: "Zij bouwt een huis.",
    translationsByCardId: {
      "card-1": {
        status: "ready",
        targetLang: "ru",
        translationId: "translation-1",
        overlay: { headword: "строить" },
      },
    },
  },
  currentPhrase: { text: "fallback context" },
  currentIndex: 4,
});
assert.equal(dictionaryIssueSnapshot.kind, "dictionary-card-translation-issue");
assert.equal(dictionaryIssueSnapshot.card.headwordTranslation, "строить");
assert.equal(dictionaryIssueSnapshot.card.summary.definitionTranslation, "создавать");
assert.equal(dictionaryIssueSnapshot.card.sections[0].translation, "строит");
assert.equal(dictionaryIssueSnapshot.loadedTranslation.targetLanguageCode, "ru");
assert.equal(dictionaryIssueSnapshot.lookup.contextText, "Zij bouwt een huis.");
assert.equal(
  issueReports.dictionaryCardIssueDescription({ headword: "bouwen", entryId: "entry-1", clickedForm: "bouwt" }, "translation"),
  "Dictionary card translation is inaccurate.\n\nCard: bouwen\nEntry: entry-1\nClicked form: bouwt",
);

const normalizedTranscript = transcriptMetadata.normalizeTranscriptResult(
  {
    cueSource: "backend-provider",
    provider: "supadata",
    timingExactness: "word-level",
    warnings: ["rough source"],
    fallbackUsed: true,
  },
  { kind: "asr", languageCode: "nl", vssId: ".nl" },
);
assert.equal(normalizedTranscript.sourceKind, "auto");
assert.equal(normalizedTranscript.fetchOrigin, "backend");
assert.equal(normalizedTranscript.provider, "supadata");
assert.equal(normalizedTranscript.selectedTrackId, ".nl");
assert.equal(normalizedTranscript.languageCode, "nl");
const sourceTranscriptState = {
  videoId: "video-1",
  selectedSourceId: "source-1",
  cueSource: "",
  practiceSources: [{ id: "source-1" }, { id: "source-2" }],
};
assert.equal(sourceTranscriptWorkflow.getSelectedPracticeSource(sourceTranscriptState).id, "source-1");
const sourceTranscriptNormalized = sourceTranscriptWorkflow.normalizeTranscriptResult(
  { cueSource: "direct-caption", cues: [{ text: "Hallo", startMs: 0, endMs: 1000 }] },
  { kind: "manual", languageCode: "nl" },
  {
    getState: () => sourceTranscriptState,
    transcriptMetadata,
  },
);
assert.equal(sourceTranscriptState.cueSource, "direct-caption");
assert.equal(sourceTranscriptNormalized.retrievalPath, "direct-caption");
const sourceTranscriptBootUpdates = [];
let sourceTranscriptDebug = null;
const sourceTranscriptFetched = await sourceTranscriptWorkflow.fetchBestAvailableCues(
  { kind: "manual", languageCode: "nl" },
  { refreshCache: true },
  {
    getState: () => sourceTranscriptState,
    transcriptRetrieval: {
      fetchBestAvailableCues: async (_track, options) => {
        options.updateRetrievalPath("backend-provider");
        options.updateLastError("");
        options.recordDebugEvent("fetch", { refreshCache: options.refreshCache });
        return { cueSource: "backend-provider", cues: [{ text: "Dag", startMs: 0, endMs: 1000 }] };
      },
    },
    transcriptMetadata,
    updateBootDiagnostics: (patch) => sourceTranscriptBootUpdates.push(patch),
    recordDebugEvent: (type, detail) => {
      sourceTranscriptDebug = { type, detail };
    },
  },
);
assert.equal(sourceTranscriptFetched.retrievalPath, "backend-provider");
assert.equal(sourceTranscriptBootUpdates[0].selectedRetrievalPath, "backend-provider");
assert.equal(sourceTranscriptDebug.detail.refreshCache, true);
assert.equal(sourceTranscriptWorkflow.phrasesFromTranscriptResult(
  { cues: [{ text: "Dag", startMs: 0, endMs: 1000 }] },
  {
    transcriptMetadata,
    maxPhraseDurationMs: 5000,
    longPauseMs: 1200,
    maxWords: 18,
    maxCharacters: 140,
  },
).length, 1);
const transcriptSummary = transcriptMetadata.summarizeTranscriptResult(normalizedTranscript);
assert.equal(transcriptSummary.warnings.length, 1);
assert.notEqual(transcriptSummary.warnings, normalizedTranscript.warnings);
assert.equal(
  transcriptMetadata.formatTranscriptBadge(normalizedTranscript),
  "Auto · word-level · via Supadata · fallback",
);
assert.equal(transcriptMetadata.fetchOriginFromRetrievalPath("timedtext-direct"), "youtube-page");
assert.equal(transcriptMetadata.formatFetchOriginLabel({ fetchOrigin: "youtube-transcript-dom" }), "YouTube transcript DOM");
assert.equal(transcriptMetadata.usesBackendPhraseContract({ retrievalPath: "backend-provider" }), true);
assert.equal(transcriptMetadata.usesBackendPhraseContract({ retrievalPath: "timedtext-direct" }), false);
const backendContractPhrases = transcriptMetadata.phrasesFromTranscriptResult({
  retrievalPath: "backend-provider",
  cues: [{
    phraseId: "phrase-1",
    startMs: 1000,
    endMs: 2200,
    playbackStartMs: 900,
    text: "Goed... daarna",
    displayText: "Goed... daarna",
    translationText: "Хорошо",
    displayStartChar: 3.9,
    displayEndChar: 15.1,
    displaySegmentId: "segment-1",
    segmentRole: "sentence-segment",
    timingFlags: ["aligned"],
  }],
});
assert.equal(backendContractPhrases.length, 1);
assert.equal(backendContractPhrases[0].id, "phrase-1");
assert.equal(backendContractPhrases[0].text, "Goed daarna");
assert.equal(backendContractPhrases[0].displayStartChar, 3);
assert.equal(backendContractPhrases[0].timingFlags.join("|"), "aligned");
const directCaptionPhrases = transcriptMetadata.phrasesFromTranscriptResult({
  retrievalPath: "timedtext-direct",
  cues: [
    { startMs: 0, endMs: 500, text: "Hello" },
    { startMs: 650, endMs: 1100, text: "world." },
  ],
}, {
  maxPhraseDurationMs: 5000,
  longPauseMs: 1000,
  maxWords: 18,
  maxCharacters: 140,
});
assert.equal(directCaptionPhrases.length, 1);
assert.equal(directCaptionPhrases[0].text, "Hello world.");
assert.equal(
  transcriptMetadata.summarizeTranscriptError("Backend provider request timed out | raw detail"),
  "Caption retrieval failed: YouTube captions were empty and AudioFilms fallback failed.",
);
assert.equal(
  transcriptMetadata.summarizeTranscriptError("First detail; second detail"),
  "First detail",
);

const practiceSnapshot = {
  snapshotRevisionId: "snapshot-1",
  textSource: {
    id: "text-source-1",
    kind: "provided-captions",
    revisionId: "text-rev-1",
    contentFingerprint: "fingerprint-1",
    languageCode: "nl",
  },
  timingEvidence: { revisionId: "timing-rev-1", quality: "word-level" },
  phraseSet: {
    revisionId: "phrase-set-1",
    phrases: [{
      startSec: 1.2,
      endSec: 2.8,
      playbackStartSec: 1.1,
      text: "Goed... daarna",
      displayText: "Goed... daarna",
      translationText: "Хорошо",
      displayStartChar: 3.9,
      displayEndChar: 15.1,
      displaySegmentId: "segment-1",
      segmentRole: "sentence-segment",
      timingFlags: ["aligned"],
    }],
  },
};
const timingOperation = {
  id: "operation-1",
  kind: "improve-timing",
  state: "succeeded",
  input: { language: "nl", textSource: "manual" },
  result: {
    snapshot: practiceSnapshot,
    diagnostics: { asrJobId: "asr-1" },
    applicability: {
      staleReason: "text-source-revision-mismatch",
      appliesToCurrentSnapshot: false,
    },
  },
};
const fingerprintDetails = transcriptMetadata.timingFingerprintCompatibilityDetails(timingOperation, {
  languageCode: "nl",
  practiceArtifact: { textContentFingerprint: "fingerprint-1" },
});
assert.equal(fingerprintDetails.compatible, true);
assert.equal(fingerprintDetails.currentFingerprintSource, "practiceArtifact.textContentFingerprint");
const debugEvents = [];
const timingTranscript = transcriptMetadata.transcriptResultFromPracticeTimingOperation(timingOperation, {
  currentResult: {
    languageCode: "nl",
    practiceArtifact: { textContentFingerprint: "fingerprint-1" },
  },
  recordDebugEvent: (type, detail) => debugEvents.push({ type, detail }),
});
assert.equal(timingTranscript.sourceKind, "manual");
assert.equal(timingTranscript.timingExactness, "word-level");
assert.equal(timingTranscript.cues[0].startMs, 1200);
assert.equal(timingTranscript.cues[0].text, "Goed daarna");
assert.equal(timingTranscript.cues[0].displayStartChar, 3);
assert.equal(timingTranscript.practiceArtifact.phraseSetRevisionId, "phrase-set-1");
assert.equal(debugEvents[0].type, "timing-cache-fingerprint-match");
const staleDebugEvents = [];
const staleTimingTranscript = transcriptMetadata.transcriptResultFromPracticeTimingOperation(timingOperation, {
  currentResult: {
    languageCode: "nl",
    practiceArtifact: { textContentFingerprint: "different" },
  },
  recordDebugEvent: (type, detail) => staleDebugEvents.push({ type, detail }),
});
assert.equal(staleTimingTranscript, null);
assert.equal(staleDebugEvents[0].type, "timing-cache-skipped");

const loadedSourceTranscript = sourceTimingWorkflow.transcriptResultFromLoadedSource({
  source: {
    id: "practice:loaded",
    languageCode: "nl",
    loadedTranscriptResult: {
      languageCode: "nl",
      actualTrackId: "asr-loaded",
      practiceSnapshot,
    },
  },
  transcriptMetadata,
});
assert.equal(loadedSourceTranscript.provider, "audiofilms-practice-timing");
assert.equal(loadedSourceTranscript.actualTrackId, "asr-loaded");

const sourceTimingPracticeSources = [{
  id: "manual-source",
  loadedTranscriptResult: {
    languageCode: "nl",
    practiceArtifact: { textContentFingerprint: "fingerprint-1" },
  },
  lastRetrievalAttempts: [{ path: "old", status: "error" }],
  error: "old error",
  lastError: "old last error",
}];
const sourceTimingEvents = [];
const sourceTimingOperation = {
  ...timingOperation,
  result: {
    ...timingOperation.result,
    alternatives: [{
      id: "alt-asr-1",
      label: "ASR transcript",
      snapshot: {
        ...practiceSnapshot,
        textSource: {
          ...practiceSnapshot.textSource,
          kind: "asr",
        },
      },
    }],
  },
};
const registeredSourceCount = sourceTimingWorkflow.registerTimingOperationResultSources({
  operation: sourceTimingOperation,
  selectedSource: sourceTimingPracticeSources[0],
  practiceSources: sourceTimingPracticeSources,
  transcriptMetadata,
  sourceSelection,
  recordDebugEvent: (type, detail) => sourceTimingEvents.push({ type, detail }),
});
assert.equal(registeredSourceCount, 1);
assert.equal(sourceTimingPracticeSources.length, 2);
assert.equal(sourceTimingPracticeSources[0].loadedCueSource, "practice-timing-cache");
assert.equal(sourceTimingPracticeSources[0].error, "");
assert.equal(sourceTimingPracticeSources[1].id, "practice:operation-1:alt-asr-1");
assert.equal(sourceTimingPracticeSources[1].track.kind, "asr");
assert.equal(sourceTimingPracticeSources[1].loadedTranscriptResult.provider, "audiofilms-practice-timing");
assert.equal(sourceTimingEvents[0].type, "timing-cache-fingerprint-match");

const activeTimingPatch = sourceTimingWorkflow.activeSourceTimingApplyPatch({
  operation: timingOperation,
  source: {
    id: "manual-source",
    track: { kind: "manual", languageCode: "nl" },
    loadedTranscriptResult: {
      languageCode: "nl",
      practiceArtifact: { textContentFingerprint: "fingerprint-1" },
    },
  },
  currentPhrases: [{ startMs: 1200 }],
  currentIndex: 0,
  autoPause: true,
  currentMs: Number.NaN,
  transcriptMetadata,
  phrasesFromTranscriptResult: (result) => transcriptMetadata.phrasesFromTranscriptResult(result),
  findPhraseIndexForTime: () => 0,
  now: () => "2026-06-30T05:20:00.000Z",
});
assert.equal(activeTimingPatch.applied, true);
assert.equal(activeTimingPatch.statePatch.selectedSourceId, "manual-source");
assert.equal(activeTimingPatch.statePatch.guidedMode, true);
assert.equal(activeTimingPatch.statePatch.timingOperationAppliedAt, "2026-06-30T05:20:00.000Z");
assert.equal(activeTimingPatch.statePatch.phrases[0].text, "Goed daarna");
assert.equal(activeTimingPatch.sourcePatch.loadedCueSource, "practice-timing-cache");
assert.equal(activeTimingPatch.sourcePatch.error, "");
const activeApplyState = {
  transcriptResult: {
    languageCode: "nl",
    practiceArtifact: { textContentFingerprint: "fingerprint-1" },
  },
  phrases: [{ startMs: 1200, text: "old phrase" }],
  currentIndex: 0,
  autoPause: true,
};
const activeApplySource = {
  id: "manual-source",
  track: { kind: "manual", languageCode: "nl" },
  loadedTranscriptResult: {
    languageCode: "nl",
    practiceArtifact: { textContentFingerprint: "fingerprint-1" },
  },
};
const activeApplyEvents = [];
assert.equal(sourceTimingWorkflow.applyTimingOperationResultToActiveSource(timingOperation, {
  getState: () => activeApplyState,
  getSelectedPracticeSource: () => activeApplySource,
  getVideoElement: () => ({ currentTime: 1.2 }),
  transcriptMetadata,
  phrasesFromTranscriptResult: (result) => transcriptMetadata.phrasesFromTranscriptResult(result),
  findPhraseIndexForTime: () => 0,
  updateBootDiagnostics: (patch) => activeApplyEvents.push({ type: "boot", patch }),
  ensurePassivePlaybackWatcher: () => activeApplyEvents.push({ type: "watcher" }),
  syncPassivePlayback: (video) => activeApplyEvents.push({ type: "sync", currentTime: video.currentTime }),
  phraseProgressStore: {
    schedule: (reason) => activeApplyEvents.push({ type: "progress", reason }),
  },
  captionTracks: {
    sourceDisplayName: (source) => `Source ${source.id}`,
  },
  recordDebugEvent: (type, detail) => activeApplyEvents.push({ type, detail }),
}), true);
assert.equal(activeApplyState.currentIndex, 0);
assert.equal(activeApplyState.guidedMode, true);
assert.equal(activeApplySource.loadedCueSource, "practice-timing-cache");
assert.equal(activeApplyEvents.find((event) => event.type === "boot").patch.selectedRetrievalPath, "practice-timing-cache");
assert.equal(activeApplyEvents.find((event) => event.type === "sync").currentTime, 1.2);
assert.equal(activeApplyEvents.find((event) => event.type === "progress").reason, "timing-improve-applied");
assert.equal(activeApplyEvents.at(-1).detail.source, "Source manual-source");
const rejectedTimingPatch = sourceTimingWorkflow.activeSourceTimingApplyPatch({
  operation: timingOperation,
  source: {
    id: "manual-source",
    loadedTranscriptResult: {
      languageCode: "nl",
      practiceArtifact: { textContentFingerprint: "different" },
    },
  },
  transcriptMetadata,
  phrasesFromTranscriptResult: (result) => transcriptMetadata.phrasesFromTranscriptResult(result),
  findPhraseIndexForTime: () => 0,
});
assert.equal(rejectedTimingPatch.applied, false);
const timingWorkflowState = {
  videoId: "video-1",
  timingOperation: null,
  timingOperationError: "",
  timingOperationApiBase: "",
  timingOperationPollTimer: null,
};
const timingWorkflowSource = { id: "source-1", loadedTranscriptResult: {} };
const timingWorkflowEvents = [];
let timingWorkflowRendered = 0;
let timingWorkflowAppliedOperation = null;
await sourceTimingWorkflow.startImproveTiming("manual", {
  getState: () => timingWorkflowState,
  getSelectedPracticeSource: () => timingWorkflowSource,
  practiceReadiness: () => ({ state: "rough" }),
  timingOperationState: () => ({ active: false }),
  apiBaseForBackendCommands: () => "https://api.test",
  postBackendJson: async (operation, body) => {
    timingWorkflowEvents.push({ type: "post", operation, body });
    return { id: "operation-2", kind: "improve-timing", state: "succeeded", result: {} };
  },
  buildPracticeTimingPayload: (source, override) => ({ sourceId: source.id, override }),
  sourceReadiness,
  applyTimingOperation: (operation) => {
    timingWorkflowAppliedOperation = operation;
  },
  recordDebugEvent: (type, detail) => timingWorkflowEvents.push({ type, detail }),
  render: () => {
    timingWorkflowRendered += 1;
  },
});
assert.equal(timingWorkflowState.timingOperationApiBase, "https://api.test");
assert.equal(timingWorkflowState.timingOperation.state, "queued");
assert.equal(timingWorkflowEvents.find((event) => event.type === "post").body.payload.override, "manual");
assert.equal(timingWorkflowAppliedOperation.id, "operation-2");
assert.equal(timingWorkflowRendered, 2);
assert.throws(
  () => sourceTimingWorkflow.applyTimingOperation({ kind: "unexpected" }, { getState: () => ({}) }),
  /unexpected response/,
);
const applyWorkflowState = { timingOperationPollTimer: "old" };
const applyWorkflowEvents = [];
const appliedTerminal = sourceTimingWorkflow.applyTimingOperation({
  id: "operation-3",
  kind: "improve-timing",
  state: "succeeded",
}, {
  getState: () => applyWorkflowState,
  recordDebugEvent: (type, detail) => applyWorkflowEvents.push({ type, detail }),
  scheduleTimingOperationPoll: () => applyWorkflowEvents.push({ type: "schedule" }),
  clearTimingOperationPoll: () => {
    applyWorkflowEvents.push({ type: "clear" });
    applyWorkflowState.timingOperationPollTimer = null;
  },
  applyTimingOperationResultToActiveSource: () => true,
  registerTimingOperationResultSources: () => 0,
});
assert.equal(appliedTerminal.appliedToActiveSource, true);
assert.equal(applyWorkflowEvents[1].type, "clear");
let scheduledDelay = 0;
let scheduledId = "";
const scheduleWorkflowState = { timingOperationPollTimer: null };
assert.equal(sourceTimingWorkflow.scheduleTimingOperationPoll({
  id: "operation-4",
  retryAfterMs: 20000,
}, {
  getState: () => scheduleWorkflowState,
  clearTimingOperationPoll: () => {},
  setTimeout: (callback, delay) => {
    scheduledDelay = delay;
    callback();
    return "timer-1";
  },
  pollTimingOperation: (operationId) => {
    scheduledId = operationId;
  },
}), true);
assert.equal(scheduledDelay, 10000);
assert.equal(scheduledId, "operation-4");
assert.equal(scheduleWorkflowState.timingOperationPollTimer, "timer-1");
const pollWorkflowState = {
  timingOperationApiBase: "https://api.test",
  timingOperationError: "",
  timingOperationPollTimer: "timer-1",
};
const pollWorkflowEvents = [];
assert.equal(await sourceTimingWorkflow.pollTimingOperation("operation-5", {
  getState: () => pollWorkflowState,
  getBackendJson: async () => {
    throw new Error("backend unavailable");
  },
  sourceReadiness,
  clearTimingOperationPoll: () => {
    pollWorkflowEvents.push({ type: "clear" });
    pollWorkflowState.timingOperationPollTimer = null;
  },
  recordDebugEvent: (type, detail) => pollWorkflowEvents.push({ type, detail }),
  render: () => pollWorkflowEvents.push({ type: "render" }),
}), false);
assert.equal(pollWorkflowState.timingOperationError, "backend unavailable");
assert.equal(pollWorkflowEvents.find((event) => event.type === "timing-improve-poll-failed").detail.operationId, "operation-5");
assert.equal(sourceTimingWorkflow.clearTimingOperationPoll({
  getState: () => ({ timingOperationPollTimer: "timer-2" }),
  clearTimeout: () => {},
}), true);

console.log("YouTube extension unit smoke passed.");
