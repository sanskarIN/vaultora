import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function text(path) {
  return readFile(resolve(path), "utf8");
}

const mainConfig = JSON.parse(await text("src-tauri/tauri.conf.json"));
const androidConfig = JSON.parse(await text("src-tauri/tauri.android.conf.json"));
const mobileCapability = JSON.parse(await text("src-tauri/capabilities/mobile.json"));
const cargo = await text("src-tauri/Cargo.toml");
const lib = await text("src-tauri/src/lib.rs");
const settingsPanel = await text("src/components/SettingsPanel.tsx");
const backupBridge = await text("src/backupFiles.ts");

if (!mainConfig.identifier || mainConfig.identifier !== "in.sanskar.vaultora") {
  throw new Error("Vaultora must keep a stable reverse-domain application identifier.");
}

const minSdk = androidConfig?.bundle?.android?.minSdkVersion;
if (!Number.isInteger(minSdk) || minSdk < 24) {
  throw new Error("Android minSdkVersion must be an integer of at least 24.");
}

const versionCode = androidConfig?.bundle?.android?.versionCode;
if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error("Android versionCode must be a positive integer.");
}

const platforms = new Set(mobileCapability.platforms ?? []);
if (!platforms.has("android")) {
  throw new Error("The mobile Tauri capability must explicitly include Android.");
}

const permissions = new Set(mobileCapability.permissions ?? []);
for (const required of [
  "core:default",
  "clipboard-manager:allow-read-text",
  "clipboard-manager:allow-write-text",
  "dialog:allow-open",
  "dialog:allow-save",
  "fs:allow-read-file",
  "fs:allow-write-file",
]) {
  if (!permissions.has(required)) {
    throw new Error(`Android capability is missing required permission: ${required}`);
  }
}

if (!/crate-type\s*=\s*\[[^\]]*"staticlib"[^\]]*"cdylib"[^\]]*"rlib"/su.test(cargo)) {
  throw new Error("The Rust library must expose staticlib, cdylib, and rlib crate types for mobile.");
}

for (const plugin of ["tauri-plugin-clipboard-manager", "tauri-plugin-dialog", "tauri-plugin-fs"]) {
  if (!cargo.includes(plugin)) {
    throw new Error(`Cargo.toml is missing mobile-capable dependency: ${plugin}`);
  }
}

if (!lib.includes("#[cfg_attr(mobile, tauri::mobile_entry_point)]")) {
  throw new Error("The Tauri Rust entry point is missing its mobile_entry_point attribute.");
}

if (!lib.includes("tauri_plugin_fs::init()")) {
  throw new Error("The Tauri filesystem plugin must be initialized for Android content URIs.");
}

if (!settingsPanel.includes("exportEncryptedBackup") || !settingsPanel.includes("importEncryptedBackup")) {
  throw new Error("Settings backup actions must use the cross-platform backup file bridge.");
}

if (!backupBridge.includes("readFile") || !backupBridge.includes("writeFile")) {
  throw new Error("The Android backup bridge must use Tauri filesystem read/write operations.");
}

console.log(
  `Vaultora Android readiness checks passed (minSdk ${minSdk}, versionCode ${versionCode}).`,
);
