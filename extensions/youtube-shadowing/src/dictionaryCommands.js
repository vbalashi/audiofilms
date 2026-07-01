(function audioFilmsDictionaryCommands() {
  function parseCommandResponse(response) {
    const text = response?.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }
    return { text, payload };
  }

  function attachCommandTimings(payload, response) {
    if (!payload || typeof payload !== "object" || !response?.timings) return payload;
    const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
    payload.meta = {
      ...meta,
      commandTimings: response.timings,
    };
    return payload;
  }

  function isNoMatchLookupPayload(response, payload) {
    if (response.status !== 404 || !payload) return false;
    return payload.code === "no_match" || payload.error === "no_match";
  }

  function safeLookupErrorMessage(response, payload, text) {
    if (response.error) return response.error;
    if (payload?.error || payload?.detail) return payload.error || payload.detail;
    const body = String(text || "").trim();
    if (/^<!doctype\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
      if (response.status === 404) {
        return "Dictionary endpoint is unavailable on the remote AudioFilms API.";
      }
      return "Dictionary endpoint returned HTML instead of JSON.";
    }
    return body.slice(0, 180) || `HTTP ${response.status}`;
  }

  function dictionaryOperationPath(operation) {
    return {
      "dict-lookup": "/dict/lookup",
      "dict-search": "/dict/search",
      "dict-action": "/dict/actions",
      "dict-translation": "/dict/translation",
      "dict-generated-draft": "/dict/generated-entry/draft",
      "dict-generated-save": "/dict/generated-entry",
      "phrase-translation": "/practice/phrase-translations",
      "dict-session": "/dict/session",
    }[operation] || "";
  }

  function dictionaryRequestInit(operation, body = null) {
    if (operation === "dict-session") {
      return {
        credentials: "omit",
        method: "GET",
        headers: { accept: "application/json" },
      };
    }
    return {
      credentials: "omit",
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    };
  }

  function dictionaryCommandUrl(endpoint, operation) {
    const path = dictionaryOperationPath(operation);
    if (!path) return null;
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/dict\/?$/, path);
    return url;
  }

  function selectedWordSourceLanguage(selectedWord, source, fallback = "auto") {
    return selectedWord?.sourceBinding?.captionSource?.languageCode ||
      source?.loadedTranscriptResult?.languageCode ||
      source?.languageCode ||
      fallback;
  }

  function dictionaryLookupRequest({
    selectedWord,
    source,
    context = "",
  } = {}) {
    return {
      word: selectedWord?.word || "",
      language: selectedWordSourceLanguage(selectedWord, source),
      context: context || "",
    };
  }

  function dictionarySearchRequest({
    selectedWord,
    source,
    context = "",
    group = null,
    cursor = null,
    limit = 5,
  } = {}) {
    return {
      ...dictionaryLookupRequest({ selectedWord, source, context }),
      group,
      cursor,
      limit,
    };
  }

  function dictionarySearchItemLookupRequest({
    selectedWord,
    source,
    itemTitle = "",
    itemText = "",
    fallbackContext = "",
  } = {}) {
    return {
      word: itemTitle || selectedWord?.word || "",
      language: selectedWordSourceLanguage(selectedWord, source),
      context: itemText || fallbackContext || "",
    };
  }

  function disabledDictionaryResponse() {
    return {
      ok: false,
      status: 400,
      text: JSON.stringify({ error: "Dictionary backend is disabled." }),
    };
  }

  window.__afShadowingDictionaryCommands = {
    parseCommandResponse,
    attachCommandTimings,
    isNoMatchLookupPayload,
    safeLookupErrorMessage,
    dictionaryOperationPath,
    dictionaryRequestInit,
    dictionaryCommandUrl,
    selectedWordSourceLanguage,
    dictionaryLookupRequest,
    dictionarySearchRequest,
    dictionarySearchItemLookupRequest,
    disabledDictionaryResponse,
  };
})();
