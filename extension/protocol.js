export const VAULTORA_PROTOCOL_VERSION = 1;
export const VAULTORA_NATIVE_HOST = "in.sanskar.vaultora.bridge";

export function createHelloMessage() {
  return {
    version: VAULTORA_PROTOCOL_VERSION,
    type: "hello",
    client: "vaultora-browser-extension",
  };
}

export function isVaultStatusMessage(message) {
  return (
    typeof message === "object" &&
    message !== null &&
    message.version === VAULTORA_PROTOCOL_VERSION &&
    message.type === "vault-status" &&
    typeof message.unlocked === "boolean"
  );
}
