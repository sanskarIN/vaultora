# Vaultora

<p align="center">
  <img src="public/vaultora-mark.svg" width="112" height="112" alt="Vaultora logo" />
</p>

<p align="center"><strong>A local-first encrypted password manager for Windows, macOS, and Linux.</strong></p>

<p align="center">
  <a href="https://github.com/sanskarIN/vaultora/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/sanskarIN/vaultora/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" /></a>
</p>

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-sanskarIN-FFDD00?logo=buy-me-a-coffee&logoColor=000000)](https://buymeacoffee.com/sanskarIN)

Vaultora keeps logins, secure notes, and identity records in one authenticated, encrypted file on your device. There is no account, cloud service, analytics pipeline, or recovery server in the MVP. The master password is used to derive a vault key locally, and protected values are loaded only after the vault is unlocked.

> [!IMPORTANT]
> Vaultora is security-sensitive software under active development. Review [SECURITY.md](SECURITY.md), [THREAT_MODEL.md](THREAT_MODEL.md), and the release notes before trusting a build with important credentials. Back up your vault and keep an independent recovery plan for the master password.

## Interface preview

The current desktop experience includes onboarding/unlock, an encrypted vault browser, local security audit, generator, backup/restore and security settings, and About/support information. Real platform captures will be added to `docs/assets/` from release-candidate builds.

## Features

- **Local encrypted vault** for logins, secure notes, and identities.
- **Argon2id** master-password key derivation with bounded work factors.
- **XChaCha20-Poly1305** authenticated encryption with a fresh random nonce for every write.
- **Atomic persistence** with a temporary file, recovery backup, fsync, and restrictive Unix file permissions.
- **Password and passphrase generator** backed by OS randomness.
- **Local security audit** for missing, weak, reused, stale, and insecure-URL login signals without returning passwords in the audit response.
- **Bounded password history** for the latest 10 prior login passwords, stored only inside the encrypted vault and masked in the UI.
- **Clipboard auto-clear** that avoids clearing a newer clipboard value written by another application.
- **Timed secret reveal** and automatic inactivity locking, including resume-from-background checks.
- **Encrypted export/import** with format, size, KDF, payload, and authentication validation.
- **Master-password rotation** with a fresh salt, derived key, and encryption nonce.
- **Search, type filtering, tags, and favorites** using non-secret entry summaries.
- **Light, dark, and system themes**, responsive layouts, focus indicators, reduced-motion support, and keyboard-friendly controls.
- **No cloud sync in the MVP**. Network access is not required for normal vault operation.

## Supported platforms

| Platform | Development target | Packaging |
| --- | --- | --- |
| Windows 10/11 | Supported | Tauri installer/bundle |
| macOS | Supported | Tauri app bundle / DMG where available |
| Linux | Supported | Tauri-supported Linux bundles |

Signing/notarization credentials are deliberately not committed. See [docs/release.md](docs/release.md).

## Technology

- **Rust** — cryptography orchestration, persistence, validation, generators, security audit, Tauri command layer.
- **Tauri 2** — desktop shell with a minimum capability allow-list and CSP.
- **React 19 + TypeScript** — desktop interface and typed command client.
- **Vite + Vitest** — frontend build and tests.
- **Argon2id + XChaCha20-Poly1305** — maintained cryptographic libraries; Vaultora defines no custom cipher or KDF.

## Security design at a glance

A new vault receives a random 16-byte salt. Argon2id derives a 256-bit key from the master password. Vault data is serialized only in memory, encrypted with XChaCha20-Poly1305 and associated data, and written as a versioned JSON envelope containing public KDF/cipher metadata plus ciphertext. A fresh 24-byte nonce is generated for each encryption.

Imported envelopes are size-bounded before parsing, imported Argon2 work factors are bounded before derivation, and decrypted payloads are validated before a session is accepted. Master-password strings and derived keys receive explicit zeroization where practical; the threat model documents limits of secure memory on general-purpose desktop platforms.

Read the full [threat model](THREAT_MODEL.md) and [architecture](docs/architecture.md).

## Quick start

### Prerequisites

- Node.js **22.12+** and npm 10+
- Stable Rust with `rustfmt` and `clippy`
- Tauri 2 native prerequisites for your operating system

### Run in development

```bash
git clone https://github.com/sanskarIN/vaultora.git
cd vaultora
npm install
npm run tauri:dev
```

For platform-specific native dependencies, read [docs/setup.md](docs/setup.md).

## Quality checks

```bash
npm run typecheck
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run format:check
```

The repository CI runs frontend type-checking/tests/build/formatting and Rust formatting/tests/Clippy. Security automation is documented in [docs/testing.md](docs/testing.md).

## Build a desktop bundle

```bash
npm install
npm run tauri:build
```

Release-tag automation and platform signing expectations are described in [docs/release.md](docs/release.md). Local unsigned artifacts are for development/testing only.

## Repository map

```text
src/                         React + TypeScript UI and typed Tauri client
src/components/              Product screens and reusable product UI
src/i18n/                    Externalized English strings / i18n starting point
src-tauri/src/               Rust domain, crypto, storage, validation and commands
src-tauri/capabilities/      Tauri permission allow-list
docs/                        Architecture, setup, testing, release and ADRs
.github/                     CI, security, release and community automation
what_changed.md              Cross-session engineering handoff
```

## Data and backups

Vaultora stores one encrypted `.vaultora` file in the platform application-data directory. Exported `.vaultora` backups remain encrypted under the current master password. Import authenticates and validates a selected backup before replacing the local vault.

Backups are not a substitute for remembering the master password: **Vaultora has no password-recovery service or escrow key**.

## Privacy

Normal vault use is local-only. Vaultora does not require an account and does not intentionally collect analytics or transmit vault contents. See [PRIVACY.md](PRIVACY.md) for precise behavior and boundaries.

## Accessibility

The UI uses semantic labels, visible focus states, touch-friendly controls, responsive layouts and `prefers-reduced-motion`. Accessibility is treated as an ongoing release gate; see [docs/accessibility.md](docs/accessibility.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/development.md](docs/development.md). Security vulnerabilities must follow [SECURITY.md](SECURITY.md) instead of a public issue.

## Roadmap

The MVP intentionally excludes cloud sync. Future work is tracked in [ROADMAP.md](ROADMAP.md). Any end-to-end encrypted sync module requires a separate security design and review before enablement.

## License

Copyright © 2026 Sanskar. Vaultora is licensed under the [Apache License 2.0](LICENSE).

## Support and contact

- GitHub: https://github.com/sanskarIN
- Business: sanskarin@outlook.in
- Business: sanskarin.business@gmail.com
- Support: supportramsandesh@gmail.com
- Buy Me a Coffee: https://buymeacoffee.com/sanskarIN

See [SUPPORT.md](SUPPORT.md) for support expectations.

---

**Made by the Sanskar**
