(function audioFilmsDictionaryAudioWorkflow() {
  const dictionaryAudioApi = window.__afShadowingDictionaryAudio;

  async function playHeadwordAudio(card, options = {}) {
    const url = await resolveHeadwordAudioUrl(card, options);
    if (!url || typeof options.AudioConstructor !== "function") return;
    const headword = options.titleForCard?.(card) || "";
    try {
      const audio = new options.AudioConstructor(url);
      audio.preload = "none";
      audio.play().catch((error) => {
        recordAudioFailure(card, headword, error, options);
      });
      options.recordDebugEvent?.("headword-audio-play", {
        cardId: card?.id || "",
        headword,
        source: card?.audio?.source || "",
      });
    } catch (error) {
      recordAudioFailure(card, headword, error, options);
    }
  }

  async function resolveHeadwordAudioUrl(card, options = {}) {
    const directUrl = dictionaryAudioApi.resolvedAudioUrl(card, null);
    if (typeof directUrl === "string") return directUrl;
    const payload = dictionaryAudioApi.audioResolvePayload(card);
    if (!payload) return "";
    options.setPending?.(card.id, true);
    const headword = options.titleForCard?.(card) || "";
    try {
      const result = await options.postDictionaryCommand("audio-resolve", payload);
      const resolved = dictionaryAudioApi.resolvedAudioUrl(card, result);
      if (resolved?.error) throw new Error(resolved.error);
      options.recordDebugEvent?.("headword-audio-resolved", {
        cardId: card.id,
        headword,
        cache: result?.asset?.cache || "",
      });
      return resolved.url || "";
    } catch (error) {
      recordAudioFailure(card, headword, error, options);
      return "";
    } finally {
      options.setPending?.(card.id, false);
    }
  }

  function recordAudioFailure(card, headword, error, options = {}) {
    options.recordDebugEvent?.("headword-audio-failed", {
      cardId: card?.id || "",
      headword,
      error: error?.message || String(error || ""),
    });
  }

  window.__afShadowingDictionaryAudioWorkflow = {
    playHeadwordAudio,
    resolveHeadwordAudioUrl,
  };
})();
