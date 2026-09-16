const $ = (selector) => document.querySelector(selector);
const view = $("#threads-view");
const rows = $("#thread-population-rows");
const empty = $("#thread-population-empty");
let active = false;
let loading = false;
let priorAutoRefresh = true;

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

function migrationInput(migration) {
  const fields = migration.input?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const input = {};
  for (const field of fields) {
    if (typeof field?.name !== "string" || field.name === "") continue;
    const answer = window.prompt(field.label ?? human(field.name), field.default ?? "");
    if (answer === null) return undefined;
    if (field.required === true && answer.trim() === "") throw new Error(`${field.label ?? human(field.name)} is required`);
    input[field.name] = answer;
  }
  return input;
}

function actionCell(thread) {
  const cell = document.createElement("td");
  cell.className = "thread-population-actions";
  const migration = migrationFor(thread);
  const deadLetter = thread.reconciliation?.state === "dead_letter";
  let label = null;
  let body = null;

  if (migration) {
    label = "Migrate";
    body = () => {
      const input = migrationInput(migration);
      if (input === undefined) return null;
      return {
        action:"migrate",
        migrationId:migration.id,
        migrationKey:`admin_migration_${Date.now().toString(36)}`,
        input,
      };
    };
  } else if (hasRepair(thread) && thread.health === "repairable") {
    label = deadLetter ? "Fix & Recover" : "Fix";
    body = () => ({ repairKey:`admin_repair_${Date.now().toString(36)}` });
  } else if (deadLetter && thread.health === "healthy") {
    label = "Recover";
    body = () => ({ action:"recover" });
  }

  if (body === null) {
    const reason = thread.health === "migration_required" ? "Migration required"
      : thread.health === "operator_decision_required" ? "Review required"
        : thread.health === "integrity_error" ? "Authority conflict"
          : thread.health === "unavailable" ? "Unavailable"
            : thread.reconciliation?.state === "pending" ? "Pending"
              : "—";
    cell.textContent = reason;
    return cell;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = label === "Recover" ? "secondary" : "primary";
  button.textContent = label;
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const payload = body();
      if (payload === null) return;
      button.disabled = true;
      button.textContent = `${label}…`;
      await command(thread.threadId, payload);
      await loadPopulation();
    } catch (error) {
      button.disabled = false;
      button.textContent = label;
      $("#chain-summary").textContent = `${label} failed for ${shortId(thread.threadId)}: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
  cell.append(button);
  return cell;
}

function threadRow(thread) {
  const tr = document.createElement("tr");
  const identity = thread.identity ?? {};

  const person = document.createElement("td");
  const link = document.createElement("a");
  link.className = "thread-population-name";
  link.href = `/thread/${encodeURIComponent(thread.threadId)}`;
  link.textContent = identity.name ?? "Unnamed Thread";
  const ids = document.createElement("small");
  ids.className = "mono";
  ids.textContent = [identity.fibreIdentityNumber, shortId(thread.threadId)].filter(Boolean).join(" · ");
  person.append(link, ids);

  const sex = document.createElement("td"); sex.textContent = identity.sex ? human(identity.sex) : "—";
  const lifecycle = document.createElement("td"); lifecycle.textContent = identity.lifecycleStatus ? human(identity.lifecycleStatus) : "—";
  const health = document.createElement("td"); health.append(badge(thread.health, healthKind(thread.health)));
  const reconciliation = document.createElement("td");
  const reconciliationState = reconciliationLabel(thread.reconciliation);
  reconciliation.append(reconciliationState === "—" ? document.createTextNode("—") : badge(
    reconciliationState,
    thread.reconciliation?.state === "dead_letter" ? "failed" : thread.reconciliation?.state === "complete" ? "succeeded" : "retrying",
  ));
  if (thread.reconciliation?.lastError?.message) reconciliation.title = thread.reconciliation.lastError.message;
  const lastActivity = document.createElement("td"); lastActivity.className = "time"; lastActivity.textContent = when(thread.lastActivityAt);

  tr.append(person, sex, lifecycle, health, reconciliation, lastActivity, actionCell(thread));
  return tr;
}

function renderSummary(summary) {
  const values = {
    "thread-stat-total":summary.total,
    "thread-stat-female":summary.female,
    "thread-stat-male":summary.male,
    "thread-stat-unknown":summary.unknownSex,
    "thread-stat-attention":summary.attention,
    "thread-stat-dead":summary.deadLetter,
  };
  for (const [id, value] of Object.entries(values)) $(`#${id}`).textContent = value ?? 0;
}

async function loadPopulation() {
  if (!active || loading) return;
  loading = true;
  $("#refresh-button").disabled = true;
  $("#refresh-button").textContent = "Refreshing…";
  $("#chain-summary").textContent = "Reading Activity-discovered Threads and authoritative World health…";
  try {
    const response = await fetch("/api/threads/population", { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    renderSummary(payload.summary ?? {});
    rows.replaceChildren(...(payload.threads ?? []).map(threadRow));
    empty.hidden = (payload.threads ?? []).length !== 0;
    $("#environment-pill").textContent = payload.environment ?? "—";
    $("#chain-summary").textContent = `${payload.summary?.total ?? 0} Activity-discovered Threads · authoritative World status${payload.truncated ? ` · first ${payload.limit}` : ""}.`;
  } catch (error) {
    rows.replaceChildren();
    empty.hidden = false;
    $("#chain-summary").textContent = `Thread population unavailable: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    loading = false;
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
  $("#causal-view").hidden = true;
  $("#raw-view").hidden = true;
  view.hidden = false;
  for (const button of document.querySelectorAll(".view-switch button")) button.classList.toggle("active", button.id === "view-threads");
  $("#chain-title").textContent = "Threads";
  $("#chain-summary").textContent = "Loading population…";
  const params = new URLSearchParams(location.search); params.set("mode", "threads");
  history.replaceState(null, "", `${location.pathname}?${params}`);
  void loadPopulation();
}

function exitThreads() {
  if (!active) return;
  active = false;
  view.hidden = true;
  setActivityChrome(false);
  $("#auto-refresh").checked = priorAutoRefresh;
  $("#auto-refresh").dispatchEvent(new Event("change"));
}

$("#view-threads").addEventListener("click", enterThreads);
for (const id of ["view-causal", "view-raw"]) {
  $(`#${id}`).addEventListener("click", exitThreads, { capture:true });
}
$("#refresh-button").addEventListener("click", (event) => {
  if (!active) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void loadPopulation();
}, { capture:true });

if (new URLSearchParams(location.search).get("mode") === "threads") enterThreads();
