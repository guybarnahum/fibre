import { renderThreadHealth } from "./thread-repair-ui.js";

function node(tag, className = null, text = null) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== null) element.textContent = text;
  return element;
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
  item.append(node("div", mono ? "thread-identity-value mono" : "thread-identity-value", content ?? "—"));
  return item;
}

function portraitAsset(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  return assets.find((asset) => asset?.role === "canonical_portrait" && asset?.url)
    ?? assets.find((asset) => asset?.mediaType?.startsWith?.("image/") && asset?.url)
    ?? null;
}

export async function renderThreadPage(threadId) {
  const main = document.querySelector(".main");
  document.querySelector("#record-dialog")?.remove();
  for (const item of document.querySelectorAll(".nav-item")) item.classList.remove("active");

  main.replaceChildren();
  const topbar = node("header", "topbar");
  const crumbs = node("div", "crumbs");
  const home = node("a", "crumb-link", "Threads"); home.href = "/activity?mode=threads";
  crumbs.append(home, node("span", null, "/"), node("strong", null, "Thread"));
  const actions = node("div", "topbar-actions");
  const environmentPill = node("span", "environment-pill", "—");
  actions.append(environmentPill, node("span", "admin-pill", "Admin"));
  topbar.append(crumbs, actions);
  main.append(topbar);

  const pageHead = node("section", "page-head thread-page-head");
  const person = node("div", "thread-page-person");
  const portrait = node("div", "thread-page-avatar");
  portrait.append(node("span", "thread-page-avatar-mark", "◎"));
  const copy = node("div");
  copy.append(node("p", "eyebrow", "Thread Observatory"), node("h1", null, "Loading Thread…"), node("p", "lede mono", threadId));
  person.append(portrait, copy);
  const pageActions = node("div", "page-actions");
  const back = node("a", "button-link secondary", "← Threads"); back.href = "/activity?mode=threads";
  const viewer = node("a", "button-link primary", "Open as visitor ↗");
  const activity = node("a", "button-link secondary", "Activity ↗");
  activity.href = `/activity?kind=thread&value=${encodeURIComponent(threadId)}&limit=100`;
  pageActions.append(back, viewer, activity);
  pageHead.append(person, pageActions);
  main.append(pageHead);

  const panel = node("section", "panel thread-identity-panel");
  const panelHead = node("div", "panel-head");
  const panelCopy = node("div");
  panelCopy.append(node("h2", null, "Identity"), node("p", null, "Authoritative World identity with current public media."));
  panelHead.append(panelCopy);
  panel.append(panelHead);
  const grid = node("div", "thread-identity-grid");
  grid.append(identityItem("Thread ID", threadId, { mono:true }));
  panel.append(grid);
  main.append(panel);

  const health = node("section", "panel thread-repair-section");
  main.append(health);
  void renderThreadHealth(health, threadId);

  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    environmentPill.textContent = payload.environment;
    const name = payload.identity.displayName ?? "Unnamed Thread";
    document.title = `Fibre Admin · ${name}`;
    copy.querySelector("h1").textContent = name;
    viewer.href = `${viewerOrigin(payload.environment)}/meet?thread=${encodeURIComponent(threadId)}`;
    const status = document.querySelector("#status-link"); if (status) status.href = statusOrigin(payload.environment);

    const photo = portraitAsset(payload.identity);
    if (photo) {
      const image = node("img");
      image.src = photo.url;
      image.alt = `${name} portrait`;
      portrait.replaceChildren(image);
      portrait.classList.add("has-image");
    }

    grid.replaceChildren(
      identityItem("Name", payload.identity.displayName),
      identityItem("FIN", payload.identity.fibreIdentityNumber),
      identityItem("Sex", payload.identity.sex),
      identityItem("Birth date", payload.identity.birthDate),
      identityItem("Lifecycle", payload.identity.lifecycleStatus),
      identityItem("Thread ID", payload.identity.threadId, { mono:true }),
    );
  } catch (error) {
    copy.querySelector("h1").textContent = "Thread unavailable";
    panelCopy.querySelector("p").textContent = `Identity unavailable: ${error.message}`;
    viewer.removeAttribute("href");
  }
}
