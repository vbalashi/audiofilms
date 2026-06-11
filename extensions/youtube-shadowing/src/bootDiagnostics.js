(function audioFilmsBootDiagnostics() {
  const DIAGNOSTIC_BADGE_ID = "af-shadowing-diagnostic-badge";
  const BOOT_DIAGNOSTICS_VERSION = "phase1-boot-diagnostics-2026-06-10";

  function markBootStarted() {
    const diagnostics = {
      contentScriptLoaded: true,
      bootFailed: false,
      version: BOOT_DIAGNOSTICS_VERSION,
      loadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: window.location.href,
      extensionId: getRuntimeId(),
      watchPageDetected: false,
      videoIdDetected: "",
      videoElementDetected: false,
      captionTracksCount: null,
      selectedRetrievalPath: "",
      lastError: "",
    };

    document.documentElement.dataset.afShadowingBoot = "1";
    document.documentElement.dataset.afShadowingBootVersion = BOOT_DIAGNOSTICS_VERSION;
    document.documentElement.dataset.afShadowingBootAt = diagnostics.loadedAt;
    publish(diagnostics);
    window.__afShadowingBoot = diagnostics;
    console.info("[AudioFilms] content script loaded", {
      url: diagnostics.url,
      extensionId: diagnostics.extensionId,
    });
    return diagnostics;
  }

  function recordBootFailure(error) {
    const message = stringifyBootError(error);
    const diagnostics = window.__afShadowingBoot || {
      contentScriptLoaded: true,
      loadedAt: new Date().toISOString(),
      extensionId: getRuntimeId(),
    };

    diagnostics.bootFailed = true;
    diagnostics.failedAt = new Date().toISOString();
    diagnostics.updatedAt = diagnostics.failedAt;
    diagnostics.url = window.location.href;
    diagnostics.lastError = message;
    window.__afShadowingBoot = diagnostics;

    document.documentElement.dataset.afShadowingBoot = "1";
    document.documentElement.dataset.afShadowingBootVersion = BOOT_DIAGNOSTICS_VERSION;
    document.documentElement.dataset.afShadowingBootError = message.slice(0, 180);
    publish(diagnostics);
    console.error("[AudioFilms] content script boot failed", error);
  }

  function renderBootFailureBadge(error) {
    const message = stringifyBootError(error);
    let badge = document.getElementById(DIAGNOSTIC_BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = DIAGNOSTIC_BADGE_ID;
      document.documentElement.appendChild(badge);
    }

    badge.textContent = `AudioFilms failed to start: ${message}`;
    badge.setAttribute("role", "status");
    Object.assign(badge.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      maxWidth: "420px",
      padding: "10px 12px",
      color: "#fee2e2",
      background: "rgba(127, 29, 29, 0.96)",
      border: "1px solid rgba(254, 202, 202, 0.7)",
      borderRadius: "8px",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
      font: "700 12px/1.35 Roboto, Arial, Helvetica, sans-serif",
      whiteSpace: "normal",
    });
  }

  function publish(diagnostics) {
    const snapshot = {
      contentScriptLoaded: Boolean(diagnostics.contentScriptLoaded),
      bootFailed: Boolean(diagnostics.bootFailed),
      version: diagnostics.version || BOOT_DIAGNOSTICS_VERSION,
      loadedAt: diagnostics.loadedAt || "",
      updatedAt: diagnostics.updatedAt || "",
      url: diagnostics.url || window.location.href,
      extensionId: diagnostics.extensionId || "",
      watchPageDetected: Boolean(diagnostics.watchPageDetected),
      videoIdDetected: diagnostics.videoIdDetected || "",
      videoElementDetected: Boolean(diagnostics.videoElementDetected),
      captionTracksCount: diagnostics.captionTracksCount,
      selectedRetrievalPath: diagnostics.selectedRetrievalPath || "",
      lastError: diagnostics.lastError || "",
    };
    document.documentElement.dataset.afShadowingBootState = JSON.stringify(snapshot);
  }

  function stringifyBootError(error) {
    if (error instanceof Error) {
      return error.message || error.name;
    }
    return String(error || "Unknown boot error");
  }

  function getRuntimeId() {
    if (typeof chrome === "undefined") return "";
    return chrome.runtime?.id || "";
  }

  window.__afShadowingBootDiagnostics = {
    version: BOOT_DIAGNOSTICS_VERSION,
    markBootStarted,
    recordBootFailure,
    renderBootFailureBadge,
    publish,
  };
})();
