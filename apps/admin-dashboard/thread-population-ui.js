import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton, iconForIdentityAction } from "./fa-icons.js";
import { reissueFidCard } from "./thread-observatory.js";

const $ = (selector) => document.querySelector(selector);
const view = $("#threads-view");
const rows = $("#thread-population-rows");
const empty = $("#thread-population-empty");
const stillbornView = $("#stillborn-view");
const stillbornRows = $("#stillborn-rows");
const stillbornEmpty = $("#stillborn-empty");
let active = false;
let populationMode = "threads";
let loading = false;
let priorAutoRefresh = true;
let population = [];
let stillborn = [];
let sortState = { key:"lastActivity", direction:"desc" };
const populationPortraitCache = new Map();
const populationPortraitObserver = typeof IntersectionObserver === "function"
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        populationPortraitObserver.unobserve(entry.target);
        void hydratePopulationPortrait(entry.target);
      }
    }, { rootMargin:"160px 0px" })
  : null;

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function shortId(value) {
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function initials(value) {
  const parts = String(value ?? "").trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 1).toLocaleUpperCase();
  return `${parts[0].slice(0, 1)}${parts.at(-1).slice(0, 1)}`.toLocaleUpperCase();
}

function preferredPortraitUrl(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  const asset = assets.find((entry) => entry?.role === "official_id_photo" && entry?.url)
    ?? assets.find((entry) => entry?.role === "canonical_portrait" && entry?.url)
    ?? assets.find((entry) => entry?.url && String(entry.mediaType ?? "").startsWith("image/"))
    ?? null;
  return typeof asset?.url === "string" && asset.url !== "" ? asset.url : null;
}

