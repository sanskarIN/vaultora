use serde::Serialize;
use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("The vault is locked.")]
    Locked,
    #[error("A vault already exists on this device.")]
    AlreadyExists,
    #[error("No vault exists on this device.")]
    NotFound,
    #[error("The master password is incorrect or the vault is corrupted.")]
    AuthenticationFailed,
    #[error("The supplied input is invalid: {0}")]
    Validation(String),
    #[error("The vault format is unsupported: {0}")]
    UnsupportedFormat(String),
    #[error("Cryptographic operation failed.")]
    Crypto,
    #[error("Storage operation failed: {0}")]
    Storage(String),
    #[error("Serialization failed: {0}")]
    Serialization(String),
}

impl From<io::Error> for VaultError {
    fn from(value: io::Error) -> Self {
        Self::Storage(value.to_string())
    }
}

impl From<serde_json::Error> for VaultError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serialization(value.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: &'static str,
    pub message: String,
}

impl From<VaultError> for CommandError {
    fn from(value: VaultError) -> Self {
        let code = match &value {
            VaultError::Locked => "locked",
            VaultError::AlreadyExists => "already_exists",
            VaultError::NotFound => "not_found",
            VaultError::AuthenticationFailed => "authentication_failed",
            VaultError::Validation(_) => "validation",
            VaultError::UnsupportedFormat(_) => "unsupported_format",
            VaultError::Crypto => "crypto",
            VaultError::Storage(_) => "storage",
            VaultError::Serialization(_) => "serialization",
        };
        Self {
            code,
            message: value.to_string(),
        }
    }
}

pub type Result<T> = std::result::Result<T, VaultError>;
pub type CommandResult<T> = std::result::Result<T, CommandError>;
