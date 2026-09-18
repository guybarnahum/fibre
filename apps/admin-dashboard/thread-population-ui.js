import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";

const $ = (selector) => document.querySelector(selector);
const view = $("#threads-view");
const rows = $("#thread-population-rows");
const empty = $("#thread-population-empty");
let active = false;
let loading = false;
let priorAutoRefresh = true;
let population = [];
let sortState = { key:"lastActivity", direction:"desc" };

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function shortId(value) {
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function when(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat([], {
    month:"short", day:"numeric", hour:"2-digit", minute:"2-digit",
  }).format(date);
}

function badge(value, kind = "started") {
  const node = document.createElement("span");
  node.className = `status status-${kind}`;
  node.textContent = human(value);
  return node;
}

function healthKind(value) {
  if (value === "healthy") return "succeeded";
  if (["integrity_error", "unrecoverable"].includes(value)) return "failed";
  if (["migration_required", "repairable", "operator_decision_required"].includes(value)) return "retrying";
  return "started";
}

function reconciliationLabel(value) {
  if (!value) return "—";
  if (value.state !== "dead_letter") return human(value.state);
  return value.lastError?.code ? `dead letter · ${human(value.lastError.code)}` : "dead letter";
}

function migrationFor(thread) {
  return (thread.findings ?? []).find((finding) => finding?.migration?.id)?.migration ?? null;
}

function identityActions(thread) {
  const seen = new Set();
  return (thread.findings ?? []).flatMap((finding) => {
    const action = finding?.identityAction;
    if (!action?.id || seen.has(action.id)) return [];
    seen.add(action.id);
    return [action];
  });
}

function hasRepair(thread) {
  return (thread.findings ?? []).some((finding) => finding?.state === "repairable" && typeof finding?.action === "string");
}

async function command(threadId, body) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? payload?.error ?? `HTTP ${response.status}`);
  return payload;
}

function setPopulationControlsDisabled(disabled) {
  for (const control of document.querySelectorAll(".thread-population-actions button")) control.disabled = disabled;
  if (disabled) $("#refresh-button").disabled = true;
}

function button(label, spec, thread) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = spec.kind === "recover" ? "secondary" : "primary";
  control.textContent = label;
  control.addEventListener("click", (event) => {
    event.stopPropagation();
    openThreadActionDialog({
      threadId:thread.threadId,
      threadName:thread.identity?.name ?? null,
      label,
      eyebrow:spec.eyebrow,
      description:spec.description,
      fields:spec.fields ?? [],
      onBusyChange:setPopulationControlsDisabled,
      run:async (input) => {
        await command(thread.threadId, spec.body(input));
        await loadPopulation();
        $("#chain-summary").textContent = `${label} completed for ${thread.identity?.name ?? "Unnamed Thread"}.`;
      },
    });
  });
  return control;
}

