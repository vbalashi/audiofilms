#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const EXTENSION_ID = "hhdkchoccmikoefhenobdjipgdppdpoc";
const SMOKE_ARTIFACT_DIR = "extensions/youtube-shadowing/.smoke-artifacts";

const FIXTURES = [
  {
    name: "manual-trappist",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
      checkReplay: true,
      checkOffOn: true,
      checkSourceSwitch: true,
      checkLookup: true,
    },
  },
  {
    name: "manual-legacy",
    videoId: "ZNQWWW-vvfM",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
      checkReplay: true,
      checkLookup: true,
    },
  },
  {
    name: "auto-visible-app-sample",
    videoId: "iDi5MhglYks",
    expect: {
      minTracks: 1,
      sourceIncludes: ["auto-captions"],
      countPattern: /\/ 125$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "manual-provider-fallback",
    videoId: "KrdVIUmBoE4",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "english-manual",
    videoId: "aircAruvnKk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["English captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "auto-only",
    videoId: "xymyDvCgWDA",
    expect: {
      minTracks: 1,
      sourceIncludes: ["auto-captions"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
      checkReplay: true,
      checkLookup: true,
    },
  },
  {
    name: "no-captions",
    videoId: "EColTNIbOko",
    expect: {
      minTracks: 0,
      sourceIncludes: ["No captions"],
      countPattern: /^0 \/ 0$/,
      empty: true,
      errorIncludes: "No caption tracks found",
      hiddenControls: ["Prev", "Replay", "Next"],
      checkOffOn: true,
      expectNoDictionary: true,
    },
  },
  {
    name: "manual-after-empty",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
      checkReplay: true,
      checkLookup: true,
    },
  },
];

const DEFAULT_FIXTURE_NAMES = new Set([
  "manual-trappist",
  "english-manual",
  "no-captions",
]);

const SPA_FIXTURES = [
  {
    name: "spa-manual-legacy",
    videoId: "ZNQWWW-vvfM",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "spa-manual-return",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch captions", "Ready"],
      countPattern: /\/ \d+$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
];

const BACKEND_OFF_FIXTURES = [
  {
    name: "backend-off-manual",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch"],
      countPattern: /^0 \/ 0$/,
      empty: true,
      errorIncludes: "AudioFilms fallback is off",
      hiddenControls: ["Prev", "Replay", "Next"],
      expectNoDictionary: true,
    },
  },
];

const BACKEND_FAILED_FIXTURES = [
  {
    name: "backend-failed-manual",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Dutch"],
      countPattern: /^0 \/ 0$/,
      empty: true,
      errorIncludes: "AudioFilms fallback failed",
      hiddenControls: ["Prev", "Replay", "Next"],
      expectNoDictionary: true,
    },
  },
];

const SOURCE_SWITCH_FAILED_FIXTURE = {
  name: "source-switch-failed-keeps-manual",
  videoId: "4EE7m94mJpk",
  expect: {
    minTracks: 1,
    sourceIncludes: ["Dutch captions", "Ready"],
    countPattern: /\/ \d+$/,
    retrievalPath: "backend-provider",
    empty: false,
  },
};

const MULTILINGUAL_SOURCE_SWITCH_FIXTURE = {
  name: "multilingual-source-switch-arabic",
  videoId: "aircAruvnKk",
  expect: {
    minTracks: 1,
    sourceIncludes: ["English captions", "Ready"],
    countPattern: /\/ \d+$/,
    retrievalPath: "backend-provider",
    empty: false,
  },
};

const ASR_EDGE_FIXTURE = {
  name: "asr-playback-edge-cases",
  videoId: "SJvlUB4F-G0",
  expect: {
    countPattern: /\/ 150$/,
    sourcePattern: /ASR/i,
  },
};

const DICTIONARY_SOURCE_BINDING_FIXTURE = {
  name: "dictionary-source-binding",
  videoId: "4EE7m94mJpk",
};

const args = new Set(process.argv.slice(2));
const profile = getArgValue("--profile") || (args.has("--full") ? "full" : "smoke");
const shouldRunFullSuite = profile === "full";
const shouldListFixtures = args.has("--list-fixtures");
const shouldReloadExtension = args.has("--reload-extension");
const shouldSkipBackendCheck = args.has("--skip-backend-check");
const shouldRunLocalBackendCheck = args.has("--local-backend-check") && !shouldSkipBackendCheck;
const shouldSkipSpaCheck = args.has("--skip-spa-check");
const shouldSkipBackendOffCheck = args.has("--skip-backend-off-check");
const shouldSkipBackendFailedCheck = args.has("--skip-backend-failed-check");
const shouldSkipSourceSwitchFailedCheck = args.has("--skip-source-switch-failed-check");
const shouldSkipMultilingualSwitchCheck = args.has("--skip-multilingual-switch-check");
const shouldSkipGeometryCheck = args.has("--skip-geometry-check");
const shouldStrictProvenance = args.has("--strict-provenance");
const shouldOnlyBackendOff = args.has("--only-backend-off");
const shouldOnlyBackendFailed = args.has("--only-backend-failed");
const shouldOnlySourceSwitchFailed = args.has("--only-source-switch-failed");
const shouldOnlyMultilingualSwitch = args.has("--only-multilingual-switch");
const shouldOnlyGeometry = args.has("--only-geometry");
const shouldOnlyAsrEdge = args.has("--only-asr-edge");
const shouldOnlyDictionarySourceBinding = args.has("--only-dictionary-source-binding");
const shouldOnlyDictionaryUi = args.has("--only-dictionary-ui");
const shouldOnlyFocusedScenario = shouldOnlyBackendOff ||
  shouldOnlyBackendFailed ||
  shouldOnlySourceSwitchFailed ||
  shouldOnlyMultilingualSwitch ||
  shouldOnlyGeometry ||
  shouldOnlyAsrEdge ||
  shouldOnlyDictionarySourceBinding ||
  shouldOnlyDictionaryUi;
const fixtureFilter = getArgValue("--only");
const dictionaryUiVideoId = getArgValue("--dictionary-video") || "4EE7m94mJpk";
const dictionaryUiWord = getArgValue("--dictionary-word") || "";
const dictionaryUiMock = getArgValue("--dictionary-mock") || "";
const waitMs = Number(getArgValue("--wait-ms") || 18000);

if (!["smoke", "full"].includes(profile)) {
  fail(`Unknown --profile=${profile}. Use --profile=smoke or --profile=full.`);
}

if (shouldListFixtures) {
  printFixtureList();
  process.exit(0);
}

const fixtures = fixtureFilter
  ? FIXTURES.filter((fixture) => fixture.name === fixtureFilter || fixture.videoId === fixtureFilter)
  : shouldOnlyFocusedScenario
    ? []
  : shouldRunFullSuite
    ? FIXTURES
    : FIXTURES.filter((fixture) => DEFAULT_FIXTURE_NAMES.has(fixture.name));

if (!fixtures.length && !shouldOnlyFocusedScenario) {
  fail(`No fixtures matched --only=${fixtureFilter}`);
}

console.log(`AudioFilms YouTube extension ${shouldRunFullSuite ? "full regression" : "smoke"} profile`);
if (!shouldRunFullSuite && !fixtureFilter) {
  console.log("Use --full for SPA, backend-degraded, source-switch, multilingual-switch, and geometry regression scenarios.");
  console.log("Use --only-asr-edge for the focused ASR playback edge-case check.");
  console.log("Use --only-dictionary-source-binding for focused dictionary provenance checks.");
  console.log("Use --only-dictionary-ui for focused dictionary card rendering screenshots.");
}

if (shouldRunLocalBackendCheck) {
  checkBackend();
}

if (shouldReloadExtension) {
  reloadExtension();
}

const results = [];
for (const fixture of fixtures) {
  const result = runFixture(fixture);
  results.push(result);
  printFixtureResult(result);
}

if (shouldOnlyAsrEdge) {
  const asrEdgeResult = runAsrEdgeScenario();
  results.push(asrEdgeResult);
  printFixtureResult(asrEdgeResult);
}

if (shouldOnlyDictionarySourceBinding) {
  const dictionarySourceBindingResult = runDictionarySourceBindingScenario();
  results.push(dictionarySourceBindingResult);
  printFixtureResult(dictionarySourceBindingResult);
}

if (shouldOnlyDictionaryUi) {
  const dictionaryUiResult = runDictionaryUiScenario();
  results.push(dictionaryUiResult);
  printFixtureResult(dictionaryUiResult);
}

