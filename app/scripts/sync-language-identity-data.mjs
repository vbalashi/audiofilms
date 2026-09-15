import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsRoot, '../..');
const dataPath = path.join(scriptsRoot, 'language-identity-data.json');
const extensionDataPath = path.join(repoRoot, 'extensions', 'youtube-shadowing', 'src', 'languageIdentityData.js');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const output = `(function audioFilmsLanguageIdentityData() {\n  window.__afShadowingLanguageIdentityData = ${JSON.stringify(data, null, 2)};\n})();\n`;
fs.writeFileSync(extensionDataPath, output, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, extensionDataPath)}`);
