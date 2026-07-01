(function audioFilmsBackendBuildWorkflow() {
  async function refreshBackendBuildInfo({
    getState,
    apiBaseForBackendCommands,
    fetch,
    recordDebugEvent = () => {},
    render = () => {},
  } = {}) {
    const apiBase = apiBaseForBackendCommands?.() || "";
    if (!apiBase) return false;

    const state = getState();
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(new URL("/api/health", `${apiBase}/`).toString(), {
        credentials: "omit",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      state.backendBuildInfo = {
        apiBase,
        checkedAt,
        service: body?.service || "",
        status: body?.status || "",
        version: body?.version || "",
        builtAt: body?.builtAt || "",
        commit: body?.commit || "",
      };
      state.backendBuildError = "";
      recordDebugEvent("backend-build-info", {
        apiBase,
        version: state.backendBuildInfo.version,
        builtAt: state.backendBuildInfo.builtAt,
        commit: state.backendBuildInfo.commit,
      });
      return true;
    } catch (error) {
      state.backendBuildInfo = {
        apiBase,
        checkedAt,
      };
      state.backendBuildError = error?.message || String(error || "");
      recordDebugEvent("backend-build-info-failed", {
        apiBase,
        error: state.backendBuildError,
      });
      return false;
    } finally {
      render();
    }
  }

  window.__afShadowingBackendBuildWorkflow = {
    refreshBackendBuildInfo,
  };
})();
