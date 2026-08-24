const runtime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime;

const statusDot = document.querySelector("#status-dot");
const statusTitle = document.querySelector("#status-title");
const statusDetail = document.querySelector("#status-detail");
const reconnectButton = document.querySelector("#reconnect");
const refreshButton = document.querySelector("#refresh");
const siteHeading = document.querySelector("#site-heading");
const siteDetail = document.querySelector("#site-detail");
const matchesContainer = document.querySelector("#matches");
const actionStatus = document.querySelector("#action-status");

let currentOrigin = "";

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
        ? "Secrets stay in the desktop process until you choose a matched login."
        : "Start Vaultora on this computer, then reconnect.";
  }
}

function showActionStatus(message, isError = false) {
  if (!actionStatus) return;
  actionStatus.textContent = message;
  actionStatus.classList.toggle("error", isError);
}

function sendMessage(message) {
  if (!runtime?.sendMessage) {
    return Promise.resolve({
      ok: false,
      error: "Browser extension messaging is unavailable.",
    });
  }
  return Promise.resolve(runtime.sendMessage(message));
}

function unwrap(result) {
  if (!result?.ok) throw new Error(result?.error || "Vaultora could not complete the request.");
  return result.response;
}

function renderMatches(matches) {
  if (!matchesContainer) return;
  matchesContainer.replaceChildren();

  if (!Array.isArray(matches) || matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "No exact-origin logins are saved for this site.";
    matchesContainer.append(empty);
    return;
  }

  for (const entry of matches) {
    const item = document.createElement("article");
    item.className = "match-item";

    const text = document.createElement("div");
    text.className = "match-text";
    const title = document.createElement("strong");
    title.textContent = entry.favorite ? `★ ${entry.name}` : entry.name;
    const username = document.createElement("span");
    username.textContent = entry.username || "No username";
    text.append(title, username);

    const fill = document.createElement("button");
    fill.type = "button";
    fill.className = "fill-button";
    fill.textContent = "Fill";
    fill.addEventListener("click", async () => {
      fill.disabled = true;
      showActionStatus("Checking the active site and requesting the selected credential…");
      try {
        const result = unwrap(
          await sendMessage({
            type: "vaultora:fill",
            origin: currentOrigin,
            entryId: entry.id,
          }),
        );
        showActionStatus(
          result.usernameFilled
            ? "Username and password filled on the active page."
            : "Password filled on the active page.",
        );
      } catch (error) {
        showActionStatus(error instanceof Error ? error.message : "Credential fill failed.", true);
      } finally {
        fill.disabled = false;
      }
    });

    item.append(text, fill);
    matchesContainer.append(item);
  }
}

async function refreshStatus() {
  try {
    renderStatus(unwrap(await sendMessage({ type: "vaultora:get-status" })));
  } catch (error) {
    renderStatus({
      connected: false,
      unlocked: false,
      error: error instanceof Error ? error.message : "Could not read Vaultora bridge status.",
    });
  }
}

async function refreshContext() {
  refreshButton && (refreshButton.disabled = true);
  showActionStatus("");
  try {
    const context = unwrap(await sendMessage({ type: "vaultora:get-context" }));
    currentOrigin = context.origin;
    renderStatus(context.state);
    if (siteHeading) siteHeading.textContent = context.origin;
    if (siteDetail) siteDetail.textContent = "Exact HTTPS origin verified before match lookup.";
    renderMatches(context.matches);
  } catch (error) {
    currentOrigin = "";
    if (siteHeading) siteHeading.textContent = "No eligible HTTPS page";
    if (siteDetail)
      siteDetail.textContent =
        error instanceof Error ? error.message : "Could not inspect the active website.";
    renderMatches([]);
    showActionStatus(error instanceof Error ? error.message : "Could not load site matches.", true);
  } finally {
    refreshButton && (refreshButton.disabled = false);
  }
}

reconnectButton?.addEventListener("click", async () => {
  reconnectButton.disabled = true;
  try {
    renderStatus(unwrap(await sendMessage({ type: "vaultora:reconnect" })));
    await refreshContext();
  } catch (error) {
    renderStatus({
      connected: false,
      unlocked: false,
      error: error instanceof Error ? error.message : "Could not reconnect to Vaultora.",
    });
  } finally {
    reconnectButton.disabled = false;
  }
});

refreshButton?.addEventListener("click", () => void refreshContext());

void refreshStatus();
void refreshContext();
