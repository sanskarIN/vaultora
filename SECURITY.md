# Vaultora Security Policy

Vaultora is security-sensitive software. Reports that could affect confidentiality, integrity, authentication, encryption, backup handling, browser integration, or local vault access should be handled carefully and should not initially include real passwords, production vaults, private keys, tokens, or other secrets.

## Supported version

The actively developed `main` branch and the latest published release receive security fixes. Older development snapshots may not receive backports until Vaultora has a stable release channel.

## Reporting a vulnerability

Please report suspected vulnerabilities privately by email:

- Security/support: `supportramsandesh@gmail.com`
- Project/business: `sanskarin@outlook.in`

Include:

- A concise description of the issue.
- Affected Vaultora version or commit.
- A minimal reproduction using test data only.
- Expected and observed behavior.
- Platform and browser details when relevant.
- Any suggested mitigation, if known.

Do not include real vault contents or credentials. If a proof of concept requires a vault, create a temporary vault containing synthetic test entries.

## Security boundaries

Vaultora is designed around these boundaries:

- Vault data is encrypted locally before being written to persistent storage.
- The master password is not stored as plaintext.
- Argon2id derives the encryption key from the master password and a random salt.
- XChaCha20-Poly1305 provides authenticated encryption for the serialized vault.
- Vault mutations are persisted through atomic replacement with a temporary file and recovery backup.
- Decrypted vault state exists only in the running application's memory while unlocked.
- Clipboard contents can be automatically cleared after a configured interval.
- Android backup/restore uses user-selected files or `content://` URIs while the transferred backup remains encrypted.
- The browser extension foundation does not persist vault secrets in browser storage and has no persistent host permissions.

## Out of scope assumptions

Vaultora cannot protect secrets after the operating system, user session, browser process, or device has already been fully compromised. Examples include an attacker with arbitrary process-memory access, a malicious accessibility service with sufficient privileges, a compromised kernel, or hardware/firmware compromise.

Those scenarios remain important risks, but they are outside the application's ability to fully mitigate by itself.

## Safe testing

Use disposable test vaults and synthetic credentials. Do not test against accounts or data that you do not own or have explicit authorization to use.

Avoid publishing a working exploit before maintainers have had a reasonable opportunity to understand and fix the issue. Security fixes should include regression tests whenever practical.

## Dependency security

The project keeps frontend and Rust dependencies explicit in `package.json` and `src-tauri/Cargo.toml`. CI runs frontend tests, Android readiness checks, extension security checks, Rust tests, formatting, and Clippy. Dependency updates should be reviewed for security-sensitive API or permission changes before merging.

## Browser extension security

The browser companion is intentionally staged in phases. A native messaging host, origin matching, and autofill must be reviewed together before credential filling is enabled. The extension must not add broad host permissions or browser-storage persistence merely to simplify implementation.

See `THREAT_MODEL.md` and `docs/BROWSER_EXTENSION.md` for the current design boundary.