if (shouldRunFullSuite && !fixtureFilter && !shouldOnlyFocusedScenario && !shouldSkipSpaCheck) {
  for (const fixture of runSpaNavigationScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((shouldRunFullSuite && !fixtureFilter && !shouldSkipBackendOffCheck) || shouldOnlyBackendOff) && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry && !shouldOnlyAsrEdge && !shouldOnlyDictionarySourceBinding && !shouldOnlyDictionaryUi) {
  for (const fixture of runBackendOffScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((shouldRunFullSuite && !fixtureFilter && !shouldSkipBackendFailedCheck) || shouldOnlyBackendFailed) && !shouldOnlyBackendOff && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry && !shouldOnlyAsrEdge && !shouldOnlyDictionarySourceBinding && !shouldOnlyDictionaryUi) {
  for (const fixture of runBackendFailedScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((shouldRunFullSuite && !fixtureFilter && !shouldSkipSourceSwitchFailedCheck) || shouldOnlySourceSwitchFailed) && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry && !shouldOnlyAsrEdge && !shouldOnlyDictionarySourceBinding && !shouldOnlyDictionaryUi) {
  const sourceSwitchFailedResult = runSourceSwitchFailedScenario();
  results.push(sourceSwitchFailedResult);
  printFixtureResult(sourceSwitchFailedResult);
}

if (((shouldRunFullSuite && !fixtureFilter && !shouldSkipMultilingualSwitchCheck) || shouldOnlyMultilingualSwitch) && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyGeometry && !shouldOnlyAsrEdge && !shouldOnlyDictionarySourceBinding && !shouldOnlyDictionaryUi) {
  const multilingualSwitchResult = runMultilingualSourceSwitchScenario();
  results.push(multilingualSwitchResult);
  printFixtureResult(multilingualSwitchResult);
}

if ((shouldRunFullSuite && !fixtureFilter && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyAsrEdge && !shouldOnlyDictionarySourceBinding && !shouldOnlyDictionaryUi && !shouldSkipGeometryCheck) || shouldOnlyGeometry) {
  const geometryResult = runGeometryScenario();
  results.push(geometryResult);
  printFixtureResult(geometryResult);
}

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`\n${failed.length} fixture(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${results.length} YouTube extension ${shouldRunFullSuite ? "regression" : "smoke"} fixture(s) passed.`);

function runFixture(fixture) {
  const url = `https://www.youtube.com/watch?v=${fixture.videoId}`;
  navigate(url);
  removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
  removeLocalStorageItem("afShadowingDictionaryMock");
  reloadTab();

  const snapshot = waitForSnapshot(fixture.videoId, waitMs);
  const assertions = assertFixture(fixture, snapshot);
  if (assertions.every((item) => item.ok)) {
    assertions.push(...assertInteractions(fixture));
  }
  return {
    ...fixture,
    ok: assertions.every((assertion) => assertion.ok),
    assertions,
    snapshot,
  };
}

function runSpaNavigationScenario() {
  const scenarioResults = [];
  for (const fixture of SPA_FIXTURES) {
    spaNavigate(fixture.videoId);
    const snapshot = waitForSnapshot(fixture.videoId, waitMs);
    const assertions = [
      assertion("synthetic SPA URL active", snapshot.url?.includes(`v=${fixture.videoId}`), snapshot.url),
      ...assertFixture(fixture, snapshot),
    ];
    scenarioResults.push({
      ...fixture,
      ok: assertions.every((item) => item.ok),
      assertions,
      snapshot,
    });
  }
  return scenarioResults;
}

function runBackendOffScenario() {
  return runBackendOverrideScenario(BACKEND_OFF_FIXTURES, "off");
}

function runBackendFailedScenario() {
  return runBackendOverrideScenario(BACKEND_FAILED_FIXTURES, "http://127.0.0.1:9/audiofilms-smoke-unavailable");
}

function runSourceSwitchFailedScenario() {
  const fixture = SOURCE_SWITCH_FAILED_FIXTURE;
  const loaded = runFixture(fixture);
  const assertions = [...loaded.assertions];
  if (!loaded.ok) {
    return {
      ...fixture,
      ok: false,
      assertions,
      snapshot: loaded.snapshot,
    };
  }

  const previousValue = getLocalStorageItem("afShadowingBackendSubtitlesUrl");
  const hadPreviousValue = previousValue !== null;

  try {
    setLocalStorageItem("afShadowingBackendSubtitlesUrl", "http://127.0.0.1:9/audiofilms-smoke-unavailable");
    const before = readSnapshot();
    const menu = openSourceMenu();
    assertions.push(assertion("source switch failure menu has auto option", menu.options.some((option) => /auto/i.test(option)), menu.options.join(" | ")));
    const autoClick = clickSourceOption("auto");
    assertions.push(assertion("source switch failure auto option clicked", autoClick.clicked, autoClick.detail));
    const after = waitForStableSourceText(/(?:Dutch|English) captions/i, fixture.videoId, waitMs);
    assertions.push(assertion("source switch failure keeps caption source", /(?:Dutch|English) captions/i.test(after.source || ""), after.source));
    assertions.push(assertion("source switch failure keeps phrase count", fixture.expect.countPattern.test(after.count || ""), after.count));
    assertions.push(assertion("source switch failure keeps phrase row", Boolean(after.rowText), after.rowText));
    assertions.push(assertion("source switch failure keeps previous phrase context", Boolean(before.rowText) && Boolean(after.rowText), `${before.rowText} -> ${after.rowText}`));

    const failedMenu = openSourceMenu();
    const errorText = failedMenu.errors.join(" | ");
    assertions.push(assertion("source switch failure recorded option error", /AudioFilms fallback failed/i.test(errorText), errorText));

    return {
      ...fixture,
      ok: assertions.every((item) => item.ok),
      assertions,
      snapshot: after,
    };
  } finally {
    chromeOpen("https://www.youtube.com/");
    sleep(800);
    if (hadPreviousValue) {
      setLocalStorageItem("afShadowingBackendSubtitlesUrl", previousValue);
    } else {
      removeLocalStorageItem("afShadowingBackendSubtitlesUrl");
    }
  }
}

function runMultilingualSourceSwitchScenario() {
  const fixture = MULTILINGUAL_SOURCE_SWITCH_FIXTURE;
  const loaded = runFixture(fixture);
  const assertions = [...loaded.assertions];
  if (!loaded.ok) {
    return {
      ...fixture,
      ok: false,
      assertions,
      snapshot: loaded.snapshot,
    };
  }

  const menu = openSourceMenu();
  assertions.push(assertion("multilingual menu has Arabic option", menu.options.some((option) => /Arabic/i.test(option)), menu.options.join(" | ")));
  const arabicClick = clickSourceOptionByText("Arabic");
  assertions.push(assertion("Arabic source option clicked", arabicClick.clicked, arabicClick.detail));
  const arabicSnapshot = waitForSource(/Arabic/, fixture.videoId, waitMs);
  assertions.push(assertion("Arabic source loaded", /Arabic/.test(arabicSnapshot.source || ""), arabicSnapshot.source));
  assertions.push(assertion("Arabic source remains caption-based", /captions/i.test(arabicSnapshot.source || ""), arabicSnapshot.source));
  assertions.push(assertion("Arabic source shows readiness", /Ready|Rough|Precise/i.test(arabicSnapshot.source || ""), arabicSnapshot.source));
  assertions.push(assertion("Arabic source has phrases", /\/ \d+$/.test(arabicSnapshot.count || ""), arabicSnapshot.count));
  assertions.push(assertion("Arabic source has non-Latin phrase row", /[\u0600-\u06FF]/.test(arabicSnapshot.rowText || ""), arabicSnapshot.rowText));
  assertions.push(assertion("Arabic source has no visible error", !(arabicSnapshot.error || "").trim(), arabicSnapshot.error));
  const clicked = clickFirstLookupWord();
  const lookupSnapshot = waitForDictionarySelection(clicked.word, waitMs);
  assertions.push(assertion("Arabic lookup word clicked", clicked.clicked && /[\u0600-\u06FF]/.test(clicked.word || ""), `${clicked.word} ${clicked.detail}`));
  assertions.push(assertion("Arabic lookup dictionary opened", lookupSnapshot.dictionary?.present === true));
  assertions.push(assertion("Arabic lookup selected Arabic word", /[\u0600-\u06FF]/.test(lookupSnapshot.dictionary?.word || ""), lookupSnapshot.dictionary?.word || ""));
  assertions.push(assertion("Arabic lookup completed", lookupSnapshot.dictionary?.loading === false, lookupSnapshot.dictionary?.subtitle || ""));
  assertions.push(assertion("Arabic lookup renders lookup surface", lookupSnapshot.dictionary?.cardCount > 0 || Boolean(lookupSnapshot.dictionary?.lookupTitle || lookupSnapshot.dictionary?.lookupCopy), JSON.stringify(lookupSnapshot.dictionary)));
  assertions.push(assertion("Arabic lookup leaves Arabic phrase row rendered", /[\u0600-\u06FF]/.test(lookupSnapshot.rowText || ""), lookupSnapshot.rowText || ""));

  return {
    ...fixture,
    ok: assertions.every((item) => item.ok),
    assertions,
    snapshot: lookupSnapshot,
  };
}

function runAsrEdgeScenario() {
  const fixture = ASR_EDGE_FIXTURE;
  const assertions = [];
  removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
  navigate(`https://www.youtube.com/watch?v=${fixture.videoId}`);
  const initial = waitForSnapshot(fixture.videoId, waitMs);
  assertions.push(assertion("ASR edge panel loaded", initial.panel === true, JSON.stringify({ boot: initial.boot, source: initial.source, count: initial.count, error: initial.error })));
  assertions.push(assertion("ASR edge has no initial visible error", !(initial.error || "").trim(), initial.error));

  const menu = openSourceMenu();
  assertions.push(assertion("ASR edge source menu opens", menu.opened === true, menu.detail));
  assertions.push(assertion("ASR transcript option appears from cache", menu.options.some((option) => /ASR/i.test(option)), menu.options.join(" | ")));
  const asrClick = clickSourceOptionByText("ASR");
  assertions.push(assertion("ASR transcript option clicked", asrClick.clicked || /ASR/i.test(initial.source || ""), asrClick.detail || initial.source));
  const asrSnapshot = asrClick.clicked
    ? waitForStableSourceText(fixture.expect.sourcePattern, fixture.videoId, waitMs)
    : initial;
  assertions.push(assertion("ASR source selected", fixture.expect.sourcePattern.test(asrSnapshot.source || ""), asrSnapshot.source));
  assertions.push(assertion("ASR phrase count is cached transcript", fixture.expect.countPattern.test(asrSnapshot.count || ""), asrSnapshot.count));
  assertions.push(assertion("ASR row rendered", Boolean(asrSnapshot.rowText), asrSnapshot.rowText));

  const phrase8 = replayAsrPhrase(8);
  const phrase14 = replayAsrPhrase(14);
  const phrase16 = replayAsrPhrase(16);

  assertions.push(
    assertion("ASR phrase 8 selected", parseCountOrdinal(phrase8.snapshot.count) === 8, phrase8.snapshot.count),
    assertion("ASR phrase 8 keeps full text", /Het is al een paar dagen heel warm/i.test(phrase8.snapshot.rowText || ""), phrase8.snapshot.rowText),
    assertion("ASR phrase 8 uses playbackStartSec", nearlyEqual(phrase8.seek?.playbackStartSec, 40.81, 0.08) && nearlyEqual(phrase8.seek?.seekToSec, 40.66, 0.12), JSON.stringify(phrase8.seek)),
    assertion("ASR phrase 14 selected", parseCountOrdinal(phrase14.snapshot.count) === 14, phrase14.snapshot.count),
    assertion("ASR phrase 14 does not clip exact boundary", nearlyEqual(phrase14.seek?.expectedPauseAtSec, 67.89, 0.12), JSON.stringify(phrase14.seek)),
    assertion("ASR phrase 16 selected", parseCountOrdinal(phrase16.snapshot.count) === 16, phrase16.snapshot.count),
    assertion("ASR phrase 16 keeps normal post-roll", nearlyEqual(phrase16.seek?.expectedPauseAtSec, 74.09, 0.12), JSON.stringify(phrase16.seek)),
  );

  return {
    ...fixture,
    ok: assertions.every((item) => item.ok),
    assertions,
    snapshot: phrase16.snapshot || asrSnapshot,
  };
}

function runDictionarySourceBindingScenario() {
  const fixture = DICTIONARY_SOURCE_BINDING_FIXTURE;
  const assertions = [];
  let previousDictionaryMock = null;
  let hadPreviousDictionaryMock = false;

  try {
    navigate(`https://www.youtube.com/watch?v=${fixture.videoId}`);
    previousDictionaryMock = getLocalStorageItem("afShadowingDictionaryMock");
    hadPreviousDictionaryMock = previousDictionaryMock !== null;
    removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
    setLocalStorageItem("afShadowingDictionaryMock", "cards");
    reloadTab();
    clearDictionaryMockCommands();
    const initial = waitForSnapshot(fixture.videoId, waitMs);
    assertions.push(assertion("dictionary source binding panel loaded", initial.panel === true, JSON.stringify({ source: initial.source, count: initial.count, error: initial.error })));
    assertions.push(assertion("dictionary source binding starts on captions", /captions/i.test(initial.source || ""), initial.source));

    const clicked = clickFirstLookupWord();
    const lookupSnapshot = waitForDictionarySelection(clicked.word, waitMs);
    const clickedOrdinal = parseCountOrdinal(lookupSnapshot.count);
    assertions.push(assertion("dictionary source binding lookup clicked", clicked.clicked === true, clicked.detail));
    assertions.push(assertion("dictionary source binding lookup ready", lookupSnapshot.dictionary?.cardCount === 3, JSON.stringify(lookupSnapshot.dictionary)));

    clearDictionaryMockCommands();
    const actionClick = clickDictionaryProgressAction(0, "Learn");
    const commands = waitForDictionaryMockCommand("dict-action", waitMs);
    const actionCommand = lastDictionaryMockCommand(commands, "dict-action");
    const sourceContext = actionCommand?.body?.sourceContext || {};
    assertions.push(assertion("dictionary source binding action clicked", actionClick === "clicked", actionClick));
    assertions.push(assertion("dictionary source binding captured action payload", Boolean(actionCommand?.body), JSON.stringify(actionCommand || {})));
    assertions.push(assertion("dictionary source binding keeps original video", sourceContext.source?.externalId === fixture.videoId, JSON.stringify(sourceContext.source || {})));
    assertions.push(assertion("dictionary source binding keeps clicked form", sourceContext.selection?.clickedForm === clicked.word, JSON.stringify(sourceContext.selection || {})));
    assertions.push(assertion("dictionary source binding keeps original phrase locator", sourceContext.location?.phraseIndex === clickedOrdinal - 1 && Boolean(sourceContext.location?.phraseTextHash), JSON.stringify(sourceContext.location || {})));
    assertions.push(assertion("dictionary source binding keeps original caption artifact", /audiofilms_/.test(sourceContext.artifact?.producer || "") && Boolean(sourceContext.artifact?.textContentFingerprint || sourceContext.artifact?.phraseSetRevisionId), JSON.stringify(sourceContext.artifact || {})));

    const sourceBeforeSwitch = lookupSnapshot.source || "";
    const menu = openSourceMenu();
    const autoClick = clickSourceOption("auto");
    const switched = waitForSource(/auto/i, fixture.videoId, waitMs);
    const afterSwitchDictionary = readSnapshot().dictionary;
    assertions.push(assertion("dictionary source binding source menu opened", menu.opened === true, menu.detail));
    assertions.push(assertion("dictionary source binding switched source after lookup", autoClick.clicked === true && /auto/i.test(switched.source || ""), `${autoClick.detail} -> ${switched.source}`));
    assertions.push(assertion("dictionary source binding source actually changed", sourceBeforeSwitch !== switched.source, `${sourceBeforeSwitch} -> ${switched.source}`));
    assertions.push(assertion("dictionary source switch closes stale cards", afterSwitchDictionary?.present === false, JSON.stringify(afterSwitchDictionary || {})));

    return {
      ...fixture,
      ok: assertions.every((item) => item.ok),
      assertions,
      snapshot: switched,
    };
  } finally {
    removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
    if (hadPreviousDictionaryMock) {
      setLocalStorageItem("afShadowingDictionaryMock", previousDictionaryMock);
    } else {
      removeLocalStorageItem("afShadowingDictionaryMock");
    }
  }
}

function runDictionaryUiScenario() {
  const fixture = {
    name: "dictionary-ui-focused",
    videoId: dictionaryUiVideoId,
    expect: {},
  };
  const assertions = [];
  let previousDictionaryMock = null;
  let hadPreviousDictionaryMock = false;

  try {
    resizeChrome(900, 900);
    navigate(`https://www.youtube.com/watch?v=${fixture.videoId}`);
    previousDictionaryMock = getLocalStorageItem("afShadowingDictionaryMock");
    hadPreviousDictionaryMock = previousDictionaryMock !== null;
    removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
    if (dictionaryUiMock && dictionaryUiMock !== "off") {
      setLocalStorageItem("afShadowingDictionaryMock", dictionaryUiMock);
    } else {
      removeLocalStorageItem("afShadowingDictionaryMock");
    }
    reloadTab();
    const initial = waitForSnapshot(fixture.videoId, waitMs);
    pauseVideo();
    setDebugVisible(false);

    let clicked = dictionaryUiWord ? clickLookupWord(dictionaryUiWord) : clickFirstLookupWord();
    if (!clicked.clicked && dictionaryUiWord) {
      clicked = clickFirstLookupWord();
    }
    const lookupSnapshot = waitForDictionarySelection(clicked.word, waitMs);
    const ready = waitForDictionaryUiReady(waitMs);
    expandDictionaryCards();
    sleep(500);
    setDebugVisible(false);
    const beforeTranslate = readGeometrySnapshot();
    const focusedEvidence = captureChromeScreenshot("dictionary-ui-focused");
    scrollDictionaryToCardDetails();
    sleep(500);
    const detailsEvidence = captureChromeScreenshot("dictionary-ui-focused-details");
    scrollDictionaryToSearchPreviews();
    sleep(500);
    const previewEvidence = captureChromeScreenshot("dictionary-ui-focused-previews");
    scrollDictionaryToTop();
    sleep(300);
    const translateClick = clickDictionaryTranslate(0);
    sleep(900);
    const afterTranslate = readGeometrySnapshot();
    const translatedEvidence = captureChromeScreenshot("dictionary-ui-focused-translated");
    const evidencePaths = [focusedEvidence, detailsEvidence, previewEvidence, translatedEvidence].filter(Boolean);
    const previewWidths = beforeTranslate.dictionaryUi?.searchItemTextWidths || [];
    const minPreviewWidth = previewWidths.length ? Math.min(...previewWidths) : null;
    const translationStyles = afterTranslate.dictionaryUi?.inlineTranslationStyles || [];

    assertions.push(
      assertion("dictionary ui panel loaded", initial.panel === true, JSON.stringify({ source: initial.source, count: initial.count, error: initial.error })),
      assertion("dictionary ui lookup word clicked", clicked.clicked === true, clicked.detail),
      assertion("dictionary ui lookup ready", lookupSnapshot.dictionary?.present === true && lookupSnapshot.dictionary?.loading === false, JSON.stringify(lookupSnapshot.dictionary || {})),
      assertion("dictionary ui renders overlay cards", ready.dictionaryUi?.overlayCardCount > 0, JSON.stringify(ready.dictionaryUi || {})),
      assertion("dictionary ui omits search previews heading", beforeTranslate.dictionaryUi?.searchHeadingPresent === false, JSON.stringify(beforeTranslate.dictionaryUi || {})),
      assertion("dictionary ui search preview text keeps usable width", minPreviewWidth === null || minPreviewWidth >= 120, JSON.stringify({ widths: previewWidths, samples: beforeTranslate.dictionaryUi?.searchItemTextSamples || [] })),
      assertion("dictionary ui does not show translation loading copy", !/loading translation/i.test(beforeTranslate.dictionaryUi?.actionStatus || ""), beforeTranslate.dictionaryUi?.actionStatus || ""),
      assertion("dictionary ui screenshot evidence captured", evidencePaths.length === 4, evidencePaths.join(" | ")),
    );

    if (translateClick === "clicked" && translationStyles.length) {
      assertions.push(
        assertion("dictionary ui translate action clicked", true, translateClick),
        assertion("dictionary ui translations render italic", translationStyles.every((style) => style.fontStyle === "italic"), JSON.stringify(translationStyles)),
        assertion("dictionary ui translations use normal weight", translationStyles.every((style) => Number(style.fontWeight) <= 600), JSON.stringify(translationStyles)),
        assertion("dictionary ui translation stays inline", afterTranslate.dictionaryUi?.translationBlocks === 0, JSON.stringify(afterTranslate.dictionaryUi || {})),
      );
    } else {
      assertions.push(assertion("dictionary ui translate action optional", true, translateClick));
    }

    return {
      ...fixture,
      ok: assertions.every((item) => item.ok),
      assertions,
      snapshot: {
        source: initial.source,
        count: initial.count,
        message: evidencePaths.join(" | "),
        error: ready.error,
      },
    };
  } finally {
    removeLocalStorageItem(`afShadowingSourceSelection:${fixture.videoId}`);
    if (hadPreviousDictionaryMock) {
      setLocalStorageItem("afShadowingDictionaryMock", previousDictionaryMock);
    } else {
      removeLocalStorageItem("afShadowingDictionaryMock");
    }
  }
}

function runBackendOverrideScenario(fixtures, backendUrl) {
  chromeOpen("https://www.youtube.com/");
  sleep(1200);
  const previousValue = getLocalStorageItem("afShadowingBackendSubtitlesUrl");
  const hadPreviousValue = previousValue !== null;
  const scenarioResults = [];

  try {
    setLocalStorageItem("afShadowingBackendSubtitlesUrl", backendUrl);
    for (const fixture of fixtures) {
      const result = runFixture(fixture);
      scenarioResults.push({
        ...result,
        name: fixture.name,
      });
    }
  } finally {
    chromeOpen("https://www.youtube.com/");
    sleep(800);
    if (hadPreviousValue) {
      setLocalStorageItem("afShadowingBackendSubtitlesUrl", previousValue);
    } else {
      removeLocalStorageItem("afShadowingBackendSubtitlesUrl");
    }
  }

  return scenarioResults;
}

function runGeometryScenario() {
  resizeChrome(1344, 900);
  navigate("https://www.youtube.com/watch?v=4EE7m94mJpk");
  waitForSnapshot("4EE7m94mJpk", waitMs);
  const previousDictionaryMock = getLocalStorageItem("afShadowingDictionaryMock");
  const hadPreviousDictionaryMock = previousDictionaryMock !== null;
  setLocalStorageItem("afShadowingDictionaryMock", "cards");
  try {
    reloadTab();
    waitForSnapshot("4EE7m94mJpk", waitMs);
    const initialAutoPauseAssertions = assertInitialAutoPauseOnLoad();
    waitForSnapshot("4EE7m94mJpk", waitMs);
    pauseVideo();
    setDebugVisible(false);
    const wideBeforeLookup = readGeometrySnapshot();
    const practiceModeLayoutAssertions = assertPracticeModeLayoutStability(wideBeforeLookup);
    const phraseTranslationAssertions = assertPhraseTranslationUi();
    const displayStickyAssertions = assertDisplayStickyUi();
    const controlHierarchyAssertions = assertControlHierarchyUi();
    const improveTimingAssertions = assertImproveTimingUi();
    const debugMenuAssertions = assertDebugMenuUi();
    const playbackSpeedAssertions = assertPlaybackSpeedUi();
    const popoverDismissalAssertions = assertPopoverDismissalUi();

    const lookupClick = clickFirstLookupWord();
    const dictionaryOpened = waitForDictionary(waitMs);
    setDebugVisible(false);
    const wideWithDictionary = readGeometrySnapshot();
    const accountPlacementAssertions = assertDictionaryAccountPlacement();
    const dictionaryCardAssertions = assertDictionaryCardUi();
    const spanSelectionAssertions = assertSpanSelectionUi();

    resizeChrome(430, 900);
    sleep(1200);
    setDebugVisible(false);
    const narrowWithDictionary = readGeometrySnapshot();
    const narrowEvidence = captureChromeScreenshot("geometry-narrow-dictionary");

    resizeChrome(1344, 900);
    const generatedDraftAssertions = assertGeneratedDraftCardUi();
    setDebugVisible(false);
    const wideEvidence = captureChromeScreenshot("geometry-wide-generated-draft");
    const evidencePaths = [wideEvidence, narrowEvidence].filter(Boolean);

    const assertions = [
      assertion("geometry lookup word clicked", lookupClick.clicked, lookupClick.detail),
      assertion("geometry dictionary opened", dictionaryOpened.dictionary?.present === true),
      ...practiceModeLayoutAssertions,
      ...phraseTranslationAssertions,
      ...displayStickyAssertions,
      ...controlHierarchyAssertions,
      ...improveTimingAssertions,
      ...debugMenuAssertions,
      ...playbackSpeedAssertions,
      ...popoverDismissalAssertions,
      ...initialAutoPauseAssertions,
      assertion("readiness chip has status dot", wideBeforeLookup.readinessChip?.hasDot === true, JSON.stringify(wideBeforeLookup.readinessChip)),
      assertion("primary UI avoids technical source terms", wideBeforeLookup.primaryUi?.hasTechnicalTerms === false, wideBeforeLookup.primaryUi?.text || ""),
      assertion("phrase navigation has three compact controls", wideBeforeLookup.primaryUi?.phraseButtons === 3, JSON.stringify(wideBeforeLookup.primaryUi)),
      assertion("dictionary ready body starts at cards", wideWithDictionary.dictionaryUi?.hasSelectedCard === false && wideWithDictionary.dictionaryUi?.overlayCardCount > 0, JSON.stringify(wideWithDictionary.dictionaryUi)),
      assertion("dictionary does not expose raw html", wideWithDictionary.dictionaryUi?.hasRawHtml === false, JSON.stringify(wideWithDictionary.dictionaryUi)),
      assertion("geometry screenshot evidence captured", evidencePaths.length === 2, evidencePaths.join(" | ")),
      ...accountPlacementAssertions,
      ...dictionaryCardAssertions,
      ...spanSelectionAssertions,
      ...generatedDraftAssertions,
      ...assertGeometry("wide phrase panel", wideBeforeLookup, { expectDictionary: false }),
      ...assertGeometry("wide with dictionary", wideWithDictionary, { expectDictionary: true }),
      ...assertGeometry("narrow with dictionary", narrowWithDictionary, { expectDictionary: true }),
    ];

    return {
      name: "viewport-geometry",
      videoId: "4EE7m94mJpk",
      expect: {},
      ok: assertions.every((item) => item.ok),
      assertions,
      snapshot: {
        source: `${wideBeforeLookup.viewport.width}x${wideBeforeLookup.viewport.height} -> ${narrowWithDictionary.viewport.width}x${narrowWithDictionary.viewport.height}`,
        count: wideBeforeLookup.count,
        message: evidencePaths.join(" | "),
        error: wideBeforeLookup.error,
      },
    };
  } finally {
    if (hadPreviousDictionaryMock) {
      setLocalStorageItem("afShadowingDictionaryMock", previousDictionaryMock);
    } else {
      removeLocalStorageItem("afShadowingDictionaryMock");
    }
  }
}

function assertPlaybackSpeedUi() {
  setVideoPlaybackRate(1);
  sleep(250);
  const start = readGeometrySnapshot();
  clickShadowButton("[data-af-speed-higher]");
  sleep(300);
  const faster = readGeometrySnapshot();
  clickShadowButton("[data-af-speed-lower]");
  sleep(300);
  const restoredNormal = readGeometrySnapshot();
  pressKey("Period", ".");
  sleep(250);
  const periodFaster = readGeometrySnapshot();
  pressKey("Comma", ",");
  sleep(250);
  const commaRestored = readGeometrySnapshot();
  pressKey("Equal", "+", { shiftKey: true });
  sleep(250);
  const plusFaster = readGeometrySnapshot();
  pressKey("Minus", "-");
  sleep(250);
  const minusRestored = readGeometrySnapshot();

  clickShadowButton("[data-af-settings-toggle]");
  sleep(200);
  const settings = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(150);

  pressKey("ArrowDown", "ArrowDown", { shiftKey: true });
  sleep(500);
  const slowActive = readGeometrySnapshot();
  forceActivePlaybackEnd();
  sleep(700);
  const slowRestored = readGeometrySnapshot();

  return [
    assertion("speed control starts at normal rate", Math.abs(start.playbackSpeed?.videoRate - 1) < 0.01, JSON.stringify(start.playbackSpeed)),
    assertion("speed increase uses 0.05 step", Math.abs(faster.playbackSpeed?.videoRate - 1.05) < 0.01, JSON.stringify(faster.playbackSpeed)),
    assertion("speed decrease restores normal rate", Math.abs(restoredNormal.playbackSpeed?.videoRate - 1) < 0.01, JSON.stringify(restoredNormal.playbackSpeed)),
    assertion("period shortcut increases speed", Math.abs(periodFaster.playbackSpeed?.videoRate - 1.05) < 0.01, JSON.stringify(periodFaster.playbackSpeed)),
    assertion("comma shortcut decreases speed", Math.abs(commaRestored.playbackSpeed?.videoRate - 1) < 0.01, JSON.stringify(commaRestored.playbackSpeed)),
    assertion("plus shortcut increases speed", Math.abs(plusFaster.playbackSpeed?.videoRate - 1.05) < 0.01, JSON.stringify(plusFaster.playbackSpeed)),
    assertion("minus shortcut decreases speed", Math.abs(minusRestored.playbackSpeed?.videoRate - 1) < 0.01, JSON.stringify(minusRestored.playbackSpeed)),
    assertion("speed label reflects video rate", /1\.00x/.test(restoredNormal.playbackSpeed?.label || ""), JSON.stringify(restoredNormal.playbackSpeed)),
    assertion("settings exposes slow replay speed", settings.playbackSpeed?.slowReplayLabel === "0.75x", JSON.stringify(settings.playbackSpeed)),
    assertion("Shift+ArrowDown applies slow replay speed", Math.abs(slowActive.playbackSpeed?.videoRate - 0.75) < 0.01, JSON.stringify(slowActive.playbackSpeed)),
    assertion("slow replay restores normal speed", Math.abs(slowRestored.playbackSpeed?.videoRate - 1) < 0.01 && slowRestored.playbackSpeed?.activeSlowReplay === false, JSON.stringify(slowRestored.playbackSpeed)),
  ];
}

function assertInitialAutoPauseOnLoad() {
  playVideo();
  sleep(500);
  const beforeReload = readSnapshot();
  reloadTab();
  waitForSnapshot("4EE7m94mJpk", waitMs);
  sleep(1200);
  const afterLoad = readSnapshot();

  return [
    assertion("auto-pause load setup started playback", beforeReload.video?.paused === false, JSON.stringify(beforeReload.video)),
    assertion("auto-pause holds video after source load", afterLoad.video?.paused === true, JSON.stringify(afterLoad.video)),
    assertion("auto-pause arms guided mode after source load", afterLoad.guidedMode === true, JSON.stringify({ guidedMode: afterLoad.guidedMode, mode: afterLoad.mode })),
  ];
}

function assertDebugMenuUi() {
  clickShadowButton("[data-af-settings-toggle]");
  sleep(200);
  const settingsGeometry = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const settingsClosedGeometry = readGeometrySnapshot();

  clickShadowButton("[data-af-utility-toggle]");
  sleep(200);
  const openGeometry = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const closedGeometry = readGeometrySnapshot();

  return [
    assertion("settings button is labelled", settingsGeometry.settingsTools?.label === "Settings", settingsGeometry.settingsTools?.label || ""),
    assertion("settings popover opens", settingsGeometry.settingsTools?.open === true, JSON.stringify(settingsGeometry.settingsTools)),
    assertion(
      "settings contains learner preferences",
      ["A-", "A+", "Auto-pause", "Lock"].every((action) => settingsGeometry.settingsTools?.actions?.some((label) => label.includes(action))),
      (settingsGeometry.settingsTools?.actions || []).join("|"),
    ),
    assertion("settings popover closes with Escape", settingsClosedGeometry.settingsTools?.open === false, JSON.stringify(settingsClosedGeometry.settingsTools)),
    assertion("debug tools button is labelled", openGeometry.debugTools?.label === "Debug tools", openGeometry.debugTools?.label || ""),
    assertion("debug tools popover opens", openGeometry.debugTools?.open === true, JSON.stringify(openGeometry.debugTools)),
    assertion(
      "debug tools contains actions",
      ["Mark Issue", "Debug", "Copy Debug", "Refresh Cache"].every((action) => openGeometry.debugTools?.actions?.includes(action)),
      (openGeometry.debugTools?.actions || []).join("|"),
    ),
    assertion(
      "debug tools exclude learner settings",
      ["A-", "A+", "Auto-pause", "Lock", "Reset"].every((action) => !openGeometry.debugTools?.actions?.some((label) => label.includes(action))),
      (openGeometry.debugTools?.actions || []).join("|"),
    ),
    assertion("debug tools popover closes with Escape", closedGeometry.debugTools?.open === false, JSON.stringify(closedGeometry.debugTools)),
  ];
}

function assertPopoverDismissalUi() {
  const assertions = [];

  clickShadowButton("[data-af-utility-toggle]");
  sleep(200);
  const utilityOpen = readGeometrySnapshot();
  clickOutsideShadowUi();
  sleep(200);
  const utilityOutsideClosed = readGeometrySnapshot();
  assertions.push(
    assertion("debug tools popover opens before outside click", utilityOpen.debugTools?.open === true, JSON.stringify(utilityOpen.debugTools)),
    assertion("debug tools popover closes on outside click", utilityOutsideClosed.debugTools?.open === false, JSON.stringify(utilityOutsideClosed.debugTools)),
  );

  clickShadowButton("[data-af-settings-toggle]");
  sleep(200);
  const settingsOpen = readGeometrySnapshot();
  clickOutsideShadowUi();
  sleep(200);
  const settingsOutsideClosed = readGeometrySnapshot();
  assertions.push(
    assertion("settings popover opens before outside click", settingsOpen.settingsTools?.open === true, JSON.stringify(settingsOpen.settingsTools)),
    assertion("settings popover closes on outside click", settingsOutsideClosed.settingsTools?.open === false, JSON.stringify(settingsOutsideClosed.settingsTools)),
  );

  clickShadowButton("[data-af-source-toggle]");
  sleep(200);
  const sourceOpen = readGeometrySnapshot();
  clickOutsideShadowUi();
  sleep(200);
  const sourceOutsideClosed = readGeometrySnapshot();
  assertions.push(
    assertion("source popover opens before outside click", sourceOpen.readinessMenu?.open === true, JSON.stringify(sourceOpen.readinessMenu)),
    assertion("source popover closes on outside click", sourceOutsideClosed.readinessMenu?.open === false, JSON.stringify(sourceOutsideClosed.readinessMenu)),
  );

  clickShadowButton("[data-af-source-toggle]");
  sleep(200);
  const sourceReopen = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const sourceEscapeClosed = readGeometrySnapshot();
  assertions.push(
    assertion("source popover reopens before Escape", sourceReopen.readinessMenu?.open === true, JSON.stringify(sourceReopen.readinessMenu)),
    assertion("source popover closes with Escape", sourceEscapeClosed.readinessMenu?.open === false, JSON.stringify(sourceEscapeClosed.readinessMenu)),
  );

  clickShadowButton("[data-af-account]");
  sleep(200);
  const accountOpen = readGeometrySnapshot();
  clickOutsideShadowUi();
  sleep(200);
  const accountOutsideClosed = readGeometrySnapshot();
  assertions.push(
    assertion("account popover opens before outside click", accountOpen.ribbonUi?.accountMenuOpen === true, JSON.stringify(accountOpen.ribbonUi)),
    assertion("account popover closes on outside click", accountOutsideClosed.ribbonUi?.accountMenuOpen === false, JSON.stringify(accountOutsideClosed.ribbonUi)),
  );

  clickShadowButton("[data-af-account]");
  sleep(200);
  const accountReopen = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const accountEscapeClosed = readGeometrySnapshot();
  assertions.push(
    assertion("account popover reopens before Escape", accountReopen.ribbonUi?.accountMenuOpen === true, JSON.stringify(accountReopen.ribbonUi)),
    assertion("account popover closes with Escape", accountEscapeClosed.ribbonUi?.accountMenuOpen === false, JSON.stringify(accountEscapeClosed.ribbonUi)),
  );

  return assertions;
}

function assertPracticeModeLayoutStability(shadowGeometry) {
  clickShadowButton("[data-af-mode-recall]");
  sleep(300);
  const recallGeometry = readGeometrySnapshot();
  clickShadowButton("[data-af-mode-shadow]");
  sleep(300);
  const shadowAgainGeometry = readGeometrySnapshot();
  const heightDelta = Math.abs((shadowGeometry.ribbon?.height || 0) - (recallGeometry.ribbon?.height || 0));
  const widthDelta = Math.abs((shadowGeometry.ribbon?.width || 0) - (recallGeometry.ribbon?.width || 0));

  return [
    assertion("practice mode recall activates", recallGeometry.practiceMode === "recall", recallGeometry.practiceMode || ""),
    assertion("practice mode shadow reactivates", shadowAgainGeometry.practiceMode === "shadow", shadowAgainGeometry.practiceMode || ""),
    assertion("practice mode keeps ribbon height stable", heightDelta <= 4, `${shadowGeometry.ribbon?.height} -> ${recallGeometry.ribbon?.height}`),
    assertion("practice mode keeps ribbon width stable", widthDelta <= 1, `${shadowGeometry.ribbon?.width} -> ${recallGeometry.ribbon?.width}`),
    assertion("recall phrase prompt has actionable state", Boolean(recallGeometry.phraseTranslation?.prompt) && !/unavailable/i.test(recallGeometry.phraseTranslation?.prompt || ""), recallGeometry.phraseTranslation?.prompt || ""),
  ];
}

function assertPhraseTranslationUi() {
  let openGeometry = readGeometrySnapshot();
  if (!openGeometry.phraseTranslation?.visible) {
    clickShadowButton("[data-af-phrase-translation]");
    sleep(500);
    openGeometry = readGeometrySnapshot();
  }
  clickShadowButton("[data-af-phrase-translation]");
  sleep(200);
  const closedGeometry = readGeometrySnapshot();

  return [
    assertion("show translation toggles inline lane", openGeometry.phraseTranslation?.visible === true, JSON.stringify(openGeometry.phraseTranslation)),
    assertion("show translation has actionable state", Boolean(openGeometry.phraseTranslation?.lane) && !/unavailable/i.test(openGeometry.phraseTranslation?.lane || ""), openGeometry.phraseTranslation?.lane || ""),
    assertion("show translation can hide inline lane", closedGeometry.phraseTranslation?.visible === false, JSON.stringify(closedGeometry.phraseTranslation)),
  ];
}

function assertDisplayStickyUi() {
  clickShadowButton("[data-af-mode-shadow]");
  sleep(200);
  let start = readGeometrySnapshot();
  const startIndex = Number((start.count || "").split("/")[0].trim()) || 1;

  pressKey("KeyS", "s");
  sleep(200);
  const originalCurrentHidden = readGeometrySnapshot();
  clickShadowButton("[data-af-next]");
  sleep(500);
  const originalNext = readGeometrySnapshot();

  pressKey("KeyS", "S", { shiftKey: true });
  sleep(200);
  const originalStickyHidden = readGeometrySnapshot();
  clickShadowButton("[data-af-next]");
  sleep(500);
  const originalStickyNext = readGeometrySnapshot();

  pressKey("KeyS", "S", { shiftKey: true });
  sleep(200);
  const originalStickyRestored = readGeometrySnapshot();

  pressKey("KeyT", "t");
  sleep(500);
  const translationCurrentOpen = readGeometrySnapshot();
  pressKey("Digit0", "0");
  sleep(300);
  const translationZeroClosed = readGeometrySnapshot();
  pressKey("Digit0", "0");
  sleep(500);
  const translationZeroOpen = readGeometrySnapshot();
  clickShadowButton("[data-af-next]");
  sleep(500);
  const translationNext = readGeometrySnapshot();

  pressKey("KeyT", "T", { shiftKey: true });
  sleep(500);
  const translationStickyOpen = readGeometrySnapshot();
  clickShadowButton("[data-af-next]");
  sleep(500);
  const translationStickyNext = readGeometrySnapshot();

  pressKey("KeyT", "T", { shiftKey: true });
  sleep(200);
  const translationStickyClosed = readGeometrySnapshot();

  return [
    assertion("original starts in sticky visible mode", start.phraseTranslation?.originalSticky === true && start.phraseTranslation?.originalMasked === false, JSON.stringify(start.phraseTranslation)),
    assertion("S hides original for current phrase only", originalCurrentHidden.phraseTranslation?.originalMasked === true, JSON.stringify(originalCurrentHidden.phraseTranslation)),
    assertion("next restores sticky original visibility", originalNext.phraseTranslation?.originalMasked === false && originalNext.phraseTranslation?.originalSticky === true, JSON.stringify(originalNext.phraseTranslation)),
    assertion("Shift+S turns sticky original off", originalStickyHidden.phraseTranslation?.originalMasked === true && originalStickyHidden.phraseTranslation?.originalSticky === false, JSON.stringify(originalStickyHidden.phraseTranslation)),
    assertion("next keeps sticky original hidden", originalStickyNext.phraseTranslation?.originalMasked === true && originalStickyNext.phraseTranslation?.originalSticky === false, JSON.stringify(originalStickyNext.phraseTranslation)),
    assertion("Shift+S restores sticky original", originalStickyRestored.phraseTranslation?.originalMasked === false && originalStickyRestored.phraseTranslation?.originalSticky === true, JSON.stringify(originalStickyRestored.phraseTranslation)),
    assertion("T shows translation for current phrase only", translationCurrentOpen.phraseTranslation?.visible === true && translationCurrentOpen.phraseTranslation?.sticky === false, JSON.stringify(translationCurrentOpen.phraseTranslation)),
    assertion("0 hides current translation", translationZeroClosed.phraseTranslation?.visible === false && translationZeroClosed.phraseTranslation?.sticky === false, JSON.stringify(translationZeroClosed.phraseTranslation)),
    assertion("0 shows current translation", translationZeroOpen.phraseTranslation?.visible === true && translationZeroOpen.phraseTranslation?.sticky === false, JSON.stringify(translationZeroOpen.phraseTranslation)),
    assertion("next clears current-only translation", translationNext.phraseTranslation?.visible === false && translationNext.phraseTranslation?.sticky === false, JSON.stringify(translationNext.phraseTranslation)),
    assertion("Shift+T turns sticky translation on", translationStickyOpen.phraseTranslation?.visible === true && translationStickyOpen.phraseTranslation?.sticky === true, JSON.stringify(translationStickyOpen.phraseTranslation)),
    assertion("next keeps sticky translation visible", translationStickyNext.phraseTranslation?.visible === true && translationStickyNext.phraseTranslation?.sticky === true, JSON.stringify(translationStickyNext.phraseTranslation)),
    assertion("Shift+T turns sticky translation off", translationStickyClosed.phraseTranslation?.visible === false && translationStickyClosed.phraseTranslation?.sticky === false, JSON.stringify(translationStickyClosed.phraseTranslation)),
    assertion("display sticky scenario advanced phrases", Number((translationStickyNext.count || "").split("/")[0].trim()) > startIndex, `${start.count} -> ${translationStickyNext.count}`),
  ];
}

function assertControlHierarchyUi() {
  let geometry = readGeometrySnapshot();
  const controls = geometry.controlHierarchy || {};
  clickShadowButton("[data-af-shortcut-help]");
  sleep(200);
  const helpOpen = readGeometrySnapshot();
  pressKey("Slash", "?", { shiftKey: true });
  sleep(200);
  const helpClosed = readGeometrySnapshot();
  pressKey("Slash", "?", { shiftKey: true });
  sleep(200);
  const helpReopened = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const helpEscapeClosed = readGeometrySnapshot();
  geometry = readGeometrySnapshot();
  return [
    assertion("shortcut hint row removed", controls.shortcutRowPresent === false, JSON.stringify(controls)),
    assertion("mode controls show inline shortcuts", /Shadow\s*1/.test(controls.modeText || "") && /Recall\s*2/.test(controls.modeText || ""), controls.modeText || ""),
    assertion("phrase navigation remains near center", controls.practiceCenterOffset <= 64, JSON.stringify(controls)),
    assertion("phrase navigation is primary width", controls.practiceWidth > controls.modeWidth && controls.practiceWidth >= controls.displayWidth, JSON.stringify(controls)),
    assertion("display controls stay right of navigation", controls.displayLeft >= controls.practiceRight, JSON.stringify(controls)),
    assertion("phrase navigation keeps textual labels", /Previous/.test(controls.practiceText || "") && /Repeat/.test(controls.practiceText || "") && /Next/.test(controls.practiceText || ""), controls.practiceText || ""),
    assertion("display controls use stable labels", /original/i.test((controls.displayLabels || []).join(" ")) && /translation/i.test((controls.displayLabels || []).join(" ")), JSON.stringify(controls.displayLabels || [])),
    assertion("shortcut help opens from button", helpOpen.controlHierarchy?.shortcutHelpOpen === true, JSON.stringify(helpOpen.controlHierarchy)),
    assertion("shortcut help closes with repeated ?", helpClosed.controlHierarchy?.shortcutHelpOpen === false, JSON.stringify(helpClosed.controlHierarchy)),
    assertion("shortcut help opens with ?", helpReopened.controlHierarchy?.shortcutHelpOpen === true, JSON.stringify(helpReopened.controlHierarchy)),
    assertion("shortcut help closes with Escape", helpEscapeClosed.controlHierarchy?.shortcutHelpOpen === false, JSON.stringify(helpEscapeClosed.controlHierarchy)),
  ];
}

function assertSpanSelectionUi() {
  const escapeCancel = previewThenEscapeFirstPhraseSpan();
  const outsideCancel = previewThenReleaseOutsideFirstPhraseSpan();
  const drag = dragFirstPhraseSpan();
  sleep(900);
  const spanGeometry = readGeometrySnapshot();
  clickShadowButton(".af-span-word");
  const spanWordLookupGeometry = waitForGeometryDictionaryCards(5000);
  clickShadowButton("[data-af-span-clear]");
  sleep(650);
  const clearedGeometry = readGeometrySnapshot();
  clickFirstLookupWord();
  waitForDictionary(5000);

  return [
    assertion("span draft clears on Escape", escapeCancel.draftWordsBefore >= 2 && escapeCancel.draftWordsAfter === 0, JSON.stringify(escapeCancel)),
    assertion("span draft clears on outside pointerup", outsideCancel.draftWordsBefore >= 2 && outsideCancel.draftWordsAfter === 0, JSON.stringify(outsideCancel)),
    assertion("span drag selected consecutive words", drag.selected === true, JSON.stringify(drag)),
    assertion("span drag previews draft range before release", drag.draftWords >= 2, JSON.stringify(drag)),
    assertion("span selection opens translation card", spanGeometry.dictionaryUi?.spanTranslationPresent === true, JSON.stringify(spanGeometry.dictionaryUi)),
    assertion("span translation keeps original words clickable", spanGeometry.dictionaryUi?.spanWordCount >= 2, JSON.stringify(spanGeometry.dictionaryUi)),
    assertion("span card omits redundant context line", spanGeometry.dictionaryUi?.hasSpanContext === false, JSON.stringify(spanGeometry.dictionaryUi)),
    assertion("span word lookup keeps selected phrase pinned", spanWordLookupGeometry.dictionaryUi?.spanTranslationPresent === true, JSON.stringify(spanWordLookupGeometry.dictionaryUi)),
    assertion("span word lookup renders dictionary cards below pinned phrase", spanWordLookupGeometry.dictionaryUi?.overlayCardCount > 0, JSON.stringify(spanWordLookupGeometry.dictionaryUi)),
    assertion("span selection highlights phrase words", spanGeometry.primaryUi?.spanSelectedWords >= 2, JSON.stringify(spanGeometry.primaryUi)),
    assertion("clear span selection removes pinned phrase", clearedGeometry.dictionaryUi?.spanTranslationPresent === false, JSON.stringify(clearedGeometry.dictionaryUi)),
  ];
}

function assertImproveTimingUi() {
  clickShadowButton("[data-af-source-toggle]");
  sleep(200);
  const openGeometry = readGeometrySnapshot();
  const hasImproveAction = openGeometry.readinessMenu?.actions?.includes("Improve Timing");
  if (hasImproveAction && !openGeometry.readinessMenu?.improveDisabled) {
    clickShadowButton("[data-af-readiness-improve-timing]");
    sleep(1400);
  }
  const afterClickGeometry = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);

  const placeholderRemoved = !/needs the practice-timing contract/i.test(openGeometry.readinessMenu?.improveTitle || "");
  const alreadyPrecise = openGeometry.readinessChip?.state === "precise";
  const hasFeedback = Boolean(afterClickGeometry.readinessMenu?.timingStatusCopy) ||
    afterClickGeometry.readinessChip?.state === "improving" ||
    alreadyPrecise;

  return [
    assertion("improve timing action state matches timing quality", hasImproveAction && (alreadyPrecise ? openGeometry.readinessMenu?.improveDisabled === true : openGeometry.readinessMenu?.improveDisabled === false), JSON.stringify({ chip: openGeometry.readinessChip, menu: openGeometry.readinessMenu })),
    assertion("readiness actions are scoped", openGeometry.readinessMenu?.actions?.join("|") === "Get Captions|Improve Timing", (openGeometry.readinessMenu?.actions || []).join("|")),
    assertion("improve timing is not placeholder copy", placeholderRemoved, openGeometry.readinessMenu?.improveTitle || ""),
    assertion("improve timing state is explainable", hasFeedback, JSON.stringify(afterClickGeometry.readinessMenu)),
  ];
}

function assertDictionaryAccountPlacement() {
  clickShadowButton("[data-af-account]");
  sleep(200);
  const accountGeometry = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);

  return [
    assertion("account icon is in ribbon header", Boolean(accountGeometry.ribbonUi?.accountLabel), JSON.stringify(accountGeometry.ribbonUi)),
    assertion("account icon is not in dictionary header", accountGeometry.dictionaryUi?.accountPresent === false, JSON.stringify(accountGeometry.dictionaryUi)),
    assertion("account icon is rightmost header control", accountGeometry.ribbonUi?.accountRight >= accountGeometry.ribbonUi?.debugRight && accountGeometry.ribbonUi?.accountRight >= accountGeometry.ribbonUi?.settingsRight, JSON.stringify(accountGeometry.ribbonUi)),
    assertion("ribbon account menu opens", accountGeometry.ribbonUi?.accountMenuOpen === true, JSON.stringify(accountGeometry.ribbonUi)),
    assertion("ribbon account menu has connect action", /Connect|Disconnect|Reconnect/i.test(accountGeometry.ribbonUi?.accountAction || ""), accountGeometry.ribbonUi?.accountAction || ""),
  ];
}

