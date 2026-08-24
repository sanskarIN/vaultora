import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("extension");
const destination = resolve("dist-extension");
const runtimeFiles = ["background.js", "protocol.js", "popup.html", "popup.js", "popup.css"];
const sourceManifest = JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8"));

await rm(destination, { recursive: true, force: true });

async function stageVariant(name, transformManifest) {
  const output = resolve(destination, name);
  await mkdir(output, { recursive: true });

  for (const file of runtimeFiles) {
    await copyFile(resolve(source, file), resolve(output, file));
  }

  const manifest = JSON.parse(JSON.stringify(sourceManifest));
  transformManifest(manifest);
  await writeFile(resolve(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await stageVariant("chromium", (manifest) => {
  delete manifest.browser_specific_settings;
  delete manifest.background.scripts;
});

await stageVariant("firefox", (manifest) => {
  delete manifest.background.service_worker;
});

console.log(`Vaultora Chromium and Firefox extension bundles staged at ${destination}`);
