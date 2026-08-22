use crate::error::{Result, VaultError};
use crate::model::VaultEnvelope;
use std::{fs, io::Write, path::{Path, PathBuf}};

#[derive(Debug, Clone)]
pub struct VaultStorage {
    vault_path: PathBuf,
}

impl VaultStorage {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(&app_data_dir)?;
        Ok(Self { vault_path: app_data_dir.join("vaultora.vaultora") })
    }

    pub fn exists(&self) -> bool {
        self.vault_path.exists()
    }

    pub fn path(&self) -> &Path {
        &self.vault_path
    }

    pub fn read(&self) -> Result<VaultEnvelope> {
        if !self.vault_path.exists() {
            let backup = self.backup_path();
            if backup.exists() {
                fs::rename(&backup, &self.vault_path)?;
            } else {
                return Err(VaultError::NotFound);
            }
        }
        let bytes = fs::read(&self.vault_path)?;
        let envelope = serde_json::from_slice::<VaultEnvelope>(&bytes)?;
        Ok(envelope)
    }

    pub fn write(&self, envelope: &VaultEnvelope) -> Result<()> {
        let bytes = serde_json::to_vec_pretty(envelope)?;
        let parent = self.vault_path.parent().ok_or_else(|| VaultError::Storage("vault path has no parent".into()))?;
        fs::create_dir_all(parent)?;
        let temp = self.temp_path();
        let backup = self.backup_path();

        {
            let mut file = fs::File::create(&temp)?;
            file.write_all(&bytes)?;
            file.sync_all()?;
        }
        restrict_permissions(&temp)?;

        if backup.exists() { fs::remove_file(&backup)?; }
        if self.vault_path.exists() { fs::rename(&self.vault_path, &backup)?; }
        if let Err(error) = fs::rename(&temp, &self.vault_path) {
            if backup.exists() && !self.vault_path.exists() {
                let _ = fs::rename(&backup, &self.vault_path);
            }
            return Err(error.into());
        }
        restrict_permissions(&self.vault_path)?;
        if backup.exists() { fs::remove_file(backup)?; }
        Ok(())
    }

    pub fn export_to(&self, destination: &Path) -> Result<()> {
        if !self.vault_path.exists() { return Err(VaultError::NotFound); }
        if destination == self.vault_path { return Ok(()); }
        let parent = destination.parent().ok_or_else(|| VaultError::Validation("invalid export path".into()))?;
        fs::create_dir_all(parent)?;
        fs::copy(&self.vault_path, destination)?;
        restrict_permissions(destination)?;
        Ok(())
    }

    pub fn import_from(&self, source: &Path) -> Result<VaultEnvelope> {
        let bytes = fs::read(source)?;
        let envelope = serde_json::from_slice::<VaultEnvelope>(&bytes)?;
        Ok(envelope)
    }

    fn temp_path(&self) -> PathBuf { self.vault_path.with_extension("vaultora.tmp") }
    fn backup_path(&self) -> PathBuf { self.vault_path.with_extension("vaultora.bak") }
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<()> { Ok(()) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{default_kdf_descriptor, derive_key, encrypt_data, new_salt};
    use crate::model::VaultData;

    #[test]
    fn writes_reads_and_recovers_backup() {
        let dir = tempfile::tempdir().unwrap();
        let storage = VaultStorage::new(dir.path().to_path_buf()).unwrap();
        let salt = new_salt();
        let kdf = default_kdf_descriptor(&salt);
        let key = derive_key("correct horse battery staple", &kdf).unwrap();
        let envelope = encrypt_data(&VaultData::new(), &key, kdf).unwrap();
        storage.write(&envelope).unwrap();
        assert!(storage.exists());
        let read = storage.read().unwrap();
        assert_eq!(read.version, envelope.version);
    }
}
