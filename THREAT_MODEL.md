# Vaultora Threat Model

## Purpose

This document states what Vaultora is designed to protect, which attackers are considered, where trust boundaries exist, and which risks remain. It describes the current local-first MVP; future sync or browser integration must extend this model before release.

## Security goals

Vaultora aims to:

1. keep stored vault contents confidential when the encrypted vault file is copied or stolen;
2. detect modification of encrypted vault contents before accepting them;
3. derive vault keys from the master password using a memory-hard KDF with bounded parameters;
4. minimize plaintext persistence and avoid intentional secret logging/telemetry;
5. minimize desktop-shell privileges through Tauri capabilities and CSP;
6. lock after inactivity, including after the application resumes from suspension/backgrounding;
7. reduce clipboard exposure through configurable auto-clear without erasing unrelated newer clipboard content;
8. authenticate and validate imported backups before replacing the local vault;
9. fail safely on malformed, oversized, unsupported or internally inconsistent vault data;
10. make security-sensitive behavior reviewable through tests, documentation and explicit versioning.

## Protected assets

- Master password while entered and during derivation.
- Derived vault key while a vault is unlocked.
- Current login passwords and protected values.
- Previous passwords retained in bounded password history.
- Secure notes and identity/custom fields.
- Entry metadata that lives inside encrypted vault data.
- Exported `.vaultora` backups.
- Build/release signing credentials (outside the repository).

## Trust boundaries

### 1. React/WebView ↔ Tauri command boundary

The frontend is untrusted relative to privileged Rust commands. Commands accept typed/validated inputs, and Tauri capabilities are restricted to required core, clipboard, open-dialog and save-dialog functionality.

### 2. Process memory ↔ encrypted local storage

Plaintext vault data exists in memory only while unlocked. Persistent storage is a versioned authenticated-encryption envelope. Filesystem permissions are tightened on Unix where supported.

### 3. Local vault ↔ imported backup

A selected backup is untrusted input. Vaultora bounds file size before parsing, validates envelope algorithms and parameter ranges, derives a key only after KDF bounds checks, authenticates ciphertext, validates decrypted payload structure/limits and only then writes the imported envelope locally.

### 4. Vaultora ↔ operating-system clipboard

The clipboard is globally observable by other processes permitted by the OS. Vaultora cannot make the system clipboard private. Auto-clear is best-effort and checks the current value before clearing so a newer value is not destroyed.

### 5. Source repository ↔ release artifacts

CI is not equivalent to code signing. Official release artifacts should be built through documented workflows and signed/notarized when credentials are available. Secrets must remain in protected GitHub/environment secret storage.

## Attacker models

### A. Offline vault-file attacker

The attacker obtains a `.vaultora` file but not the unlocked process memory or master password.

**Mitigations:** Argon2id, random per-vault salt, XChaCha20-Poly1305, fresh nonce per write, associated data, no plaintext vault persistence, bounded import parser/KDF parameters.

**Residual risk:** Master-password strength still matters. An attacker can perform offline guesses. Vaultora cannot prevent guessing once ciphertext is stolen.

### B. Malicious or corrupted imported file

The attacker convinces the user to import a crafted file.

**Mitigations:** 64 MiB file cap, regular-file check, envelope/version/algorithm validation, nonce/salt length checks, Argon2 memory/iteration/lane limits, AEAD authentication, decrypted payload validation, entry-count and field-size limits.

### C. Same-user malware / compromised desktop session

Malware running with the user's privileges may observe keystrokes, clipboard, screenshots, WebView content, process memory or application files.

**Mitigations:** timed reveal, inactivity lock, clipboard auto-clear, minimal Tauri capabilities, no cloud service, explicit lock action.

**Not fully mitigated:** Vaultora cannot securely defend an unlocked vault against malware or an administrator/root attacker controlling the same device. This is a platform limitation, not a property cryptography can remove.

### D. Lost/stolen powered-off device

An attacker obtains the device and local encrypted vault.