function assertDictionaryCardUi() {
  const before = readGeometrySnapshot();
  const firstTranslate = clickDictionaryTranslate(0);
  sleep(500);
  const afterReadyTranslation = readGeometrySnapshot();
  const errorTranslate = clickDictionaryTranslate(2);
  sleep(500);
  const afterErrorTranslation = readGeometrySnapshot();

  const allProgressActions = before.dictionaryUi?.cards?.flatMap((card) => card.progressActions || []) || [];
  const firstCardActions = before.dictionaryUi?.cards?.[0]?.progressActions || [];
  const reviewCard = before.dictionaryUi?.cards?.find((card) => (card.progressActions || []).includes("Again"));
  const frozenCard = before.dictionaryUi?.cards?.find((card) => /frozen/i.test(card.title || "")) ||
    before.dictionaryUi?.cards?.[2];

  return [
    assertion("dictionary mock card count", before.dictionaryUi?.overlayCardCount === 3, JSON.stringify(before.dictionaryUi)),
    assertion("dictionary card anatomy has title and chips", before.dictionaryUi?.cards?.every((card) => card.title && card.chips > 0), JSON.stringify(before.dictionaryUi?.cards || [])),
    assertion("dictionary not-started actions show Learn only", firstCardActions.length === 1 && firstCardActions[0] === "Learn", firstCardActions.join("|")),
    assertion("dictionary progress actions do not show Known", !allProgressActions.includes("Known"), allProgressActions.join("|")),
    assertion("dictionary review actions show four grades", ["Again", "Hard", "Good", "Easy"].every((label) => allProgressActions.includes(label)), allProgressActions.join("|")),
    assertion("dictionary frozen card has no progress row", frozenCard && (frozenCard.progressActions || []).length === 0, JSON.stringify(frozenCard || {})),
    assertion("dictionary translate action clicked", firstTranslate === "clicked", firstTranslate),
    assertion("dictionary translation renders inline overlays", afterReadyTranslation.dictionaryUi?.inlineTranslations >= 3, JSON.stringify(afterReadyTranslation.dictionaryUi)),
    assertion("dictionary translation does not render detached translation block", afterReadyTranslation.dictionaryUi?.translationBlocks === 0, JSON.stringify(afterReadyTranslation.dictionaryUi)),
    assertion("dictionary translation error action clicked", errorTranslate === "clicked", errorTranslate),
    assertion("dictionary translation error renders action error", /Card translation failed/i.test(afterErrorTranslation.dictionaryUi?.actionError || ""), afterErrorTranslation.dictionaryUi?.actionError || ""),
    assertion("dictionary review card present", Boolean(reviewCard), JSON.stringify(before.dictionaryUi?.cards || [])),
  ];
}

