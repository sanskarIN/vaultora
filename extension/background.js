import {
  VAULTORA_NATIVE_HOST,
  createHelloMessage,
  isVaultStatusMessage,
} from "./protocol.js";

const browserRuntime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime;

let nativePort = null;
let bridgeState = {
  connected: false,
  unlocked: false,
  error: null,
};

function publishState(next) {
  bridgeState = { ...bridgeState, ...next };
}

function disconnectPort() {
  if (nativePort) {
    try {
      nativePort.disconnect();
    } catch {
      // The native host may already be gone.
    }
  }
  nativePort = null;
}

function connectNativeBridge() {
  if (!browserRuntime?.connectNative) {
    publishState({ connected: false, unlocked: false, error: "Native messaging is unavailable." });
    return;
  }

  disconnectPort();

  try {
    nativePort = browserRuntime.connectNative(VAULTORA_NATIVE_HOST);
    publishState({ connected: true, error: null });

    nativePort.onMessage.addListener((message) => {
      if (!isVaultStatusMessage(message)) {
        publishState({
          connected: true,
          unlocked: false,
          error: "Vaultora native bridge returned an unsupported protocol message.",
        });
        return;
      }

      publishState({
        connected: true,
        unlocked: message.unlocked,
        error: null,
      });
    });

    nativePort.onDisconnect.addListener(() => {
      const message =
        browserRuntime.lastError?.message ?? "Vaultora desktop bridge is not connected.";
      nativePort = null;
      publishState({ connected: false, unlocked: false, error: message });
    });

    nativePort.postMessage(createHelloMessage());
  } catch (error) {
    nativePort = null;
    publishState({
      connected: false,
      unlocked: false,
      error: error instanceof Error ? error.message : "Could not connect to Vaultora.",
    });
  }
}

browserRuntime?.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "vaultora:get-status") {
    sendResponse(bridgeState);
    return false;
  }

  if (message?.type === "vaultora:reconnect") {
    connectNativeBridge();
    sendResponse(bridgeState);
    return false;
  }

  return false;
});

connectNativeBridge();
