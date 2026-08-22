import { useEffect, useState } from "react";
import { copyWithAutoClear } from "../clipboard";
import type { VaultEntry, VaultSettings } from "../types";
import { formatUpdatedAt, kindLabel, safeExternalUrl } from "../utils";

interface Props {
  entry: VaultEntry;
  settings: VaultSettings;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function EntryDetails({ entry, settings, onEdit, onDelete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(false), settings.reveal_seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [revealed, settings.reveal_seconds, entry.id]);

  async function copySecret() {
    await copyWithAutoClear(entry.secret, settings.clipboard_clear_seconds);
    setStatus(`Copied. Clipboard will clear in ${settings.clipboard_clear_seconds} seconds.`);
  }

  async function remove() {
    if (!window.confirm(`Delete “${entry.name}”? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const url = safeExternalUrl(entry.url);
  return (
    <article className="detail-panel" aria-labelledby="detail-title">
      <div className="detail-heading">
        <div>
          <span className="pill">{kindLabel(entry.kind)}</span>
          <h2 id="detail-title">{entry.name}</h2>
          <p className="muted">Updated {formatUpdatedAt(entry.updated_at)}</p>
        </div>
        <div className="row">
          <button className="button ghost" onClick={onEdit}>Edit</button>
          <button className="button danger" onClick={remove} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
      {entry.username && <DetailRow label="Username" value={entry.username} />}
      {entry.url && <DetailRow label="Website" value={url ?? entry.url} link={url ?? undefined} />}
      <div className="secret-block">
        <div>
          <span className="detail-label">Protected value</span>
          <code className="secret-value">{revealed ? entry.secret || "(empty)" : "••••••••••••"}</code>
        </div>
        <div className="row">
          <button className="button ghost" onClick={() => setRevealed((value) => !value)}>{revealed ? "Hide" : "Reveal"}</button>
          <button className="button primary" onClick={copySecret} disabled={!entry.secret}>Copy</button>
        </div>
      </div>
      {Object.entries(entry.fields).filter(([, value]) => value).map(([key, value]) => (
        <DetailRow key={key} label={key.replaceAll("_", " ")} value={value} />
      ))}
      {entry.notes && <DetailRow label="Notes" value={entry.notes} multiline />}
      {entry.tags.length > 0 && <div className="tag-row">{entry.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
      {status && <div className="alert alert-success" role="status">{status}</div>}
    </article>
  );
}

function DetailRow({ label, value, link, multiline = false }: { label: string; value: string; link?: string | undefined; multiline?: boolean }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      {link ? <a href={link} target="_blank" rel="noreferrer">{value}</a> : multiline ? <pre>{value}</pre> : <span>{value}</span>}
    </div>
  );
}
