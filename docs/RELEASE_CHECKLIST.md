# Vaultora Release Checklist

Use this checklist before publishing a Vaultora desktop, Android, or browser-companion build.

## Repository state

- [ ] `main` contains only intended release changes.
- [ ] `what_changed.md` is updated for the release batch.
- [ ] Application versions are synchronized where the release requires it.
- [ ] No `.env`, keystore, signing password, native-host local path, real vault, or credential file is committed.
- [ ] Dependency update pull requests relevant to security have been reviewed.

## Quality gates

- [ ] `npm install` completes successfully.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run android:check` passes.
- [ ] `npm run extension:check` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run format:check` passes.
- [ ] GitHub Actions is green for the release commit.

## Security review

- [ ] No plaintext vault JSON is written to persistent storage.
- [ ] Master-password and key-handling changes were reviewed against `THREAT_MODEL.md`.
- [ ] Backup imports authenticate the envelope before replacing the local vault.
- [ ] New Tauri permissions are narrowly scoped and justified.
- [ ] Clipboard behavior still clears copied secrets according to settings.
- [ ] Background/resume behavior still enforces inactivity auto-lock.
- [ ] Logs, errors, screenshots, and examples contain no passwords, keys, decrypted fields, or encrypted-backup payloads.

## Desktop release

- [ ] `npm run tauri:build` succeeds on every desktop platform being published.
- [ ] Fresh install, upgrade, create, unlock, edit, delete, lock, generator, backup, restore, and master-password rotation flows are smoke-tested.
- [ ] Packaging metadata, icons, license, and application identifier are correct.

## Android release

- [ ] Android Studio/SDK/NDK/Java prerequisites are current.
- [ ] `npm run android:init` has generated a valid mobile host for the configured identifier.
- [ ] `npm run android:dev` is smoke-tested on at least one emulator and one physical device when available.
- [ ] Safe-area layout is checked with gesture navigation and display cutouts.
- [ ] App background/resume past the configured inactivity interval locks the vault.
- [ ] Clipboard auto-clear is verified on-device.
- [ ] Backup export and import are verified through an Android document provider returning `content://` URIs.
- [ ] `npm run android:build:apk` succeeds for test distribution.
- [ ] `npm run android:build:aab` succeeds for Play Store distribution.
- [ ] Release signing uses local/CI secrets that are not committed to Git.
- [ ] Android `versionCode` is valid for the release and Play Console history.

## Browser companion foundation

- [ ] `npm run extension:build` produces `dist-extension/`.
- [ ] The unpacked Chromium build loads without manifest errors.
- [ ] The temporary Firefox build loads with the configured Gecko ID.
- [ ] The manifest requests no unexpected permissions or persistent host permissions.
- [ ] The service worker rejects unsupported native-protocol versions/messages.
- [ ] No browser storage API is used for vault secrets.
- [ ] Native-host manifests contain production paths/IDs only in installer-generated output, not repository templates.

## Autofill release gate

Do not mark browser autofill complete until all of the following ship together:

- [ ] Native messaging host executable.
- [ ] Strict message framing and size limits.
- [ ] Protocol version/type allowlists.
- [ ] Vault unlocked-state authorization.
- [ ] Canonical active-origin validation.
- [ ] Credential matching scoped to that origin.
- [ ] User-consent/fill behavior.
- [ ] Content-script field targeting.
- [ ] Tests for malicious origins, malformed messages, stale sessions, and lock transitions.
- [ ] Review confirming that no persistent browser secret cache was introduced.

## Release artifacts

- [ ] Desktop packages are collected and checksummed when applicable.
- [ ] Android APK/AAB artifacts are collected from the Tauri-generated Gradle output.
- [ ] Browser companion output is generated from `extension/`, not edited in `dist-extension/`.
- [ ] Release notes describe security-relevant behavior changes without exposing secrets.
- [ ] `SECURITY.md`, `THREAT_MODEL.md`, and platform documentation match the shipped behavior.
