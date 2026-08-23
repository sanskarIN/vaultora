import { invoke } from "@tauri-apps/api/core";
import type {
  CommandError,
  EntryInput,
  PasswordOptions,
  PassphraseOptions,
  PasswordStrength,
  SecurityAuditReport,
  SessionSnapshot,
  VaultEntry,
  VaultSettings,
} from "./types";

export class VaultoraApiError extends Error {
  readonly code: string;

  constructor(error: unknown) {
    const parsed = normalizeCommandError(error);
    super(parsed.message);
    this.name = "VaultoraApiError";
    this.code = parsed.code;
  }
}

function normalizeCommandError(error: unknown): CommandError {
  if (typeof error === "object" && error !== null) {
    const candidate = error as Partial<CommandError>;
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return { code: candidate.code, message: candidate.message };
    }
  }
  if (typeof error === "string") {
    return { code: "unknown", message: error };
  }
  return { code: "unknown", message: "Vaultora could not complete the requested action." };
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new VaultoraApiError(error);
  }
}

export const api = {
  vaultExists: () => call<boolean>("vault_exists"),
  createVault: (masterPassword: string) =>
    call<SessionSnapshot>("create_vault", { masterPassword }),
  unlockVault: (masterPassword: string) =>
    call<SessionSnapshot>("unlock_vault", { masterPassword }),
  lockVault: () => call<void>("lock_vault"),
  snapshot: () => call<SessionSnapshot>("session_snapshot"),
  getEntry: (id: string) => call<VaultEntry>("get_entry", { id }),
  upsertEntry: (input: EntryInput) => call<SessionSnapshot>("upsert_entry", { input }),
  deleteEntry: (id: string) => call<SessionSnapshot>("delete_entry", { id }),
  updateSettings: (settings: VaultSettings) =>
    call<SessionSnapshot>("update_settings", { settings }),
  generatePassword: (options: PasswordOptions) =>
    call<string>("generate_password", { options }),
  generatePassphrase: (options: PassphraseOptions) =>
    call<string>("generate_passphrase", { options }),
  analyzePassword: (secret: string) =>
    call<PasswordStrength>("analyze_password", { secret }),
  securityAudit: () => call<SecurityAuditReport>("security_audit"),
  exportVault: (destination: string) => call<void>("export_vault", { destination }),
  importVault: (source: string, masterPassword: string) =>
    call<SessionSnapshot>("import_vault", { source, masterPassword }),
  changeMasterPassword: (currentPassword: string, newPassword: string) =>
    call<void>("change_master_password", { currentPassword, newPassword }),
};
