import { FormEvent, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { api } from "../api";
import type { SessionSnapshot, VaultSettings } from "../types";

interface Props {
  settings: VaultSettings;
  onUpdated: (snapshot: SessionSnapshot) => void;
}

export function SettingsPanel({ settings, onUpdated }: Props) {
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setStatus("");
    try {
      const snapshot = await api.updateSettings(draft);
      onUpdated(snapshot);
      setStatus("Security and appearance settings saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save settings."); }
  }

  async function exportBackup() {
    setError(""); setStatus("");
    const path = await save({ defaultPath: "vaultora-backup.vaultora", filters: [{ name: "Vaultora encrypted vault", extensions: ["vaultora"] }] });
    if (!path) return;
    try { await api.exportVault(path); setStatus("Encrypted backup exported."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not export backup."); }
  }

  async function importBackup() {
    setError(""); setStatus("");
    const path = await open({ multiple: false, directory: false, filters: [{ name: "Vaultora encrypted vault", extensions: ["vaultora"] }] });
    if (!path) return;
    if (!window.confirm("Importing replaces the current local vault after the backup is authenticated. Continue?")) return;
    const password = window.prompt("Enter the master password for the selected backup.");
    if (!password) return;
    try { const snapshot = await api.importVault(path, password); onUpdated(snapshot); setStatus("Encrypted backup imported and unlocked."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not import backup."); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setError(""); setStatus("");
    if (newPassword !== confirm) { setError("New master-password confirmation does not match."); return; }
    try {
      await api.changeMasterPassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirm("");
      setStatus("Master password changed. The vault was re-encrypted with a fresh salt and nonce.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change the master password."); }
  }

  return (
    <div className="settings-grid">
      <section className="content-card">
        <p className="eyebrow">Security defaults</p><h2>Lock & clipboard</h2>
        <form className="stack-lg" onSubmit={submit}>
          <label className="field"><span>Auto-lock after inactivity (minutes)</span><input type="number" min="1" max="240" value={draft.auto_lock_minutes} onChange={(e) => setDraft({ ...draft, auto_lock_minutes: Number(e.target.value) })} /></label>
          <label className="field"><span>Clear copied secret after (seconds)</span><input type="number" min="5" max="300" value={draft.clipboard_clear_seconds} onChange={(e) => setDraft({ ...draft, clipboard_clear_seconds: Number(e.target.value) })} /></label>
          <label className="field"><span>Hide revealed secret after (seconds)</span><input type="number" min="5" max="120" value={draft.reveal_seconds} onChange={(e) => setDraft({ ...draft, reveal_seconds: Number(e.target.value) })} /></label>
          <label className="field"><span>Theme</span><select value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value as VaultSettings["theme"] })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <button className="button primary" type="submit">Save settings</button>
        </form>
      </section>
      <section className="content-card">
        <p className="eyebrow">Encrypted portability</p><h2>Backup & restore</h2>
        <p className="muted">Exports remain encrypted with your current master password. Keep backups private and verify that you can restore them.</p>
        <div className="stack"><button className="button primary" onClick={exportBackup}>Export encrypted backup</button><button className="button ghost" onClick={importBackup}>Import encrypted backup</button></div>
      </section>
      <section className="content-card span-2-card">
        <p className="eyebrow">Key rotation</p><h2>Change master password</h2>
        <form className="password-change-grid" onSubmit={changePassword}>
          <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
          <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
          <button className="button primary" type="submit">Re-encrypt with new password</button>
        </form>
      </section>
      {(status || error) && <div className={`alert span-2-card ${error ? "alert-error" : "alert-success"}`} role={error ? "alert" : "status"}>{error || status}</div>}
    </div>
  );
}
