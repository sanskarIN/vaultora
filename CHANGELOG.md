# Changelog

All notable Vaultora changes are documented here. The project follows semantic-versioning intent; pre-1.0 releases may still change APIs and file-format policy with explicit migration notes.

## [Unreleased]

### Added

- Local security audit for weak, reused, missing and stale login signals plus insecure HTTP URLs.
- Bounded encrypted password history for the latest 10 previous login passwords.
- Masked password-history viewer with timed reveal and clipboard auto-clear behavior.
- Decrypted-vault payload validation including duplicate IDs and field/history limits.
- Repository CI, documentation, threat model, privacy policy and contributor guidance as part of 0.2 hardening.

### Changed

- Mobile navigation accommodates the new security-audit destination.
- Storage writes sync the parent directory on Unix after atomic replacement.
- Imported encrypted files are limited to 64 MiB before parsing.
- Imported Argon2 parameters are accepted only within bounded memory/iteration/lane ranges.

### Fixed

- Returning to the application after the inactivity timeout can no longer reset the timer through the focus/click that resumes the app before the lock decision runs.
- Malformed imported envelopes no longer surface raw JSON parser details.

### Security

- Security-audit responses contain finding metadata rather than passwords.
- Imported files now have layered format, KDF, authenticated-decryption and payload validation.

## [0.1.0] - 2026-08-22

Initial functional local-first Vaultora foundation.

### Added

- Tauri 2 + Rust + React + TypeScript desktop application.
- First-run encrypted vault creation and master-password unlock.
- Argon2id key derivation and XChaCha20-Poly1305 authenticated encryption.
- Versioned encrypted `.vaultora` envelope.
- Atomic encrypted local persistence with recovery backup and Unix owner-only file permissions.
- Logins, secure notes and identity records.
- Entry list, search, filters, tags and favorites.
- On-demand protected entry loading, reveal timeout and clipboard auto-clear.
- Password/passphrase generator and local password-strength analysis.
- Encrypted backup export/import.
- Master-password rotation with a fresh salt/key/nonce.
- Configurable auto-lock, clipboard timeout, reveal timeout and system/light/dark theme.
- Responsive accessible desktop UI and editable Vaultora brand mark.
- Minimal Tauri capability allow-list and application CSP.

[Unreleased]: https://github.com/sanskarIN/vaultora/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sanskarIN/vaultora/releases/tag/v0.1.0
