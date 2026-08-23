# Vaultora Development Setup

This guide prepares a machine to build the current desktop MVP. Vaultora uses Tauri 2, so both JavaScript and native Rust/system dependencies are required.

Canonical Tauri prerequisite reference: https://v2.tauri.app/start/prerequisites/

## Common prerequisites

- Git
- Node.js 22.12 or newer (`.nvmrc` selects Node 22)
- npm 10+
- Rust stable via `rustup`
- `rustfmt` and `clippy`

Verify:

```bash
git --version
node --version
npm --version
rustc --version
cargo --version
rustfmt --version
cargo clippy --version
```

## Windows 10/11

Tauri requires the Microsoft C++ build toolchain and Edge WebView2.

1. Install **Visual Studio Build Tools** or Visual Studio with **Desktop development with C++**.
2. Ensure Microsoft Edge WebView2 Runtime is installed. It is normally already present on current Windows 10/11 systems.
3. Install Rust with the MSVC host toolchain.
4. For MSI packaging, ensure the Windows VBSCRIPT optional feature is available if the Tauri/WiX toolchain reports that it is required.

PowerShell example for Rust:

```powershell
winget install --id Rustlang.Rustup
rustup default stable-msvc
rustup component add rustfmt clippy
```

Install Node.js 22 using your preferred trusted distribution, or a version manager that honors `.nvmrc`.

## macOS

For desktop-only development, Xcode Command Line Tools are sufficient for Tauri's base prerequisites:

```bash
xcode-select --install
```

Install Rust:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
rustup component add rustfmt clippy
```

If you prefer not to pipe an installer directly to the shell, download/review the installer through https://rustup.rs/ first.

Install Node.js 22 using a trusted package or version manager.

Release signing/notarization requires additional Apple credentials and tools; see [release.md](release.md).

## Ubuntu / Debian Linux

Install current Tauri 2 native dependencies:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Then install Rust stable and Node.js 22.

Other distributions should follow the corresponding package list in the official Tauri prerequisite documentation rather than translating package names by guesswork.

## Clone and install

```bash
git clone https://github.com/sanskarIN/vaultora.git
cd vaultora
npm install
```

When lockfiles are present and up to date, CI/release automation should prefer the repository's locked install mode.

## Run the desktop app

```bash
npm run tauri:dev
```

The Vite development server runs on the port configured in `vite.config.ts`; Tauri opens the native window and connects to it.

## Frontend-only development

For UI work that does not require live Tauri commands:

```bash
npm run dev
```

Many real Vaultora flows require the Tauri command bridge, so `tauri:dev` remains the authoritative end-to-end development mode.

## Verify the environment

```bash
npm run typecheck
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run format:check
```

## Build a local bundle

```bash
npm run tauri:build
```

Do not present an unsigned local development artifact as an official release. Release artifacts must follow [release.md](release.md).

## Vault data location

Vaultora asks Tauri for the platform application-data directory and stores `vaultora.vaultora` there. Exact OS paths can differ by platform/runtime conventions and should not be hard-coded in application logic or documentation where Tauri can resolve them.

During development, use fictional vault data. Do not put real credentials into screenshots, logs, fixtures or bug reports.

## Resetting a development vault

If you need a clean development state, close Vaultora, locate the app-data directory through platform/Tauri tooling, back up anything you intentionally need, and remove the **development** `vaultora.vaultora` file. Never instruct another user to delete a vault before they have confirmed a usable encrypted backup.

## Next steps

- [Development workflow](development.md)
- [Testing](testing.md)
- [Troubleshooting](troubleshooting.md)
- [Architecture](architecture.md)
