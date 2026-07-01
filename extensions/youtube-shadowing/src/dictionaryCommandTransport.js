(function audioFilmsDictionaryCommandTransport() {
  const dictionaryCommandApi = window.__afShadowingDictionaryCommands;

  async function fetchDictionaryResult({ word, language, context }, options = {}) {
    ensureDictionaryEndpoint(options.endpoint);
    const response = await options.requestDictionaryCommand("dict-lookup", {
      clickedForm: word,
      sourceLanguageCode: language || "auto",
      ...(context ? { contextText: context } : {}),
    });
    const { text, payload } = dictionaryCommandApi.parseCommandResponse(response);

    dictionaryCommandApi.attachCommandTimings(payload, response);

    if (!response.ok && dictionaryCommandApi.isNoMatchLookupPayload(response, payload)) {
      return payload;
    }

    if (!response.ok) {
      throwDictionaryError("Dictionary lookup failed", response, payload, text);
    }

    return payload;
  }

  async function fetchDictionarySearchResult({ word, language, context, group, cursor, limit }, options = {}) {
    ensureDictionaryEndpoint(options.endpoint);
    const response = await options.requestDictionaryCommand("dict-search", {
      clickedForm: word,
      sourceLanguageCode: language || "auto",
      ...(context ? { contextText: context } : {}),
      ...(group ? { group } : {}),
      ...(cursor ? { cursor } : {}),
      limit: limit || 5,
    });
    const { text, payload } = dictionaryCommandApi.parseCommandResponse(response);

    dictionaryCommandApi.attachCommandTimings(payload, response);

    if (!response.ok) {
      throwDictionaryError("Dictionary search failed", response, payload, text);
    }

    return payload;
  }

  async function postDictionaryCommand(operation, payload, options = {}) {
    const response = await options.requestDictionaryCommand(operation, payload);
    const { payload: body } = dictionaryCommandApi.parseCommandResponse(response);
    if (!response.ok) {
      throw new Error(body?.error || body?.detail || response.error || `HTTP ${response.status}`);
    }
    return body;
  }

  function dictionaryLookupEndpoint(config = window.__afShadowingConfig) {
    if (config?.dictionaryEndpoint) {
      return config.dictionaryEndpoint();
    }
    return "https://audiofilms-api.dilum.io/api/dict";
  }

  function ensureDictionaryEndpoint(endpoint) {
    if (!endpoint) {
      throw new Error("Dictionary lookup is disabled.");
    }
  }

  function throwDictionaryError(prefix, response, payload, text) {
    const message = dictionaryCommandApi.safeLookupErrorMessage(response, payload, text);
    const error = new Error(`${prefix}: HTTP ${response.status} ${message}`);
    error.payload = payload || { error: message };
    throw error;
  }

  window.__afShadowingDictionaryCommandTransport = {
    fetchDictionaryResult,
    fetchDictionarySearchResult,
    postDictionaryCommand,
    dictionaryLookupEndpoint,
  };
})();
