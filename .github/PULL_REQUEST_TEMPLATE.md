## Summary

Describe the problem and the solution in a few sentences.

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Security hardening
- [ ] Refactor
- [ ] Tests
- [ ] Documentation / CI / release

## Security and privacy impact

- Does this touch cryptography, persistence, import/export, IPC, Tauri permissions, clipboard, auto-lock, password history, networking, dependencies, signing, or the vault format?
- What new untrusted input or trust boundary exists, if any?
- Why does the change fail safely?

## Verification

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --all-features`
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings`
- [ ] `npm run format:check`
- [ ] Relevant manual smoke test performed with fictional data

List any check that could not be run and why. Do not mark a check complete unless it actually passed on this commit.

## Persistent data / compatibility

- [ ] No persistent-format change
- [ ] Additive/backward-compatible change with safe defaults
- [ ] Versioned migration/rejection behavior documented and tested

Explain when applicable.

## Accessibility / UI

For visible UI changes:

- [ ] Keyboard/focus behavior checked
- [ ] Narrow window checked
- [ ] Light/dark/system theme checked
- [ ] No secret data appears in screenshots

## Documentation

- [ ] Changelog updated when user-visible/security behavior changed
- [ ] Threat model / privacy / ADR updated when architecture or trust boundaries changed
- [ ] `what_changed.md` updated for cross-session handoff when relevant

## Secret-safety confirmation

- [ ] This pull request contains no real credentials, master passwords, private vault files, private keys, tokens, recovery codes, signing secrets, or personal identity data.
