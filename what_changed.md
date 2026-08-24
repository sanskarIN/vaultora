# What Changed

## 2026-08-24 — Android completion pass + browser-extension foundation

This work batch continues from `fe91afbea1261423cf3b46d70d1afb1febfb90d8` (`feat: add responsive accessible Vaultora design system`). The work was intentionally split into many small, reviewable commits so Android support, browser-extension preparation, security boundaries, tests, CI, and documentation can be inspected or reverted independently.

### Android / mobile application support

- Added first-class npm commands for Android initialization, development, Android Studio, split APK builds, AAB builds, and Android readiness checks.
- Aligned Tauri plugin versions across the JavaScript and Rust dependency surfaces.
- Added `@tauri-apps/plugin-fs` and initialized its Rust plugin so Android Storage Access Framework file URIs can be handled through Tauri instead of being treated as desktop filesystem paths.
- Preserved the existing Tauri mobile entry point and mobile-compatible Rust crate outputs.
- Added `src-tauri/tauri.android.conf.json` with Android-specific window behavior, minimum SDK 24, and an explicit Android version code.
- Split Tauri permissions into desktop and mobile capability documents.
- Restricted the desktop capability to Linux, macOS, and Windows.
- Added an Android/iOS mobile capability containing only the core, clipboard, dialog, and selected-file read/write permissions currently required.
- Added `scripts/check-android.mjs` so the repository fails validation if Android configuration, minimum SDK, version code, mobile capability, Rust crate types, mobile entry point, required Tauri plugins, or content-URI backup bridge are removed or weakened accidentally.
- Added `npm run android:check` to the normal project verification command.

### Android backup and restore

The previous backup UI passed desktop paths directly to Rust. Android document pickers can return `content://` URIs, so that design was not sufficient for a real Android build.

The new flow keeps the backup encrypted while crossing the platform file boundary:

1. Rust reads or produces the encrypted `.vaultora` envelope.
2. Rust exposes the encrypted bytes as base64 through dedicated Tauri commands.
3. The frontend converts only encrypted bytes between base64 and `Uint8Array`.
4. Tauri's filesystem plugin reads/writes the user-selected desktop path or Android document URI.
5. Imported bytes return to Rust for envelope parsing and authenticated decryption.
6. The imported envelope replaces the active local vault only after successful authentication with the supplied master password.

Files changed or added for this flow:

- `src-tauri/src/storage.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/api.ts`
- `src/base64.ts`
- `src/base64.test.ts`
- `src/backupFiles.ts`
- `src/components/SettingsPanel.tsx`

The original desktop path-based Rust import/export commands remain available for compatibility.

### Mobile auto-lock security

The previous inactivity listener treated a window `focus` event as fresh activity. On a mobile WebView, returning from a long background period could therefore reset the inactivity timestamp before the lock interval noticed that the configured timeout had already elapsed.

This was corrected by:

- Moving deterministic lock timing into `src/autoLock.ts`.
- Adding regression coverage in `src/autoLock.test.ts`.
- Adding `src/useAutoLock.ts` to own activity and visibility handling.
- Removing foreground focus from the activity-reset path.
- Checking elapsed inactivity immediately when document visibility returns to `visible`.
- Keeping the normal periodic inactivity check for foreground sessions.
- Updating `src/App.tsx` to use the new hook.

A vault that has exceeded its configured inactivity limit while the Android app is backgrounded now locks instead of treating the app-resume event as user activity.

### Android UI ergonomics

Added `src/mobile.css` and loaded it after the main design system.

The mobile layer adds:

- Dynamic viewport height support through `100dvh`.
- Android/iOS safe-area inset support.
- Bottom navigation padding that accounts for gesture/navigation insets.
- Safe modal placement around display cutouts and system UI.
- 48px minimum touch targets for mobile controls.
- 16px form-control text on narrow touch screens to avoid unwanted browser/WebView zoom behavior.
- Coarse-pointer behavior that avoids hover-only transforms.
- Contained list overscroll behavior.

The existing responsive layout remains the base design; the new file adds platform-specific ergonomics without duplicating the main stylesheet.

### Browser extension foundation

Added a new `extension/` workspace for the next browser-companion phase.

Current foundation includes:

- Manifest V3.
- `activeTab` and `nativeMessaging` only.
- No persistent host permissions.
- No `<all_urls>` permission.
- No browser-storage vault cache.
- Background service worker using native messaging.
- Popup shell and status UI.
- Accessible light/dark popup styling.
- Cross-browser runtime selection for Chromium-family browsers and Firefox.
- Stable Firefox extension ID `vaultora@sanskar.in`.
- Versioned native messaging protocol helpers.
- Strict validation of `vault-status` messages.
- Rejection of unsupported protocol versions/messages.
- Chromium native-host manifest template.
- Firefox native-host manifest template.

