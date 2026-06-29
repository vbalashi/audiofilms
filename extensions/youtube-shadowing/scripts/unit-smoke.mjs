import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");

function loadBrowserModule(relativePath, exportName) {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(extensionRoot, relativePath), "utf8");
  vm.runInNewContext(source, sandbox, { filename: relativePath });
  return sandbox.window[exportName];
}

const phraseTokens = loadBrowserModule("src/phraseTokens.js", "__afShadowingPhraseTokens");
const phrases = loadBrowserModule("src/phrases.js", "__afShadowingPhrases");
const sourceBinding = loadBrowserModule("src/sourceBinding.js", "__afShadowingSourceBinding");

assert.equal(phraseTokens.normalizeLookupWord("'m"), "'m");
assert.equal(phraseTokens.normalizeLookupWord("‘m"), "‘m");
assert.equal(phraseTokens.normalizeLookupWord("erbij."), "erbij");

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

console.log("YouTube extension unit smoke passed.");
