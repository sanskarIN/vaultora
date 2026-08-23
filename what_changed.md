# Vaultora — What Changed

## Current milestone

**0.2.0 hardening and release-readiness continuation**

Continuation branch: `continue/2026-08-23-hardening`

## Repository state reviewed

- Rust + Tauri 2 encrypted local-vault core is present.
- React + TypeScript desktop UI is present for onboarding/unlock, vault browsing, entry create/edit/details, generator, settings, encrypted backup/import, master-password rotation, and About.
- Argon2id key derivation and XChaCha20-Poly1305 authenticated encryption are implemented with fresh salts/nonces.
- Atomic local-vault persistence and Unix owner-only file permissions are implemented.
- Clipboard auto-clear, inactivity auto-lock, reveal timeout, filtering, favorites, tags, light/dark/system theming, and responsive styling are present.
- The repository still contains the staged `.bootstrap/` payload and its temporary materialization workflow.
- The complete documentation/community/CI/security/release baseline from the master scope is not yet materialized on `main`.
- No GitHub issues or pull requests were open when this continuation began.

## Work in this continuation

### Planned implementation slices

1. Add a local security-audit model and dashboard without transmitting secrets.
2. Add password-history support with bounded encrypted history and safe UI presentation.
3. Harden imported-vault size/format validation and storage recovery behavior.
4. Improve application-level error, loading, keyboard, focus, and destructive-action UX.
5. Expand frontend and Rust regression/property tests for new behavior and security-sensitive boundaries.
6. Add the complete project documentation set, architecture/security/privacy/threat-model material, and ADRs.
7. Add GitHub issue/PR templates, funding metadata, dependency update configuration, CI, CodeQL/security checks, and release workflow.
8. Remove the temporary bootstrap payload/workflow after its replacement files exist.
9. Run/inspect repository verification through GitHub Actions and fix discovered defects.
10. Merge the continuation branch into `main` with meaningful commit history preserved.

## Verification status

Not yet complete for this continuation. Local network access in the execution container cannot reach GitHub or package registries, so clean build/test verification will be performed through repository CI where possible. No passing claim will be made until those checks are observed.

## Known limitations at continuation start

- No cloud sync by design for the MVP.
- No biometric/platform-keystore unlock is implemented; the current supported unlock factor is the master password.
- No privacy-preserving compromised-password network check is enabled; Vaultora remains local-only by default.
- Dependency lockfiles are not currently committed.
- Installer/signing/notarization credentials are intentionally not stored in the repository.

## Next exact task

Implement the local security-audit domain model and command surface, then expose it in the TypeScript client and desktop UI.

## Recent commits before continuation

- `fe91afbea1261423cf3b46d70d1afb1febfb90d8` — `feat: add responsive accessible Vaultora design system`
- `30b94212547d04b5ff39c4b7d7ecd53128c9846e` — `feat: add editable Vaultora brand mark`
- `335bc02689018fa46567a43c0e7e662fdd758ed1` — `feat: assemble responsive Vaultora desktop experience`

## Release notes draft

### 0.2.0 — Unreleased

Hardening release focused on security visibility, encrypted history safeguards, storage validation, repository automation, comprehensive documentation, accessibility, testing, and release readiness.
