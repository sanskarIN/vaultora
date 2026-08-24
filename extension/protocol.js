export const VAULTORA_PROTOCOL_VERSION = 2;
export const VAULTORA_NATIVE_HOST = "in.sanskar.vaultora.bridge";

export function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createHelloMessage() {
  return {
    version: VAULTORA_PROTOCOL_VERSION,
    type: "hello",
    request_id: createRequestId(),
    client: "vaultora-browser-extension",
  };
}

export function createStatusMessage() {
  return {
    version: VAULTORA_PROTOCOL_VERSION,
    type: "get-status",
    request_id: createRequestId(),
  };
}

export function createMatchesMessage(origin) {
  return {
    version: VAULTORA_PROTOCOL_VERSION,
    type: "list-matches",
    request_id: createRequestId(),
    origin,
  };
}

export function createCredentialMessage(origin, entryId) {
  return {
    version: VAULTORA_PROTOCOL_VERSION,
    type: "get-credential",
    request_id: createRequestId(),
    origin,
    entry_id: entryId,
  };
}

export function normalizeHttpsOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isBaseMessage(message, type) {
  return (
    typeof message === "object" &&
    message !== null &&
    message.version === VAULTORA_PROTOCOL_VERSION &&
    message.type === type &&
    typeof message.request_id === "string"
  );
}

export function isVaultStatusMessage(message) {
  return isBaseMessage(message, "vault-status") && typeof message.unlocked === "boolean";
}

export function isMatchesMessage(message) {
  return (
    isBaseMessage(message, "matches") &&
    typeof message.origin === "string" &&
    Array.isArray(message.matches) &&
    message.matches.every(
      (entry) =>
        typeof entry?.id === "string" &&
        typeof entry?.name === "string" &&
        typeof entry?.username === "string" &&
        typeof entry?.origin === "string" &&
        typeof entry?.favorite === "boolean",
    )
  );
}

export function isCredentialMessage(message) {
  return (
    isBaseMessage(message, "credential") &&
    typeof message.credential?.id === "string" &&
    typeof message.credential?.username === "string" &&
    typeof message.credential?.secret === "string" &&
    typeof message.credential?.origin === "string"
  );
}

export function isErrorMessage(message) {
  return (
    isBaseMessage(message, "error") &&
    typeof message.code === "string" &&
    typeof message.message === "string"
  );
}
