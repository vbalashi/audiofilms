(function audioFilmsDictionaryAudioModule() {
  function cardAudioPlayable(card) {
    return Boolean(card?.audio?.primaryUrl || card?.audio?.resolveToken);
  }

  function audioPendingState(current = {}, cardId, pending) {
    if (!cardId) return current || {};
    const next = { ...(current || {}) };
    if (pending) {
      next[cardId] = true;
    } else {
      delete next[cardId];
    }
    return next;
  }

  function audioResolvePayload(card) {
    if (!card?.audio?.resolveToken || !card?.id) return null;
    return { resolveToken: card.audio.resolveToken };
  }

  function resolvedAudioUrl(card, result) {
    if (card?.audio?.primaryUrl) return card.audio.primaryUrl;
    const url = result?.asset?.url || "";
    if (!url || result?.status !== "ready") {
      return {
        error: result?.error?.message || result?.error?.code || "Audio is not ready.",
      };
    }
    return { url };
  }

  window.__afShadowingDictionaryAudio = {
    cardAudioPlayable,
    audioPendingState,
    audioResolvePayload,
    resolvedAudioUrl,
  };
})();
