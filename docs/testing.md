# Vaultora Testing Strategy

Vaultora testing is organized around security invariants first, then product behavior and platform packaging.

## Test layers

### Rust unit tests

Located with Rust modules under `src-tauri/src/`.

Current high-value coverage includes:

- authenticated encryption round-trip;
- wrong-master-password rejection;
- fresh nonce per encryption;
- imported Argon2 parameter bounds;
- entry validation/normalization;
- security setting bounds;
- bounded password-history behavior;
- local security-audit reuse/privacy behavior;
- encrypted storage read/write and malformed/oversized import rejection;
- decrypted payload structure/duplicate-ID/history validation;
- password/passphrase generator constraints.

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --all-features
```

### Property tests

`proptest` is available for invariants where randomized inputs add value. Suitable targets include generator constraints, validation boundaries, parser round trips and normalization idempotence.

Property tests must remain deterministic enough to reproduce failures through the reported seed/case.

### Frontend unit tests

Vitest + jsdom cover pure helpers and security timing/filter invariants.

Run:

```bash
npm test
```

### Component tests

Component tests should verify states and behavior without requiring real credentials. Priority components:

- onboarding validation and safe errors;
- entry editor type-specific fields;
- protected reveal timeout;
- password-history masking/reveal;
- generator controls;
- audit loading/error/empty/finding states;
- settings validation and destructive flows.

Where a Tauri call is involved, mock the typed `src/api.ts` boundary rather than mocking cryptographic results inside the component.

### Integration tests

Integration coverage should exercise Rust command/state/storage sequences using temporary directories and fictional data, including:

- create → add/edit → lock → unlock;
- password change → old password rejected/new password accepted;
- export → import → equivalent vault data;
- failed import leaves current vault untouched;
- persistence failure does not replace active in-memory state incorrectly;
- password history survives encrypted round trip.

### Desktop end-to-end tests

Tauri/WebView E2E automation differs by platform and is not yet the primary gate. Release candidates should still receive scripted manual smoke testing on Windows, macOS and Linux until a stable desktop-driver strategy is committed.

## Security misuse tests

Every release should cover at least:

- short/oversized master-password input;
- corrupted ciphertext;
- wrong master password;
- unsupported envelope/data version;
- unsupported cipher/KDF identifiers;
- invalid salt/nonce encodings and lengths;
- excessive KDF cost request;
- oversized encrypted file;
- malformed JSON envelope;
- duplicate entry IDs;
- excessive entry/history/field sizes;
- clipboard change before scheduled clear;
- inactivity timeout at exact boundary;
- resume after timeout before first user action;
- audit response not containing known test secrets.

## Frontend quality commands

```bash
npm run typecheck
npm test
npm run build
npx prettier --check .
```

## Rust quality commands

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml --all-features
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

## Dependency/security checks

The repository security workflow should run:

- npm dependency audit against the committed lockfile;
- RustSec `cargo audit` against `Cargo.lock`;
- CodeQL/static analysis for supported repository languages;
- Dependabot update checks.

Audit failures must be reviewed for reachability and severity. Do not suppress a finding only to make CI green; document why a finding is not exploitable or update/replace the dependency.

## CI expectations

Pull requests to `main` should not merge while required quality/security jobs are failing, except for a documented repository-administration emergency handled by maintainers.

A CI success means only that automated checks passed on that commit; it does not prove the application is secure.

## Manual release smoke test

Use a completely fictional vault.

1. Create a new vault with a test master password.
2. Add login, secure note and identity entries.
3. Edit a login password twice; confirm history remains masked and ordered.
4. Run security audit and open a finding.
5. Generate a password and passphrase.
6. Copy a protected value; confirm timeout behavior.
7. Change clipboard before timeout; confirm Vaultora does not clear the newer value.
8. Test reveal auto-hide.
9. Leave the app inactive past the lock timeout and resume it; confirm it is locked before interaction.
10. Export an encrypted backup.
11. Change the master password; verify old/new behavior.
12. Import a valid encrypted backup.
13. Attempt a wrong-password/corrupt import and confirm the active vault remains intact.
14. Restart the packaged app and confirm persistence.
15. Test keyboard navigation and visible focus.
16. Test a narrow window and system dark mode.

## Test-data rules

Never use production credentials, real identity documents, private keys, payment data or personal recovery codes in tests. Synthetic values should be obviously fictional.

## Performance testing

See [performance.md](performance.md). Security limits such as the 64 MiB import cap are defensive ceilings, not acceptable normal-vault performance targets.
