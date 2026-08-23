# Security Policy

Vaultora is security-sensitive software. Please report suspected vulnerabilities privately so maintainers have a reasonable opportunity to investigate and prepare a fix before public disclosure.

## Supported versions

Until the first stable release, only the latest commit on `main` and the newest published release candidate receive security fixes. After stable releases begin, this table will identify supported release lines explicitly.

| Version | Supported |
| --- | --- |
| Latest `main` / newest release | Yes |
| Older pre-release snapshots | No |

## Reporting a vulnerability

Do **not** open a public GitHub issue for a vulnerability that could expose vault contents, master passwords, generated secrets, clipboard contents, file locations, or enable code execution or privilege escalation.

Send a private report to:

- `supportramsandesh@gmail.com`
- `sanskarin@outlook.in`

Include, when possible:

- affected Vaultora version/commit and operating system;
- a concise description of the impact;
- reproducible steps using fictional test data;
- relevant logs with all secrets and personal data removed;
- whether the issue is already public or actively exploited;
- a suggested mitigation, if you have one.

Never send a real vault, master password, recovery material, or private credentials. A minimal synthetic reproduction is preferred.

## Response process

The project aims to:

1. acknowledge a credible report;
2. reproduce and classify severity;
3. prepare tests and a minimal remediation;
4. review whether the fix changes the vault format or requires user action;
5. publish a patched release and security notes;
6. coordinate disclosure once affected users can update.

No fixed response-time SLA is promised for this volunteer open-source project. High-impact reports are prioritized.

## Security scope

Examples that are in scope include:

- bypassing authenticated encryption or accepting modified ciphertext;
- vault data written to disk in plaintext;
- master-password or secret leakage through logs/errors;
- unsafe import parsing or resource-exhaustion paths;
- insecure Tauri capabilities/CSP that expose privileged commands;
- clipboard auto-clear behavior that destroys unrelated clipboard data;
- auto-lock bypasses;
- arbitrary file overwrite/read through a Vaultora command;
- dependency vulnerabilities that are reachable in Vaultora's threat model.

Examples generally outside scope unless they expose a Vaultora-specific defect:

- an already-compromised administrator/root account reading process memory;
- malware with equivalent user privileges controlling the desktop session;
- forgotten master-password recovery requests;
- social engineering unrelated to Vaultora code;
- denial of service requiring manual modification of private application data by the same local user, unless it crosses a meaningful security boundary.

## Cryptography policy

Vaultora does not design its own cryptographic primitives. The current format uses maintained Argon2id and XChaCha20-Poly1305 libraries with versioned metadata and associated data. Parameters accepted from imported files are bounded before key derivation.

Cryptographic changes require tests, documentation, an ADR, compatibility analysis and preferably external review before a stable release.

## Secrets in reports and CI

Repository automation must never print or upload real vault contents, master passwords, signing secrets, API tokens, or private keys. Test fixtures must use obviously fictional data. Build-signing credentials, when configured by maintainers, belong in protected repository/environment secrets and must not be added to source control.

## Security documentation

See also:

- [THREAT_MODEL.md](THREAT_MODEL.md)
- [PRIVACY.md](PRIVACY.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/testing.md](docs/testing.md)

**Made by the Sanskar**
