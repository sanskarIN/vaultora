# Vaultora Release Process

Vaultora releases are security-sensitive. A successful build is not enough: versions, tests, security scans, packaging, signing status and restore behavior must all be reviewed before a release is promoted.

Current Tauri GitHub pipeline reference: https://v2.tauri.app/distribute/pipelines/github/

## Release types

- **Development build** — local/CI artifact, not an official user release.
- **Release candidate** — versioned tag, draft/prerelease artifacts for smoke testing.
- **Stable release** — reviewed release candidate promoted only after required platform/security checks.

## Version synchronization

Before tagging, keep these versions aligned:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Update `CHANGELOG.md` from `Unreleased` to a dated release section and refresh comparison links.

## Pre-release checks

From a clean checkout:

```bash
npm install
npm run typecheck
npm test
npm run build
npx prettier --check .
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml --all-features
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

Confirm CI, CodeQL and dependency-security checks are green on the release commit. Review any Dependabot/security alerts for reachability and resolution.

## Release-candidate smoke test

Use the full checklist in [testing.md](testing.md), especially:

- create/unlock/lock/restart;
- all entry types;
- password history;
- local security audit;
- reveal/clipboard timeouts;
- suspend/resume auto-lock;
- export/import including wrong-password/corrupt backup;
- master-password rotation;
- narrow window, keyboard, light/dark/system theme;
- packaged application persistence.

Use fictional data only.

## Tagging

Example:

```bash
git switch main
git pull --ff-only
git tag -s v0.2.0-rc.1 -m "Vaultora 0.2.0-rc.1"
git push origin v0.2.0-rc.1
```

Use a signed tag when the maintainer's Git signing setup is available. Do not put signing private keys in the repository.

The release workflow listens for `v*` tags and produces a **draft prerelease** so artifacts can be reviewed before publication.

## Desktop code signing

### Windows

A stable Windows release should be Authenticode-signed when a suitable certificate is available. Store certificate/password material in protected GitHub environment/repository secrets. Never commit PFX/P12 files or passwords.

Unsigned Windows artifacts may be used for internal release-candidate testing but should be labeled accordingly.

### macOS

A stable macOS release should use Developer ID signing and Apple notarization where available. Apple credentials/certificates are repository secrets, not source files.

For unsigned release-candidate builds, Tauri documents ad-hoc signing as an option to avoid some downloaded-app integrity behavior; this is not equivalent to Developer ID signing/notarization.

### Linux

Linux package signing/distribution varies by package format/repository. Release assets should at minimum receive published cryptographic checksums and should not be described as distribution-repository signed unless that process actually occurred.

## GitHub Actions secrets

Only configure secrets required by the chosen signing path. Typical examples may include Apple signing/notarization credentials and Windows certificate material. Exact secret names should match the release workflow/configuration in use.

Principles:

- least privilege;
- protected environments for stable release;
- no secret echo/debug output;
- no pull-request access to signing secrets from untrusted forks;
- rotate credentials after suspected exposure.

## Artifact checksums

After platform build jobs upload artifacts to the draft release, the workflow downloads release assets, creates `SHA256SUMS.txt`, and uploads it to the same release.

Users can verify a file on common platforms with tools such as:

```bash
sha256sum <artifact>
```

or platform-equivalent SHA-256 utilities.

A checksum proves integrity relative to the published checksum; it is not a substitute for code signing or a trusted distribution channel.

## Publishing

Before converting the draft to a public stable release:

1. confirm tag/commit/version alignment;
2. confirm CI/security checks on the tagged commit;
3. confirm platform artifacts are expected and start successfully;
4. confirm signing/notarization status is accurately described;
5. verify `SHA256SUMS.txt` against downloaded artifacts;
6. run backup restore smoke tests using fictional data;
7. review release notes for migrations/security/user action;
8. mark stable only if no known blocking issue remains.

## Rollback / compromised release

If a release artifact or signing credential is suspected compromised:

1. stop/prominently mark the affected release;
2. rotate compromised credentials;
3. preserve evidence/logs without exposing user secrets;
4. identify affected tags/artifacts;
5. patch from a reviewed commit;
6. publish a security advisory/release note with concrete affected versions and user action;
7. never silently replace a public artifact under the same version without disclosure.

## Vault-format migrations

A release that changes persistent format must include:

- version increment rules;
- migration tests from every supported predecessor;
- backup-before-migration behavior;
- failure/rollback semantics;
- release-note warning if older clients cannot read the new format.

## Reproducibility notes

Dependency lockfiles, explicit workflow definitions and tagged source improve reproducibility, but byte-for-byte deterministic desktop bundles are not yet claimed. Toolchain/OS signing metadata can affect output. Any future reproducible-build claim must be measured and documented per platform.
