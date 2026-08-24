import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const tauriConfig = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
const androidConfig = JSON.parse(await readFile("src-tauri/tauri.android.conf.json", "utf8"));
const extensionManifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
const cargoToml = await readFile("src-tauri/Cargo.toml", "utf8");
const aboutPanel = await readFile("src/components/AboutPanel.tsx", "utf8");

const version = packageJson.version;
if (!/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error(`package.json contains an invalid semantic version: ${version}`);
}

const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/mu)?.[1];
const versions = new Map([
  ["package.json", version],
  ["src-tauri/Cargo.toml", cargoVersion],
  ["src-tauri/tauri.conf.json", tauriConfig.version],
  ["extension/manifest.json", extensionManifest.version],
]);

for (const [file, value] of versions) {
  if (value !== version) {
    throw new Error(`${file} version ${value ?? "<missing>"} does not match ${version}.`);
  }
}

if (!aboutPanel.includes(`Vaultora ${version}`)) {
  throw new Error("The in-app About panel version does not match the release version.");
}

const [major, minor, patch] = version.split(".").map(Number);
const expectedAndroidVersionCode = major * 1_000_000 + minor * 1_000 + patch;
const androidVersionCode = androidConfig.bundle?.android?.versionCode;
if (androidVersionCode !== expectedAndroidVersionCode) {
  throw new Error(
    `Android versionCode ${androidVersionCode} does not match semantic version ${version}; expected ${expectedAndroidVersionCode}.`,
  );
}

console.log(`Vaultora release version ${version} is consistent across all release surfaces.`);
