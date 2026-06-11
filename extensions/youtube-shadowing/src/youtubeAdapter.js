(function audioFilmsYouTubeAdapter() {
  function getVideoIdFromUrl(href = window.location.href) {
    const url = new URL(href);
    return url.searchParams.get("v");
  }

  function isWatchPage(href = window.location.href) {
    return Boolean(getVideoIdFromUrl(href));
  }

  function extractPlayerResponseFromDocument(doc = document, currentVideoId = getVideoIdFromUrl()) {
    const scripts = Array.from(doc.scripts);
    for (const script of scripts) {
      const response = extractPlayerResponseFromText(script.textContent || "", currentVideoId);
      if (response) return response;
    }

    const hasCaptionRenderer = doc.documentElement.innerHTML.match(/"playerCaptionsTracklistRenderer":\{/);
    if (hasCaptionRenderer) {
      return null;
    }
    return null;
  }

  function extractPlayerResponseFromText(text, currentVideoId) {
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const markerIndex = text.indexOf("ytInitialPlayerResponse", searchFrom);
      if (markerIndex === -1) return null;
      searchFrom = markerIndex + "ytInitialPlayerResponse".length;

      const assignmentIndex = text.indexOf("=", markerIndex);
      if (assignmentIndex === -1) continue;

      const jsonStart = text.indexOf("{", assignmentIndex);
      if (jsonStart === -1) continue;

      const jsonText = extractBalancedJson(text, jsonStart);
      if (!jsonText) continue;

      try {
        const response = JSON.parse(jsonText);
        const responseVideoId = response?.videoDetails?.videoId;
        if (!currentVideoId || !responseVideoId || responseVideoId === currentVideoId) {
          return response;
        }
      } catch (_error) {
        continue;
      }
    }

    return null;
  }

  function extractBalancedJson(text, startIndex) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(startIndex, index + 1);
        }
      }
    }

    return "";
  }

  function getVideoElement(doc = document) {
    const videos = Array.from(doc.querySelectorAll("video"));
    return videos.find(isUsableYouTubeVideo) || videos.find(isVisibleVideoElement) || videos[0] || null;
  }

  function isUsableYouTubeVideo(video) {
    if (!isVisibleVideoElement(video)) return false;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
    const rect = video.getBoundingClientRect();
    if (rect.width < 180 || rect.height < 100) return false;
    if (video.closest(".ytp-ad-player-overlay, .ytp-ad-module")) return false;
    return true;
  }

  function isVisibleVideoElement(video) {
    if (!(video instanceof HTMLVideoElement)) return false;
    if (!video.isConnected) return false;
    const rect = video.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle(video);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return true;
  }

  window.__afShadowingYouTubeAdapter = {
    getVideoIdFromUrl,
    isWatchPage,
    extractPlayerResponseFromDocument,
    extractPlayerResponseFromText,
    extractBalancedJson,
    getVideoElement,
    isUsableYouTubeVideo,
    isVisibleVideoElement,
  };
})();
