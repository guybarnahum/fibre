function node(tag, className = null, text = null) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.valueOf())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  let months = now.getUTCMonth() - born.getUTCMonth();
  if (now.getUTCDate() < born.getUTCDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return years >= 0 ? `${years}y ${months}m` : null;
}

function resolvedValue(value, label) {
  const wrap = node("span", "resolved-value");
  const mark = node("span", "resolved-mark", value ? `*${value}` : "—");
  if (value) mark.title = `${label} resolved from the Thread's current public Presentation; it may not have been present in historical Activity records.`;
  wrap.append(mark);
  if (value) wrap.append(node("small", "resolved-note", "resolved after fact"));
  return wrap;
}

function viewerOrigin(environment) {
  return environment === "staging" ? "https://staging.insidefibre.com" : "https://insidefibre.com";
}

function statusOrigin(environment) {
  return environment === "staging" ? "https://status.staging.insidefibre.com" : "https://status.insidefibre.com";
}

function identityItem(label, content, { mono = false } = {}) {
  const item = node("div", "thread-identity-item");
  item.append(node("span", "thread-identity-label", label));
  const value = node("div", mono ? "thread-identity-value mono" : "thread-identity-value");
  if (content instanceof Node) value.append(content); else value.textContent = content ?? "—";
  item.append(value);
  return item;
}

export async function renderThreadPage(threadId) {
  const main = document.querySelector(".main");
  const dialog = document.querySelector("#record-dialog");
  if (dialog) dialog.remove();
  for (const item of document.querySelectorAll(".nav-item")) item.classList.remove("active");

  main.replaceChildren();
  const topbar = node("header", "topbar");
  const crumbs = node("div", "crumbs");
  const home = node("a", "crumb-link", "Fibre"); home.href = "/activity";
  crumbs.append(home, node("span", null, "/"), node("strong", null, "Thread"));
  const actions = node("div", "topbar-actions");
  const environmentPill = node("span", "environment-pill", "—");
  actions.append(environmentPill, node("span", "admin-pill", "Admin"));
  topbar.append(crumbs, actions);
  main.append(topbar);

  const pageHead = node("section", "page-head thread-page-head");
  const copy = node("div");
  copy.append(node("p", "eyebrow", "Thread Observatory"), node("h1", null, "Loading Thread…"), node("p", "lede mono", threadId));
  const pageActions = node("div", "page-actions");
  const viewer = node("a", "button-link primary", "Open as visitor ↗");
  const activity = node("a", "button-link secondary", "Activity ↗");
  activity.href = `/activity?kind=thread&value=${encodeURIComponent(threadId)}&limit=100`;
  pageActions.append(viewer, activity);
  pageHead.append(copy, pageActions);
  main.append(pageHead);

  const panel = node("section", "panel thread-identity-panel");
  const panelHead = node("div", "panel-head");
  const panelCopy = node("div");
  panelCopy.append(node("h2", null, "Identity"), node("p", null, "Stable Thread identity with current public identity resolved at read time."));
  panelHead.append(panelCopy, node("span", "observer-pill", "O1"));
  panel.append(panelHead);
  const grid = node("div", "thread-identity-grid");
  grid.append(identityItem("Thread ID", threadId, { mono:true }));
  panel.append(grid);
  main.append(panel);

  const note = node("section", "panel thread-placeholder");
  note.append(node("div", "panel-head"));
  note.querySelector(".panel-head").append(node("div"));
  note.querySelector(".panel-head div").append(node("h2", null, "Thread Observatory"), node("p", null, "O1 establishes identity and navigation. Overview, Life, Media, Interior, DNA and integrated Activity land in later O slices."));
  main.append(note);

  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    environmentPill.textContent = payload.environment;
    document.title = `Fibre Admin · ${payload.identity.displayName ?? threadId}`;
    copy.querySelector("h1").textContent = payload.identity.displayName ?? "Unnamed Thread";
    viewer.href = `${viewerOrigin(payload.environment)}/meet?thread=${encodeURIComponent(threadId)}`;
    const status = document.querySelector("#status-link"); if (status) status.href = statusOrigin(payload.environment);

    grid.replaceChildren(
      identityItem("Name", resolvedValue(payload.identity.displayName, "Thread name")),
      identityItem("FIN", resolvedValue(payload.identity.fibreIdentityNumber, "FIN")),
      identityItem("Thread ID", payload.identity.threadId, { mono:true }),
      identityItem("Age", ageFromBirthDate(payload.identity.birthDate)),
      identityItem("Birth date", payload.identity.birthDate),
      identityItem("Lifecycle", payload.identity.lifecycleStatus),
    );
  } catch (error) {
    copy.querySelector("h1").textContent = "Thread unavailable";
    panelCopy.querySelector("p").textContent = `Identity resolution unavailable: ${error.message}`;
    viewer.removeAttribute("href");
  }
}
