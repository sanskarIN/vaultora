# ADR 0004: Additive schema for bounded encrypted password history

- Status: Accepted
- Date: 2026-08-23

## Context

Vaultora needs to retain a small amount of prior login-password history so users can recover from accidental rotations and recognize recently used values. The feature changes persistent decrypted vault data and therefore must preserve older vault compatibility without silently weakening validation.

## Decision

Add `password_history` to `VaultEntry` as a Serde-defaulted list of `{ secret, changed_at }` records.

Rules:

- older vault payloads that omit the field deserialize as an empty history;
- history applies only to `login` entries;
- a previous password is recorded only when the current non-empty login password actually changes;
- at most the newest 10 historical passwords are retained;
- changing an entry to a non-login type clears its password history;
- history is encrypted inside the same authenticated vault payload;
- entry summaries and security-audit responses do not include historical secrets;
- the UI keeps history collapsed and masked until the user explicitly reviews/reveals it;
- imported/decrypted payload validation rejects oversized or semantically invalid history.

The existing decrypted data version remains `1` because this is an additive field with a safe default and current clients can unambiguously interpret older payloads.

## Consequences

### Positive

- Existing encrypted vaults remain readable without an eager migration rewrite.
- Historical passwords receive the same encryption/authentication as current vault contents.
- Retention is bounded, limiting vault growth and unnecessary long-term secret exposure.
- No history leaks through list/search summaries or audit DTOs.

### Negative

- An unlocked process now has access to up to 10 additional previous passwords per login.
- A compromised unlocked session may therefore expose more historical secret material.
- Old clients that edit an entry after opening a future vault containing this additive field could lose fields they do not understand if their serializer rewrites the payload. Stable cross-version compatibility policy must address this before 1.0.

## Alternatives considered

### Increment the vault data version immediately

Rejected for this additive pre-1.0 field because it would force migration/rejection despite a safe default and no cryptographic-format change.

### Store password history in a separate file

Rejected because it would add another encryption/persistence lifecycle, extra key/nonce handling, and a consistency problem between files.

### Unlimited history

Rejected because password managers should minimize retained secret material and unbounded growth.

### Store hashes instead of prior passwords

Hashes would help detect reuse but would not support the recovery/review use case. Vaultora's local security audit already handles current-password reuse without exposing password values in its report.

## Follow-up

Before 1.0, define a formal forward/backward compatibility policy for clients that encounter fields or data versions they do not understand. Any future history retention change should consider migration, threat-model impact and user controls.
