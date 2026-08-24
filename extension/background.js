const browserRuntime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
const NATIVE_HOST = "in.sanskar.vaultora.bridge";

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
    nativePort = browserRuntime.connectNative(NATIVE_HOST);
    publishState({ connected: true, error: null });

    nativePort.onMessage.addListener((message) => {
      if (!message || typeof message !== "object") return;
      if (message.type === "vault-status") {
        publishState({
          connected: true,
          unlocked: message.unlocked === true,
          error: null,
        });
      }
    });

    nativePort.onDisconnect.addListener(() => {
      const message = browserRuntime.lastError?.message ?? "Vaultora desktop bridge is not connected.";
      nativePort = null;
      publishState({ connected: false, unlocked: false, error: message });
    });

    nativePort.postMessage({
      version: 1,
      type: "hello",
      client: "vaultora-browser-extension",
    });
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
