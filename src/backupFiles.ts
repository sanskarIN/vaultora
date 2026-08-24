import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { api } from "./api";
import { base64ToBytes, bytesToBase64 } from "./base64";
import type { SessionSnapshot } from "./types";

export async function exportEncryptedBackup(destination: string): Promise<void> {
  const payload = await api.exportVaultBase64();
  await writeFile(destination, base64ToBytes(payload));
}

export async function importEncryptedBackup(
  source: string,
  masterPassword: string,
): Promise<SessionSnapshot> {
  const bytes = await readFile(source);
  const payload = bytesToBase64(bytes);
  return api.importVaultBase64(payload, masterPassword);
}
