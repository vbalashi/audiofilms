(function audioFilmsExtensionCommandClient() {
  function createExtensionCommandClient({
    chrome,
    fetch,
    storage,
    document,
    dictionaryCommands,
    dictionaryMocks,
    backendCommands,
    issueReports,
    dictionaryEndpoint,
    apiBase,
    getIssueCategory = () => "",
    now = () => new Date().toISOString(),
  } = {}) {
    function sendRuntimeMessage(message) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
    }

    function requestDictionaryCommand(operation, body = null) {
      const mockResponse = dictionaryMockResponse(operation, body);
      if (mockResponse) return Promise.resolve(mockResponse);

      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        const endpoint = dictionaryEndpoint();
        if (!endpoint) {
          return Promise.resolve(dictionaryCommands.disabledDictionaryResponse());
        }
        const url = dictionaryCommands.dictionaryCommandUrl(endpoint, operation);
        if (!url) {
          return Promise.resolve(dictionaryCommands.disabledDictionaryResponse());
        }
        return fetch(url.toString(), dictionaryCommands.dictionaryRequestInit(operation, body)).then(async (response) => ({
          ok: response.ok,
          status: response.status,
          text: await response.text(),
        }));
      }

      return sendRuntimeMessage({
        type: "af-dictionary-command",
        operation,
        body,
      });
    }

    async function postDictionaryCommand(operation, payload) {
      const response = await requestDictionaryCommand(operation, payload);
      const { payload: body } = dictionaryCommands.parseCommandResponse(response);
      if (!response.ok) {
        throw new Error(body?.error || body?.detail || response.error || `HTTP ${response.status}`);
      }
      return body;
    }

    async function fetchDictionarySession() {
      const response = await requestDictionaryCommand("dict-session");
      const { payload: body } = dictionaryCommands.parseCommandResponse(response);
      if (!response.ok) {
        throw new Error(body?.error || body?.detail || response.error || `HTTP ${response.status}`);
      }
      return body;
    }

    function dictionaryMockResponse(operation, body = null) {
      const mockMode = storage?.getItem("afShadowingDictionaryMock");
      if (mockMode !== "cards" && mockMode !== "generated") return null;
      recordDictionaryMockCommand(operation, body, mockMode);
      return dictionaryMocks.dictionaryMockResponse(operation, body, mockMode);
    }

    function recordDictionaryMockCommand(operation, body, mockMode) {
      const commands = Array.isArray(window.__afShadowingDictionaryMockCommands)
        ? window.__afShadowingDictionaryMockCommands
        : [];
      commands.push({
        operation,
        mockMode,
        body,
        at: now(),
      });
      window.__afShadowingDictionaryMockCommands = commands.slice(-50);
      document.documentElement.dataset.afShadowingDictionaryMockCommands =
        JSON.stringify(window.__afShadowingDictionaryMockCommands);
    }

    async function postBackendJson(operation, body = {}) {
      return backendJson(operation, body);
    }

    async function getBackendJson(operation, body = {}) {
      return backendJson(operation, body);
    }

    async function backendJson(operation, body = {}) {
      const response = await requestBackendCommand(operation, body);
      const { payload, errorMessage } = backendCommands.parseBackendJsonResponse(response);
      if (errorMessage) throw new Error(errorMessage);
      return payload;
    }

    function requestBackendCommand(operation, body = {}) {
      if (operation === "issue-report-submit") {
        const mockResponse = issueReportMockResponse();
        if (mockResponse) return Promise.resolve(mockResponse);
      }
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        return requestBackendCommandDirect(operation, body);
      }
      return sendRuntimeMessage({
        type: "af-backend-command",
        operation,
        body,
      });
    }

    function requestBackendCommandDirect(operation, body = {}) {
      const request = backendCommands.backendCommandRequest(apiBase(), operation, body);
      if (request.response) return Promise.resolve(request.response);
      return fetch(request.url.toString(), request.fetchOptions).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      }));
    }

    function issueReportMockResponse() {
      const mode = storage?.getItem("afShadowingIssueReportMock");
      return issueReports.issueReportMockResponse(mode, {
        category: getIssueCategory(),
      });
    }

    return {
      sendRuntimeMessage,
      requestDictionaryCommand,
      postDictionaryCommand,
      fetchDictionarySession,
      dictionaryMockResponse,
      postBackendJson,
      getBackendJson,
      backendJson,
      requestBackendCommand,
      requestBackendCommandDirect,
      issueReportMockResponse,
    };
  }

  window.__afShadowingExtensionCommandClient = {
    createExtensionCommandClient,
  };
})();
