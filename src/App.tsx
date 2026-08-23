import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { AboutPanel } from "./components/AboutPanel";
import { AuthGate } from "./components/AuthGate";
import { EntryDetails } from "./components/EntryDetails";
import { EntryEditor } from "./components/EntryEditor";
import { GeneratorPanel } from "./components/GeneratorPanel";
import { SecurityAuditPanel } from "./components/SecurityAuditPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { strings } from "./i18n/en";
import type { AppScreen, EntryKind, EntrySummary, SessionSnapshot, VaultEntry } from "./types";
import { applyTheme, filterEntries, kindLabel } from "./utils";

export default function App() {
  const [ready, setReady] = useState(false);
  const [exists, setExists] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [screen, setScreen] = useState<AppScreen>("vault");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<EntryKind | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    void api.vaultExists().then((value) => { setExists(value); setReady(true); }).catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (snapshot) applyTheme(snapshot.settings.theme);
  }, [snapshot?.settings.theme]);

  const lock = useCallback(async () => {
    try { await api.lockVault(); } finally {
      setSnapshot(null); setSelectedId(null); setSelectedEntry(null); setEditorOpen(false); setScreen("vault");
    }
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const activity = () => { lastActivity.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "focus"];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= snapshot.settings.auto_lock_minutes * 60_000) void lock();
    }, 5_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity));
      window.clearInterval(interval);
    };
  }, [snapshot, lock]);

  const visibleEntries = useMemo(
    () => filterEntries(snapshot?.entries ?? [], query, kind, favoritesOnly),
    [snapshot?.entries, query, kind, favoritesOnly],
  );

  async function selectEntry(entry: EntrySummary) {
    setSelectedId(entry.id);
    try { setSelectedEntry(await api.getEntry(entry.id)); }
    catch { setSelectedEntry(null); }
  }

  async function openEntryFromAudit(entryId: string) {
    const entry = snapshot?.entries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    setScreen("vault");
    setQuery("");
    setKind("all");
    setFavoritesOnly(false);
    await selectEntry(entry);
  }

  async function saveEntry(input: Parameters<typeof api.upsertEntry>[0]) {
    const next = await api.upsertEntry(input);
    setSnapshot(next);
    if (input.id) await selectEntry(next.entries.find((entry) => entry.id === input.id) ?? next.entries[0]!);
  }

  async function deleteSelected() {
    if (!selectedId) return;
    const next = await api.deleteEntry(selectedId);
    setSnapshot(next); setSelectedId(null); setSelectedEntry(null);
  }

  async function editSelected() {
    if (!selectedId) return;
    const entry = await api.getEntry(selectedId);
    setEditingEntry(entry); setEditorOpen(true);
  }

  if (!ready) return <main className="loading-screen"><div className="spinner" /><p>Opening Vaultora…</p></main>;
  if (!snapshot) return <AuthGate vaultExists={exists} onVaultCreated={() => setExists(true)} onUnlocked={(value) => { lastActivity.current = Date.now(); setSnapshot(value); }} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/vaultora-mark.svg" alt="" /><div><strong>{strings.appName}</strong><span>Encrypted local vault</span></div></div>
        <nav aria-label="Primary navigation">
          <NavButton active={screen === "vault"} onClick={() => setScreen("vault")} icon="▣">Vault</NavButton>
          <NavButton active={screen === "audit"} onClick={() => setScreen("audit")} icon="◈">Security audit</NavButton>
          <NavButton active={screen === "generator"} onClick={() => setScreen("generator")} icon="✦">Generator</NavButton>
          <NavButton active={screen === "settings"} onClick={() => setScreen("settings")} icon="⚙">Settings</NavButton>
          <NavButton active={screen === "about"} onClick={() => setScreen("about")} icon="ⓘ">About</NavButton>
        </nav>
        <div className="sidebar-footer"><button className="button ghost full" onClick={lock}>{strings.lock}</button><span>{strings.madeBy}</span></div>
      </aside>
      <main className="workspace">
        {screen === "vault" && (
          <>
            <header className="workspace-header"><div><p className="eyebrow">Encrypted locally</p><h1>Your vault</h1></div><button className="button primary" onClick={() => { setEditingEntry(null); setEditorOpen(true); }}>{strings.addEntry}</button></header>
            <div className="toolbar">
              <label className="search-field"><span className="sr-only">Search vault</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={strings.searchPlaceholder} /></label>
              <select aria-label="Entry type" value={kind} onChange={(e) => setKind(e.target.value as EntryKind | "all")}><option value="all">All types</option><option value="login">Logins</option><option value="secure_note">Secure notes</option><option value="identity">Identities</option></select>
              <label className="check compact"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /><span>Favorites</span></label>
            </div>
            <div className="vault-grid">
              <section className="entry-list" aria-label="Vault entries">
                {visibleEntries.length === 0 ? <div className="empty-state"><span>◈</span><h2>{snapshot.entries.length ? strings.noMatches : strings.noEntries}</h2></div> : visibleEntries.map((entry) => (
                  <button key={entry.id} className={`entry-card ${selectedId === entry.id ? "selected" : ""}`} onClick={() => void selectEntry(entry)}>
                    <div className="entry-icon" aria-hidden="true">{entry.kind === "login" ? "↗" : entry.kind === "secure_note" ? "≡" : "◎"}</div>
                    <div className="entry-main"><strong>{entry.name}</strong><span>{entry.username || entry.url || kindLabel(entry.kind)}</span></div>
                    {entry.favorite && <span className="favorite" aria-label="Favorite">★</span>}
                  </button>
                ))}
              </section>
              <section className="detail-region">
                {selectedEntry ? <EntryDetails entry={selectedEntry} settings={snapshot.settings} onEdit={() => void editSelected()} onDelete={deleteSelected} /> : <div className="detail-placeholder"><span>⌁</span><h2>Select an entry</h2><p>Protected values are only loaded when you open an entry.</p></div>}
              </section>
            </div>
          </>
        )}
        {screen === "audit" && <SecurityAuditPanel onOpenEntry={(entryId) => void openEntryFromAudit(entryId)} />}
        {screen === "generator" && <GeneratorPanel settings={snapshot.settings} />}
        {screen === "settings" && <SettingsPanel settings={snapshot.settings} onUpdated={setSnapshot} />}
        {screen === "about" && <AboutPanel />}
      </main>
      {editorOpen && <EntryEditor entry={editingEntry} onClose={() => { setEditorOpen(false); setEditingEntry(null); }} onSave={saveEntry} />}
    </div>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: ReactNode }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span aria-hidden="true">{icon}</span>{children}</button>;
}
