const $ = (selector) => document.querySelector(selector);
const form = $("#filters");
const kind = $("#kind");
const value = $("#value");
const service = $("#service");
const status = $("#status");
const rows = $("#activity-rows");
const empty = $("#empty-state");
const dialog = $("#record-dialog");
let mode = "raw";
let currentPayload = null;
let timer = null;
let nav = { edge:"first", direction:"next", cursor:null, page:1 };

function text(node, input) { node.textContent = input ?? "—"; }
function titleCase(input) { return String(input ?? "").split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" "); }
function shortId(input) { if (!input) return null; return input.length > 24 ? `${input.slice(0, 12)}…${input.slice(-8)}` : input; }
function clock(input) { try { return new Intl.DateTimeFormat([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(new Date(input)); } catch { return input; } }
function queryLabel(record) { return record.threadId ?? record.genesisId ?? record.requestId ?? record.correlationId ?? "—"; }
function singleValue(values) { const unique = [...new Set(values.filter(Boolean))]; return unique.length === 1 ? unique[0] : null; }

function journeyPhase(stage) {
  if (stage === "presentation.encounter.world_submit" || stage.startsWith("encounter.cognition.")) return "Encounter";
  if (stage.startsWith("encounter.history.") || stage.startsWith("encounter.journal.") || stage.startsWith("encounter.experience.") || stage.startsWith("encounter.memory.")) return "Experience";
  if (stage.startsWith("continuity.") || stage.startsWith("life.continue.")) return "Continuity";
  if (stage.startsWith("life.") || stage.startsWith("lived.")) return "Life";
  if (stage.startsWith("birth.")) return "Birth";
  if (stage.startsWith("presentation.") || stage.startsWith("asset.") || stage.includes(".presentation")) return "Presentation";
  return "System";
}

function syncFromUrl() {
  const params = new URLSearchParams(location.search);
  kind.value = params.get("kind") ?? "recent";
  value.value = params.get("value") ?? "";
  service.value = params.get("service") ?? "";
  status.value = params.get("status") ?? "";
  mode = params.get("mode") ?? (kind.value === "thread" ? "causal" : "raw");
  if (!["causal", "raw"].includes(mode)) mode = "raw";
  updateIdentityState();
  renderMode();
}

function updateIdentityState() {
  const needsValue = ["request", "genesis", "thread"].includes(kind.value);
  value.disabled = !needsValue;
  value.placeholder = ({ request:"req_…", genesis:"gen_…", thread:"thr_…" })[kind.value] ?? "Not required";
}

function baseParams() {
  const params = new URLSearchParams();
  params.set("kind", kind.value);
  if (!value.disabled && value.value.trim()) params.set("value", value.value.trim());
  if (service.value.trim()) params.set("service", service.value.trim());
  if (status.value) params.set("status", status.value);
  params.set("mode", mode);
  return params;
}

function syncUrl() {
  history.replaceState(null, "", `${location.pathname}?${baseParams()}`);
}

function setLoading(loading) {
  $("#refresh-button").disabled = loading;
  $("#refresh-button").textContent = loading ? "Refreshing…" : "Refresh";
  for (const id of ["page-first", "page-prev", "page-next", "page-last"]) $(`#${id}`).disabled = loading;
}

function renderMode() {
  $("#causal-view").hidden = mode !== "causal";
  $("#raw-view").hidden = mode !== "raw";
  for (const button of document.querySelectorAll(".view-switch button")) button.classList.toggle("active", button.dataset.mode === mode);
  text($("#metric-view"), mode === "causal" ? "Causal" : "Raw");
}

function renderMetrics(records) {
  text($("#metric-records"), records.length);
  text($("#metric-failures"), records.filter((record) => record.status === "failed").length);
  text($("#metric-retries"), records.filter((record) => record.status === "retrying").length);
}

function recordRow(record) {
  const tr = document.createElement("tr");
  const label = queryLabel(record);
  const cells = [
    [clock(record.occurredAt), "time"], [titleCase(record.service), "service"], [record.stage, "stage"],
    [record.status, ""], [String(record.attempt), "attempt"], [shortId(label), "correlation"],
  ];
  cells.forEach(([content, className], index) => {
    const td = document.createElement("td");
    if (index === 3) {
      const badge = document.createElement("span"); badge.className = `status status-${record.status}`; badge.textContent = titleCase(record.status); td.append(badge);
    } else if (index === 5 && String(label).startsWith("thr_")) {
      td.className = className;
      td.title = label;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "thread-link";
      button.textContent = content;
      button.title = `Inspect ${label}`;
      button.addEventListener("click", (event) => { event.stopPropagation(); void showThread(label); });
      td.append(button);
    } else {
      td.className = className; td.textContent = content; if (index === 5) td.title = label;
    }
    tr.append(td);
  });
  tr.addEventListener("click", () => showRecord(record));
  return tr;
}

function renderRaw(records) {
  rows.replaceChildren(...records.map(recordRow));
  empty.hidden = records.length !== 0;
}

function renderCausal(records) {
  const rail = $("#journey-rail");
  rail.replaceChildren(...records.map((record) => {
    const event = document.createElement("button");
    event.type = "button";
    event.className = `journey-event journey-event-${record.status}`;
    const when = document.createElement("span"); when.className = "journey-time"; when.textContent = clock(record.occurredAt);
    const copy = document.createElement("span"); copy.className = "journey-copy";
    const heading = document.createElement("strong"); heading.textContent = `${journeyPhase(record.stage)} · ${titleCase(record.service)}`;
    const stage = document.createElement("span"); stage.textContent = record.stage;
    copy.append(heading, stage);
    const witness = record.evidence?.eventId ?? record.evidence?.objectRef ?? null;
    const evidence = document.createElement("span"); evidence.className = "journey-evidence"; evidence.textContent = witness ? shortId(witness) : record.status;
    event.append(when, copy, evidence);
    event.addEventListener("click", () => showRecord(record));
    return event;
  }));
  const gap = $("#journey-gap");
  gap.hidden = records.length !== 0;
  gap.textContent = "No meaningful terminal or retry activity on this page.";
}

function detail(label, input, { wide = false, mono = false } = {}) {
  const item = document.createElement("div"); item.className = `detail${wide ? " detail-wide" : ""}`;
  const name = document.createElement("label"); name.textContent = label;
  const body = document.createElement("div"); body.textContent = input ?? "—"; if (mono) body.className = "mono";
  item.append(name, body); return item;
}

function showRecord(record) {
  text($("#dialog-eyebrow"), "Activity record");
  text($("#dialog-title"), `${titleCase(record.service)} · ${record.stage}`);
  const grid = document.createElement("div"); grid.className = "detail-grid";
  grid.append(
    detail("Occurred", record.occurredAt, { mono:true }), detail("Recorded", record.recordedAt, { mono:true }),
    detail("Status", record.status), detail("Attempt", record.attempt),
    detail("Request ID", record.requestId, { mono:true }), detail("Genesis ID", record.genesisId, { mono:true }),
    detail("Thread ID", record.threadId, { mono:true }), detail("Activity ID", record.activityId, { mono:true }),
    detail("Correlation ID", record.correlationId, { mono:true }), detail("Causation ID", record.causationId, { mono:true }),
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
    Object.entries(record.evidence).forEach(([key, val]) => {
      const row = document.createElement("div"); row.className = "evidence-row";
      const k = document.createElement("span"); k.textContent = key;
      const v = document.createElement("span"); v.className = "mono"; v.textContent = val ?? "—";
      row.append(k, v); evidence.append(row);
    });
    body.append(evidence);
  }
  dialog.showModal();
}

async function showThread(threadId) {
  text($("#dialog-eyebrow"), "Thread Observatory");
  text($("#dialog-title"), "Thread");
  const body = $("#dialog-body");
  body.replaceChildren(detail("Thread ID", threadId, { wide:true, mono:true }), detail("Identity", "Loading…", { wide:true }));
  if (!dialog.open) dialog.showModal();
  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    const identity = payload.identity ?? {};
    text($("#dialog-title"), identity.displayName ?? "Unnamed Thread");
    const grid = document.createElement("div"); grid.className = "detail-grid";
    grid.append(
      detail("Name", identity.displayName), detail("FIN", identity.fibreIdentityNumber, { mono:true }),
      detail("Thread ID", identity.threadId ?? threadId, { wide:true, mono:true }),
      detail("Birth date", identity.birthDate), detail("Lifecycle", identity.lifecycleStatus),
    );
    body.replaceChildren(grid);
  } catch (error) {
    const problem = document.createElement("div");
    problem.className = "error-box";
    problem.textContent = `Thread identity unavailable: ${error.message}`;
    body.replaceChildren(detail("Thread ID", threadId, { wide:true, mono:true }), problem);
  }
}

function populateServices(records) {
  const values = [...new Set(records.map((record) => record.service).filter(Boolean))].sort();
  $("#service-list").replaceChildren(...values.map((item) => { const option = document.createElement("option"); option.value = item; return option; }));
}

function chainHeading(payload) {
  const query = payload.query;
  if (query.kind === "request") return `Request ${query.value}`;
  if (query.kind === "genesis") return `Genesis ${query.value}`;
  if (query.kind === "thread") return `Thread ${query.value}`;
  if (query.kind === "failures") return "Failures & retries";
  return "Recent activity";
}

function activityIdentity(records) {
  return Object.freeze({
    requestId:singleValue(records.map((record) => record.requestId)),
    genesisId:singleValue(records.map((record) => record.genesisId)),
    threadId:singleValue(records.map((record) => record.threadId)),
    threadName:null,
    fibreIdentityNumber:singleValue(records.map((record) => record.evidence?.fibreIdentityNumber)),
  });
}

function activityExport(payload) {
  const records = payload?.records ?? [];
  return Object.freeze({
    contract:"fibre-activity-export-v0.3",
    exportedAt:new Date().toISOString(),
    environment:payload?.environment ?? null,
    queriedAt:payload?.queriedAt ?? null,
    query:payload?.query ?? null,
    mode:payload?.mode ?? mode,
    page:{ number:nav.page, total:payload?.totalPages ?? 1, size:payload?.pageSize ?? 25, totalRecords:payload?.total ?? records.length },
    identity:activityIdentity(records),
    records,
  });
}

async function copyExport() {
  if (!currentPayload) return;
  const button = $("#export-button");
  const exportText = JSON.stringify(activityExport(currentPayload), null, 2);
  try {
    await navigator.clipboard.writeText(exportText);
    button.textContent = "Copied";
  } catch {
    const area = document.createElement("textarea"); area.value = exportText; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
    document.body.append(area); area.select(); button.textContent = document.execCommand("copy") ? "Copied" : "Copy failed"; area.remove();
  }
  setTimeout(() => { button.textContent = "Copy export"; }, 1600);
}

function firstPage() {
  nav = { edge:"first", direction:"next", cursor:null, page:1 };
  return loadPage();
}
function lastPage() {
  const last = currentPayload?.totalPages ?? 1;
  nav = { edge:"last", direction:"next", cursor:null, page:last };
  return loadPage();
}
function previousPage() {
  if (!currentPayload?.prevCursor || nav.page <= 1) return;
  nav = { edge:"first", direction:"prev", cursor:currentPayload.prevCursor, page:nav.page - 1 };
  return loadPage();
}
function nextPage() {
  if (!currentPayload?.nextCursor) return;
  nav = { edge:"first", direction:"next", cursor:currentPayload.nextCursor, page:nav.page + 1 };
  return loadPage();
}

function renderPager(payload) {
  const totalPages = payload.totalPages ?? 1;
  nav.page = Math.min(Math.max(1, nav.page), totalPages);
  text($("#page-label"), `Page ${nav.page} of ${totalPages}`);
  $("#page-first").disabled = nav.page <= 1;
  $("#page-prev").disabled = payload.prevCursor == null || nav.page <= 1;
  $("#page-next").disabled = payload.nextCursor == null || nav.page >= totalPages;
  $("#page-last").disabled = nav.page >= totalPages;
}

async function loadPage({ pushState = false } = {}) {
  setLoading(true);
  if (pushState) syncUrl();
  const params = baseParams();
  params.set("edge", nav.edge);
  params.set("direction", nav.direction);
  if (nav.cursor) params.set("cursor", nav.cursor);
  try {
    const response = await fetch(`/api/activity/page?${params}`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    currentPayload = payload;
    const records = payload.records ?? [];
    $("#export-button").disabled = false;
    text($("#environment-pill"), payload.environment);
    text($("#chain-title"), chainHeading(payload));
    text($("#chain-summary"), mode === "causal"
      ? `Meaningful terminal and retry operations · ${payload.total} total.`
      : `Raw Activity records exactly as logged · ${payload.total} total.`);
    renderMetrics(records); renderMode(); renderRaw(mode === "raw" ? records : []); renderCausal(mode === "causal" ? records : []); populateServices(records); renderPager(payload);
  } catch (error) {
    currentPayload = null;
    $("#export-button").disabled = true;
    renderMetrics([]); renderRaw([]); renderCausal([]);
    text($("#chain-summary"), `Activity unavailable: ${error.message}`);
  } finally { setLoading(false); if (currentPayload) renderPager(currentPayload); }
}

function selectMode(nextMode) {
  if (mode === nextMode) return;
  mode = nextMode;
  currentPayload = null;
  nav = { edge:"first", direction:"next", cursor:null, page:1 };
  renderMode(); syncUrl(); loadPage();
}

function scheduleRefresh() {
  clearInterval(timer); timer = null;
  if ($("#auto-refresh").checked) timer = setInterval(() => loadPage(), 10000);
}

form.addEventListener("submit", (event) => { event.preventDefault(); nav = { edge:"first", direction:"next", cursor:null, page:1 }; loadPage({ pushState:true }); });
kind.addEventListener("change", updateIdentityState);
$("#refresh-button").addEventListener("click", () => loadPage());
$("#export-button").addEventListener("click", copyExport);
$("#auto-refresh").addEventListener("change", scheduleRefresh);
$("#view-causal").addEventListener("click", () => selectMode("causal"));
$("#view-raw").addEventListener("click", () => selectMode("raw"));
$("#page-first").addEventListener("click", firstPage);
$("#page-prev").addEventListener("click", previousPage);
$("#page-next").addEventListener("click", nextPage);
$("#page-last").addEventListener("click", lastPage);
$("#dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) { event.preventDefault(); (value.disabled ? service : value).focus(); }
});

const staging = location.hostname === "admin.staging.insidefibre.com" || location.hostname.includes("-staging.");
$("#status-link").href = staging ? "https://status.staging.insidefibre.com" : "https://status.insidefibre.com";
syncFromUrl(); scheduleRefresh(); loadPage();
