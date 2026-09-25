import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton, faIcon, iconForIdentityAction } from "./fa-icons.js";
import { reissueFidCard } from "./thread-observatory.js";
import { WORLD_MAP_BOUNDS, WORLD_MAP_PATH } from "./world-map-data.js";
import {
  SVG_NS,
  catalogPlaceForLocation,
  groupThreadsByCurrentLocation,
  renderWorldCountMarkers,
  renderWorldTimeZoneLines,
  worldMapPoint,
} from "./world-map-ui.js";

const $ = (selector) => document.querySelector(selector);
const view = $("#threads-view");
const rows = $("#thread-population-rows");
const empty = $("#thread-population-empty");
const threadPopulationMapShell = $(".thread-population-map-shell");
const threadPopulationWorldPath = $("#thread-population-world-path");
const threadPopulationTimezones = $("#thread-population-timezones");
const threadPopulationMapMarkers = $("#thread-population-map-markers");
const threadPopulationMapSummary = $("#thread-population-map-summary");
const stillbornView = $("#stillborn-view");
const stillbornRows = $("#stillborn-rows");
const stillbornEmpty = $("#stillborn-empty");
const birthCenterView = $("#birth-center-view");
const birthForm = $("#thread-birth-form");
const birthLocation = $("#thread-birth-location");
const birthMap = $("#thread-birth-map");
const birthWorldPath = $("#thread-birth-world-path");
const birthTimezones = $("#thread-birth-timezones");
const birthPipelineMarkers = $("#thread-birth-pipeline-markers");
const birthMapMarker = $("#thread-birth-map-marker");
const birthMapSelection = $("#thread-birth-map-selection");
const birthSearchResults = $("#thread-birth-search-results");
const birthRandomLocation = $("#thread-birth-location-random");
const birthCountField = $("#thread-birth-count-field");
const birthPending = $("#thread-birth-pending");
const birthPendingCount = $("#thread-birth-pending-count");
const birthPendingRefresh = $("#thread-birth-pending-refresh");
const birthResult = $("#thread-birth-result");
const birthSubmit = $("#thread-birth-submit");

let birthplaces = null;
let selectedBirthplace = null;
let pendingBirthSnapshot = [];
let pendingBirthTimer = null;
let birthCenterInitialized = false;
let threadPopulationMapInitialized = false;
let birthLoading = false;
const recentInWorldBirths = new Map();
let active = false;
let populationMode = "threads";
let loading = false;
let priorAutoRefresh = true;
let population = [];
let stillborn = [];
let sortState = { key:"lastActivity", direction:"desc" };
const populationPortraitCache = new Map();
let populationPortraitPreview = null;
let threadMapPopover = null;
let threadMapPopoverCloseTimer = null;
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

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function threadIdCopyButton(threadId) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "thread-id-copy";
  const restore = () => {
    control.classList.remove("copied", "copy-failed");
    decorateActionButton(control, {
      icon:"copy",
      label:threadId,
      tooltip:`Copy Thread ID: ${threadId}`,
    });
  };
  restore();
  control.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      await copyText(threadId);
      control.classList.add("copied");
      decorateActionButton(control, {
        icon:"copy",
        label:"Copied",
        tooltip:`Copied Thread ID: ${threadId}`,
      });
    } catch {
      control.classList.add("copy-failed");
      decorateActionButton(control, {
        icon:"copy",
        label:"Copy failed",
        tooltip:`Could not copy Thread ID: ${threadId}`,
      });
    }
    window.setTimeout(restore, 1200);
  });
  return control;
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

function hidePopulationPortraitPreview() {
  if (populationPortraitPreview) populationPortraitPreview.hidden = true;
}