function actionCell(thread) {
  const cell = document.createElement("td");
  cell.className = "thread-population-actions";
  if (thread.admitted === false) {
    cell.textContent = "Activity only";
    return cell;
  }
  if (thread.admitted !== true) {
    cell.textContent = "Unavailable";
    return cell;
  }

  const controls = document.createElement("div");
  controls.className = "thread-action-stack";
  for (const action of identityActions(thread)) {
    const label = action.label ?? human(action.id);
    controls.append(button(label, {
      kind:"identity",
      eyebrow:"Authoritative identity",
      description:"Record an explicit operator identity decision in World history. Fibre will re-read authoritative state before returning to Threads.",
      fields:actionFields(action),
      body:(input) => ({
        action:"identity",
        operationKey:`admin_identity_${Date.now().toString(36)}`,
        ...input,
      }),
    }, thread));
  }

  const migration = migrationFor(thread);
  if (migration) {
    const label = `Migrate · ${migration.label ?? human(migration.id)}`;
    controls.append(button(label, {
      kind:"migration",
      eyebrow:"Identity migration",
      description:"Apply the named migration using preserved evidence, then re-diagnose the Thread from authoritative World state.",
      fields:actionFields(migration),
      body:(input) => ({
        action:"migrate",
        migrationId:migration.id,
        migrationKey:`admin_migration_${Date.now().toString(36)}`,
        input,
      }),
    }, thread));
  }

  const deadLetter = thread.reconciliation?.state === "dead_letter";
  if (hasRepair(thread) && thread.health === "repairable") {
    const label = deadLetter ? "Repair & recover" : "Repair";
    controls.append(button(label, {
      kind:"repair",
      eyebrow:"Thread repair",
      description:deadLetter
        ? "Repair derived state from authoritative World facts and recover this Thread from reconciliation quarantine."
        : "Repair derived state from authoritative World facts. No new identity fact will be invented.",
      body:() => ({ repairKey:`admin_repair_${Date.now().toString(36)}` }),
    }, thread));
  } else if (deadLetter && thread.health === "healthy") {
    controls.append(button("Recover", {
      kind:"recover",
      eyebrow:"Reconciliation recovery",
      description:"Return this healthy Thread from dead-letter quarantine to reconciliation processing.",
      body:() => ({ action:"recover" }),
    }, thread));
  }

  if (controls.childElementCount > 0) {
    cell.append(controls);
    return cell;
  }

  const reason = thread.health === "migration_required" ? "Migration required"
    : thread.health === "operator_decision_required" ? "Input required"
      : thread.health === "integrity_error" ? "Authority conflict"
        : thread.health === "unrecoverable" ? "Not admitted"
          : thread.health === "unavailable" ? "Unavailable"
            : thread.reconciliation?.state === "pending" ? "Pending"
              : "—";
  cell.textContent = reason;
  return cell;
}

function threadRow(thread) {
  const tr = document.createElement("tr");
  const identity = thread.identity ?? {};
  if (thread.admitted === false) tr.className = "thread-population-activity-only";

  const portraitCell = document.createElement("td");
  portraitCell.className = "thread-population-portrait-cell";
  const portrait = document.createElement("span");
  portrait.className = "thread-population-portrait";
  if (thread.admitted === true && typeof thread.portraitUrl === "string" && thread.portraitUrl !== "") {
    const image = document.createElement("img");
    image.src = thread.portraitUrl;
    image.alt = `${identity.name ?? "Thread"} portrait`;
    image.loading = "lazy";
    portrait.dataset.lightboxSrc = thread.portraitUrl;
    portrait.dataset.lightboxAlt = image.alt;
    portrait.setAttribute("role", "button");
    portrait.tabIndex = 0;
    portrait.append(image);
  } else {
    portrait.textContent = thread.admitted === true ? (identity.name?.trim()?.[0] ?? "·") : "·";
  }
  portraitCell.append(portrait);

  const person = document.createElement("td");
  const personLayout = document.createElement("div");
  personLayout.className = "thread-population-person";
  const personText = document.createElement("div");
  const link = document.createElement("button");
  link.type = "button";
  link.className = "thread-population-name thread-link";
  link.dataset.threadId = thread.threadId;
  link.title = `Inspect ${thread.threadId}`;
  link.textContent = thread.admitted === true
    ? identity.name ?? "Unnamed Thread"
    : thread.admitted === false ? "Activity-only ID" : "Unresolved ID";
  const ids = document.createElement("small");
  ids.className = "mono";
  ids.textContent = [identity.fibreIdentityNumber, identity.lifecycleStatus, shortId(thread.threadId)].filter(Boolean).join(" · ");
  personText.append(link, ids);
  personLayout.append(personText);
  person.append(personLayout);

  const sex = document.createElement("td"); sex.textContent = identity.sex ? human(identity.sex) : "—";
  const birthDate = document.createElement("td"); birthDate.textContent = identity.birthDate ?? "—";
  const health = document.createElement("td"); health.append(badge(thread.admitted === false ? "not admitted" : thread.health, healthKind(thread.health)));
  const reconciliation = document.createElement("td");
  const reconciliationState = reconciliationLabel(thread.reconciliation);
  reconciliation.append(reconciliationState === "—" ? document.createTextNode("—") : badge(
    reconciliationState,
    thread.reconciliation?.state === "dead_letter" ? "failed" : thread.reconciliation?.state === "complete" ? "succeeded" : "retrying",
  ));
  if (thread.reconciliation?.lastError?.message) reconciliation.title = thread.reconciliation.lastError.message;
  const lastActivity = document.createElement("td"); lastActivity.className = "time"; lastActivity.textContent = when(thread.lastActivityAt);

  tr.append(portraitCell, person, sex, birthDate, health, reconciliation, lastActivity, actionCell(thread));
  return tr;
}

