#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const EXTENSION_ID = "hhdkchoccmikoefhenobdjipgdppdpoc";

const FIXTURES = [
  {
    name: "manual-trappist",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Manual", "exact"],
      countPattern: /\/ 185$/,
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
      sourceIncludes: ["Manual", "exact"],
      countPattern: /\/ 149$/,
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
      sourceIncludes: ["Auto", "exact"],
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
      sourceIncludes: ["Manual", "exact", "source warning"],
      countPattern: /\/ 162$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "english-manual",
    videoId: "aircAruvnKk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["English", "Manual", "exact"],
      countPattern: /\/ 271$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "auto-only",
    videoId: "xymyDvCgWDA",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Auto", "exact"],
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
      hiddenControls: ["Prev", "Replay", "Hide Text", "Next", "Auto-Pause"],
      checkOffOn: true,
      expectNoDictionary: true,
    },
  },
  {
    name: "manual-after-empty",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Manual", "exact"],
      countPattern: /\/ 185$/,
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
      sourceIncludes: ["Manual", "exact"],
      countPattern: /\/ 149$/,
      retrievalPath: "backend-provider",
      empty: false,
    },
  },
  {
    name: "spa-manual-return",
    videoId: "4EE7m94mJpk",
    expect: {
      minTracks: 1,
      sourceIncludes: ["Manual", "exact"],
      countPattern: /\/ 185$/,
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
      errorIncludes: "backend fallback is disabled",
      hiddenControls: ["Prev", "Replay", "Hide Text", "Next", "Auto-Pause"],
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
      errorIncludes: "backend provider failed",
      hiddenControls: ["Prev", "Replay", "Hide Text", "Next", "Auto-Pause"],
      expectNoDictionary: true,
    },
  },
];

const SOURCE_SWITCH_FAILED_FIXTURE = {
  name: "source-switch-failed-keeps-manual",
  videoId: "4EE7m94mJpk",
  expect: {
    minTracks: 1,
    sourceIncludes: ["Manual", "exact"],
    countPattern: /\/ 185$/,
    retrievalPath: "backend-provider",
    empty: false,
  },
};

const MULTILINGUAL_SOURCE_SWITCH_FIXTURE = {
  name: "multilingual-source-switch-arabic",
  videoId: "aircAruvnKk",
  expect: {
    minTracks: 1,
    sourceIncludes: ["English", "Manual", "exact"],
    countPattern: /\/ 271$/,
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
    const after = waitForStableSourceText(/Manual/, fixture.videoId, waitMs);
    assertions.push(assertion("source switch failure keeps manual source", /Manual/.test(after.source || ""), after.source));
    assertions.push(assertion("source switch failure keeps phrase count", fixture.expect.countPattern.test(after.count || ""), after.count));
    assertions.push(assertion("source switch failure keeps phrase row", Boolean(after.rowText), after.rowText));
    assertions.push(assertion("source switch failure keeps previous phrase context", Boolean(before.rowText) && Boolean(after.rowText), `${before.rowText} -> ${after.rowText}`));

    const failedMenu = openSourceMenu();
    const errorText = failedMenu.errors.join(" | ");
    assertions.push(assertion("source switch failure recorded option error", /backend provider failed/i.test(errorText), errorText));

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
  assertions.push(assertion("Arabic source remains manual", /Manual/.test(arabicSnapshot.source || ""), arabicSnapshot.source));
  assertions.push(assertion("Arabic source has exact timing", /exact/.test(arabicSnapshot.source || ""), arabicSnapshot.source));
  assertions.push(assertion("Arabic source expected phrase count", /\/ 213$/.test(arabicSnapshot.count || ""), arabicSnapshot.count));
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
  pauseVideo();
  setDebugVisible(false);
  const wideBeforeLookup = readGeometrySnapshot();

  const lookupClick = clickFirstLookupWord();
  const dictionaryOpened = waitForDictionary(waitMs);
  setDebugVisible(false);
  const wideWithDictionary = readGeometrySnapshot();

  resizeChrome(430, 900);
  sleep(1200);
  const narrowWithDictionary = readGeometrySnapshot();

  resizeChrome(1344, 900);

  const assertions = [
    assertion("geometry lookup word clicked", lookupClick.clicked, lookupClick.detail),
    assertion("geometry dictionary opened", dictionaryOpened.dictionary?.present === true),
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

function assertGeometry(label, geometry, options) {
  const viewport = geometry.viewport;
  const rects = [geometry.ribbon, options.expectDictionary ? geometry.dictionary : null].filter(Boolean);
  const controls = geometry.controls || [];

  return [
    assertion(`${label}: viewport width set`, viewport.width <= 1400 && viewport.width >= 350, `${viewport.width}x${viewport.height}`),
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
    assertion("replay enters guided mode", after.mode === "Shortcuts active", after.mode),
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
    assertion("next leaves guided mode active", afterAutoPause.mode === "Shortcuts active", afterAutoPause.mode),
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
    assertion("space exits guided mode", afterSpace.mode === "Passive sync", afterSpace.mode),
    assertion("arrow down replays current phrase", afterReplay.mode === "Shortcuts active", afterReplay.mode),
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
    assertion("source menu has manual option", menu.options.some((option) => /Dutch$/i.test(option) || /Manual/i.test(option)), menu.options.join(" | ")),
    assertion("source menu has auto option", menu.options.some((option) => /auto/i.test(option)), menu.options.join(" | ")),
  ];

  if (!assertions.every((item) => item.ok)) return assertions;

  const autoClick = clickSourceOption("auto");
  assertions.push(assertion("auto source option clicked", autoClick.clicked, autoClick.detail));
  const autoSnapshot = waitForSource(/Auto/, fixture.videoId, waitMs);
  assertions.push(assertion("auto source loaded", /Auto/.test(autoSnapshot.source || ""), autoSnapshot.source));
  assertions.push(assertion("auto source has phrases", !autoSnapshot.isEmpty && /\d+ \/ \d+/.test(autoSnapshot.count || ""), autoSnapshot.count));
  assertions.push(assertion("auto source has no visible error", !(autoSnapshot.error || "").trim(), autoSnapshot.error));

  const manualMenu = openSourceMenu();
  assertions.push(assertion("manual source menu reopened", manualMenu.options.length > 1, manualMenu.options.join(" | ")));
  const manualClick = clickSourceOption("manual");
  assertions.push(assertion("manual source option clicked", manualClick.clicked, manualClick.detail));
  const manualSnapshot = waitForSource(/Manual/, fixture.videoId, waitMs);
  assertions.push(assertion("manual source restored", /Manual/.test(manualSnapshot.source || ""), manualSnapshot.source));
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
    count: root?.querySelector("[data-af-count]")?.textContent || "",
    error: root?.querySelector("[data-af-error]")?.textContent || "",
    ribbon: toRect(ribbon),
    dictionary: toRect(dictionary),
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
