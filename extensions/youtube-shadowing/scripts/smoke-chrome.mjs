#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const EXTENSION_ID = "hhdkchoccmikoefhenobdjipgdppdpoc";

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
      countPattern: /\/ 106$/,
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

const args = new Set(process.argv.slice(2));
const shouldReloadExtension = args.has("--reload-extension");
const shouldSkipBackendCheck = args.has("--skip-backend-check");
const shouldSkipSpaCheck = args.has("--skip-spa-check");
const shouldSkipBackendOffCheck = args.has("--skip-backend-off-check");
const shouldSkipBackendFailedCheck = args.has("--skip-backend-failed-check");
const shouldSkipSourceSwitchFailedCheck = args.has("--skip-source-switch-failed-check");
const shouldSkipMultilingualSwitchCheck = args.has("--skip-multilingual-switch-check");
const shouldSkipGeometryCheck = args.has("--skip-geometry-check");
const shouldOnlyBackendOff = args.has("--only-backend-off");
const shouldOnlyBackendFailed = args.has("--only-backend-failed");
const shouldOnlySourceSwitchFailed = args.has("--only-source-switch-failed");
const shouldOnlyMultilingualSwitch = args.has("--only-multilingual-switch");
const shouldOnlyGeometry = args.has("--only-geometry");
const fixtureFilter = getArgValue("--only");
const waitMs = Number(getArgValue("--wait-ms") || 18000);

const fixtures = fixtureFilter
  ? FIXTURES.filter((fixture) => fixture.name === fixtureFilter || fixture.videoId === fixtureFilter)
  : (shouldOnlyBackendOff || shouldOnlyBackendFailed || shouldOnlySourceSwitchFailed || shouldOnlyMultilingualSwitch || shouldOnlyGeometry)
    ? []
  : FIXTURES;

if (!fixtures.length && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry) {
  fail(`No fixtures matched --only=${fixtureFilter}`);
}

