use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

pub const VAULT_DATA_VERSION: u32 = 1;
pub const ENVELOPE_VERSION: u32 = 1;
pub const MAX_PASSWORD_HISTORY: usize = 10;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind {
    Login,
    SecureNote,
    Identity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PasswordHistoryItem {
    pub secret: String,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultEntry {
    pub id: Uuid,
    pub kind: EntryKind,
    pub name: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub secret: String,
    #[serde(default)]
    pub password_history: Vec<PasswordHistoryItem>,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub fields: BTreeMap<String, String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl VaultEntry {
    pub fn record_password_change(&mut self, next_secret: &str, changed_at: DateTime<Utc>) {
        if self.kind != EntryKind::Login || self.secret.is_empty() || self.secret == next_secret {
            return;
        }

        if self
            .password_history
            .last()
            .is_none_or(|item| item.secret != self.secret)
        {
            self.password_history.push(PasswordHistoryItem {
                secret: self.secret.clone(),
                changed_at,
            });
        }

        if self.password_history.len() > MAX_PASSWORD_HISTORY {
            let excess = self.password_history.len() - MAX_PASSWORD_HISTORY;
            self.password_history.drain(0..excess);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EntryInput {
    pub id: Option<Uuid>,
    pub kind: EntryKind,
    pub name: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub secret: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub fields: BTreeMap<String, String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub favorite: bool,
}

impl EntryInput {
    pub fn validate_and_normalize(mut self) -> crate::error::Result<Self> {
        self.name = self.name.trim().to_string();
        self.username = self.username.trim().to_string();
        self.url = self.url.trim().to_string();
        self.tags = self
            .tags
            .into_iter()
            .map(|tag| tag.trim().to_lowercase())
            .filter(|tag| !tag.is_empty())
            .collect();
        self.tags.sort();
        self.tags.dedup();

        if self.name.is_empty() || self.name.chars().count() > 160 {
            return Err(crate::error::VaultError::Validation(
                "entry name must contain 1 to 160 characters".into(),
            ));
        }
        if self.username.chars().count() > 320 {
            return Err(crate::error::VaultError::Validation(
                "username is too long".into(),
            ));
        }
        if self.url.chars().count() > 2048 {
            return Err(crate::error::VaultError::Validation("URL is too long".into()));
        }
        if self.secret.chars().count() > 32_768 || self.notes.chars().count() > 131_072 {
            return Err(crate::error::VaultError::Validation(
                "secret or notes exceed the supported size".into(),
            ));
        }
        if self.tags.len() > 64 || self.tags.iter().any(|tag| tag.chars().count() > 64) {
            return Err(crate::error::VaultError::Validation(
                "too many tags or a tag is too long".into(),
            ));
        }
        if self.fields.len() > 64
            || self.fields.iter().any(|(key, value)| {
                key.chars().count() > 96 || value.chars().count() > 16_384
            })
        {
            return Err(crate::error::VaultError::Validation(
                "identity/custom fields exceed supported limits".into(),
            ));
        }
        Ok(self)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EntrySummary {
    pub id: Uuid,
    pub kind: EntryKind,
    pub name: String,
    pub username: String,
    pub url: String,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub updated_at: DateTime<Utc>,
}

impl From<&VaultEntry> for EntrySummary {
    fn from(entry: &VaultEntry) -> Self {
        Self {
            id: entry.id,
            kind: entry.kind,
            name: entry.name.clone(),
            username: entry.username.clone(),
            url: entry.url.clone(),
            tags: entry.tags.clone(),
            favorite: entry.favorite,
            updated_at: entry.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultSettings {
    pub auto_lock_minutes: u16,
    pub clipboard_clear_seconds: u16,
    pub reveal_seconds: u16,
    pub theme: ThemePreference,
}

impl Default for VaultSettings {
    fn default() -> Self {
        Self {
            auto_lock_minutes: 10,
            clipboard_clear_seconds: 30,
            reveal_seconds: 15,
            theme: ThemePreference::System,
        }
    }
}

impl VaultSettings {
    pub fn validate(&self) -> crate::error::Result<()> {
        if !(1..=240).contains(&self.auto_lock_minutes) {
            return Err(crate::error::VaultError::Validation(
                "auto-lock must be between 1 and 240 minutes".into(),
            ));
        }
        if !(5..=300).contains(&self.clipboard_clear_seconds) {
            return Err(crate::error::VaultError::Validation(
                "clipboard timeout must be between 5 and 300 seconds".into(),
            ));
        }
        if !(5..=120).contains(&self.reveal_seconds) {
            return Err(crate::error::VaultError::Validation(
                "reveal timeout must be between 5 and 120 seconds".into(),
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ThemePreference {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultData {
    pub version: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub entries: Vec<VaultEntry>,
    pub settings: VaultSettings,
}

impl VaultData {
    pub fn new() -> Self {
        let now = Utc::now();
        Self {
            version: VAULT_DATA_VERSION,
            created_at: now,
            updated_at: now,
            entries: Vec::new(),
            settings: VaultSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KdfDescriptor {
    pub algorithm: String,
    pub memory_kib: u32,
    pub iterations: u32,
    pub lanes: u32,
    pub salt_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CipherDescriptor {
    pub algorithm: String,
    pub nonce_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultEnvelope {
    pub version: u32,
    pub kdf: KdfDescriptor,
    pub cipher: CipherDescriptor,
    pub ciphertext_b64: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SessionSnapshot {
    pub entries: Vec<EntrySummary>,
    pub settings: VaultSettings,
}

#[derive(Debug, Clone, Serialize)]
pub struct PasswordStrength {
    pub score: u8,
    pub entropy_bits: f64,
    pub label: &'static str,
    pub suggestions: Vec<&'static str>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    fn input(name: &str) -> EntryInput {
        EntryInput {
            id: None,
            kind: EntryKind::Login,
            name: name.into(),
            username: "  user@example.test  ".into(),
            url: " https://example.test ".into(),
            secret: "example-only-secret".into(),
            notes: String::new(),
            fields: BTreeMap::new(),
            tags: vec![" Work ".into(), "work".into(), " Personal ".into()],
            favorite: false,
        }
    }

    fn entry(secret: &str) -> VaultEntry {
        let now = Utc::now();
        VaultEntry {
            id: Uuid::new_v4(),
            kind: EntryKind::Login,
            name: "Example".into(),
            username: String::new(),
            url: String::new(),
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
    fn entry_input_normalizes_names_and_tags() {
        let normalized = input("  Example  ").validate_and_normalize().unwrap();
        assert_eq!(normalized.name, "Example");
        assert_eq!(normalized.username, "user@example.test");
        assert_eq!(normalized.url, "https://example.test");
        assert_eq!(normalized.tags, vec!["personal", "work"]);
    }

    #[test]
    fn entry_input_rejects_blank_name() {
        assert!(matches!(
            input("   ").validate_and_normalize(),
            Err(crate::error::VaultError::Validation(_))
        ));
    }

    #[test]
    fn settings_reject_out_of_range_security_timeouts() {
        let mut settings = VaultSettings::default();
        settings.auto_lock_minutes = 0;
        assert!(settings.validate().is_err());

        let mut settings = VaultSettings::default();
        settings.clipboard_clear_seconds = 301;
        assert!(settings.validate().is_err());

        let mut settings = VaultSettings::default();
        settings.reveal_seconds = 4;
        assert!(settings.validate().is_err());
    }

    #[test]
    fn password_history_records_only_real_login_changes() {
        let mut value = entry("first-secret");
        let changed_at = Utc::now();
        value.record_password_change("second-secret", changed_at);
        assert_eq!(value.password_history.len(), 1);
        assert_eq!(value.password_history[0].secret, "first-secret");
        value.record_password_change("first-secret", changed_at);
        assert_eq!(value.password_history.len(), 1);
    }

    #[test]
    fn password_history_is_bounded_to_latest_items() {
        let mut value = entry("secret-0");
        for index in 1..=(MAX_PASSWORD_HISTORY + 3) {
            let next = format!("secret-{index}");
            value.record_password_change(&next, Utc::now());
            value.secret = next;
        }
        assert_eq!(value.password_history.len(), MAX_PASSWORD_HISTORY);
        assert_eq!(value.password_history.last().unwrap().secret, format!("secret-{}", MAX_PASSWORD_HISTORY + 2));
    }
}
