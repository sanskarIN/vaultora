import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const NATIVE_HOST_NAME = "in.sanskar.vaultora.bridge";
export const FIREFOX_EXTENSION_ID = "vaultora@sanskar.in";
export const SUPPORTED_BROWSERS = ["chrome", "chromium", "edge", "firefox"];

export function validateChromiumExtensionId(value) {
  return typeof value === "string" && /^[a-p]{32}$/u.test(value);
}

export function createNativeHostManifest({ browser, executable, extensionId }) {
  if (!SUPPORTED_BROWSERS.includes(browser)) {
    throw new Error(`Unsupported browser: ${browser}`);
  }
  const absoluteExecutable = resolve(executable);
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: "Vaultora local native messaging bridge",
    path: absoluteExecutable,
    type: "stdio",
  };

  if (browser === "firefox") {
    manifest.allowed_extensions = [FIREFOX_EXTENSION_ID];
  } else {
    if (!validateChromiumExtensionId(extensionId)) {
      throw new Error(
        "Chrome, Chromium, and Edge require the exact 32-character extension ID (letters a-p).",
      );
    }
    manifest.allowed_origins = [`chrome-extension://${extensionId}/`];
  }
  return manifest;
}

export function registrationTarget({ platform = process.platform, browser, home = homedir(), env = process.env }) {
  if (!SUPPORTED_BROWSERS.includes(browser)) {
    throw new Error(`Unsupported browser: ${browser}`);
  }

  const fileName = `${NATIVE_HOST_NAME}.json`;

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) throw new Error("LOCALAPPDATA is not available.");
    const manifestPath = join(localAppData, "Vaultora", "NativeMessagingHosts", browser, fileName);
    const registryBase = {
      chrome: "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts",
      chromium: "HKCU\\Software\\Chromium\\NativeMessagingHosts",
      edge: "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts",
      firefox: "HKCU\\Software\\Mozilla\\NativeMessagingHosts",
    }[browser];
    return { manifestPath, registryKey: `${registryBase}\\${NATIVE_HOST_NAME}` };
  }

  if (platform === "darwin") {
    const directory = {
      chrome: join(home, "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"),
      chromium: join(home, "Library", "Application Support", "Chromium", "NativeMessagingHosts"),
      edge: join(home, "Library", "Application Support", "Microsoft Edge", "NativeMessagingHosts"),
      firefox: join(home, "Library", "Application Support", "Mozilla", "NativeMessagingHosts"),
    }[browser];
    return { manifestPath: join(directory, fileName), registryKey: null };
  }

  if (platform === "linux") {
    const configHome = env.XDG_CONFIG_HOME || join(home, ".config");
    const directory = {
      chrome: join(configHome, "google-chrome", "NativeMessagingHosts"),
      chromium: join(configHome, "chromium", "NativeMessagingHosts"),
      edge: join(configHome, "microsoft-edge", "NativeMessagingHosts"),
      firefox: join(home, ".mozilla", "native-messaging-hosts"),
    }[browser];
    return { manifestPath: join(directory, fileName), registryKey: null };
  }

  throw new Error(`Native messaging host installation is not supported on ${platform}.`);
}
