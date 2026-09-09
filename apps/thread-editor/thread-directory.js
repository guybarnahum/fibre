const $ = (id) => document.getElementById(id);

function editorToken() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  return hash.get("access_token") ?? sessionStorage.getItem("fibre-editor-access-token");
}

async function directoryFetch(path) {
  const token = editorToken();
  if (!token) throw new Error("Editor access token is missing.");
  const response = await fetch(path, {
    headers: { accept: "application/json", "x-fibre-editor-token": token },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? `Directory request failed with ${response.status}`);
  return payload;
}

function field(labelText, id, placeholder) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  label.append(input);
  return label;
}

function button(label, id) {
  const element = document.createElement("button");
  element.type = "button";
  element.id = id;
  element.textContent = label;
  return element;
}

function openThread(entry) {
  if (!entry?.threadId) return;
  $("threadId").value = entry.threadId;
  $("loadButton").click();
}

function resultButton(entry) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "record-button";
  const name = document.createElement("strong");
  name.textContent = entry.displayName ?? entry.threadId;
  const meta = document.createElement("span");
  meta.textContent = [
    entry.fibreIdentityNumber,
    entry.languages?.join(", "),
    entry.lifecycleStatus,
  ].filter(Boolean).join(" · ");
  const summary = document.createElement("span");
  summary.textContent = entry.summary ?? entry.visualDescription ?? entry.threadId;
  element.append(name, meta, summary);
  element.addEventListener("click", () => openThread(entry));
  return element;
}

function renderResults(entries, note) {
  const results = $("threadDirectoryResults");
  const status = $("threadDirectoryStatus");
  results.replaceChildren();
  status.textContent = note;
  for (const entry of entries) results.append(resultButton(entry));
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No matching discoverable Threads.";
    results.append(empty);
  }
}

function filters({ includeSeed = false } = {}) {
  const params = new URLSearchParams();
  const query = $("directoryQuery").value.trim();
  const fin = $("directoryFin").value.trim();
  const language = $("directoryLanguage").value.trim();
  if (query) params.set("q", query);
  if (fin) params.set("fin", fin);
  if (language) params.set("language", language);
  if (includeSeed) {
    const seed = $("directorySeed").value.trim();
    if (seed) params.set("seed", seed);
  } else {
    params.set("limit", "25");
  }
  return params;
}

async function search() {
  const searchButton = $("directorySearchButton");
  searchButton.disabled = true;
  try {
    const payload = await directoryFetch(`/api/editor/directory/search?${filters()}`);
    renderResults(payload.threads ?? [], `${payload.threads?.length ?? 0} discoverable Thread(s)`);
  } catch (error) {
    renderResults([], error.message);
  } finally {
    searchButton.disabled = false;
  }
}

async function meet() {
  const meetButton = $("directoryMeetButton");
  meetButton.disabled = true;
  try {
    const payload = await directoryFetch(`/api/editor/directory/meet?${filters({ includeSeed: true })}`);
    const entries = payload.thread ? [payload.thread] : [];
    renderResults(entries, payload.thread
      ? `Met 1 of ${payload.eligibleCount} eligible Thread(s)`
      : "No eligible Thread to meet");
    if (payload.thread) openThread(payload.thread);
  } catch (error) {
    renderResults([], error.message);
  } finally {
    meetButton.disabled = false;
  }
}

function installDirectory() {
  const toolbar = document.querySelector("section.toolbar");
  if (!toolbar) return;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "threadDirectory";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Thread Directory";
  const heading = document.createElement("h2");
  heading.textContent = "Find or meet a Thread";
  const description = document.createElement("p");
  description.className = "muted";
  description.textContent = "Search the admitted public Thread presentation by name, FIN, or visible attributes, or select an eligible Thread for a reproducible encounter.";

  const controls = document.createElement("div");
  controls.className = "toolbar";
  controls.append(
    field("Name / attributes", "directoryQuery", "Mira, tide pools, warm brown eyes…"),
    field("FIN", "directoryFin", "XXXX-XX-XXXX"),
    field("Language", "directoryLanguage", "English"),
    field("Meet seed", "directorySeed", "optional reproducible seed"),
    button("Search", "directorySearchButton"),
    button("Meet a Thread", "directoryMeetButton"),
  );

  const status = document.createElement("p");
  status.id = "threadDirectoryStatus";
  status.className = "toolbar-note";
  status.textContent = "Directory not queried";
  const results = document.createElement("div");
  results.id = "threadDirectoryResults";
  results.className = "record-list";

  panel.append(eyebrow, heading, description, controls, status, results);
  toolbar.before(panel);

  $("directorySearchButton").addEventListener("click", () => void search());
  $("directoryMeetButton").addEventListener("click", () => void meet());
  for (const id of ["directoryQuery", "directoryFin", "directoryLanguage", "directorySeed"]) {
    $(id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") void search();
    });
  }
}

installDirectory();