function assertGeneratedDraftCardUi() {
  setLocalStorageItem("afShadowingDictionaryMock", "generated");
  reloadTab();
  waitForSnapshot("4EE7m94mJpk", waitMs);
  pauseVideo();
  const clicked = clickFirstLookupWord();
  waitForDictionarySelection(clicked.word, waitMs);
  const noMatch = readGeometrySnapshot();
  clickShadowButton("[data-af-generated-draft]");
  const generated = waitForGeneratedDraftCard(waitMs);
  const generatedTranslate = clickDictionaryTranslate(0);
  sleep(700);
  const generatedTranslated = readGeometrySnapshot();

  return [
    assertion("generated lookup word clicked", clicked.clicked, clicked.detail),
    assertion("generated no-match state exposes generate action", noMatch.dictionaryUi?.generatedFallbackCardCount === 1, JSON.stringify(noMatch.dictionaryUi)),
    assertion("generated no-match state uses card-only wrapper", /is-card-only/.test(noMatch.dictionaryUi?.lookupState || ""), noMatch.dictionaryUi?.lookupState || ""),
    assertion("generated no-match state omits redundant no-match copy", !/no match|no dictionary match/i.test(`${noMatch.dictionaryUi?.lookupTitle || ""} ${noMatch.dictionaryUi?.lookupCopy || ""}`), JSON.stringify(noMatch.dictionaryUi)),
    assertion("generated draft renders as overlay card", generated.dictionaryUi?.overlayCardCount === 1, JSON.stringify(generated.dictionaryUi)),
    assertion("generated draft uses card-only lookup wrapper", /is-card-only/.test(generated.dictionaryUi?.lookupState || ""), generated.dictionaryUi?.lookupState || ""),
    assertion("generated draft card has generated action", (generated.dictionaryUi?.cards?.[0]?.progressActions || []).includes("Start Learning"), JSON.stringify(generated.dictionaryUi?.cards || [])),
    assertion("generated draft translation action clicked", generatedTranslate === "clicked", generatedTranslate),
    assertion("generated draft translation renders inline overlays", generatedTranslated.dictionaryUi?.inlineTranslations > 0, JSON.stringify(generatedTranslated.dictionaryUi)),
    assertion("generated draft removes bespoke fallback block", generated.dictionaryUi?.generatedFallbackCardCount === 0, JSON.stringify(generated.dictionaryUi)),
  ];
}

