# ADR 0002: Argon2id + XChaCha20-Poly1305 authenticated encryption

- Status: Accepted
- Date: 2026-08-21

## Context

Vaultora needs to derive an encryption key from a human master password and protect a serialized local vault against both disclosure and modification.

The construction must use established, maintained cryptographic libraries and provide sufficient nonce space for simple random nonce generation on each full-vault rewrite.

## Decision

Use:

- Argon2id for master-password key derivation;
- a random 16-byte per-vault salt;
- default Argon2 parameters of 65,536 KiB memory, 3 iterations, 1 lane;
- a 32-byte derived key;
- XChaCha20-Poly1305 for authenticated encryption;
- a fresh random 24-byte nonce on every encryption;
- a fixed Vaultora domain-separation string as associated data;
- explicit algorithm identifiers and envelope versioning.

Imported Argon2 work factors are bounded before derivation to reduce crafted-file resource exhaustion.

## Consequences

### Positive

- Argon2id is memory-hard and appropriate for password-based key derivation.
- XChaCha20's extended nonce makes secure random per-write nonce generation straightforward.
- Poly1305 authentication rejects modified ciphertext.
- The construction is provided by maintained Rust crates rather than custom primitive code.
- Public salt/KDF/cipher metadata can remain outside ciphertext without compromising the key.

### Negative

- Unlock intentionally consumes noticeable CPU/memory.
- Stolen ciphertext still permits offline password guessing; master-password quality matters.
- General-purpose desktop memory cannot guarantee perfect secret erasure.
- Parameter evolution requires compatibility/version planning.

## Alternatives considered

### AES-GCM

Cryptographically suitable with correct nonce management, but its shorter conventional nonce and catastrophic nonce-reuse failure make random full-vault nonce handling less forgiving than XChaCha20 for this format.

### PBKDF2

Widely supported but not memory-hard. Rejected for a new local password-manager format where Argon2id is available.

### Custom encryption format/primitive

Rejected. Vaultora does not implement custom cryptographic primitives.

## Parameter changes

Changing default KDF parameters without changing the algorithm can be backward-compatible because the descriptor is stored in each envelope. Accepted import parameter bounds must still encompass supported historical values.

Algorithm replacement or incompatible envelope behavior requires a format/version decision and migration ADR.

## Security review triggers

Review this ADR when:

- dependencies materially change implementation/security properties;
- hardware economics justify stronger default Argon2 work factors;
- a new cipher/KDF is proposed;
- multiple encryption keys/records are introduced;
- cloud sync adds new key hierarchy requirements.
