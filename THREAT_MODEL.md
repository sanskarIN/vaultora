# Vaultora Threat Model

## Security objective

Vaultora is a local-first password manager. Its primary objective is to keep stored vault contents confidential and tamper-evident when the application is closed or locked, while minimizing the amount of decrypted secret material exposed to the frontend and browser integration layers.

## Protected assets

Vaultora treats the following as sensitive assets:

- Master passwords.
- Derived encryption keys.
- Decrypted logins, secure notes, identities, custom fields, and tags.
- Encrypted vault files and backups, because they remain targets for offline password guessing.
- Clipboard copies of secrets.
- Browser-origin credential requests and responses.

## Trust boundaries

### Rust vault core

The Rust/Tauri backend is the trusted cryptographic and persistence boundary. It derives keys, encrypts/decrypts the vault, validates imported encrypted envelopes, and persists the local vault.

### React frontend

The frontend is trusted to present decrypted values only while the Rust session is unlocked. It should request individual protected entries only when needed and avoid durable secret storage.

### Operating system storage

Application-private storage is treated as persistent but not inherently confidential. Confidentiality is provided by the encrypted vault envelope rather than by filesystem location alone.

### Clipboard

The system clipboard is a shared operating-system resource. Secrets copied there may be visible to other applications according to platform policy. Vaultora mitigates this with configurable automatic clearing but cannot guarantee exclusive ownership of clipboard history.

### Android document provider

User-selected Android backup files may be exposed through a `content://` URI backed by another document provider. Vaultora writes only the encrypted vault envelope to that URI. Decrypted vault JSON is not intentionally exported through this path.

### Browser extension

The browser extension is a less-trusted presentation/integration layer. It must not become a second persistent vault. The extension currently has no credential autofill and stores no vault secrets in browser storage.

### Future native messaging host

The future native host will be a security boundary between the browser and the unlocked desktop vault. It must validate protocol versions, message sizes, request types, browser origin, unlocked state, and requested fields before returning any credential material.

## Cryptographic design

Vaultora uses:

- Argon2id for master-password key derivation.
- A random salt for key derivation.
- XChaCha20-Poly1305 for authenticated encryption.
- A fresh nonce for encryption operations.
- Zeroization for key/password buffers where the Rust types and control flow permit it.

Authenticated decryption failure is treated as an invalid password or corrupted/tampered vault and must never result in partially trusted plaintext being persisted.

## Persistence model

Vault writes use a temporary file and replacement flow. When an existing vault is replaced, a short-lived recovery backup is used so an interrupted rename does not silently destroy the only copy. Runtime backup and temporary files use the same encrypted envelope format.

## Main threats and mitigations

### Offline theft of the vault file

**Threat:** An attacker obtains `vaultora.vaultora` or an exported backup.

**Mitigation:** The file contains an authenticated ciphertext protected by a key derived from the master password with Argon2id. A strong master password remains essential because encrypted vault theft enables offline guessing attempts.

### Vault-file tampering

**Threat:** An attacker modifies ciphertext, nonce, or authenticated vault data.

**Mitigation:** XChaCha20-Poly1305 authentication causes modified data to fail decryption instead of being accepted as valid vault contents.

### Interrupted writes

**Threat:** A crash or power loss happens while updating the vault.

**Mitigation:** Vaultora writes and syncs a temporary encrypted file, preserves a recovery copy during replacement, and restores the backup when the primary file is missing.

### Stale unlocked mobile session

**Threat:** A user backgrounds the Android app and later returns after the configured inactivity interval.

**Mitigation:** The frontend checks elapsed inactivity when visibility returns before recording new foreground activity. Background/resume therefore cannot silently reset the auto-lock timer.

### Clipboard exposure

**Threat:** Another application or clipboard-history service observes a copied password.

**Mitigation:** Vaultora uses a configurable clipboard-clear delay and avoids keeping copied values longer than required. Operating-system clipboard policy remains an external trust boundary.

### Malicious backup provider

**Threat:** An Android document provider sees or modifies a selected backup file.

**Mitigation:** The provider receives only the encrypted envelope. Import authentication occurs in Rust before the selected envelope replaces the active local vault.

### Browser extension compromise

**Threat:** A browser extension page, content script, or compromised site attempts to read all credentials.

**Current mitigation:** No autofill content script is shipped, no persistent host permissions are requested, and no vault data is persisted in browser storage. Native messaging is prepared but the credential-return protocol is intentionally not enabled until origin-scoped authorization exists.

### UI injection or unsafe external URLs

**Threat:** Vault entry data causes script execution or unsafe navigation.

**Mitigation:** React escapes rendered text by default. Vaultora URL helpers allow only safe web URL schemes before exposing navigation actions. This behavior is covered by frontend utility tests.

## Residual risks

Vaultora cannot fully defend against:

- A compromised operating system or kernel.
- Arbitrary memory inspection of the unlocked application by a sufficiently privileged attacker.
- Malicious screen capture or accessibility tooling with broad device privileges.
- Hardware or firmware compromise.
- A weak master password subjected to offline guessing after encrypted-vault theft.
- Secrets observed after a user intentionally pastes them into another application or website.

## Security invariants for future changes

Future features should preserve these invariants:

1. Plaintext vault contents are never written as a backup or cache.
2. The browser extension does not become a durable secret store.
3. Imported vault data is authenticated before it replaces the local vault.
4. Locking removes the in-memory unlocked session from application state.
5. New Tauri capabilities and browser permissions are added only when a concrete feature requires them.
6. New secret-handling paths include tests for failure and boundary conditions.
7. Browser credential requests are origin-scoped before any autofill feature is enabled.
8. Logs and telemetry never contain passwords, derived keys, decrypted fields, or encrypted-backup payloads.