function waitForGeneratedDraftCard(timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readGeometrySnapshot();
    if (
      last.dictionaryUi?.overlayCardCount > 0 &&
      last.dictionaryUi?.generatedFallbackCardCount === 0
    ) {
      return last;
    }
    sleep(500);
  }

  return last || readGeometrySnapshot();
}

function assertGeometry(label, geometry, options) {
  const viewport = geometry.viewport;
  const rects = [geometry.ribbon, options.expectDictionary ? geometry.dictionary : null].filter(Boolean);
  const controls = geometry.controls || [];

  return [
    assertion(`${label}: viewport width set`, viewport.width <= 2200 && viewport.width >= 350, `${viewport.width}x${viewport.height}`),
    assertion(`${label}: ribbon present`, Boolean(geometry.ribbon), JSON.stringify(geometry.ribbon)),
    assertion(`${label}: dictionary presence`, Boolean(geometry.dictionary) === Boolean(options.expectDictionary), JSON.stringify(geometry.dictionary)),
    assertion(`${label}: panels within viewport`, rects.every((rect) => rectWithinViewport(rect, viewport)), JSON.stringify(rects)),
    assertion(`${label}: ribbon width sane`, geometry.ribbon?.width > 250 && geometry.ribbon?.width <= viewport.width - 20, JSON.stringify(geometry.ribbon)),
    assertion(`${label}: controls within ribbon`, controls.every((rect) => rectWithinParent(rect, geometry.ribbon)), JSON.stringify(controls)),
  ];
}

function assertInteractions(fixture) {
  const assertions = [];
  if (fixture.expect.checkReplay) {
    assertions.push(...assertReplayInteraction());
    assertions.push(...assertNextStaysOnTargetInteraction());
    assertions.push(...assertMarkIssueInteraction());
    assertions.push(...assertKeyboardNavigationInteraction());
    assertions.push(...assertWordReplayInteraction());
    assertions.push(...assertPhraseProgressRestoreInteraction(fixture));
    assertions.push(...assertPhraseJumpInteraction());
  }
  if (fixture.expect.checkOffOn) {
    assertions.push(...assertOffOnInteraction(fixture));
  }
  if (fixture.expect.checkSourceSwitch) {
    assertions.push(...assertSourceSwitchInteraction(fixture));
  }
  if (fixture.expect.checkLookup) {
    assertions.push(...assertLookupInteraction());
  }
  if (fixture.expect.expectNoDictionary) {
    const snapshot = readSnapshot();
    assertions.push(assertion("dictionary absent in empty state", snapshot.dictionary?.present === false));
  }
  return assertions;
}

function assertReplayInteraction() {
  const before = readSnapshot();
  const rowSeconds = parseTimestampSeconds(before.rowTime);
  clickShadowButton("[data-af-replay]");
  sleep(900);
  const after = readSnapshot();
  const currentTime = Number(after.video?.currentTime);
  const closeToPhrase = Number.isFinite(rowSeconds) &&
    Number.isFinite(currentTime) &&
    Math.abs(currentTime - rowSeconds) <= 3;

  return [
    assertion("replay enters guided mode", after.guidedMode === true, JSON.stringify({ mode: after.mode, guidedMode: after.guidedMode })),
    assertion("replay keeps visible phrase", Boolean(after.rowText), after.rowText),
    assertion("replay seeks near current phrase", closeToPhrase, `row=${before.rowTime}, video=${after.video?.currentTime}`),
  ];
}

function assertMarkIssueInteraction() {
  setLocalStorageItem("afShadowingIssueReportMock", "success");
  clickShadowButton("[data-af-mark-issue]");
  sleep(400);
  const opened = readSnapshot();
  fillIssueReportForm({
    category: "timing",
    description: "Smoke report: replay paused at the wrong place.",
    expected: "Replay should stay near the current phrase.",
    includeDiagnostics: true,
  });
  sleep(100);
  const filled = readSnapshot();
  clickShadowButton("[data-af-issue-submit]");
  sleep(700);
  const submitted = readSnapshot();
  setLocalStorageItem("afShadowingIssueReportMock", "error");
  fillIssueReportForm({
    category: "ui-layout",
    description: "Smoke report: fallback copy path.",
    expected: "",
    includeDiagnostics: false,
  });
  clickShadowButton("[data-af-issue-submit]");
  sleep(700);
  const failed = readSnapshot();
  clickShadowButton("[data-af-issue-copy]");
  sleep(300);
  const copied = readSnapshot();
  removeLocalStorageItem("afShadowingIssueReportMock");
  const report = submitted.debug?.lastIssueReport || failed.debug?.lastIssueReport || "";
  let parsed = null;
  try {
    parsed = JSON.parse(report);
  } catch (_error) {
    parsed = null;
  }
  return [
    assertion("mark issue opens report dialog", opened.issueDialog?.open === true, JSON.stringify(opened.issueDialog)),
    assertion("report dialog accepts category", filled.issueDialog?.category === "timing", JSON.stringify(filled.issueDialog)),
    assertion("report dialog accepts free text", /replay paused/i.test(filled.issueDialog?.description || ""), filled.issueDialog?.description || ""),
    assertion("report dialog keeps diagnostics consent", filled.issueDialog?.diagnosticsChecked === true, JSON.stringify(filled.issueDialog)),
    assertion("report dialog submits successfully", /af_report_smoke/.test(submitted.issueDialog?.status || ""), submitted.issueDialog?.status || ""),
    assertion("report dialog shows failed submit fallback", failed.issueDialog?.statusIsError === true && /mock_failure|failed|copy/i.test(failed.issueDialog?.status || ""), failed.issueDialog?.status || ""),
    assertion("report dialog copy fallback works", copied.issueDialog?.copyText === "Copied", copied.issueDialog?.copyText || ""),
    assertion("mark issue report captured", parsed?.kind === "audiofilms-youtube-navigation-issue", report.slice(0, 120)),
    assertion("mark issue includes current phrase", Boolean(parsed?.currentPhrase?.text), parsed?.currentPhrase?.text || ""),
    assertion("mark issue includes navigation events", Array.isArray(parsed?.navigationEvents) && parsed.navigationEvents.length > 0, String(parsed?.navigationEvents?.length || 0)),
  ];
}

function fillIssueReportForm({ category, description, expected, includeDiagnostics }) {
  chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const category = root?.querySelector("[data-af-issue-category]");
  const description = root?.querySelector("[data-af-issue-description]");
  const expected = root?.querySelector("[data-af-issue-expected]");
  const diagnostics = root?.querySelector("[data-af-issue-diagnostics]");
  if (category) {
    category.value = ${JSON.stringify(category)};
    category.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
  if (description) {
    description.value = ${JSON.stringify(description)};
    description.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  if (expected) {
    expected.value = ${JSON.stringify(expected)};
    expected.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  if (diagnostics) {
    diagnostics.checked = ${Boolean(includeDiagnostics)};
    diagnostics.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
  return "ok";
})()
  `);
}

function assertNextStaysOnTargetInteraction() {
  const before = readSnapshot();
  const beforeOrdinal = parseCountOrdinal(before.count);
  clickShadowButton("[data-af-next]");
  sleep(450);
  const afterEarly = readSnapshot();
  const earlyCurrentTime = Number(afterEarly.video?.currentTime);
  const earlyPhraseEnd = Number(afterEarly.currentPhraseTiming?.playbackEndSeconds);
  const waitForPhraseEndMs = Number.isFinite(earlyCurrentTime) && Number.isFinite(earlyPhraseEnd)
    ? Math.min(15000, Math.max(3800, Math.ceil((earlyPhraseEnd - earlyCurrentTime) * 1000) + 650))
    : 3800;
  sleep(waitForPhraseEndMs);
  const afterAutoPause = readSnapshot();
  const expectedOrdinal = beforeOrdinal ? beforeOrdinal + 1 : null;
  const pausedAt = Number(afterAutoPause.video?.currentTime);
  const phraseStart = Number(afterAutoPause.currentPhraseTiming?.startSeconds);
  const phraseEnd = Number(afterAutoPause.currentPhraseTiming?.playbackEndSeconds);
  const stayedNearEnd = Number.isFinite(pausedAt) &&
    Number.isFinite(phraseStart) &&
    Number.isFinite(phraseEnd) &&
    Math.abs(pausedAt - phraseEnd) < Math.abs(pausedAt - phraseStart);

  return [
    assertion("next advances from visible phrase", parseCountOrdinal(afterEarly.count) === expectedOrdinal, `${before.count} -> ${afterEarly.count}`),
    assertion("next does not roll back during guided playback", parseCountOrdinal(afterAutoPause.count) === expectedOrdinal, `${before.count} -> ${afterAutoPause.count}`),
    assertion("next leaves guided mode active", afterAutoPause.guidedMode === true, JSON.stringify({ mode: afterAutoPause.mode, guidedMode: afterAutoPause.guidedMode })),
    assertion("next auto-pause holds near phrase end", stayedNearEnd, JSON.stringify({ pausedAt, phraseStart, phraseEnd })),
  ];
}

function parseCountOrdinal(countText) {
  const match = String(countText || "").match(/^(\d+)\s*\/\s*\d+/);
  return match ? Number(match[1]) : null;
}

function nearlyEqual(actual, expected, tolerance) {
  return Number.isFinite(Number(actual)) && Math.abs(Number(actual) - expected) <= tolerance;
}

function replayAsrPhrase(ordinal) {
  jumpToPhraseOrdinal(ordinal);
  const selected = waitForCountOrdinal(ASR_EDGE_FIXTURE.videoId, ordinal, waitMs);
  pressKey("ArrowDown", "ArrowDown");
  const replayed = waitForSeekStarted(ordinal, 3000);
  return {
    snapshot: replayed.snapshot || selected,
    seek: replayed.seek,
  };
}

function jumpToPhraseOrdinal(ordinal) {
  clickShadowButton("[data-af-count]");
  setPhraseJumpInput(String(ordinal));
  clickPhraseJumpGo();
}

function waitForSeekStarted(ordinal, timeoutMs) {
  const started = Date.now();
  let last = null;
  let lastSeek = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    lastSeek = latestSeekStartedEvent(last, ordinal);
    if (lastSeek) {
      return { snapshot: last, seek: lastSeek };
    }
    sleep(250);
  }

  return { snapshot: last || readSnapshot(), seek: lastSeek };
}

function latestSeekStartedEvent(snapshot, ordinal) {
  const events = Array.isArray(snapshot?.debug?.navigationEvents)
    ? snapshot.debug.navigationEvents
    : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "seek-started" && event?.targetPhrase?.ordinal === ordinal) {
      return event;
    }
  }
  return null;
}

function assertKeyboardNavigationInteraction() {
  pressKey("Space", " ");
  sleep(350);
  const afterSpace = readSnapshot();
  pressKey("ArrowDown", "ArrowDown");
  sleep(900);
  const afterReplay = readSnapshot();
  const currentTime = Number(afterReplay.video?.currentTime);
  const phraseStart = Number(afterReplay.currentPhraseTiming?.startSeconds ?? parseTimestampSeconds(afterSpace.rowTime));
  const phraseEnd = Number(afterReplay.currentPhraseTiming?.playbackEndSeconds);
  const insidePhraseWindow = Number.isFinite(phraseStart) &&
    Number.isFinite(phraseEnd) &&
    Number.isFinite(currentTime) &&
    currentTime >= phraseStart - 0.25 &&
    currentTime <= phraseEnd + 0.5;

  return [
    assertion("space exits guided mode", afterSpace.guidedMode === false, JSON.stringify({ mode: afterSpace.mode, guidedMode: afterSpace.guidedMode })),
    assertion("arrow down replays current phrase", afterReplay.guidedMode === true, JSON.stringify({ mode: afterReplay.mode, guidedMode: afterReplay.guidedMode })),
    assertion("arrow down stays inside visible phrase", insidePhraseWindow, JSON.stringify({ phraseStart, phraseEnd, currentTime })),
  ];
}

function assertOffOnInteraction(fixture) {
  clickPageToggle();
  sleep(700);
  const offSnapshot = readSnapshot();
  clickPageToggle();
  const restored = waitForSnapshot(fixture.videoId, waitMs);

  return [
    assertion("AudioFilms Off removes panel", offSnapshot.panel === false),
    assertion("AudioFilms Off updates toggle", offSnapshot.toggleText === "AudioFilms Off", offSnapshot.toggleText),
    assertion("AudioFilms On restores panel", restored.panel === true),
    assertion("AudioFilms On restores expected state", restored.isEmpty === fixture.expect.empty, restored.isEmpty ? "empty" : "phrases"),
  ];
}

function assertSourceSwitchInteraction(fixture) {
  const menu = openSourceMenu();
  const assertions = [
    assertion("source menu has multiple options", menu.options.length > 1, menu.options.join(" | ")),
    assertion("source menu has caption option", menu.options.some((option) => !/auto/i.test(option)), menu.options.join(" | ")),
    assertion("source menu has auto option", menu.options.some((option) => /auto/i.test(option)), menu.options.join(" | ")),
  ];

  if (!assertions.every((item) => item.ok)) return assertions;

  const autoClick = clickSourceOption("auto");
  assertions.push(assertion("auto source option clicked", autoClick.clicked, autoClick.detail));
  const autoSnapshot = waitForSource(/auto/i, fixture.videoId, waitMs);
  const autoLoaded = /auto/i.test(autoSnapshot.source || "");
  const keptWorkingSource = /(?:Dutch|English) captions/i.test(autoSnapshot.source || "") &&
    !autoSnapshot.isEmpty &&
    /\d+ \/ \d+/.test(autoSnapshot.count || "");
  assertions.push(assertion("auto source loaded or working source kept", autoLoaded || keptWorkingSource, `${autoSnapshot.source} ${autoSnapshot.count}`));
  assertions.push(assertion("auto switch leaves usable phrases", !autoSnapshot.isEmpty && /\d+ \/ \d+/.test(autoSnapshot.count || ""), autoSnapshot.count));
  assertions.push(assertion("auto switch has no visible global error", !(autoSnapshot.error || "").trim(), autoSnapshot.error));

  const manualMenu = openSourceMenu();
  assertions.push(assertion("manual source menu reopened", manualMenu.options.length > 1, manualMenu.options.join(" | ")));
  const manualClick = clickSourceOption("manual");
  assertions.push(assertion("manual source option clicked", manualClick.clicked, manualClick.detail));
  const manualSnapshot = waitForSource(/(?:Dutch|English) captions/i, fixture.videoId, waitMs);
  assertions.push(assertion("caption source restored", /(?:Dutch|English) captions/i.test(manualSnapshot.source || ""), manualSnapshot.source));
  assertions.push(assertion("manual source restored expected count", fixture.expect.countPattern.test(manualSnapshot.count || ""), manualSnapshot.count));
  assertions.push(assertion("manual source has no visible error", !(manualSnapshot.error || "").trim(), manualSnapshot.error));

  return assertions;
}

function assertLookupInteraction() {
  const clicked = clickFirstLookupWord();
  const after = waitForDictionarySelection(clicked.word, waitMs);
  const selectedWord = after.dictionary?.word || "";
  const selectedWordNormalized = selectedWord.toLocaleLowerCase();
  const clickedWordNormalized = (clicked.word || "").toLocaleLowerCase();

  return [
    assertion("lookup word clicked", clicked.clicked, clicked.detail),
    assertion("dictionary panel opened", after.dictionary?.present === true),
    assertion("dictionary selected clicked word", selectedWordNormalized === clickedWordNormalized, `${selectedWord} vs ${clicked.word}`),
    assertion("dictionary lookup completed", after.dictionary?.loading === false, after.dictionary?.subtitle || ""),
    assertion("dictionary renders lookup surface", after.dictionary?.cardCount > 0 || Boolean(after.dictionary?.lookupTitle || after.dictionary?.lookupCopy), JSON.stringify(after.dictionary)),
    assertion("lookup leaves phrase row rendered", Boolean(after.rowText), after.rowText),
  ];
}

function assertWordReplayInteraction() {
  const before = readSnapshot();
  const shiftClick = clickFirstLookupWord({ shiftKey: true });
  const afterShift = waitForReplaySnapshot("from-word", 2000);
  const shiftReplay = afterShift.debug?.lastWordReplay || {};
  const timing = afterShift.currentPhraseTiming || before.currentPhraseTiming || {};
  const shiftSeek = Number(shiftReplay.seekToSec);
  const shiftPause = Number(shiftReplay.expectedPauseAtSec);

  const ctrlClick = clickFirstLookupWord({ ctrlKey: true });
  const afterCtrl = waitForReplaySnapshot("word", 2000);
  const ctrlReplay = afterCtrl.debug?.lastWordReplay || {};

  return [
    assertion("shift word replay clicked", shiftClick.clicked === true, shiftClick.detail),
    assertion("shift word replay does not select dictionary word", !wordsMatch(afterShift.dictionary?.word, shiftClick.word), JSON.stringify(afterShift.dictionary)),
    assertion("shift word replay uses estimated or exact timing", shiftReplay.ok === true && /estimate|word|asr|alignment/.test(shiftReplay.timingSource || ""), JSON.stringify(shiftReplay)),
    assertion("shift word replay seek stays in current phrase", Number.isFinite(shiftSeek) && shiftSeek >= timing.startSeconds && shiftSeek <= timing.playbackEndSeconds, JSON.stringify({ timing, shiftReplay })),
    assertion("shift word replay plays to phrase playback end", Number.isFinite(shiftPause) && Math.abs(shiftPause - timing.playbackEndSeconds) <= 0.15, JSON.stringify({ timing, shiftReplay })),
    assertion("ctrl word replay clicked", ctrlClick.clicked === true, ctrlClick.detail),
    assertion("ctrl word replay does not select dictionary word", !wordsMatch(afterCtrl.dictionary?.word, ctrlClick.word), JSON.stringify(afterCtrl.dictionary)),
    assertion("ctrl word replay handles missing exact timing honestly", ctrlReplay.ok === false && ctrlReplay.reason === "word-timing-unavailable", JSON.stringify(ctrlReplay)),
    assertion("word replay keeps current phrase selected", afterCtrl.count === before.count, `${before.count} -> ${afterCtrl.count}`),
  ];
}

function assertPhraseProgressRestoreInteraction(fixture) {
  const before = readSnapshot();
  const beforeOrdinal = parseCountOrdinal(before.count);
  clickShadowButton("[data-af-next]");
  const saved = waitForSnapshot(fixture.videoId, waitMs);
  const savedOrdinal = parseCountOrdinal(saved.count);
  sleep(1800);
  setVideoCurrentTime(0);
  reloadTab();
  waitForSnapshot(fixture.videoId, waitMs);
  const restored = waitForCountOrdinal(fixture.videoId, savedOrdinal, waitMs);
  const restore = restored.debug?.phraseProgressRestore || {};
  const restoredOrdinal = parseCountOrdinal(restored.count);

  return [
    assertion("phrase progress moved to a later phrase", beforeOrdinal && savedOrdinal === beforeOrdinal + 1, `${before.count} -> ${saved.count}`),
    assertion("phrase progress restores visible count after reload", restoredOrdinal === savedOrdinal, `${saved.count} -> ${restored.count}; restore=${JSON.stringify(restore)}`),
    assertion("phrase progress restore recorded source-specific state", Boolean(restore.sourceId) && ["phrase-id", "clamped-index"].includes(restore.reason || ""), JSON.stringify(restore)),
  ];
}

function waitForCountOrdinal(videoId, ordinal, timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    const videoMatches = last.bootState?.videoIdDetected === videoId || last.debug?.videoId === videoId;
    if (last.panel && videoMatches && !last.loading && parseCountOrdinal(last.count) === ordinal) {
      return last;
    }
    sleep(500);
  }

  return last || readSnapshot();
}

function assertPhraseJumpInteraction() {
  const targetOrdinal = 3;
  clickShadowButton("[data-af-count]");
  const opened = readPhraseJumpState();
  const modeBeforeNumericTyping = readSnapshot().practiceMode;
  const typedNumeric = typePhraseJumpKeys([
    ["Digit1", "1"],
    ["Digit0", "0"],
    ["Digit2", "2"],
  ]);
  const afterNumericTyping = readSnapshot();
  clickPhraseJumpStart();
  sleep(500);
  const afterStart = readSnapshot();

  clickShadowButton("[data-af-count]");
  setPhraseJumpInput("0");
  clickPhraseJumpGo();
  const invalid = readPhraseJumpState();

  setPhraseJumpInput(String(targetOrdinal));
  clickPhraseJumpGo();
  sleep(500);
  const afterGo = readSnapshot();
  const goCurrentTime = Number(afterGo.video?.currentTime);
  const goStart = Number(afterGo.currentPhraseTiming?.startSeconds);

  return [
    assertion("phrase jump popover opens", opened.open === true, JSON.stringify(opened)),
    assertion("phrase jump accepts 0/1/2 key input", typedNumeric.input === "102" && typedNumeric.prevented === false, JSON.stringify(typedNumeric)),
    assertion("phrase jump numeric keys do not switch mode", afterNumericTyping.practiceMode === modeBeforeNumericTyping, `${modeBeforeNumericTyping} -> ${afterNumericTyping.practiceMode}`),
    assertion("phrase jump start selects first phrase", parseCountOrdinal(afterStart.count) === 1, afterStart.count),
    assertion("phrase jump start pauses video", afterStart.video?.paused === true, JSON.stringify(afterStart.video)),
    assertion("phrase jump rejects invalid zero", invalid.open === true && /1-/.test(invalid.error || ""), JSON.stringify(invalid)),
    assertion("phrase jump number selects requested phrase", parseCountOrdinal(afterGo.count) === targetOrdinal, afterGo.count),
    assertion("phrase jump number pauses video", afterGo.video?.paused === true, JSON.stringify(afterGo.video)),
    assertion("phrase jump number seeks to phrase start", Number.isFinite(goCurrentTime) && Number.isFinite(goStart) && Math.abs(goCurrentTime - goStart) <= 0.5, JSON.stringify({ goCurrentTime, goStart })),
  ];
}

function wordsMatch(left, right) {
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase();
  return Boolean(normalize(left)) && normalize(left) === normalize(right);
}

function checkBackend() {
  const url = "http://localhost:3000/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual";
  try {
    const raw = execFileSync("curl", ["-fsS", "-m", "8", url], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const json = JSON.parse(raw);
    const phrases = json.phrases?.length || 0;
    if (phrases < 1 || json.meta?.sourceKind !== "manual") {
      fail(`Backend preflight returned unexpected subtitle metadata: ${JSON.stringify({
        phrases,
        sourceKind: json.meta?.sourceKind,
        retrievalPath: json.meta?.retrievalPath,
      })}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      `Local backend preflight failed. Start the AudioFilms app on http://localhost:3000 or omit --local-backend-check for browser-only diagnostics. ${message}`,
    );
  }
}