Files:

- `extension/manifest.json`
- `extension/background.js`
- `extension/protocol.js`
- `extension/popup.html`
- `extension/popup.js`
- `extension/popup.css`
- `extension/native-host/chromium.json.example`
- `extension/native-host/firefox.json.example`

### Browser extension build and security validation

Added:

- `scripts/build-extension.mjs`
- `scripts/check-extension.mjs`
- `npm run extension:build`
- `npm run extension:check`
- `dist-extension/` to `.gitignore`

`extension:build` recreates `dist-extension/` deterministically from the checked-in extension workspace.

`extension:check` currently enforces:

- Manifest V3.
- The explicit permission allowlist.
- No persistent host permissions.
- No browser storage API usage for the extension foundation.
- No `<all_urls>` or wildcard-all-host pattern.
- Presence of all required extension files.
- Stable native-host identity.
- Protocol version 1.
- Correct hello-handshake shape.
- Acceptance of valid `vault-status` messages.
- Rejection of unsupported protocol versions.

### Why credential autofill is not enabled in this batch

The browser companion has been prepared without pretending that a partially implemented autofill path is secure or complete.

Credential autofill remains gated on one coordinated implementation containing:

- Native messaging host executable.
- Native-message framing and size limits.
- Strict request/response type allowlists.
- Local unlocked-session authorization.
- Canonical active-origin validation.
- Origin-scoped credential matching.
- User-consent/fill behavior.
- Content-script field targeting.
- Lock-transition invalidation.
- Malicious-origin and malformed-message tests.

This prevents the extension foundation from requesting broad site access before the secure credential-return boundary exists.

### Continuous integration

Added `.github/workflows/ci.yml`.

For pushes to `main`, pull requests, and manual dispatch, CI performs:

- Node setup from `.nvmrc`.
- Rust stable setup with rustfmt and Clippy.
- Linux libraries needed by the Tauri build/test surface.
- JavaScript dependency installation.
- TypeScript typechecking.
- Frontend unit tests.
- Android readiness validation.
- Browser-extension security/protocol validation.
- Browser-extension staging.
- Rust unit tests.
- Rust formatting checks.
- Rust Clippy with warnings denied.
- Upload of the staged browser-extension artifact.

CI concurrency cancels superseded runs for the same ref.

### Dependency maintenance

Added `.github/dependabot.yml` with separate update streams for:

- npm dependencies — weekly.
- Cargo dependencies — weekly.
- GitHub Actions — monthly.

Pull-request limits and commit prefixes are configured so automated updates remain reviewable.

### Security documentation and project policy

Added `SECURITY.md` with:

- Responsible disclosure contacts.
- Safe testing expectations.
- Supported development branch policy.
- Security-boundary overview.
- Explicit out-of-scope compromise assumptions.
- Browser-extension security requirements.

Added `THREAT_MODEL.md` covering:

- Protected assets.
- Rust/backend trust boundary.
- React frontend boundary.
- Operating-system storage boundary.
- Clipboard risk.
- Android document-provider risk.
- Browser-extension boundary.
- Future native-host boundary.
- Cryptographic design.
- Persistence model.
- Offline vault theft.
- Vault tampering.
- Interrupted writes.
- Stale mobile sessions.
- Clipboard exposure.
- Malicious backup providers.
- Browser extension compromise.
- UI injection and URL handling.
- Residual platform compromise risks.
- Security invariants for future work.

The in-app About panel previously referenced `SECURITY.md` and `THREAT_MODEL.md` even though those files did not exist. Those references are now valid.

### Project documentation

Added a complete root `README.md` with:

- Project purpose.
- Supported platforms including Android.
- Core security design.
- Repository layout.
- Requirements.
- Desktop commands.
- Android commands.
- Extension commands.
- Quality commands.
- Backup architecture.
- Browser-companion status.
- License and project links.

Added `docs/ANDROID.md` with:

- Android prerequisites.
- Tauri Android initialization.
- Emulator/device development.
- Android Studio launch flow.
- Split APK builds.
- AAB builds.
- Android configuration explanation.
- Content-URI backup architecture.
- Mobile security behavior.
- Pre-build validation commands.

Added `docs/BROWSER_EXTENSION.md` with:

- Extension architecture.
- Permission model.
- Build/staging commands.
- Chromium loading instructions.
- Firefox loading instructions.
- Native-host manifest preparation.
- Versioned native-message handshake.
- Future native-host security boundary.
- Explicit autofill release gate.

Added `docs/RELEASE_CHECKLIST.md` covering:

- Repository state.
- Quality gates.
- Security review.
- Desktop release checks.
- Android device/build/signing checks.
- Browser companion validation.
- Autofill release gate.
- Artifact collection.

### Open-source maintenance

Added `CONTRIBUTING.md` describing:

