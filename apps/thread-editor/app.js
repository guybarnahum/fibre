import {
  embodimentLabel,
  filterThreads,
  formatJson,
  genomeLabel,
  initials,
  inspectionCounts,
  memoryLabel,
  placeLabel,
  publicIdentityFacts,
  relationLabel,
  threadTitle,
} from "./thread-inspection-model.js";

const $ = (id) => document.getElementById(id);
const state = {
  accessToken: null,
  threads: [],
  selectedThreadId: null,
  inspection: null,
  activeView: "overview",
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
  setStatus("Inspection unavailable", "error");
}

function clearError() {
  $("errorPanel").hidden = true;
  $("errorPanel").textContent = "";
}

async function fetchJson(path) {
  if (!state.accessToken) throw new Error("Editor access token is missing. Open the per-run URL printed by npm run editor.");
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
      "x-fibre-editor-token": state.accessToken,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.error?.code ?? `Request failed with status ${response.status}`);
  }
  return payload;
}

function textList(element, values, empty = "None recorded") {
  element.replaceChildren();
  const list = Array.isArray(values) ? values : [];
  if (list.length === 0) {
    const item = document.createElement("li");
    item.className = "muted";
    item.textContent = empty;
    element.append(item);
    return;
  }
  for (const value of list) {
    const item = document.createElement("li");
    item.textContent = typeof value === "string" ? value : formatJson(value);
    element.append(item);
  }
}

function chip(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element;
}

function scalar(value) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.every((item) => ["string", "number", "boolean"].includes(typeof item))
    ? value.join(", ")
    : `${value.length} records`;
  if (typeof value === "object") return "Structured record";
  return String(value);
}

function topLevelFacts(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  return Object.entries(record)
    .filter(([, value]) => value === null || value === undefined || typeof value !== "object" || (Array.isArray(value) && value.every((item) => typeof item !== "object")))
    .slice(0, 12);
}

function detailsJson(record, label = "Exact JSON") {
  const details = document.createElement("details");
  details.className = "technical-json compact-json";
  const summary = document.createElement("summary");
  summary.textContent = label;
  const pre = document.createElement("pre");
  pre.textContent = formatJson(record);
  details.append(summary, pre);
  return details;
}

function structuredRecord(record, { empty = "No record", title = null } = {}) {
  const container = document.createElement("div");
  container.className = "structured-record";
  if (record === null || record === undefined) {
    container.classList.add("empty-record");
    container.textContent = empty;
    return container;
  }
  if (title) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    container.append(heading);
  }
  const facts = topLevelFacts(record);
  if (facts.length) {
    const dl = document.createElement("dl");
    dl.className = "record-facts";
    for (const [key, value] of facts) {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = key.replace(/([a-z])([A-Z])/gu, "$1 $2");
      const description = document.createElement("dd");
      description.textContent = scalar(value);
      row.append(term, description);
      dl.append(row);
    }
    container.append(dl);
  }
  container.append(detailsJson(record));
  return container;
}

function recordCard(title, record, subtitle = null) {
  const article = document.createElement("article");
  article.className = "record-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  article.append(heading);
  if (subtitle) {
    const meta = document.createElement("p");
    meta.className = "record-meta";
    meta.textContent = subtitle;
    article.append(meta);
  }
  const facts = topLevelFacts(record).slice(0, 6);
  if (facts.length) {
    const dl = document.createElement("dl");
    dl.className = "record-facts";
    for (const [key, value] of facts) {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = key.replace(/([a-z])([A-Z])/gu, "$1 $2");
      const description = document.createElement("dd");
      description.textContent = scalar(value);
      row.append(term, description);
      dl.append(row);
    }
    article.append(dl);
  }
  article.append(detailsJson(record));
  return article;
}

function renderRecordGrid(id, records, labelFn, empty) {
  const container = $(id);
  container.replaceChildren();
  const values = Array.isArray(records) ? records : [];
  if (values.length === 0) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = empty;
    container.append(message);
    return;
  }
  values.forEach((record, index) => container.append(recordCard(labelFn(record, index), record)));
}

