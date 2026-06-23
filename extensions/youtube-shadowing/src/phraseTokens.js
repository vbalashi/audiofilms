(function audioFilmsPhraseTokens() {
  function tokenizeClickablePhraseText(text) {
    const tokens = Array.from(String(text || "").matchAll(/\s+|\S+/gu));
    const segments = [];
    let lookupTokenIndex = 0;

    for (const match of tokens) {
      const token = match[0];
      const charStart = match.index || 0;
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        segments.push({ kind: "text", text: token });
        continue;
      }

      const lookupWord = normalizeLookupWord(token);
      if (!lookupWord) {
        segments.push({ kind: "text", text: token });
        continue;
      }

      segments.push({
        kind: "word",
        text: token,
        lookupWord,
        tokenIndex: lookupTokenIndex,
        charStart,
        charEnd: charStart + token.length,
        originalToken: token,
      });
      lookupTokenIndex += 1;
    }

    return segments;
  }

  function normalizeLookupWord(token) {
    return String(token || "")
      .replace(/^[^\p{L}\p{N}]+/gu, "")
      .replace(/[^\p{L}\p{N}]+$/gu, "");
  }

  window.__afShadowingPhraseTokens = {
    tokenizeClickablePhraseText,
    normalizeLookupWord,
  };
})();
