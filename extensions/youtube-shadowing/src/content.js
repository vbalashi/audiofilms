(function audioFilmsYouTubeShadowing() {
  const CONTENT_SCRIPT_REVISION = "content-module-refactor-2026-06-30";

  try {
    bootAudioFilmsYouTubeShadowing();
  } catch (error) {
    const bootDiagnosticsApi = window.__afShadowingModuleRegistry?.resolveBootDiagnostics(window) ||
      createBootDiagnosticsFallback();
    bootDiagnosticsApi.recordBootFailure(error);
    bootDiagnosticsApi.renderBootFailureBadge(error);
  }

  function bootAudioFilmsYouTubeShadowing() {
    const modules = window.__afShadowingModuleRegistry.resolveContentModules(window);
    window.__afShadowingContentRuntimeComposer.bootAudioFilmsYouTubeShadowing({
      modules,
      contentScriptRevision: CONTENT_SCRIPT_REVISION,
      environment: {
        window,
        document,
        chrome,
        fetch,
        navigator,
        crypto: typeof crypto === "undefined" ? null : crypto,
        Audio: typeof Audio === "undefined" ? null : Audio,
        HTMLElement,
        Element,
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
      },
    });
  }
  function createBootDiagnosticsFallback() {
    return {
      recordBootFailure(error) {
        document.documentElement.dataset.afShadowingBoot = "1";
        document.documentElement.dataset.afShadowingBootError =
          (error instanceof Error ? error.message : String(error)).slice(0, 180);
      },
      renderBootFailureBadge(error) {
        const badge = document.createElement("div");
        badge.id = "af-shadowing-boot-failure";
        badge.textContent = `AudioFilms failed to start: ${error instanceof Error ? error.message : String(error)}`;
        badge.style.cssText = [
          "position:fixed",
          "right:12px",
          "bottom:12px",
          "z-index:2147483647",
          "padding:8px 10px",
          "background:#7f1d1d",
          "color:#fff",
          "font:12px system-ui,sans-serif",
          "border-radius:6px",
        ].join(";");
        document.documentElement.appendChild(badge);
      },
    };
  }

})();