function renderDirectory() {
  const list = $("threadList");
  const visible = filterThreads(state.threads, $("threadSearch").value);
  list.replaceChildren();
  $("threadCount").textContent = state.threads.length;
  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted directory-empty";
    empty.textContent = state.threads.length === 0 ? "No authoritative Threads yet." : "No Threads match this search.";
    list.append(empty);
    return;
  }
  for (const thread of visible) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thread-row";
    button.classList.toggle("selected", thread.threadId === state.selectedThreadId);
    button.setAttribute("role", "listitem");

    const avatar = document.createElement("span");
    avatar.className = "mini-avatar";
    avatar.textContent = initials(threadTitle(thread));
    const copy = document.createElement("span");
    copy.className = "thread-row-copy";
    const name = document.createElement("strong");
    name.textContent = threadTitle(thread);
    const meta = document.createElement("span");
    meta.textContent = [thread.fibreIdentityNumber, thread.originOrientation, thread.status].filter(Boolean).join(" · ") || thread.threadId;
    const id = document.createElement("code");
    id.textContent = thread.threadId;
    copy.append(name, meta, id);
    button.append(avatar, copy);
    button.addEventListener("click", () => void selectThread(thread.threadId));
    list.append(button);
  }
}

function renderHero() {
  const inspection = state.inspection;
  const thread = inspection.thread;
  const identity = thread.identity ?? {};
  const name = inspection.identity?.passport?.canonicalName ?? identity.name ?? thread.threadId;
  $("avatar").textContent = initials(name);
  $("orientation").textContent = `${identity.originOrientation ?? "unknown"} Thread`;
  $("threadName").textContent = name;
  $("threadDescription").textContent = identity.selfDescription ?? "";
  $("identityChips").replaceChildren(...[
    ...(identity.culture ?? []),
    ...(identity.languages ?? []),
  ].map(chip));
  const facts = $("heroFacts");
  facts.replaceChildren();
  for (const [label, value] of publicIdentityFacts(inspection).slice(0, 5)) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = String(value);
    row.append(term, description);
    facts.append(row);
  }
}

function renderOverview() {
  const inspection = state.inspection;
  const thread = inspection.thread;
  $("selfDescription").textContent = thread.identity?.selfDescription ?? "No self-description recorded.";
  $("selfModel").textContent = thread.currentState?.selfModel ?? "No current self-model recorded.";
  textList($("needs"), thread.currentState?.needs ?? []);
  textList($("feelings"), thread.currentState?.feelings ?? []);
  textList($("intentions"), thread.currentState?.unresolvedIntentions ?? []);

  const factGrid = $("overviewFacts");
  factGrid.replaceChildren();
  for (const [label, value] of publicIdentityFacts(inspection)) {
    const item = document.createElement("div");
    const term = document.createElement("span");
    term.className = "fact-label";
    term.textContent = label;
    const data = document.createElement("strong");
    data.textContent = String(value);
    item.append(term, data);
    factGrid.append(item);
  }

  const counts = inspectionCounts(inspection);
  const labels = {
    events: "World events",
    memories: "Memories",
    relations: "Relationships",
    places: "Places",
    genomes: "Genomes",
    embodiments: "Embodiments",
    identityClaims: "Identity claims",
    identityAssertions: "Identity assertions",
  };
  const metrics = $("authorityCounts");
  metrics.replaceChildren();
  for (const [key, value] of Object.entries(counts)) {
    const item = document.createElement("div");
    const number = document.createElement("strong");
    number.textContent = value;
    const label = document.createElement("span");
    label.textContent = labels[key];
    item.append(number, label);
    metrics.append(item);
  }
}

function renderIdentity() {
  $("passportView").replaceChildren(structuredRecord(state.inspection.identity?.passport, { empty: "No Thread Passport record." }));
  $("identityView").replaceChildren(structuredRecord(state.inspection.identity?.current, { empty: "No current identity projection." }));
  renderRecordGrid(
    "memoryVisualView",
    state.inspection.identity?.memoryVisualCompanions,
    (record, index) => record?.memoryRef ?? record?.companionId ?? `Memory visual ${index + 1}`,
    "No memory visual companions recorded.",
  );
}

function renderMemories() {
  renderRecordGrid("memoryView", state.inspection.autobiographicalMemories, memoryLabel, "No autobiographical memories recorded.");
}

