import { renderThreadHealth } from "./thread-repair-ui.js";
import {
  fetchThreadObservatory,
  portraitAsset,
  renderThreadObservatory,
  threadName,
} from "./thread-observatory.js";

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

function healthSection(threadId) {
  const health = node("section", "thread-person-section thread-repair-section");
  const head = node("div", "thread-person-section-head");
  head.append(node("h3", null, "Thread health"), node("span", null, "not checked"));
  const actions = node("div", "thread-repair-actions");
  const button = node("button", "secondary thread-repair-button", "Check health");
  button.type = "button";
  button.addEventListener("click", () => renderThreadHealth(health, threadId), { once:true });
  actions.append(button);
  health.append(head, actions);
  return health;
}

export async function renderThreadPage(threadId) {
  const main = document.querySelector(".main");
  document.querySelector("#record-dialog")?.remove();
  for (const item of document.querySelectorAll(".nav-item")) item.classList.remove("active");

  main.replaceChildren();
  const topbar = node("header", "topbar");
  const crumbs = node("div", "crumbs");
  const home = node("a", "crumb-link", "Threads");
  home.href = "/activity?mode=threads";
  crumbs.append(home, node("span", null, "/"), node("strong", null, "Thread Observatory"));
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
  const back = node("a", "button-link secondary", "← Threads");
  back.href = "/activity?mode=threads";
  const viewer = node("a", "button-link primary", "Open as visitor ↗");
  const activity = node("a", "button-link secondary", "Activity ↗");
  activity.href = `/activity?kind=thread&value=${encodeURIComponent(threadId)}&limit=100&mode=raw`;
  pageActions.append(back, viewer, activity);
  pageHead.append(person, pageActions);
  main.append(pageHead);

  const host = node("section", "panel thread-observatory-page");
  host.append(node("div", "thread-loading", "Loading Thread Observatory…"));
  main.append(host);

  try {
    const payload = await fetchThreadObservatory(threadId);
    environmentPill.textContent = payload.environment;
    const identity = payload.identity ?? {};
    const name = threadName(identity) ?? "Unnamed Thread";
    document.title = `Fibre Admin · ${name}`;
    copy.querySelector("h1").textContent = name;
    viewer.href = `${viewerOrigin(payload.environment)}/meet?thread=${encodeURIComponent(threadId)}`;
    const status = document.querySelector("#status-link");
    if (status) status.href = statusOrigin(payload.environment);

    const photo = portraitAsset(identity);
    if (photo) {
      const button = node("button", "thread-page-avatar-button");
      button.type = "button";
      button.dataset.lightboxSrc = photo.url;
      button.dataset.lightboxAlt = `${name} portrait`;
      const image = node("img");
      image.src = photo.url;
      image.alt = `${name} portrait`;
      button.append(image);
      portrait.replaceChildren(button);
      portrait.classList.add("has-image");
    }

    const observatory = renderThreadObservatory({
      identity,
      threadId,
      memories:payload.memories,
      memoryError:payload.memoryError,
    });
    observatory.querySelector(".thread-person-hero")?.after(healthSection(threadId));
    host.replaceChildren(observatory);
  } catch (error) {
    copy.querySelector("h1").textContent = "Thread unavailable";
    host.replaceChildren(node("div", "error-box", `Thread identity unavailable: ${error instanceof Error ? error.message : String(error)}`));
    viewer.removeAttribute("href");
  }
}
