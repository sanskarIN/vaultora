use crate::error::{Result, VaultError};
use crate::model::VaultEnvelope;
use std::{fs, io::Write, path::{Path, PathBuf}};

pub const MAX_VAULT_FILE_BYTES: u64 = 64 * 1024 * 1024;

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
        read_envelope_file(&self.vault_path)
    }

    pub fn write(&self, envelope: &VaultEnvelope) -> Result<()> {
        let bytes = serde_json::to_vec_pretty(envelope)?;
        if bytes.len() as u64 > MAX_VAULT_FILE_BYTES {
            return Err(VaultError::Storage("encrypted vault exceeds the supported size limit".into()));
        }
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
        sync_directory(parent)?;
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
        read_envelope_file(source)
    }

    fn temp_path(&self) -> PathBuf { self.vault_path.with_extension("vaultora.tmp") }
    fn backup_path(&self) -> PathBuf { self.vault_path.with_extension("vaultora.bak") }
}

fn read_envelope_file(path: &Path) -> Result<VaultEnvelope> {
    let metadata = fs::metadata(path)?;
    if !metadata.is_file() {
        return Err(VaultError::UnsupportedFormat("vault source is not a regular file".into()));
    }
    if metadata.len() == 0 {
        return Err(VaultError::UnsupportedFormat("vault file is empty".into()));
    }
    if metadata.len() > MAX_VAULT_FILE_BYTES {
        return Err(VaultError::UnsupportedFormat("vault file exceeds the 64 MiB safety limit".into()));
    }
    let bytes = fs::read(path)?;
    serde_json::from_slice::<VaultEnvelope>(&bytes)
        .map_err(|_| VaultError::UnsupportedFormat("invalid Vaultora encrypted envelope".into()))
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<()> { Ok(()) }

#[cfg(unix)]
fn sync_directory(path: &Path) -> Result<()> {
    fs::File::open(path)?.sync_all()?;
    Ok(())
}

#[cfg(not(unix))]
fn sync_directory(_path: &Path) -> Result<()> { Ok(()) }

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

    #[test]
    fn import_rejects_empty_and_oversized_files_before_parsing() {
        let dir = tempfile::tempdir().unwrap();
        let storage = VaultStorage::new(dir.path().join("app")).unwrap();
        let empty = dir.path().join("empty.vaultora");
        fs::write(&empty, []).unwrap();
        assert!(matches!(storage.import_from(&empty), Err(VaultError::UnsupportedFormat(_))));

        let oversized = dir.path().join("oversized.vaultora");
        let file = fs::File::create(&oversized).unwrap();
        file.set_len(MAX_VAULT_FILE_BYTES + 1).unwrap();
        assert!(matches!(storage.import_from(&oversized), Err(VaultError::UnsupportedFormat(_))));
    }

    #[test]
    fn import_rejects_malformed_envelope_without_parser_details() {
        let dir = tempfile::tempdir().unwrap();
        let storage = VaultStorage::new(dir.path().join("app")).unwrap();
        let malformed = dir.path().join("bad.vaultora");
        fs::write(&malformed, b"{ definitely not json }").unwrap();
        let error = storage.import_from(&malformed).unwrap_err().to_string();
        assert!(error.contains("invalid Vaultora encrypted envelope"));
        assert!(!error.contains("line 1"));
    }
}
