# Vaultora Roadmap

This roadmap is directional rather than a promise of dates. Security and data-format correctness take priority over feature count.

## 0.2 — Hardening and release readiness

- [x] Local password-health/security audit.
- [x] Bounded encrypted password history.
- [x] Resume-safe inactivity locking.
- [x] Imported-file size and payload validation.
- [x] Imported Argon2 work-factor bounds.
- [x] Atomic storage durability improvements.
- [x] Security, privacy and threat-model documentation.
- [ ] Complete CI/static-analysis/security automation and make it green.
- [ ] Complete cross-platform release workflow and artifact checksums.
- [ ] Replace temporary bootstrap materialization files/workflow.
- [ ] Expand component/integration test coverage.
- [ ] Final accessibility and keyboard pass.
- [ ] Publish release-candidate screenshots from packaged builds.

## 0.3 — Vault usability

- [ ] Trash/recently-deleted entries with bounded retention and secure purge.
- [ ] Custom fields for all supported entry types with protected/unprotected display semantics.
- [ ] Duplicate entry action.
- [ ] More advanced sorting and saved local filters.
- [ ] Optional entry creation templates.
- [ ] Import/export compatibility research for common password-manager formats with explicit plaintext warnings and safe temporary-file handling.
- [ ] Better password-history controls and history pruning UX.
- [ ] Local vault health trend metadata without telemetry.

## 0.4 — Platform integration

- [ ] Evaluate biometric/OS credential-gated unlock without weakening the master-key model.
- [ ] Evaluate platform keychain integration for an encrypted convenience-unlock token.
- [ ] Global quick-access window with explicit security controls.
- [ ] Better native notifications for lock/clipboard lifecycle where appropriate.
- [ ] Platform-specific accessibility testing and installer polish.

Any convenience-unlock feature requires an ADR and threat-model update before implementation.

## 0.5 — Extensibility

- [ ] Define a safe, versioned import/export extension boundary.
- [ ] Investigate attachment support with streaming authenticated encryption and strict size limits.
- [ ] Investigate browser/autofill integration as a separately reviewed security boundary.
- [ ] Add broader localization infrastructure and translated string packs.

## 1.0 — Stable local vault

Target criteria include:

- stable documented vault format/migration policy;
- green CI/security gates across supported platforms;
- signed/notarized official desktop artifacts where practical;
- restore-tested backup workflow;
- mature accessibility and keyboard support;
- documented performance budgets;
- completed security review of the local-only architecture;
- no known critical/high vulnerabilities in reachable dependencies at release time.

## Future — Optional end-to-end encrypted sync

Cloud sync is explicitly **not** part of the MVP or 1.0 local-vault requirement.

A sync design must exist as a separate module and must address, before implementation:

- client-side key hierarchy and device enrollment;
- server-compromise confidentiality;
- metadata leakage;
- replay/rollback protection;
- multi-device conflicts and deletion semantics;
- recovery and device revocation;
- protocol/version migration;
- authentication and rate limiting;
- offline operation;
- independent threat-model/security review.

No server should receive plaintext vault data or a master password.

## Non-goals unless separately approved

- advertising or behavioral analytics inside the vault experience;
- project-operated password recovery/escrow that can decrypt user vaults;
- custom cryptographic primitives;
- silently uploading vault contents;
- mandatory accounts for local-vault use.

## How priorities are chosen

Priority order:

1. prevent data loss and secret exposure;
2. fix correctness/security regressions;
3. improve backup/recovery confidence;
4. improve accessibility and usability;
5. add features with bounded new attack surface;
6. add network features only after dedicated design review.

**Made by the Sanskar**
