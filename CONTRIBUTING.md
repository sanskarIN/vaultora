# Contributing to Vaultora

Thanks for helping improve Vaultora. Because a password manager handles highly sensitive data, changes are held to a higher review standard than a typical desktop utility.

## Before you start

1. Read [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md).
2. Read [docs/architecture.md](docs/architecture.md) for trust boundaries and module responsibilities.
3. Search existing issues/pull requests before opening duplicate work.
4. Use fictional test credentials only.
5. For a vulnerability, do not open a public issue; follow the private security-reporting process.

## Development setup

Follow [docs/setup.md](docs/setup.md), then run:

```bash
npm install
npm run tauri:dev
```

## Branches

Create a focused branch from `main`:

```bash
git switch main
git pull --ff-only
git switch -c feat/short-description
```

Recommended prefixes include `feat/`, `fix/`, `docs/`, `test/`, `security/`, `refactor/`, and `chore/`.

## Commit style

Use clear conventional-style messages such as:

```text
feat: add local security audit
fix: reject unbounded imported KDF parameters
test: cover inactivity timeout boundary
docs: explain encrypted backup behavior
```

Prefer small, reviewable, cohesive commits. Do not split one logical edit into artificial commits merely to increase the count.

## Required checks

Before requesting review, run:

```bash
npm run typecheck
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --all-features
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run format:check
```

CI must pass. If a platform-specific check cannot run locally, state that explicitly in the pull request and rely on the appropriate CI/release matrix job.

## Security-sensitive change checklist

Changes to cryptography, key derivation, persistence, import/export, IPC, Tauri permissions, clipboard handling, auto-lock, password history, release signing or network behavior should include:

- tests for the happy path and misuse/failure paths;
- a threat-model review;
- documentation changes where user/security behavior changes;
- an ADR for a significant architectural decision;
- compatibility/migration analysis for persistent data;
- no secret values in logs, test output, screenshots or fixtures;
- bounded parsing/allocation for untrusted input;
- explicit error handling rather than panic/unwrap in runtime code.

## Rust guidelines

- Keep cryptographic primitive use inside the Rust core.
- Prefer maintained libraries; do not implement custom cryptography.
- Treat imported files and frontend command inputs as untrusted.
- Avoid `unsafe` unless there is a documented, reviewed necessity.
- Keep persistence atomic and versioned.
- Use structured errors across the Tauri boundary.
- Add unit/property tests for security invariants.

## TypeScript/React guidelines

- Keep the IPC client typed in `src/api.ts` and contracts in `src/types.ts`.
- Do not persist secrets to `localStorage`, IndexedDB or browser caches.
- Avoid placing secret values in URLs, DOM attributes, analytics, console logs or error messages.
- Use semantic controls, labels, focus-visible states and keyboard behavior.
- Respect `prefers-reduced-motion`.
- Externalize reusable/user-facing copy through the i18n structure as the UI evolves.

## Dependency changes

Explain why a new dependency is necessary and why the existing platform/standard library cannot reasonably provide the behavior. Security-sensitive dependencies should be actively maintained and narrowly scoped.

Dependency changes should update lockfiles and pass audit/static-analysis workflows.

## Pull requests

A strong pull request:

- has one clear purpose;
- links related issues where applicable;
- explains user/security impact;
- lists verification performed;
- includes screenshots for visible UI changes when practical;
- calls out migrations or compatibility constraints;
- updates `CHANGELOG.md`, `ROADMAP.md`, or `what_changed.md` when relevant.

## Documentation

Documentation is part of the product. Keep commands copy/paste-ready and avoid claiming that a check passed unless it actually did.

## License

By contributing, you agree that your contribution may be distributed under the repository's Apache-2.0 license.

## Contact

- General/support: `supportramsandesh@gmail.com`
- Project/business: `sanskarin@outlook.in`

**Made by the Sanskar**