function showPopulationPortraitPreview(portrait, url, name) {
  if (!url) return;
  if (!populationPortraitPreview) {
    populationPortraitPreview = document.createElement("div");
    populationPortraitPreview.className = "thread-population-portrait-preview";
    populationPortraitPreview.hidden = true;
    document.body.append(populationPortraitPreview);
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = `${name ?? "Thread"} portrait preview`;
  populationPortraitPreview.replaceChildren(image);
  populationPortraitPreview.hidden = false;

  const size = 200;
  const gap = 10;
  const rect = portrait.getBoundingClientRect();
  const left = rect.right + gap + size <= window.innerWidth
    ? rect.right + gap
    : Math.max(8, rect.left - size - gap);
  const top = Math.min(
    Math.max(8, rect.top + (rect.height - size) / 2),
    Math.max(8, window.innerHeight - size - 8),
  );
  populationPortraitPreview.style.left = `${Math.round(left)}px`;
  populationPortraitPreview.style.top = `${Math.round(top)}px`;
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
  portrait.addEventListener("pointerenter", () => showPopulationPortraitPreview(portrait, url, name));
  portrait.addEventListener("pointerleave", hidePopulationPortraitPreview);
  portrait.addEventListener("focus", () => showPopulationPortraitPreview(portrait, url, name));
  portrait.addEventListener("blur", hidePopulationPortraitPreview);
  image.addEventListener("error", () => {
    hidePopulationPortraitPreview();
    setPopulationPortrait(portrait, null, name);
  }, { once:true });
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
  control.className = "secondary";
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
  ids.className = "thread-population-identifiers mono";
  const identityMeta = [identity.fibreIdentityNumber, identity.lifecycleStatus].filter(Boolean);
  if (identityMeta.length > 0) ids.append(document.createTextNode(`${identityMeta.join(" · ")} · `));
  ids.append(threadIdCopyButton(thread.threadId));
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
  hidePopulationPortraitPreview();
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
  identifier.className = "mono stillborn-thread-identifier";
  identifier.append(threadIdCopyButton(thread.threadId));

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

function activeBirthStageCounts() {
  return pendingBirthSnapshot.reduce((result, birth) => {
    const stage = birthStage(birth);
    if (stage === "genesis" || stage === "developing" || stage === "emerging") result[stage] += 1;
    return result;
  }, { genesis:0, developing:0, emerging:0 });
}

function birthCenterSummaryText() {
  const counts = activeBirthStageCounts();
  const total = pendingBirthSnapshot.length;
  return `${total} active birth${total === 1 ? "" : "s"} · ${counts.genesis} genesis → ${counts.developing} developing → ${counts.emerging} emerging`;
}

function renderBirthCenterTopSummary() {
  const counts = activeBirthStageCounts();
  $("#metric-label-records").textContent = "Pending";
  $("#metric-context-records").textContent = "durable births";
  $("#metric-records").textContent = pendingBirthSnapshot.length;
  $("#metric-label-failures").textContent = "Genesis";
  $("#metric-context-failures").textContent = "authoring";
  $("#metric-failures").textContent = counts.genesis;
  $("#metric-label-retries").textContent = "Developing";
  $("#metric-context-retries").textContent = "prior life";
  $("#metric-retries").textContent = counts.developing;
  $("#metric-view").textContent = "Birth Center";
  $("#metric-view-context").textContent = `${counts.emerging} emerging`;
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

function mapCoordinates(event) {
  const rect = birthMap.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  return {
    long:(x * 360) - 180,
    lat:WORLD_MAP_BOUNDS.maxLat - (y * (WORLD_MAP_BOUNDS.maxLat - WORLD_MAP_BOUNDS.minLat)),
  };
}

function geoDistance(left, right) {
  const toRad = (value) => value * Math.PI / 180;
  const lat1 = toRad(left.lat);
  const lat2 = toRad(right.lat);
  const deltaLat = lat2 - lat1;
  const deltaLong = toRad(right.long - left.long);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLong / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestBirthplace(point) {
  if (!Array.isArray(birthplaces) || birthplaces.length === 0) return null;
  return birthplaces.reduce((best, candidate) => {
    const distance = geoDistance(point, candidate);
    return best === null || distance < best.distance ? { candidate, distance } : best;
  }, null)?.candidate ?? null;
}

function setButtonWaiting(button, label) {
  const icon = faIcon("rotate");
  icon.classList.add("fa-spin");
  button.replaceChildren(icon);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function setButtonLabel(button, label) {
  button.textContent = label;
  button.removeAttribute("aria-label");
  button.removeAttribute("title");
}

function birthStage(birth) {
  if (["genesis","developing","emerging","in-world"].includes(birth?.stage)) return birth.stage;
  return ({
    queued:"genesis",
    authoring:"genesis",
    reserved:"developing",
    ready:"developing",
    developing:"developing",
    submitted:"emerging",
    publishing:"emerging",
    published:"in-world",
  })[birth?.status] ?? "genesis";
}

function birthplaceForBirth(birth) {
  return catalogPlaceForLocation(birthplaces, birth?.location);
}

function renderBirthPipelineMarkers() {
  birthPipelineMarkers.replaceChildren();
  const now = Date.now();
  for (const [key, birth] of recentInWorldBirths) {
    if (birth.until <= now) recentInWorldBirths.delete(key);
  }
  if (!Array.isArray(birthplaces)) return;
  const visible = [...pendingBirthSnapshot, ...recentInWorldBirths.values()];
  const groups = new Map();
  for (const birth of visible) {
    const place = birthplaceForBirth(birth);
    if (place === null) continue;
    if (!groups.has(place.place)) groups.set(place.place, []);
    groups.get(place.place).push({ birth, place });
  }
  for (const entries of groups.values()) {
    entries.forEach(({ birth, place }, index) => {
      const point = worldMapPoint(place.lat, place.long);
      const count = entries.length;
      const angle = count === 1 ? 0 : (Math.PI * 2 * index) / count;
      const spread = count === 1 ? 0 : Math.min(13, 4 + count);
      const stage = birthStage(birth);
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", (point.x + Math.cos(angle) * spread).toFixed(1));
      circle.setAttribute("cy", (point.y + Math.sin(angle) * spread).toFixed(1));
      circle.setAttribute("r", ({ genesis:5, developing:6.5, emerging:8, "in-world":9 })[stage] ?? 5);
      circle.classList.add("thread-birth-stage-marker", `stage-${stage}`);
      circle.style.animationDelay = `${-(index % 5) * 180}ms`;
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = `${place.city}, ${place.country} · ${stage}${birth.threadId ? ` · ${birth.threadId}` : ""}`;
      circle.append(title);
      birthPipelineMarkers.append(circle);
    });
  }
}

function renderBirthMarker(place) {
  if (place === null) {
    birthMapMarker.hidden = true;
    birthMapMarker.removeAttribute("cx");
    birthMapMarker.removeAttribute("cy");
    return;
  }
  const point = worldMapPoint(place.lat, place.long);
  birthMapMarker.setAttribute("cx", point.x.toFixed(1));
  birthMapMarker.setAttribute("cy", point.y.toFixed(1));
  birthMapMarker.hidden = false;
}

function syncBirthMode() {
  const value = birthLocation.value.trim();
  const random = value === "";
  birthRandomLocation.classList.toggle("selected", random);
  birthMapSelection.textContent = random
    ? "Random Location"
    : selectedBirthplace?.place === value
      ? selectedBirthplace.place.replace("/", " · ")
      : value;
  renderBirthMarker(random ? null : selectedBirthplace?.place === value ? selectedBirthplace : null);
  renderBirthPipelineMarkers();
  const count = selectedBirthCount();
  birthSubmit.textContent = count === 1 ? "Birth Thread" : `Birth ${count} Threads`;
}
function setBirthLocation(value, place = null) {
  birthLocation.value = value ?? "";
  selectedBirthplace = place;
  birthSearchResults.hidden = true;
  syncBirthMode();
}

function birthSearchMatches(query) {
  const normalized = query.trim().toLocaleLowerCase("en-US");
  if (normalized === "" || !Array.isArray(birthplaces)) return [];
  const score = (place) => {
    const city = place.city.toLocaleLowerCase("en-US");
    const country = place.country.toLocaleLowerCase("en-US");
    const full = place.place.toLocaleLowerCase("en-US");
    if (city === normalized || full === normalized) return 0;
    if (city.startsWith(normalized)) return 1;
    if (country.startsWith(normalized)) return 2;
    if (full.includes(normalized)) return 3;
    return 99;
  };
  return birthplaces
    .map((place) => ({ place, score:score(place) }))
    .filter((entry) => entry.score < 99)
    .sort((left, right) => left.score - right.score || right.place.populationK - left.place.populationK)
    .slice(0,8)
    .map((entry) => entry.place);
}

function renderBirthSearch() {
  const query = birthLocation.value;
  selectedBirthplace = birthplaces?.find((place) => place.place === query.trim()) ?? null;
  syncBirthMode();
  const matches = birthSearchMatches(query);
  birthSearchResults.replaceChildren();
  if (matches.length === 0) {
    birthSearchResults.hidden = true;
    return;
  }
  for (const place of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thread-birth-search-result";
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = place.city;
    const meta = document.createElement("small");
    meta.textContent = `${place.country} · ${place.tier === "anchor" ? "major-city anchor" : "smaller-place long tail"}`;
    copy.append(name, meta);
    const region = document.createElement("small");
    region.textContent = human(place.region);
    button.append(copy, region);
    button.addEventListener("click", () => setBirthLocation(place.place, place));
    birthSearchResults.append(button);
  }
  birthSearchResults.hidden = false;
}

async function loadBirthplaces() {
  if (birthplaces !== null) return birthplaces;
  const response = await fetch("/api/threads/births/places", {
    headers:{ Accept:"application/json" },
    cache:"no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true || !Array.isArray(payload.places)) {
    throw new Error(payload?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  }
  birthplaces = payload.places;
  renderBirthPipelineMarkers();
  return birthplaces;
}

function clearThreadMapPopoverClose() {
  if (threadMapPopoverCloseTimer !== null) window.clearTimeout(threadMapPopoverCloseTimer);
  threadMapPopoverCloseTimer = null;
}

function hideThreadMapPopover() {
  clearThreadMapPopoverClose();
  if (threadMapPopover) threadMapPopover.hidden = true;
}

function scheduleThreadMapPopoverClose() {
  clearThreadMapPopoverClose();
  threadMapPopoverCloseTimer = window.setTimeout(hideThreadMapPopover, 2000);
}

function ensureThreadMapPopover() {
  if (threadMapPopover) return threadMapPopover;
  threadMapPopover = document.createElement("div");
  threadMapPopover.className = "thread-map-popover";
  threadMapPopover.hidden = true;
  threadMapPopover.addEventListener("pointerenter", clearThreadMapPopoverClose);
  threadMapPopover.addEventListener("pointerleave", scheduleThreadMapPopoverClose);
  threadPopulationMapShell.append(threadMapPopover);
  return threadMapPopover;
}

async function hydrateThreadMapFace(link, thread) {
  const url = await resolvePopulationPortrait(thread.threadId);
  if (!url || !link.isConnected || link.dataset.threadId !== thread.threadId) return;
  const image = document.createElement("img");
  image.src = url;
  image.alt = `${thread.identity?.name ?? "Thread"} portrait`;
  image.loading = "lazy";
  link.replaceChildren(image);
}

function showThreadMapPopover(location, marker) {
  clearThreadMapPopoverClose();
  const popover = ensureThreadMapPopover();
  const heading = document.createElement("div");
  heading.className = "thread-map-popover-head";
  const title = document.createElement("strong");
  title.textContent = [location.place.city, location.place.country].filter(Boolean).join(", ");
  const count = document.createElement("span");
  count.textContent = `${location.count} Thread${location.count === 1 ? "" : "s"}`;
  heading.append(title, count);

  const faces = document.createElement("div");
  faces.className = "thread-map-faces";
  for (const threadId of location.threadIds) {
    const thread = population.find((candidate) => candidate.threadId === threadId);
    if (!thread) continue;
    const link = document.createElement("a");
    link.className = "thread-map-face";
    link.href = `/thread/${encodeURIComponent(threadId)}`;
    link.dataset.threadId = threadId;
    link.title = thread.identity?.name
      ? `Open ${thread.identity.name} in Thread Observatory`
      : `Open ${threadId} in Thread Observatory`;
    link.textContent = initials(thread.identity?.name);
    faces.append(link);
    void hydrateThreadMapFace(link, thread);
  }

  popover.replaceChildren(heading, faces);
  popover.hidden = false;
  const markerRect = marker.getBoundingClientRect();
  const shellRect = threadPopulationMapShell.getBoundingClientRect();
  const rect = popover.getBoundingClientRect();
  const gap = 8;
  let left = markerRect.left - shellRect.left + markerRect.width / 2 - rect.width / 2;
  left = Math.max(8, Math.min(left, threadPopulationMapShell.clientWidth - rect.width - 8));
  let top = markerRect.bottom - shellRect.top + gap;
  if (markerRect.bottom + gap + rect.height > window.innerHeight - 8) {
    top = markerRect.top - shellRect.top - rect.height - gap;
  }
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function renderThreadPopulationMap() {
  if (!threadPopulationMapInitialized) {
    threadPopulationWorldPath.setAttribute("d", WORLD_MAP_PATH);
    renderWorldTimeZoneLines(threadPopulationTimezones);
    threadPopulationMapInitialized = true;
  }
  const grouped = groupThreadsByCurrentLocation(population);
  hideThreadMapPopover();
  const rendered = renderWorldCountMarkers(threadPopulationMapMarkers, grouped.locations);
  for (const { marker, location } of rendered) {
    marker.classList.add("interactive");
    marker.addEventListener("pointerenter", () => showThreadMapPopover(location, marker));
    marker.addEventListener("pointerleave", scheduleThreadMapPopoverClose);
  }
  if (population.length === 0) {
    threadPopulationMapSummary.textContent = "No admitted Threads.";
    return;
  }
  const places = grouped.locations.length;
  const awaitingLivedNow = grouped.mapped - grouped.authoritative;
  threadPopulationMapSummary.textContent =
    `${places} current area${places === 1 ? "" : "s"} · ${grouped.mapped} Thread${grouped.mapped === 1 ? "" : "s"}`
    + (awaitingLivedNow > 0 ? ` · ${awaitingLivedNow} awaiting enacted LivedNow` : "")
    + (grouped.unmapped > 0 ? ` · ${grouped.unmapped} without geographic projection` : "");
}

function selectedBirthSex() {
  return birthForm.querySelector('input[name="sex"]:checked')?.value ?? "";
}

function selectedBirthCount() {
  const value = Number(birthForm.querySelector('input[name="birth-count"]:checked')?.value ?? 1);
  return [1,3,5,11].includes(value) ? value : 1;
}

function elapsedText(value) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value ?? ""));
  if (!Number.isFinite(elapsed)) return "just now";
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function pendingStatusText(birth) {
  return birthStage(birth);
}

function pendingBirthKey(birth) {
  return birth?.requestId ?? birth?.threadId ?? null;
}

function rememberCompletedBirths(nextBirths) {
  const nextKeys = new Set(nextBirths.map(pendingBirthKey).filter(Boolean));
  const now = Date.now();
  for (const previous of pendingBirthSnapshot) {
    const key = pendingBirthKey(previous);
    if (key !== null && !nextKeys.has(key) && previous.threadId && ["developing","emerging"].includes(birthStage(previous))) {
      recentInWorldBirths.set(key, { ...previous, stage:"in-world", until:now + 20_000 });
    }
  }
}

function renderPendingBirths(births) {
  rememberCompletedBirths(births);
  pendingBirthSnapshot = births;
  birthPending.replaceChildren();
  birthPendingCount.textContent = births.length === 0 ? "" : String(births.length);
  if (births.length === 0) {
    const empty = document.createElement("span");
    empty.className = "thread-birth-pending-empty";
    empty.textContent = "No unfinished births.";
    birthPending.append(empty);
  } else {
    for (const birth of births) {
      const row = document.createElement("article");
      row.className = "thread-birth-pending-row";
      row.classList.toggle("stale", birth.stale === true);
      const copy = document.createElement("div");
      const location = document.createElement("strong");
      location.textContent = birth.location?.replace("/", " · ") ?? "Selecting birthplace…";
      const meta = document.createElement("span");
      meta.textContent = `${birth.sex ? human(birth.sex) : "Random sex"} · ${pendingStatusText(birth)} · started ${elapsedText(birth.createdAt)} · last update ${elapsedText(birth.updatedAt)}`;
      copy.append(location, meta);
      if (birth.stale === true) {
        const stale = document.createElement("span");
        stale.className = "thread-birth-stale-reason";
        stale.textContent = `${human(birth.classification ?? "stale")} · ${birth.staleReason ?? "Birth has stopped making progress."}`;
        copy.append(stale);
      }
      if (birth.threadId) {
        const id = threadIdCopyButton(birth.threadId);
        id.classList.add("thread-birth-thread-id");
        copy.append(id);
      } else if (birth.requestId) {
        const id = document.createElement("small");
        id.className = "mono";
        id.textContent = birth.requestId;
        copy.append(id);
      }
      const statuses = document.createElement("div");
      statuses.className = "thread-birth-pending-status";
      statuses.append(badge(pendingStatusText(birth), "retrying"));
      if (birth.stale === true) statuses.append(badge("stale", "failed"));
      row.append(copy, statuses);
      birthPending.append(row);
    }
  }
  renderBirthPipelineMarkers();
  if (active && populationMode === "birth-center") {
    renderBirthCenterTopSummary();
    $("#chain-summary").textContent = birthCenterSummaryText();
  }
}
async function loadPendingBirths({ quiet = false } = {}) {
  if (!quiet) {
    birthPendingRefresh.disabled = true;
    setButtonWaiting(birthPendingRefresh, "Refreshing");
    if (pendingBirthSnapshot.length === 0) {
      birthPending.textContent = "Loading…";
      birthPendingCount.textContent = "";
    }
  }
  try {
    const response = await fetch("/api/threads/births/pending", {
      headers:{ Accept:"application/json" },
      cache:"no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true || !Array.isArray(payload.births)) {
      throw new Error(payload?.detail ?? payload?.error ?? `HTTP ${response.status}`);
    }
    renderPendingBirths(payload.births);
  } catch (error) {
    if (!quiet) {
      birthPending.textContent = `Pending births unavailable: ${error instanceof Error ? error.message : String(error)}`;
      birthPendingCount.textContent = "";
    }
  } finally {
    if (!quiet) {
      birthPendingRefresh.disabled = false;
      setButtonLabel(birthPendingRefresh, "Refresh");
    }
  }
}

function startPendingPolling() {
  stopPendingPolling();
  pendingBirthTimer = window.setInterval(() => {
    if (!active || populationMode !== "birth-center") return;
    if (pendingBirthSnapshot.length > 0) renderPendingBirths(pendingBirthSnapshot);
    void loadPendingBirths({ quiet:true });
  }, 2000);
}

function stopPendingPolling() {
  if (pendingBirthTimer !== null) window.clearInterval(pendingBirthTimer);
  pendingBirthTimer = null;
}

function chooseFromMap(event) {
  const place = nearestBirthplace(mapCoordinates(event));
  if (place !== null) setBirthLocation(place.place, place);
}

async function loadBirthCenter() {
  if (!active || populationMode !== "birth-center" || birthLoading) return;
  birthLoading = true;
  holdOperatorMode();
  $("#refresh-button").disabled = true;
  setButtonWaiting($("#refresh-button"), "Refreshing");
  $("#chain-summary").textContent = "Reading durable Birth Center progress and birthplace catalog…";
  try {
    if (!birthCenterInitialized) {
      birthWorldPath.setAttribute("d", WORLD_MAP_PATH);
      renderWorldTimeZoneLines(birthTimezones);
      syncBirthMode();
      birthCenterInitialized = true;
    }
    startPendingPolling();
    await Promise.all([loadPendingBirths(), loadBirthplaces()]);
    renderBirthPipelineMarkers();
    renderBirthCenterTopSummary();
    $("#chain-summary").textContent = birthCenterSummaryText();
  } catch (error) {
    $("#chain-summary").textContent = `Birth Center unavailable: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    birthLoading = false;
    $("#refresh-button").disabled = false;
    setButtonLabel($("#refresh-button"), "Refresh");
  }
}
function renderBirthBatchProgress({ total, accepted, failed }) {
  birthResult.classList.toggle("failed", failed > 0);
  birthResult.textContent = failed === 0
    ? `${accepted} of ${total} birth${total === 1 ? "" : "s"} started. Progress appears below.`
    : `${accepted} started · ${failed} failed to start.`;
}

async function submitBirth(event) {
  event.preventDefault();
  if (birthSubmit.disabled) return;
  const location = birthLocation.value.trim();
  const count = selectedBirthCount();
  const sex = selectedBirthSex();
  const requestedAt = new Date().toISOString();
  const requests = Array.from({ length:count }, () => ({
    requestId:`admin_birth_${crypto.randomUUID().replaceAll("-", "")}`,
    requestedAt,
    location:location === "" ? null : location,
    sex:sex === "" ? null : sex,
  }));

  birthSubmit.disabled = true;
  setButtonWaiting(birthSubmit, "Starting");
  birthResult.classList.remove("failed");
  renderBirthBatchProgress({ total:count, accepted:0, failed:0 });

  let accepted = 0;
  let failed = 0;
  await Promise.all(requests.map(async (request) => {
    try {
      const response = await fetch("/api/threads/birth", {
        method:"POST",
        headers:{ Accept:"application/json", "content-type":"application/json" },
        body:JSON.stringify(request),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok !== true || !payload.birth) {
        throw new Error(payload?.detail ?? payload?.error ?? `HTTP ${response.status}`);
      }
      accepted += 1;
    } catch {
      failed += 1;
    } finally {
      renderBirthBatchProgress({ total:count, accepted, failed });
      void loadPendingBirths({ quiet:true });
    }
  }));

  birthSubmit.disabled = false;
  syncBirthMode();
  void loadPendingBirths();
  if (active && populationMode === "threads") void loadPopulation();
}

function holdOperatorMode() {
  if (!active) return;
  $("#causal-view").hidden = true;
  $("#raw-view").hidden = true;
  birthCenterView.hidden = populationMode !== "birth-center";
  view.hidden = populationMode !== "threads";
  stillbornView.hidden = populationMode !== "stillborn";
  document.querySelector("#thread-context").hidden = true;
  for (const control of document.querySelectorAll(".view-switch button")) {
    control.classList.toggle("active", control.dataset.mode === populationMode);
  }
  $("#chain-title").textContent = populationMode === "birth-center"
    ? "Birth Center"
    : populationMode === "stillborn"
      ? "Stillborn Threads"
      : "Threads";
  if (populationMode === "birth-center") renderBirthCenterTopSummary();
  else if (populationMode === "stillborn") renderStillbornTopSummary();
  else {
    $("#metric-view").textContent = "Threads";
    $("#metric-view-context").textContent = "population / World health";
  }
}

async function loadPopulation() {
  if (!active || populationMode === "birth-center" || loading) return;
  loading = true;
  holdOperatorMode();
  $("#refresh-button").disabled = true;
  setButtonWaiting($("#refresh-button"), "Refreshing");
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
    renderThreadPopulationMap();
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
    renderThreadPopulationMap();
    $("#chain-summary").textContent = `Thread population unavailable: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    loading = false;
    holdOperatorMode();
    $("#refresh-button").disabled = false;
    setButtonLabel($("#refresh-button"), "Refresh");
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
  const previousMode = populationMode;
  populationMode = nextMode;
  if (active) {
    if (previousMode === "birth-center" && nextMode !== "birth-center") stopPendingPolling();
    holdOperatorMode();
    if (populationMode === "birth-center") {
      renderBirthCenterTopSummary();
      $("#chain-summary").textContent = birthCenterSummaryText();
      startPendingPolling();
      void loadBirthCenter();
    } else if (populationMode === "stillborn") {
      renderStillbornTopSummary({ stillborn:stillborn.length });
      $("#chain-summary").textContent = `${stillborn.length} unrecoverable Thread ${stillborn.length === 1 ? "identifier" : "identifiers"} parked outside the admitted population.`;
      void loadPopulation();
    } else {
      renderThreadsTopSummary({
        total:population.length,
        attention:population.filter((thread) => thread.health !== "healthy").length,
        deadLetter:population.filter((thread) => thread.reconciliation?.state === "dead_letter").length,
      });
      $("#chain-summary").textContent = `${population.length} admitted/recoverable Threads · ${stillborn.length} Stillborn.`;
      void loadPopulation();
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
  if (populationMode === "birth-center") renderBirthCenterTopSummary();
  else if (populationMode === "stillborn") renderStillbornTopSummary();
  else renderThreadsTopSummary();
  holdOperatorMode();
  $("#chain-summary").textContent = populationMode === "birth-center" ? "Loading Birth Center…" : "Loading population…";
  const params = new URLSearchParams(location.search);
  params.set("mode", populationMode);
  history.replaceState(null, "", `${location.pathname}?${params}`);
  if (populationMode === "birth-center") void loadBirthCenter();
  else void loadPopulation();
}

function enterBirthCenter() { enterPopulation("birth-center"); }
function enterThreads() { enterPopulation("threads"); }
function enterStillborn() { enterPopulation("stillborn"); }
function exitOperatorMode(nextMode) {
  if (!active) return;
  active = false;
  stopPendingPolling();
  birthCenterView.hidden = true;
  view.hidden = true;
  stillbornView.hidden = true;
  setActivityChrome(false);
  renderActivitySummaryLabels();
  $("#metric-view").textContent = nextMode === "causal" ? "Causal" : "Raw";
  $("#auto-refresh").checked = priorAutoRefresh;
  $("#auto-refresh").dispatchEvent(new Event("change"));

  const params = new URLSearchParams(location.search);
  if (["birth-center","threads","stillborn"].includes(params.get("mode"))) {
    params.set("mode", nextMode);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    $("#refresh-button").click();
  }
}

birthLocation.addEventListener("input", renderBirthSearch);
birthRandomLocation.addEventListener("click", () => setBirthLocation("", null));
birthMap.addEventListener("click", chooseFromMap);
birthMap.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  const rect = birthMap.getBoundingClientRect();
  chooseFromMap({ clientX:rect.left + rect.width / 2, clientY:rect.top + rect.height / 2 });
});
for (const input of birthForm.querySelectorAll('input[name="birth-count"], input[name="sex"]')) {
  input.addEventListener("change", syncBirthMode);
}
birthPendingRefresh.addEventListener("click", () => void loadPendingBirths());
birthForm.addEventListener("submit", submitBirth);

$("#view-birth-center").addEventListener("click", enterBirthCenter);
$("#view-threads").addEventListener("click", enterThreads);
$("#view-stillborn").addEventListener("click", enterStillborn);
for (const [id, nextMode] of [["view-causal", "causal"], ["view-raw", "raw"]]) {
  $(`#${id}`).addEventListener("click", () => exitOperatorMode(nextMode));
}
$("#refresh-button").addEventListener("click", (event) => {
  if (!active) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (populationMode === "birth-center") void loadBirthCenter();
  else void loadPopulation();
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

function refreshPopulationAfterThreadChange(event) {
  const threadId = event?.detail?.threadId ?? null;
  if (!active || populationMode !== "threads" || typeof threadId !== "string") return;
  populationPortraitCache.delete(threadId);
  void loadPopulation();
}

for (const eventName of [
  "fibre:thread-identity-updated",
  "fibre:fid-card-reissued",
  "fibre:thread-updated",
]) {
  window.addEventListener(eventName, refreshPopulationAfterThreadChange);
}
window.addEventListener("scroll", hidePopulationPortraitPreview, true);
window.addEventListener("resize", hidePopulationPortraitPreview);

const initialMode = new URLSearchParams(location.search).get("mode");
if (initialMode === "birth-center") enterBirthCenter();
if (initialMode === "threads") enterThreads();
if (initialMode === "stillborn") enterStillborn();
