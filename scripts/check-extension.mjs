import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  VAULTORA_NATIVE_HOST,
  VAULTORA_PROTOCOL_VERSION,
  createCredentialMessage,
  createHelloMessage,
  createMatchesMessage,
  isCredentialMessage,
  isErrorMessage,
  isMatchesMessage,
  isVaultStatusMessage,
  normalizeHttpsOrigin,
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
const allowedPermissions = new Set(["activeTab", "nativeMessaging", "scripting"]);
if (permissions.size !== allowedPermissions.size) {
  throw new Error("Vaultora extension permission count changed unexpectedly.");
}
for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    throw new Error(`Unexpected extension permission: ${permission}`);
  }
}

const hostPermissions = manifest.host_permissions ?? [];
if (hostPermissions.length > 0) {
  throw new Error("Vaultora extension must not request persistent host permissions.");
}

if (manifest.background?.service_worker !== "background.js") {
  throw new Error("Chromium Manifest V3 service worker must remain background.js.");
}
if (!Array.isArray(manifest.background?.scripts) || manifest.background.scripts[0] !== "background.js") {
  throw new Error("Firefox background script fallback must remain background.js.");
}
if (manifest.background?.type !== "module") {
  throw new Error("Vaultora extension background code must stay an ES module.");
}

for (const file of requiredFiles) {
  const source = await readFile(resolve(file), "utf8");
  if (/chrome\.storage|browser\.storage|<all_urls>|\*:\/\/\*\/\*/u.test(source)) {
    throw new Error(`Security policy violation detected in ${file}.`);
  }
}

const background = await readFile(resolve("extension/background.js"), "utf8");
if (!background.includes("getActiveHttpsTab")) {
  throw new Error("Autofill must validate the active HTTPS tab.");
}
if ((background.match(/getActiveHttpsTab\(\)/gu) ?? []).length < 3) {
  throw new Error("Autofill must verify the active tab before and after credential retrieval.");
}
if (!background.includes("scriptingApi.executeScript")) {
  throw new Error("Autofill must use one-shot activeTab script injection.");
}

const popup = await readFile(resolve("extension/popup.js"), "utf8");
if (/credential\.secret|\.secret\b/u.test(popup)) {
  throw new Error("The extension popup must never receive or access credential secrets.");
}

if (VAULTORA_PROTOCOL_VERSION !== 2) {
  throw new Error("Unexpected Vaultora native messaging protocol version.");
}
if (VAULTORA_NATIVE_HOST !== "in.sanskar.vaultora.bridge") {
  throw new Error("Native messaging host identity changed unexpectedly.");
}

const hello = createHelloMessage();
if (
  hello.version !== 2 ||
  hello.type !== "hello" ||
  hello.client !== "vaultora-browser-extension" ||
  typeof hello.request_id !== "string" ||
  hello.request_id.length === 0
) {
  throw new Error("Native messaging hello payload is malformed.");
}

const matchesRequest = createMatchesMessage("https://example.test");
if (matchesRequest.type !== "list-matches" || matchesRequest.origin !== "https://example.test") {
  throw new Error("Origin match request is malformed.");
}

const credentialRequest = createCredentialMessage("https://example.test", "entry-id");
if (
  credentialRequest.type !== "get-credential" ||
  credentialRequest.origin !== "https://example.test" ||
  credentialRequest.entry_id !== "entry-id"
) {
  throw new Error("Credential request is malformed.");
}

if (normalizeHttpsOrigin("https://EXAMPLE.test/login") !== "https://example.test") {
  throw new Error("HTTPS origins must be canonicalized.");
}
if (normalizeHttpsOrigin("http://example.test") !== null) {
  throw new Error("Insecure HTTP origins must be rejected.");
}

if (
  !isVaultStatusMessage({
    version: 2,
    type: "vault-status",
    request_id: "status",
    unlocked: false,
  })
) {
  throw new Error("Valid vault-status messages must be accepted.");
}
if (
  !isMatchesMessage({
    version: 2,
    type: "matches",
    request_id: "matches",
    origin: "https://example.test",
    matches: [],
  })
) {
  throw new Error("Valid matches messages must be accepted.");
}
if (
  !isCredentialMessage({
    version: 2,
    type: "credential",
    request_id: "credential",
    credential: {
      id: "entry-id",
      username: "test@example.test",
      secret: "synthetic-test-secret",
      origin: "https://example.test",
    },
  })
) {
  throw new Error("Valid credential messages must be accepted.");
}
if (
  !isErrorMessage({
    version: 2,
    type: "error",
    request_id: "error",
    code: "locked",
    message: "locked",
  })
) {
  throw new Error("Valid error messages must be accepted.");
}
if (
  isVaultStatusMessage({
    version: 1,
    type: "vault-status",
    request_id: "old",
    unlocked: true,
  })
) {
  throw new Error("Unsupported native messaging protocol versions must be rejected.");
}

console.log("Vaultora extension security, origin, and protocol checks passed.");
