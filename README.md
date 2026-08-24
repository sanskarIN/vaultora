# Vaultora

Vaultora is an open-source, local-first encrypted password manager built with React, TypeScript, Rust, and Tauri 2. The desktop and Android applications share the same Rust vault core, and the repository now includes a least-privilege Manifest V3 browser-companion foundation.

> Vaultora does not require an account or cloud service. The active vault is stored locally as authenticated ciphertext.

## Platforms

- Android 7.0 / SDK 24 and newer through Tauri 2 mobile.
- Windows.
- macOS.
- Linux.
- Browser companion foundation for Chromium-family browsers and Firefox.

## Core security design

- Argon2id master-password key derivation.
- XChaCha20-Poly1305 authenticated encryption.
- Random salts and nonces.
- Atomic encrypted local persistence with recovery handling.
- Explicit lock and configurable inactivity auto-lock.
- Mobile resume-aware inactivity enforcement.
- Configurable clipboard clearing.
- Encrypted backup import/export on desktop and Android.
- Android Storage Access Framework `content://` support without plaintext backup serialization in the UI.
- Least-privilege Tauri capabilities split by desktop and mobile platform.
- Browser extension with no persistent host permissions and no browser-storage secret cache.

Read [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md) before relying on Vaultora for high-value secrets.

## Repository layout

```text
vaultora/
├── .github/workflows/          # CI and repository automation
├── docs/                       # Android and browser-extension guides
├── extension/                  # Manifest V3 browser companion foundation
│   └── native-host/            # Native messaging manifest templates
├── public/                     # Static frontend assets
├── scripts/                    # Android/extension validation and build helpers
├── src/                        # React/TypeScript frontend
├── src-tauri/
│   ├── capabilities/           # Desktop and mobile Tauri permissions
│   ├── src/                    # Rust encryption, storage, commands, models
│   ├── tauri.android.conf.json # Android-specific configuration
│   └── tauri.conf.json         # Shared/desktop Tauri configuration
├── SECURITY.md
├── THREAT_MODEL.md
└── what_changed.md
```

## Requirements

### Shared

- Node.js version from `.nvmrc`.
- npm 10 or newer.
- Rust stable compatible with the `rust-version` declared in `src-tauri/Cargo.toml`.
- Platform prerequisites required by Tauri 2.

### Android

Install Android Studio, the Android SDK/NDK, Java, and the Rust Android targets required by Tauri. See [docs/ANDROID.md](docs/ANDROID.md).

## Install

```bash
npm install
```

## Web UI development

```bash
npm run dev
```

## Desktop development

```bash
npm run tauri:dev
```

## Desktop build

```bash
npm run tauri:build
```

## Android

Validate the checked-in mobile boundary:

```bash
npm run android:check
```

Initialize the generated Android host once:

```bash
npm run android:init
```

Run on an emulator/device:

```bash
npm run android:dev
```

Open through Android Studio:

```bash
npm run android:studio
```

Build split APKs:

```bash
npm run android:build:apk
```

Build a Play Store AAB:

```bash
npm run android:build:aab
```

## Browser extension foundation

Validate its permission/security policy:

```bash
npm run extension:check
```

Stage an unpacked build:

```bash
npm run extension:build
```

The generated output is written to `dist-extension/`. See [docs/BROWSER_EXTENSION.md](docs/BROWSER_EXTENSION.md) for loading instructions and the native-messaging security boundary.

## Quality checks

Run the complete repository check:

```bash
npm run check
```

Individual checks:

```bash
npm run typecheck
npm test
npm run android:check
npm run extension:check
cargo test --manifest-path src-tauri/Cargo.toml
npm run lint
npm run format:check
```

GitHub Actions also runs frontend tests, Android readiness checks, extension policy/protocol checks, Rust tests, Rust formatting, and Clippy. It stages the browser extension as a CI artifact.

## Encrypted backups

Desktop and Android use the same `.vaultora` encrypted envelope. On Android, the file picker can return a `content://` URI; Vaultora reads/writes that URI through the Tauri filesystem plugin while Rust remains responsible for parsing, authenticating, and unlocking the encrypted envelope.

Backups remain protected by the master password in effect when they were exported. Treat encrypted backups as sensitive because possession of a backup permits offline password-guessing attempts.

## Browser companion status

The checked-in extension is a secure foundation, not a completed autofill release. It currently provides:

- Manifest V3 packaging.
- Chromium and Firefox runtime compatibility in the popup/service worker.
- Native messaging connection preparation.
- Versioned protocol validation.
- Local bridge status UI.
- Chromium and Firefox native-host manifest templates.
- Automated enforcement against broad host permissions and browser secret storage.

Credential autofill is intentionally deferred until the native host, origin matching, consent behavior, and security tests can ship together.

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Project links

- GitHub: https://github.com/sanskarIN
- Buy Me a Coffee: https://buymeacoffee.com/sanskarIN
- Business: sanskarin@outlook.in
- Business: sanskarin.business@gmail.com
- Support: supportramsandesh@gmail.com

**Made by the Sanskar.**
