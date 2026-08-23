# ADR 0003: No cloud sync in the MVP

- Status: Accepted
- Date: 2026-08-21

## Context

Password-manager sync is not merely file upload. A secure multi-device design needs device enrollment, authentication, key hierarchy, metadata-leakage analysis, replay/rollback protection, conflict resolution, deletion semantics, recovery and server-compromise handling.

Adding a server before the local vault is stable would enlarge the attack surface and make it harder to evaluate whether the core encryption, backup and recovery model is correct.

## Decision

Vaultora's MVP is fully local-first and requires no account or project-operated backend for normal vault operation.

The application does not upload vault contents, audit findings, generated secrets or master-password material. Encrypted backups are exported only to a path selected by the user.

Cloud sync is deferred to a separately designed, optional module.

## Consequences

### Positive

- A project server cannot expose user vault plaintext because it never receives vault data.
- The application remains useful offline.
- There is no account-recovery or server-authentication dependency for local unlock.
- The threat model remains small enough for meaningful review before 1.0.
- Users keep explicit control of encrypted backups.

### Negative

- Users must manage backups and device-to-device transfer themselves.
- There is no automatic multi-device convergence.
- Losing every encrypted copy of the vault is unrecoverable.
- A forgotten master password cannot be recovered by a project service.

## Future sync requirements

Any proposed sync design must be approved through a new ADR and an updated threat model before code is enabled. At minimum it must define:

- client-side key hierarchy;
- how a new device is authorized;
- what the server can learn from metadata;
- how encrypted updates are authenticated/versioned;
- replay and rollback defenses;
- conflict resolution and tombstone/deletion behavior;
- device revocation;
- offline edits;
- server-compromise behavior;
- recovery trade-offs;
- protocol migration/versioning.

The master password must never be sent to a Vaultora server, and no server-side key should be sufficient to decrypt user vault contents.

## Alternatives considered

### Upload the existing encrypted `.vaultora` file to generic cloud storage

This can be a user-managed backup strategy outside Vaultora, but automatic synchronization of one monolithic file still has rollback/conflict and corruption risks. Vaultora will not present it as a reviewed sync protocol without additional design.

### Build account-based sync immediately

Rejected for the MVP because it adds substantially more trust and failure modes before the local product has mature security/recovery guarantees.

## Follow-up

The roadmap keeps sync after the stable local-vault milestone. Any implementation must remain optional so local-only use continues to work without a network connection.
