import { access, chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  NATIVE_HOST_NAME,
  SUPPORTED_BROWSERS,
  createNativeHostManifest,
  registrationTarget,
} from "./native-host-config.mjs";

const execFileAsync = promisify(execFile);
const [action, ...rawArgs] = process.argv.slice(2);

function readOption(name) {
  const prefix = `--${name}=`;
  const value = rawArgs.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

function usage() {
  console.log(`Usage:
  node scripts/native-host.mjs install --browser=chrome|chromium|edge|firefox --executable=/absolute/path/to/Vaultora [--extension-id=<chromium-id>]
  node scripts/native-host.mjs uninstall --browser=chrome|chromium|edge|firefox

Firefox uses the fixed extension id vaultora@sanskar.in. Chromium-family browsers require the exact installed extension id.`);
}

async function requireExecutable(value) {
  if (!value) throw new Error("--executable is required for installation.");
  const path = resolve(value);
  if (!isAbsolute(path)) throw new Error("Native host executable path must be absolute.");
  await access(path, constants.F_OK | constants.X_OK);
  return path;
}

async function setWindowsRegistration(registryKey, manifestPath) {
  await execFileAsync("reg.exe", [
    "ADD",
    registryKey,
    "/ve",
    "/t",
    "REG_SZ",
    "/d",
    manifestPath,
    "/f",
  ]);
}

async function removeWindowsRegistration(registryKey) {
  try {
    await execFileAsync("reg.exe", ["DELETE", registryKey, "/f"]);
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    if (!/unable to find|not found|cannot find/i.test(stderr)) throw error;
  }
}

async function install(browser) {
  const executable = await requireExecutable(readOption("executable"));
  const extensionId = readOption("extension-id");
  const target = registrationTarget({ browser });
  const manifest = createNativeHostManifest({ browser, executable, extensionId });

  await mkdir(dirname(target.manifestPath), { recursive: true });
  await writeFile(target.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  if (process.platform !== "win32") await chmod(target.manifestPath, 0o600);
  if (target.registryKey) await setWindowsRegistration(target.registryKey, target.manifestPath);

  console.log(`Registered ${NATIVE_HOST_NAME} for ${browser}.`);
  console.log(`Manifest: ${target.manifestPath}`);
}

async function uninstall(browser) {
  const target = registrationTarget({ browser });
  if (target.registryKey) await removeWindowsRegistration(target.registryKey);
  await rm(target.manifestPath, { force: true });
  console.log(`Removed ${NATIVE_HOST_NAME} registration for ${browser}.`);
}

if (!action || !["install", "uninstall"].includes(action)) {
  usage();
  process.exitCode = 2;
} else {
  const browser = readOption("browser");
  if (!SUPPORTED_BROWSERS.includes(browser)) {
    usage();
    throw new Error("--browser must be chrome, chromium, edge, or firefox.");
  }

  if (action === "install") await install(browser);
  else await uninstall(browser);
}
