(function audioFilmsSupportContentFacade() {
  function createSupportControllers(deps = {}) {
    const commandClient = deps.extensionCommandClient.createExtensionCommandClient({
      chrome: deps.chrome,
      fetch: deps.fetch,
      storage: deps.storage,
      document: deps.document,
      dictionaryCommands: deps.dictionaryCommands,
      dictionaryMocks: deps.dictionaryMocks,
      backendCommands: deps.backendCommands,
      issueReports: deps.issueReports,
      dictionaryEndpoint: deps.dictionaryEndpoint,
      apiBase: deps.apiBaseForBackendCommands,
      getIssueCategory: () => deps.getState().issueCategory,
    });

    const accountSessionWorkflow = deps.accountSessionWorkflow.createAccountSessionWorkflow({
      state: deps.getState(),
      chrome: deps.chrome,
      accountSession: deps.accountSession,
      sendRuntimeMessage: commandClient.sendRuntimeMessage,
      fetchDictionarySession: commandClient.fetchDictionarySession,
      recordDebugEvent: deps.recordDebugEvent,
      render: deps.render,
      onLookupRefresh: (selectedWord) => deps.selectLookupWord(selectedWord.word, selectedWord.phraseIndex),
    });

    const issueReportWorkflow = deps.issueReportWorkflow.createIssueReportWorkflow({
      state: deps.getState(),
      issueReports: deps.issueReports,
      formatIssueReport: deps.formatIssueReport,
      sendIssueReportPayload: (payload) => deps.issueReportWorkflow.sendIssueReportPayload(payload, {
        issueReports: deps.issueReports,
        postBackendJson: commandClient.postBackendJson,
        extensionVersion: deps.extensionVersion,
        extensionBuildInfo: deps.extensionBuildInfo,
        backendBuildInfo: deps.getState().backendBuildInfo,
        browserUserAgent: deps.browserUserAgent,
      }),
      recordDebugEvent: deps.recordDebugEvent,
      render: deps.render,
      copyIssueReport: deps.copyIssueReport,
      setTimeout: deps.setTimeout,
    });

    function refreshBackendBuildInfo() {
      return deps.backendBuildWorkflow.refreshBackendBuildInfo({
        getState: deps.getState,
        apiBaseForBackendCommands: deps.apiBaseForBackendCommands,
        fetch: deps.fetch,
        recordDebugEvent: deps.recordDebugEvent,
        render: deps.render,
      });
    }

    return {
      commandClient,
      accountSessionWorkflow,
      issueReportWorkflow,
      refreshBackendBuildInfo,
    };
  }

  window.__afShadowingSupportContentFacade = {
    createSupportControllers,
  };
})();
