# Vaultora on Android

Vaultora uses Tauri 2's mobile runtime and the same Rust vault core as the desktop application. Vault contents remain encrypted in the application's private data directory. Backup import/export is routed through the Tauri dialog and filesystem plugins so Android Storage Access Framework `content://` URIs work without moving plaintext vault data through JavaScript.

## Prerequisites

Install the current project prerequisites plus:

- Android Studio with the Android SDK and NDK installed.
- Java 17 or newer supported by the installed Android Gradle Plugin.
- Rust Android targets required by Tauri.
- Node.js matching `.nvmrc`.

Run Tauri's prerequisite checks from the project root before the first device build.

## Initialize the generated Android project

The generated Gradle project is owned by Tauri and is created from the checked-in Vaultora configuration:

```bash
npm install
npm run android:check
npm run android:init
```

Do not hand-copy the desktop executable into an Android project. `tauri android init` generates the mobile host around `src-tauri`, including the Rust mobile entry point.

## Development on a device or emulator

Start an Android emulator or connect a device with USB debugging enabled, then run:

```bash
npm run android:dev
```

To open the generated project in Android Studio through Tauri:

```bash
npm run android:studio
```

## Build APKs

```bash
npm run android:build:apk
```

The script requests split APKs per ABI to avoid shipping unnecessary native libraries to every device.

## Build a Play Store AAB

```bash
npm run android:build:aab
```

Release signing credentials must be supplied through the normal Android/Gradle signing process. Never commit keystores, signing passwords, or Play Console credentials.

## Android configuration

`src-tauri/tauri.android.conf.json` currently sets:

- Minimum Android SDK: 24.
- Android version code: 1000.
- A mobile window configuration without desktop-only minimum dimensions.

`src-tauri/capabilities/mobile.json` allows only the core operations and plugins currently used by Vaultora: clipboard text, file open/save dialogs, and reading/writing the user-selected backup file.

## Backup and restore behavior

The Android file picker can return a `content://` URI instead of a filesystem path. Vaultora therefore uses this flow:

1. Rust reads or produces the already-encrypted `.vaultora` envelope.
2. The encrypted bytes are transferred as base64 across the Tauri command boundary.
3. `@tauri-apps/plugin-fs` reads or writes the selected URI.
4. Imported bytes are parsed and authenticated by Rust before replacing the local vault.
5. Temporary JavaScript buffers never contain decrypted vault JSON.

The original path-based Rust import/export commands remain available for desktop compatibility.

## Mobile security behavior

- The vault remains local-first and encrypted at rest.
- Master passwords and imported backup payloads are zeroized in Rust after use where practical.
- Returning from the background immediately checks elapsed inactivity before recording new activity.
- Clipboard auto-clear remains available through the Tauri clipboard plugin.
- The mobile layout accounts for safe-area insets, dynamic viewport height, coarse pointers, and 48px touch targets.

## Pre-build checks

Run:

```bash
npm run android:check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

`android:check` fails when the mobile entry point, crate types, Android SDK floor, capabilities, required Tauri plugins, or content-URI backup bridge are missing.
