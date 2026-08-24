import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  FIREFOX_EXTENSION_ID,
  NATIVE_HOST_NAME,
  createNativeHostManifest,
  registrationTarget,
  validateChromiumExtensionId,
} from "./native-host-config.mjs";

const syntheticExtensionId = "abcdefghijklmnopabcdefghijklmnop";
const syntheticExecutable = process.platform === "win32" ? "C:\\Program Files\\Vaultora\\Vaultora.exe" : "/opt/Vaultora/vaultora";

if (!validateChromiumExtensionId(syntheticExtensionId)) {
  throw new Error("Valid Chromium extension IDs must be accepted.");
}
if (validateChromiumExtensionId("0123456789abcdef0123456789abcdef")) {
  throw new Error("Chromium extension IDs must be limited to letters a-p.");
}

for (const browser of ["chrome", "chromium", "edge"]) {
  const manifest = createNativeHostManifest({
    browser,
    executable: syntheticExecutable,
    extensionId: syntheticExtensionId,
  });
  if (manifest.name !== NATIVE_HOST_NAME || manifest.type !== "stdio") {
    throw new Error(`${browser} native host manifest is malformed.`);
  }
  if (manifest.allowed_origins?.[0] !== `chrome-extension://${syntheticExtensionId}/`) {
    throw new Error(`${browser} native host origin is not exact.`);
  }
  if (manifest.allowed_extensions) {
    throw new Error(`${browser} manifest must not use Firefox allowed_extensions.`);
  }
}

const firefoxManifest = createNativeHostManifest({
  browser: "firefox",
  executable: syntheticExecutable,
});
if (firefoxManifest.allowed_extensions?.[0] !== FIREFOX_EXTENSION_ID) {
  throw new Error("Firefox native host manifest must use the stable Vaultora add-on id.");
}
if (firefoxManifest.allowed_origins) {
  throw new Error("Firefox native host manifest must not use Chromium allowed_origins.");
}

const linuxHome = "/home/vaultora-test";
const linuxChrome = registrationTarget({
  platform: "linux",
  browser: "chrome",
  home: linuxHome,
  env: {},
});
if (!linuxChrome.manifestPath.endsWith(".config/google-chrome/NativeMessagingHosts/in.sanskar.vaultora.bridge.json")) {
  throw new Error("Linux Chrome user-level native host path changed unexpectedly.");
}

const linuxFirefox = registrationTarget({
  platform: "linux",
  browser: "firefox",
  home: linuxHome,
  env: {},
});
if (!linuxFirefox.manifestPath.endsWith(".mozilla/native-messaging-hosts/in.sanskar.vaultora.bridge.json")) {
  throw new Error("Linux Firefox user-level native host path changed unexpectedly.");
}

const macChrome = registrationTarget({
  platform: "darwin",
  browser: "chrome",
  home: "/Users/vaultora-test",
  env: {},
});
if (!macChrome.manifestPath.includes("Library/Application Support/Google/Chrome/NativeMessagingHosts")) {
  throw new Error("macOS Chrome user-level native host path changed unexpectedly.");
}

const windowsEdge = registrationTarget({
  platform: "win32",
  browser: "edge",
  home: "C:\\Users\\vaultora-test",
  env: { LOCALAPPDATA: "C:\\Users\\vaultora-test\\AppData\\Local" },
});
if (windowsEdge.registryKey !== "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\in.sanskar.vaultora.bridge") {
  throw new Error("Windows Edge native host registry key changed unexpectedly.");
}

const bridge = await readFile(resolve("src-tauri/src/browser_bridge.rs"), "utf8");
if (!bridge.includes('TcpListener::bind(("127.0.0.1", 0))')) {
  throw new Error("Desktop browser bridge must stay loopback-only.");
}
if (!bridge.includes("constant_time_eq")) {
  throw new Error("Desktop browser bridge authentication comparison is missing.");
}
if (!bridge.includes("browser-bridge.json")) {
  throw new Error("Desktop browser bridge metadata contract changed unexpectedly.");
}

const nativeHost = await readFile(resolve("src-tauri/src/native_host.rs"), "utf8");
if (!nativeHost.includes("MAX_NATIVE_MESSAGE_BYTES") || !nativeHost.includes("MAX_NATIVE_RESPONSE_BYTES")) {
  throw new Error("Native messaging size limits must remain enforced.");
}
if (!nativeHost.includes("chrome-extension://") || !nativeHost.includes("vaultora@sanskar.in")) {
  throw new Error("Native host browser invocation validation is missing.");
}

const main = await readFile(resolve("src-tauri/src/main.rs"), "utf8");
if (!main.includes("is_native_host_invocation") || !main.includes("native_host::run")) {
  throw new Error("Packaged Vaultora executable must retain native host mode.");
}

console.log("Vaultora native host registration and bridge checks passed.");
