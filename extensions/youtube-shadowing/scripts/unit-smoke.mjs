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

console.log("YouTube extension unit smoke passed.");
