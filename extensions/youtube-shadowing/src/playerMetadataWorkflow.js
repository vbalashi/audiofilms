(function audioFilmsPlayerMetadataWorkflow() {
  async function waitForPlayerResponse({
    extractPlayerResponse,
    fetchFreshPlayerResponse,
    getVideoId = () => "",
    recordDebugEvent = () => {},
    delay = () => Promise.resolve(),
    now = () => Date.now(),
    timeoutMs = 10000,
    freshFetchAfterMs = 1000,
  } = {}) {
    const startedAt = now();
    let fetchedFreshPage = false;
    let lastError = "";

    while (now() - startedAt < timeoutMs) {
      const response = extractPlayerResponse();
      if (response) return response;

      if (!fetchedFreshPage && now() - startedAt > freshFetchAfterMs) {
        fetchedFreshPage = true;
        try {
          const freshResponse = await fetchFreshPlayerResponse();
          if (freshResponse) return freshResponse;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          recordDebugEvent("player-metadata-fetch-failed", {
            videoId: getVideoId(),
            error: lastError,
          });
        }
      }

      await delay(250);
    }
    throw new Error(lastError ? `Could not read YouTube player metadata. ${lastError}` : "Could not read YouTube player metadata.");
  }

  async function fetchFreshPlayerResponse({
    videoId = "",
    youtubeAdapter,
    fetch,
    recordDebugEvent = () => {},
  } = {}) {
    if (!videoId) return null;

    recordDebugEvent("player-metadata-fetch-start", { videoId });
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const html = await response.text();

    if (!response.ok) {
      throw new Error(`Fresh watch page request failed: HTTP ${response.status}`);
    }

    const playerResponse = youtubeAdapter.extractPlayerResponseFromText(html, videoId);
    if (!playerResponse) {
      throw new Error("Fresh watch page did not contain current player metadata.");
    }

    recordDebugEvent("player-metadata-fetch-loaded", {
      videoId,
      tracks: youtubeAdapter.getCaptionTracks
        ? youtubeAdapter.getCaptionTracks(playerResponse).length
        : 0,
    });
    return playerResponse;
  }

  window.__afShadowingPlayerMetadataWorkflow = {
    waitForPlayerResponse,
    fetchFreshPlayerResponse,
  };
})();