**Mitigations:** Vaultora encryption protects the file independently of filesystem permissions. Full-disk encryption remains strongly recommended because it also protects application binaries, metadata, swap and other local data.

### E. Supply-chain/dependency attacker

A compromised dependency or CI action could alter build behavior.

**Mitigations:** dependency lockfiles, Dependabot, CodeQL/static checks where supported, `cargo audit`, minimized dependency set, pinned major workflow actions, review of dependency changes and reproducible documented commands.

**Residual risk:** Public package registries and GitHub Actions remain external trust dependencies. Future release hardening may pin actions to immutable commit SHAs and introduce provenance/SBOM signing.

## Cryptographic construction

Current envelope version: `1`.

- KDF: Argon2id.
- Default memory: 65,536 KiB.
- Default iterations: 3.
- Default lanes: 1.
- Salt: 16 random bytes.
- Derived key: 32 bytes.
- Cipher: XChaCha20-Poly1305.
- Nonce: 24 random bytes for each encryption.
- Associated data: a fixed Vaultora envelope-domain string.

Imported KDF parameters are accepted only inside defined safety bounds. An authenticated format version mismatch is rejected rather than guessed/migrated implicitly.

## Password history

Vaultora retains at most the latest 10 previous passwords for login entries. History is encrypted with the rest of the vault. History is not included in entry summaries or security-audit responses; it is returned only when an individual entry is opened in an unlocked session. UI values remain masked unless explicitly revealed, and reveal/copy behavior uses the same timeout controls as the current password.

Changing an entry away from `login` clears password history because history has no meaning for other entry kinds.

## Local security audit privacy

The audit executes inside the Rust process against the unlocked vault. It may compare current login passwords in memory to detect reuse and score strength, but the returned report contains only entry IDs/names, severity, codes and messages. Tests assert that sample secret material is not serialized into reports.

The audit does **not** contact breach databases in the MVP.

## Storage and crash safety

Writes use a temporary encrypted file, `sync_all`, restrictive Unix permissions, backup rename, atomic replacement and parent-directory sync on Unix. If the primary file is absent but the recovery backup remains, Vaultora restores the backup. Normal completion removes the temporary backup.

No claim is made that every filesystem/platform provides identical atomicity semantics; tests cover the intended storage state machine and release testing must include supported platforms.

## Memory handling

Master-password input strings are explicitly zeroized after Rust command processing. Derived keys use zeroizing memory. Serialized plaintext encryption buffers are zeroized.

General `String`, React/WebView state, allocator copies, OS swap, GPU/screenshot surfaces and historical memory pages cannot be guaranteed to be erased on all desktop platforms. Vaultora avoids unnecessary long-lived copies and documents this limitation rather than claiming perfect secure memory.

## Network model

Normal MVP vault operation has no required network request. CSP limits renderer network capability to Tauri IPC. The application contains no analytics or cloud-sync client.

Project websites, package installation, GitHub links and release downloads are external to normal vault operation.

## Denial of service

Vaultora bounds imported file size, KDF costs, entry count and field/history sizes to reduce memory/CPU abuse. A local user with write access to application data can still delete or replace the vault file; availability depends on backups and filesystem/device health.

## Out of scope / accepted risks

- Recovering a forgotten master password.
- Protecting an unlocked session from a fully compromised OS/account.
- Preventing physical observation or cameras.
- Guaranteeing deletion from SSD wear-leveling, swap, backups or filesystem snapshots.
- Cloud sync and multi-device conflict resolution in the MVP.
- Browser autofill/extension attack surfaces in the MVP.
- Secure sharing in the MVP.

## Future security gates

Before enabling cloud sync, browser integration, biometrics, OS keychain escrow, sharing, attachments, or network breach checks, the project must add an ADR and update this threat model with authentication, key-management, metadata leakage, replay/conflict, recovery and server-compromise analysis.

## Reporting issues

Use [SECURITY.md](SECURITY.md) for private vulnerability reporting.

**Made by the Sanskar**
