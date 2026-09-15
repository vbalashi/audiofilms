/**
 * ASR has two independently reusable artifact layers: the expensive
 * word-timestamp transcript and the cheaper caption alignment.
 */
export function asrArtifactRefreshPlan({
  audioExists,
  captionsExist,
  asrExists,
  refreshSource = false,
  refreshAudio = false,
  refreshAsr = false,
} = {}) {
  return {
    refreshAudio: !audioExists || refreshAudio,
    refreshCaptions: !captionsExist || refreshSource,
    refreshAsr: !asrExists || refreshAsr,
  };
}
