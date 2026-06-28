#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../src/buildInfo.js");

function git(args, fallback = "") {
  try {
    return execFileSync("git", args, {
      cwd: resolve(__dirname, "../../.."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_error) {
    return fallback;
  }
}

const sourceCommit = git(["rev-parse", "HEAD"]);
const shortCommit = git(["rev-parse", "--short", "HEAD"], "unknown");
const builtAt = new Date().toISOString();
const buildId = `audiofilms-extension-${builtAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${shortCommit}`;

const body = `(function audioFilmsExtensionBuildInfo(root) {
  const STATIC_BUILD_INFO = ${JSON.stringify({
    schemaVersion: 1,
    channel: "unpacked-dev",
    buildId,
    sourceCommit,
    builtAt,
  }, null, 4).replace(/\n/g, "\n  ")};
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
`;

writeFileSync(outPath, body, "utf8");
console.log(`Stamped ${outPath}`);
console.log(`buildId=${buildId}`);
console.log(`sourceCommit=${sourceCommit}`);
