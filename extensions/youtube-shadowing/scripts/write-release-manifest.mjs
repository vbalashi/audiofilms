#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(__dirname, "..");
const manifestPath = resolve(extensionRoot, "manifest.json");
const args = parseArgs(process.argv.slice(2));

const releaseManifest = createReleaseManifest(JSON.parse(readFileSync(manifestPath, "utf8")), {
  allowDirty: args.allowDirty,
});

if (args.out) {
  writeFileSync(args.out, `${JSON.stringify(releaseManifest, null, 2)}\n`, "utf8");
  console.log(`Wrote release manifest: ${args.out}`);
} else {
  process.stdout.write(`${JSON.stringify(releaseManifest, null, 2)}\n`);
}

function createReleaseManifest(manifest, options = {}) {
  const versionName = String(manifest.version_name || "");
  if (!options.allowDirty && /(^| · )dirty( · |$)/.test(versionName)) {
    throw new Error("Refusing to create release manifest from a dirty build stamp. Restamp from a clean tree or pass --allow-dirty for local inspection only.");
  }
  return {
    ...manifest,
    host_permissions: (manifest.host_permissions || []).filter((pattern) => !isLocalhostPermission(pattern)),
  };
}

function isLocalhostPermission(pattern) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(?::|\/*)/.test(String(pattern));
}

function parseArgs(values) {
  const parsed = {
    allowDirty: false,
    out: "",
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--allow-dirty") {
      parsed.allowDirty = true;
    } else if (value === "--out") {
      parsed.out = values[index + 1] || "";
      index += 1;
    } else if (value.startsWith("--out=")) {
      parsed.out = value.slice("--out=".length);
    } else if (value === "--help" || value === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return parsed;
}

function printHelpAndExit() {
  console.log(`Usage: node extensions/youtube-shadowing/scripts/write-release-manifest.mjs [options]

Options:
  --out <path>      Write the release manifest to a file. Defaults to stdout.
  --allow-dirty    Permit local inspection when the dev manifest stamp says dirty.
  --help, -h       Show this help.
`);
  process.exit(0);
}
