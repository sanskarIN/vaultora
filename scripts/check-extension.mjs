import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  VAULTORA_NATIVE_HOST,
  VAULTORA_PROTOCOL_VERSION,
  createHelloMessage,
  isVaultStatusMessage,
} from "../extension/protocol.js";

const requiredFiles = [
  "extension/manifest.json",
  "extension/background.js",
  "extension/protocol.js",
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
  const source = await readFile(resolve(file), "utf8");
  if (/chrome\.storage|browser\.storage|<all_urls>|\*:\/\/\*\/\*/u.test(source)) {
    throw new Error(`Security policy violation detected in ${file}.`);
  }
}

if (VAULTORA_PROTOCOL_VERSION !== 1) {
  throw new Error("Unexpected Vaultora native messaging protocol version.");
}

if (VAULTORA_NATIVE_HOST !== "in.sanskar.vaultora.bridge") {
  throw new Error("Native messaging host identity changed unexpectedly.");
}

const hello = createHelloMessage();
if (hello.version !== 1 || hello.type !== "hello" || hello.client !== "vaultora-browser-extension") {
  throw new Error("Native messaging hello payload is malformed.");
}

if (!isVaultStatusMessage({ version: 1, type: "vault-status", unlocked: false })) {
  throw new Error("Valid vault-status messages must be accepted.");
}

if (isVaultStatusMessage({ version: 2, type: "vault-status", unlocked: true })) {
  throw new Error("Unsupported native messaging protocol versions must be rejected.");
}

console.log("Vaultora extension security and protocol checks passed.");
