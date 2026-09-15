const button = document.querySelector("#infra-health-button");
const dialog = document.querySelector("#infra-dialog");
const body = document.querySelector("#infra-dialog-body");
const forceButton = document.querySelector("#infra-force-sample");
const closeButton = document.querySelector("#infra-dialog-close");
const REFRESH_MS = 15 * 60_000;
let timer = null;
let current = null;

function shortNumber(value) {
  return new Intl.NumberFormat([], { notation:"compact", maximumFractionDigits:1 }).format(Number(value ?? 0));
}

function statusLabel(level) {
  return ({ normal:"Normal", elevated:"Elevated", critical:"Critical", unavailable:"Unavailable" })[level] ?? "Unavailable";
}

function setBadge(level, title = null) {
  const normalized = ["normal", "elevated", "critical"].includes(level) ? level : "unavailable";
  button.dataset.level = normalized;
  button.setAttribute("aria-label", `Infrastructure ${statusLabel(normalized)}`);
  button.title = title ?? `Infrastructure ${statusLabel(normalized)}`;
  button.querySelector(".infra-health-label").textContent = statusLabel(normalized);
}

function detail(label, value) {
  const item = document.createElement("div");
  item.className = "infra-detail";
  const name = document.createElement("span"); name.textContent = label;
  const body = document.createElement("strong"); body.textContent = value;
  item.append(name, body);
  return item;
}

function checkLine(check) {
  const row = document.createElement("div");
  row.className = `infra-check infra-check-${check.level}`;
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = check.kind.replaceAll("_", " ");
  const resource = document.createElement("span");
  resource.textContent = [check.resource, check.service].filter(Boolean).join(" · ");
  copy.append(title, resource);
  if (check.error?.detail) {
    const diagnostic = document.createElement("span");
    diagnostic.className = "infra-check-diagnostic";
    diagnostic.textContent = check.error.detail;
    copy.append(diagnostic);
  }
  const value = document.createElement("div");
  value.className = "infra-check-value";
  value.textContent = Number.isFinite(check.value) && Number.isFinite(check.limit)
    ? `${shortNumber(check.value)} / ${shortNumber(check.limit)}`
    : check.error?.code ?? statusLabel(check.level);
  row.append(copy, value);
  return row;
}

function render(payload) {
  current = payload;
  const sample = payload?.sample;
  if (!sample) {
    setBadge("unavailable", payload?.error?.message ?? "Infrastructure monitor unavailable");
    body.replaceChildren(detail("Monitor", payload?.error?.message ?? "No infrastructure sample is available."));
    return;
  }
  setBadge(sample.level, `Infrastructure ${statusLabel(sample.level)} · sampled ${new Date(sample.observedAt).toLocaleString()}`);
  const head = document.createElement("div");
  head.className = "infra-summary";
  head.append(
    detail("State", statusLabel(sample.level)),
    detail("Sampled", new Date(sample.observedAt).toLocaleString()),
    detail("Probe", "Read-only"),
    detail("Refresh", "15 min"),
  );
  const checks = document.createElement("div");
  checks.className = "infra-checks";
  checks.append(...(sample.checks ?? []).map(checkLine));
  body.replaceChildren(head, checks);
  if (payload.error) {
    const warning = document.createElement("div");
    warning.className = "infra-monitor-note";
    warning.textContent = payload.error.message;
    body.append(warning);
  }
}

async function load({ force = false } = {}) {
  if (!button) return;
  if (force) forceButton.disabled = true;
  try {
    const response = await fetch("/api/infra-monitor", {
      method:force ? "POST" : "GET",
      headers:{ Accept:"application/json" },
      cache:"no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    render(payload);
  } catch (error) {
    setBadge("unavailable", error.message);
    if (dialog.open) body.replaceChildren(detail("Monitor", error.message));
  } finally {
    if (force) forceButton.disabled = false;
  }
}

function schedule() {
  clearTimeout(timer); timer = null;
  if (document.hidden) return;
  timer = setTimeout(async () => {
    timer = null;
    await load();
    schedule();
  }, REFRESH_MS);
}

button?.addEventListener("click", () => {
  if (!dialog.open) dialog.showModal();
  if (current) render(current);
  else void load();
});
forceButton?.addEventListener("click", () => load({ force:true }));
closeButton?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) schedule();
  else { void load(); schedule(); }
});

setBadge("unavailable", "Infrastructure monitor loading");
void load();
schedule();
