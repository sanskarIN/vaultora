import { FormEvent, useEffect, useState } from "react";
import type { EntryInput, EntryKind, VaultEntry } from "../types";
import { parseTags } from "../utils";

interface Props {
  entry: VaultEntry | null;
  initialKind?: EntryKind;
  onSave: (input: EntryInput) => Promise<void>;
  onClose: () => void;
}

function blank(kind: EntryKind): EntryInput {
  return {
    kind,
    name: "",
    username: "",
    url: "",
    secret: "",
    notes: "",
    fields: {},
    tags: [],
    favorite: false,
  };
}

export function EntryEditor({ entry, initialKind = "login", onSave, onClose }: Props) {
  const [form, setForm] = useState<EntryInput>(blank(initialKind));
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entry) {
      setForm({
        id: entry.id,
        kind: entry.kind,
        name: entry.name,
        username: entry.username,
        url: entry.url,
        secret: entry.secret,
        notes: entry.notes,
        fields: entry.fields,
        tags: entry.tags,
        favorite: entry.favorite,
      });
      setTags(entry.tags.join(", "));
    } else {
      setForm(blank(initialKind));
      setTags("");
    }
  }, [entry, initialKind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, tags: parseTags(tags) });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  const identity = form.kind === "identity";
  const secureNote = form.kind === "secure_note";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="entry-editor-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Encrypted entry</p>
            <h2 id="entry-editor-title">{entry ? "Edit entry" : "Add entry"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}>×</button>
        </div>
        <form className="editor-grid" onSubmit={submit}>
          <label className="field">
            <span>Type</span>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EntryKind })}>
              <option value="login">Login</option>
              <option value="secure_note">Secure note</option>
              <option value="identity">Identity</option>
            </select>
          </label>
          <label className="field span-2">
            <span>Name</span>
            <input maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          {!secureNote && (
            <label className="field">
              <span>{identity ? "Email / username" : "Username"}</span>
              <input maxLength={320} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
          )}
          {!secureNote && (
            <label className="field">
              <span>{identity ? "Website (optional)" : "Website"}</span>
              <input maxLength={2048} inputMode="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </label>
          )}
          <label className="field span-2">
            <span>{secureNote ? "Protected note body" : identity ? "Sensitive identity value / reference" : "Password"}</span>
            {secureNote ? (
              <textarea rows={8} maxLength={32768} value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
            ) : (
              <input type="password" maxLength={32768} autoComplete="new-password" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
            )}
          </label>
          {identity && (
            <>
              <label className="field"><span>Full name</span><input value={form.fields.full_name ?? ""} onChange={(e) => setForm({ ...form, fields: { ...form.fields, full_name: e.target.value } })} /></label>
              <label className="field"><span>Phone</span><input value={form.fields.phone ?? ""} onChange={(e) => setForm({ ...form, fields: { ...form.fields, phone: e.target.value } })} /></label>
              <label className="field span-2"><span>Address</span><textarea rows={3} value={form.fields.address ?? ""} onChange={(e) => setForm({ ...form, fields: { ...form.fields, address: e.target.value } })} /></label>
            </>
          )}
          {!secureNote && (
            <label className="field span-2">
              <span>Notes</span>
              <textarea rows={4} maxLength={131072} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          )}
          <label className="field span-2">
            <span>Tags <small>comma separated</small></span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, personal" />
          </label>
          <label className="check span-2">
            <input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} />
            <span>Favorite this entry</span>
          </label>
          {error && <div className="alert alert-error span-2" role="alert">{error}</div>}
          <div className="modal-actions span-2">
            <button type="button" className="button ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary" disabled={saving}>{saving ? "Saving…" : "Save encrypted entry"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
