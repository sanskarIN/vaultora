# Vaultora Browser Extension Foundation

The `extension/` workspace is the browser companion foundation for Vaultora. It intentionally does not contain a second vault implementation and does not persist vault secrets in browser storage.

## Current architecture

The extension uses Manifest V3 and requests only:

- `nativeMessaging` to communicate with a local Vaultora native host.
- `activeTab` for future user-invoked page integration without permanent site access.

There are no persistent host permissions and no wildcard URL permissions.

The extension popup currently reports whether the Vaultora native bridge is connected and whether the local vault reports itself unlocked. The background service worker owns the native messaging connection.

## Build and validation

From the repository root:

```bash
npm install
npm run extension:check
npm run extension:build
```

The staged unpacked extension is written to `dist-extension/` and is intentionally ignored by Git.

`extension:check` enforces the current security boundary. It rejects unexpected permissions, host permissions, browser storage APIs, `<all_urls>`, and wildcard-all-host patterns.

## Load the unpacked Chromium extension

1. Run `npm run extension:build`.
2. Open the browser's extensions page.
3. Enable developer mode.
4. Choose **Load unpacked**.
5. Select `dist-extension/`.
6. Note the generated extension ID and put it into a local copy of `extension/native-host/chromium.json.example`.

The native messaging host manifest must be installed in the browser-specific operating-system location. Its `path` must be an absolute path to the future Vaultora native-host executable.

## Load the temporary Firefox extension

The manifest contains the stable Firefox extension ID `vaultora@sanskar.in`.

Use Firefox's extension debugging page to load `dist-extension/manifest.json` temporarily during development. A local native-host manifest can be based on `extension/native-host/firefox.json.example`.

## Native messaging protocol foundation

The extension currently initiates the following versioned handshake:

```json
{
  "version": 1,
  "type": "hello",
  "client": "vaultora-browser-extension"
}
```

The popup understands bridge status through the extension service worker. The future native host should respond with a message shaped like:

```json
{
  "version": 1,
  "type": "vault-status",
  "unlocked": true
}
```

The host should reject unknown protocol versions and message types. Browser requests for credentials must always be origin-scoped and require the local vault to be unlocked. Secrets should be returned only for explicit, narrowly scoped operations and should never be cached by the extension.

## Planned native-host security boundary

The next native-host implementation should:

1. Run as a small local process launched only by an approved browser extension origin.
2. Use native messaging's length-prefixed JSON framing over standard input/output.
3. Authenticate every request against the currently unlocked Vaultora desktop session.
4. Canonicalize and compare the active page origin before returning matching login metadata.
5. Keep password values out of logs, browser storage, analytics, crash reports, and persistent extension state.
6. Return only the fields required for the requested browser action.
7. Apply request size limits, message-version validation, and strict allowlists.
8. Close or invalidate browser access whenever Vaultora locks.

## Why autofill is not enabled yet

Autofill is deliberately not shipped in this foundation commit because a safe autofill feature requires the native host, origin matching, field targeting, user-consent behavior, and security tests to land together. Shipping a content script before that boundary exists would either require broad site permissions or create a misleading UI that cannot securely retrieve credentials.
