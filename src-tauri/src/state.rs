use crate::crypto::DerivedVaultKey;
use crate::model::{KdfDescriptor, VaultData};
use crate::storage::VaultStorage;
use std::sync::Mutex;

pub struct VaultSession {
    pub data: VaultData,
    pub key: DerivedVaultKey,
    pub kdf: KdfDescriptor,
}

pub struct AppState {
    pub storage: VaultStorage,
    pub session: Mutex<Option<VaultSession>>,
}

impl AppState {
    pub fn new(storage: VaultStorage) -> Self {
        Self { storage, session: Mutex::new(None) }
    }
}
