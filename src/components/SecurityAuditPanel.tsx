import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { AuditSeverity, SecurityAuditReport } from "../types";

interface Props {
  onOpenEntry: (entryId: string) => void;
}

export function SecurityAuditPanel({ onOpenEntry }: Props) {
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await api.securityAudit());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not audit the vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="audit-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Local-only analysis</p>
          <h1>Security audit</h1>
          <p className="muted">Vaultora checks password health inside this unlocked session. No secret leaves your device.</p>
        </div>
        <button className="button ghost" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Checking…" : "Run audit again"}
        </button>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading && !report ? (
        <section className="content-card" aria-busy="true">
          <div className="spinner" />
          <p className="muted">Reviewing encrypted login metadata in memory…</p>
        </section>
      ) : report ? (
        <>
          <section className="audit-summary" aria-label="Security audit summary">
            <Metric label="Critical" value={report.critical_count} tone="critical" />
            <Metric label="High" value={report.high_count} tone="high" />
            <Metric label="Medium" value={report.medium_count} tone="medium" />
            <Metric label="Healthy logins" value={report.healthy_login_count} tone="healthy" />
          </section>

          <section className="content-card audit-overview">
            <div>
              <p className="eyebrow">Coverage</p>
              <h2>{report.login_entries} login{report.login_entries === 1 ? "" : "s"} checked</h2>
              <p className="muted">Secure notes and identity records are intentionally excluded from password reuse and strength checks.</p>
            </div>
            <div className="audit-total">
              <strong>{report.findings.length}</strong>
              <span>finding{report.findings.length === 1 ? "" : "s"}</span>
            </div>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Actionable findings</p>
                <h2>{report.findings.length ? "Review these entries" : "No important issues found"}</h2>
              </div>
            </div>

            {report.findings.length === 0 ? (
              <div className="empty-state compact-empty">
                <span aria-hidden="true">✓</span>
                <h3>Your stored logins passed the current local checks.</h3>
                <p className="muted">This audit is a helpful signal, not a guarantee that a credential has never been exposed elsewhere.</p>
              </div>
            ) : (
              <div className="audit-findings">
                {report.findings.map((finding) => (
                  <button
                    key={`${finding.entry_id}:${finding.code}`}
                    className="audit-finding"
                    onClick={() => onOpenEntry(finding.entry_id)}
                  >
                    <SeverityBadge severity={finding.severity} />
                    <span className="audit-finding-copy">
                      <strong>{finding.entry_name}</strong>
                      <span>{finding.message}</span>
                    </span>
                    <span className="audit-open" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="security-note" role="note">
            <strong>Privacy note:</strong> duplicate detection and strength scoring run against the unlocked vault in memory. The audit response contains finding metadata only; it does not return passwords.
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`audit-metric audit-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return <span className={`severity severity-${severity}`}>{severity}</span>;
}