function renderLife() {
  renderRecordGrid("relationView", state.inspection.situatedLife?.relations, relationLabel, "No current relationships recorded.");
  renderRecordGrid("placeView", state.inspection.situatedLife?.places, placeLabel, "No current place episodes recorded.");
}

function renderGenome() {
  renderRecordGrid("genomeView", state.inspection.symbolicGenomes, genomeLabel, "No symbolic genome recorded.");
}

function renderEmbodiment() {
  renderRecordGrid("embodimentView", state.inspection.embodiment?.current, embodimentLabel, "No current embodiment recorded.");
}

function renderHistory() {
  const timeline = $("historyView");
  timeline.replaceChildren();
  const events = state.inspection.events ?? [];
  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No authoritative events recorded.";
    timeline.append(empty);
    return;
  }
  for (const event of events) {
    const item = document.createElement("article");
    item.className = "timeline-event";
    const marker = document.createElement("span");
    marker.className = "timeline-marker";
    const copy = document.createElement("div");
    const meta = document.createElement("p");
    meta.className = "eyebrow";
    meta.textContent = [event.occurredAt, Number.isFinite(event.sequence) ? `event ${event.sequence}` : null].filter(Boolean).join(" · ");
    const heading = document.createElement("h3");
    heading.textContent = event.eventType ?? event.eventId ?? "World event";
    const witness = document.createElement("p");
    witness.className = "record-meta";
    witness.textContent = [
      event.eventId,
      event.resultingVersion === undefined ? null : `Thread v${event.resultingVersion}`,
    ].filter(Boolean).join(" · ");
    copy.append(meta, heading, witness, detailsJson(event));
    item.append(marker, copy);
    timeline.append(item);
  }
}

function renderIntegrity() {
  $("worldIntegrityView").replaceChildren(structuredRecord(state.inspection.integrity?.world, { empty: "No World integrity report." }));
  $("identityIntegrityView").replaceChildren(structuredRecord(state.inspection.integrity?.identity, { empty: "No identity integrity report." }));
}

function renderInspection() {
  $("emptyState").hidden = true;
  $("threadWorkspace").hidden = false;
  renderHero();
  renderOverview();
  renderIdentity();
  renderMemories();
  renderLife();
  renderGenome();
  renderEmbodiment();
  renderHistory();
  renderIntegrity();
  $("rawInspection").textContent = formatJson(state.inspection);
  renderDirectory();
}

function showView(view) {
  state.activeView = view;
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll("[id^='view-']").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
}

async function selectThread(threadId) {
  clearError();
  state.selectedThreadId = threadId;
  renderDirectory();
  setStatus("Loading Thread…", "loading");
  try {
    const payload = await fetchJson(`/api/editor/threads/${encodeURIComponent(threadId)}`);
    state.inspection = payload.inspection;
    renderInspection();
    showView(state.activeView);
    setStatus("World connected", "success");
  } catch (error) {
    state.inspection = null;
    showError(error);
  }
}

async function loadDirectory({ preserveSelection = true } = {}) {
  clearError();
  setStatus("Loading World…", "loading");
  try {
    const [health, directory] = await Promise.all([
      fetchJson("/api/editor/health"),
      fetchJson("/api/editor/threads"),
    ]);
    state.threads = directory.threads ?? [];
    renderDirectory();
    const canPreserve = preserveSelection && state.selectedThreadId && state.threads.some((thread) => thread.threadId === state.selectedThreadId);
    const nextThreadId = canPreserve ? state.selectedThreadId : state.threads[0]?.threadId ?? null;
    if (nextThreadId !== null) await selectThread(nextThreadId);
    else {
      state.selectedThreadId = null;
      state.inspection = null;
      $("emptyState").hidden = false;
      $("threadWorkspace").hidden = true;
      setStatus(health.world?.provider ? `World connected · ${health.world.provider}` : "World connected", "success");
    }
  } catch (error) {
    showError(error);
  }
}

state.accessToken = loadAccessToken();
$("threadSearch").addEventListener("input", renderDirectory);
$("refreshButton").addEventListener("click", () => void loadDirectory());
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));

if (!state.accessToken) {
  showError(new Error("Editor access token is missing. Start with npm run editor and open the printed access URL."));
} else {
  void loadDirectory({ preserveSelection: false });
}
