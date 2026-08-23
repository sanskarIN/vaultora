use crate::error::{CommandError, CommandResult, VaultError};
use crate::generator;
use crate::model::{EntryKind, VaultEntry};
use crate::state::AppState;
use chrono::{Duration, Utc};
use serde::Serialize;
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum AuditSeverity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SecurityAuditFinding {
    pub code: &'static str,
    pub severity: AuditSeverity,
    pub entry_id: Uuid,
    pub entry_name: String,
    pub message: &'static str,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SecurityAuditReport {
    pub total_entries: usize,
    pub login_entries: usize,
    pub findings: Vec<SecurityAuditFinding>,
    pub critical_count: usize,
    pub high_count: usize,
    pub medium_count: usize,
    pub low_count: usize,
    pub healthy_login_count: usize,
}

impl SecurityAuditReport {
    pub fn finding_count(&self) -> usize {
        self.findings.len()
    }
}

pub fn analyze(entries: &[VaultEntry]) -> SecurityAuditReport {
    let mut findings = Vec::new();
    let login_entries: Vec<&VaultEntry> = entries
        .iter()
        .filter(|entry| entry.kind == EntryKind::Login)
        .collect();

    let mut secret_groups: HashMap<&str, Vec<&VaultEntry>> = HashMap::new();
    for entry in &login_entries {
        if !entry.secret.is_empty() {
            secret_groups.entry(entry.secret.as_str()).or_default().push(entry);
        }
    }

    for entry in &login_entries {
        if entry.secret.is_empty() {
            findings.push(finding(
                entry,
                "missing_password",
                AuditSeverity::Critical,
                "This login has no password stored.",
            ));
        } else {
            let strength = generator::analyze_password(&entry.secret);
            if strength.score <= 1 {
                findings.push(finding(
                    entry,
                    "very_weak_password",
                    AuditSeverity::High,
                    "This login uses a very weak password.",
                ));
            } else if strength.score == 2 {
                findings.push(finding(
                    entry,
                    "weak_password",
                    AuditSeverity::Medium,
                    "This login uses a password that should be strengthened.",
                ));
            }

            if secret_groups
                .get(entry.secret.as_str())
                .is_some_and(|group| group.len() > 1)
            {
                findings.push(finding(
                    entry,
                    "reused_password",
                    AuditSeverity::High,
                    "This password is reused by another login in the local vault.",
                ));
            }
        }

        if entry.username.trim().is_empty() {
            findings.push(finding(
                entry,
                "missing_username",
                AuditSeverity::Low,
                "This login has no username or account identifier.",
            ));
        }

        if entry.url.trim().is_empty() {
            findings.push(finding(
                entry,
                "missing_url",
                AuditSeverity::Info,
                "This login has no website URL recorded.",
            ));
        } else if entry.url.trim().to_ascii_lowercase().starts_with("http://") {
            findings.push(finding(
                entry,
                "insecure_http_url",
                AuditSeverity::Medium,
                "This login points to an unencrypted HTTP URL.",
            ));
        }

        if Utc::now().signed_duration_since(entry.updated_at) >= Duration::days(365) {
            findings.push(finding(
                entry,
                "stale_login",
                AuditSeverity::Low,
                "This login has not been updated for at least one year.",
            ));
        }
    }

    findings.sort_by(|a, b| {
        b.severity
            .cmp(&a.severity)
            .then_with(|| a.entry_name.to_lowercase().cmp(&b.entry_name.to_lowercase()))
            .then_with(|| a.code.cmp(b.code))
    });

    let critical_count = count(&findings, AuditSeverity::Critical);
    let high_count = count(&findings, AuditSeverity::High);
    let medium_count = count(&findings, AuditSeverity::Medium);
    let low_count = count(&findings, AuditSeverity::Low);
    let unhealthy_ids: std::collections::HashSet<Uuid> = findings
        .iter()
        .filter(|finding| finding.severity >= AuditSeverity::Medium)
        .map(|finding| finding.entry_id)
        .collect();

    SecurityAuditReport {
        total_entries: entries.len(),
        login_entries: login_entries.len(),
        findings,
        critical_count,
        high_count,
        medium_count,
        low_count,
        healthy_login_count: login_entries
            .iter()
            .filter(|entry| !unhealthy_ids.contains(&entry.id))
            .count(),
    }
}

#[tauri::command]
pub fn security_audit(state: State<'_, AppState>) -> CommandResult<SecurityAuditReport> {
    let guard = state
        .session
        .lock()
        .map_err(|_| CommandError::from(VaultError::Storage("session lock poisoned".into())))?;
    let session = guard
        .as_ref()
        .ok_or_else(|| CommandError::from(VaultError::Locked))?;
    Ok(analyze(&session.data.entries))
}

fn finding(
    entry: &VaultEntry,
    code: &'static str,
    severity: AuditSeverity,
    message: &'static str,
) -> SecurityAuditFinding {
    SecurityAuditFinding {
        code,
        severity,
        entry_id: entry.id,
        entry_name: entry.name.clone(),
        message,
    }
}

fn count(findings: &[SecurityAuditFinding], severity: AuditSeverity) -> usize {
    findings
        .iter()
        .filter(|finding| finding.severity == severity)
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::collections::BTreeMap;

    fn login(name: &str, secret: &str) -> VaultEntry {
        let now = Utc::now();
        VaultEntry {
            id: Uuid::new_v4(),
            kind: EntryKind::Login,
            name: name.into(),
            username: "person@example.test".into(),
            url: "https://example.test".into(),
            secret: secret.into(),
            password_history: Vec::new(),
            notes: String::new(),
            fields: BTreeMap::new(),
            tags: Vec::new(),
            favorite: false,
            created_at: now,
            updated_at: now,
        }
    }

    #[test]
    fn audit_detects_reused_passwords_without_returning_secret_material() {
        let entries = vec![login("One", "same-secret-123"), login("Two", "same-secret-123")];
        let report = analyze(&entries);

        assert_eq!(
            report
                .findings
                .iter()
                .filter(|finding| finding.code == "reused_password")
                .count(),
            2
        );
        let serialized = serde_json::to_string(&report).unwrap();
        assert!(!serialized.contains("same-secret-123"));
    }

    #[test]
    fn audit_ignores_secure_notes_for_password_health() {
        let mut note = login("Note", "");
        note.kind = EntryKind::SecureNote;
        let report = analyze(&[note]);
        assert_eq!(report.login_entries, 0);
        assert!(report.findings.is_empty());
    }
}