async function resolvePopulationPortrait(threadId) {
  if (populationPortraitCache.has(threadId)) return populationPortraitCache.get(threadId);
  const pending = (async () => {
    try {
      const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, {
        headers:{ Accept:"application/json" },
        cache:"no-store",
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return preferredPortraitUrl(payload.identity);
    } catch {
      return null;
    }
  })();
  populationPortraitCache.set(threadId, pending);
  return pending;
}

function setPopulationPortrait(portrait, url, name) {
  portrait.replaceChildren();
  portrait.removeAttribute("role");
  portrait.removeAttribute("tabindex");
  delete portrait.dataset.lightboxSrc;
  delete portrait.dataset.lightboxAlt;
  if (!url) {
    portrait.textContent = initials(name);
    return;
  }

  const image = document.createElement("img");
  image.src = url;
  image.alt = `${name ?? "Thread"} portrait`;
  image.loading = "lazy";
  portrait.dataset.lightboxSrc = url;
  portrait.dataset.lightboxAlt = image.alt;
  portrait.setAttribute("role", "button");
  portrait.tabIndex = 0;
  portrait.append(image);
  image.addEventListener("error", () => setPopulationPortrait(portrait, null, name), { once:true });
}

async function hydratePopulationPortrait(portrait) {
  const threadId = portrait.dataset.threadId;
  if (!threadId) return;
  const url = await resolvePopulationPortrait(threadId);
  if (!portrait.isConnected || portrait.dataset.threadId !== threadId) return;
  setPopulationPortrait(portrait, url, portrait.dataset.threadName || null);
}

function queuePopulationPortrait(portrait, thread) {
  portrait.dataset.threadId = thread.threadId;
  portrait.dataset.threadName = thread.identity?.name ?? "";
  if (populationPortraitObserver) populationPortraitObserver.observe(portrait);
  else void hydratePopulationPortrait(portrait);
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
  $("#refresh-button").disabled = disabled || loading;
}

function button(label, spec, thread) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = spec.kind === "recover" ? "secondary" : "primary";
  decorateActionButton(control, {
    icon:spec.icon ?? null,
    label,
    tooltip:spec.tooltip ?? `${label} — ${spec.description}`,
    iconOnly:spec.iconOnly === true,
  });
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

function reissueFidButton(thread) {
  const label = "Re-issue FIN Card";
  const control = document.createElement("button");
  control.type = "button";
  control.className = "secondary thread-fid-reissue-action";
  decorateActionButton(control, {
    icon:"id-card",
    label,
    tooltip:"Cut a new FIN Card from the current authoritative Thread identity",
    iconOnly:true,
  });
  control.addEventListener("click", (event) => {
    event.stopPropagation();
    openThreadActionDialog({
      threadId:thread.threadId,
      threadName:thread.identity?.name ?? null,
      label,
      eyebrow:"Fibre Identity Card",
      description:"Cut a new FIN Card from the current authoritative Thread identity. The FIN and Thread identity do not change; the previous card remains in history.",
      onBusyChange:setPopulationControlsDisabled,
      run:async () => {
        const result = await reissueFidCard(thread.threadId);
        const credential = result?.credential ?? null;
        $("#chain-summary").textContent = credential
          ? `Re-issued FIN Card for ${thread.identity?.name ?? "Unnamed Thread"} · revision ${credential.revision}.`
          : result?.state === "derivation_requested"
            ? `FIN Card reissue started for ${thread.identity?.name ?? "Unnamed Thread"} · official ID photo is being prepared.`
            : `FIN Card reissue accepted for ${thread.identity?.name ?? "Unnamed Thread"}.`;
        window.dispatchEvent(new CustomEvent("fibre:fid-card-reissued", {
          detail:{ threadId:thread.threadId, result },
        }));
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
  controls.append(reissueFidButton(thread));
  for (const action of identityActions(thread)) {
    const label = action.label ?? human(action.id);
    const finding = (thread.findings ?? []).find((entry) => entry?.identityAction?.id === action.id) ?? null;
    const isAdmission = action.id === "admit_name" || action.id === "admit_birth_date";
    const isLanguages = ["set_languages","change_languages"].includes(action.id);
    const description = isAdmission
      ? "Admit preserved identity evidence into authoritative World identity. Presentation is evidence, not authority."
      : isLanguages
        ? `${finding?.state === "operator_decision_required" ? "Required operator decision. " : ""}${finding?.reason ?? "Set this Thread's personal language path from household, civic life, or sustained schooling."}`
        : "Record an explicit operator identity decision in World history. Fibre will re-read authoritative state before returning to Threads.";
    controls.append(button(label, {
      kind:"identity",
      icon:iconForIdentityAction(action.id),
      iconOnly:true,
      eyebrow:"Authoritative identity",
      description,
      fields:actionFields(action),
      body:(input) => {
        const commandAction = action.command ?? "identity";
        return {
          action:commandAction,
          operationKey:`${commandAction === "raised_languages" ? "admin_raised_languages" : "admin_identity"}_${Date.now().toString(36)}`,
          ...input,
        };
      },
    }, thread));
  }

  const migration = migrationFor(thread);
  if (migration) {
    const label = `Migrate · ${migration.label ?? human(migration.id)}`;
    controls.append(button(label, {
      kind:"migration",
      icon:"arrow-up-from-bracket",
      iconOnly:true,
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
  const pending = thread.reconciliation?.state === "pending";
  if (hasRepair(thread) && thread.health === "repairable") {
    const label = deadLetter ? "Repair & recover" : "Repair";
    controls.append(button(label, {
      kind:"repair",
      icon:deadLetter ? "heart-pulse" : "wrench",
      iconOnly:true,
      eyebrow:"Thread repair",
      description:deadLetter
        ? "Repair derived state from authoritative World facts and recover this Thread from reconciliation quarantine."
        : "Repair derived state from authoritative World facts. No new identity fact will be invented.",
      body:() => ({ repairKey:`admin_repair_${Date.now().toString(36)}` }),
    }, thread));
  } else if (pending && thread.health === "healthy") {
    controls.append(button("Resolve reconciliation", {
      kind:"repair",
      icon:"rotate",
      iconOnly:true,
      eyebrow:"Reconciliation cleanup",
      description:"Retire stale pending reconciliation now that authoritative Thread health is complete. This does not change identity or Genesis.",
      body:() => ({ repairKey:`admin_reconcile_${Date.now().toString(36)}` }),
    }, thread));
  } else if (deadLetter && thread.health === "healthy") {
    controls.append(button("Recover", {
      kind:"recover",
      icon:"heart-pulse",
      iconOnly:true,
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
  if (thread.admitted === true) {
    setPopulationPortrait(portrait, thread.portraitUrl, identity.name);
    if (!thread.portraitUrl) queuePopulationPortrait(portrait, thread);
  } else {
    portrait.textContent = "·";
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
  populationPortraitObserver?.disconnect();
  const ordered = [...population].sort((left, right) => compare(left, right, sortState.key, sortState.direction));
  rows.replaceChildren(...ordered.map(threadRow));
  empty.hidden = ordered.length !== 0;
  renderSortHeaders();
}

function stillbornRow(thread) {
  const tr = document.createElement("tr");
  tr.className = "stillborn-row";

  const identifier = document.createElement("td");
  identifier.className = "mono";
  identifier.textContent = thread.threadId;

  const lastActivity = document.createElement("td");
  lastActivity.className = "time";
  lastActivity.textContent = when(thread.lastActivityAt);

  const health = document.createElement("td");
  health.append(badge("unrecoverable", "failed"));

  const meaning = document.createElement("td");
  meaning.className = "stillborn-reason";
  meaning.textContent = thread.admitted === false
    ? "Observed in Activity, but World never admitted a recoverable Thread state."
    : "World diagnosis marked this Thread unrecoverable.";

  const action = document.createElement("td");
  action.className = "thread-population-actions";
  const raw = document.createElement("button");
  raw.type = "button";
  raw.className = "secondary";
  raw.textContent = "View Raw";
  raw.addEventListener("click", () => {
    const params = new URLSearchParams();
    params.set("kind", "thread");
    params.set("value", thread.threadId);
    params.set("mode", "raw");
    location.assign(`${location.pathname}?${params}`);
  });
  action.append(raw);

  tr.append(identifier, lastActivity, health, meaning, action);
  return tr;
}

function renderStillborn() {
  const ordered = [...stillborn].sort((left, right) => {
    const a = Date.parse(left.lastActivityAt ?? "");
    const b = Date.parse(right.lastActivityAt ?? "");
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return b - a;
    return left.threadId.localeCompare(right.threadId);
  });
  stillbornRows.replaceChildren(...ordered.map(stillbornRow));
  stillbornEmpty.hidden = ordered.length !== 0;
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

function renderStillbornTopSummary(summary = null) {
  $("#metric-label-records").textContent = "Stillborn";
  $("#metric-context-records").textContent = "unrecoverable observed IDs";
  $("#metric-records").textContent = summary?.stillborn ?? stillborn.length ?? "—";
  $("#metric-label-failures").textContent = "World admission";
  $("#metric-context-failures").textContent = "no recoverable person state";
  $("#metric-failures").textContent = "0";
  $("#metric-label-retries").textContent = "Repair path";
  $("#metric-context-retries").textContent = "parked / observational";
  $("#metric-retries").textContent = "—";
  $("#metric-view").textContent = "Stillborn";
  $("#metric-view-context").textContent = "unrecoverable / Activity evidence";
}

function renderSummary(summary) {
  const values = {
    "thread-stat-total":summary.total,
    "thread-stat-activity-only":summary.stillborn,
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
  view.hidden = populationMode !== "threads";
  stillbornView.hidden = populationMode !== "stillborn";
  document.querySelector("#thread-context").hidden = true;
  for (const control of document.querySelectorAll(".view-switch button")) {
    control.classList.toggle("active", control.dataset.mode === populationMode);
  }
  $("#chain-title").textContent = populationMode === "stillborn" ? "Stillborn Threads" : "Threads";
  if (populationMode === "stillborn") renderStillbornTopSummary();
  else {
    $("#metric-view").textContent = "Threads";
    $("#metric-view-context").textContent = "population / World health";
  }
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
    stillborn = payload.stillborn ?? [];
    populationPortraitCache.clear();
    renderSummary(payload.summary ?? {});
    renderPopulation();
    renderStillborn();
    $("#environment-pill").textContent = payload.environment ?? "—";
    if (populationMode === "stillborn") {
      renderStillbornTopSummary(payload.summary ?? {});
      $("#chain-summary").textContent = `${stillborn.length} unrecoverable Thread ${stillborn.length === 1 ? "identifier" : "identifiers"} parked outside the admitted population${payload.truncated ? ` · first ${payload.limit} observed IDs` : ""}.`;
    } else {
      renderThreadsTopSummary(payload.summary ?? {});
      $("#chain-summary").textContent = `${population.length} admitted/recoverable Threads · ${stillborn.length} Stillborn${payload.truncated ? ` · first ${payload.limit} observed IDs` : ""}.`;
    }
  } catch (error) {
    population = [];
    stillborn = [];
    if (populationMode === "stillborn") renderStillbornTopSummary();
    else renderThreadsTopSummary();
    renderPopulation();
    renderStillborn();
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

function enterPopulation(nextMode) {
  populationMode = nextMode;
  if (active) {
    holdThreadsMode();
    if (populationMode === "stillborn") {
      renderStillbornTopSummary({ stillborn:stillborn.length });
      $("#chain-summary").textContent = `${stillborn.length} unrecoverable Thread ${stillborn.length === 1 ? "identifier" : "identifiers"} parked outside the admitted population.`;
    } else {
      renderThreadsTopSummary({
        total:population.length,
        attention:population.filter((thread) => thread.health !== "healthy").length,
        deadLetter:population.filter((thread) => thread.reconciliation?.state === "dead_letter").length,
      });
      $("#chain-summary").textContent = `${population.length} admitted/recoverable Threads · ${stillborn.length} Stillborn.`;
    }
    const params = new URLSearchParams(location.search);
    params.set("mode", populationMode);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    return;
  }
  active = true;
  priorAutoRefresh = $("#auto-refresh").checked;
  $("#auto-refresh").checked = false;
  $("#auto-refresh").dispatchEvent(new Event("change"));
  setActivityChrome(true);
  if (populationMode === "stillborn") renderStillbornTopSummary();
  else renderThreadsTopSummary();
  holdThreadsMode();
  $("#chain-summary").textContent = "Loading population…";
  const params = new URLSearchParams(location.search); params.set("mode", populationMode);
  history.replaceState(null, "", `${location.pathname}?${params}`);
  void loadPopulation();
}

function enterThreads() { enterPopulation("threads"); }
function enterStillborn() { enterPopulation("stillborn"); }

function exitThreads(nextMode) {
  if (!active) return;
  active = false;
  view.hidden = true;
  stillbornView.hidden = true;
  setActivityChrome(false);
  renderActivitySummaryLabels();
  $("#metric-view").textContent = nextMode === "causal" ? "Causal" : "Raw";
  $("#auto-refresh").checked = priorAutoRefresh;
  $("#auto-refresh").dispatchEvent(new Event("change"));

  const params = new URLSearchParams(location.search);
  if (["threads","stillborn"].includes(params.get("mode"))) {
    params.set("mode", nextMode);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    $("#refresh-button").click();
  }
}

$("#view-threads").addEventListener("click", enterThreads);
$("#view-stillborn").addEventListener("click", enterStillborn);
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

const initialMode = new URLSearchParams(location.search).get("mode");
if (initialMode === "threads") enterThreads();
if (initialMode === "stillborn") enterStillborn();
