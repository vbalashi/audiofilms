(function audioFilmsExtensionBuildInfo(root) {
  const STATIC_BUILD_INFO = {
      "schemaVersion": 1,
      "channel": "unpacked-dev",
      "buildId": "audiofilms-extension-v0.1.9-20260701000000-ab88ddf-dirty",
      "sourceCommit": "ab88ddfba852da1095c44a8b8ca84924b821e7f6",
      "builtAt": "2026-07-01T00:00:00.137Z",
      "buildComment": "content runtime composer extraction",
      "manifestVersion": "0.1.9",
      "manifestVersionName": "v0.1.9 · 2026-07-01 00:00:00Z · ab88ddf · dirty · content runtime composer extraction",
      "dirty": true
  };
  const loadedAt = new Date().toISOString();

  function storageValue(key) {
    try {
      return root.localStorage?.getItem(key) || "";
    } catch (_error) {
      return "";
    }
  }

  function runtimeManifest() {
    try {
      return root.chrome?.runtime?.getManifest?.() || {};
    } catch (_error) {
      return {};
    }
  }

  function runtimeId() {
    try {
      return root.chrome?.runtime?.id || "";
    } catch (_error) {
      return "";
    }
  }

  function buildInfo() {
    const manifest = runtimeManifest();
    const buildId = root.__AF_EXTENSION_BUILD_ID || storageValue("afShadowingExtensionBuildId") || STATIC_BUILD_INFO.buildId;
    const sourceCommit = root.__AF_EXTENSION_COMMIT || storageValue("afShadowingExtensionCommit") || STATIC_BUILD_INFO.sourceCommit;
    const builtAt = root.__AF_EXTENSION_BUILT_AT || storageValue("afShadowingExtensionBuiltAt") || STATIC_BUILD_INFO.builtAt;
    return {
      ...STATIC_BUILD_INFO,
      buildId,
      sourceCommit,
      builtAt,
      loadedAt,
      manifestVersion: manifest.version || "",
      manifestVersionName: manifest.version_name || "",
      manifestName: manifest.name || "",
      extensionId: runtimeId(),
    };
  }

  root.__afShadowingBuildInfo = {
    ...STATIC_BUILD_INFO,
    loadedAt,
    buildInfo,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
