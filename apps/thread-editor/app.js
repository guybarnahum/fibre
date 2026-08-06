import {
  DEFAULT_THREAD_ID,
  formatJson,
  initials,
  inspectionCounts,
  lifecycleOutcome,
  requestSummary,
  runtimeSummary,
} from "./editor-model.js";

const $ = (id) => document.getElementById(id);
const state = {
  inspection: null,
  selectedRequest: null,
  selectedRuntime: null,
  activeView: "state",
  accessToken: null,
};

function loadAccessToken() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const fromHash = hash.get("access_token");
  if (fromHash) {
    sessionStorage.setItem("fibre-editor-access-token", fromHash);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return fromHash;
  }
  return sessionStorage.getItem("fibre-editor-access-token");
}

function setStatus(message, kind = "loading") {
  $("connectionStatus").textContent = message;
  $("connectionStatus").dataset.state = kind;
}

function showError(error) {
  $("errorPanel").hidden = false;
  $("errorPanel").textContent = error.message;
  setStatus("Connection error", "error");
}

function clearError() {
  $("errorPanel").hidden = true;
  $("errorPanel").textContent = "";
}

async function fetchJson(path, options = {}) {
  if (!state.accessToken) throw new Error("Editor access token is missing. Open the per-run URL printed by npm run editor.");
  const response = await fetch(path, {
    ...options,
    headers: {
      accept: "application/json",
      "x-fibre-editor-token": state.accessToken,
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }
  return payload;
}

function renderList(id, values, empty = "None recorded") {
  const element = $(id);
  element.replaceChildren();
  if (!Array.isArray(values) || values.length === 0) {
    const li = document.createElement("li");
    li.textContent = empty;
    li.className = "muted";
    element.append(li);
    return;
  }
  for (const value of values) {
    const li = document.createElement("li");
    li.textContent = value;
    element.append(li);
  }
}

function recordButton(title, meta, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "record-button";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = meta;
  button.append(strong, span);
  button.addEventListener("click", onClick);
  return button;
}

function renderThread() {
  const inspection = state.inspection;
  const thread = inspection.thread;
  const counts = inspectionCounts(inspection);
  $("avatar").textContent = initials(thread.identity?.name);
  $("orientation").textContent = `${thread.identity?.originOrientation ?? "unknown"} Thread`;
  $("name").textContent = thread.identity?.name ?? thread.threadId;
  $("description").textContent = thread.identity?.selfDescription ?? "";
  $("culture").replaceChildren(...(thread.identity?.culture ?? []).map((value) => {
    const chip = document.createElement("span");
    chip.textContent = value;
    return chip;
  }));
  $("threadStatus").textContent = thread.status;
  $("version").textContent = thread.version;
  $("stateHash").textContent = inspection.integrity?.stateHash ?? "—";
  $("eventCount").textContent = counts.events;
  $("requestCount").textContent = counts.requests;
  $("runtimeCount").textContent = counts.runtimes;
  $("selfModel").textContent = thread.currentState?.selfModel ?? "—";
  $("previewSelfModel").value = thread.currentState?.selfModel ?? "";
  renderList("needs", thread.currentState?.needs ?? []);
  renderList("feelings", thread.currentState?.feelings ?? []);
  renderList("intentions", thread.currentState?.unresolvedIntentions ?? []);
  $("traits").replaceChildren(...Object.entries(thread.genome?.textualTraits ?? {}).map(([key, value]) => {
    const article = document.createElement("article");
    article.className = "trait";
    const heading = document.createElement("h3");
    heading.textContent = key;
    const text = document.createElement("p");
    text.textContent = value;
    article.append(heading, text);
    return article;
  }));

  $("integrityBadge").textContent = "Verified";
  $("integrityBadge").dataset.state = "success";
  $("projectionIntegrity").textContent = `Version ${inspection.integrity?.version ?? thread.version} · ${inspection.integrity?.eventCount ?? counts.events} events`;
  const memory = inspection.integrity?.memoryProjection;
  $("memoryIntegrity").textContent = memory
    ? `${memory.freezeCreatedMemoryCount} freeze-created memories match`
    : "No freeze-memory report";
  $("privateAvailability").textContent = inspection.private?.available ? "Available through editor credential" : "Not configured";
  $("integrityRaw").textContent = formatJson(inspection.integrity);
  $("rawInspection").textContent = formatJson(inspection);
}

function renderEvents() {
  const list = $("eventList");
  list.replaceChildren();
  for (const event of state.inspection.events ?? []) {
    list.append(recordButton(
      `${event.sequence}. ${event.eventType}`,
      `v${event.expectedVersion} → v${event.resultingVersion} · ${event.occurredAt}`,
      () => { $("eventDetail").textContent = formatJson(event); },
    ));
  }
  if (!list.childElementCount) list.textContent = "No public events.";
}

function renderRequests() {
  const list = $("requestList");
  list.replaceChildren();
  const requests = state.inspection.private?.requests ?? [];
  for (const request of requests) {
    const summary = requestSummary(request);
    list.append(recordButton(
      summary.objective,
      `${summary.requestId} · ${summary.requester} · ${summary.desiredAction}/${summary.dignityBand}`,
      () => void selectRequest(summary.requestId),
    ));
  }
  if (!list.childElementCount) {
    list.textContent = state.inspection.private?.available
      ? "No request attempts."
      : "Private inspection is not configured.";
  }
}

function renderRuntimes() {
  const list = $("runtimeList");
  list.replaceChildren();
  const runtimes = state.inspection.private?.runtimes ?? [];
  for (const runtime of runtimes) {
    const summary = runtimeSummary(runtime);
    list.append(recordButton(
      summary.sessionId ?? "Unknown session",
      `${summary.status} · lease ${summary.leaseStatus} · Guardian ${summary.guardianDecision ?? "pending"}`,
      () => void selectRuntime(summary.sessionId),
    ));
  }
  if (!list.childElementCount) {
    list.textContent = state.inspection.private?.available
      ? "No runtime episodes."
      : "Private inspection is not configured.";
  }
}

function renderAll() {
  renderThread();
  renderEvents();
  renderRequests();
  renderRuntimes();
}

async function loadThread() {
  clearError();
  const threadId = $("threadId").value.trim() || DEFAULT_THREAD_ID;
  $("threadId").value = threadId;
  setStatus("Loading…", "loading");
  try {
    state.inspection = await fetchJson(`/api/editor/threads/${encodeURIComponent(threadId)}`);
    state.selectedRequest = null;
    state.selectedRuntime = null;
    renderAll();
    $("requestDetail").textContent = "Select a request.";
    $("runtimeDetail").textContent = "Select a runtime.";
    $("lifecycleBadge").textContent = "Select a runtime";
    $("lifecycleDetail").textContent = "";
    $("lastLoaded").textContent = `Kernel time ${state.inspection.kernel?.kernelTime ?? "unavailable"}`;
    setStatus("World kernel connected", "success");
  } catch (error) {
    showError(error);
  }
}

async function selectRequest(requestId) {
  clearError();
  try {
    const threadId = state.inspection.thread.threadId;
    const [detail, integrity] = await Promise.all([
      fetchJson(`/api/editor/threads/${encodeURIComponent(threadId)}/requests/${encodeURIComponent(requestId)}`),
      fetchJson(`/api/editor/threads/${encodeURIComponent(threadId)}/requests/${encodeURIComponent(requestId)}/integrity`),
    ]);
    state.selectedRequest = { detail, integrity };
    $("requestDetail").textContent = formatJson(state.selectedRequest);
  } catch (error) {
    showError(error);
  }
}

async function optionalJson(path) {
  try { return await fetchJson(path); }
  catch (error) {
    if (/not found|was not found/i.test(error.message)) return null;
    throw error;
  }
}

async function selectRuntime(sessionId) {
  clearError();
  try {
    const threadId = state.inspection.thread.threadId;
    const base = `/api/editor/threads/${encodeURIComponent(threadId)}/runtimes/${encodeURIComponent(sessionId)}`;
    const [runtime, integrity, freeze, freezeIntegrity, abandon, abandonIntegrity] = await Promise.all([
      fetchJson(base),
      fetchJson(`${base}/integrity`),
      optionalJson(`${base}/freeze`),
      optionalJson(`${base}/freeze/integrity`),
      optionalJson(`${base}/abandon`),
      optionalJson(`${base}/abandon/integrity`),
    ]);
    state.selectedRuntime = { runtime, integrity, freeze, freezeIntegrity, abandon, abandonIntegrity };
    const outcome = lifecycleOutcome(runtime, freeze, abandon, state.inspection.kernel?.kernelTime ?? null);
    $("lifecycleBadge").textContent = outcome.label;
    $("lifecycleBadge").dataset.state = outcome.kind;
    $("lifecycleDetail").textContent = outcome.detail;
    $("runtimeDetail").textContent = formatJson(state.selectedRuntime);
  } catch (error) {
    showError(error);
  }
}

async function previewSelfModel() {
  clearError();
  if (!state.inspection) return showError(new Error("Load a Thread first."));
  $("previewButton").disabled = true;
  try {
    const threadId = state.inspection.thread.threadId;
    const payload = await fetchJson(
      `/api/editor/threads/${encodeURIComponent(threadId)}/preview-self-model`,
      {
        method: "POST",
        body: JSON.stringify({
          selfModel: $("previewSelfModel").value,
          summary: $("previewSummary").value,
        }),
      },
    );
    $("previewResult").textContent = formatJson(payload);
  } catch (error) {
    showError(error);
  } finally {
    $("previewButton").disabled = false;
  }
}

function showView(view) {
  state.activeView = view;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll("[id^='view-']").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
}

$("loadButton").addEventListener("click", () => void loadThread());
$("refreshButton").addEventListener("click", () => void loadThread());
$("threadId").addEventListener("keydown", (event) => {
  if (event.key === "Enter") void loadThread();
});
$("previewButton").addEventListener("click", () => void previewSelfModel());
document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

state.accessToken = loadAccessToken();
$("threadId").value = DEFAULT_THREAD_ID;
showView("state");
if (state.accessToken) void loadThread();
else showError(new Error("Editor access token is missing. Open the per-run URL printed by npm run editor."));
