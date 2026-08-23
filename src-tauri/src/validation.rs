use crate::error::{Result, VaultError};
use crate::model::{EntryKind, VaultData, VaultEntry, MAX_PASSWORD_HISTORY};
use std::collections::HashSet;
use uuid::Uuid;

const MAX_ENTRIES: usize = 50_000;

impl VaultData {
    pub fn validate_loaded(&self) -> Result<()> {
        self.settings.validate()?;
        if self.entries.len() > MAX_ENTRIES {
            return Err(VaultError::UnsupportedFormat(
                "vault contains more entries than this version supports".into(),
            ));
        }

        let mut ids = HashSet::with_capacity(self.entries.len());
        for entry in &self.entries {
            validate_loaded_entry(entry)?;
            if !ids.insert(entry.id) {
                return Err(VaultError::UnsupportedFormat(
                    "vault contains duplicate entry identifiers".into(),
                ));
            }
        }
        Ok(())
    }
}

fn validate_loaded_entry(entry: &VaultEntry) -> Result<()> {
    let name_length = entry.name.trim().chars().count();
    if name_length == 0 || name_length > 160 {
        return invalid_entry(entry.id, "invalid entry name");
    }
    if entry.username.chars().count() > 320 {
        return invalid_entry(entry.id, "username exceeds supported length");
    }
    if entry.url.chars().count() > 2_048 {
        return invalid_entry(entry.id, "URL exceeds supported length");
    }
    if entry.secret.chars().count() > 32_768 || entry.notes.chars().count() > 131_072 {
        return invalid_entry(entry.id, "secret or notes exceed supported length");
    }
    if entry.tags.len() > 64 || entry.tags.iter().any(|tag| tag.chars().count() > 64) {
        return invalid_entry(entry.id, "tags exceed supported limits");
    }
    if entry.fields.len() > 64
        || entry
            .fields
            .iter()
            .any(|(key, value)| key.chars().count() > 96 || value.chars().count() > 16_384)
    {
        return invalid_entry(entry.id, "custom fields exceed supported limits");
    }
    if entry.password_history.len() > MAX_PASSWORD_HISTORY
        || entry
            .password_history
            .iter()
            .any(|item| item.secret.chars().count() > 32_768)
    {
        return invalid_entry(entry.id, "password history exceeds supported limits");
    }
    if entry.kind != EntryKind::Login && !entry.password_history.is_empty() {
        return invalid_entry(entry.id, "password history is only valid for login entries");
    }
    Ok(())
}

fn invalid_entry<T>(id: Uuid, reason: &str) -> Result<T> {
    Err(VaultError::UnsupportedFormat(format!(
        "entry {id} is invalid: {reason}"
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{PasswordHistoryItem, VaultSettings};
    use chrono::Utc;
    use std::collections::BTreeMap;

    fn valid_entry() -> VaultEntry {
        let now = Utc::now();
        VaultEntry {
            id: Uuid::new_v4(),
            kind: EntryKind::Login,
            name: "Example".into(),
            username: "person@example.test".into(),
            url: "https://example.test".into(),
            secret: "example-only-secret".into(),
            password_history: Vec::new(),
            notes: String::new(),
            fields: BTreeMap::new(),
            tags: vec!["test".into()],
            favorite: false,
            created_at: now,
            updated_at: now,
        }
    }

    fn data_with(entries: Vec<VaultEntry>) -> VaultData {
        let now = Utc::now();
        VaultData {
            version: crate::model::VAULT_DATA_VERSION,
            created_at: now,
            updated_at: now,
            entries,
            settings: VaultSettings::default(),
        }
    }

    #[test]
    fn accepts_current_valid_payload() {
        assert!(data_with(vec![valid_entry()]).validate_loaded().is_ok());
    }

    #[test]
    fn rejects_duplicate_entry_ids() {
        let first = valid_entry();
        let mut second = valid_entry();
        second.id = first.id;
        assert!(matches!(
            data_with(vec![first, second]).validate_loaded(),
            Err(VaultError::UnsupportedFormat(_))
        ));
    }

    #[test]
    fn rejects_history_on_non_login_entry() {
        let mut entry = valid_entry();
        entry.kind = EntryKind::SecureNote;
        entry.password_history.push(PasswordHistoryItem {
            secret: "previous-secret".into(),
            changed_at: Utc::now(),
        });
        assert!(data_with(vec![entry]).validate_loaded().is_err());
    }
}
