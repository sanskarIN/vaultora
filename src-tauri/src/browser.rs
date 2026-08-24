use crate::model::{EntryKind, VaultEntry};
use serde::Serialize;
use url::Url;
use uuid::Uuid;

const MAX_BROWSER_URL_LENGTH: usize = 4096;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BrowserOrigin {
    scheme: String,
    host: String,
    port: u16,
}

impl BrowserOrigin {
    pub fn parse(value: &str) -> Option<Self> {
        if value.is_empty() || value.len() > MAX_BROWSER_URL_LENGTH {
            return None;
        }

        let url = Url::parse(value).ok()?;
        if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
            return None;
        }

        let host = url.host_str()?.trim_end_matches('.').to_ascii_lowercase();
        if host.is_empty() {
            return None;
        }

        Some(Self {
            scheme: "https".into(),
            host,
            port: url.port_or_known_default()?,
        })
    }

    pub fn as_string(&self) -> String {
        if self.port == 443 {
            format!("{}://{}", self.scheme, self.host)
        } else {
            format!("{}://{}:{}", self.scheme, self.host, self.port)
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct BrowserMatch {
    pub id: Uuid,
    pub name: String,
    pub username: String,
    pub origin: String,
    pub favorite: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct BrowserCredential {
    pub id: Uuid,
    pub username: String,
    pub secret: String,
    pub origin: String,
}

fn entry_origin(entry: &VaultEntry) -> Option<BrowserOrigin> {
    if entry.kind != EntryKind::Login {
        return None;
    }
    BrowserOrigin::parse(&entry.url)
}

pub fn matching_logins(entries: &[VaultEntry], requested_url: &str) -> Vec<BrowserMatch> {
    let Some(requested_origin) = BrowserOrigin::parse(requested_url) else {
        return Vec::new();
    };

    let mut matches: Vec<_> = entries
        .iter()
        .filter_map(|entry| {
            let origin = entry_origin(entry)?;
            if origin != requested_origin {
                return None;
            }
            Some(BrowserMatch {
                id: entry.id,
                name: entry.name.clone(),
                username: entry.username.clone(),
                origin: origin.as_string(),
                favorite: entry.favorite,
            })
        })
        .collect();

    matches.sort_by(|a, b| {
        b.favorite
            .cmp(&a.favorite)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.username.to_lowercase().cmp(&b.username.to_lowercase()))
    });
    matches
}

pub fn credential_for_origin(
    entries: &[VaultEntry],
    requested_url: &str,
    entry_id: Uuid,
) -> Option<BrowserCredential> {
    let requested_origin = BrowserOrigin::parse(requested_url)?;
    let entry = entries.iter().find(|entry| entry.id == entry_id)?;
    let origin = entry_origin(entry)?;
    if origin != requested_origin || entry.secret.is_empty() {
        return None;
    }

    Some(BrowserCredential {
        id: entry.id,
        username: entry.username.clone(),
        secret: entry.secret.clone(),
        origin: origin.as_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::collections::BTreeMap;

    fn login(url: &str, favorite: bool) -> VaultEntry {
        let now = Utc::now();
        VaultEntry {
            id: Uuid::new_v4(),
            kind: EntryKind::Login,
            name: "Example".into(),
            username: "user@example.test".into(),
            url: url.into(),
            secret: "synthetic-test-secret".into(),
            notes: String::new(),
            fields: BTreeMap::new(),
            tags: Vec::new(),
            favorite,
            created_at: now,
            updated_at: now,
        }
    }

    #[test]
    fn canonicalizes_https_origins() {
        assert_eq!(
            BrowserOrigin::parse("https://EXAMPLE.test/path?q=1")
                .unwrap()
                .as_string(),
            "https://example.test"
        );
        assert_eq!(
            BrowserOrigin::parse("https://example.test:8443/login")
                .unwrap()
                .as_string(),
            "https://example.test:8443"
        );
    }

    #[test]
    fn rejects_insecure_or_credential_bearing_urls() {
        assert!(BrowserOrigin::parse("http://example.test").is_none());
        assert!(BrowserOrigin::parse("javascript:alert(1)").is_none());
        assert!(BrowserOrigin::parse("https://user:pass@example.test").is_none());
    }

    #[test]
    fn matches_only_exact_origins() {
        let exact = login("https://example.test/login", true);
        let subdomain = login("https://accounts.example.test", false);
        let port = login("https://example.test:8443", false);
        let entries = vec![subdomain, port, exact.clone()];

        let matches = matching_logins(&entries, "https://example.test/account");
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, exact.id);
    }

    #[test]
    fn reveals_only_selected_exact_origin_login() {
        let exact = login("https://example.test/login", false);
        let other = login("https://other.test/login", false);
        let entries = vec![exact.clone(), other];

        assert!(credential_for_origin(&entries, "https://example.test", exact.id).is_some());
        assert!(credential_for_origin(&entries, "https://evil.example.test", exact.id).is_none());
    }
}
