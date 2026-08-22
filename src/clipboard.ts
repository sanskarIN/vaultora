import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

export async function copyWithAutoClear(value: string, timeoutSeconds: number): Promise<void> {
  await writeText(value);
  window.setTimeout(async () => {
    try {
      const current = await readText();
      if (current === value) await writeText("");
    } catch {
      // Best effort: never overwrite clipboard content that may have changed elsewhere.
    }
  }, timeoutSeconds * 1000);
}
