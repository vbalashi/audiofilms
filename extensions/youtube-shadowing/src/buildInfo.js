(function audioFilmsExtensionBuildInfo(root) {
  const STATIC_BUILD_INFO = {
      "schemaVersion": 1,
      "channel": "unpacked-dev",
      "buildId": "audiofilms-extension-v0.1.7-20260630174816-854ac73-dirty",
      "sourceCommit": "854ac7384db575656227a56c54f79e118edd740a",
      "builtAt": "2026-06-30T17:48:16.269Z",
      "buildComment": "fix dictionary grouped search dataset",
      "manifestVersion": "0.1.7",
      "manifestVersionName": "v0.1.7 · 2026-06-30 17:48:16Z · 854ac73 · dirty · fix dictionary grouped search dataset",
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
