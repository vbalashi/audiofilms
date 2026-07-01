(function audioFilmsYoutubeRuntimeContentFacade() {
  function createYoutubeRuntimeController(deps = {}) {
    const environment = deps.environment || {};

    function waitForPlayerResponse() {
      return deps.playerMetadataWorkflow.waitForPlayerResponse({
        extractPlayerResponse,
        fetchFreshPlayerResponse,
        getVideoId: deps.youtubeAdapter.getVideoIdFromUrl,
        recordDebugEvent: deps.recordDebugEvent,
        delay: deps.delay,
      });
    }

    function extractPlayerResponse() {
      return deps.youtubeAdapter.extractPlayerResponseFromDocument(
        environment.document,
        deps.youtubeAdapter.getVideoIdFromUrl(),
      );
    }

    function fetchFreshPlayerResponse() {
      return deps.playerMetadataWorkflow.fetchFreshPlayerResponse({
        videoId: deps.youtubeAdapter.getVideoIdFromUrl(),
        youtubeAdapter: {
          extractPlayerResponseFromText: deps.youtubeAdapter.extractPlayerResponseFromText,
          getCaptionTracks: deps.captionTracks.getCaptionTracks,
        },
        fetch: environment.fetch,
        recordDebugEvent: deps.recordDebugEvent,
      });
    }

    function resetTranscriptPanelState(previousVideoId) {
      deps.transcriptPanelDom.resetTranscriptPanelState({
        document: environment.document,
        previousVideoId,
        currentVideoId: deps.getState().videoId,
        closeOpenTranscriptPanels,
      });
    }

    function closeOpenTranscriptPanels() {
      return deps.transcriptPanelDom.closeOpenTranscriptPanels({
        document: environment.document,
        domUtils: deps.domUtils,
      });
    }

    return {
      waitForPlayerResponse,
      extractPlayerResponse,
      fetchFreshPlayerResponse,
      resetTranscriptPanelState,
      closeOpenTranscriptPanels,
    };
  }

  window.__afShadowingYoutubeRuntimeContentFacade = {
    createYoutubeRuntimeController,
  };
})();
