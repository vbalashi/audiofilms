(function audioFilmsExtensionConfig(root) {
  const DEFAULT_API_BASE = "https://audiofilms-api.dilum.io";
  const DEFAULT_2000NL_CONNECT_BASE = "https://2000.dilum.io";
  const ENDPOINT_PATHS = {
    subtitles: "/api/practice/captions",
    asrJobs: "/api/asr/jobs",
    dictionary: "/api/dict",
  };

  function storageValue(key) {
    try {
      return root.localStorage?.getItem(key) || "";
    } catch (_error) {
      return "";
    }
  }

  function normalizeBaseUrl(value) {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    return raw || DEFAULT_API_BASE;
  }

  function apiBase() {
    return normalizeBaseUrl(
      storageValue("afShadowingApiBase") ||
      root.__AF_API_BASE ||
      root.AF_API_BASE ||
      DEFAULT_API_BASE,
    );
  }

  function connectBase() {
    return normalizeBaseUrl(
      root.__AF_2000NL_CONNECT_BASE ||
      DEFAULT_2000NL_CONNECT_BASE,
    );
  }

  function endpoint(kind, overrideStorageKey) {
    const override = overrideStorageKey ? storageValue(overrideStorageKey) : "";
    if (override === "off") return "";
    if (override) return override;

    const path = ENDPOINT_PATHS[kind];
    if (!path) return "";
    return new URL(path, `${apiBase()}/`).toString();
  }

  function subtitlesEndpoint() {
    return endpoint("subtitles", "afShadowingBackendSubtitlesUrl");
  }

  function asrJobsEndpoint() {
    return endpoint("asrJobs", "afShadowingLocalAsrUrl");
  }

  function dictionaryEndpoint() {
    return endpoint("dictionary");
  }

  function trustedTesterToken() {
    return root.__AF_ASR_TESTER_TOKEN || "";
  }

  root.__afShadowingConfig = {
    apiBase,
    connectBase,
    endpoint,
    subtitlesEndpoint,
    asrJobsEndpoint,
    dictionaryEndpoint,
    trustedTesterToken,
    defaults: {
      apiBase: DEFAULT_API_BASE,
      connectBase: DEFAULT_2000NL_CONNECT_BASE,
      allowLocalBearerTargets: false,
      endpointPaths: { ...ENDPOINT_PATHS },
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
