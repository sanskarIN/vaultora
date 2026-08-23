# Vaultora Privacy

Vaultora's MVP is designed around a simple privacy rule: normal vault operation stays on the user's device.

## What Vaultora stores

Vaultora stores the following inside its encrypted local vault when the user chooses to enter it:

- login names, usernames, URLs and passwords;
- secure notes;
- identity/custom fields;
- tags and favorite state;
- bounded password history for login entries;
- vault security settings such as auto-lock, clipboard timeout, reveal timeout and theme;
- entry and vault timestamps.

The encrypted vault file also contains non-secret format metadata required to decrypt it later, including the format version, KDF algorithm/parameters and salt, cipher identifier and nonce. Salts and nonces are not secrets.

## What Vaultora does not intentionally collect

The MVP does not require an account and does not intentionally collect or transmit:

- vault contents;
- master passwords or derived keys;
- generated passwords/passphrases;
- security-audit results;
- analytics or behavioral telemetry;
- advertising identifiers;
- contact lists;
- location;
- crash reports to a project-operated server.

There is no project-operated cloud vault or recovery service in the MVP.

## Network behavior

Normal installed-app vault operations do not require internet access. The renderer CSP is configured for local application resources and Tauri IPC rather than arbitrary web requests.

Opening links from documentation/About, downloading releases, installing dependencies during development, or visiting GitHub/Buy Me a Coffee uses third-party services governed by their own privacy practices and is outside the encrypted vault protocol.

## Clipboard

When the user copies a protected value, that value is placed on the operating-system clipboard. Other applications allowed to read the clipboard may be able to observe it. Vaultora schedules a configurable auto-clear and only clears when the clipboard still contains the value Vaultora wrote, reducing the risk of deleting a newer unrelated clipboard value.

Clipboard behavior is best-effort and depends on operating-system facilities.

## Backups

Exported `.vaultora` backups remain encrypted under the current master password. Their filenames, filesystem timestamps, directory locations and file sizes are visible to the operating system and any software allowed to inspect those locations.

Users choose where exported backups are stored. Vaultora does not upload them.

## Local security audit

The security audit operates on the unlocked vault locally. Current login secrets may be compared in memory to detect reuse and analyzed for strength. Audit results returned to the UI contain finding metadata rather than passwords. No breach-database request is made in the MVP.

## Operating-system and WebView data

Vaultora depends on the platform WebView, Tauri runtime, filesystem and clipboard. Operating systems may maintain swap, crash dumps, recent-file metadata, filesystem snapshots or backups outside Vaultora's control. Full-disk encryption and a protected user account are recommended.

## Logs

Production code should not log master passwords, derived keys, vault plaintext, generated secrets or clipboard contents. Development tools and operating-system diagnostics can capture application state; developers must use fictional test data.

## Deleting Vaultora data

Vaultora data is local. To remove an encrypted vault, uninstalling the application may not automatically delete the platform application-data directory, depending on the operating system and installer behavior. Users who need deletion should remove the Vaultora application-data directory and any exported backups after confirming they are no longer needed.

Secure erasure cannot be guaranteed on SSDs, filesystems with snapshots, backups, swap or wear leveling.

## Future network features

Cloud sync, breach checking, sharing or other network features are intentionally excluded from the MVP. If introduced, they must be opt-in where appropriate and this privacy document plus the threat model must be updated before release.

## Questions

Privacy/support questions can be sent to:

- `supportramsandesh@gmail.com`
- `sanskarin@outlook.in`

Security vulnerabilities should follow [SECURITY.md](SECURITY.md).

**Made by the Sanskar**
