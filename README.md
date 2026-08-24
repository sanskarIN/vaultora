# Vaultora

Vaultora is an open-source, local-first encrypted password manager built with React, TypeScript, Rust, and Tauri 2. Vaultora 0.2.0 supports desktop and Android vault workflows plus an explicit, exact-origin browser autofill companion for Chromium-family browsers and Firefox.

> Vaultora does not require an account or cloud service. The active vault is stored locally as authenticated ciphertext.

## Platforms

- Android 7.0 / SDK 24 and newer through Tauri 2 mobile.
- Windows.
- macOS.
- Linux.
- Chromium-family browser companion.
- Firefox browser companion.

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
- One authoritative desktop GUI instance to reduce concurrent-vault-write risk.
- Browser extension with no persistent host permissions and no browser-storage secret cache.
- Browser credential matching restricted to exact HTTPS origins.
- User-selected fill: no password is requested until the user chooses a matched login.
- Active tab/origin is checked before credential retrieval and again before injection.
- Native messaging is bounded, versioned, and relayed through an authenticated loopback-only desktop bridge.

Read [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md) before relying on Vaultora for high-value secrets.

## Repository layout

```text
vaultora/
├── .github/workflows/          # CI and repository automation
├── docs/                       # Android, browser, and release guides
├── extension/                  # Manifest V3 browser companion source
│   └── native-host/            # Native messaging manifest templates
├── public/                     # Static frontend assets
├── scripts/                    # Build, validation, and native-host registration helpers
├── src/                        # React/TypeScript frontend
├── src-tauri/
│   ├── capabilities/           # Desktop and mobile Tauri permissions
│   ├── src/                    # Rust vault, browser bridge, storage, commands, models
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

## Browser extension

Validate extension security and protocol rules:

```bash
npm run extension:check
npm run native-host:check
```

Stage browser-specific unpacked builds:

```bash
npm run extension:build
```

Outputs:

```text
dist-extension/chromium/
dist-extension/firefox/
```

Chromium-family browsers use the service-worker bundle. Firefox uses the module background-script bundle with the stable add-on ID `vaultora@sanskar.in`.

### Register the native host

Build/install Vaultora first, then register the installed Vaultora desktop executable as the user-level native messaging host.

Firefox:

```bash
npm run native-host:install -- --browser=firefox --executable=/absolute/path/to/Vaultora
```

Chrome/Chromium/Edge require the exact installed extension ID:

```bash
npm run native-host:install -- --browser=chrome --executable=/absolute/path/to/Vaultora --extension-id=abcdefghijklmnopabcdefghijklmnop
```

Replace the sample extension ID with the real 32-character ID shown by your Chromium-family browser. Use `--browser=chromium` or `--browser=edge` for those browsers.

Remove a registration with:

```bash
npm run native-host:uninstall -- --browser=chrome
```

See [docs/BROWSER_EXTENSION.md](docs/BROWSER_EXTENSION.md) for OS-specific behavior and security details.

## Quality checks

Run the complete repository check:

```bash
npm run check
```

Individual checks:

```bash
npm run version:check
npm run typecheck
npm test
npm run build
npm run android:check
npm run extension:check
npm run native-host:check
npm run extension:build
cargo test --manifest-path src-tauri/Cargo.toml
npm run lint
npm run format:check
```

GitHub Actions runs the core quality gate on Linux and separately compiles all Rust targets on Linux, Windows, and macOS so desktop-only bridge and single-instance code is checked across supported desktop platforms.

## Encrypted backups

Desktop and Android use the same `.vaultora` encrypted envelope. On Android, the file picker can return a `content://` URI; Vaultora reads/writes that URI through the Tauri filesystem plugin while Rust remains responsible for parsing, authenticating, and unlocking the encrypted envelope.

Backups remain protected by the master password in effect when they were exported. Treat encrypted backups as sensitive because possession of a backup permits offline password-guessing attempts.

## Browser companion security model

Vaultora 0.2.0 implements explicit login filling without granting persistent access to every website.

1. The extension popup uses temporary `activeTab` access after the user opens it.
2. Only an HTTPS origin is accepted.
3. The Rust vault core returns login summaries only when their saved URL has the same exact scheme, host, and effective port.
4. The popup displays those summaries but receives no password.
5. A password is requested only after the user presses **Fill** for one login.
6. The extension checks the active tab and origin before requesting the selected credential.
7. Rust verifies the selected entry ID and origin against the currently unlocked in-memory session.
8. The extension checks the active tab and origin again before one-shot script injection.
9. The injected function fills an eligible current-password field and an associated username field when available.
10. The extension does not automatically submit the form and does not persist credentials in browser storage.

Vaultora deliberately refuses HTTP pages, subdomain inheritance, wildcard origins, credential requests while locked, and pages that expose only `new-password` fields.

## Native messaging architecture

The browser launches the installed Vaultora executable in native-host mode. That process handles length-prefixed native-messaging JSON and relays bounded requests to the already-running desktop app over `127.0.0.1` only.

The GUI app creates a fresh random bridge token and ephemeral port on every start and stores the metadata in the app-data directory. On Unix the metadata file is restricted to the current user. The native host must authenticate each local relay request with that token. Locking Vaultora immediately removes access to credential data because browser requests use the shared in-memory session state.

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Project links

- GitHub: https://github.com/sanskarIN
- Buy Me a Coffee: https://buymeacoffee.com/sanskarIN
- Business: sanskarin@outlook.in
- Business: sanskarin.business@gmail.com
- Support: supportramsandesh@gmail.com

**Made by the Sanskar.**
