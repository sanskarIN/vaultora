const runtime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime;

const statusDot = document.querySelector("#status-dot");
const statusTitle = document.querySelector("#status-title");
const statusDetail = document.querySelector("#status-detail");
const reconnectButton = document.querySelector("#reconnect");

function renderStatus(state) {
  const connected = state?.connected === true;
  const unlocked = state?.unlocked === true;

  statusDot?.classList.toggle("connected", connected);
  statusDot?.classList.toggle("unlocked", connected && unlocked);

  if (statusTitle) {
    statusTitle.textContent = connected
      ? unlocked
        ? "Vaultora is connected and unlocked"
        : "Vaultora is connected but locked"
      : "Vaultora desktop bridge is offline";
  }

  if (statusDetail) {
    statusDetail.textContent = state?.error
      ? String(state.error)
      : connected
        ? "Open Vaultora to control access to browser requests."
        : "Start Vaultora on this computer, then reconnect.";
  }
}

function sendMessage(message) {
  if (!runtime?.sendMessage) {
    return Promise.resolve({
      connected: false,
      unlocked: false,
      error: "Browser extension messaging is unavailable.",
    });
  }

  return Promise.resolve(runtime.sendMessage(message));
}

async function refreshStatus() {
  try {
    renderStatus(await sendMessage({ type: "vaultora:get-status" }));
  } catch (error) {
    renderStatus({
      connected: false,
      unlocked: false,
      error: error instanceof Error ? error.message : "Could not read Vaultora bridge status.",
    });
  }
}

reconnectButton?.addEventListener("click", async () => {
  reconnectButton.disabled = true;
  try {
    renderStatus(await sendMessage({ type: "vaultora:reconnect" }));
  } finally {
    reconnectButton.disabled = false;
  }
});

void refreshStatus();
