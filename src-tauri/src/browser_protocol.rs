use crate::browser::{credential_for_origin, matching_logins, BrowserCredential, BrowserMatch};
use crate::state::VaultSession;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const BROWSER_PROTOCOL_VERSION: u32 = 2;
pub const MAX_NATIVE_MESSAGE_BYTES: usize = 64 * 1024;
pub const MAX_NATIVE_RESPONSE_BYTES: usize = 256 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BrowserRequest {
    pub version: u32,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub request_id: String,
    #[serde(default)]
    pub client: String,
    #[serde(default)]
    pub origin: String,
    #[serde(default)]
    pub entry_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum BrowserResponse {
    VaultStatus {
        version: u32,
        request_id: String,
        unlocked: bool,
    },
    Matches {
        version: u32,
        request_id: String,
        origin: String,
        matches: Vec<BrowserMatch>,
    },
    Credential {
        version: u32,
        request_id: String,
        credential: BrowserCredential,
    },
    Error {
        version: u32,
        request_id: String,
        code: &'static str,
        message: &'static str,
    },
}

fn error(request_id: String, code: &'static str, message: &'static str) -> BrowserResponse {
    BrowserResponse::Error {
        version: BROWSER_PROTOCOL_VERSION,
        request_id,
        code,
        message,
    }
}

pub fn handle_browser_request(
    request: BrowserRequest,
    session: Option<&VaultSession>,
) -> BrowserResponse {
    if request.version != BROWSER_PROTOCOL_VERSION {
        return error(
            request.request_id,
            "unsupported_version",
            "Unsupported Vaultora browser protocol version.",
        );
    }

    if request.request_id.is_empty() || request.request_id.len() > 128 {
        return error(
            request.request_id,
            "invalid_request",
            "Browser request id is missing or invalid.",
        );
    }

    match request.kind.as_str() {
        "hello" => {
            if request.client != "vaultora-browser-extension" {
                return error(
                    request.request_id,
                    "invalid_client",
                    "Browser client identity is not recognized.",
                );
            }
            BrowserResponse::VaultStatus {
                version: BROWSER_PROTOCOL_VERSION,
                request_id: request.request_id,
                unlocked: session.is_some(),
            }
        }
        "get-status" => BrowserResponse::VaultStatus {
            version: BROWSER_PROTOCOL_VERSION,
            request_id: request.request_id,
            unlocked: session.is_some(),
        },
        "list-matches" => {
            let Some(session) = session else {
                return error(
                    request.request_id,
                    "locked",
                    "Unlock Vaultora before requesting site matches.",
                );
            };
            let matches = matching_logins(&session.data.entries, &request.origin);
            let origin = matches
                .first()
                .map(|entry| entry.origin.clone())
                .unwrap_or_default();
            BrowserResponse::Matches {
                version: BROWSER_PROTOCOL_VERSION,
                request_id: request.request_id,
                origin,
                matches,
            }
        }
        "get-credential" => {
            let Some(session) = session else {
                return error(
                    request.request_id,
                    "locked",
                    "Unlock Vaultora before requesting a credential.",
                );
            };
            let Some(entry_id) = request.entry_id else {
                return error(
                    request.request_id,
                    "invalid_request",
                    "Credential request is missing an entry id.",
                );
            };
            let Some(credential) =
                credential_for_origin(&session.data.entries, &request.origin, entry_id)
            else {
                return error(
                    request.request_id,
                    "not_found",
                    "No matching credential is available for this HTTPS origin.",
                );
            };
            BrowserResponse::Credential {
                version: BROWSER_PROTOCOL_VERSION,
                request_id: request.request_id,
                credential,
            }
        }
        _ => error(
            request.request_id,
            "unsupported_request",
            "Unsupported Vaultora browser request.",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(kind: &str) -> BrowserRequest {
        BrowserRequest {
            version: BROWSER_PROTOCOL_VERSION,
            kind: kind.into(),
            request_id: "test-request".into(),
            client: "vaultora-browser-extension".into(),
            origin: String::new(),
            entry_id: None,
        }
    }

    #[test]
    fn hello_reports_locked_without_session() {
        let response = handle_browser_request(request("hello"), None);
        assert_eq!(
            response,
            BrowserResponse::VaultStatus {
                version: BROWSER_PROTOCOL_VERSION,
                request_id: "test-request".into(),
                unlocked: false,
            }
        );
    }

    #[test]
    fn rejects_wrong_protocol_version() {
        let mut value = request("get-status");
        value.version = 1;
        assert!(matches!(
            handle_browser_request(value, None),
            BrowserResponse::Error {
                code: "unsupported_version",
                ..
            }
        ));
    }

    #[test]
    fn rejects_unknown_clients() {
        let mut value = request("hello");
        value.client = "other-extension".into();
        assert!(matches!(
            handle_browser_request(value, None),
            BrowserResponse::Error {
                code: "invalid_client",
                ..
            }
        ));
    }
}
