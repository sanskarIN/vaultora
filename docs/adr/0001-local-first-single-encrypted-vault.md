# ADR 0001: Local-first single encrypted vault for the MVP

- Status: Accepted
- Date: 2026-08-21

## Context

Vaultora needs a persistent model that is auditable, cross-platform, usable offline, and does not require a server to protect ordinary personal password-manager data.

A database with record-level encryption, sync metadata, server accounts, conflict resolution and recovery would create substantially more cryptographic and operational surface before the core local product is validated.

## Decision

The MVP stores one versioned authenticated-encryption envelope in the platform application-data directory.

The decrypted domain model lives only in the unlocked process session. Mutations reserialize and re-encrypt the complete vault, then replace the encrypted file through a temporary/backup atomic-write sequence.

Cloud sync and mandatory accounts are excluded from the MVP.

## Consequences

### Positive

- Simple encryption boundary: one plaintext payload → one authenticated ciphertext.
- No server can expose vault plaintext because no Vaultora server receives it.
- Offline-first operation is natural.
- Backup/export is the same encrypted envelope format.
- Format and migration behavior are straightforward to review.
- Fewer nonce-management and partial-record consistency cases than record-level storage.

### Negative

- Every mutation has O(vault-size) serialization/encryption/write cost.
- Multi-device sync is not available.
- Large attachments or extremely large vaults are a poor fit.
- A future chunked/database format will require migration and a new threat-model review.

## Alternatives considered

### SQLite with encrypted fields

Rejected for the MVP because per-record nonce/key/metadata design, transaction behavior and metadata leakage would require more complexity for little initial user benefit.

### SQLCipher/encrypted database

Potentially viable later, but introduces a different dependency/platform/build surface and still needs careful key lifecycle and migration design.

### Cloud-backed database from day one

Rejected because it conflicts with the local-first privacy requirement and adds accounts, authentication, server compromise, metadata leakage, replay/conflict and recovery concerns before core vault quality is established.

## Follow-up

Any new storage engine or cloud-sync implementation requires a new ADR, migration plan and update to `THREAT_MODEL.md`.
