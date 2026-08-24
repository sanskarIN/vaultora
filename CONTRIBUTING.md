# Contributing to Vaultora

Vaultora welcomes focused improvements that preserve its local-first and least-privilege security model.

## Before changing code

1. Read `SECURITY.md` and `THREAT_MODEL.md` for security-sensitive work.
2. Keep one logical change per commit when practical.
3. Do not include real credentials, real vault files, signing keys, browser-extension IDs belonging to private builds, or other secrets in tests or examples.
4. Prefer synthetic fixtures and temporary directories.

## Development setup

```bash
npm install
npm run check
```

For desktop Tauri development:

```bash
npm run tauri:dev
```

For Android preparation:

```bash
npm run android:check
npm run android:init
```

For browser-extension work:

```bash
npm run extension:check
npm run extension:build
```

## Required checks

Before proposing a change, run the checks relevant to the files you touched. The complete baseline is:

```bash
npm run typecheck
npm test
npm run android:check
npm run extension:check
cargo test --manifest-path src-tauri/Cargo.toml
npm run lint
npm run format:check
```

## Security-sensitive changes

Changes involving encryption, key derivation, vault persistence, import/export, clipboard handling, Tauri capabilities, browser permissions, native messaging, origin matching, or autofill require extra care.

- Do not weaken Argon2id or authenticated-encryption settings without a documented migration plan and review.
- Do not write plaintext vault data to persistent storage for debugging.
- Do not log passwords, keys, decrypted fields, or backup payloads.
- Do not add broad Tauri permissions when a narrower permission exists.
- Do not add browser host permissions until the feature needing those origins is implemented and reviewed.
- Keep browser integration origin-scoped.
- Add regression tests for security boundaries and malformed input.

## Android changes

Keep desktop-only window constraints out of `tauri.android.conf.json`. Android backup/restore must continue to support Storage Access Framework `content://` URIs through the Tauri filesystem bridge.

Run:

```bash
npm run android:check
```

whenever changing Tauri config, capabilities, plugins, backup UI, or the Rust mobile entry point.

## Browser extension changes

The extension must remain Manifest V3 and must not persist vault secrets in browser storage.

Run:

```bash
npm run extension:check
```

when changing the manifest, background worker, protocol, popup, native-host templates, or build scripts.

## Commit messages

Use concise Conventional Commit-style messages where practical, for example:

- `feat: add ...`
- `fix: prevent ...`
- `security: restrict ...`
- `test: cover ...`
- `docs: explain ...`
- `build: configure ...`
- `ci: validate ...`

## Pull requests

A pull request should explain the behavior changed, security impact if any, and tests performed. Keep unrelated refactors separate so reviews can reason about security boundaries clearly.

Potential vulnerabilities should not be opened as public issues. Follow `SECURITY.md` instead.
