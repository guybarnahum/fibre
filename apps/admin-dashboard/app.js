const $ = (selector) => document.querySelector(selector);
const form = $("#filters");
const kind = $("#kind");
const value = $("#value");
const service = $("#service");
const status = $("#status");
const limit = $("#limit");
const rows = $("#activity-rows");
const empty = $("#empty-state");
const dialog = $("#record-dialog");
let timer = null;
let currentRecords = [];

function text(node, value) { node.textContent = value ?? "—"; }
function titleCase(input) { return String(input ?? "").split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" "); }
function shortId(input) { if (!input) return null; return input.length > 24 ? `${input.slice(0, 12)}…${input.slice(-8)}` : input; }
function clock(input) { try { return new Intl.DateTimeFormat([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(new Date(input)); } catch { return input; } }
function queryLabel(record) { return record.threadId ?? record.genesisId ?? record.requestId ?? record.correlationId ?? "—"; }

function syncFormFromUrl() {
  const params = new URLSearchParams(location.search);
  kind.value = params.get("kind") ?? "recent";
  value.value = params.get("value") ?? "";
  service.value = params.get("service") ?? "";
  status.value = params.get("status") ?? "";
  limit.value = params.get("limit") ?? "100";
  updateIdentityState();
}

function updateIdentityState() {
  const needsValue = ["request", "genesis", "thread"].includes(kind.value);
  value.disabled = !needsValue;
  value.placeholder = ({ request:"req_…", genesis:"gen_…", thread:"thr_…" })[kind.value] ?? "Not required";
}

function formParams() {
  const params = new URLSearchParams();
  params.set("kind", kind.value);
  if (!value.disabled && value.value.trim()) params.set("value", value.value.trim());
  if (service.value.trim()) params.set("service", service.value.trim());
  if (status.value) params.set("status", status.value);
  params.set("limit", limit.value);
  return params;
}

function setLoading(loading) {
  $("#refresh-button").disabled = loading;
  $("#refresh-button").textContent = loading ? "Refreshing…" : "Refresh";
}

function summarize(records) {
  const failures = records.filter((r) => r.status === "failed");
  const retries = records.filter((r) => r.status === "retrying");
  const recoveredKeys = new Set();
  for (const failed of failures) {
    if (records.some((r) => r.stage === failed.stage && r.service === failed.service && r.status === "succeeded" && r.occurredAt >= failed.occurredAt)) recoveredKeys.add(`${failed.service}:${failed.stage}`);
  }
  return { failures: failures.length, retries: retries.length, recovered: recoveredKeys.size };
}

function renderMetrics(records) {
  const summary = summarize(records);
  text($("#metric-records"), records.length);
  text($("#metric-failures"), summary.failures);
  text($("#metric-retries"), summary.retries);
  text($("#metric-recovered"), summary.recovered);
}

function recordRow(record) {
  const tr = document.createElement("tr");
  const cells = [
    [clock(record.occurredAt), "time"],
    [titleCase(record.service), "service"],
    [record.stage, "stage"],
    [record.status, ""],
    [String(record.attempt), "attempt"],
    [shortId(queryLabel(record)), "correlation"],
  ];
  cells.forEach(([content, className], index) => {
    const td = document.createElement("td");
    if (index === 3) {
      const badge = document.createElement("span");
      badge.className = `status status-${record.status}`;
      badge.textContent = titleCase(record.status);
      td.append(badge);
    } else {
      td.className = className;
      td.textContent = content;
      if (index === 5) td.title = queryLabel(record);
    }
    tr.append(td);
  });
  tr.addEventListener("click", () => showRecord(record));
  return tr;
}

function renderRows(records) {
  rows.replaceChildren(...records.map(recordRow));
  empty.hidden = records.length !== 0;
}

function detail(label, value, { wide = false, mono = false } = {}) {
  const item = document.createElement("div");
  item.className = `detail${wide ? " detail-wide" : ""}`;
  const name = document.createElement("label"); name.textContent = label;
  const body = document.createElement("div"); body.textContent = value ?? "—"; if (mono) body.className = "mono";
  item.append(name, body); return item;
}

function showRecord(record) {
  text($("#dialog-title"), `${titleCase(record.service)} · ${record.stage}`);
  const grid = document.createElement("div"); grid.className = "detail-grid";
  grid.append(
    detail("Occurred", record.occurredAt, { mono:true }), detail("Recorded", record.recordedAt, { mono:true }),
    detail("Status", record.status), detail("Attempt", record.attempt),
    detail("Request ID", record.requestId, { mono:true }), detail("Genesis ID", record.genesisId, { mono:true }),
    detail("Thread ID", record.threadId, { mono:true }), detail("Activity ID", record.activityId, { mono:true }),
    detail("Deployment SHA", record.deploymentGitSha, { wide:true, mono:true }),
  );
  const body = $("#dialog-body"); body.replaceChildren(grid);
  if (record.message) body.append(detail("Message", record.message, { wide:true }));
  if (record.error) {
    const error = document.createElement("div"); error.className = "error-box";
    error.textContent = `${record.error.category}/${record.error.code} · retryable=${record.error.retryable}`; body.append(error);
  }
  if (record.evidence && Object.keys(record.evidence).length) {
    const evidence = document.createElement("div"); evidence.className = "evidence";
    const heading = document.createElement("strong"); heading.textContent = "Evidence"; evidence.append(heading);
    Object.entries(record.evidence).forEach(([key, val]) => { const row = document.createElement("div"); row.className = "evidence-row"; const k = document.createElement("span"); k.textContent = key; const v = document.createElement("span"); v.className = "mono"; v.textContent = val ?? "—"; row.append(k,v); evidence.append(row); });
    body.append(evidence);
  }
  dialog.showModal();
}

function populateServices(records) {
  const list = $("#service-list");
  const values = [...new Set(records.map((r) => r.service).filter(Boolean))].sort();
  list.replaceChildren(...values.map((item) => { const option = document.createElement("option"); option.value = item; return option; }));
}

function chainHeading(payload) {
  const query = payload.query;
  if (query.kind === "request") return `Request ${query.value}`;
  if (query.kind === "genesis") return `Genesis ${query.value}`;
  if (query.kind === "thread") return `Thread ${query.value}`;
  if (query.kind === "failures") return "Failures & retries";
  return "Recent activity";
}

async function loadActivity({ pushState = false } = {}) {
  setLoading(true);
  const params = formParams();
  if (pushState) history.replaceState(null, "", `${location.pathname}?${params}`);
  try {
    const response = await fetch(`/api/activity?${params}`, { headers: { Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    currentRecords = payload.records ?? [];
    text($("#environment-pill"), payload.environment);
    text($("#chain-title"), chainHeading(payload));
    text($("#chain-summary"), payload.summary?.description ?? `${currentRecords.length} record(s)`);
    text($("#updated-at"), `Updated ${clock(payload.queriedAt)}`);
    renderMetrics(currentRecords); renderRows(currentRecords); populateServices(currentRecords);
  } catch (error) {
    currentRecords = []; renderMetrics([]); renderRows([]);
    text($("#chain-summary"), `Activity unavailable: ${error.message}`);
  } finally { setLoading(false); }
}

function scheduleRefresh() {
  clearInterval(timer); timer = null;
  if ($("#auto-refresh").checked) timer = setInterval(() => loadActivity(), 10000);
}

form.addEventListener("submit", (event) => { event.preventDefault(); loadActivity({ pushState:true }); });
kind.addEventListener("change", updateIdentityState);
$("#refresh-button").addEventListener("click", () => loadActivity());
$("#auto-refresh").addEventListener("change", scheduleRefresh);
$("#dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.addEventListener("keydown", (event) => { if (event.key === "/" && !["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName)) { event.preventDefault(); (value.disabled ? service : value).focus(); } });

const staging = location.hostname === "admin.staging.insidefibre.com" || location.hostname.includes("-staging.");
$("#status-link").href = staging ? "https://status.staging.insidefibre.com" : "https://status.insidefibre.com";
syncFormFromUrl(); scheduleRefresh(); loadActivity();
