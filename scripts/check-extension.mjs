import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFiles = [
  "extension/manifest.json",
  "extension/background.js",
  "extension/popup.html",
  "extension/popup.js",
  "extension/popup.css",
];

const manifest = JSON.parse(await readFile(resolve("extension/manifest.json"), "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("Vaultora extension must use Manifest V3.");
}

const permissions = new Set(manifest.permissions ?? []);
const allowedPermissions = new Set(["activeTab", "nativeMessaging"]);
for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    throw new Error(`Unexpected extension permission: ${permission}`);
  }
}

const hostPermissions = manifest.host_permissions ?? [];
if (hostPermissions.length > 0) {
  throw new Error("Vaultora extension must not request persistent host permissions in this release.");
}

for (const file of requiredFiles) {
  const text = await readFile(resolve(file), "utf8");
  if (/chrome\.storage|browser\.storage|<all_urls>|\*:\/\/\*\/\*/u.test(text)) {
    throw new Error(`Security policy violation detected in ${file}.`);
  }
}

console.log("Vaultora extension security checks passed.");
