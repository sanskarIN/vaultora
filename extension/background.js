import {
  VAULTORA_NATIVE_HOST,
  createCredentialMessage,
  createHelloMessage,
  createMatchesMessage,
  isCredentialMessage,
  isErrorMessage,
  isMatchesMessage,
  isVaultStatusMessage,
  normalizeHttpsOrigin,
} from "./protocol.js";

const extensionApi = globalThis.browser ?? globalThis.chrome;
const browserRuntime = extensionApi?.runtime;
const tabsApi = extensionApi?.tabs;
const scriptingApi = extensionApi?.scripting;
const REQUEST_TIMEOUT_MS = 3000;

let nativePort = null;
let bridgeState = {
  connected: false,
  unlocked: false,
  error: null,
};
const pending = new Map();

function publishState(next) {
  bridgeState = { ...bridgeState, ...next };
}

function rejectPending(message) {
  for (const { reject, timeout } of pending.values()) {
    clearTimeout(timeout);
    reject(new Error(message));
  }
  pending.clear();
}

function disconnectPort(reason = "Vaultora native bridge disconnected.") {
  const port = nativePort;
  nativePort = null;
  rejectPending(reason);
  if (port) {
    try {
      port.disconnect();
    } catch {
      // The native host may already be gone.
    }
  }
}

function settleNativeMessage(message) {
  if (isVaultStatusMessage(message)) {
    publishState({ connected: true, unlocked: message.unlocked, error: null });
  } else if (isErrorMessage(message) && message.code === "locked") {
    publishState({ connected: true, unlocked: false, error: null });
  } else if (isErrorMessage(message) && message.code === "bridge_offline") {
    publishState({ connected: false, unlocked: false, error: message.message });
  }

  const requestId = typeof message?.request_id === "string" ? message.request_id : "";
  const waiter = pending.get(requestId);
  if (!waiter) return;

  clearTimeout(waiter.timeout);
  pending.delete(requestId);

  if (isErrorMessage(message)) {
    const error = new Error(message.message);
    error.code = message.code;
    waiter.reject(error);
    return;
  }

  if (
    isVaultStatusMessage(message) ||
    isMatchesMessage(message) ||
    isCredentialMessage(message)
  ) {
    waiter.resolve(message);
    return;
  }

  waiter.reject(new Error("Vaultora native bridge returned an unsupported protocol message."));
}

function requestNative(message) {
  if (!nativePort) {
    return Promise.reject(new Error("Vaultora native bridge is not connected."));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(message.request_id);
      reject(new Error("Vaultora native bridge request timed out."));
    }, REQUEST_TIMEOUT_MS);

    pending.set(message.request_id, { resolve, reject, timeout });
    try {
      nativePort.postMessage(message);
    } catch (error) {
      clearTimeout(timeout);
      pending.delete(message.request_id);
      reject(error);
    }
  });
}

async function connectNativeBridge() {
  if (!browserRuntime?.connectNative) {
    publishState({ connected: false, unlocked: false, error: "Native messaging is unavailable." });
    return bridgeState;
  }

  disconnectPort("Vaultora native bridge is reconnecting.");

  try {
    const port = browserRuntime.connectNative(VAULTORA_NATIVE_HOST);
    nativePort = port;
    publishState({ connected: true, unlocked: false, error: null });

    port.onMessage.addListener(settleNativeMessage);
    port.onDisconnect.addListener(() => {
      if (nativePort !== port) return;
      const message =
        browserRuntime.lastError?.message ?? "Vaultora desktop bridge is not connected.";
      nativePort = null;
      rejectPending(message);
      publishState({ connected: false, unlocked: false, error: message });
    });

    const response = await requestNative(createHelloMessage());
    if (!isVaultStatusMessage(response)) {
      throw new Error("Vaultora native bridge handshake failed.");
    }
    publishState({ connected: true, unlocked: response.unlocked, error: null });
  } catch (error) {
    disconnectPort();
    publishState({
      connected: false,
      unlocked: false,
      error: error instanceof Error ? error.message : "Could not connect to Vaultora.",
    });
  }

  return bridgeState;
}

