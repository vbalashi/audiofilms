(function audioFilmsAccountSessionWorkflow() {
  function createAccountSessionWorkflow({
    state,
    chrome,
    accountSession,
    sendRuntimeMessage,
    fetchDictionarySession,
    recordDebugEvent,
    render,
    onLookupRefresh,
  } = {}) {
    async function sync() {
      try {
        const session = await getFreshSession();
        setSessionState(session, "");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        recordDebugEvent("connect-session-sync-failed", { error: message });
        setSessionState(null, message);
      }
      render();
    }

    async function connect() {
      state.accountLoading = true;
      state.accountError = "";
      render();

      try {
        const response = await sendRuntimeMessage({
          type: "af-connect-2000nl",
        });
        if (!response?.ok) {
          throw new Error(response?.error || "2000NL authorization failed.");
        }
        setSessionState(response.session, "");
        if (state.selectedWord) {
          onLookupRefresh(state.selectedWord);
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        recordDebugEvent("connect-session-connect-failed", { error: message });
        setSessionState(null, message);
      } finally {
        state.accountLoading = false;
        render();
      }
    }

    async function disconnect() {
      state.accountLoading = true;
      state.accountError = "";
      render();

      try {
        await sendRuntimeMessage({
          type: "af-disconnect-2000nl",
        });
        setSessionState(null, "");
        if (state.selectedWord) {
          onLookupRefresh(state.selectedWord);
          return;
        }
      } catch (error) {
        state.accountError = error instanceof Error ? error.message : String(error);
      } finally {
        state.accountLoading = false;
        render();
      }
    }

    async function getFreshSession() {
      if (!chrome?.runtime?.sendMessage) {
        return null;
      }
      const response = await sendRuntimeMessage({
        type: "af-get-2000nl-session",
      });
      if (!response?.ok) {
        const message = response?.error || "2000NL session is unavailable.";
        recordDebugEvent("connect-session-refresh-failed", { error: message });
        setSessionState(null, message);
        return null;
      }
      const session = response.session || null;
      const backendSession = session?.user ? await fetchDictionarySession().catch(() => null) : null;
      const mergedSession = accountSession.mergeBackendSession(session, backendSession);
      setSessionState(mergedSession, "");
      return mergedSession || null;
    }

    function setSessionState(session, error) {
      Object.assign(state, accountSession.sessionState(session, error));
    }

    return {
      sync,
      connect,
      disconnect,
      getFreshSession,
      setSessionState,
    };
  }

  window.__afShadowingAccountSessionWorkflow = {
    createAccountSessionWorkflow,
  };
})();
