(function audioFilmsExtensionCommandClient() {
  function createRuntimeMessageClient({
    chrome,
    setTimeout = globalThis.setTimeout,
    clearTimeout = globalThis.clearTimeout,
    timeoutMs = 15000,
  } = {}) {
    function sendRuntimeMessage(message) {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        return Promise.reject(new Error("Chrome runtime messaging is unavailable"));
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        let timer = null;
        timer = typeof setTimeout === "function"
          ? setTimeout(() => {
            settle(() => reject(new Error(`Chrome runtime message timed out after ${timeoutMs}ms`)));
          }, timeoutMs)
          : null;
        chrome.runtime.sendMessage(message, (response) => {
          settle(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          });
        });

        function settle(callback) {
          if (settled) return;
          settled = true;
          if (timer && typeof clearTimeout === "function") clearTimeout(timer);
          callback();
        }
      });
    }

    return {
      sendRuntimeMessage,
    };
  }

  function createExtensionCommandClient({
    chrome,
    fetch,
    document,
    dictionaryCommands,
    backendCommands,
    dictionaryEndpoint,
    apiBase,
    now = () => new Date().toISOString(),
  } = {}) {
    const runtimeMessageClient = createRuntimeMessageClient({ chrome });
    const { sendRuntimeMessage } = runtimeMessageClient;

    function requestDictionaryCommand(operation, body = null) {
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
      }).then((response) => {
        if (response?.mockCommand) {
          recordDictionaryMockCommand(response.mockCommand);
        }
        return response;
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

    function recordDictionaryMockCommand(command) {
      const commands = Array.isArray(window.__afShadowingDictionaryMockCommands)
        ? window.__afShadowingDictionaryMockCommands
        : [];
      commands.push({
        operation: command.operation || "",
        mockMode: command.mockMode || "",
        body: command.body || null,
        at: command.at || now(),
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

    return {
      sendRuntimeMessage,
      requestDictionaryCommand,
      postDictionaryCommand,
      fetchDictionarySession,
      postBackendJson,
      getBackendJson,
      backendJson,
      requestBackendCommand,
      requestBackendCommandDirect,
    };
  }

  window.__afShadowingExtensionCommandClient = {
    createRuntimeMessageClient,
    createExtensionCommandClient,
  };
})();