async function getActiveHttpsTab() {
  if (!tabsApi?.query) throw new Error("Browser tab access is unavailable.");
  const tabs = await tabsApi.query({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  const origin = normalizeHttpsOrigin(tab?.url ?? "");
  if (!Number.isInteger(tab?.id) || !origin) {
    throw new Error("Open an HTTPS website before using Vaultora autofill.");
  }
  return { tabId: tab.id, origin };
}

async function getContext() {
  const active = await getActiveHttpsTab();
  const response = await requestNative(createMatchesMessage(active.origin));
  if (!isMatchesMessage(response) || response.origin !== active.origin) {
    throw new Error("Vaultora rejected the active-site match response.");
  }
  return {
    state: bridgeState,
    origin: active.origin,
    matches: response.matches,
  };
}

async function fillCredential(origin, entryId) {
  if (typeof origin !== "string" || typeof entryId !== "string") {
    throw new Error("Credential fill request is incomplete.");
  }

  const before = await getActiveHttpsTab();
  if (before.origin !== origin) {
    throw new Error("The active website changed before Vaultora could request the credential.");
  }

  const response = await requestNative(createCredentialMessage(origin, entryId));
  if (
    !isCredentialMessage(response) ||
    response.credential.id !== entryId ||
    response.credential.origin !== origin
  ) {
    throw new Error("Vaultora rejected the credential response.");
  }

  const after = await getActiveHttpsTab();
  if (after.tabId !== before.tabId || after.origin !== origin) {
    throw new Error("The active website changed before Vaultora could fill the credential.");
  }
  if (!scriptingApi?.executeScript) {
    throw new Error("Browser scripting access is unavailable.");
  }

  const results = await scriptingApi.executeScript({
    target: { tabId: after.tabId },
    func: fillLoginCredential,
    args: [response.credential],
  });
  const result = results?.[0]?.result;
  if (!result?.passwordFilled) {
    throw new Error(
      "Vaultora could not find an eligible current-password field on this page.",
    );
  }
  return result;
}

function fillLoginCredential(credential) {
  const isUsable = (input) => {
    const rect = input.getBoundingClientRect();
    const style = globalThis.getComputedStyle(input);
    return (
      !input.disabled &&
      !input.readOnly &&
      input.type !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  };

  const setInputValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const passwordFields = Array.from(document.querySelectorAll('input[type="password"]')).filter(
    isUsable,
  );
  const password =
    passwordFields.find((input) => input.autocomplete === "current-password") ??
    passwordFields.find((input) => input.autocomplete !== "new-password");
  if (!password) return { passwordFilled: false, usernameFilled: false };

  let usernameFilled = false;
  if (credential.username) {
    const root = password.form ?? document;
    const candidates = Array.from(root.querySelectorAll("input")).filter((input) => {
      if (!isUsable(input) || input === password) return false;
      return ["text", "email", "tel", "url", ""].includes(input.type);
    });

    const score = (input) => {
      const hint = `${input.autocomplete} ${input.name} ${input.id}`.toLowerCase();
      let value = 0;
      if (input.autocomplete === "username") value += 100;
      if (input.autocomplete === "email") value += 80;
      if (/user|login|email|account/.test(hint)) value += 40;
      if (input.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING) value += 10;
      return value;
    };

    candidates.sort((left, right) => score(right) - score(left));
    if (candidates[0]) {
      setInputValue(candidates[0], credential.username);
      usernameFilled = true;
    }
  }

  setInputValue(password, credential.secret);
  password.focus();
  return { passwordFilled: true, usernameFilled };
}

async function handleRuntimeMessage(message) {
  switch (message?.type) {
    case "vaultora:get-status":
      return bridgeState;
    case "vaultora:reconnect":
      return connectNativeBridge();
    case "vaultora:get-context":
      return getContext();
    case "vaultora:fill":
      return fillCredential(message.origin, message.entryId);
    default:
      throw new Error("Unsupported Vaultora extension request.");
  }
}

browserRuntime?.onMessage.addListener((message, _sender, sendResponse) => {
  void handleRuntimeMessage(message)
    .then((response) => sendResponse({ ok: true, response }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Vaultora could not complete the request.",
      }),
    );
  return true;
});

void connectNativeBridge();