if (!shouldSkipBackendCheck) {
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

if (!fixtureFilter && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry && !shouldSkipSpaCheck) {
  for (const fixture of runSpaNavigationScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((!fixtureFilter && !shouldSkipBackendOffCheck) || shouldOnlyBackendOff) && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry) {
  for (const fixture of runBackendOffScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((!fixtureFilter && !shouldSkipBackendFailedCheck) || shouldOnlyBackendFailed) && !shouldOnlyBackendOff && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry) {
  for (const fixture of runBackendFailedScenario()) {
    results.push(fixture);
    printFixtureResult(fixture);
  }
}

if (((!fixtureFilter && !shouldSkipSourceSwitchFailedCheck) || shouldOnlySourceSwitchFailed) && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlyMultilingualSwitch && !shouldOnlyGeometry) {
  const sourceSwitchFailedResult = runSourceSwitchFailedScenario();
  results.push(sourceSwitchFailedResult);
  printFixtureResult(sourceSwitchFailedResult);
}

if (((!fixtureFilter && !shouldSkipMultilingualSwitchCheck) || shouldOnlyMultilingualSwitch) && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyGeometry) {
  const multilingualSwitchResult = runMultilingualSourceSwitchScenario();
  results.push(multilingualSwitchResult);
  printFixtureResult(multilingualSwitchResult);
}

if ((!fixtureFilter && !shouldOnlyBackendOff && !shouldOnlyBackendFailed && !shouldOnlySourceSwitchFailed && !shouldOnlyMultilingualSwitch && !shouldSkipGeometryCheck) || shouldOnlyGeometry) {
  const geometryResult = runGeometryScenario();
  results.push(geometryResult);
  printFixtureResult(geometryResult);
}

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`\n${failed.length} fixture(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${results.length} YouTube extension smoke fixture(s) passed.`);

function runFixture(fixture) {
  const url = `https://www.youtube.com/watch?v=${fixture.videoId}`;
  navigate(url);

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
  const lookupSnapshot = waitForDictionary(waitMs);
  assertions.push(assertion("Arabic lookup word clicked", clicked.clicked && /[\u0600-\u06FF]/.test(clicked.word || ""), `${clicked.word} ${clicked.detail}`));
  assertions.push(assertion("Arabic lookup dictionary opened", lookupSnapshot.dictionary?.present === true));
  assertions.push(assertion("Arabic lookup selected Arabic word", /[\u0600-\u06FF]/.test(lookupSnapshot.dictionary?.word || ""), lookupSnapshot.dictionary?.word || ""));
  assertions.push(assertion("Arabic lookup keeps Arabic context", /[\u0600-\u06FF]/.test(lookupSnapshot.dictionary?.context || ""), lookupSnapshot.dictionary?.context || ""));

  return {
    ...fixture,
    ok: assertions.every((item) => item.ok),
    assertions,
    snapshot: lookupSnapshot,
  };
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
  setLocalStorageItem("afShadowingDictionaryMock", "cards");
  reloadTab();
  waitForSnapshot("4EE7m94mJpk", waitMs);
  pauseVideo();
  setDebugVisible(false);
  const wideBeforeLookup = readGeometrySnapshot();
  const practiceModeLayoutAssertions = assertPracticeModeLayoutStability(wideBeforeLookup);
  const phraseTranslationAssertions = assertPhraseTranslationUi();
  const improveTimingAssertions = assertImproveTimingUi();
  const debugMenuAssertions = assertDebugMenuUi();

  const lookupClick = clickFirstLookupWord();
  const dictionaryOpened = waitForDictionary(waitMs);
  setDebugVisible(false);
  const wideWithDictionary = readGeometrySnapshot();
  const accountPlacementAssertions = assertDictionaryAccountPlacement();
  const dictionaryCardAssertions = assertDictionaryCardUi();

  resizeChrome(430, 900);
  sleep(1200);
  const narrowWithDictionary = readGeometrySnapshot();

  resizeChrome(1344, 900);

  const assertions = [
    assertion("geometry lookup word clicked", lookupClick.clicked, lookupClick.detail),
    assertion("geometry dictionary opened", dictionaryOpened.dictionary?.present === true),
    ...practiceModeLayoutAssertions,
    ...phraseTranslationAssertions,
    ...improveTimingAssertions,
    ...debugMenuAssertions,
    assertion("readiness chip has status dot", wideBeforeLookup.readinessChip?.hasDot === true, JSON.stringify(wideBeforeLookup.readinessChip)),
    assertion("primary UI avoids technical source terms", wideBeforeLookup.primaryUi?.hasTechnicalTerms === false, wideBeforeLookup.primaryUi?.text || ""),
    assertion("phrase navigation uses icon controls", wideBeforeLookup.primaryUi?.phraseIconButtons === 3, JSON.stringify(wideBeforeLookup.primaryUi)),
    assertion("dictionary ready body starts at cards", wideWithDictionary.dictionaryUi?.hasSelectedCard === false && wideWithDictionary.dictionaryUi?.overlayCardCount > 0, JSON.stringify(wideWithDictionary.dictionaryUi)),
    assertion("dictionary does not expose raw html", wideWithDictionary.dictionaryUi?.hasRawHtml === false, JSON.stringify(wideWithDictionary.dictionaryUi)),
    ...accountPlacementAssertions,
    ...dictionaryCardAssertions,
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
      message: "",
      error: wideBeforeLookup.error,
    },
  };
}

function assertDebugMenuUi() {
  clickShadowButton("[data-af-utility-toggle]");
  sleep(200);
  const openGeometry = readGeometrySnapshot();
  pressKey("Escape", "Escape");
  sleep(200);
  const closedGeometry = readGeometrySnapshot();

  return [
    assertion("debug tools button is labelled", openGeometry.debugTools?.label === "Debug tools", openGeometry.debugTools?.label || ""),
    assertion("debug tools popover opens", openGeometry.debugTools?.open === true, JSON.stringify(openGeometry.debugTools)),
    assertion("debug tools contains actions", openGeometry.debugTools?.actions?.join("|") === "Mark Issue|Debug|Copy Debug|Refresh Cache", (openGeometry.debugTools?.actions || []).join("|")),
    assertion("debug tools popover closes with Escape", closedGeometry.debugTools?.open === false, JSON.stringify(closedGeometry.debugTools)),
  ];
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
    assertion("practice mode keeps ribbon height stable", heightDelta <= 1, `${shadowGeometry.ribbon?.height} -> ${recallGeometry.ribbon?.height}`),
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
  const reviewCard = before.dictionaryUi?.cards?.find((card) => (card.progressActions || []).includes("Again"));
  const frozenCard = before.dictionaryUi?.cards?.find((card) => /frozen/i.test(card.title || "")) ||
    before.dictionaryUi?.cards?.[2];

  return [
    assertion("dictionary mock card count", before.dictionaryUi?.overlayCardCount === 3, JSON.stringify(before.dictionaryUi)),
    assertion("dictionary card anatomy has title and chips", before.dictionaryUi?.cards?.every((card) => card.title && card.chips > 0), JSON.stringify(before.dictionaryUi?.cards || [])),
    assertion("dictionary not-started actions show Learn/Known", ["Learn", "Known"].every((label) => allProgressActions.includes(label)), allProgressActions.join("|")),
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
  clickShadowButton("[data-af-mark-issue]");
  sleep(400);
  const snapshot = readSnapshot();
  const report = snapshot.debug?.lastIssueReport || "";
  let parsed = null;
  try {
    parsed = JSON.parse(report);
  } catch (_error) {
    parsed = null;
  }
  return [
    assertion("mark issue report captured", parsed?.kind === "audiofilms-youtube-navigation-issue", report.slice(0, 120)),
    assertion("mark issue includes current phrase", Boolean(parsed?.currentPhrase?.text), parsed?.currentPhrase?.text || ""),
    assertion("mark issue includes navigation events", Array.isArray(parsed?.navigationEvents) && parsed.navigationEvents.length > 0, String(parsed?.navigationEvents?.length || 0)),
  ];
}

function assertNextStaysOnTargetInteraction() {
  const before = readSnapshot();
  const beforeOrdinal = parseCountOrdinal(before.count);
  clickShadowButton("[data-af-next]");
  sleep(450);
  const afterEarly = readSnapshot();
  sleep(3800);
  const afterAutoPause = readSnapshot();
  const expectedOrdinal = beforeOrdinal ? beforeOrdinal + 1 : null;

  return [
    assertion("next advances from visible phrase", parseCountOrdinal(afterEarly.count) === expectedOrdinal, `${before.count} -> ${afterEarly.count}`),
    assertion("next does not roll back during guided playback", parseCountOrdinal(afterAutoPause.count) === expectedOrdinal, `${before.count} -> ${afterAutoPause.count}`),
    assertion("next leaves guided mode active", afterAutoPause.guidedMode === true, JSON.stringify({ mode: afterAutoPause.mode, guidedMode: afterAutoPause.guidedMode })),
  ];
}

function parseCountOrdinal(countText) {
  const match = String(countText || "").match(/^(\d+)\s*\/\s*\d+/);
  return match ? Number(match[1]) : null;
}

function assertKeyboardNavigationInteraction() {
  pressKey("Space", " ");
  sleep(350);
  const afterSpace = readSnapshot();
  pressKey("ArrowDown", "ArrowDown");
  sleep(900);
  const afterReplay = readSnapshot();
  const rowSeconds = parseTimestampSeconds(afterSpace.rowTime);
  const currentTime = Number(afterReplay.video?.currentTime);
  const closeToPhrase = Number.isFinite(rowSeconds) &&
    Number.isFinite(currentTime) &&
    Math.abs(currentTime - rowSeconds) <= 3;

  return [
    assertion("space exits guided mode", afterSpace.guidedMode === false, JSON.stringify({ mode: afterSpace.mode, guidedMode: afterSpace.guidedMode })),
    assertion("arrow down replays current phrase", afterReplay.guidedMode === true, JSON.stringify({ mode: afterReplay.mode, guidedMode: afterReplay.guidedMode })),
    assertion("arrow down seeks near visible phrase", closeToPhrase, `row=${afterSpace.rowTime}, video=${afterReplay.video?.currentTime}`),
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
  const autoSnapshot = waitForSource(/Auto/, fixture.videoId, waitMs);
  const autoLoaded = /Auto/.test(autoSnapshot.source || "");
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
  const before = readSnapshot();
  const clicked = clickFirstLookupWord();
  const after = readSnapshot();
  const selectedWord = after.dictionary?.word || "";
  const selectedWordNormalized = selectedWord.toLocaleLowerCase();
  const clickedWordNormalized = (clicked.word || "").toLocaleLowerCase();

  return [
    assertion("lookup word clicked", clicked.clicked, clicked.detail),
    assertion("dictionary panel opened", after.dictionary?.present === true),
    assertion("dictionary selected clicked word", selectedWordNormalized === clickedWordNormalized, `${selectedWord} vs ${clicked.word}`),
    assertion("dictionary has context", Boolean(after.dictionary?.context), after.dictionary?.context || ""),
    assertion("dictionary context matches phrase", Boolean(before.rowText) && after.dictionary?.context?.includes(before.rowText), after.dictionary?.context || ""),
    assertion("lookup leaves phrase row rendered", Boolean(after.rowText), after.rowText),
  ];
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
      `Backend preflight failed. Start the AudioFilms app on http://localhost:3000 or pass --skip-backend-check for browser-only diagnostics. ${message}`,
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
    assertions.push(assertion(`source includes ${part}`, (snapshot.source || "").includes(part), snapshot.source));
  }

  if (expect.retrievalPath) {
    assertions.push(
      assertion(
        `retrieval path ${expect.retrievalPath}`,
        boot.selectedRetrievalPath === expect.retrievalPath ||
          debug.transcriptResult?.retrievalPath === expect.retrievalPath,
        boot.selectedRetrievalPath || debug.transcriptResult?.retrievalPath || "",
      ),
    );
  }

  if (expect.errorIncludes) {
    assertions.push(assertion("expected error", (snapshot.error || "").includes(expect.errorIncludes), snapshot.error));
  } else {
    assertions.push(assertion("no visible error", !(snapshot.error || "").trim(), snapshot.error));
  }

  for (const label of expect.hiddenControls || []) {
    const control = snapshot.controls.find((item) => item.text.startsWith(label));
    assertions.push(assertion(`${label} hidden`, control?.display === "none", JSON.stringify(control)));
  }

  if (!expect.empty) {
    assertions.push(assertion("phrase row rendered", Boolean(snapshot.rowText), snapshot.rowText));
  }

  return assertions;
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
    message: root.querySelector(".af-ribbon-message")?.textContent || "",
    error: root.querySelector("[data-af-error]")?.textContent || "",
    rowTime: root.querySelector(".af-ribbon-row.is-current .af-ribbon-time")?.textContent || "",
    rowText: root.querySelector(".af-ribbon-row.is-current .af-ribbon-text")?.textContent || "",
    dictionary: (() => {
      const dictionary = root.querySelector("#af-shadowing-dictionary-panel");
      if (!dictionary) return { present: false };
      return {
        present: true,
        word: dictionary.querySelector(".af-word-title")?.textContent || "",
        context: dictionary.querySelector(".af-context-text")?.textContent || "",
        subtitle: dictionary.querySelector("[data-af-dictionary-subtitle]")?.textContent || "",
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
      return {
        buttonText: root?.querySelector("[data-af-phrase-translation]")?.textContent || "",
        buttonTitle: root?.querySelector("[data-af-phrase-translation]")?.getAttribute("title") || "",
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
        phraseIconButtons: root?.querySelectorAll(".af-practice-controls .af-phrase-icon-button .af-button-icon").length || 0,
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
        cards: Array.from(dictionary.querySelectorAll(".af-overlay-card")).map((card) => ({
          title: card.querySelector(".af-overlay-card-title")?.textContent || "",
          chips: card.querySelectorAll(".af-chip").length,
          progressActions: Array.from(card.querySelectorAll(".af-review-actions button")).map((button) => button.textContent.trim()),
          translateActions: Array.from(card.querySelectorAll(".af-card-translate")).map((button) => button.textContent.trim()),
        })),
        translationBlocks: dictionary.querySelectorAll(".af-card-translation").length,
        inlineTranslations: dictionary.querySelectorAll(".af-inline-translation").length,
        actionStatus: dictionary.querySelector(".af-card-action-status")?.textContent || "",
        actionError: dictionary.querySelector(".af-source-option-error")?.textContent || "",
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

function pressKey(code, key) {
  chromeEval(`
(() => {
  const eventInit = {
    key: ${JSON.stringify(key)},
    code: ${JSON.stringify(code)},
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

function clickFirstLookupWord() {
  const raw = chromeEval(`
(() => {
  const root = document.querySelector("#audiofilms-root")?.shadowRoot;
  const words = Array.from(root?.querySelectorAll(".af-ribbon-row.is-current .af-ribbon-word") || []);
  const word = words.find((candidate) => (candidate.dataset.afLookupWord || "").length > 1) || words[0];
  if (!word) {
    return JSON.stringify({ clicked: false, word: "", detail: "no-word-button" });
  }
  const value = word.dataset.afLookupWord || word.textContent || "";
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    word.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
  if (typeof word.click === "function") {
    word.click();
  }
  return JSON.stringify({ clicked: true, word: value, detail: word.textContent || value });
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
  button.click();
  return "clicked";
})()
  `);
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
