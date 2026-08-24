use crate::crypto::DerivedVaultKey;
use crate::model::{KdfDescriptor, VaultData};
use crate::storage::VaultStorage;
use std::sync::{Arc, Mutex};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use crate::browser_bridge::BrowserBridge;

pub struct VaultSession {
    pub data: VaultData,
    pub key: DerivedVaultKey,
    pub kdf: KdfDescriptor,
}

pub struct AppState {
    pub storage: VaultStorage,
    pub session: Arc<Mutex<Option<VaultSession>>>,
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    pub browser_bridge: BrowserBridge,
}

impl AppState {
    pub fn new(storage: VaultStorage, app_data_dir: std::path::PathBuf) -> crate::error::Result<Self> {
        let session = Arc::new(Mutex::new(None));

        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        let browser_bridge = BrowserBridge::start(app_data_dir, Arc::clone(&session))?;

        #[cfg(any(target_os = "android", target_os = "ios"))]
        let _ = app_data_dir;

        Ok(Self {
            storage,
            session,
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            browser_bridge,
        })
    }
}
