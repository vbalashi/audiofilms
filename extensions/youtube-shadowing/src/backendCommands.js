(function audioFilmsBackendCommandsModule() {
  function parseBackendJsonResponse(response) {
    const text = response?.text || "";
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_error) {
      payload = null;
    }

    const errorMessage = response?.ok
      ? ""
      : payload?.error?.message ||
        payload?.error ||
        payload?.detail ||
        backendErrorFromText(response, text) ||
        response?.error ||
        `HTTP ${response?.status}`;

    return { payload, errorMessage };
  }

  function backendErrorFromText(response, text) {
    const body = String(text || "").trim();
    if (/^<!doctype\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
      if (response?.status === 404) {
        return "Timing endpoint is unavailable on this AudioFilms API.";
      }
      return "Timing endpoint returned HTML instead of JSON.";
    }
    return "";
  }

  function backendCommandRequest(apiBase, operation, body = {}) {
    if (!apiBase) {
      return {
        response: jsonResponse({ error: "AudioFilms backend is disabled." }, false, 400),
      };
    }

    const fetchOptions = { credentials: "omit", method: "GET", headers: { accept: "application/json" } };
    let url;
    if (operation === "practice-timing-create") {
      url = new URL("/api/practice/timing-jobs", `${apiBase}/`);
      fetchOptions.method = "POST";
      fetchOptions.headers["content-type"] = "application/json";
      fetchOptions.body = JSON.stringify(body.payload || {});
    } else if (operation === "issue-report-submit") {
      url = new URL("/api/extension/issue-reports", `${apiBase}/`);
      fetchOptions.method = "POST";
      fetchOptions.headers["content-type"] = "application/json";
      fetchOptions.body = JSON.stringify(body.payload || {});
    } else if (operation === "practice-operation") {
      url = new URL(`/api/practice/operations/${encodeURIComponent(body.operationId || "")}`, `${apiBase}/`);
    } else {
      return {
        response: jsonResponse({ error: "Unsupported backend command." }, false, 400),
      };
    }

    return { url, fetchOptions };
  }

  function jsonResponse(body, ok = true, status = 200) {
    return {
      ok,
      status,
      text: JSON.stringify(body),
    };
  }

  window.__afShadowingBackendCommands = {
    parseBackendJsonResponse,
    backendErrorFromText,
    backendCommandRequest,
    jsonResponse,
  };
})();