function assertFixture(fixture, snapshot) {
  const assertions = [];
  const expect = fixture.expect;
  const debug = snapshot.debug || {};
  const boot = snapshot.bootState || {};

  assertions.push(assertion("panel present", snapshot.panel === true));
  assertions.push(assertion("boot marker present", snapshot.boot === "1"));
  assertions.push(assertion("video id detected", boot.videoIdDetected === fixture.videoId || debug.videoId === fixture.videoId));
  assertions.push(assertion("caption track count", Number(boot.captionTracksCount || 0) >= expect.minTracks));
  assertions.push(assertion("empty state", snapshot.isEmpty === expect.empty));
  assertions.push(assertion("count", expect.countPattern.test(snapshot.count || ""), snapshot.count));

  for (const part of expect.sourceIncludes || []) {
    assertions.push(assertion(sourceExpectationLabel(part), sourceMatchesExpectation(snapshot.source || "", part), snapshot.source));
  }

  if (expect.retrievalPath) {
    const actualRetrievalPath = boot.selectedRetrievalPath || debug.transcriptResult?.retrievalPath || "";
    if (shouldStrictProvenance) {
      assertions.push(
        assertion(
          `retrieval path ${expect.retrievalPath}`,
          actualRetrievalPath === expect.retrievalPath,
          actualRetrievalPath,
        ),
      );
    } else if (!expect.empty) {
      assertions.push(assertion("retrieval path recorded", Boolean(actualRetrievalPath), actualRetrievalPath));
    }
  }

  if (expect.errorIncludes) {
    assertions.push(assertion("expected error", (snapshot.error || "").includes(expect.errorIncludes), snapshot.error));
  } else {
    assertions.push(assertion("no visible error", !(snapshot.error || "").trim(), snapshot.error));
  }

  for (const label of expect.hiddenControls || []) {
    const aliases = label === "Replay" ? ["Replay", "Repeat"] : [label];
    const control = snapshot.controls.find((item) => aliases.some((alias) => item.text.startsWith(alias)));
    assertions.push(assertion(`${label} hidden`, control?.display === "none", JSON.stringify(control)));
  }

  if (!expect.empty) {
    assertions.push(assertion("phrase row rendered", Boolean(snapshot.rowText), snapshot.rowText));
  }

  return assertions;
}

function sourceMatchesExpectation(source, expectedPart) {
  if (expectedPart === "Ready") {
    return /\b(?:Ready|Rough|Precise)\b/i.test(source);
  }
  return source.includes(expectedPart);
}

function sourceExpectationLabel(expectedPart) {
  return expectedPart === "Ready" ? "source has usable readiness" : `source includes ${expectedPart}`;
}

function waitForSnapshot(videoId, timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    if (last.panel && last.boot === "1" && (last.bootState?.videoIdDetected === videoId || last.debug?.videoId === videoId)) {
      const stableEnough = last.loading === false && (last.count || last.error || last.rowText);
      if (stableEnough) return last;
    }
    sleep(750);
  }

  return last || readSnapshot();
}

function waitForSource(sourcePattern, videoId, timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    const videoMatches = last.bootState?.videoIdDetected === videoId || last.debug?.videoId === videoId;
    if (last.panel && videoMatches && !last.loading && sourcePattern.test(last.source || "")) {
      return last;
    }
    sleep(750);
  }

  return last || readSnapshot();
}

function waitForStableSourceText(sourcePattern, videoId, timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    const videoMatches = last.bootState?.videoIdDetected === videoId || last.debug?.videoId === videoId;
    if (last.panel && videoMatches && !last.loading && sourcePattern.test(last.source || "") && last.rowText) {
      return last;
    }
    sleep(750);
  }

  return last || readSnapshot();
}

function waitForDictionary(timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    if (last.dictionary?.present) return last;
    sleep(500);
  }

  return last || readSnapshot();
}

function waitForDictionarySelection(word, timeoutMs) {
  const started = Date.now();
  let last = null;
  const expected = String(word || "").toLocaleLowerCase();

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    const selected = String(last.dictionary?.word || "").toLocaleLowerCase();
    if (
      last.dictionary?.present &&
      selected === expected &&
      last.dictionary?.loading === false
    ) {
      return last;
    }
    sleep(500);
  }

  return last || readSnapshot();
}

function waitForGeometryDictionaryCards(timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readGeometrySnapshot();
    if (last.dictionaryUi?.spanTranslationPresent && last.dictionaryUi?.overlayCardCount > 0) {
      return last;
    }
    sleep(500);
  }

  return last || readGeometrySnapshot();
}

function waitForDictionaryUiReady(timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readGeometrySnapshot();
    if (last.dictionaryUi?.overlayCardCount > 0) {
      return last;
    }
    sleep(500);
  }

  return last || readGeometrySnapshot();
}

function waitForReplaySnapshot(mode, timeoutMs) {
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    last = readSnapshot();
    if (last.debug?.lastWordReplay?.mode === mode) return last;
    sleep(250);
  }

  return last || readSnapshot();
}

function readSnapshot() {
  const raw = chromeEval(`
(() => {
  const parseJson = (value) => {
    try { return JSON.parse(value || "{}"); } catch (_) { return {}; }
  };
  const host = document.querySelector("#audiofilms-root");
  const root = host && host.shadowRoot;
  const panel = root && root.querySelector("#af-shadowing-ribbon-panel");
  if (!panel) {
    return JSON.stringify({
      panel: false,
      boot: document.documentElement.dataset.afShadowingBoot || "",
      bootState: parseJson(document.documentElement.dataset.afShadowingBootState),
      toggleText: document.querySelector("#af-shadowing-toggle")?.textContent || "",
    });
  }

  const debugToggle = root.querySelector("[data-af-debug-toggle]");
  const debugPre = root.querySelector("[data-af-debug]");
  if (debugToggle && debugPre && !debugPre.textContent.trim()) {
    debugToggle.click();
  }

  const debug = parseJson(debugPre && debugPre.textContent);
  const currentRow = root.querySelector(".af-ribbon-row.is-current");
  const currentPhraseTiming = currentRow ? {
    startSeconds: Number((Number(currentRow.dataset.afPhraseStartMs) / 1000).toFixed(3)),
    endSeconds: Number((Number(currentRow.dataset.afPhraseEndMs) / 1000).toFixed(3)),
    playbackEndSeconds: Number((Number(currentRow.dataset.afPhrasePlaybackEndMs) / 1000).toFixed(3)),
  } : null;
  return JSON.stringify({
    panel: true,
    boot: document.documentElement.dataset.afShadowingBoot || "",
    url: window.location.href,
    bootVersion: document.documentElement.dataset.afShadowingBootVersion || "",
    bootState: parseJson(document.documentElement.dataset.afShadowingBootState),
    isEmpty: panel.classList.contains("is-empty"),
    loading: (root.querySelector("[data-af-count]")?.textContent || "") === "Loading",
    source: root.querySelector("[data-af-source-toggle]")?.textContent || "",
    count: root.querySelector("[data-af-count]")?.textContent || "",
    mode: root.querySelector("[data-af-mode]")?.textContent || "",
    guidedMode: root.querySelector("[data-af-mode]")?.classList.contains("is-guided") || false,
    practiceMode: root.querySelector("[data-af-mode-recall]")?.getAttribute("aria-pressed") === "true" ? "recall" : "shadow",
    message: root.querySelector(".af-ribbon-message")?.textContent || "",
    error: root.querySelector("[data-af-error]")?.textContent || "",
    rowTime: root.querySelector(".af-ribbon-row.is-current .af-ribbon-time")?.textContent || "",
    rowText: root.querySelector(".af-ribbon-row.is-current .af-ribbon-text")?.textContent || "",
    currentPhraseTiming,
    dictionary: (() => {
      const dictionary = root.querySelector("#af-shadowing-dictionary-panel");
      if (!dictionary) return { present: false };
      return {
        present: true,
        word: dictionary.querySelector("[data-af-dictionary-title]")?.textContent ||
          dictionary.querySelector(".af-word-title")?.textContent || "",
        context: dictionary.querySelector(".af-context-text")?.textContent || "",
        subtitle: dictionary.querySelector("[data-af-dictionary-subtitle]")?.textContent || "",
        loading: /Looking up/i.test(dictionary.querySelector("[data-af-dictionary-subtitle]")?.textContent || ""),
        lookupTitle: dictionary.querySelector(".af-lookup-placeholder-title")?.textContent || "",
        lookupCopy: dictionary.querySelector(".af-lookup-placeholder .af-dictionary-copy")?.textContent || "",
        cardCount: dictionary.querySelectorAll(".af-overlay-card").length,
      };
    })(),
    toggleText: document.querySelector("#af-shadowing-toggle")?.textContent || "",
    video: (() => {
      const video = document.querySelector("video");
      if (!video) return null;
      return {
        currentTime: Number(video.currentTime.toFixed(3)),
        paused: video.paused,
        duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : null,
      };
    })(),
    debug,
    issueDialog: (() => {
      const dialog = root.querySelector("[data-af-issue-dialog]");
      return {
        open: Boolean(dialog && !dialog.hidden),
        category: root.querySelector("[data-af-issue-category]")?.value || "",
        description: root.querySelector("[data-af-issue-description]")?.value || "",
        expected: root.querySelector("[data-af-issue-expected]")?.value || "",
        diagnosticsChecked: root.querySelector("[data-af-issue-diagnostics]")?.checked || false,
        status: root.querySelector("[data-af-issue-status]")?.textContent || "",
        statusIsError: root.querySelector("[data-af-issue-status]")?.classList.contains("is-error") || false,
        submitDisabled: root.querySelector("[data-af-issue-submit]")?.disabled || false,
        copyText: root.querySelector("[data-af-issue-copy]")?.textContent || "",
      };
    })(),
    controls: Array.from(root.querySelectorAll(".af-ribbon-controls button")).map((button) => ({
      text: button.textContent || "",
      display: getComputedStyle(button).display,
      disabled: button.disabled,
    })),
  });
})()
  `);
  return JSON.parse(raw);
}

