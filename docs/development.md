# Vaultora Development Workflow

## Daily loop

```bash
git switch main
git pull --ff-only
git switch -c feat/example
npm install
npm run tauri:dev
```

Before pushing:

```bash
npm run format
npm run typecheck
npm test
cargo test --manifest-path src-tauri/Cargo.toml --all-features
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
```

## Module ownership

### UI/product behavior

Work primarily under `src/`. Keep privileged operations behind typed functions in `src/api.ts` instead of importing `invoke` throughout components.

### Persistent/security behavior

Work primarily under `src-tauri/src/`. Changes to model/crypto/storage/commands/validation/audit require failure-path tests and a threat-model review.

### Desktop permissions

Tauri permissions live in `src-tauri/capabilities/`. Add only the smallest capability necessary. Explain new plugin/permission requests in the pull request.

## Data-model changes

The vault has explicit outer-envelope and decrypted-payload versions. Do not increment versions for a backward-compatible field that has a safe Serde default unless migration semantics actually require a new version.

For any persistent-field change:

1. decide whether older vaults deserialize safely;
2. decide whether newer vaults must be rejected by older clients;
3. define migration/rollback behavior;
4. add round-trip/compatibility tests;
5. update architecture/threat-model/ADR documentation as appropriate.

Password history is an example of an additive field: older payloads omit it and current code uses `#[serde(default)]`.

## Error handling

Runtime code should return `VaultError`/`CommandError` rather than panic. Errors crossing IPC must not contain master passwords, vault plaintext, generated secrets or unnecessary parser internals.

Tests may use `unwrap` for setup/assertion clarity.

## Secret-handling rules

- Never use real credentials in development.
- Never `console.log` a protected value.
- Never store secrets in `localStorage`, IndexedDB, URLs or query strings.
- Avoid adding secret values to React keys, data attributes or accessible labels.
- Keep security-audit output metadata-only.
- Explicitly zeroize command password inputs and key/plaintext buffers where practical.
- Treat clipboard contents as exposed to the OS/user session.

## Frontend patterns

- Prefer semantic HTML controls over custom clickable containers.
- Keep focus-visible styling intact.
- Ensure a feature works at desktop and narrow/mobile window breakpoints.
- Respect the reveal/clipboard settings when displaying or copying secrets.
- Use `void` intentionally when fire-and-forget behavior is safe and errors are otherwise handled.
- Keep user-facing string growth compatible with future localization.

## Rust patterns

- Validate before mutation/persistence.
- Bound attacker-controlled size/work before allocation or cryptographic work.
- Use OS-backed randomness for cryptographic/generator randomness.
- Do not weaken authenticated encryption to support malformed legacy data.
- Keep file writes recoverable and avoid plaintext temporary files.
- Use UUIDs for stable entry identity.

## Adding a Tauri command

1. Define/confirm serializable DTOs in Rust.
2. Validate all input in Rust.
3. Implement the command with structured errors.
4. Register it in `src-tauri/src/lib.rs`.
5. Add the TypeScript contract to `src/types.ts`.
6. Add one wrapper function in `src/api.ts`.
7. Add Rust tests for core behavior and frontend tests for presentation where useful.
8. Verify no new Tauri capability is required; if one is, document why.

## Dependency policy

A new dependency should have a clear product/security benefit. Prefer the standard library or existing dependency when it is simpler and equally safe.

For cryptography, serialization, desktop IPC and file handling, consider maintenance activity, security history, transitive dependency cost and platform support.

Lockfile changes belong in the same pull request as dependency changes.

## Commit discipline

Use multiple commits when they create independently reviewable checkpoints, for example:

- domain model;
- command/API bridge;
- UI integration;
- tests;
- documentation.

Do not create meaningless commits that only split one line of a logical edit.

## Pull-request handoff

Update `what_changed.md` when work spans multiple sessions. It should identify:

- completed slices;
- verification actually performed;
- known failures/limitations;
- the exact next task.

It is a handoff document, not a substitute for `CHANGELOG.md`.
