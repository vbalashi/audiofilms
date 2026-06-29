#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../src/buildInfo.js");
const manifestPath = resolve(__dirname, "../manifest.json");
const args = parseArgs(process.argv.slice(2));

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
const dirty = Boolean(git(["status", "--porcelain"]));
const builtAt = new Date().toISOString();
const manifest = readManifest();
const nextVersion = args.version || (args.noBump ? manifest.version : bumpPatchVersion(manifest.version));
const buildComment = args.comment || process.env.AF_EXTENSION_BUILD_COMMENT || "";
const versionName = buildVersionName(nextVersion, builtAt, shortCommit, dirty, buildComment);
const buildId = `audiofilms-extension-v${nextVersion}-${builtAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${shortCommit}${dirty ? "-dirty" : ""}`;

manifest.version = nextVersion;
manifest.version_name = versionName;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const body = `(function audioFilmsExtensionBuildInfo(root) {
  const STATIC_BUILD_INFO = ${JSON.stringify({
    schemaVersion: 1,
    channel: "unpacked-dev",
    buildId,
    sourceCommit,
    builtAt,
    buildComment,
    manifestVersion: nextVersion,
    manifestVersionName: versionName,
    dirty,
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
`;

writeFileSync(outPath, body, "utf8");
console.log(`Updated ${manifestPath}`);
console.log(`Stamped ${outPath}`);
console.log(`version=${nextVersion}`);
console.log(`version_name=${versionName}`);
console.log(`buildId=${buildId}`);
console.log(`sourceCommit=${sourceCommit}`);

function parseArgs(values) {
  const parsed = {
    comment: "",
    noBump: false,
    version: "",
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--comment" || value === "-m") {
      parsed.comment = values[index + 1] || "";
      index += 1;
    } else if (value.startsWith("--comment=")) {
      parsed.comment = value.slice("--comment=".length);
    } else if (value === "--no-bump") {
      parsed.noBump = true;
    } else if (value === "--version") {
      parsed.version = values[index + 1] || "";
      index += 1;
    } else if (value.startsWith("--version=")) {
      parsed.version = value.slice("--version=".length);
    } else if (value === "--help" || value === "-h") {
      printHelpAndExit();
    }
  }
  if (parsed.version && !/^\d+(\.\d+){0,3}$/.test(parsed.version)) {
    throw new Error(`Invalid --version value: ${parsed.version}`);
  }
  return parsed;
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function bumpPatchVersion(version) {
  const parts = String(version || "0.1.0").split(".").map((part) => Number.parseInt(part, 10));
  while (parts.length < 3) parts.push(0);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid manifest version: ${version}`);
  }
  parts[2] += 1;
  return parts.slice(0, 3).join(".");
}

function buildVersionName(version, isoTimestamp, shortCommit, isDirty, comment) {
  const compactTimestamp = isoTimestamp.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  return [
    `v${version}`,
    compactTimestamp,
    shortCommit,
    isDirty ? "dirty" : "clean",
    comment.trim(),
  ].filter(Boolean).join(" · ");
}

function printHelpAndExit() {
  console.log(`Usage: node extensions/youtube-shadowing/scripts/stamp-build-info.mjs [options]

Options:
  --comment, -m <text>  Add a human-readable build note to version_name/buildInfo.
  --version <x.y.z>     Set manifest version explicitly instead of bumping patch.
  --no-bump            Restamp buildInfo.js without changing manifest version.
  --help, -h           Show this help.
`);
  process.exit(0);
}
