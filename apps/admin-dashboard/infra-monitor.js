import { bindCopyAction } from "./copy-action.js";
import { decorateActionButton, faIcon, setRefreshButtonState, setWaitingContent } from "./fa-icons.js";
import {criticalInfrastructureState} from "./infra-critical-state.mjs";

const button = document.querySelector("#infra-health-button");
const dialog = document.querySelector("#infra-dialog");
const body = document.querySelector("#infra-dialog-body");
const copyButton = document.querySelector("#infra-copy-status");
if (copyButton) bindCopyAction(copyButton,{value:()=>current===null?"":statusText(current),label:"Copy infrastructure status",tooltip:"Copy infrastructure status",copiedLabel:"Infrastructure status copied",failedLabel:"Copy infrastructure status failed",iconOnly:true});
const forceButton = document.querySelector("#infra-force-sample");
const closeButton = document.querySelector("#infra-dialog-close");
const banner = document.querySelector("#infra-degradation-banner");
const bannerTitle = document.querySelector("#infra-banner-title");
const bannerDetail = document.querySelector("#infra-banner-detail");
const bannerDetails = document.querySelector("#infra-banner-details");
const outage=document.querySelector("#infra-critical-overlay");
const outageShell=document.querySelector(".shell");
const outageIcon=document.querySelector("#infra-critical-icon");
const outageReason=document.querySelector("#infra-critical-reason");
const outageReset=document.querySelector("#infra-critical-reset");
const outageRecoveryNote=document.querySelector("#infra-critical-recovery-note");
const outageDiagnostic=document.querySelector("#infra-critical-diagnostic");
const outageRetry=document.querySelector("#infra-critical-retry");
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

function showCriticalOutage(payload){
  if(!outage)return;
  const state=criticalInfrastructureState(payload);
  if(!state){
    // An unavailable monitor cannot prove recovery, but a valid sample
    // without failed backing checks can lift the stop despite usage warnings.
    if(!["normal","elevated","critical"].includes(payload?.sample?.level))return;
    const wasVisible=!outage.hidden;
    outage.hidden=true;
    if(outageShell)outageShell.inert=false;
    if(wasVisible)button?.focus();
    return;
  }
  outageReason.textContent=state.reason;
  outageDiagnostic.textContent=[state.code,
    state.observedAt?"Observed "+new Date(state.observedAt).toLocaleString():null]
    .filter(Boolean).join(" · ") || "No additional diagnostic is available.";
  if(state.resetAt){
    const minutes=Math.max(0,Math.ceil((Date.parse(state.resetAt)-Date.now())/60_000));
    outageReset.textContent="Next quota reset · 00:00 UTC";
    outageRecoveryNote.textContent="Approximately "+Math.floor(minutes/60)+"h "+(minutes%60)
      +"m remaining. The quota resets daily; recovery is not guaranteed.";
  }else{
    outageReset.textContent="Recovery time unknown";
    outageRecoveryNote.textContent="This is not a confirmed free-tier quota exhaustion. Check the service status.";
  }
  if(dialog?.open)dialog.close();
  const wasHidden=outage.hidden;
  outage.hidden=false;
  if(outageShell)outageShell.inert=true;
  if(wasHidden)outageRetry?.focus();
}

function render(payload) {
  showCriticalOutage(payload);
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
  if (force) {
    setRefreshButtonState(forceButton,true,{
      label:"Refresh now",
      tooltip:"Refresh infrastructure health",
      busyTooltip:"Refreshing infrastructure health",
    });
  }
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
    // Keep any previously attested critical state until a valid health
    // sample establishes recovery. Never silently dismiss on fetch failure.
    setBadge("unavailable", error.message);
    setBanner("unavailable", null, error.message);
    if (dialog.open) body.replaceChildren(detail("Monitor", error.message));
  } finally {
    if (force) {
      setRefreshButtonState(forceButton,false,{
        label:"Refresh now",
        tooltip:"Refresh infrastructure health",
      });
    }
  }
}

function openDetails() {
  if (!dialog.open) dialog.showModal();
  if (current) render(current);
  else {
    setWaitingContent(body, "Loading infrastructure health");
    void load();
  }
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

if(outageIcon)outageIcon.append(faIcon("circle-exclamation"));
if(outageRetry)decorateActionButton(outageRetry,{icon:"rotate",label:"Check again",
  tooltip:"Recheck infrastructure health"});
outageRetry?.addEventListener("click",()=>load({force:true}));
button?.addEventListener("click", openDetails);
bannerDetails?.addEventListener("click", openDetails);
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