function readGeometrySnapshot() {
  const raw = chromeEval(`
(() => {
  const host = document.querySelector("#audiofilms-root");
  const root = host && host.shadowRoot;
  const toRect = (node) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };
  const ribbon = root?.querySelector("#af-shadowing-ribbon-panel");
  const dictionary = root?.querySelector("#af-shadowing-dictionary-panel");
  return JSON.stringify({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    source: root?.querySelector("[data-af-source-toggle]")?.textContent || "",
    readinessChip: (() => {
      const chip = root?.querySelector("[data-af-source-toggle]");
      return {
        label: chip?.textContent || "",
        state: chip?.dataset.afReadiness || "",
        hasDot: Boolean(chip?.querySelector(".af-source-status-dot")),
      };
    })(),
    count: root?.querySelector("[data-af-count]")?.textContent || "",
    practiceMode: root?.querySelector("[data-af-mode-recall]")?.getAttribute("aria-pressed") === "true" ? "recall" : "shadow",
    phraseTranslation: (() => {
      const lane = root?.querySelector(".af-ribbon-row.is-current .af-phrase-translation");
      const originalMask = root?.querySelector(".af-ribbon-row.is-current .af-ribbon-mask");
      const originalButton = root?.querySelector("[data-af-toggle]");
      const translationButton = root?.querySelector("[data-af-phrase-translation]");
      return {
        originalButtonText: originalButton?.textContent || "",
        originalButtonTitle: originalButton?.getAttribute("title") || "",
        originalSticky: Boolean(originalButton?.classList.contains("is-sticky")),
        originalMasked: Boolean(originalMask),
        buttonText: translationButton?.textContent || "",
        buttonTitle: translationButton?.getAttribute("title") || "",
        sticky: Boolean(translationButton?.classList.contains("is-sticky")),
        prompt: root?.querySelector(".af-ribbon-row.is-current .af-recall-prompt")?.textContent || "",
        lane: lane?.textContent || "",
        visible: Boolean(lane && lane.getAttribute("aria-hidden") !== "true" && getComputedStyle(lane).visibility !== "hidden"),
      };
    })(),
    debugTools: (() => {
      const trigger = root?.querySelector("[data-af-utility-toggle]");
      const menu = root?.querySelector("[data-af-utility-menu]");
      return {
        label: trigger?.getAttribute("aria-label") || "",
        open: menu?.classList.contains("is-open") || false,
        actions: Array.from(menu?.querySelectorAll("button") || []).map((button) => button.textContent.trim()),
      };
    })(),
    settingsTools: (() => {
      const trigger = root?.querySelector("[data-af-settings-toggle]");
      const menu = root?.querySelector("[data-af-settings-menu]");
      return {
        label: trigger?.getAttribute("aria-label") || "",
        open: menu?.classList.contains("is-open") || false,
        actions: Array.from(menu?.querySelectorAll("button") || []).map((button) => button.textContent.trim()),
      };
    })(),
    playbackSpeed: (() => {
      const video = document.querySelector("video");
      return {
        label: root?.querySelector("[data-af-speed-label]")?.textContent || "",
        videoRate: Number(video?.playbackRate || 0),
        slowReplayLabel: root?.querySelector("[data-af-slow-replay-speed]")?.textContent || "",
        activeSlowReplay: Boolean(window.__afShadowingDebug?.activePlayback?.slowReplay),
      };
    })(),
    primaryUi: (() => {
      const text = [
        root?.querySelector("[data-af-source-toggle]")?.textContent || "",
        root?.querySelector("[data-af-count]")?.textContent || "",
        root?.querySelector("[data-af-mode]")?.textContent || "",
        root?.querySelector(".af-ribbon-controls")?.textContent || "",
      ].join(" ");
      const lower = text.toLowerCase();
      return {
        text,
        hasTechnicalTerms: ["manual", "exact", "timedtext", "yt-dlp", "provider"].some((term) => lower.includes(term)),
        phraseButtons: root?.querySelectorAll(".af-practice-controls .af-phrase-icon-button").length || 0,
        spanSelectedWords: root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-selected").length || 0,
        spanDraftWords: root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length || 0,
      };
    })(),
    controlHierarchy: (() => {
      const controls = root?.querySelector(".af-ribbon-controls");
      const mode = root?.querySelector(".af-mode-controls");
      const practice = root?.querySelector(".af-practice-controls");
      const display = root?.querySelector(".af-display-controls");
      const controlsRect = controls?.getBoundingClientRect();
      const practiceRect = practice?.getBoundingClientRect();
      const modeRect = mode?.getBoundingClientRect();
      const displayRect = display?.getBoundingClientRect();
      const controlsCenter = controlsRect ? controlsRect.left + controlsRect.width / 2 : 0;
      const practiceCenter = practiceRect ? practiceRect.left + practiceRect.width / 2 : 0;
      return {
        shortcutRowPresent: Boolean(root?.querySelector(".af-shortcut-hints")),
        shortcutHelpOpen: Boolean(root?.querySelector("[data-af-shortcut-help-panel]") && !root.querySelector("[data-af-shortcut-help-panel]").hidden),
        modeText: mode?.textContent || "",
        practiceText: practice?.textContent || "",
        displayText: display?.textContent || "",
        displayLabels: Array.from(display?.querySelectorAll("button") || []).map((button) => button.getAttribute("aria-label") || button.textContent || ""),
        modeWidth: modeRect?.width || 0,
        practiceWidth: practiceRect?.width || 0,
        displayWidth: displayRect?.width || 0,
        displayLeft: displayRect?.left || 0,
        practiceRight: practiceRect?.right || 0,
        practiceCenterOffset: Math.abs(practiceCenter - controlsCenter),
      };
    })(),
    readinessMenu: (() => {
      const improve = root?.querySelector("[data-af-readiness-improve-timing]");
      return {
        open: Boolean(root?.querySelector("[data-af-source-menu]") && getComputedStyle(root.querySelector("[data-af-source-menu]")).display !== "none"),
        improveText: improve?.textContent || "",
        improveTitle: improve?.getAttribute("title") || "",
        improveDisabled: improve?.disabled ?? null,
        actions: Array.from(root?.querySelectorAll(".af-readiness-actions button") || []).map((button) => button.textContent.trim()),
        timingStatus: root?.querySelector("[data-af-timing-operation-status]")?.dataset.afTimingOperationStatus || "",
        timingStatusCopy: root?.querySelector("[data-af-timing-operation-status]")?.textContent || "",
      };
    })(),
    error: root?.querySelector("[data-af-error]")?.textContent || "",
    ribbon: toRect(ribbon),
    ribbonUi: (() => ({
      accountLabel: ribbon?.querySelector("[data-af-account]")?.textContent || "",
      accountAriaLabel: ribbon?.querySelector("[data-af-account]")?.getAttribute("aria-label") || "",
      accountMenuOpen: ribbon?.querySelector("[data-af-account-menu]")?.classList.contains("is-open") || false,
      accountAction: ribbon?.querySelector("[data-af-account-menu] [data-af-account-action]")?.textContent || "",
      modeText: ribbon?.querySelector("[data-af-mode]")?.textContent || "",
      themeRight: ribbon?.querySelector("[data-af-theme-toggle]")?.getBoundingClientRect().right || 0,
      settingsRight: ribbon?.querySelector("[data-af-settings-toggle]")?.getBoundingClientRect().right || 0,
      debugRight: ribbon?.querySelector("[data-af-utility-toggle]")?.getBoundingClientRect().right || 0,
      accountRight: ribbon?.querySelector("[data-af-account]")?.getBoundingClientRect().right || 0,
    }))(),
    dictionary: toRect(dictionary),
    dictionaryUi: (() => {
      if (!dictionary) return { present: false };
      const text = dictionary.textContent || "";
      return {
        present: true,
        accountPresent: Boolean(dictionary.querySelector("[data-af-account]")),
        hasSelectedCard: Boolean(dictionary.querySelector(".af-dictionary-card-selected")),
        hasContext: Boolean(dictionary.querySelector(".af-context-text")?.textContent?.trim()),
        lookupState: dictionary.querySelector(".af-lookup-placeholder")?.className || "",
        overlayCardCount: dictionary.querySelectorAll(".af-overlay-card").length,
        generatedFallbackCardCount: dictionary.querySelectorAll(".af-generated-fallback-card").length,
        cards: Array.from(dictionary.querySelectorAll(".af-overlay-card")).map((card) => ({
          title: card.querySelector(".af-overlay-card-title")?.textContent || "",
          chips: card.querySelectorAll(".af-chip").length,
          progressActions: Array.from(card.querySelectorAll(".af-review-actions button")).map((button) => button.textContent.trim()),
          translateActions: Array.from(card.querySelectorAll(".af-card-translate")).map((button) => button.textContent.trim()),
        })),
        searchHeadingPresent: Boolean(dictionary.querySelector(".af-dictionary-search-heading")),
        searchGroupTitles: Array.from(dictionary.querySelectorAll(".af-dictionary-search-group-title")).map((title) => title.textContent.trim()),
        searchItemCount: dictionary.querySelectorAll(".af-dictionary-search-item").length,
        searchItemTextWidths: Array.from(dictionary.querySelectorAll(".af-dictionary-search-item-text")).map((item) => Math.round(item.getBoundingClientRect().width)),
        searchItemTextSamples: Array.from(dictionary.querySelectorAll(".af-dictionary-search-item-text")).slice(0, 3).map((item) => item.textContent.trim()),
        translationBlocks: dictionary.querySelectorAll(".af-card-translation").length,
        inlineTranslations: dictionary.querySelectorAll(".af-inline-translation").length,
        inlineTranslationStyles: Array.from(dictionary.querySelectorAll(".af-inline-translation")).slice(0, 4).map((item) => {
          const style = getComputedStyle(item);
          return {
            color: style.color,
            fontSize: style.fontSize,
            fontStyle: style.fontStyle,
            fontWeight: style.fontWeight,
          };
        }),
        actionStatus: dictionary.querySelector(".af-card-action-status")?.textContent || "",
        actionError: dictionary.querySelector(".af-source-option-error")?.textContent || "",
        spanTranslationPresent: Boolean(dictionary.querySelector(".af-span-translation-card")),
        hasSpanContext: Boolean(dictionary.querySelector(".af-span-source")?.textContent?.trim()),
        spanWordCount: dictionary.querySelectorAll(".af-span-word").length,
        spanTitle: dictionary.querySelector(".af-span-translation-card .af-dictionary-card-title")?.textContent || "",
        spanText: dictionary.querySelector(".af-span-translation-text")?.textContent || "",
        hasRawHtml: /<!doctype|<html/i.test(text),
      };
    })(),
    controls: Array.from(root?.querySelectorAll(".af-ribbon-controls button") || [])
      .filter((button) => getComputedStyle(button).display !== "none")
      .map(toRect),
  });
})()
  `);
  return JSON.parse(raw);
}

function clickShadowButton(selector) {
  const result = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const button = root?.querySelector(${JSON.stringify(selector)});
  if (!button) return "not-found";
  button.click();
  return "clicked";
})()
  `);
  if (result !== "clicked") {
    fail(`Could not click shadow button ${selector}: ${result}`);
  }
}

function setVideoPlaybackRate(rate) {
  chromeEval(`
(() => {
  const video = document.querySelector("video");
  if (!video) return;
  video.playbackRate = ${Number(rate)};
  video.dispatchEvent(new Event("ratechange", { bubbles: true }));
})()
  `);
}

function forceActivePlaybackEnd() {
  chromeEval(`
(() => {
  const video = document.querySelector("video");
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const row = root?.querySelector(".af-ribbon-row.is-current");
  const endMs = Number(row?.dataset.afPhrasePlaybackEndMs || 0);
  if (!video || !Number.isFinite(endMs) || endMs <= 0) return;
  video.currentTime = Math.max(video.currentTime, endMs / 1000 + 0.08);
})()
  `);
}

function pressKey(code, key, options = {}) {
  chromeEval(`
(() => {
  const eventInit = {
    key: ${JSON.stringify(key)},
    code: ${JSON.stringify(code)},
    shiftKey: ${Boolean(options.shiftKey)},
    ctrlKey: ${Boolean(options.ctrlKey)},
    metaKey: ${Boolean(options.metaKey)},
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  document.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  return "pressed";
})()
  `);
}

function clickOutsideShadowUi() {
  chromeEval(`
(() => {
  const target = document.elementFromPoint(20, 20) || document.body || document.documentElement;
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: 20,
      clientY: 20,
    }));
  }
  return "clicked";
})()
  `);
}

function pauseVideo() {
  chromeEval(`
(() => {
  const video = document.querySelector("video");
  if (video && typeof video.pause === "function") {
    video.pause();
  }
  return "ok";
})()
  `);
}

function playVideo() {
  chromeEval(`
(() => {
  const video = document.querySelector("video");
  if (video && typeof video.play === "function") {
    video.muted = true;
    video.play().catch(() => {});
  }
  return "ok";
})()
  `);
}

function setVideoCurrentTime(seconds) {
  chromeEval(`
(() => {
  const video = document.querySelector("video");
  if (!video) return "";
  video.pause();
  video.currentTime = ${Number(seconds) || 0};
  return String(video.currentTime);
})()
  `);
}

function readPhraseJumpState() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const menu = root?.querySelector("[data-af-jump-menu]");
  return JSON.stringify({
    open: menu?.classList.contains("is-open") || false,
    input: root?.querySelector("[data-af-jump-input]")?.value || "",
    error: root?.querySelector("[data-af-jump-error]")?.textContent || "",
  });
})()
  `);
  return JSON.parse(raw);
}

function setPhraseJumpInput(value) {
  const rawValue = JSON.stringify(String(value));
  chromeEval(`
(() => {
  const input = document.querySelector("#audiofilms-root")?.shadowRoot?.querySelector("[data-af-jump-input]");
  if (!input) return "";
  input.value = ${rawValue};
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  return input.value;
})()
  `);
}

function typePhraseJumpKeys(entries) {
  const serializedEntries = JSON.stringify(entries);
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const input = root?.querySelector("[data-af-jump-input]");
  if (!input) return JSON.stringify({ input: "", prevented: true, missing: true });
  input.value = "";
  input.focus();
  let prevented = false;
  for (const [code, key] of ${serializedEntries}) {
    const eventInit = { key, code, bubbles: true, cancelable: true, composed: true };
    const keydown = new KeyboardEvent("keydown", eventInit);
    const accepted = input.dispatchEvent(keydown);
    if (!accepted || keydown.defaultPrevented) {
      prevented = true;
    } else {
      input.value += key;
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }
    input.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  }
  return JSON.stringify({ input: input.value, prevented });
})()
  `);
  return JSON.parse(raw);
}

function clickPhraseJumpStart() {
  clickShadowButton("[data-af-jump-start]");
}

function clickPhraseJumpGo() {
  clickShadowButton("[data-af-jump-go]");
}

function clickFirstLookupWord(options = {}) {
  const eventOptions = JSON.stringify({
    shiftKey: Boolean(options.shiftKey),
    ctrlKey: Boolean(options.ctrlKey),
    metaKey: Boolean(options.metaKey),
  });
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || []);
  const word = words.find((candidate) => (candidate.dataset.afLookupWord || "").length > 1) || words[0];
  if (!word) {
    return JSON.stringify({ clicked: false, word: "", detail: "no-word-button" });
  }
  const value = word.dataset.afLookupWord || word.textContent || "";
  const options = ${eventOptions};
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    word.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      shiftKey: options.shiftKey,
      ctrlKey: options.ctrlKey,
      metaKey: options.metaKey,
    }));
  }
  return JSON.stringify({
    clicked: true,
    word: value,
    detail: word.textContent || value,
    modifiers: options,
  });
})()
  `);
  return JSON.parse(raw);
}

