# Vaultora Troubleshooting

Use fictional data when reproducing a problem. Never post a real vault, master password, current/previous password, recovery code, private key, or identity record in a public issue.

## `npm install` fails

Check versions first:

```bash
node --version
npm --version
```

Vaultora expects Node 22.12+ and npm 10+. If you use a version manager, make sure it has selected the version in `.nvmrc`.

Then try from a clean dependency directory while preserving the committed lockfile:

```bash
rm -rf node_modules
npm install
```

On Windows PowerShell, remove `node_modules` using PowerShell/File Explorer instead of the Unix `rm` command.

Do not delete lockfiles as a first troubleshooting step; unexpected lockfile changes can hide dependency drift.

## Tauri development build fails on Linux

Confirm the Tauri 2 native dependencies in [setup.md](setup.md), especially WebKitGTK 4.1 development headers, OpenSSL development headers, build tools and indicator/Rsvg packages.

Useful diagnostics:

```bash
rustc --version
cargo --version
pkg-config --modversion webkit2gtk-4.1
```

If your distribution is not Debian/Ubuntu, follow the package names from the official Tauri prerequisites rather than substituting guessed names.

## Tauri build fails on Windows

Check that:

- Visual Studio Build Tools include **Desktop development with C++**;
- Rust is using an MSVC toolchain;
- WebView2 Runtime is installed/current;
- MSI-specific failures are not caused by a disabled VBSCRIPT Windows optional feature.

Diagnostics:

```powershell
rustup show
rustc -vV
```

## Tauri build fails on macOS

For desktop development, verify Xcode Command Line Tools:

```bash
xcode-select -p
clang --version
```

Signing/notarization failures belong to the release configuration; see [release.md](release.md).

## Vault will not unlock

Common causes:

- wrong master password;
- a damaged/unsupported encrypted file;
- a vault created by a future incompatible format;
- application-data filesystem problems.

Do not repeatedly modify or overwrite the only copy of an important vault while troubleshooting. First preserve the encrypted file and any known-good encrypted exports.

Vaultora cannot recover a forgotten master password.

## Import reports authentication failure

An encrypted backup can only be opened with the master password that protected that backup when it was exported. A later master-password change does not retroactively re-encrypt older exported backups.

Confirm you selected the intended `.vaultora` backup and are using its matching password.

Do not convert or edit the encrypted JSON file manually.

## Import reports unsupported/invalid format

Vaultora rejects:

- non-regular files;
- empty files;
- files over the configured encrypted-file safety limit;
- malformed envelopes;
- unsupported versions/algorithms;
- invalid salt/nonce encodings;
- KDF parameters outside safety bounds;
- authenticated payloads that violate structural limits.

This is intentional fail-closed behavior.

## Clipboard did not clear

Clipboard clearing is best-effort and platform dependent. Vaultora intentionally does **not** clear the clipboard if another application/user action replaced the value after Vaultora copied the secret. This avoids deleting newer unrelated clipboard content.

If the clipboard still contains exactly the Vaultora-copied value after the configured timeout, collect platform/version details using a fictional value and file a non-security bug unless there is evidence of secret exposure beyond expected OS clipboard behavior.

## Vault locked after returning to the app

This is expected if the configured inactivity window elapsed while the application was backgrounded or suspended. Vaultora checks elapsed time before resumed focus/click activity can reset the timer.

## Security audit flags a reused password

The audit compares current login password values locally in the unlocked session. It does not send the password to a server. Update affected logins to unique generated values where the corresponding service supports it.

A clean audit is not proof that credentials have never been exposed elsewhere.

## UI is too small / narrow

Vaultora has responsive breakpoints, including a bottom navigation layout at narrow widths. If controls overlap at a specific OS scaling factor or window size, report:

- OS/version;
- display scaling percentage;
- window dimensions if known;
- sanitized screenshot containing no vault secrets.

## Theme looks wrong

Vaultora supports `system`, `light`, and `dark`. For `system`, the WebView follows the operating-system `prefers-color-scheme` signal. Test an explicit light/dark selection to distinguish Vaultora styling from platform/WebView theme detection.

## CI formatting failure

Run:

```bash
npm run format
npm run format:check
```

Formatting changes should be committed. Do not disable the formatting gate to merge unrelated code.

## Rust Clippy failure

Run the same command as CI:

```bash
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

Fix warnings unless there is a documented reason for a narrowly scoped lint allowance.

## Where to ask for help

See [SUPPORT.md](../SUPPORT.md). Security vulnerabilities must use [SECURITY.md](../SECURITY.md) instead of public troubleshooting issues.
