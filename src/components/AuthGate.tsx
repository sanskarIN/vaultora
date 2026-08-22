import { FormEvent, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "../api";
import type { SessionSnapshot } from "../types";
import { strings } from "../i18n/en";

interface Props {
  vaultExists: boolean;
  onUnlocked: (snapshot: SessionSnapshot) => void;
  onVaultCreated: () => void;
}

export function AuthGate({ vaultExists, onUnlocked, onVaultCreated }: Props) {
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!vaultExists && masterPassword !== confirmPassword) {
      setError("The master-password confirmation does not match.");
      return;
    }
    setBusy(true);
    try {
      const snapshot = vaultExists
        ? await api.unlockVault(masterPassword)
        : await api.createVault(masterPassword);
      setMasterPassword("");
      setConfirmPassword("");
      if (!vaultExists) onVaultCreated();
      onUnlocked(snapshot);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to unlock the vault.");
    } finally {
      setBusy(false);
    }
  }

  async function importExisting() {
    setError("");
    const source = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Vaultora encrypted vault", extensions: ["vaultora"] }],
    });
    if (!source) return;
    if (!masterPassword) {
      setError("Enter the imported vault's master password first.");
      return;
    }
    setImporting(true);
    try {
      const snapshot = await api.importVault(source, masterPassword);
      onVaultCreated();
      onUnlocked(snapshot);
      setMasterPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to import the vault.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <img src="/vaultora-mark.svg" alt="" className="brand-mark" />
        <p className="eyebrow">Local-first password manager</p>
        <h1 id="auth-title">{vaultExists ? "Unlock Vaultora" : "Create your encrypted vault"}</h1>
        <p className="muted">{strings.tagline}</p>
        <form onSubmit={submit} className="stack-lg">
          <label className="field">
            <span>Master password</span>
            <input
              autoFocus
              type="password"
              autoComplete={vaultExists ? "current-password" : "new-password"}
              minLength={12}
              maxLength={1024}
              value={masterPassword}
              onChange={(event) => setMasterPassword(event.target.value)}
              required
            />
          </label>
          {!vaultExists && (
            <label className="field">
              <span>Confirm master password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          )}
          {!vaultExists && (
            <div className="security-note" role="note">
              <strong>Important:</strong> Vaultora cannot recover a forgotten master password. Use a long,
              unique password or passphrase and keep a separate recovery copy somewhere safe.
            </div>
          )}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="button primary" type="submit" disabled={busy || importing}>
            {busy ? "Working…" : vaultExists ? "Unlock vault" : "Create encrypted vault"}
          </button>
          {!vaultExists && (
            <button className="button ghost" type="button" onClick={importExisting} disabled={busy || importing}>
              {importing ? "Importing…" : "Import encrypted .vaultora backup"}
            </button>
          )}
        </form>
        <p className="fine-print">No account. No cloud sync. No analytics. {strings.madeBy}.</p>
      </section>
    </main>
  );
}