function clickLookupWord(preferredWord, options = {}) {
  const eventOptions = JSON.stringify({
    shiftKey: Boolean(options.shiftKey),
    ctrlKey: Boolean(options.ctrlKey),
    metaKey: Boolean(options.metaKey),
  });
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const preferred = ${JSON.stringify(String(preferredWord || "").toLocaleLowerCase())};
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || []);
  const word = words.find((candidate) => {
    const value = String(candidate.dataset.afLookupWord || candidate.textContent || "").toLocaleLowerCase();
    return value === preferred;
  });
  if (!word) {
    return JSON.stringify({ clicked: false, word: preferred, detail: "preferred-word-not-found" });
  }
  const value = word.dataset.afLookupWord || word.textContent || "";
  const options = ${eventOptions};
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    word.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      shiftKey: options.shiftKey,
      ctrlKey: options.ctrlKey,
      metaKey: options.metaKey,
    }));
  }
  return JSON.stringify({
    clicked: true,
    word: value,
    detail: word.textContent || value,
    modifiers: options,
  });
})()
  `);
  return JSON.parse(raw);
}

function dragFirstPhraseSpan() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || [])
    .filter((word) => (word.dataset.afLookupWord || "").length > 1);
  const first = words[0];
  const second = words[1];
  if (!first || !second) {
    return JSON.stringify({ selected: false, detail: "not-enough-words" });
  }
  first.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  second.dispatchEvent(new PointerEvent("pointerenter", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  const draftWords = root.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length;
  second.dispatchEvent(new PointerEvent("pointerup", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 0,
  }));
  return JSON.stringify({
    selected: true,
    draftWords,
    words: [
      first.dataset.afLookupWord || first.textContent || "",
      second.dataset.afLookupWord || second.textContent || "",
    ],
  });
})()
  `);
  return JSON.parse(raw);
}

function previewThenEscapeFirstPhraseSpan() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || [])
    .filter((word) => (word.dataset.afLookupWord || "").length > 1);
  const first = words[0];
  const second = words[1];
  if (!first || !second) {
    return JSON.stringify({ draftWordsBefore: 0, draftWordsAfter: 0, detail: "not-enough-words" });
  }
  first.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  second.dispatchEvent(new PointerEvent("pointerenter", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  const draftWordsBefore = root.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length;
  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
    composed: true,
  }));
  const draftWordsAfter = root.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length;
  return JSON.stringify({ draftWordsBefore, draftWordsAfter });
})()
  `);
  return JSON.parse(raw);
}

function previewThenReleaseOutsideFirstPhraseSpan() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || [])
    .filter((word) => (word.dataset.afLookupWord || "").length > 1);
  const first = words[0];
  const second = words[1];
  if (!first || !second) {
    return JSON.stringify({ draftWordsBefore: 0, draftWordsAfter: 0, detail: "not-enough-words" });
  }
  first.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  second.dispatchEvent(new PointerEvent("pointerenter", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
  }));
  const draftWordsBefore = root.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length;
  document.dispatchEvent(new PointerEvent("pointerup", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 0,
  }));
  const draftWordsAfter = root.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word.is-span-draft").length;
  return JSON.stringify({ draftWordsBefore, draftWordsAfter });
})()
  `);
  return JSON.parse(raw);
}

function clickDictionaryTranslate(index) {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const buttons = Array.from(root?.querySelectorAll("#af-shadowing-dictionary-panel .af-overlay-card .af-card-translate") || []);
  const button = buttons[${Number(index)}];
  if (!button) return "not-found";
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    button.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: type === "pointerdown" || type === "mousedown" ? 1 : 0,
    }));
  }
  return "clicked";
})()
  `);
}

function clickDictionaryProgressAction(cardIndex, label) {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const cards = Array.from(root?.querySelectorAll("#af-shadowing-dictionary-panel .af-overlay-card") || []);
  const card = cards[${Number(cardIndex)}];
  const buttons = Array.from(card?.querySelectorAll(".af-review-actions button") || []);
  const needle = ${JSON.stringify(label)}.toLocaleLowerCase();
  const button = buttons.find((candidate) => (candidate.textContent || "").trim().toLocaleLowerCase() === needle) || buttons[0];
  if (!button) return "not-found";
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    button.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: type === "pointerdown" || type === "mousedown" ? 1 : 0,
    }));
  }
  return "clicked";
})()
  `);
}

function clearDictionaryMockCommands() {
  chromeEval(`
(() => {
  window.__afShadowingDictionaryMockCommands = [];
  document.documentElement.dataset.afShadowingDictionaryMockCommands = "[]";
  return "ok";
})()
  `);
}

function readDictionaryMockCommands() {
  const raw = chromeEval(`
(() => document.documentElement.dataset.afShadowingDictionaryMockCommands || "[]")()
  `);
  return JSON.parse(raw);
}

function expandDictionaryCards() {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const buttons = Array.from(root?.querySelectorAll("#af-shadowing-dictionary-panel .af-overlay-expand-toggle[aria-expanded='false']") || []);
  for (const button of buttons) {
    button.click();
  }
  return String(buttons.length);
})()
  `);
}

function scrollDictionaryToCardDetails() {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const panel = root?.querySelector("#af-shadowing-dictionary-panel");
  const details = panel?.querySelector(".af-overlay-details-content");
  if (!panel || !details) return "not-found";
  details.scrollIntoView({ block: "start", inline: "nearest" });
  return "scrolled";
})()
  `);
}

function scrollDictionaryToSearchPreviews() {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const panel = root?.querySelector("#af-shadowing-dictionary-panel");
  const previews = panel?.querySelector(".af-dictionary-search-groups");
  if (!panel || !previews) return "not-found";
  previews.scrollIntoView({ block: "start", inline: "nearest" });
  return "scrolled";
})()
  `);
}

function scrollDictionaryToTop() {
  return chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const panel = root?.querySelector("#af-shadowing-dictionary-panel");
  if (!panel) return "not-found";
  panel.scrollTop = 0;
  return "scrolled";
})()
  `);
}

function waitForDictionaryMockCommand(operation, timeoutMs) {
  const started = Date.now();
  let commands = [];

  while (Date.now() - started < timeoutMs) {
    commands = readDictionaryMockCommands();
    if (commands.some((command) => command.operation === operation)) {
      return commands;
    }
    sleep(250);
  }

  return commands;
}

function lastDictionaryMockCommand(commands, operation) {
  const matching = (Array.isArray(commands) ? commands : [])
    .filter((command) => command.operation === operation);
  return matching[matching.length - 1] || null;
}

function setDebugVisible(visible) {
  const result = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const toggle = root?.querySelector("[data-af-debug-toggle]");
  const debug = root?.querySelector("[data-af-debug]");
  if (!toggle || !debug) return "missing";
  const isVisible = Boolean(debug.textContent.trim());
  if (isVisible !== ${visible ? "true" : "false"}) {
    toggle.click();
  }
  return "ok";
})()
  `);
  if (result !== "ok") {
    fail(`Could not set debug visibility: ${result}`);
  }
}

function openSourceMenu() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const toggle = root?.querySelector("[data-af-source-toggle]");
  if (!toggle) return JSON.stringify({ opened: false, options: [], detail: "toggle-not-found" });
  if (toggle.disabled) return JSON.stringify({ opened: false, options: [], detail: "toggle-disabled" });
  toggle.click();
  const options = Array.from(root.querySelectorAll(".af-source-option")).map((option) => option.textContent || "");
  const errors = Array.from(root.querySelectorAll(".af-source-option-error")).map((error) => error.textContent || "");
  return JSON.stringify({ opened: true, options, errors, detail: options.join(" | ") });
})()
  `);
  return JSON.parse(raw);
}

function clickSourceOption(kind) {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const options = Array.from(root?.querySelectorAll(".af-source-option") || []);
  const matcher = ${JSON.stringify(kind)} === "auto"
    ? (text) => /auto/i.test(text)
    : (text) => !/auto/i.test(text);
  const option = options.find((candidate) => matcher(candidate.textContent || ""));
  if (!option) {
    return JSON.stringify({ clicked: false, detail: options.map((item) => item.textContent || "").join(" | ") });
  }
  option.click();
  return JSON.stringify({ clicked: true, detail: option.textContent || "" });
})()
  `);
  return JSON.parse(raw);
}

function clickSourceOptionByText(text) {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const options = Array.from(root?.querySelectorAll(".af-source-option") || []);
  const needle = ${JSON.stringify(text)}.toLocaleLowerCase();
  const option = options.find((candidate) => (candidate.textContent || "").toLocaleLowerCase().includes(needle));
  if (!option) {
    return JSON.stringify({ clicked: false, detail: options.map((item) => item.textContent || "").join(" | ") });
  }
  option.click();
  return JSON.stringify({ clicked: true, detail: option.textContent || "" });
})()
  `);
  return JSON.parse(raw);
}

function clickPageToggle() {
  const result = chromeEval(`
(() => {
  const button = document.querySelector("#af-shadowing-toggle");
  if (!button) return "not-found";
  button.click();
  return "clicked";
})()
  `);
  if (result !== "clicked") {
    fail(`Could not click AudioFilms toggle: ${result}`);
  }
}

function getLocalStorageItem(key) {
  const raw = chromeEval(`
(() => {
  const value = window.localStorage.getItem(${JSON.stringify(key)});
  return value === null ? "__AF_NULL__" : value;
})()
  `);
  return raw === "__AF_NULL__" ? null : raw;
}

function setLocalStorageItem(key, value) {
  chromeEval(`
(() => {
  window.localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});
  return "ok";
})()
  `);
}

function removeLocalStorageItem(key) {
  chromeEval(`
(() => {
  window.localStorage.removeItem(${JSON.stringify(key)});
  return "ok";
})()
  `);
}

function spaNavigate(videoId) {
  const result = chromeEval(`
(() => {
  const url = new URL(location.href);
  url.pathname = "/watch";
  url.search = new URLSearchParams({ v: ${JSON.stringify(videoId)} }).toString();
  history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  document.dispatchEvent(new Event("yt-navigate-start", { bubbles: true }));
  document.dispatchEvent(new Event("yt-navigate-finish", { bubbles: true }));
  return location.href;
})()
  `);
  if (!String(result).includes(`v=${videoId}`)) {
    fail(`Could not perform synthetic SPA navigation to ${videoId}: ${result}`);
  }
  sleep(900);
}

function reloadExtension() {
  chromeOpen(`chrome://extensions/?id=${EXTENSION_ID}`);
  sleep(1200);
  const result = chromeEval(`
(() => {
  const manager = document.querySelector("extensions-manager");
  const root = manager && manager.shadowRoot;
  const detail = root && root.querySelector("extensions-detail-view");
  const reload = detail && detail.shadowRoot && detail.shadowRoot.querySelector("#dev-reload-button");
  if (reload) {
    reload.click();
    return "clicked-detail-reload";
  }
  const item = root && root.querySelector('extensions-item[id="${EXTENSION_ID}"]');
  const itemReload = item && item.shadowRoot && item.shadowRoot.querySelector("#dev-reload-button");
  if (itemReload) {
    itemReload.click();
    return "clicked-item-reload";
  }
  return "reload-button-not-found";
})()
  `);
  if (!String(result).includes("clicked")) {
    fail(`Could not reload extension ${EXTENSION_ID}: ${result}`);
  }
  sleep(1000);
}

function navigate(url) {
  chromeOpen(url);
  sleep(1200);
}

function reloadTab() {
  runAppleScript(`
tell application "Google Chrome"
  tell active tab of front window to reload
end tell
  `);
  sleep(1200);
}

function chromeOpen(url) {
  runAppleScript(`
tell application "Google Chrome"
  activate
  if not (exists window 1) then make new window
  set URL of active tab of front window to "${escapeAppleScriptString(url)}"
end tell
  `);
}

function resizeChrome(width, height) {
  runAppleScript(`
tell application "Google Chrome"
  activate
  if not (exists window 1) then make new window
  set bounds of front window to {0, 0, ${Number(width)}, ${Number(height)}}
end tell
  `);
  sleep(500);
}

function captureChromeScreenshot(label) {
  mkdirSync(SMOKE_ARTIFACT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${SMOKE_ARTIFACT_DIR}/${timestamp}-${label}.png`;
  runAppleScript(`
tell application "Google Chrome"
  activate
end tell
  `);
  sleep(250);
  execFileSync("screencapture", ["-x", path], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  return path;
}

function chromeEval(js) {
  const script = `
tell application "Google Chrome"
  set resultText to execute active tab of front window javascript ${JSON.stringify(js)}
  return resultText
end tell
  `;
  return runAppleScript(script).trim();
}

function runAppleScript(script) {
  return execFileSync("osascript", ["-e", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function printFixtureResult(result) {
  const status = result.ok ? "PASS" : "FAIL";
  console.log(`\n[${status}] ${result.name} (${result.videoId})`);
  console.log(`  source: ${result.snapshot.source || "-"}`);
  console.log(`  count: ${result.snapshot.count || "-"}`);
  console.log(`  message: ${result.snapshot.message || "-"}`);
  console.log(`  error: ${result.snapshot.error || "-"}`);
  for (const item of result.assertions) {
    const mark = item.ok ? "ok" : "FAIL";
    console.log(`  - ${mark}: ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
  }
}

function printFixtureList() {
  console.log("Default smoke fixtures:");
  for (const fixture of FIXTURES.filter((item) => DEFAULT_FIXTURE_NAMES.has(item.name))) {
    console.log(`  - ${fixture.name} (${fixture.videoId})`);
  }
  console.log("\nFull regression fixtures:");
  for (const fixture of FIXTURES) {
    console.log(`  - ${fixture.name} (${fixture.videoId})`);
  }
  console.log("\nExtra full-regression scenarios:");
  console.log("  - synthetic SPA navigation");
  console.log("  - backend-off degraded state");
  console.log("  - backend-failed degraded state");
  console.log("  - failed source switch recovery");
  console.log("  - multilingual source switch and lookup");
  console.log("  - viewport geometry and mocked dictionary card states");
  console.log("\nFocused opt-in scenarios:");
  console.log(`  - ${ASR_EDGE_FIXTURE.name} (${ASR_EDGE_FIXTURE.videoId}) via --only-asr-edge`);
  console.log(`  - ${DICTIONARY_SOURCE_BINDING_FIXTURE.name} (${DICTIONARY_SOURCE_BINDING_FIXTURE.videoId}) via --only-dictionary-source-binding`);
  console.log("  - dictionary-ui-focused via --only-dictionary-ui [--dictionary-video=<id>] [--dictionary-word=<word>] [--dictionary-mock=cards|off]");
}

function parseTimestampSeconds(text) {
  const value = String(text || "").trim();
  if (!value) return NaN;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return NaN;
}

function assertion(name, ok, detail = "") {
  return { name, ok: Boolean(ok), detail };
}

function rectWithinViewport(rect, viewport) {
  if (!rect) return false;
  return rect.left >= -1 &&
    rect.top >= -1 &&
    rect.right <= viewport.width + 1 &&
    rect.bottom <= viewport.height + 1 &&
    rect.width > 0 &&
    rect.height > 0;
}

function rectWithinParent(rect, parent) {
  if (!rect || !parent) return false;
  return rect.left >= parent.left - 1 &&
    rect.right <= parent.right + 1 &&
    rect.top >= parent.top - 1 &&
    rect.bottom <= parent.bottom + 1;
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
}

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
