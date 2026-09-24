import { decorateActionButton } from "./fa-icons.js";

const button = document.querySelector("#infra-health-button");
const dialog = document.querySelector("#infra-dialog");
const body = document.querySelector("#infra-dialog-body");
const copyButton = document.querySelector("#infra-copy-status");
if (copyButton) decorateActionButton(copyButton, { icon:"copy", label:"Copy infrastructure status", tooltip:"Copy infrastructure status", iconOnly:true });
const forceButton = document.querySelector("#infra-force-sample");
const closeButton = document.querySelector("#infra-dialog-close");
const banner = document.querySelector("#infra-degradation-banner");
const bannerTitle = document.querySelector("#infra-banner-title");
const bannerDetail = document.querySelector("#infra-banner-detail");
const bannerDetails = document.querySelector("#infra-banner-details");
const REFRESH_MS = 15 * 60_000;
let timer = null;
let current = null;
let lastProbeAt = 0;

function shortNumber(value) {
  return new Intl.NumberFormat([], { notation:"compact", maximumFractionDigits:1 }).format(Number(value ?? 0));
}

function statusLabel(level) {
  return ({ normal:"Normal", elevated:"Elevated usage", critical:"Critical", unavailable:"Unavailable" })[level] ?? "Unavailable";
}

function checkLabel(check) {
  if (check?.kind === "streams" && check?.resource === "durable_objects") return "DO binding";
  return String(check?.kind ?? "resource").replaceAll("_", " ");
}

function setBadge(level, title = null) {
  const normalized = ["normal", "elevated", "critical"].includes(level) ? level : "unavailable";
  button.dataset.level = normalized;
  button.setAttribute("aria-label", `Infrastructure ${statusLabel(normalized)}`);
  button.title = title ?? `Infrastructure ${statusLabel(normalized)}`;
  button.querySelector(".infra-health-label").textContent = statusLabel(normalized);
}

function statusDetail(sample, fallback) {
  const check = (sample?.checks ?? []).find((candidate) => candidate.level === "critical")
    ?? (sample?.checks ?? []).find((candidate) => candidate.level === "elevated");
  if (check?.error?.detail) return check.error.detail;
  if (check) return `${checkLabel(check)} · ${[check.resource, check.service].filter(Boolean).join(" · ")}`;
  return fallback ?? "Infrastructure health is unavailable.";
}

function setBanner(level, sample = null, fallback = null) {
  if (!banner) return;
  if (level === "normal") {
    banner.hidden = true;
    return;
  }
  const normalized = ["elevated", "critical"].includes(level) ? level : "unavailable";
  banner.dataset.level = normalized;
  bannerTitle.textContent = normalized === "critical" ? "Infrastructure critical" : "Infrastructure usage elevated";
  bannerDetail.textContent = statusDetail(sample, fallback);
  banner.hidden = false;
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
  title.textContent = checkLabel(check);
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

function statusText(payload) {
  const sample = payload?.sample;
  if (!sample) return `Infrastructure: Unavailable\n${payload?.error?.message ?? "Infrastructure monitor unavailable"}`;
  const lines = [
    `Infrastructure: ${statusLabel(sample.level)}`,
    `Sampled: ${sample.observedAt}`,
  ];
  for (const check of sample.checks ?? []) {
    const name = checkLabel(check);
    const resource = [check.resource, check.service].filter(Boolean).join(" · ");
    const value = Number.isFinite(check.value) && Number.isFinite(check.limit)
      ? `${check.value} / ${check.limit}`
      : check.error?.code ?? statusLabel(check.level);
    lines.push(`${name}${resource ? ` · ${resource}` : ""}: ${value}`);
    if (check.error?.detail) lines.push(`  ${check.error.detail}`);
  }
  if (payload.error?.message) lines.push(`Monitor: ${payload.error.message}`);
  return lines.join("\n");
}

async function copyStatus() {
  if (!current) return;
  const text = statusText(current);
  try {
    await navigator.clipboard.writeText(text);
    decorateActionButton(copyButton, { icon:"copy", label:"Infrastructure status copied", tooltip:"Infrastructure status copied", iconOnly:true });
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    decorateActionButton(copyButton, {
      icon:"copy",
      label:copied ? "Infrastructure status copied" : "Copy infrastructure status failed",
      tooltip:copied ? "Infrastructure status copied" : "Copy infrastructure status failed",
      iconOnly:true,
    });
  }
  setTimeout(() => {
    decorateActionButton(copyButton, { icon:"copy", label:"Copy infrastructure status", tooltip:"Copy infrastructure status", iconOnly:true });
  }, 1600);
}

function render(payload) {
  current = payload;
  const sample = payload?.sample;
  if (!sample) {
    const message = payload?.error?.message ?? "Infrastructure monitor unavailable";
    setBadge("unavailable", message);
    setBanner("unavailable", null, message);
    body.replaceChildren(detail("Monitor", message));
    return;
  }
  setBadge(sample.level, `Infrastructure ${statusLabel(sample.level)} · sampled ${new Date(sample.observedAt).toLocaleString()}`);
  setBanner(sample.level, sample, payload?.error?.message ?? null);
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
  if (!force && lastProbeAt > 0 && Date.now() - lastProbeAt < REFRESH_MS) return;
  if (force) forceButton.disabled = true;
  lastProbeAt = Date.now();
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
    setBanner("unavailable", null, error.message);
    if (dialog.open) body.replaceChildren(detail("Monitor", error.message));
  } finally {
    if (force) forceButton.disabled = false;
  }
}

function openDetails() {
  if (!dialog.open) dialog.showModal();
  if (current) render(current);
  else void load();
}

function schedule() {
  clearTimeout(timer); timer = null;
  if (document.hidden) return;
  const delay = lastProbeAt === 0 ? REFRESH_MS : Math.max(1000, REFRESH_MS - (Date.now() - lastProbeAt));
  timer = setTimeout(async () => {
    timer = null;
    await load();
    schedule();
  }, delay);
}

button?.addEventListener("click", openDetails);
bannerDetails?.addEventListener("click", openDetails);
copyButton?.addEventListener("click", copyStatus);
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