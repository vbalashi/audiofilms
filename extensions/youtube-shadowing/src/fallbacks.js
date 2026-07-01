(function audioFilmsFallbacks() {
  function createBootDiagnosticsFallback() {
    const version = "missing-boot-diagnostics-helper";
    const publish = (diagnostics) => {
      document.documentElement.dataset.afShadowingBootState = JSON.stringify(diagnostics);
    };

    return {
      markBootStarted() {
        const diagnostics = {
          contentScriptLoaded: true,
          bootFailed: false,
          version,
          loadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url: window.location.href,
          extensionId: "",
          watchPageDetected: false,
          videoIdDetected: "",
          videoElementDetected: false,
          captionTracksCount: null,
          selectedRetrievalPath: "",
          lastError: "",
        };
        document.documentElement.dataset.afShadowingBoot = "1";
        document.documentElement.dataset.afShadowingBootVersion = version;
        publish(diagnostics);
        return diagnostics;
      },
      recordBootFailure(error) {
        console.error("[AudioFilms] content script boot failed", error);
      },
      renderBootFailureBadge() {},
      publish,
    };
  }

  function createPhraseFallback() {
    const cleanPhraseText = (text) => text
      .replace(/\s*(?:\.{3}|…)\s*(?=\p{L})/gu, " ")
      .replace(/^(?:\.{3}|…)\s*/, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const hasSentenceEnding = (text) => /(?:[.!?]|\.{3}|…|।|؟)$/.test(text.trim());
    const shouldJoinAfterEllipsis = (currentText, nextText) => (
      /(?:\.{3}|…)$/.test(String(currentText || "").trim())
      && /^\p{N}/u.test(String(nextText || "").trim())
    );
    const wordCount = (text) => {
      const matches = String(text || "").match(/[\p{L}\p{N}]+/gu);
      return matches ? matches.length : 0;
    };

    return {
      buildPhrases(cues, options = {}) {
        const maxPhraseDurationMs = options.maxPhraseDurationMs ?? 12000;
        const longPauseMs = options.longPauseMs ?? 1000;
        const maxWords = options.maxWords ?? 18;
        const maxCharacters = options.maxCharacters ?? 140;
        const phrases = [];
        let current = null;

        for (const cue of cues) {
          if (!current) {
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
            continue;
          }

          const pause = cue.startMs - current.endMs;
          const nextDuration = cue.endMs - current.startMs;
          const nextText = cleanPhraseText(`${current.text} ${cue.text}`);
          const shouldBreak =
            (hasSentenceEnding(current.text) && !shouldJoinAfterEllipsis(current.text, cue.text)) ||
            pause > longPauseMs ||
            nextDuration > maxPhraseDurationMs ||
            wordCount(nextText) > maxWords ||
            nextText.length > maxCharacters;

          if (shouldBreak) {
            phrases.push(current);
            current = {
              startMs: cue.startMs,
              endMs: cue.endMs,
              text: cleanPhraseText(cue.text),
              cues: [cue],
            };
          } else {
            current.endMs = Math.max(current.endMs, cue.endMs);
            current.text = nextText;
            current.cues.push(cue);
          }
        }

        if (current) phrases.push(current);
        return phrases.map((phrase, index) => ({ ...phrase, index }));
      },
      cleanPhraseText,
      hasSentenceEnding,
      wordCount,
    };
  }

  function createCaptionTracksFallback() {
    const trackName = (track) => (
      track.name?.simpleText ||
      track.name?.runs?.map((run) => run.text).join("") ||
      track.languageCode ||
      "unknown"
    );
    const sourceDisplayName = (source) => source.name || source.languageCode || "Captions";
    const languageLabelFromSource = (source) => {
      const name = source.name || source.languageCode || "Unknown";
      return name
        .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
        .trim() || name;
    };

    return {
      getCaptionTracks(playerResponse) {
        return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      },
      buildPracticeSources(tracks) {
        return tracks.map((track, index) => ({
          id: `${track.languageCode || "unknown"}:${track.vssId || index}:${index}`,
          index,
          name: trackName(track),
          languageCode: track.languageCode || "",
          track,
          error: "",
          lastError: "",
          lastRetrievalAttempts: [],
          loadedCueSource: "",
          loadedTranscriptResult: null,
        }));
      },
      chooseDefaultPracticeSource(sources) {
        return sources.find((source) => source.track.kind !== "asr") || sources[0] || null;
      },
      describeTrack: trackName,
      trackName,
      sourceDisplayName,
      cueSourceLabel(value) {
        if (!value) return "";
        if (String(value).startsWith("timedtext")) return "timedtext";
        if (value === "youtubei-transcript") return "transcript API";
        if (value === "transcript-dom") return "transcript fallback";
        return "fallback";
      },
      groupPracticeSources(sources) {
        const groups = [];
        const byLanguage = new Map();

        for (const source of sources) {
          const key = source.languageCode || source.name || "unknown";
          if (!byLanguage.has(key)) {
            const label = source.languageCode
              ? `${languageLabelFromSource(source)} (${source.languageCode})`
              : languageLabelFromSource(source);
            const group = { key, label, sources: [] };
            byLanguage.set(key, group);
            groups.push(group);
          }
          byLanguage.get(key).sources.push(source);
        }

        groups.forEach((group) => {
          group.sources.sort((left, right) => {
            const leftAuto = left.track.kind === "asr" ? 1 : 0;
            const rightAuto = right.track.kind === "asr" ? 1 : 0;
            return leftAuto - rightAuto || left.index - right.index;
          });
        });

        return groups;
      },
      languageLabelFromSource,
      formatSourceDebug(source) {
        return {
          id: source.id,
          name: source.name,
          languageCode: source.languageCode,
          kind: source.track.kind || "manual",
          vssId: source.track.vssId || "",
          loadedCueSource: source.loadedCueSource,
          loadedTranscriptResult: source.loadedTranscriptResult,
          lastRetrievalAttempts: source.lastRetrievalAttempts || [],
          error: source.error,
          lastError: source.lastError,
        };
      },
    };
  }

  function createSourceLabelsFallback() {
    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const stripAutoGeneratedSuffix = (value) => {
      const label = normalizeText(value);
      return label
        .replace(/\s*\([^)]*(auto-generated|automatisch gegenereerd|automatic|auto)[^)]*\)\s*/i, "")
        .trim() || label;
    };
    const youtubeTextSourceLabel = (source, result = null) => {
      if (!source) return "";
      if (result?.sourceKind === "asr") return "ASR transcript";
      const rawName = normalizeText(source.name) || normalizeText(source.track?.name?.simpleText) || normalizeText(source.languageCode) || "Captions";
      const baseName = stripAutoGeneratedSuffix(rawName);
      const isAuto = source.track?.kind === "asr" || result?.sourceKind === "auto";
      return isAuto ? `${baseName} (auto-generated)` : baseName;
    };
    const timingEnrichmentLabel = (result = null) => {
      if (!result || result.sourceKind === "asr") return "";
      if (result.timingExactness === "word-level") return "ASR timing";
      if (result.timingExactness === "aligned") return "Aligned timing";
      return "";
    };
    return {
      closedSourceLabel(source, result = null) {
        return [youtubeTextSourceLabel(source, result), timingEnrichmentLabel(result)].filter(Boolean).join(" · ") || "Captions";
      },
      sourceProviderLabel(source, result = null) {
        if (result?.sourceKind === "asr") return "ASR";
        if (source?.track || result?.fetchOrigin?.startsWith("youtube")) return "YouTube";
        if (result?.provider === "audiofilms-practice-timing") return "AudioFilms";
        return result?.provider || "";
      },
      stripAutoGeneratedSuffix,
      timingEnrichmentLabel,
      youtubeTextSourceLabel,
    };
  }

  function createYouTubeAdapterFallback() {
    const getVideoIdFromUrl = (href = window.location.href) => {
      const url = new URL(href);
      return url.searchParams.get("v");
    };

    const extractBalancedJson = (text, startIndex) => {
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
    };

    const extractPlayerResponseFromText = (text, currentVideoId) => {
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
    };

    const isVisibleVideoElement = (video) => {
      if (!(video instanceof HTMLVideoElement)) return false;
      if (!video.isConnected) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(video);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      return true;
    };

    const isUsableYouTubeVideo = (video) => {
      if (!isVisibleVideoElement(video)) return false;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
      const rect = video.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 100) return false;
      if (video.closest(".ytp-ad-player-overlay, .ytp-ad-module")) return false;
      return true;
    };

    return {
      getVideoIdFromUrl,
      isWatchPage(href = window.location.href) {
        return Boolean(getVideoIdFromUrl(href));
      },
      extractPlayerResponseFromDocument(doc = document, currentVideoId = getVideoIdFromUrl()) {
        const scripts = Array.from(doc.scripts);
        for (const script of scripts) {
          const response = extractPlayerResponseFromText(script.textContent || "", currentVideoId);
          if (response) return response;
        }
        return null;
      },
      extractPlayerResponseFromText,
      extractBalancedJson,
      getVideoElement(doc = document) {
        const videos = Array.from(doc.querySelectorAll("video"));
        return videos.find(isUsableYouTubeVideo) || videos.find(isVisibleVideoElement) || videos[0] || null;
      },
      isUsableYouTubeVideo,
      isVisibleVideoElement,
    };
  }

  window.__afShadowingFallbacks = {
    createBootDiagnosticsFallback,
    createPhraseFallback,
    createCaptionTracksFallback,
    createSourceLabelsFallback,
    createYouTubeAdapterFallback,
  };
})();