- Local setup.
- Required quality commands.
- Security-sensitive contribution rules.
- Android requirements.
- Browser-extension requirements.
- Commit-message style.
- Pull-request expectations.

Added structured GitHub issue configuration:

- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`

The issue flow:

- Disables unstructured blank issues.
- Routes suspected vulnerabilities to `SECURITY.md` instead of public disclosure.
- Requires bug reports to use synthetic/test data.
- Collects platform/version/reproduction details.
- Requires feature proposals to state security/permission impact.

### In-app project information

Updated `src/components/AboutPanel.tsx` to state that Vaultora now targets Android in addition to Windows, macOS, and Linux. Existing project/support/business links and the `Made by the Sanskar` watermark are preserved.

### Commands added or updated

```text
npm run android:init
npm run android:dev
npm run android:studio
npm run android:build:apk
npm run android:build:aab
npm run android:check
npm run extension:build
npm run extension:check
npm run check
```

`npm run check` now includes TypeScript validation, frontend tests, Android readiness checks, browser-extension checks, and Rust tests.

### Important files added in this batch

```text
.github/dependabot.yml
.github/ISSUE_TEMPLATE/config.yml
.github/ISSUE_TEMPLATE/bug.yml
.github/ISSUE_TEMPLATE/feature.yml
.github/workflows/ci.yml
CONTRIBUTING.md
README.md
SECURITY.md
THREAT_MODEL.md
docs/ANDROID.md
docs/BROWSER_EXTENSION.md
docs/RELEASE_CHECKLIST.md
extension/background.js
extension/manifest.json
extension/native-host/chromium.json.example
extension/native-host/firefox.json.example
extension/popup.css
extension/popup.html
extension/popup.js
extension/protocol.js
scripts/build-extension.mjs
scripts/check-android.mjs
scripts/check-extension.mjs
src/autoLock.test.ts
src/autoLock.ts
src/backupFiles.ts
src/base64.test.ts
src/base64.ts
src/mobile.css
src/useAutoLock.ts
src-tauri/capabilities/mobile.json
src-tauri/tauri.android.conf.json
what_changed.md
```

### Important existing files updated in this batch

```text
.gitignore
package.json
src/App.tsx
src/api.ts
src/components/AboutPanel.tsx
src/components/SettingsPanel.tsx
src/main.tsx
src-tauri/Cargo.toml
src-tauri/capabilities/default.json
src-tauri/src/commands.rs
src-tauri/src/lib.rs
src-tauri/src/storage.rs
```

### Granular commit trail for this batch

The following commits were created after the previous `main` head. The changelog commit containing this file comes after this list.

1. `356b24da05ca9e00ef5bd18961c5bbdf9a248d97` — `build: add Android and extension workspace commands`
2. `de21ff31ee09a11721eeb4012055ba5f434b3003` — `build: align mobile-capable Tauri plugin versions`
3. `3a74f4c8f79beedcc5f078a8cc4643ef091f0d3c` — `feat: initialize cross-platform filesystem support`
4. `f8aa95d7bac94a162f23e7c63bf5ae0064a10e9f` — `feat: expose encrypted vault bytes for mobile file transport`
5. `f015f35dec6ea87f6c32aca002794e52dcf66fca` — `feat: add encrypted byte backup commands for mobile`
6. `3039d7ef39b79c75f78c08ed1b4b4f9b42fc691a` — `feat: expose mobile-safe backup transport in frontend API`
7. `80744dc85e6c92e55bbe65da2a95f086c01dd55e` — `feat: add binary-safe base64 helpers for vault transport`
8. `53ee4c43091fcc7a3113fc1f130ff21e787f8d74` — `feat: add content-URI compatible backup file bridge`
9. `aac829cbaf3c8a03bbdb8156becd7d877cfcf511` — `feat: make backup and restore work with Android content URIs`
10. `fdecdb212890cd2bb4c24e1686cc9f0fde4be3c7` — `security: scope default capability to desktop platforms`
11. `46b410d713e2f46e6da584670c38c6ac83d93f2c` — `security: add least-privilege mobile capability`
12. `ef197a343d8bd805eab175cac85de7bba07d1068` — `build: add Android-specific Tauri configuration`
13. `31d938687732919cbe742041a82cbacb6b4ad4e2` — `test: cover binary backup transport helpers`
14. `1f7d9974209756b4eb55fc2710fb09755361747d` — `feat: scaffold least-privilege Manifest V3 extension`
15. `23fe2ce355575e4123fc6e7ff25ccf8dc96f6b04` — `feat: add secure native-messaging extension background bridge`
16. `da4c30ffea54ea4439a503c79c2c057fa4fed764` — `feat: add browser companion popup shell`
17. `a36f1206dd03705b9a84def73f1b252a3f82b717` — `feat: add browser companion bridge-status controller`
18. `3d68942769c18d2b701f1fb9512a23927a209002` — `style: add accessible extension popup design`
19. `f6b78c3025e8feb9b31d14c2f3803abbda324182` — `build: add deterministic extension staging script`
20. `25c5f714088700fb45ae24eaf5447e996572072f` — `test: enforce least-privilege extension policy`
21. `d69fd175d13e2002ad99277cf7b6b63154c79891` — `build: ignore generated browser extension output`
22. `5cdb47eae611821fd0f9ddeb18e816f7afddf43f` — `test: add Android readiness validation`
23. `c5bf71b60d18fae9a167595636f7c8176a375c8b` — `test: include Android readiness in project checks`
24. `def416c0b2bf93bdd0715f8cc7b416eae7baabb4` — `ci: validate core Android and extension work on every change`
25. `4302f734b5cea764b04cda76fe488e7db6130a43` — `docs: add Chromium native messaging host manifest template`
26. `be937a488336a673a4cda50edfc448f0245bce40` — `feat: assign stable Firefox extension identity`
27. `0623300d6a7fd9c976928e6694838ad318b56c9e` — `docs: add Firefox native messaging host manifest template`
28. `ff4901f4493113c46b2a881ac877c25f6083f56f` — `style: add Android safe-area and touch ergonomics`
29. `e80400fa4c050e6bf486301e87f751388d6e8922` — `feat: enable mobile layout overrides in the app shell`
30. `7662539374158244a85597a2ebaeae3e19843c44` — `feat: centralize deterministic auto-lock timing`
31. `e02fa19b13ac183adf05d859d0dbb9802ee48f47` — `test: cover auto-lock timing across mobile background periods`
32. `0792f1eea0801c15a7995a64e474529268aab280` — `feat: enforce auto-lock across mobile visibility changes`
33. `ffe6ba36752a1cb21c3b41412ea12de53eecc18c` — `security: preserve inactivity lock across Android app resumes`
34. `76033fa9b4c000e98615a064ddda6791a89a958a` — `docs: add complete Android build and security guide`
35. `886e3dfc2e3e4f00d18896b92e4780a92915a8b5` — `docs: document secure browser extension architecture`
36. `39e5b32443c1816cdcfe6ab232fc584564a16c88` — `feat: define versioned native messaging protocol helpers`
37. `9ee5517905382b24d0f28661fe5d11328229b2bc` — `security: validate native bridge protocol messages`
38. `9fd7e6ab9e453b581bd77556147ac9ae190db090` — `test: validate browser native messaging protocol contract`
39. `95a6909b2005b2fb81aee1ec4adf108c14382967` — `docs: reflect Android support in the in-app About panel`
40. `f6c28e2b25c9588e9076090c51d9818a87c8cdf7` — `security: add responsible disclosure and security policy`
41. `993e07406eaadc2b40ff96e05909d00e6a8bab65` — `security: document Vaultora trust boundaries and threat model`
42. `a69a035812aae1474fe8d078862932a8e506eca2` — `docs: add complete Vaultora project README`
43. `6a1a74de1119d4ae6cb372d7bc18ce42ca4aa75e` — `docs: add secure contribution and testing guide`
44. `1e2a152a59d928c6b6b96c08affbd29d71bcd0bd` — `build: add automated dependency update policy`
45. `9d718c556bf7181941102d30221e8304bdf1aec6` — `docs: route security reports away from public issues`
46. `9bf504bac225179070351152e6a8bad4c3585564` — `docs: add structured non-sensitive bug report form`
47. `61fdb2de766cb98c990942b6ae93ff26f1b359c7` — `docs: add security-aware feature request form`
48. `55704ebcdfed2565dc7f36b200d90f356586efbc` — `docs: add cross-platform release readiness checklist`

### Verification status

Repository-level validation is now encoded in source-controlled scripts and GitHub Actions rather than relying only on manual instructions.

The final project verification commands are:

```bash
npm run typecheck
npm test
npm run android:check
npm run extension:check
npm run extension:build
cargo test --manifest-path src-tauri/Cargo.toml
npm run lint
npm run format:check
```

The CI workflow performs the core checks automatically on subsequent `main` pushes and pull requests.

A generated Android Gradle host is intentionally not hand-authored into this batch. Tauri generates that platform project from the checked-in application identifier, Rust mobile entry point, Android configuration, capabilities, and dependency graph through `npm run android:init`. This keeps the generated mobile host aligned with the installed Tauri CLI instead of committing a manually fabricated Gradle tree.

The browser extension is intentionally a secure foundation for the next version rather than an unsafe partial autofill implementation. Its current build is loadable as an unpacked Manifest V3 companion and is prepared for the native-host/autofill phase described in `docs/BROWSER_EXTENSION.md` and `docs/RELEASE_CHECKLIST.md`.
