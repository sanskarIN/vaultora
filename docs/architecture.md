# Vaultora Architecture

## Overview

Vaultora is a local-first desktop application with a React/TypeScript renderer and a Rust security/domain core hosted by Tauri 2.

```text
┌──────────────────────────────────────────────────────────────┐
│ React + TypeScript WebView                                  │
│                                                            │
│ Auth / Vault / Audit / Generator / Settings / About        │
│              │ typed invoke() calls                        │
└──────────────┼─────────────────────────────────────────────┘
               │ Tauri IPC boundary
┌──────────────▼─────────────────────────────────────────────┐
│ Rust core                                                  │
│                                                            │
│ commands ── state ── model                                 │
│    │          │       │                                    │
│    │          │       ├── validation                       │
│    │          │       ├── generator                        │
│    │          │       └── audit                            │
│    │          │                                            │
│    ├──────────┴── crypto                                   │
│    └───────────── storage                                  │
└──────────────────────┬─────────────────────────────────────┘
                       │ authenticated encrypted envelope
                platform app-data directory
```

## Design principles

1. **Secrets belong in Rust and encrypted storage, not browser persistence.**
2. **The frontend receives summaries by default.** Full protected entry data is loaded only when an entry is opened.
3. **Every persistent write is a complete authenticated vault rewrite.** This keeps the MVP format simple and avoids partially encrypted database state.
4. **Untrusted input is bounded before expensive work.** Import files, KDF parameters and decrypted data have explicit limits.
5. **No custom cryptography.** Vaultora composes maintained Argon2id and XChaCha20-Poly1305 libraries.
6. **Network independence is a feature.** The MVP has no vault-sync service or analytics path.
7. **Security decisions are versioned/documented.** Persistent-format changes require migration analysis and ADRs.

## Frontend modules

### `src/App.tsx`

Top-level session/UI coordinator. Responsibilities:

- first-run/unlocked state;
- navigation;
- inactivity tracking and lock transitions;
- entry-summary filtering/selection;
- editor lifecycle;
- opening findings from the security audit.

It should not implement cryptographic logic or write secrets to browser storage.

### `src/api.ts`

Single typed Tauri command client. It normalizes structured Rust command failures into `VaultoraApiError` and prevents individual components from duplicating raw IPC calls.

### `src/types.ts`

Serializable contracts shared conceptually with Rust command DTOs. These interfaces are not a replacement for runtime validation in Rust.

### Components

- `AuthGate` — create/unlock/import entry point.
- `EntryEditor` — typed entry creation/editing.
- `EntryDetails` — protected data presentation, timed reveals, password history.
- `SecurityAuditPanel` — metadata-only local audit findings.
- `GeneratorPanel` — local generation/strength tools.
- `SettingsPanel` — security settings, encrypted backup/restore and key rotation.
- `AboutPanel` — project/support information.

## Rust modules

### `model.rs`

Persistent domain structures and command inputs. Important invariants include field-size bounds, setting ranges, password-history cap, version constants and summary generation.

### `crypto.rs`

KDF and authenticated-encryption orchestration:

- Argon2id descriptor validation and key derivation;
- random salt and nonce generation;
- XChaCha20-Poly1305 encryption/decryption;
- envelope algorithm/version checks;
- plaintext serialization buffers wrapped in zeroizing memory;
- decrypted payload validation before acceptance.

### `storage.rs`

Encrypted-file persistence:

- platform app-data file path;
- temporary + backup atomic replacement sequence;
- file and parent-directory syncing where supported;
- restrictive Unix permissions;
- bounded envelope reads;
- encrypted export/import file handling.

Storage never needs the master password or plaintext vault data.

### `state.rs`

Holds the optional unlocked `VaultSession` protected by a mutex. Locking drops the session and its derived key.

### `commands.rs`

Tauri command boundary. It validates command inputs, coordinates state + persistence, zeroizes master-password command strings and returns structured errors/snapshots.

### `validation.rs`

Post-decryption structural validation. It rejects oversized fields/history, excessive entries, duplicate IDs and invalid history/type combinations before an imported/authenticated payload becomes the active session.

### `audit.rs`

Local-only password-health analysis. It may compare secrets while the session is unlocked, but returned results contain metadata/findings only.

### `generator.rs`

Password/passphrase generation and password-strength estimation. Generators use OS-backed randomness.

## Persistent format

The outer `.vaultora` file is JSON for inspectable/versioned metadata, but vault contents are ciphertext.

Conceptual envelope:

```json
{
  "version": 1,
  "kdf": {
    "algorithm": "argon2id",
    "memory_kib": 65536,
    "iterations": 3,
    "lanes": 1,
    "salt_b64": "..."
  },
  "cipher": {
    "algorithm": "xchacha20poly1305",
    "nonce_b64": "..."
  },
  "ciphertext_b64": "..."
}
```

The ciphertext authenticates a serialized `VaultData` payload. Algorithm identifiers and version values are validated explicitly rather than inferred.

## Write lifecycle

1. A command mutates validated in-memory domain state.
2. `encrypt_data` serializes plaintext into a zeroizing buffer.
3. A fresh random XChaCha20 nonce is generated.
4. Authenticated encryption produces ciphertext.
5. Storage serializes the envelope.
6. A temporary encrypted file is fully written and synced.
7. Existing primary becomes a recovery backup.
8. Temporary file atomically replaces primary where filesystem semantics allow.
9. Final file permissions are restricted and directory metadata is synced on Unix.
10. Recovery backup is removed after success.

## Unlock/import lifecycle

1. Read a bounded regular file.
2. Parse the versioned envelope.
3. Validate algorithm identifiers, nonce and KDF parameter safety bounds.
4. Derive the key from the entered master password.
5. Authenticate/decrypt ciphertext.
6. Deserialize plaintext.
7. Validate payload version, settings, IDs, entry count/field/history limits.
8. Construct the unlocked session.

Import writes the authenticated envelope locally only after these checks succeed.

## Error boundary

Rust domain errors are converted to stable command `{ code, message }` objects. User-facing messages should be useful without containing secrets, raw plaintext or unnecessary parser internals.

## Tauri security

`src-tauri/capabilities/default.json` allows only required core behavior plus clipboard read/write and file open/save dialogs for the main window. The CSP limits loaded resources and renderer connectivity.

Any new plugin/capability is a security-relevant architecture change and should be reviewed against [THREAT_MODEL.md](../THREAT_MODEL.md).

## Scalability and current trade-offs

The MVP rewrites the entire encrypted vault after a mutation. This is simple and auditable for normal personal vault sizes but has O(vault-size) write cost. A future encrypted database/chunked format would improve large-vault performance but substantially increases migration, nonce-management, atomicity and metadata-leakage complexity.

The current 64 MiB encrypted-file safety cap and 50,000-entry payload cap are intentional denial-of-service boundaries, not performance targets.

## Future sync boundary

Cloud sync is intentionally absent. A future sync engine must be a separate module/protocol with its own key hierarchy, replay/conflict handling, device authorization and threat-model review. The current Rust domain should remain usable without network connectivity.

## Related documents

- [Threat model](../THREAT_MODEL.md)
- [Privacy](../PRIVACY.md)
- [Testing](testing.md)
- [Release process](release.md)
- [ADRs](adr/)
