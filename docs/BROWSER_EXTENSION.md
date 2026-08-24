# Vaultora Browser Extension — 0.2.0

Vaultora 0.2.0 includes a browser companion for Chromium-family browsers and Firefox. The extension does not contain a second vault implementation and does not persist vault secrets in browser storage.

## Permission model

The source manifest requests exactly:

- `nativeMessaging` — communicates with the installed Vaultora desktop executable in native-host mode.
- `activeTab` — provides temporary access to the tab after the user opens/interacts with Vaultora.
- `scripting` — performs one-shot credential injection into that temporarily authorized tab.

There are no persistent `host_permissions`, no `<all_urls>`, and no wildcard-all-host permission.

## Browser-specific builds

Run:

```bash
npm install
npm run extension:check
npm run native-host:check
npm run extension:build
```

The build script produces:

```text
dist-extension/chromium/
dist-extension/firefox/
```

The Chromium build uses a Manifest V3 `background.service_worker`.

The Firefox build uses a Manifest V3 module `background.scripts` event page because Firefox does not currently implement extension background service workers. The Firefox add-on ID is fixed to:

```text
vaultora@sanskar.in
```

## Load the unpacked Chromium extension

1. Run `npm run extension:build`.
2. Open the browser extensions page.
3. Enable developer mode.
4. Choose **Load unpacked**.
5. Select `dist-extension/chromium/`.
6. Copy the exact 32-character extension ID shown by the browser.
7. Register Vaultora's native host using that ID.

Example:

```bash
npm run native-host:install -- --browser=chrome --executable=/absolute/path/to/Vaultora --extension-id=abcdefghijklmnopabcdefghijklmnop
```

Use `--browser=chromium` or `--browser=edge` when appropriate. Replace the example extension ID with the browser's actual extension ID.

## Load the temporary Firefox extension

1. Run `npm run extension:build`.
2. Open Firefox's add-on debugging page.
3. Load `dist-extension/firefox/manifest.json` as a temporary extension.
4. Register the native host:

```bash
npm run native-host:install -- --browser=firefox --executable=/absolute/path/to/Vaultora
```

Firefox registration does not require an extension-ID argument because the checked-in manifest has the stable ID `vaultora@sanskar.in`.

## Remove native-host registration

Examples:

```bash
npm run native-host:uninstall -- --browser=chrome
npm run native-host:uninstall -- --browser=firefox
```

The installer writes only user-level native-host registration. It does not require system-wide installation paths.

## Native-host registration locations

Vaultora's installer follows browser-native user registration rules.

### Windows

A manifest is generated below `%LOCALAPPDATA%\Vaultora\NativeMessagingHosts\<browser>\` and the corresponding current-user registry key points to it:

- Chrome: `HKCU\Software\Google\Chrome\NativeMessagingHosts\in.sanskar.vaultora.bridge`
- Chromium: `HKCU\Software\Chromium\NativeMessagingHosts\in.sanskar.vaultora.bridge`
- Edge: `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\in.sanskar.vaultora.bridge`
- Firefox: `HKCU\Software\Mozilla\NativeMessagingHosts\in.sanskar.vaultora.bridge`

### macOS

User manifests are written under the browser's `NativeMessagingHosts` directory:

- Chrome: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- Chromium: `~/Library/Application Support/Chromium/NativeMessagingHosts/`
- Edge: `~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/`
- Firefox: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`

### Linux

- Chrome: `~/.config/google-chrome/NativeMessagingHosts/`
- Chromium: `~/.config/chromium/NativeMessagingHosts/`
- Edge: `~/.config/microsoft-edge/NativeMessagingHosts/`
- Firefox: `~/.mozilla/native-messaging-hosts/`

If `XDG_CONFIG_HOME` is set, Chromium-family user manifest locations are based on it instead of `~/.config`.

## Protocol version 2

Every browser/native message has:

- `version: 2`
- a bounded request size
- a unique `request_id`
- an allowlisted request `type`

The initial handshake is shaped like:

```json
{
  "version": 2,
  "type": "hello",
  "request_id": "generated-request-id",
  "client": "vaultora-browser-extension"
}
```

Supported request types are:

- `hello`
- `get-status`
- `list-matches`
- `get-credential`

Unknown versions and request types are rejected.

## Desktop bridge

The installed Vaultora executable serves two modes:

- normal invocation starts the Tauri desktop UI;
- browser-native invocation starts the native-messaging stdin/stdout relay without opening the GUI.

The GUI process owns the unlocked vault session. At startup it:

1. binds an ephemeral listener to `127.0.0.1` only;
2. creates a fresh random 256-bit bridge token;
3. writes the port/token metadata to the Vaultora app-data directory;
4. restricts the metadata file to the current user on Unix;
5. replaces stale metadata left by a previous interrupted process;
6. removes bridge metadata during a normal shutdown.

The browser-launched native host reads the metadata and forwards each bounded request to the existing GUI process. The GUI validates the token before handling the request.

The desktop application is single-instance on Windows, macOS, and Linux so one GUI process owns the local vault and browser bridge.

## Exact-origin matching

Vaultora will only consider a saved login for browser fill when:

- the active page uses HTTPS;
- the saved entry is a `login` entry;
- the saved entry URL parses as HTTPS;
- scheme, host, and effective port exactly equal the active page origin.

This means:

- `https://example.test/login` can match `https://example.test/account`;
- `https://example.test` does **not** match `https://sub.example.test`;
- `https://example.test` does **not** match `https://example.test:8443`;
- HTTP never matches HTTPS;
- URLs containing embedded username/password credentials are rejected.

## Explicit fill flow

1. The user opens the Vaultora popup on an HTTPS page.
2. The background context canonicalizes the active tab to an HTTPS origin.
3. Rust receives only the origin and returns matching login summaries: ID, display name, username, origin, favorite state.
4. The popup displays summaries. It receives no password.
5. The user presses **Fill** on one selected login.
6. The background checks the active tab/origin again.
7. The background sends the selected entry ID and exact origin to Rust.
8. Rust checks that the vault is unlocked, the ID exists, the entry is a login, and its saved URL has the exact requested origin.
9. Only then does Rust return username/password to the background context.
10. The background checks the tab ID and origin again before injection.
11. A one-shot script fills an eligible current-password field and an associated username field when one is available.
12. Vaultora does not submit the form automatically.

The popup never sees the returned secret and the extension does not persist it.

## Login field restrictions

The injected function:

- considers only visible, enabled, writable inputs;
- prefers `autocomplete="current-password"`;
- refuses a page when the only password inputs are explicitly `autocomplete="new-password"`;
- scores username/email/account hints to select a likely username field;
- dispatches normal `input` and `change` events after setting values;
- never clicks a submit button.

This initial fill policy intentionally favors conservative behavior over filling every unusual website.

## Lock behavior

Browser requests are evaluated against the desktop app's shared in-memory session. When Vaultora locks, that session becomes `None`; subsequent match or credential requests receive a locked error. No browser-side vault copy remains available.

## Message and transport limits

The native host enforces bounded length-prefixed JSON framing. The local relay also has request/response limits and short read/write timeouts. The native host communicates with the GUI only through loopback and authenticates with the fresh per-process bridge token.

## Security constraints retained for future versions

Vaultora 0.2.0 does not implement:

- background automatic filling without a user opening/using the extension;
- wildcard-domain or parent-domain matching;
- HTTP credential filling;
- automatic form submission;
- browser-side credential caching;
- cloud synchronization;
- a permission to read all websites persistently.

Any future feature that changes those boundaries requires a threat-model update and dedicated tests before release.
