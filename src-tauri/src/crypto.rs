use crate::error::{Result, VaultError};
use crate::model::{CipherDescriptor, KdfDescriptor, VaultData, VaultEnvelope, ENVELOPE_VERSION};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use chacha20poly1305::{aead::{Aead, Payload}, KeyInit, XChaCha20Poly1305, XNonce};
use rand::{rngs::OsRng, RngCore};
use zeroize::Zeroizing;

const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;
const KEY_LEN: usize = 32;
const AAD: &[u8] = b"vaultora:v1:encrypted-vault";
const DEFAULT_MEMORY_KIB: u32 = 65_536;
const DEFAULT_ITERATIONS: u32 = 3;
const DEFAULT_LANES: u32 = 1;

#[derive(Debug)]
pub struct DerivedVaultKey(pub Zeroizing<[u8; KEY_LEN]>);

impl DerivedVaultKey {
    pub fn as_bytes(&self) -> &[u8; KEY_LEN] {
        &self.0
    }
}

pub fn new_salt() -> [u8; SALT_LEN] {
    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    salt
}

pub fn derive_key(password: &str, descriptor: &KdfDescriptor) -> Result<DerivedVaultKey> {
    if descriptor.algorithm != "argon2id" {
        return Err(VaultError::UnsupportedFormat(format!(
            "unsupported KDF {}",
            descriptor.algorithm
        )));
    }
    let salt = STANDARD_NO_PAD
        .decode(&descriptor.salt_b64)
        .map_err(|_| VaultError::UnsupportedFormat("invalid KDF salt".into()))?;
    if salt.len() != SALT_LEN {
        return Err(VaultError::UnsupportedFormat("invalid KDF salt length".into()));
    }
    let params = Params::new(
        descriptor.memory_kib,
        descriptor.iterations,
        descriptor.lanes,
        Some(KEY_LEN),
    )
    .map_err(|_| VaultError::UnsupportedFormat("invalid Argon2 parameters".into()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = Zeroizing::new([0u8; KEY_LEN]);
    argon2
        .hash_password_into(password.as_bytes(), &salt, key.as_mut())
        .map_err(|_| VaultError::Crypto)?;
    Ok(DerivedVaultKey(key))
}

pub fn default_kdf_descriptor(salt: &[u8; SALT_LEN]) -> KdfDescriptor {
    KdfDescriptor {
        algorithm: "argon2id".into(),
        memory_kib: DEFAULT_MEMORY_KIB,
        iterations: DEFAULT_ITERATIONS,
        lanes: DEFAULT_LANES,
        salt_b64: STANDARD_NO_PAD.encode(salt),
    }
}

pub fn encrypt_data(data: &VaultData, key: &DerivedVaultKey, kdf: KdfDescriptor) -> Result<VaultEnvelope> {
    let plaintext = Zeroizing::new(serde_json::to_vec(data)?);
    let mut nonce = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);
    let cipher = XChaCha20Poly1305::new_from_slice(key.as_bytes()).map_err(|_| VaultError::Crypto)?;
    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
            Payload {
                msg: plaintext.as_slice(),
                aad: AAD,
            },
        )
        .map_err(|_| VaultError::Crypto)?;
    Ok(VaultEnvelope {
        version: ENVELOPE_VERSION,
        kdf,
        cipher: CipherDescriptor {
            algorithm: "xchacha20poly1305".into(),
            nonce_b64: STANDARD_NO_PAD.encode(nonce),
        },
        ciphertext_b64: STANDARD_NO_PAD.encode(ciphertext),
    })
}

pub fn decrypt_data(envelope: &VaultEnvelope, password: &str) -> Result<(VaultData, DerivedVaultKey)> {
    if envelope.version != ENVELOPE_VERSION {
        return Err(VaultError::UnsupportedFormat(format!(
            "envelope version {}",
            envelope.version
        )));
    }
    if envelope.cipher.algorithm != "xchacha20poly1305" {
        return Err(VaultError::UnsupportedFormat(format!(
            "unsupported cipher {}",
            envelope.cipher.algorithm
        )));
    }
    let nonce = STANDARD_NO_PAD
        .decode(&envelope.cipher.nonce_b64)
        .map_err(|_| VaultError::UnsupportedFormat("invalid nonce".into()))?;
    if nonce.len() != NONCE_LEN {
        return Err(VaultError::UnsupportedFormat("invalid nonce length".into()));
    }
    let ciphertext = STANDARD_NO_PAD
        .decode(&envelope.ciphertext_b64)
        .map_err(|_| VaultError::UnsupportedFormat("invalid ciphertext encoding".into()))?;
    let key = derive_key(password, &envelope.kdf)?;
    let cipher = XChaCha20Poly1305::new_from_slice(key.as_bytes()).map_err(|_| VaultError::Crypto)?;
    let plaintext = Zeroizing::new(
        cipher
            .decrypt(
                XNonce::from_slice(&nonce),
                Payload {
                    msg: ciphertext.as_slice(),
                    aad: AAD,
                },
            )
            .map_err(|_| VaultError::AuthenticationFailed)?,
    );
    let data: VaultData = serde_json::from_slice(plaintext.as_slice())
        .map_err(|_| VaultError::AuthenticationFailed)?;
    if data.version != crate::model::VAULT_DATA_VERSION {
        return Err(VaultError::UnsupportedFormat(format!(
            "vault data version {}",
            data.version
        )));
    }
    Ok((data, key))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_and_wrong_password_rejection() {
        let salt = new_salt();
        let kdf = default_kdf_descriptor(&salt);
        let key = derive_key("correct horse battery staple", &kdf).unwrap();
        let data = VaultData::new();
        let envelope = encrypt_data(&data, &key, kdf).unwrap();
        let (opened, _) = decrypt_data(&envelope, "correct horse battery staple").unwrap();
        assert_eq!(opened.version, data.version);
        assert!(matches!(
            decrypt_data(&envelope, "wrong password"),
            Err(VaultError::AuthenticationFailed)
        ));
    }

    #[test]
    fn fresh_encryptions_use_unique_nonces() {
        let salt = new_salt();
        let kdf = default_kdf_descriptor(&salt);
        let key = derive_key("correct horse battery staple", &kdf).unwrap();
        let data = VaultData::new();
        let first = encrypt_data(&data, &key, kdf.clone()).unwrap();
        let second = encrypt_data(&data, &key, kdf).unwrap();
        assert_ne!(first.cipher.nonce_b64, second.cipher.nonce_b64);
        assert_ne!(first.ciphertext_b64, second.ciphertext_b64);
    }
}
