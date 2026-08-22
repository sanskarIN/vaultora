import { useEffect, useState } from "react";
import { copyWithAutoClear } from "../clipboard";
import { api } from "../api";
import type { PasswordOptions, PassphraseOptions, PasswordStrength, VaultSettings } from "../types";

export function GeneratorPanel({ settings }: { settings: VaultSettings }) {
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>({ length: 24, lowercase: true, uppercase: true, digits: true, symbols: true });
  const [phraseOptions, setPhraseOptions] = useState<PassphraseOptions>({ words: 6, separator: "-", capitalize: false, append_number: false });
  const [result, setResult] = useState("");
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function generate() {
    setError("");
    setStatus("");
    try {
      const generated = mode === "password" ? await api.generatePassword(passwordOptions) : await api.generatePassphrase(phraseOptions);
      setResult(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate a secret.");
    }
  }

  useEffect(() => { void generate(); }, [mode]);
  useEffect(() => {
    if (!result) { setStrength(null); return; }
    let active = true;
    void api.analyzePassword(result).then((value) => active && setStrength(value));
    return () => { active = false; };
  }, [result]);

  return (
    <section className="content-card generator" aria-labelledby="generator-title">
      <p className="eyebrow">CSPRNG powered</p>
      <h2 id="generator-title">Password & passphrase generator</h2>
      <p className="muted">Generation happens locally in the Rust core using the operating system's secure random source.</p>
      <div className="segmented" role="group" aria-label="Generator mode">
        <button aria-pressed={mode === "password"} onClick={() => setMode("password")}>Password</button>
        <button aria-pressed={mode === "passphrase"} onClick={() => setMode("passphrase")}>Passphrase</button>
      </div>
      {mode === "password" ? (
        <div className="generator-options">
          <label className="field"><span>Length: {passwordOptions.length}</span><input type="range" min="12" max="64" value={passwordOptions.length} onChange={(e) => setPasswordOptions({ ...passwordOptions, length: Number(e.target.value) })} /></label>
          {(["lowercase", "uppercase", "digits", "symbols"] as const).map((key) => (
            <label className="check" key={key}><input type="checkbox" checked={passwordOptions[key]} onChange={(e) => setPasswordOptions({ ...passwordOptions, [key]: e.target.checked })} /><span>{key[0].toUpperCase() + key.slice(1)}</span></label>
          ))}
        </div>
      ) : (
        <div className="generator-options">
          <label className="field"><span>Words: {phraseOptions.words}</span><input type="range" min="4" max="12" value={phraseOptions.words} onChange={(e) => setPhraseOptions({ ...phraseOptions, words: Number(e.target.value) })} /></label>
          <label className="field"><span>Separator</span><input maxLength={4} value={phraseOptions.separator} onChange={(e) => setPhraseOptions({ ...phraseOptions, separator: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={phraseOptions.capitalize} onChange={(e) => setPhraseOptions({ ...phraseOptions, capitalize: e.target.checked })} /><span>Capitalize words</span></label>
          <label className="check"><input type="checkbox" checked={phraseOptions.append_number} onChange={(e) => setPhraseOptions({ ...phraseOptions, append_number: e.target.checked })} /><span>Append random number</span></label>
        </div>
      )}
      <div className="generated-output"><code>{result || "Generate a secret"}</code></div>
      {strength && (
        <div className="strength" aria-label={`Estimated strength ${strength.label}`}>
          <div className="strength-bars">{[0,1,2,3,4].map((value) => <span key={value} className={value <= strength.score ? "active" : ""} />)}</div>
          <span>{strength.label.replaceAll("_", " ")} · ~{Math.round(strength.entropy_bits)} estimated bits</span>
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {status && <div className="alert alert-success" role="status">{status}</div>}
      <div className="row">
        <button className="button primary" onClick={generate}>Generate new</button>
        <button
          className="button ghost"
          onClick={() => {
            if (!result) return;
            void copyWithAutoClear(result, settings.clipboard_clear_seconds).then(() =>
              setStatus(`Copied. Clipboard will clear in ${settings.clipboard_clear_seconds} seconds.`),
            );
          }}
          disabled={!result}
        >
          Copy
        </button>
      </div>
      <p className="fine-print">The strength meter is a local heuristic, not a guarantee. Prefer unique generated secrets and multi-factor authentication when a service supports it.</p>
    </section>
  );
}
