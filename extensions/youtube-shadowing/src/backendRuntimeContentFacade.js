(function audioFilmsBackendRuntimeContentFacade() {
  function createBackendRuntimeController(deps = {}) {
    const environment = deps.environment || {};
    const config = environment.config || {};
    const cryptoApi = environment.cryptoApi;
    const dateNow = environment.dateNow || (() => Date.now());
    const random = environment.random || (() => Math.random());

    function apiBaseForBackendCommands() {
      if (typeof config.apiBase === "function") {
        return config.apiBase();
      }
      return "https://audiofilms-api.dilum.io";
    }

    function dictionaryEndpoint() {
      if (typeof config.dictionaryEndpoint === "function") {
        return config.dictionaryEndpoint();
      }
      return new URL("/api/dict", `${apiBaseForBackendCommands()}/`).toString();
    }

    function createMutationTurnId() {
      if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
        return cryptoApi.randomUUID();
      }
      return `af-${dateNow()}-${random().toString(36).slice(2)}`;
    }

    function createSupportCommandPorts({ commandClient, accountSessionWorkflow } = {}) {
      return {
        async syncTwoThousandNlAccount() {
          await accountSessionWorkflow.sync();
        },
        async connectTwoThousandNlAccount() {
          await accountSessionWorkflow.connect();
        },
        async disconnectTwoThousandNlAccount() {
          await accountSessionWorkflow.disconnect();
        },
        async getFreshTwoThousandNlSession() {
          return accountSessionWorkflow.getFreshSession();
        },
        setTwoThousandNlSessionState(session, error) {
          accountSessionWorkflow.setSessionState(session, error);
        },
        fetchDictionarySession() {
          return commandClient.fetchDictionarySession();
        },
        sendRuntimeMessage(message) {
          return commandClient.sendRuntimeMessage(message);
        },
        requestDictionaryCommand(operation, body = null) {
          return commandClient.requestDictionaryCommand(operation, body);
        },
        postBackendJson(operation, body = {}) {
          return commandClient.postBackendJson(operation, body);
        },
        getBackendJson(operation, body = {}) {
          return commandClient.getBackendJson(operation, body);
        },
        requestBackendCommand(operation, body = {}) {
          return commandClient.requestBackendCommand(operation, body);
        },
      };
    }

    return {
      apiBaseForBackendCommands,
      dictionaryEndpoint,
      createMutationTurnId,
      createSupportCommandPorts,
    };
  }

  window.__afShadowingBackendRuntimeContentFacade = {
    createBackendRuntimeController,
  };
})();