function sortValue(thread, key) {
  if (key === "sex") return thread.identity?.sex ?? null;
  if (key === "birthDate") {
    const parsed = Date.parse(thread.identity?.birthDate ?? "");
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (key === "health") {
    const order = ["healthy","repairable","operator_decision_required","migration_required","integrity_error","unrecoverable","unavailable"];
    const index = order.indexOf(thread.health);
    return index < 0 ? order.length : index;
  }
  if (key === "reconciliation") {
    const order = ["complete","pending","retry","dead_letter"];
    const index = order.indexOf(thread.reconciliation?.state);
    return index < 0 ? null : index;
  }
  if (key === "lastActivity") {
    const parsed = Date.parse(thread.lastActivityAt ?? "");
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compare(left, right, key, direction) {
  const a = sortValue(left, key);
  const b = sortValue(right, key);
  if (a === null && b === null) return left.threadId.localeCompare(right.threadId);
  if (a === null) return 1;
  if (b === null) return -1;
  const base = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
  if (base !== 0) return direction === "asc" ? base : -base;
  return left.threadId.localeCompare(right.threadId);
}

function renderSortHeaders() {
  for (const control of document.querySelectorAll("[data-thread-sort]")) {
    const label = control.dataset.label ?? control.textContent.replace(/[↑↓↕]\s*$/u, "").trim();
    control.dataset.label = label;
    const current = control.dataset.threadSort === sortState.key;
    control.textContent = `${label} ${current ? (sortState.direction === "asc" ? "↑" : "↓") : "↕"}`;
  }
}

function renderPopulation() {
  const ordered = [...population].sort((left, right) => compare(left, right, sortState.key, sortState.direction));
  rows.replaceChildren(...ordered.map(threadRow));
  empty.hidden = ordered.length !== 0;
  renderSortHeaders();
}

function renderActivitySummaryLabels() {
  $("#metric-label-records").textContent = "Records";
  $("#metric-context-records").textContent = "on this page";
  $("#metric-label-failures").textContent = "Failures";
  $("#metric-context-failures").textContent = "on this page";
  $("#metric-label-retries").textContent = "Retrying";
  $("#metric-context-retries").textContent = "on this page";
  $("#metric-view-context").textContent = "cursor-paged Activity";
}

function renderThreadsTopSummary(summary = null) {
  $("#metric-label-records").textContent = "Threads";
  $("#metric-context-records").textContent = "admitted population";
  $("#metric-records").textContent = summary?.total ?? "—";
  $("#metric-label-failures").textContent = "Needs attention";
  $("#metric-context-failures").textContent = "authoritative health";
  $("#metric-failures").textContent = summary?.attention ?? "—";
  $("#metric-label-retries").textContent = "Dead letter";
  $("#metric-context-retries").textContent = "reconciliation";
  $("#metric-retries").textContent = summary?.deadLetter ?? "—";
  $("#metric-view").textContent = "Threads";
  $("#metric-view-context").textContent = "population / World health";
}

function renderSummary(summary) {
  const values = {
    "thread-stat-total":summary.total,
    "thread-stat-activity-only":summary.activityOnly,
    "thread-stat-female":summary.female,
    "thread-stat-male":summary.male,
    "thread-stat-unknown":summary.unknownSex,
    "thread-stat-attention":summary.attention,
    "thread-stat-migrations":summary.migrationsAvailable,
    "thread-stat-dead":summary.deadLetter,
  };
  for (const [id, value] of Object.entries(values)) $(`#${id}`).textContent = value ?? 0;
  renderThreadsTopSummary(summary);
}

function holdThreadsMode() {
  if (!active) return;
  $("#causal-view").hidden = true;
  $("#raw-view").hidden = true;
  view.hidden = false;
  document.querySelector("#thread-context").hidden = true;
  for (const control of document.querySelectorAll(".view-switch button")) control.classList.toggle("active", control.id === "view-threads");
  $("#chain-title").textContent = "Threads";
  $("#metric-view").textContent = "Threads";
  $("#metric-view-context").textContent = "population / World health";
}

async function loadPopulation() {
  if (!active || loading) return;
  loading = true;
  holdThreadsMode();
  $("#refresh-button").disabled = true;
  $("#refresh-button").textContent = "Refreshing…";
  $("#chain-summary").textContent = "Reading Activity-discovered identities and authoritative World health…";
  try {
    const response = await fetch("/api/threads/population", { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    population = payload.threads ?? [];
    renderSummary(payload.summary ?? {});
    renderPopulation();
    $("#environment-pill").textContent = payload.environment ?? "—";
    $("#chain-summary").textContent = `${payload.summary?.total ?? 0} admitted Threads · ${payload.summary?.activityOnly ?? 0} Activity-only IDs${payload.truncated ? ` · first ${payload.limit} observed IDs` : ""}.`;
  } catch (error) {
    population = [];
    renderThreadsTopSummary();
    renderPopulation();
    $("#chain-summary").textContent = `Thread population unavailable: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    loading = false;
    holdThreadsMode();
    $("#refresh-button").disabled = false;
    $("#refresh-button").textContent = "Refresh";
    setPopulationControlsDisabled(false);
  }
}

function setActivityChrome(hidden) {
  document.querySelector(".filters-panel").hidden = hidden;
  document.querySelector(".activity-pager").hidden = hidden;
  document.querySelector("#thread-context").hidden = true;
  document.querySelector(".auto-refresh").hidden = hidden;
  $("#export-button").hidden = hidden;
}

function enterThreads() {
  if (active) return;
  active = true;
  priorAutoRefresh = $("#auto-refresh").checked;
  $("#auto-refresh").checked = false;
  $("#auto-refresh").dispatchEvent(new Event("change"));
  setActivityChrome(true);
  renderThreadsTopSummary();
  holdThreadsMode();
  $("#chain-summary").textContent = "Loading population…";
  const params = new URLSearchParams(location.search); params.set("mode", "threads");
  history.replaceState(null, "", `${location.pathname}?${params}`);
  void loadPopulation();
}

function exitThreads(nextMode) {
  if (!active) return;
  active = false;
  view.hidden = true;
  setActivityChrome(false);
  renderActivitySummaryLabels();
  $("#metric-view").textContent = nextMode === "causal" ? "Causal" : "Raw";
  $("#auto-refresh").checked = priorAutoRefresh;
  $("#auto-refresh").dispatchEvent(new Event("change"));

  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "threads") {
    params.set("mode", nextMode);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    $("#refresh-button").click();
  }
}

$("#view-threads").addEventListener("click", enterThreads);
for (const [id, nextMode] of [["view-causal", "causal"], ["view-raw", "raw"]]) {
  $(`#${id}`).addEventListener("click", () => exitThreads(nextMode));
}
$("#refresh-button").addEventListener("click", (event) => {
  if (!active) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void loadPopulation();
}, { capture:true });
for (const control of document.querySelectorAll("[data-thread-sort]")) {
  control.addEventListener("click", () => {
    const key = control.dataset.threadSort;
    sortState = sortState.key === key
      ? { key, direction:sortState.direction === "asc" ? "desc" : "asc" }
      : { key, direction:key === "lastActivity" ? "desc" : "asc" };
    renderPopulation();
  });
}

if (new URLSearchParams(location.search).get("mode") === "threads") enterThreads();
