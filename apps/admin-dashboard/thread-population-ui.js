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

function collectInput(action) {
  const fields = action.input?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return {};
  const input = {};
  for (const field of fields) {
    if (typeof field?.name !== "string" || field.name === "") continue;
    const choices = Array.isArray(field.options) ? field.options : [];
    const prompt = choices.length > 0
      ? `${field.label ?? human(field.name)} (${choices.join(" / ")})`
      : field.label ?? human(field.name);
    const answer = window.prompt(prompt, field.default ?? "");
    if (answer === null) return undefined;
    const value = answer.trim();
    if (field.required === true && value === "") throw new Error(`${field.label ?? human(field.name)} is required`);
    if (choices.length > 0 && !choices.includes(value)) throw new Error(`${field.label ?? human(field.name)} must be ${choices.join(" or ")}`);
    input[field.name] = value;
  }
  return input;
}

function button(label, body, thread) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = label === "Recover" ? "secondary" : "primary";
  control.textContent = label;
  control.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const payload = body();
      if (payload === null || payload === undefined) return;
      control.disabled = true;
      control.textContent = `${label}…`;
      await command(thread.threadId, payload);
      await loadPopulation();
    } catch (error) {
      control.disabled = false;
      control.textContent = label;
      $("#chain-summary").textContent = `${label} failed for ${shortId(thread.threadId)}: ${error instanceof Error ? error.message : String(error)}`;
    }
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
    controls.append(button(action.label ?? human(action.id), () => {
      const input = collectInput(action);
      if (input === undefined) return null;
      return {
        action:"identity",
        operationKey:`admin_identity_${Date.now().toString(36)}`,
        ...input,
      };
    }, thread));
  }

  const migration = migrationFor(thread);
  if (migration) {
    controls.append(button(`Migrate · ${migration.label ?? human(migration.id)}`, () => {
      const input = collectInput(migration);
      if (input === undefined) return null;
      return {
        action:"migrate",
        migrationId:migration.id,
        migrationKey:`admin_migration_${Date.now().toString(36)}`,
        input,
      };
    }, thread));
  }

  const deadLetter = thread.reconciliation?.state === "dead_letter";
  if (hasRepair(thread) && thread.health === "repairable") {
    controls.append(button(deadLetter ? "Fix & Recover" : "Fix", () => ({
      repairKey:`admin_repair_${Date.now().toString(36)}`,
    }), thread));
  } else if (deadLetter && thread.health === "healthy") {
    controls.append(button("Recover", () => ({ action:"recover" }), thread));
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

  const person = document.createElement("td");
  const link = document.createElement("a");
  link.className = "thread-population-name";
  if (thread.admitted === true) {
    link.href = `/thread/${encodeURIComponent(thread.threadId)}`;
    link.textContent = identity.name ?? "Unnamed Thread";
  } else {
    link.href = `/activity?kind=thread&value=${encodeURIComponent(thread.threadId)}&mode=causal`;
    link.textContent = thread.admitted === false ? "Activity-only ID" : "Unresolved ID";
  }
  const ids = document.createElement("small");
  ids.className = "mono";
  ids.textContent = [identity.fibreIdentityNumber, identity.lifecycleStatus, shortId(thread.threadId)].filter(Boolean).join(" · ");
  person.append(link, ids);

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

  tr.append(person, sex, birthDate, health, reconciliation, lastActivity, actionCell(thread));
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
}

function holdThreadsMode() {
  if (!active) return;
  $("#causal-view").hidden = true;
  $("#raw-view").hidden = true;
  view.hidden = false;
  document.querySelector("#thread-context").hidden = true;
  for (const control of document.querySelectorAll(".view-switch button")) control.classList.toggle("active", control.id === "view-threads");
  $("#chain-title").textContent = "Threads";
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
    renderPopulation();
    $("#chain-summary").textContent = `Thread population unavailable: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    loading = false;
    holdThreadsMode();
    $("#refresh-button").disabled = false;
    $("#refresh-button").textContent = "Refresh";
  }
}

function setActivityChrome(hidden) {
  document.querySelector(".filters-panel").hidden = hidden;
  document.querySelector(".main > section.metrics").hidden = hidden;
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
